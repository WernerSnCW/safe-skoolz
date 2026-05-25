import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import bcrypt from "bcrypt";
import { pool } from "@workspace/db";

// T08 acceptance test: /start → simulate server restart (close + re-import + re-listen)
// → /login still works using the session id returned by /start. Proves the session
// state is durable (in-DB) and not held in process memory.

const ACCESS_CODE = `T8-${Date.now().toString(36).toUpperCase()}`;
const PIN = "1234";

let schoolId: string;
let pupilId: string;

let serverA: Server;
let baseUrlA: string;
let serverB: Server;
let baseUrlB: string;

async function listen(app: any): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${(addr as any).port}` });
    });
  });
}

beforeAll(async () => {
  // Fixtures: dedicated school + login code + pupil with bcrypt PIN.
  const codeHash = await bcrypt.hash(ACCESS_CODE, 10);
  const pinHash = await bcrypt.hash(PIN, 10);

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('T08 Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  await pool.query(
    `INSERT INTO school_login_codes (school_id, code_type, code_hash, active)
     VALUES ($1, 'pupil_login', $2, true)`,
    [schoolId, codeHash],
  );

  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, pin_hash, active)
     VALUES ($1, 'pupil', 'T08', 'Pupil', $2, true) RETURNING id`,
    [schoolId, pinHash],
  );
  pupilId = usr.rows[0].id;

  process.env.JWT_SECRET ||= "test-secret";

  const { default: appA } = await import("../app");
  const a = await listen(appA);
  serverA = a.server;
  baseUrlA = a.url;
});

afterAll(async () => {
  await new Promise<void>((r) => serverA.close(() => r()));
  if (serverB) await new Promise<void>((r) => serverB.close(() => r()));
  // audit_log is append-only via trigger (DELETE blocked), so we leave the test
  // audit row in place and skip dropping the school. Per-row cleanup of the
  // remaining tables is sufficient to keep the test idempotent.
  await pool.query(`DELETE FROM pupil_login_sessions WHERE school_id = $1`, [schoolId]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [pupilId]);
  await pool.query(`DELETE FROM school_login_codes WHERE school_id = $1`, [schoolId]);
});

describe("T08 — pupil login sessions survive process restart", () => {
  it("POST /start then restart then POST /login succeeds with the returned session id", async () => {
    // 1. /start on server A
    const startRes = await fetch(`${baseUrlA}/api/auth/pupil/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, accessCode: ACCESS_CODE }),
    });
    expect(startRes.status).toBe(200);
    const startBody = await startRes.json() as { loginSessionToken: string; profiles: { loginKey: string }[] };
    expect(typeof startBody.loginSessionToken).toBe("string");
    const profile = startBody.profiles.find((p) => p.loginKey);
    expect(profile).toBeTruthy();

    // 2. Simulate process restart: close server A, re-import app module, listen anew.
    await new Promise<void>((r) => serverA.close(() => r()));
    const appModulePath = "../app";
    const vi = (await import("vitest")).vi;
    vi.resetModules();
    const { default: appB } = await import(appModulePath);
    const b = await listen(appB);
    serverB = b.server;
    baseUrlB = b.url;

    // 3. /login on server B with the session id from server A
    const loginRes = await fetch(`${baseUrlB}/api/auth/pupil/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginSessionToken: startBody.loginSessionToken,
        loginKey: profile!.loginKey,
        pin: PIN,
      }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json() as { token?: string };
    expect(typeof loginBody.token).toBe("string");

    // 4. Replay the same session id → must be rejected (single-use).
    const replay = await fetch(`${baseUrlB}/api/auth/pupil/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginSessionToken: startBody.loginSessionToken,
        loginKey: profile!.loginKey,
        pin: PIN,
      }),
    });
    expect(replay.status).toBe(401);
  });
});

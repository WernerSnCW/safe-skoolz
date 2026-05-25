import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import bcrypt from "bcrypt";
import { pool } from "@workspace/db";

// T10 acceptance — three cases:
//   1. /request with unknown email → 200, no token row created.
//   2. /request with valid staff email → 200, exactly one token row created.
//   3. /complete with valid token + valid password → users.password_hash changes;
//      token consumed_at set; replay → 400.

const KNOWN_EMAIL = `t10-staff-${Date.now()}@example.com`;
const UNKNOWN_EMAIL = `t10-nobody-${Date.now()}@example.com`;
const ORIGINAL_PW = "OldPassword12345";
const NEW_PW = "BrandNewSecret9";

let schoolId: string;
let userId: string;
let originalHash: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('T10 Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  originalHash = await bcrypt.hash(ORIGINAL_PW, 10);
  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash, active)
     VALUES ($1, 'teacher', 'T10', 'Teacher', $2, $3, true) RETURNING id`,
    [schoolId, KNOWN_EMAIL, originalHash],
  );
  userId = usr.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${(addr as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  // school left in place (audit_log is append-only with FK to schools).
});

async function tokenRowCount(uid: string | null): Promise<number> {
  if (!uid) {
    const r = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM password_reset_tokens
       WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
      [UNKNOWN_EMAIL],
    );
    return Number(r.rows[0].count);
  }
  const r = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM password_reset_tokens WHERE user_id = $1`,
    [uid],
  );
  return Number(r.rows[0].count);
}

describe("T10 — password reset", () => {
  it("1. request with unknown email returns 200 and creates no token row", async () => {
    const before = await tokenRowCount(null);
    const res = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: UNKNOWN_EMAIL }),
    });
    expect(res.status).toBe(200);
    const after = await tokenRowCount(null);
    expect(after).toBe(before);
  });

  it("2. request with valid staff email returns 200 and creates exactly one token row", async () => {
    const before = await tokenRowCount(userId);
    const res = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: KNOWN_EMAIL }),
    });
    expect(res.status).toBe(200);
    const after = await tokenRowCount(userId);
    expect(after).toBe(before + 1);
  });

  it("3. complete with a valid token rotates password + marks token consumed + rejects replay", async () => {
    // Request a fresh token by intercepting at the DB layer: we cannot read the
    // plaintext token from the /request flow (it's emailed). So we mint our own
    // token + insert the bcrypt-hashed row directly, simulating what /request
    // does internally.
    const plaintext = "feedface".repeat(8).slice(0, 64);
    const tokenHash = await bcrypt.hash(plaintext, 10);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [userId, tokenHash],
    );

    const completeRes = await fetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: plaintext, newPassword: NEW_PW }),
    });
    expect(completeRes.status).toBe(200);

    const after = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    );
    expect(after.rows[0].password_hash).not.toBe(originalHash);
    expect(await bcrypt.compare(NEW_PW, after.rows[0].password_hash)).toBe(true);

    const consumed = await pool.query<{ consumed_at: Date | null }>(
      `SELECT consumed_at FROM password_reset_tokens WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    expect(consumed.rows[0].consumed_at).not.toBeNull();

    // Replay → 400.
    const replay = await fetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: plaintext, newPassword: NEW_PW }),
    });
    expect(replay.status).toBe(400);
  });
});

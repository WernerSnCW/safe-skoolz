import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { generateSync } from "otplib";
import { pool } from "@workspace/db";

// T11 acceptance — four tests:
//   1. setup + verify-setup with a correct TOTP enables and returns 8 codes.
//   2. login with MFA enabled + MFA_ENFORCED returns { requiresMfa, mfaToken };
//      mfaToken alone does NOT authenticate against a protected endpoint.
//   3. challenge with a valid TOTP issues a full JWT.
//   4. challenge with a backup code succeeds ONCE; second use fails.

const EMAIL = `t11-${Date.now()}@example.com`;
const PASSWORD = "CoordinatorPass1";

let schoolId: string;
let userId: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // Test-only deterministic key (32 random bytes, base64).
  process.env.MFA_ENC_KEY = crypto.randomBytes(32).toString("base64");
  process.env.MFA_ENFORCED = "true";

  // Clear the shared Postgres rate-limit bucket so prior test runs don't leak.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'auth:%'`);

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('T11 Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash, active)
     VALUES ($1, 'coordinator', 'T11', 'Coord', $2, $3, true) RETURNING id`,
    [schoolId, EMAIL, passwordHash],
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
  await pool.query(`DELETE FROM user_mfa_secrets WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  delete process.env.MFA_ENFORCED;
});

async function loginInitial(): Promise<any> {
  const r = await fetch(`${baseUrl}/api/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  return { status: r.status, body: await r.json() as any };
}

describe("T11 — MFA TOTP enrolment + challenge", () => {
  let userJwt: string;
  let totpSecret: string;
  let backupCodes: string[];

  it("0. (precondition) initial staff login returns a full token because MFA not yet enabled", async () => {
    // Pre-MFA login succeeds and gives us a JWT we'll use to enrol.
    const { status, body } = await loginInitial();
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    userJwt = body.token;
  });

  it("1. /mfa/setup then /mfa/verify-setup with correct TOTP enables MFA and returns 8 backup codes", async () => {
    const setupRes = await fetch(`${baseUrl}/api/auth/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userJwt}` },
    });
    if (setupRes.status !== 200) {
      const txt = await setupRes.text();
      throw new Error(`setup status=${setupRes.status} body=${txt}`);
    }
    const setupBody = await setupRes.json() as { otpauth: string; qrDataUrl: string };
    expect(setupBody.otpauth).toMatch(/^otpauth:\/\//);
    expect(setupBody.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    // Extract the shared secret from the otpauth URI for test purposes.
    const secretMatch = setupBody.otpauth.match(/[?&]secret=([^&]+)/);
    expect(secretMatch).toBeTruthy();
    totpSecret = secretMatch![1];

    const code = generateSync({ secret: totpSecret });
    const verifyRes = await fetch(`${baseUrl}/api/auth/mfa/verify-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userJwt}` },
      body: JSON.stringify({ code }),
    });
    expect(verifyRes.status).toBe(200);
    const vb = await verifyRes.json() as { enabled: boolean; backupCodes: string[] };
    expect(vb.enabled).toBe(true);
    expect(vb.backupCodes).toHaveLength(8);
    backupCodes = vb.backupCodes;
  });

  let mfaToken: string;

  it("2. login with MFA enforced returns { requiresMfa, mfaToken }; mfaToken does NOT auth protected endpoint", async () => {
    const { status, body } = await loginInitial();
    expect(status).toBe(200);
    expect(body.requiresMfa).toBe(true);
    expect(typeof body.mfaToken).toBe("string");
    expect(body.token).toBeUndefined();
    mfaToken = body.mfaToken;

    // mfaToken (kind=mfa-challenge) is not a full JwtPayload, so authMiddleware
    // accepts the signature but downstream role checks reject the request.
    // A protected endpoint requiring a specific role returns 401 or 403.
    const meRes = await fetch(`${baseUrl}/api/audit/event-types`, {
      headers: { Authorization: `Bearer ${mfaToken}` },
    });
    expect([401, 403]).toContain(meRes.status);
  });

  it("3. challenge with a valid TOTP issues a full JWT", async () => {
    const code = generateSync({ secret: totpSecret });
    const r = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken, code }),
    });
    expect(r.status).toBe(200);
    const b = await r.json() as { token: string };
    expect(typeof b.token).toBe("string");

    // Full JWT now works against a coordinator-protected endpoint.
    const protRes = await fetch(`${baseUrl}/api/audit/event-types`, {
      headers: { Authorization: `Bearer ${b.token}` },
    });
    expect(protRes.status).toBe(200);
  });

  it("4. challenge with a backup code succeeds ONCE; second use fails", async () => {
    // Fresh mfaToken for this case.
    const login = await loginInitial();
    const freshMfa = login.body.mfaToken as string;
    const usedCode = backupCodes[0];

    const r1 = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken: freshMfa, backupCode: usedCode }),
    });
    expect(r1.status).toBe(200);

    // Re-login → new mfaToken → replay the same backup code → must 401.
    const login2 = await loginInitial();
    const freshMfa2 = login2.body.mfaToken as string;
    const r2 = await fetch(`${baseUrl}/api/auth/mfa/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken: freshMfa2, backupCode: usedCode }),
    });
    expect(r2.status).toBe(401);
  });
});

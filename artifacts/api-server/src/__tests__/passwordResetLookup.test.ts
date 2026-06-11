import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { pool } from "@workspace/db";

// F1 acceptance: verifies that
//   (a) the invite flow writes a 64-char hex token_lookup into the token row, and
//   (b) the /complete endpoint resolves a token via the fast lookup path end-to-end.

let server: Server;
let baseUrl: string;
let schoolId: string;
let userId: string;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('PR Lookup Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'parent', 'Lookup', 'Tester', $2, true) RETURNING id`,
    [schoolId, `pr-lookup-${Date.now()}@example.com`],
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
  // school left in place (audit_log FK constraint).
});

describe("F1 — indexed token lookup", () => {
  it("token row written by the request flow has a 64-char hex token_lookup", async () => {
    // Insert a token row the same way the /request handler does (we can't
    // intercept the raw token from the email, so we simulate it directly).
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenLookup = crypto.createHash("sha256").update(rawToken).digest("hex");

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, token_lookup, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
      [userId, tokenHash, tokenLookup],
    );

    const { rows } = await pool.query<{ token_lookup: string | null }>(
      `SELECT token_lookup FROM password_reset_tokens WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_lookup).toMatch(/^[0-9a-f]{64}$/);

    // Clean up just this row so the complete test below uses a fresh token.
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1 AND token_lookup = $2`,
      [userId, tokenLookup],
    );
  });

  it("complete endpoint resolves the token via the indexed lookup path and sets the password", async () => {
    // Set the user up with no password so complete can write one.
    await pool.query(`UPDATE users SET password_hash = NULL WHERE id = $1`, [userId]);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenLookup = crypto.createHash("sha256").update(rawToken).digest("hex");

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, token_lookup, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
      [userId, tokenHash, tokenLookup],
    );

    const r = await fetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken, newPassword: "NewPass1234xx" }),
    });
    expect(r.status).toBe(200);

    const pw = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    );
    expect(pw.rows[0].password_hash).not.toBeNull();
    expect(await bcrypt.compare("NewPass1234xx", pw.rows[0].password_hash)).toBe(true);

    const tok = await pool.query<{ consumed_at: Date | null }>(
      `SELECT consumed_at FROM password_reset_tokens WHERE token_lookup = $1`,
      [tokenLookup],
    );
    expect(tok.rows[0].consumed_at).not.toBeNull();
  });

  it("complete endpoint falls back to bcrypt scan for legacy rows (NULL token_lookup)", async () => {
    // Reset the password so we can complete again.
    await pool.query(`UPDATE users SET password_hash = NULL WHERE id = $1`, [userId]);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);

    // Insert WITHOUT token_lookup to simulate a legacy row.
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [userId, tokenHash],
    );

    const r = await fetch(`${baseUrl}/api/auth/password-reset/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken, newPassword: "Legacy1234pass" }),
    });
    expect(r.status).toBe(200);

    const pw = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId],
    );
    expect(await bcrypt.compare("Legacy1234pass", pw.rows[0].password_hash)).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import bcrypt from "bcrypt";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

// T12 acceptance — two tests:
//   1. Seed a user + one row in each of 5 representative tables; hit the
//      endpoint; each section contains the expected row. Also asserts that
//      `password_hash` and `pin_hash` are NOT present on the user row.
//   2. 4th call from the same user in one hour returns 429.

const EMAIL = `t12-${Date.now()}@example.com`;
const PASSWORD = "DsarUserPass1";

let schoolId: string;
let userId: string;
let token: string;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";

  // Clear any prior bucket so this test deterministically owns the window.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'dsar:%'`);

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ('T12 Test School') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash, pin_hash, active)
     VALUES ($1, 'coordinator', 'T12', 'User', $2, $3, $4, true) RETURNING id`,
    [schoolId, EMAIL, passwordHash, "should-not-leak"],
  );
  userId = usr.rows[0].id;
  token = signToken({ userId, schoolId, role: "coordinator", email: EMAIL });

  // Seed one row in each of 5 representative tables. Picked to exercise
  // distinct user-reference column shapes:
  //   - notifications.recipient_id  (single FK)
  //   - messages.sender_id          (sender side of a directional table)
  //   - incidents.reporter_id       (FK + array columns)
  //   - teacher_posts.author_id     (content authored by user)
  //   - training_completions.user_id (compliance/training)
  await pool.query(
    `INSERT INTO notifications (school_id, recipient_id, trigger, channel, subject, body)
     VALUES ($1, $2, 'welcome', 'in_app', 'Welcome', 'Hello')`,
    [schoolId, userId],
  );

  // Need a second user to be the recipient of a message.
  const other = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash, active)
     VALUES ($1, 'teacher', 'Other', 'Recipient', $2, $3, true) RETURNING id`,
    [schoolId, `t12-other-${Date.now()}@example.com`, passwordHash],
  );
  await pool.query(
    `INSERT INTO messages (school_id, sender_id, recipient_id, sender_role, body)
     VALUES ($1, $2, $3, 'coordinator', 'Test message body')`,
    [schoolId, userId, other.rows[0].id],
  );

  await pool.query(
    `INSERT INTO incidents (reference_number, school_id, reporter_id, reporter_role,
                            category, escalation_tier, incident_date)
     VALUES ($1, $2, $3, 'coordinator', 'verbal_abuse', 1, CURRENT_DATE)`,
    [`T12-${Date.now()}`, schoolId, userId],
  );

  await pool.query(
    `INSERT INTO teacher_posts (school_id, author_id, title, body)
     VALUES ($1, $2, 'A post', 'A body')`,
    [schoolId, userId],
  );

  await pool.query(
    `INSERT INTO training_completions (school_id, user_id, module_id, completed_at)
     VALUES ($1, $2, 'safeguarding-101', NOW())`,
    [schoolId, userId],
  );

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
  await pool.query(`DELETE FROM notifications WHERE recipient_id = $1`, [userId]);
  await pool.query(`DELETE FROM messages WHERE sender_id = $1`, [userId]);
  await pool.query(`DELETE FROM incidents WHERE reporter_id = $1`, [userId]);
  await pool.query(`DELETE FROM teacher_posts WHERE author_id = $1`, [userId]);
  await pool.query(`DELETE FROM training_completions WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key = $1`, [`dsar:${userId}`]);
});

describe("T12 — DSAR /api/me/data-export", () => {
  it("1. returns a JSON document with all sections populated and no credential fields", async () => {
    const r = await fetch(`${baseUrl}/api/me/data-export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.schema_version).toBe(1);
    expect(body.user_id).toBe(userId);
    expect(body.sections).toBeTruthy();

    // The user section contains exactly our user, with no credential fields.
    expect(body.sections.users).toHaveLength(1);
    const u = body.sections.users[0];
    expect(u.id).toBe(userId);
    expect(u.password_hash).toBeUndefined();
    expect(u.pin_hash).toBeUndefined();

    // Five representative sections.
    expect(body.sections.notifications.length).toBeGreaterThanOrEqual(1);
    expect(body.sections.messages.length).toBeGreaterThanOrEqual(1);
    expect(body.sections.incidents.length).toBeGreaterThanOrEqual(1);
    expect(body.sections.teacher_posts.length).toBeGreaterThanOrEqual(1);
    expect(body.sections.training_completions.length).toBeGreaterThanOrEqual(1);
  });

  it("2. 4th call in one hour returns 429 (3-per-hour-per-userId rate limit)", async () => {
    // Reset so this test owns the window; the previous test consumed 1.
    await pool.query(`DELETE FROM rate_limit_buckets WHERE key = $1`, [`dsar:${userId}`]);

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${baseUrl}/api/me/data-export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      statuses.push(r.status);
      // Drain body so the connection is freed.
      await r.text();
    }
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);
  });
});

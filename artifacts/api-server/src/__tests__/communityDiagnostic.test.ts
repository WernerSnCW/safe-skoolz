import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
let creatorId: string;

const INSTRUMENT = [
  { key: "q_scale", section: "S1", text: "Scale question?", type: "scale", options: ["Never", "Often"] },
  { key: "q_text", section: "S2", text: "Open question?", type: "text", optional: true },
];

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";

  // Clear rate-limit buckets so reruns don't hit the limiter.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'cdiag:%'`);

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('CD Test School', 'cd-test-school-${Date.now()}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;
  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'CD', 'Creator', $2, true) RETURNING id`,
    [schoolId, `cd-creator-${Date.now()}@example.com`],
  );
  creatorId = usr.rows[0].id;
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, created_by, public_slug, instrument)
     VALUES ($1, 'CD Test Survey', 'active', $2, 'cd-test', $3) RETURNING id`,
    [schoolId, creatorId, JSON.stringify(INSTRUMENT)],
  );
  surveyId = svy.rows[0].id;

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
  // Test data cleanup so reruns don't collide on the fixed 'cd-test' slug.
  // Fix 5: poll until the password_reset_tokens count for this school's users
  // stops growing (or up to 3s), so in-flight async invite writes settle before
  // we DELETE. Avoids a fixed sleep that is either too short or wastes CI time.
  let prev = -1;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE school_id = $1)`,
      [schoolId],
    );
    const cur = rows[0].c;
    if (cur === prev) break;
    prev = cur;
    await new Promise((r) => setTimeout(r, 100));
  }
  try { await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_response_meta WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE school_id = $1)`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_surveys WHERE id = $1`, [surveyId]); } catch {}
  // Note: audit_log is append-only (DB trigger blocks DELETE). Users/schools are
  // intentionally left (same pattern as dsar.test.ts); only the survey rows that
  // carry the fixed slug 'cd-test' must be removed to allow reruns.
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /api/d/:slug", () => {
  it("returns the survey shape without auth", async () => {
    const r = await fetch(`${baseUrl}/api/d/cd-test`);
    expect(r.status).toBe(200);
    const body = await r.json() as any;
    expect(body.title).toBe("CD Test Survey");
    expect(body.questions).toHaveLength(2);
    expect(body.questions[0].key).toBe("q_scale");
    expect(body.submissionCount).toBe(0);
    expect(body.released).toBe(false);
    expect(body.schoolId).toBeUndefined();
    expect(body.id).toBeUndefined();
  });

  it("404s on an unknown slug", async () => {
    const r = await fetch(`${baseUrl}/api/d/does-not-exist`);
    expect(r.status).toBe(404);
  });
});

describe("POST /api/d/:slug/submit", () => {
  const submit = (body: unknown) =>
    fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("accepts a valid submission and stores answers unlinked", async () => {
    const r = await submit({
      email: "Parent.One@Example.com",
      name: "Parent One",
      yearGroup: "Y4",
      classOrTeacher: "4B",
      answers: [
        { questionKey: "q_scale", answer: 1 },
        { questionKey: "q_text", freeText: "hello" },
      ],
    });
    expect(r.status).toBe(201);
    const body = await r.json() as any;
    expect(body.counted).toBe(true);
    expect(body.count).toBe(1);

    const sub = await pool.query(`SELECT * FROM diagnostic_submissions WHERE survey_id = $1`, [surveyId]);
    expect(sub.rows).toHaveLength(1);
    expect(sub.rows[0].email).toBe("parent.one@example.com");
    expect(Object.keys(sub.rows[0])).not.toContain("response_id");

    const ans = await pool.query(`SELECT * FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]);
    expect(ans.rows).toHaveLength(2);
    expect(ans.rows[0].response_id).toBe(ans.rows[1].response_id);
    expect(Object.keys(ans.rows[0])).not.toContain("submission_id");

    const meta = await pool.query(`SELECT * FROM diagnostic_response_meta WHERE survey_id = $1`, [surveyId]);
    expect(meta.rows).toHaveLength(1);
    expect(meta.rows[0].year_group).toBe("Y4");
    expect(meta.rows[0].response_id).toBe(ans.rows[0].response_id);
  });

  it("rejects a second submission from the same email (case-insensitive)", async () => {
    const r = await submit({
      email: "parent.one@example.com",
      answers: [{ questionKey: "q_scale", answer: 0 }],
    });
    expect(r.status).toBe(409);
    const after = await pool.query(`SELECT count(*)::int AS c FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]);
    expect(after.rows[0].c).toBe(2);
  });

  it("rejects unknown question keys and missing email", async () => {
    const bad1 = await submit({ email: "x@y.com", answers: [{ questionKey: "nope", answer: 1 }] });
    expect(bad1.status).toBe(400);
    const bad2 = await submit({ answers: [{ questionKey: "q_scale", answer: 1 }] });
    expect(bad2.status).toBe(400);
  });

  it("rejects a submission missing required questions", async () => {
    // q_scale is non-optional; q_text is optional — submitting only q_text must fail.
    const r = await submit({
      email: `missing-required-${Date.now()}@example.com`,
      answers: [{ questionKey: "q_text", freeText: "x" }],
    });
    expect(r.status).toBe(400);
    const body = await r.json() as any;
    expect(body.error).toMatch(/answer every question/i);
  });
});

describe("signup invite on submission", () => {
  it("creates a pending parent account and a reset token", async () => {
    const email = `invitee-${Date.now()}@example.com`;
    const r = await fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: "Invited Parent", answers: [{ questionKey: "q_scale", answer: 1 }] }),
    });
    expect(r.status).toBe(201);

    // poll up to ~2s for the async invite to land
    let rows: any[] = [];
    for (let i = 0; i < 20 && rows.length === 0; i++) {
      await new Promise((rr) => setTimeout(rr, 100));
      rows = (await pool.query(`SELECT * FROM users WHERE email = $1`, [email])).rows;
    }
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("parent");
    expect(rows[0].membership_status).toBe("pending");
    expect(rows[0].password_hash).toBeNull();

    // Poll for the token (inserted after the user in the same async block).
    let tokRows: any[] = [];
    for (let i = 0; i < 20 && tokRows.length === 0; i++) {
      await new Promise((rr) => setTimeout(rr, 100));
      tokRows = (await pool.query(`SELECT * FROM password_reset_tokens WHERE user_id = $1`, [rows[0].id])).rows;
    }
    expect(tokRows).toHaveLength(1);
  });

  it("does not create a duplicate user when the email already has an account", async () => {
    const email = `existing-${Date.now()}@example.com`;
    await pool.query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active)
       VALUES ($1, 'parent', 'Already', 'Here', $2, true)`,
      [schoolId, email],
    );
    const r = await fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answers: [{ questionKey: "q_scale", answer: 2 }] }),
    });
    expect(r.status).toBe(201);
    // allow the async invite to settle before counting
    await new Promise((rr) => setTimeout(rr, 500));
    const usr = await pool.query(`SELECT count(*)::int AS c FROM users WHERE email = $1`, [email]);
    expect(usr.rows[0].c).toBe(1);
  });

  it("does not send a token to an account that already has a password", async () => {
    const email = `haspw-${Date.now()}@example.com`;
    // Insert a user that already has a password hash (simulating a fully-created account).
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active, password_hash)
       VALUES ($1, 'parent', 'Has', 'Password', $2, true, $3) RETURNING id`,
      [schoolId, email, '$2b$12$abcdefghijklmnopqrstuv'],
    );
    const userId = rows[0].id;

    const r = await fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answers: [{ questionKey: "q_scale", answer: 3 }] }),
    });
    expect(r.status).toBe(201);

    // Poll up to ~1s to confirm no token was inserted for this user.
    let tokenCount = 0;
    for (let i = 0; i < 10; i++) {
      await new Promise((rr) => setTimeout(rr, 100));
      const res = await pool.query<{ c: number }>(
        `SELECT count(*)::int AS c FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );
      tokenCount = res.rows[0].c;
    }
    expect(tokenCount).toBe(0);
  });
});

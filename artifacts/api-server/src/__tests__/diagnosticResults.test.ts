import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
let execToken: string;
let parentToken: string;

const stamp = Date.now();
const INSTRUMENT = [
  { key: "q_scale", section: "S1", text: "Scale?", type: "scale", options: ["No", "Sometimes", "Yes"] },
  { key: "q_open", section: "S2", text: "Open?", type: "text", optional: true },
];

async function seedResponse(answerIdx: number, yearGroup: string | null, freeText?: string) {
  const { rows } = await pool.query<{ rid: string }>(`SELECT gen_random_uuid() AS rid`);
  const rid = rows[0].rid;
  await pool.query(
    `INSERT INTO diagnostic_answers (survey_id, response_id, question_key, answer) VALUES ($1, $2, 'q_scale', $3)`,
    [surveyId, rid, answerIdx],
  );
  if (freeText) {
    await pool.query(
      `INSERT INTO diagnostic_answers (survey_id, response_id, question_key, free_text) VALUES ($1, $2, 'q_open', $3)`,
      [surveyId, rid, freeText],
    );
  }
  if (yearGroup) {
    await pool.query(
      `INSERT INTO diagnostic_response_meta (survey_id, response_id, year_group) VALUES ($1, $2, $3)`,
      [surveyId, rid, yearGroup],
    );
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Res Test School', 'res-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;
  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'Res', 'Exec', $2, true) RETURNING id`,
    [schoolId, `res-exec-${stamp}@example.com`],
  );
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta" });
  const parent = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'parent', 'Res', 'Parent', $2, true) RETURNING id`,
    [schoolId, `res-parent-${stamp}@example.com`],
  );
  parentToken = signToken({ userId: parent.rows[0].id, schoolId, role: "parent" });
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, created_by, public_slug, instrument)
     VALUES ($1, 'Res Survey', 'active', $2, 'res-test-${stamp}', $3) RETURNING id`,
    [schoolId, exec.rows[0].id, JSON.stringify(INSTRUMENT)],
  );
  surveyId = svy.rows[0].id;

  for (let i = 0; i < 5; i++) await seedResponse(2, "Y4", i === 0 ? "Y4 says hi" : undefined);
  for (let i = 0; i < 2; i++) await seedResponse(0, "Y5");
  await pool.query(
    `INSERT INTO diagnostic_submissions (survey_id, email, email_hash) VALUES ($1, $2, $3)`,
    [surveyId, `res-parent-${stamp}@example.com`, `hash-${stamp}`],
  );

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_response_meta WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_surveys WHERE id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM notifications WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("GET /api/d/:slug/results", () => {
  it("requires auth", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`);
    expect(r.status).toBe(401);
  });

  it("locks results for a non-exec until released", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(parentToken) });
    expect(r.status).toBe(403);
  });

  it("lets an exec see results before release, with suppression and shuffled free-text", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(execToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.totalResponses).toBe(7);
    const q = body.questions.find((x: any) => x.key === "q_scale");
    expect(q.distribution).toEqual([2, 0, 5]);
    expect(q.distribution.reduce((a: number, b: number) => a + b, 0)).toBe(7);
    const segYears = q.segments.map((s: any) => s.yearGroup);
    expect(segYears).toContain("Y4");
    expect(segYears).not.toContain("Y5");
    expect(Array.isArray(body.freeText)).toBe(true);
    expect(body.freeText.length).toBe(1);
  });
});

describe("POST /api/d/:slug/release", () => {
  it("403s for a non-exec", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(parentToken) });
    expect(r.status).toBe(403);
  });

  it("releases for an exec, notifies participants, and is idempotent", async () => {
    const r1 = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(execToken) });
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.released).toBe(true);
    expect(b1.releasedAt).toBeTruthy();

    const n = await pool.query(`SELECT * FROM notifications WHERE school_id = $1 AND trigger = 'results_released'`, [schoolId]);
    expect(n.rows.length).toBeGreaterThanOrEqual(1);

    const r2 = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(execToken) });
    expect(r2.status).toBe(200);
  });

  it("now lets a non-exec participant see released results (no free-text)", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(parentToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.released).toBe(true);
    expect(body.freeText).toBeUndefined();
  });
});

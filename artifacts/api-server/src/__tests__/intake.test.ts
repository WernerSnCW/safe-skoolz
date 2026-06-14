import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
const SLUG = `intake-${Date.now().toString(36)}`;

const INSTRUMENT = [
  { key: "d1", section: "PTA", text: "PTA?", type: "multi", options: ["a", "b", "c"] },
  { key: "d2", section: "Pupil", text: "Pupil?", type: "multi", options: ["x", "y"] },
];

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Intake Test', $1) RETURNING id`, [SLUG]);
  schoolId = sch.rows[0].id;
  const u = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','I','T',$2) RETURNING id`,
    [schoolId, `${SLUG}@t.example`]);
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument)
     VALUES ($1, 'Intake ${SLUG}', 'active', 'intake', $2, $3, $4) RETURNING id`,
    [schoolId, u.rows[0].id, SLUG, JSON.stringify(INSTRUMENT)]);
  surveyId = svy.rows[0].id;
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  try { await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id=$1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id=$1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_surveys WHERE id=$1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
});

const submit = (email: string, selections: Record<string, number[]>) =>
  fetch(`${baseUrl}/api/intake/${SLUG}/submit`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, selections }),
  });

describe("POST /api/intake/:slug/submit", () => {
  it("stores one unlinkable answer row per selected option", async () => {
    const r = await submit("parent.a@t.example", { d1: [0, 2], d2: [1] });
    expect(r.status).toBe(201);
    const ans = await pool.query(`SELECT * FROM diagnostic_answers WHERE survey_id=$1`, [surveyId]);
    expect(ans.rows).toHaveLength(3);
    const ids = new Set(ans.rows.map((x: any) => x.response_id));
    expect(ids.size).toBe(1); // one respondent
    expect(Object.keys(ans.rows[0])).not.toContain("submission_id");
  });

  it("rejects a duplicate email (409)", async () => {
    const r = await submit("parent.a@t.example", { d1: [1] });
    expect(r.status).toBe(409);
  });

  it("rejects unknown keys / out-of-range option indices (400)", async () => {
    expect((await submit("z@t.example", { nope: [0] })).status).toBe(400);
    expect((await submit("z2@t.example", { d2: [9] })).status).toBe(400);
  });
});

describe("GET /api/intake/:slug/aggregate", () => {
  it("suppresses the COUNTS below n>=5 but always returns the domain/option shape, then reveals counts", async () => {
    // 1 respondent so far -> suppressed, but the shape (domains + options) is
    // ALWAYS present so the intake form can render its questions.
    let r = await fetch(`${baseUrl}/api/intake/${SLUG}/aggregate`);
    let body = await r.json();
    expect(body.suppressed).toBe(true);
    expect(body.n).toBe(1);
    // Shape present even while suppressed:
    expect(Array.isArray(body.domains)).toBe(true);
    expect(body.domains).toHaveLength(INSTRUMENT.length);
    const sd1 = body.domains.find((d: any) => d.key === "d1");
    expect(sd1.section).toBe("PTA");
    expect(sd1.options).toEqual(["a", "b", "c"]);
    // Counts are gated while suppressed:
    expect(sd1.counts == null).toBe(true);

    for (const e of ["b", "c", "d", "e"]) await submit(`p.${e}@t.example`, { d1: [0], d2: [0] });
    r = await fetch(`${baseUrl}/api/intake/${SLUG}/aggregate`);
    body = await r.json();
    expect(body.suppressed).toBe(false);
    expect(body.n).toBe(5);
    const d1 = body.domains.find((d: any) => d.key === "d1");
    expect(d1.options).toEqual(["a", "b", "c"]); // shape still present
    expect(d1.counts[0]).toBe(5); // option 0 chosen by all 5 — counts now revealed
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);

// Two tenants: community (caps {}) and whole-school (caps with safeguarding on).
let commSchool: string, wsSchool: string, commSurvey: string, wsSurvey: string, commIntake: string;
let commMemberTok: string, wsMemberTok: string;

const DEEP = [{ key: "q1", section: "S", text: "Q?", type: "scale", options: ["lo", "hi"] }];
const INTAKE = [{ key: "d1", section: "PTA", text: "?", type: "multi", options: ["a", "b"] }];

function mint(userId: string, schoolId: string, role: string) {
  return jwt.sign({ userId, schoolId, role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // community tenant — release_threshold 5, capabilities {}
  const cs = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, release_threshold) VALUES ('Comm ${TAG}', 'comm-${TAG}', 5) RETURNING id`);
  commSchool = cs.rows[0].id;
  // whole-school tenant — safeguarding on
  const ws = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, capabilities) VALUES ('WS ${TAG}', 'ws-${TAG}', '{"safeguarding":true}') RETURNING id`);
  wsSchool = ws.rows[0].id;

  const cu = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','C','M',$2,'approved') RETURNING id`, [commSchool, `cm-${TAG}@t.example`]);
  const wu = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','W','M',$2,'approved') RETURNING id`, [wsSchool, `wm-${TAG}@t.example`]);
  commMemberTok = mint(cu.rows[0].id, commSchool, "parent");
  wsMemberTok = mint(wu.rows[0].id, wsSchool, "parent");

  const csv = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'Deep ${TAG}','active','deep',$2,'comm-${TAG}',$3) RETURNING id`, [commSchool, cu.rows[0].id, JSON.stringify(DEEP)]);
  commSurvey = csv.rows[0].id;
  const cintake = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'Intake ${TAG}','active','intake',$2,'comm-intake-${TAG}',$3) RETURNING id`, [commSchool, cu.rows[0].id, JSON.stringify(INTAKE)]);
  commIntake = cintake.rows[0].id;
  const wsv = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'WS Deep ${TAG}','active','deep',$2,'ws-${TAG}',$3) RETURNING id`, [wsSchool, wu.rows[0].id, JSON.stringify(DEEP)]);
  wsSurvey = wsv.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  for (const id of [commSchool, wsSchool]) {
    try { await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE school_id=$1)`, [id]); } catch {}
    try { await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE school_id=$1)`, [id]); } catch {}
    try { await pool.query(`DELETE FROM diagnostic_surveys WHERE school_id=$1`, [id]); } catch {}
    try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [id]); } catch {}
    try { await pool.query(`DELETE FROM schools WHERE id=$1`, [id]); } catch {}
  }
});

// Intake resolves by SCHOOL slug now (the school's kind='intake' survey by
// schoolId), so POST to the school slug, not the intake survey's publicSlug.
const intakeSubmit = (email: string) =>
  fetch(`${baseUrl}/api/intake/comm-${TAG}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, selections: { d1: [0] } }) });

const results = (slug: string, tok: string) =>
  fetch(`${baseUrl}/api/d/${slug}/results`, { headers: { Authorization: `Bearer ${tok}` } });

describe("community-mode threshold release", () => {
  it("withholds the deep diagnostic below the threshold, then releases at it", async () => {
    // 0 intake submissions -> not released for the approved member
    let r = await results(`comm-${TAG}`, commMemberTok);
    expect(r.status).toBe(403);
    expect((await r.json()).released).toBe(false);
    // reach the threshold (5)
    for (const e of ["a", "b", "c", "d", "e"]) await intakeSubmit(`thr.${e}-${TAG}@t.example`);
    r = await results(`comm-${TAG}`, commMemberTok);
    expect(r.status).toBe(200);
    expect((await r.json()).released).toBe(true);
  });
});

describe("whole-school regression — manual release unchanged", () => {
  it("does NOT auto-release on threshold; member is still gated until exec releases", async () => {
    // whole-school survey has no intake-threshold behaviour and releasedAt is null
    const r = await results(`ws-${TAG}`, wsMemberTok);
    expect(r.status).toBe(403);
    expect((await r.json()).released).toBe(false);
  });
});

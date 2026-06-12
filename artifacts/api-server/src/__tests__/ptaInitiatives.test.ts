import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let strangerTok: string;
let adminUserId: string; let ratifiedGoalId: string; let proposedGoalId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Init Test','init-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `init-admin-${stamp}@example.com`]);
  adminUserId = admin.rows[0].id;
  adminTok = signToken({ userId: adminUserId, schoolId, role: "pta" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active')`, [schoolId, adminUserId]);

  const stranger = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','St','Ranger',$2,true) RETURNING id`,
    [schoolId, `init-stranger-${stamp}@example.com`]);
  strangerTok = signToken({ userId: stranger.rows[0].id, schoolId, role: "parent" });

  const rg = await pool.query<{ id: string }>(
    `INSERT INTO pta_goals (school_id, title, year, status, proposed_by_id, ratified_at) VALUES ($1,'Ratified goal',2026,'ratified',$2, now()) RETURNING id`,
    [schoolId, adminUserId]);
  ratifiedGoalId = rg.rows[0].id;
  const pg = await pool.query<{ id: string }>(
    `INSERT INTO pta_goals (school_id, title, year, status, proposed_by_id) VALUES ($1,'Proposed goal',2026,'proposed',$2) RETURNING id`,
    [schoolId, adminUserId]);
  proposedGoalId = pg.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_initiative_stage_history WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_initiatives WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_goals WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
// Shared helper: create an initiative via the API, return its id.
async function createInitiative(body: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "T", summary: "S", ...body }) });
  if (r.status !== 201) throw new Error(`create failed ${r.status}: ${await r.text()}`);
  return (await r.json()).initiative.id;
}
export { }; // keep this a module

describe("POST /api/pta/initiatives (one-page note)", () => {
  it("requires MANAGE (stranger 403)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ title: "X", summary: "Y" }) });
    expect(r.status).toBe(403);
  });
  it("creates with the one-page-note fields (201)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({
      title: "Reading corner", summary: "Build a calm reading nook", goalId: ratifiedGoalId,
      successCriteria: "Nook used daily by week 3", resourcesNeeded: "Beanbags", conflicts: "None",
    }) });
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.initiative.goalId).toBe(ratifiedGoalId);
    expect(b.initiative.successCriteria).toBe("Nook used daily by week 3");
    expect(b.initiative.schoolStage).toBe("none");
    expect(b.initiative.checklist.alignsGoal).toBe(false);
    expect(b.initiative.approvalType ?? null).toBe(null);
  });
  it("allows an UNratified goal at creation (alignment is enforced at sign-off, not creation)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "Early", summary: "S", goalId: proposedGoalId }) });
    expect(r.status).toBe(201);
  });
  it("rejects a goalId from another school (404)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "Bad", summary: "S", goalId: "00000000-0000-0000-0000-000000000000" }) });
    expect(r.status).toBe(404);
  });
  it("still requires title + summary (400)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "" }) });
    expect(r.status).toBe(400);
  });
});

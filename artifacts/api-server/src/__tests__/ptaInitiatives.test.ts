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

describe("PATCH /api/pta/initiatives/:id (note + checklist)", () => {
  it("edits the one-page-note fields", async () => {
    const id = await createInitiative({ goalId: ratifiedGoalId });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ successCriteria: "Updated", resourcesNeeded: "Paint", conflicts: "Clashes with fair" }) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.initiative.successCriteria).toBe("Updated");
    expect(b.initiative.conflicts).toBe("Clashes with fair");
  });
  it("merges checklist booleans (partial update keeps the others)", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { namedOwner: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { budgetOk: true } }) });
    const b = await r.json();
    expect(b.initiative.checklist.namedOwner).toBe(true);
    expect(b.initiative.checklist.budgetOk).toBe(true);
    expect(b.initiative.checklist.alignsGoal).toBe(false);
  });
  it("changes goalId (school-scoped)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ goalId: ratifiedGoalId }) });
    expect(r.status).toBe(200);
    expect((await r.json()).initiative.goalId).toBe(ratifiedGoalId);
  });
  it("rejects a checklist with an unknown key (400)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { bogus: true } }) });
    expect(r.status).toBe(400);
  });
});

describe("GET /api/pta/initiatives (extended list)", () => {
  it("returns goal title, schoolStage, checklist, and computed awaitingResponse + followUpCount", async () => {
    await createInitiative({ goalId: ratifiedGoalId, successCriteria: "X" });
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { headers: auth(adminTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    const row = b.initiatives.find((i: any) => i.goalId === ratifiedGoalId);
    expect(row.goalTitle).toBe("Ratified goal");
    expect(row.goalStatus).toBe("ratified");
    expect(row.schoolStage).toBe("none");
    expect(row.checklist).toBeTruthy();
    expect(row.awaitingResponse).toBe(false);
    expect(row.followUpCount).toBe(0);
    expect(row.approvalType ?? null).toBe(null);
  });
});

describe("POST /api/pta/initiatives/:id/approve", () => {
  // Fully-backed, all six boxes ticked → self-approvable.
  async function backedInitiative(): Promise<string> {
    const id = await createInitiative({ goalId: ratifiedGoalId, ownerId: adminUserId, successCriteria: "Done when X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: true, noSchoolResource: true } }) });
    return id;
  }
  it("self-approves when all six boxes ticked + backed (stamps approver/type)", async () => {
    const id = await backedInitiative();
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.initiative.approvalType).toBe("self");
    expect(b.initiative.approvedById).toBe(adminUserId);
    expect(b.initiative.approvedAt).toBeTruthy();
  });
  it("blocks self-approve when a box is unticked (409)", async () => {
    const id = await createInitiative({ goalId: ratifiedGoalId, ownerId: adminUserId, successCriteria: "X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: false, noSchoolResource: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(409);
  });
  it("blocks self-approve when alignsGoal ticked but goal is NOT ratified (409)", async () => {
    const id = await createInitiative({ goalId: proposedGoalId, ownerId: adminUserId, successCriteria: "X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: true, noSchoolResource: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(409);
  });
  it("board-approves with no checklist gate (record-only)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board", boardNote: "Approved at exec board 12 Jun" }) });
    expect(r.status).toBe(200);
    expect((await r.json()).initiative.approvalType).toBe("board");
  });
  it("is idempotent — re-approving an approved initiative 409s", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board" }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board" }) });
    expect(r.status).toBe(409);
  });
  it("rejects an invalid approvalType (400) and a stranger (403)", async () => {
    const id = await createInitiative({});
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "magic" }) })).status).toBe(400);
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ approvalType: "board" }) })).status).toBe(403);
  });
});

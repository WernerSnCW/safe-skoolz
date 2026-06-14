import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string;
let seniorTok: string; let generalTok: string;
let seniorMemberId: string; let generalMemberId: string;
let seniorBallotId: string; let allBallotId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Elec Test','elec-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const su = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Se','Nior',$2,true) RETURNING id`,
    [schoolId, `elec-senior-${stamp}@example.com`]);
  seniorTok = signToken({ userId: su.rows[0].id, schoolId, role: "parent" });
  const sm = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'senior_group','active') RETURNING id`, [schoolId, su.rows[0].id]);
  seniorMemberId = sm.rows[0].id;

  const gu = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Ge','Neral',$2,true) RETURNING id`,
    [schoolId, `elec-general-${stamp}@example.com`]);
  generalTok = signToken({ userId: gu.rows[0].id, schoolId, role: "parent" });
  const gm = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active') RETURNING id`, [schoolId, gu.rows[0].id]);
  generalMemberId = gm.rows[0].id;

  // The vote route guard is requireRole("pta"); the ELECTORATE guard checks the
  // pta_members tier, independent of the JWT role. Sign both voters as pta so they
  // pass the route guard; their tier is what the electorate guard evaluates.
  seniorTok = signToken({ userId: su.rows[0].id, schoolId, role: "pta" });
  generalTok = signToken({ userId: gu.rows[0].id, schoolId, role: "pta" });

  const sb = await pool.query<{ id: string }>(
    `INSERT INTO pta_ballots (school_id, question, options, electorate, created_by_id, status) VALUES ($1,'Senior only?','["For","Against","Abstain"]','senior_group',$2,'open') RETURNING id`,
    [schoolId, su.rows[0].id]);
  seniorBallotId = sb.rows[0].id;
  const ab = await pool.query<{ id: string }>(
    `INSERT INTO pta_ballots (school_id, question, options, electorate, created_by_id, status) VALUES ($1,'Everyone?','["For","Against","Abstain"]','all_members',$2,'open') RETURNING id`,
    [schoolId, su.rows[0].id]);
  allBallotId = ab.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_votes WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_ballots WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const vote = (ballotId: string, tok: string) =>
  fetch(`${baseUrl}/api/pta/ballots/${ballotId}/vote`, { method: "POST", headers: auth(tok), body: JSON.stringify({ choice: "For" }) });

describe("ballot electorate guard", () => {
  it("senior_group member may vote a senior_group ballot", async () => {
    expect((await vote(seniorBallotId, seniorTok)).status).toBe(201);
  });
  it("general_membership member is rejected from a senior_group ballot", async () => {
    const r = await vote(seniorBallotId, generalTok);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/senior group/i);
  });
  it("general_membership member may vote an all_members ballot (unchanged)", async () => {
    expect((await vote(allBallotId, generalTok)).status).toBe(201);
  });
});

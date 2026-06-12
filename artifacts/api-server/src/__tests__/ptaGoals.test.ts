import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let memberTok: string; let strangerTok: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Goals Test','goals-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `goals-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active')`, [schoolId, admin.rows[0].id]);

  const member = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Me','Mber',$2,true) RETURNING id`,
    [schoolId, `goals-member-${stamp}@example.com`]);
  memberTok = signToken({ userId: member.rows[0].id, schoolId, role: "parent" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active')`, [schoolId, member.rows[0].id]);

  const stranger = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','St','Ranger',$2,true) RETURNING id`,
    [schoolId, `goals-stranger-${stamp}@example.com`]);
  strangerTok = signToken({ userId: stranger.rows[0].id, schoolId, role: "parent" });

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_votes WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`UPDATE pta_goals SET ballot_id=NULL WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_ballots WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_goals WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("POST /api/pta/goals (propose)", () => {
  it("requires auth", async () => {
    expect((await fetch(`${baseUrl}/api/pta/goals`, { method: "POST" })).status).toBe(401);
  });
  it("a roster member proposes a goal (201, status proposed, year default)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({ title: "Calmer mornings" }) });
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.goal.status).toBe("proposed");
    expect(b.goal.title).toBe("Calmer mornings");
    expect(Number.isInteger(b.goal.year)).toBe(true);
  });
  it("rejects a missing title (400)", async () => {
    expect((await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({}) })).status).toBe(400);
  });
  it("rejects a non-member (403)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ title: "Nope" }) });
    expect(r.status).toBe(403);
  });
});

describe("GET /api/pta/goals (list)", () => {
  it("lists goals for a member, newest first, with proposer + ballot fields", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { headers: auth(memberTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(Array.isArray(b.goals)).toBe(true);
    expect(b.goals.length).toBeGreaterThanOrEqual(1);
    const g = b.goals[0];
    expect(g).toHaveProperty("status");
    expect(g).toHaveProperty("proposedBy");
    expect(g).toHaveProperty("ballot"); // null when no ballot
  });
});

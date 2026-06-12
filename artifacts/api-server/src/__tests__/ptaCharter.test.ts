import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let schoolId: string; let adminTok: string; let memberId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Charter Test', 'charter-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;
  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `charter-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });
  const m = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active') RETURNING id`,
    [schoolId, admin.rows[0].id]);
  memberId = m.rows[0].id;
  await pool.query(`INSERT INTO pta_officers (school_id, member_id, role, active) VALUES ($1,$2,'president',true)`, [schoolId, memberId]);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_policy_acknowledgements WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_officers WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("GET /api/pta/charter", () => {
  it("requires auth", async () => {
    expect((await fetch(`${baseUrl}/api/pta/charter`)).status).toBe(401);
  });
  it("returns the charter content, claim status, officer seats, and acks", async () => {
    const r = await fetch(`${baseUrl}/api/pta/charter`, { headers: auth(adminTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.version).toBe("operating-structure-v1");
    expect(Array.isArray(b.sections)).toBe(true);
    expect(b.sections.length).toBeGreaterThanOrEqual(3);
    expect(b.claimed).toBe(false);
    expect(b.claimedAt).toBeNull();
    expect(b.officers.some((o: any) => o.role === "president")).toBe(true);
    expect(Array.isArray(b.acknowledgements)).toBe(true);
  });
});

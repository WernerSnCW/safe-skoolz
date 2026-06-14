import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let schoolId: string; let parentTok: string; let execTok: string; let parentId: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Conc', 'conc-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;
  const p = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status) VALUES ($1,'parent','P','One',$2,true,'approved') RETURNING id`, [schoolId, `cp-${stamp}@example.com`]);
  parentId = p.rows[0].id; parentTok = signToken({ userId: parentId, schoolId, role: "parent" });
  const e = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','E','Xec',$2,true) RETURNING id`, [schoolId, `ce-${stamp}@example.com`]);
  execTok = signToken({ userId: e.rows[0].id, schoolId, role: "pta" });
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_concerns WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});
const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("concerns", () => {
  it("a parent submits a concern", async () => {
    const r = await fetch(`${baseUrl}/api/concerns`, { method: "POST", headers: auth(parentTok), body: JSON.stringify({ body: "Something I've noticed." }) });
    expect(r.status).toBe(201);
    const row = await pool.query(`SELECT * FROM voice_concerns WHERE school_id = $1`, [schoolId]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].status).toBe("pending");
  });
  it("400s on empty body", async () => {
    expect((await fetch(`${baseUrl}/api/concerns`, { method: "POST", headers: auth(parentTok), body: JSON.stringify({ body: "" }) })).status).toBe(400);
  });
  it("a non-exec cannot list concerns", async () => {
    expect((await fetch(`${baseUrl}/api/concerns`, { headers: auth(parentTok) })).status).toBe(403);
  });
  it("an exec lists concerns for their school", async () => {
    const r = await fetch(`${baseUrl}/api/concerns`, { headers: auth(execTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.concerns.length).toBeGreaterThanOrEqual(1);
  });
});

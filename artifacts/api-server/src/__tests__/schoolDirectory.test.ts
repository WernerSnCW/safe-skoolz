import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string; let schoolId: string;
const stamp = Date.now(); const slug = `dir-test-${stamp}`;
beforeAll(async () => {
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Directory Test School ${stamp}', $1) RETURNING id`, [slug]);
  schoolId = sch.rows[0].id;
  const chair = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','C','H',$2,true) RETURNING id`, [schoolId, `dchair-${stamp}@example.com`]);
  await pool.query(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'Dir Vibes','m','advocating',$2)`, [schoolId, chair.rows[0].id]);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  try { await pool.query(`DELETE FROM school_create_requests WHERE requested_by_email LIKE $1`, [`%${stamp}%`]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

describe("school directory", () => {
  it("search returns matching active schools with hasVibes", async () => {
    const r = await fetch(`${baseUrl}/api/schools/search?q=Directory%20Test%20School%20${stamp}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    const mine = b.schools.find((s: any) => s.slug === slug);
    expect(mine).toBeTruthy();
    expect(mine.hasVibes).toBe(true);
  });
  it("empty query returns empty list", async () => {
    const r = await fetch(`${baseUrl}/api/schools/search?q=`);
    expect(r.status).toBe(200);
    expect((await r.json()).schools).toEqual([]);
  });
  it("create-request stores a row", async () => {
    const r = await fetch(`${baseUrl}/api/schools/create-request`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolName: "New School", email: `req-${stamp}@example.com` }),
    });
    expect(r.status).toBe(201);
    const rows = await pool.query(`SELECT * FROM school_create_requests WHERE requested_by_email = $1`, [`req-${stamp}@example.com`]);
    expect(rows.rows).toHaveLength(1);
  });
  it("create-request 400s on missing name or bad email", async () => {
    expect((await fetch(`${baseUrl}/api/schools/create-request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolName: "", email: "bad" }) })).status).toBe(400);
  });
});

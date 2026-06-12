import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let voiceId: string;
const stamp = Date.now();
const slug = `signup-test-${stamp}`;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Signup Test School', $1) RETURNING id`, [slug]);
  schoolId = sch.rows[0].id;
  const chair = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'Ch', 'Air', $2, true) RETURNING id`, [schoolId, `chair-${stamp}@example.com`]);
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id)
     VALUES ($1, 'Test Vibes', 'mission', 'advocating', $2) RETURNING id`, [schoolId, chair.rows[0].id]);
  voiceId = v.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const signup = (body: unknown) => fetch(`${baseUrl}/api/auth/signup`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("POST /api/auth/signup", () => {
  it("creates a pending parent, backs the voice group, and returns a token", async () => {
    const r = await signup({ email: `New.Parent-${stamp}@Example.com`, password: "hunter2pass", name: "New Parent", schoolSlug: slug });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(typeof body.token).toBe("string");
    expect(body.user.role).toBe("parent");

    const u = await pool.query(`SELECT * FROM users WHERE email = $1`, [`new.parent-${stamp}@example.com`]);
    expect(u.rows).toHaveLength(1);
    expect(u.rows[0].membership_status).toBe("pending");
    expect(u.rows[0].password_hash).toBeTruthy();

    const m = await pool.query(`SELECT * FROM voice_members WHERE voice_id = $1 AND user_id = $2`, [voiceId, u.rows[0].id]);
    expect(m.rows).toHaveLength(1);
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    const r = await signup({ email: `NEW.parent-${stamp}@example.com`, password: "hunter2pass", schoolSlug: slug });
    expect(r.status).toBe(409);
  });

  it("400s on a bad email or short password", async () => {
    expect((await signup({ email: "nope", password: "hunter2pass", schoolSlug: slug })).status).toBe(400);
    expect((await signup({ email: `x-${stamp}@example.com`, password: "short", schoolSlug: slug })).status).toBe(400);
  });

  it("404s on an unknown school slug", async () => {
    const r = await signup({ email: `y-${stamp}@example.com`, password: "hunter2pass", schoolSlug: "does-not-exist" });
    expect(r.status).toBe(404);
  });

  it("lets the new parent log in (email stored lowercased)", async () => {
    const r = await fetch(`${baseUrl}/api/auth/parent/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `New.Parent-${stamp}@example.com`, password: "hunter2pass" }),
    });
    expect(r.status).toBe(200);
  });
});

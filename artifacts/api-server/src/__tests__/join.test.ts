import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string; let schoolId: string; let voiceId: string;
const stamp = Date.now(); const slug = `join-test-${stamp}`;

beforeAll(async () => {
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Join Test', $1) RETURNING id`, [slug]);
  schoolId = sch.rows[0].id;
  const chair = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','C','H',$2,true) RETURNING id`,
    [schoolId, `jchair-${stamp}@example.com`]);
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'Join Vibes','the mission','advocating',$2) RETURNING id`,
    [schoolId, chair.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, chair.rows[0].id]);
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

describe("GET /api/join/:slug", () => {
  it("returns school + vibes summary with a live join count, no auth", async () => {
    const r = await fetch(`${baseUrl}/api/join/${slug}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.schoolName).toBe("Join Test");
    expect(b.voiceName).toBe("Join Vibes");
    expect(b.joinCount).toBe(1);
    expect(b.schoolId).toBeUndefined();
  });
  it("404s for an unknown slug", async () => {
    expect((await fetch(`${baseUrl}/api/join/nope-${stamp}`)).status).toBe(404);
  });
});

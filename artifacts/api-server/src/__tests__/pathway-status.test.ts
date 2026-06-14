import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, memberTok: string, otherSchoolTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Stat ${TAG}','stat-${TAG}',3) RETURNING id`);
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','S','M',$2,'approved') RETURNING id`, [schoolId, `sm-${TAG}@t.example`]);
  memberTok = mint(u.rows[0].id, schoolId, "parent", `sm-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, u.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage, incumbent_pta_size) VALUES ($1,$2,'your_voice',20)`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, u.rows[0].id]);

  const s2 = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Other ${TAG}','other-${TAG}') RETURNING id`);
  const u2 = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','O','M',$2) RETURNING id`, [s2.rows[0].id, `om-${TAG}@t.example`]);
  otherSchoolTok = mint(u2.rows[0].id, s2.rows[0].id, "parent", `om-${TAG}@t.example`);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM collective_signals WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const get = (tok: string) => fetch(`${baseUrl}/api/voice/${voiceId}/pathway`, { headers: { Authorization: `Bearer ${tok}` } });

describe("GET /api/voice/:id/pathway", () => {
  it("returns stage, counts, threshold, legitimacy, signal log, complete flag", async () => {
    const r = await get(memberTok);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.stage).toBe("your_voice");
    expect(b.backerCount).toBe(1);
    expect(b.signalThreshold).toBe(3);
    expect(b.thresholdMet).toBe(false);
    expect(b.legitimacy.declaredIncumbent).toBe(20);
    expect(b.legitimacy.met).toBe(false);
    expect(Array.isArray(b.signals)).toBe(true);
    expect(b.signals).toHaveLength(0);
    expect(b.complete).toBe(false);
  });

  it("404s a VOICE from another school (school-scoped)", async () => {
    const r = await get(otherSchoolTok);
    expect(r.status).toBe(404);
  });
});

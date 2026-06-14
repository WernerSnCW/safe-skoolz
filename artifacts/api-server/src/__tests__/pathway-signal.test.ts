import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, memberTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

async function addBacker(i: number) {
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','B','${i}',$2,'approved') RETURNING id`, [schoolId, `b${i}-${TAG}@t.example`]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, u.rows[0].id]);
  return u.rows[0].id;
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Sig ${TAG}','sig-${TAG}',3) RETURNING id`);
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Found','Er',$2,'approved') RETURNING id`, [schoolId, `f-${TAG}@t.example`]);
  memberTok = mint(u.rows[0].id, schoolId, "parent", `f-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, u.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage) VALUES ($1,$2,'your_voice')`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, u.rows[0].id]);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM collective_signals WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  // audit_log is append-only in some environments; try/catch prevents FK block on school delete.
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`%${TAG}%`]);
  try { await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]); } catch {}
});

const fire = () => fetch(`${baseUrl}/api/voice/${voiceId}/signal`, { method: "POST", headers: { Authorization: `Bearer ${memberTok}` } });

describe("POST /api/voice/:id/signal", () => {
  it("409s below the threshold", async () => {
    const r = await fire();
    expect(r.status).toBe(409);
  });

  it("fires at the threshold: records a signal, stamps the pathway, returns the shareable artefact", async () => {
    await addBacker(1); await addBacker(2);
    const r = await fire();
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.signal.topics).toEqual(["G1", "G2"]);
    expect(b.signal.memberCountAtFire).toBe(3);
    expect(b.artefact.message).toBeTruthy();
    expect(Array.isArray(b.artefact.authorisingParents)).toBe(true);
    expect(b.pathway.stage).toBe("collective_signal");

    const cs = await pool.query(`SELECT * FROM collective_signals WHERE voice_id=$1`, [voiceId]);
    expect(cs.rows).toHaveLength(1);
    expect(cs.rows[0].school_response_status).toBe("pending");
    const cp = await pool.query(`SELECT signal_fired_at, stage FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].signal_fired_at).not.toBeNull();
    expect(cp.rows[0].stage).toBe("collective_signal");
  });
});

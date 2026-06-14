import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, signalId: string, memberTok: string, execTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Out ${TAG}','out-${TAG}',1) RETURNING id`);
  schoolId = s.rows[0].id;
  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','M','One',$2,'approved') RETURNING id`, [schoolId, `m-${TAG}@t.example`]);
  memberTok = mint(m.rows[0].id, schoolId, "parent", `m-${TAG}@t.example`);
  const ex = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'head_teacher','Ex','Ec',$2) RETURNING id`, [schoolId, `ex-${TAG}@t.example`]);
  execTok = mint(ex.rows[0].id, schoolId, "head_teacher", `ex-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, m.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage, signal_fired_at) VALUES ($1,$2,'collective_signal', now())`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, m.rows[0].id]);
  const cs = await pool.query<{ id: string }>(`INSERT INTO collective_signals (voice_id, school_id, member_count_at_fire, school_response_status) VALUES ($1,$2,1,'pending') RETURNING id`, [voiceId, schoolId]);
  signalId = cs.rows[0].id;
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

const post = (path: string, tok: string, body?: unknown) =>
  fetch(`${baseUrl}/api/voice/${voiceId}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: body ? JSON.stringify(body) : undefined });
const patch = (path: string, tok: string, body: unknown) =>
  fetch(`${baseUrl}/api/voice/${voiceId}${path}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify(body) });

describe("incumbent PATCH", () => {
  it("a member cannot set the incumbent size (403)", async () => {
    expect((await patch("/pathway/incumbent", memberTok, { incumbentPtaSize: 30 })).status).toBe(403);
  });
  it("an exec sets + confirms the incumbent size", async () => {
    const r = await patch("/pathway/incumbent", execTok, { incumbentPtaSize: 30, confirm: true });
    expect(r.status).toBe(200);
    const cp = await pool.query(`SELECT incumbent_pta_size, incumbent_confirmed_by_school_at FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].incumbent_pta_size).toBe(30);
    expect(cp.rows[0].incumbent_confirmed_by_school_at).not.toBeNull();
  });
});

describe("signal response", () => {
  it("an exec records the school response, surfaced in the pathway view", async () => {
    const r = await post(`/signal/${signalId}/response`, execTok, { status: "responded", text: "We'll appoint a contact." });
    expect(r.status).toBe(200);
    const cs = await pool.query(`SELECT school_response_status, school_response_text FROM collective_signals WHERE id=$1`, [signalId]);
    expect(cs.rows[0].school_response_status).toBe("responded");
    expect(cs.rows[0].school_response_text).toBe("We'll appoint a contact.");
  });
});

describe("motion outcome", () => {
  it("rejects an unknown outcome (400)", async () => {
    expect((await post("/pathway/motion", execTok, { outcome: "nope" })).status).toBe(400);
  });
  it("records vad_declined and advances to school_recognition", async () => {
    const r = await post("/pathway/motion", execTok, { outcome: "vad_declined" });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.pathway.ptaMotionOutcome).toBe("vad_declined");
    expect(b.pathway.stage).toBe("school_recognition");
    expect(b.pathway.complete).toBe(false);
    expect(b.convert).toBeUndefined();
  });
  it("records vad_adopted, returns a convert hint, and is terminal", async () => {
    const r = await post("/pathway/motion", execTok, { outcome: "vad_adopted" });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.pathway.ptaMotionOutcome).toBe("vad_adopted");
    expect(b.pathway.complete).toBe(true);
    expect(b.convert.voiceId).toBe(voiceId);
  });
});

describe("recognition", () => {
  it("an exec records school recognition (terminal)", async () => {
    const r = await post("/pathway/recognition", execTok);
    expect(r.status).toBe(200);
    const cp = await pool.query(`SELECT school_recognised_at FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].school_recognised_at).not.toBeNull();
    const b = await r.json();
    expect(b.pathway.complete).toBe(true);
  });
});

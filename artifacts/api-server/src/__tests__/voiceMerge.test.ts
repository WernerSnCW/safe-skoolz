import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let parentTok: string;
let voiceId: string;
let founderId: string; let memberId: string; let existingId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // School starts UNCLAIMED (pta_claimed_at null) so we can test the gate.
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Merge Test', 'merge-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `merge-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });

  const founder = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Fa','Under',$2,true) RETURNING id`,
    [schoolId, `merge-founder-${stamp}@example.com`]);
  founderId = founder.rows[0].id;
  parentTok = signToken({ userId: founderId, schoolId, role: "parent" });

  const member = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Me','Mber',$2,true) RETURNING id`,
    [schoolId, `merge-member-${stamp}@example.com`]);
  memberId = member.rows[0].id;

  const existing = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Ex','Isting',$2,true) RETURNING id`,
    [schoolId, `merge-existing-${stamp}@example.com`]);
  existingId = existing.rows[0].id;
  // This backer is ALREADY on the PTA roster — convert must skip them.
  await pool.query(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active')`,
    [schoolId, existingId]);

  // The "Morna Vibes Test" VOICE, advocating, with 3 backers.
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, created_by_id, status) VALUES ($1,'Morna Vibes Test','Get the school to adopt VBE and the PTA to adopt the operating structure.',$2,'advocating') RETURNING id`,
    [schoolId, founderId]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, founderId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, memberId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, existingId]);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_initiatives WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const convert = (tok: string) =>
  fetch(`${baseUrl}/api/voice/${voiceId}/convert`, { method: "POST", headers: auth(tok) });

describe("POST /api/voice/:id/convert (B2 merge)", () => {
  it("403s for a non-exec parent caller", async () => {
    expect((await convert(parentTok)).status).toBe(403);
  });

  it("409s when the PTA is not yet claimed", async () => {
    const r = await convert(adminTok);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/operating structure/i);
  });

  it("merges once claimed: tiers, skip-existing, mission→initiative, response, audit", async () => {
    await pool.query(`UPDATE schools SET pta_claimed_at = now() WHERE id = $1`, [schoolId]);

    const r = await convert(adminTok);
    expect(r.status).toBe(200);
    const b = await r.json();

    // Response shape: counts + the new initiative object.
    expect(b.converted).toMatchObject({ backers: 3, added: 2, alreadyMembers: 1 });
    expect(b.initiative.id).toBeTruthy();
    expect(b.initiative.title).toBe("Morna Vibes Test");
    expect(b.voice.status).toBe("converted");

    // Tiers: founder → senior_group, member → general_membership; existing untouched.
    const founderRow = await pool.query(`SELECT tier FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, founderId]);
    expect(founderRow.rows[0].tier).toBe("senior_group");
    const memberRow = await pool.query(`SELECT tier FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, memberId]);
    expect(memberRow.rows[0].tier).toBe("general_membership");
    const existingRows = await pool.query(`SELECT count(*)::int c FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, existingId]);
    expect(existingRows.rows[0].c).toBe(1); // not duplicated

    // Initiative carried the mission, linked to the VOICE, proposed, no owner.
    const init = await pool.query(
      `SELECT title, summary, status, owner_id, origin_voice_id FROM pta_initiatives WHERE origin_voice_id=$1`, [voiceId]);
    expect(init.rows).toHaveLength(1);
    expect(init.rows[0].title).toBe("Morna Vibes Test");
    expect(init.rows[0].summary).toMatch(/adopt VBE/);
    expect(init.rows[0].status).toBe("proposed");
    expect(init.rows[0].owner_id).toBeNull();

    // Audit row carries the initiativeId.
    const aud = await pool.query(
      `SELECT details FROM audit_log WHERE school_id=$1 AND event_type='voice_converted' ORDER BY created_at DESC LIMIT 1`, [schoolId]);
    expect(aud.rows[0].details.initiativeId).toBe(b.initiative.id);
  });

  it("409s on re-convert (already converted)", async () => {
    const r = await convert(adminTok);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/already been converted/i);
  });
});

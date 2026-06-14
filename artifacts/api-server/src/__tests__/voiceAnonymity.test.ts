import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let voiceId: string;
let parentToken: string;
let execToken: string;

const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Anon Test School', 'anon-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const founder = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status, display_mode)
     VALUES ($1, 'parent', 'Fiona', 'Founder', $2, true, 'approved', 'anonymous') RETURNING id`,
    [schoolId, `anon-founder-${stamp}@example.com`],
  );
  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'pta', 'Eve', 'Exec', $2, true, 'approved') RETURNING id`,
    [schoolId, `anon-exec-${stamp}@example.com`],
  );
  const parent = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'parent', 'Otto', 'Other', $2, true, 'approved') RETURNING id`,
    [schoolId, `anon-parent-${stamp}@example.com`],
  );
  parentToken = signToken({ userId: parent.rows[0].id, schoolId, role: "parent" });
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta" });

  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id)
     VALUES ($1, 'Test VOICE', 'A mission', 'advocating', $2) RETURNING id`,
    [schoolId, founder.rows[0].id],
  );
  voiceId = v.rows[0].id;
  await pool.query(
    `INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1, $2, 'founder')`,
    [voiceId, founder.rows[0].id],
  );

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

describe("VOICE anonymity", () => {
  it("public page hides an anonymous founder's name", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}/public`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.startedBy).toBe("A parent");
  });

  it("a non-exec parent sees the anonymous founder as 'A parent' in detail", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}`, { headers: { Authorization: `Bearer ${parentToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.voice.createdBy).toBe("A parent");
    expect(body.voice.members[0].name).toBe("A parent");
  });

  it("an exec sees the real founder name in detail", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}`, { headers: { Authorization: `Bearer ${execToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.voice.createdBy).toBe("Fiona Founder");
    expect(body.voice.members[0].name).toBe("Fiona Founder");
  });

  it("list endpoint hides an anonymous founder's name from a non-exec", async () => {
    const r = await fetch(`${baseUrl}/api/voice`, { headers: { Authorization: `Bearer ${parentToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.voices)).toBe(true);
    const mine = body.voices.find((v: any) => v.id === voiceId);
    expect(mine).toBeTruthy();
    expect(mine.createdBy).toBe("A parent");
  });

  it("list endpoint shows the real founder name to an exec", async () => {
    const r = await fetch(`${baseUrl}/api/voice`, { headers: { Authorization: `Bearer ${execToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    const mine = body.voices.find((v: any) => v.id === voiceId);
    expect(mine).toBeTruthy();
    expect(mine.createdBy).toBe("Fiona Founder");
  });
});

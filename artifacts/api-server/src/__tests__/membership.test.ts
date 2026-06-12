import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let execToken: string;
let pendingUserId: string;

const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Mbr Test School', 'mbr-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'pta', 'Ex', 'Ec', $2, true, 'approved') RETURNING id`,
    [schoolId, `mbr-exec-${stamp}@example.com`],
  );
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta", email: `mbr-exec-${stamp}@example.com` });

  const pending = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'parent', 'Pat', 'Pending', $2, true, 'pending') RETURNING id`,
    [schoolId, `mbr-pending-${stamp}@example.com`],
  );
  pendingUserId = pending.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM notifications WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("GET /api/membership/pending", () => {
  it("requires auth", async () => {
    const r = await fetch(`${baseUrl}/api/membership/pending`);
    expect(r.status).toBe(401);
  });

  it("lists pending members for an exec", async () => {
    const r = await fetch(`${baseUrl}/api/membership/pending`, { headers: auth(execToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.members)).toBe(true);
    const ids = body.members.map((m: any) => m.id);
    expect(ids).toContain(pendingUserId);
    expect(body.members[0].passwordHash).toBeUndefined();
  });
});

describe("POST /api/membership/:userId/approve", () => {
  it("approves and records the anonymity choice, notifies, and audits", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(execToken), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "anonymous" }),
    });
    expect(r.status).toBe(200);

    const u = await pool.query(`SELECT membership_status, display_mode FROM users WHERE id = $1`, [pendingUserId]);
    expect(u.rows[0].membership_status).toBe("approved");
    expect(u.rows[0].display_mode).toBe("anonymous");

    const n = await pool.query(`SELECT * FROM notifications WHERE recipient_id = $1 AND trigger = 'membership_approved'`, [pendingUserId]);
    expect(n.rows).toHaveLength(1);

    const a = await pool.query(`SELECT * FROM audit_log WHERE event_type = 'membership_approved' AND target_id = $1`, [pendingUserId]);
    expect(a.rows).toHaveLength(1);
  });

  it("409s when re-approving a member who is no longer pending", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(execToken), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(409);
  });

  it("400s on an invalid displayMode", async () => {
    const fresh = await pool.query<{ id: string }>(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
       VALUES ($1, 'parent', 'Bad', 'Mode', $2, true, 'pending') RETURNING id`,
      [schoolId, `mbr-badmode-${stamp}@example.com`],
    );
    const r = await fetch(`${baseUrl}/api/membership/${fresh.rows[0].id}/approve`, {
      method: "POST",
      headers: { ...auth(execToken), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "bogus" }),
    });
    expect(r.status).toBe(400);
  });

  it("404s for a user at another school", async () => {
    const other = signToken({ userId: pendingUserId, schoolId: "00000000-0000-0000-0000-000000000000", role: "pta" });
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(other), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(404);
  });

  it("403s for a non-exec caller", async () => {
    const parentTok = signToken({ userId: pendingUserId, schoolId, role: "parent" });
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(parentTok), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(403);
  });
});

describe("POST /api/membership/:userId/reject", () => {
  it("marks the member rejected and audits", async () => {
    const rej = await pool.query<{ id: string }>(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
       VALUES ($1, 'parent', 'Rex', 'Reject', $2, true, 'pending') RETURNING id`,
      [schoolId, `mbr-reject-${stamp}@example.com`],
    );
    const r = await fetch(`${baseUrl}/api/membership/${rej.rows[0].id}/reject`, {
      method: "POST",
      headers: auth(execToken),
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id = $1`, [rej.rows[0].id]);
    expect(u.rows[0].membership_status).toBe("rejected");
    const a = await pool.query(`SELECT * FROM audit_log WHERE event_type = 'membership_rejected' AND target_id = $1`, [rej.rows[0].id]);
    expect(a.rows).toHaveLength(1);
  });
});

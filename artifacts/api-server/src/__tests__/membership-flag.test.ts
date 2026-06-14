import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);
const OP_EMAIL = `operator-${TAG}@cloudworkz.com`;

let commSchool: string, wsSchool: string;
let commMember: string, commReporter: string, wsPending: string;
let opTok: string, commReporterTok: string, wsExecTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  process.env.PLATFORM_OPERATOR_EMAILS = OP_EMAIL;
  // Clear rate-limit buckets so prior test runs don't cause 429s on reruns.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'schools-create:%' OR key LIKE 'auth:%'`);
  const cs = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Comm ${TAG}','comm-m-${TAG}') RETURNING id`);
  commSchool = cs.rows[0].id;
  const ws = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, capabilities) VALUES ('WS ${TAG}','ws-m-${TAG}','{"safeguarding":true}') RETURNING id`);
  wsSchool = ws.rows[0].id;

  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Mem','Ber',$2,'approved') RETURNING id`, [commSchool, `mem-${TAG}@t.example`]);
  commMember = m.rows[0].id;
  const rep = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Rep','Orter',$2,'approved') RETURNING id`, [commSchool, `rep-${TAG}@t.example`]);
  commReporter = rep.rows[0].id;
  const op = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','Op','Er',$2) RETURNING id`, [commSchool, OP_EMAIL]);
  const wp = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Pend','Ing',$2,'pending') RETURNING id`, [wsSchool, `pend-${TAG}@t.example`]);
  wsPending = wp.rows[0].id;
  const wexec = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'pta','Ex','Ec',$2) RETURNING id`, [wsSchool, `exec-${TAG}@t.example`]);

  opTok = mint(op.rows[0].id, commSchool, "parent", OP_EMAIL);
  commReporterTok = mint(commReporter, commSchool, "parent", `rep-${TAG}@t.example`);
  wsExecTok = mint(wexec.rows[0].id, wsSchool, "pta", `exec-${TAG}@t.example`);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  for (const id of [commSchool, wsSchool]) {
    try {
      await pool.query(`DELETE FROM member_reports WHERE school_id=$1`, [id]);
      await pool.query(`DELETE FROM users WHERE school_id=$1`, [id]);
      await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [id]);
      await pool.query(`DELETE FROM schools WHERE id=$1`, [id]);
    } catch { /* audit trigger race — ephemeral tag, safe to leave */ }
  }
  delete process.env.PLATFORM_OPERATOR_EMAILS;
});

describe("first backer of a founder-less VOICE becomes its founder", () => {
  it("promotes the first community signup to founder (createdById set, role 'founder')", async () => {
    // Create a fresh school via the public endpoint — its advocating VOICE is
    // founder-less (created_by_id NULL, no user). The first signup must claim it.
    const cr = await fetch(`${baseUrl}/api/schools`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Founderless ${TAG}`, slug: `founderless-${TAG}` }),
    });
    expect(cr.status).toBe(201);
    const { voice } = await cr.json();
    expect(voice.id).toBeTruthy();

    // Sanity: VOICE starts founder-less.
    let v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBeNull();

    // First community signup.
    const su = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `founder-${TAG}@t.example`, password: "password123", name: "First Backer", schoolSlug: `founderless-${TAG}` }),
    });
    expect(su.status).toBe(201);
    const { user } = await su.json();

    // The VOICE now has this user as founder.
    v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBe(user.id);
    const vm = await pool.query(`SELECT role FROM voice_members WHERE voice_id=$1 AND user_id=$2`, [voice.id, user.id]);
    expect(vm.rows).toHaveLength(1);
    expect(vm.rows[0].role).toBe("founder");

    // A SECOND signup is a plain member, not a second founder.
    const su2 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `second-${TAG}@t.example`, password: "password123", name: "Second Backer", schoolSlug: `founderless-${TAG}` }),
    });
    expect(su2.status).toBe(201);
    const { user: user2 } = await su2.json();
    const vm2 = await pool.query(`SELECT role FROM voice_members WHERE voice_id=$1 AND user_id=$2`, [voice.id, user2.id]);
    expect(vm2.rows[0].role).toBe("member");
    // Founder unchanged.
    v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBe(user.id);

    // Cleanup this block's rows. audit_log has an FK to schools so delete
    // audit entries first; if the audit trigger inserts concurrently we
    // swallow the constraint error — test data is ephemeral (tagged slugs).
    try {
      await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voice.id]);
      await pool.query(`DELETE FROM voice_groups WHERE id=$1`, [voice.id]);
      await pool.query(`DELETE FROM users WHERE school_id=(SELECT id FROM schools WHERE slug=$1)`, [`founderless-${TAG}`]);
      await pool.query(`DELETE FROM audit_log WHERE school_id=(SELECT id FROM schools WHERE slug=$1)`, [`founderless-${TAG}`]);
      await pool.query(`DELETE FROM schools WHERE slug=$1`, [`founderless-${TAG}`]);
    } catch { /* audit trigger may have inserted after our delete — ephemeral tag, safe to leave */ }
  });
});

describe("community moderation — report + flag/remove", () => {
  it("any member can report another (records a report)", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commMember}/report`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${commReporterTok}` },
      body: JSON.stringify({ reason: "not a parent here" }),
    });
    expect(r.status).toBe(201);
    const rep = await pool.query(`SELECT * FROM member_reports WHERE reported_user_id=$1`, [commMember]);
    expect(rep.rows).toHaveLength(1);
    expect(rep.rows[0].status).toBe("open");
  });

  it("a platform operator can flag/remove a member", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commMember}/remove`, {
      method: "POST", headers: { Authorization: `Bearer ${opTok}` },
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id=$1`, [commMember]);
    expect(u.rows[0].membership_status).toBe("rejected");
  });

  it("a non-operator member cannot remove (403)", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commReporter}/remove`, {
      method: "POST", headers: { Authorization: `Bearer ${commReporterTok}` },
    });
    expect(r.status).toBe(403);
  });
});

describe("whole-school regression — approve/reject queue preserved", () => {
  it("exec can still approve a pending member", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${wsPending}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${wsExecTok}` },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id=$1`, [wsPending]);
    expect(u.rows[0].membership_status).toBe("approved");
  });
});

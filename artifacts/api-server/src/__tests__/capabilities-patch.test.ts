import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);
const OP_EMAIL = `op-cap-${TAG}@cloudworkz.com`;
let schoolId: string, opTok: string, memberTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  process.env.PLATFORM_OPERATOR_EMAILS = OP_EMAIL;
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Cap ${TAG}','cap-${TAG}') RETURNING id`);
  schoolId = s.rows[0].id;
  const op = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','Op','X',$2) RETURNING id`, [schoolId, OP_EMAIL]);
  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','M','X',$2) RETURNING id`, [schoolId, `mem-cap-${TAG}@t.example`]);
  opTok = mint(op.rows[0].id, schoolId, "parent", OP_EMAIL);
  memberTok = mint(m.rows[0].id, schoolId, "parent", `mem-cap-${TAG}@t.example`);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  try {
    await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]);
    await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]);
    await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]);
  } catch (_) {
    // best-effort teardown
  }
  delete process.env.PLATFORM_OPERATOR_EMAILS;
});

const patch = (tok: string, caps: unknown) =>
  fetch(`${baseUrl}/api/schools/cap-${TAG}/capabilities`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ capabilities: caps }),
  });

describe("PATCH /api/schools/:slug/capabilities", () => {
  it("lets a platform operator flip whole-school caps", async () => {
    const r = await patch(opTok, { safeguarding: true });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.capabilities.safeguarding).toBe(true);
    expect(body.capabilities.voice).toBe(true); // unchanged default
    const row = await pool.query(`SELECT capabilities FROM schools WHERE id=$1`, [schoolId]);
    expect(row.rows[0].capabilities.safeguarding).toBe(true);
  });

  it("403s a non-operator tenant member", async () => {
    expect((await patch(memberTok, { safeguarding: true })).status).toBe(403);
  });

  it("400s an unknown capability key", async () => {
    expect((await patch(opTok, { teleport: true })).status).toBe(400);
  });
});

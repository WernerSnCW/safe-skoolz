import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // Clear rate-limit buckets so prior test runs don't cause 429s on school creation.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'schools-create:%' OR key LIKE 'auth:%'`);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM voice_mandates WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM collective_signals WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM coalition_pathway WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id IN (SELECT id FROM voice_groups WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM diagnostic_surveys WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  try { await pool.query(`DELETE FROM audit_log WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]); } catch {}
  // audit_log has an FK to schools and is append-only (trigger blocks DELETE on
  // some environments). If the audit_log rows couldn't be removed above, the school
  // row will fail due to the FK — that's acceptable; TAG rows are ephemeral.
  try { await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]); } catch {}
});

const createSchool = (body: unknown) =>
  fetch(`${baseUrl}/api/schools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const signup = (body: unknown) =>
  fetch(`${baseUrl}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("pathway provisioning at POST /api/schools", () => {
  it("creates a your_voice coalition_pathway row for the new VOICE, signal_threshold defaulting to 10", async () => {
    const r = await createSchool({ name: `PathSchool ${TAG}`, slug: `path-${TAG}` });
    expect(r.status).toBe(201);
    const { voice, school } = await r.json();
    const cp = await pool.query(`SELECT * FROM coalition_pathway WHERE voice_id=$1`, [voice.id]);
    expect(cp.rows).toHaveLength(1);
    expect(cp.rows[0].stage).toBe("your_voice");
    const sch = await pool.query(`SELECT signal_threshold FROM schools WHERE slug=$1`, [school.slug]);
    expect(sch.rows[0].signal_threshold).toBe(10);
  });
});

describe("mandates + was_pta_member at /auth/signup", () => {
  it("writes G1 and G2 mandate rows for the joining member and records was_pta_member on the backing", async () => {
    await createSchool({ name: `MandateSchool ${TAG}`, slug: `mandate-${TAG}` });
    const su = await signup({ email: `parent-${TAG}@t.example`, password: "password123", name: "P One", schoolSlug: `mandate-${TAG}`, wasPtaMember: true });
    expect(su.status).toBe(201);
    const { user } = await su.json();

    const mandates = await pool.query(`SELECT goal FROM voice_mandates WHERE user_id=$1 ORDER BY goal`, [user.id]);
    expect(mandates.rows.map((r: any) => r.goal)).toEqual(["G1", "G2"]);

    const vm = await pool.query(`SELECT was_pta_member FROM voice_members WHERE user_id=$1`, [user.id]);
    expect(vm.rows[0].was_pta_member).toBe(true);
  });

  it("defaults was_pta_member to false when not declared, and is idempotent on re-signup attempt", async () => {
    await createSchool({ name: `Mandate2 ${TAG}`, slug: `mandate2-${TAG}` });
    const su = await signup({ email: `parent2-${TAG}@t.example`, password: "password123", name: "P Two", schoolSlug: `mandate2-${TAG}` });
    expect(su.status).toBe(201);
    const { user } = await su.json();
    const vm = await pool.query(`SELECT was_pta_member FROM voice_members WHERE user_id=$1`, [user.id]);
    expect(vm.rows[0].was_pta_member).toBe(false);
    const dup = await signup({ email: `parent2-${TAG}@t.example`, password: "password123", schoolSlug: `mandate2-${TAG}` });
    expect(dup.status).toBe(409);
    const m = await pool.query(`SELECT count(*)::int AS n FROM voice_mandates WHERE user_id=$1`, [user.id]);
    expect(m.rows[0].n).toBe(2);
  });
});

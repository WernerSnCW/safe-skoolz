import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // Clear rate-limit buckets so prior test runs don't cause 429s on reruns.
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'schools-create:%'`);
  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  // audit_log is append-only (trigger blocks DELETE). Clean dependent rows in
  // FK order; wrap each in try/catch so a partial failure doesn't block the rest.
  // TAG is timestamp-based so lingering school rows don't affect reruns.
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id IN (SELECT id FROM voice_groups WHERE name LIKE $1)`, [`%${TAG}%`]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_surveys WHERE title LIKE $1`, [`%${TAG}%`]); } catch {}
  // audit_log rows reference schools and cannot be deleted (trigger); leave them.
  // Schools themselves may fail due to the FK — that's acceptable for test cleanup.
  try { await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]); } catch {}
});

const create = (body: unknown) =>
  fetch(`${baseUrl}/api/schools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/schools", () => {
  it("creates a school + a FOUNDER-LESS advocating VOICE in one transaction, NO user, seeds community caps", async () => {
    const name = `Greenfield ${TAG}`;
    const r = await create({ name, contactName: "Head Teacher", contactEmail: "head@greenfield.test" });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.school.slug).toBe(`greenfield-${TAG}`);
    expect(body.school.contactName).toBe("Head Teacher"); // SCHOOL contact, not a user
    expect(body.voice.status).toBe("advocating");
    // No internal capabilities override stored: defaults resolve to community tier.
    expect(body.school.capabilities.voice).toBe(true);
    expect(body.school.capabilities.safeguarding).toBe(false);

    const sch = await pool.query(`SELECT id, capabilities, contact_email FROM schools WHERE slug = $1`, [body.school.slug]);
    expect(sch.rows[0].capabilities).toEqual({}); // stored {}, resolved server-side
    expect(sch.rows[0].contact_email).toBe("head@greenfield.test");
    const schoolId = sch.rows[0].id;

    // The advocating VOICE exists and is FOUNDER-LESS (created_by_id NULL).
    const v = await pool.query(`SELECT * FROM voice_groups WHERE school_id = $1`, [schoolId]);
    expect(v.rows).toHaveLength(1);
    expect(v.rows[0].created_by_id).toBeNull();

    // NO user was created for the school (the contact is not a user).
    const u = await pool.query(`SELECT count(*)::int AS n FROM users WHERE school_id = $1`, [schoolId]);
    expect(u.rows[0].n).toBe(0);
    // ...and consequently no voice_members row yet.
    const vm = await pool.query(`SELECT count(*)::int AS n FROM voice_members WHERE voice_id = $1`, [v.rows[0].id]);
    expect(vm.rows[0].n).toBe(0);
  });

  it("derives a collision suffix when the slug is taken", async () => {
    const name = `Riverside ${TAG}`; // same name twice -> -2
    const r1 = await create({ name });
    const r2 = await create({ name });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const s1 = (await r1.json()).school.slug;
    const s2 = (await r2.json()).school.slug;
    expect(s2).toBe(`${s1}-2`);
  });

  it("honours a creator-supplied editable slug", async () => {
    const r = await create({ name: `Hillcrest ${TAG}`, slug: `custom-${TAG}` });
    expect(r.status).toBe(201);
    expect((await r.json()).school.slug).toBe(`custom-${TAG}`);
  });

  it("rejects a blank name", async () => {
    const r = await create({ name: "   " });
    expect(r.status).toBe(400);
  });

  it("rejects a malformed contact email", async () => {
    const r = await create({ name: `BadEmail ${TAG}`, contactEmail: "not-an-email" });
    expect(r.status).toBe(400);
  });
});

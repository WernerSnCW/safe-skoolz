import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let tok: string; let schoolId: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug, display_name, capabilities, active)
     VALUES ('Me Test', $1, 'Me Test', '{"lessons":true}'::jsonb, true) RETURNING id`,
    [`me-${stamp}`]
  );
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1,'parent','M','One',$2,true,'approved') RETURNING id`,
    [schoolId, `me-${stamp}@example.com`]
  );
  tok = signToken({ userId: u.rows[0].id, schoolId, role: "parent" });
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]);
  await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]);
  await new Promise<void>((r) => server.close(() => r()));
});

describe("/auth/me tenant block", () => {
  it("includes the resolved tenant config", async () => {
    const r = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${tok}` } });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.tenant).toBeDefined();
    expect(b.tenant.displayName).toBe("Me Test");
    expect(b.tenant.capabilities.lessons).toBe(true);
    expect(b.tenant.capabilities.safeguarding).toBe(false);
    expect(b.membershipStatus).toBe("approved");
  });
});

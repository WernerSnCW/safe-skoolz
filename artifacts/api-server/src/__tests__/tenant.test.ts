import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { resolveCapabilities, CAPABILITY_DEFAULTS, tenantPublicView } from "../lib/tenant";

describe("resolveCapabilities", () => {
  it("returns the defaults for empty/missing config", () => {
    expect(resolveCapabilities({})).toEqual(CAPABILITY_DEFAULTS);
    expect(resolveCapabilities(null)).toEqual(CAPABILITY_DEFAULTS);
    expect(resolveCapabilities(undefined)).toEqual(CAPABILITY_DEFAULTS);
  });

  it("overrides only the keys present, ignoring junk", () => {
    const r = resolveCapabilities({ safeguarding: true, lessons: true, bogus: true, pta: "yes" });
    expect(r.safeguarding).toBe(true);
    expect(r.lessons).toBe(true);
    expect(r.pta).toBe(true);            // defaults true; non-boolean "yes" ignored
    expect(r.behaviour).toBe(false);     // still default
    expect((r as any).bogus).toBeUndefined();
  });
});

describe("tenantPublicView", () => {
  const base = { id: "abc", name: "Riverside", slug: "riverside", displayName: null, theme: {}, capabilities: {} } as any;

  it("falls back displayName to name, else uses displayName", () => {
    expect(tenantPublicView(base).displayName).toBe("Riverside");
    expect(tenantPublicView({ ...base, displayName: "Riverside Primary" }).displayName).toBe("Riverside Primary");
  });

  it("coerces null/array theme to {} and passes objects through", () => {
    expect(tenantPublicView({ ...base, theme: null }).theme).toEqual({});
    expect(tenantPublicView({ ...base, theme: [] }).theme).toEqual({});
    expect(tenantPublicView({ ...base, theme: { primaryColor: "217 90% 52%" } }).theme).toEqual({ primaryColor: "217 90% 52%" });
  });

  it("resolves capabilities and never leaks id", () => {
    const v = tenantPublicView(base);
    expect(v.capabilities.pta).toBe(true);
    expect(v.capabilities.safeguarding).toBe(false);
    expect((v as any).id).toBeUndefined();
  });
});

let server: Server; let baseUrl: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  await pool.query(
    `INSERT INTO schools (name, slug, display_name, capabilities, active)
     VALUES ('Tenant Test', $1, 'Tenant Test', '{"safeguarding":true}'::jsonb, true)`,
    [`tn-${stamp}`]
  );
  await pool.query(
    `INSERT INTO schools (name, slug, display_name, active) VALUES ('Inactive', $1, 'Inactive', false)`,
    [`tn-inactive-${stamp}`]
  );
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  await pool.query(`DELETE FROM schools WHERE slug LIKE $1`, [`tn-%${stamp}`]);
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /api/tenant/:slug", () => {
  it("returns the resolved public view for a known active slug", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/tn-${stamp}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.displayName).toBe("Tenant Test");
    expect(b.capabilities.safeguarding).toBe(true);
    expect(b.capabilities.lessons).toBe(false);
    expect(b.capabilities.pta).toBe(true);
    expect(b.id).toBeUndefined();
  });
  it("404s for an unknown slug", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/does-not-exist-${stamp}`);
    expect(r.status).toBe(404);
  });
  it("404s for an inactive school", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/tn-inactive-${stamp}`);
    expect(r.status).toBe(404);
  });
});

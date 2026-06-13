import { describe, it, expect } from "vitest";
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

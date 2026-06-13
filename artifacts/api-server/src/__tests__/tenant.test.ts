import { describe, it, expect } from "vitest";
import { resolveCapabilities, CAPABILITY_DEFAULTS } from "../lib/tenant";

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

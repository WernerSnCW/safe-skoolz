import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "../lib/slugify";

describe("slugify", () => {
  it("lowercases, trims, and hyphenates", () => {
    expect(slugify("Morna International College")).toBe("morna-international-college");
  });
  it("strips punctuation and collapses separators", () => {
    expect(slugify("  St. Mary's   C of E!! ")).toBe("st-marys-c-of-e");
  });
  it("drops leading/trailing hyphens and accents", () => {
    expect(slugify("--Café Réal--")).toBe("cafe-real");
  });
  it("caps length at 60 chars without a trailing hyphen", () => {
    const s = slugify("a".repeat(80));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
  it("falls back to 'school' when nothing survives", () => {
    expect(slugify("!!!")).toBe("school");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free", async () => {
    expect(await uniqueSlug("morna", async () => false)).toBe("morna");
  });
  it("appends -2, -3 … until free", async () => {
    const taken = new Set(["morna", "morna-2"]);
    expect(await uniqueSlug("morna", async (s) => taken.has(s))).toBe("morna-3");
  });
});

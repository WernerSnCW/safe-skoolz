import { describe, it, expect } from "vitest";
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";

describe("isExecRole", () => {
  it("is true for pta, coordinator, head_teacher and false otherwise", () => {
    expect(isExecRole("pta")).toBe(true);
    expect(isExecRole("coordinator")).toBe(true);
    expect(isExecRole("head_teacher")).toBe(true);
    expect(isExecRole("parent")).toBe(false);
    expect(isExecRole("pupil")).toBe(false);
  });

  it("returns false for null or undefined roles", () => {
    expect(isExecRole(null)).toBe(false);
    expect(isExecRole(undefined)).toBe(false);
  });
});

describe("memberDisplayName", () => {
  const named = { firstName: "Ada", lastName: "Lovelace", displayMode: "named" };
  const anon = { firstName: "Ada", lastName: "Lovelace", displayMode: "anonymous" };

  it("shows the real name to an exec viewer regardless of displayMode", () => {
    expect(memberDisplayName(anon, true)).toBe("Ada Lovelace");
    expect(memberDisplayName(named, true)).toBe("Ada Lovelace");
  });

  it("hides an anonymous member's name from a non-exec viewer", () => {
    expect(memberDisplayName(anon, false)).toBe("A parent");
  });

  it("shows a named member's name to a non-exec viewer", () => {
    expect(memberDisplayName(named, false)).toBe("Ada Lovelace");
  });

  it("falls back to 'A parent' when no name is present", () => {
    expect(memberDisplayName({ firstName: "", lastName: "", displayMode: "named" }, false)).toBe("A parent");
  });
});

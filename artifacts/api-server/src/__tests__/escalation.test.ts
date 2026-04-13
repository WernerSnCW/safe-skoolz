import { describe, it, expect } from "vitest";
import {
  determineEscalationTier,
  isSafeguardingTrigger,
  buildProtocolGuidance,
} from "../lib/escalation";

describe("determineEscalationTier", () => {
  it('"sexual" → 3', () => {
    expect(determineEscalationTier("sexual")).toBe(3);
  });

  it('"coercive" → 3', () => {
    expect(determineEscalationTier("coercive")).toBe(3);
  });

  it('"physical" → 2', () => {
    expect(determineEscalationTier("physical")).toBe(2);
  });

  it('"psychological" → 2', () => {
    expect(determineEscalationTier("psychological")).toBe(2);
  });

  it('"online" → 2', () => {
    expect(determineEscalationTier("online")).toBe(2);
  });

  it('"verbal" → 1', () => {
    expect(determineEscalationTier("verbal")).toBe(1);
  });

  it('"other" → 1', () => {
    expect(determineEscalationTier("other")).toBe(1);
  });

  it('"sexual,physical" → 3 (highest wins)', () => {
    expect(determineEscalationTier("sexual,physical")).toBe(3);
  });

  it('"physical,online" → 2', () => {
    expect(determineEscalationTier("physical,online")).toBe(2);
  });

  it('"" → 1', () => {
    expect(determineEscalationTier("")).toBe(1);
  });

  it('"SEXUAL" → 3 (case insensitive)', () => {
    expect(determineEscalationTier("SEXUAL")).toBe(3);
  });
});

describe("isSafeguardingTrigger", () => {
  it('"sexual" → true', () => {
    expect(isSafeguardingTrigger("sexual")).toBe(true);
  });

  it('"coercive" → true', () => {
    expect(isSafeguardingTrigger("coercive")).toBe(true);
  });

  it('"physical" → false', () => {
    expect(isSafeguardingTrigger("physical")).toBe(false);
  });

  it('"verbal" → false', () => {
    expect(isSafeguardingTrigger("verbal")).toBe(false);
  });

  it('"sexual,physical" → true', () => {
    expect(isSafeguardingTrigger("sexual,physical")).toBe(true);
  });
});

describe("buildProtocolGuidance", () => {
  it("tier 1, no safeguarding trigger → null", () => {
    expect(buildProtocolGuidance(["verbal"], 1, false)).toBeNull();
  });

  it('"sexual" → LOPIVI, tier 3, critical', () => {
    const result = buildProtocolGuidance(["sexual"], 3, true);
    expect(result).not.toBeNull();
    expect(result!.protocol).toContain("LOPIVI");
    expect(result!.tier).toBe(3);
    expect(result!.severity).toBe("critical");
    expect(result!.immediateSteps.length).toBeGreaterThan(0);
  });

  it('"physical" → Convivèxit, tier 2, serious', () => {
    const result = buildProtocolGuidance(["physical"], 2, false);
    expect(result).not.toBeNull();
    expect(result!.protocol).toContain("Convivèxit");
    expect(result!.tier).toBe(2);
    expect(result!.severity).toBe("serious");
  });

  it('"online" → tier 2', () => {
    const result = buildProtocolGuidance(["online"], 2, false);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe(2);
  });

  it("returned guidance has all required fields", () => {
    const result = buildProtocolGuidance(["sexual"], 3, true);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("severity");
    expect(result).toHaveProperty("protocol");
    expect(result).toHaveProperty("protocolFullName");
    expect(result).toHaveProperty("headline");
    expect(result).toHaveProperty("immediateSteps");
    expect(result).toHaveProperty("doNots");
    expect(result).toHaveProperty("whoToNotify");
    expect(result).toHaveProperty("timeframe");
    expect(result).toHaveProperty("legalBasis");
    expect(result).toHaveProperty("externalReferral");
  });
});

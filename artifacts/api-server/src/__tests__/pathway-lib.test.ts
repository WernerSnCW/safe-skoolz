import { describe, it, expect } from "vitest";
import { effectiveStage, thresholdMet, legitimacyMetric, isPathwayComplete } from "../lib/pathway";

describe("thresholdMet", () => {
  it("is false below the threshold and true at/above", () => {
    expect(thresholdMet(9, 10)).toBe(false);
    expect(thresholdMet(10, 10)).toBe(true);
    expect(thresholdMet(11, 10)).toBe(true);
  });
});

describe("legitimacyMetric", () => {
  it("nonVoicePta = max(0, declared - ptaMembersInVoice); met when backers > nonVoicePta", () => {
    const m = legitimacyMetric({ backerCount: 25, declaredIncumbent: 30, ptaMembersInVoice: 8 });
    expect(m.nonVoicePta).toBe(22);
    expect(m.met).toBe(true);
  });
  it("clamps nonVoicePta at 0 and is not-met when backers <= nonVoicePta", () => {
    const m = legitimacyMetric({ backerCount: 5, declaredIncumbent: 3, ptaMembersInVoice: 10 });
    expect(m.nonVoicePta).toBe(0);
    expect(m.met).toBe(true);
    const m2 = legitimacyMetric({ backerCount: 10, declaredIncumbent: 30, ptaMembersInVoice: 0 });
    expect(m2.nonVoicePta).toBe(30);
    expect(m2.met).toBe(false);
  });
  it("is null/unknown when no incumbent is declared", () => {
    const m = legitimacyMetric({ backerCount: 25, declaredIncumbent: null, ptaMembersInVoice: 8 });
    expect(m.met).toBeNull();
    expect(m.nonVoicePta).toBeNull();
  });
});

describe("effectiveStage", () => {
  const base = { recordedStage: "your_voice" as const, backerCount: 1, signalThreshold: 10, signalFiredAt: null as Date | null, ptaMotionOutcome: null as string | null, schoolRecognisedAt: null as Date | null, voiceStatus: "advocating" };
  it("your_voice with a single backer", () => {
    expect(effectiveStage(base)).toBe("your_voice");
  });
  it("shared_voice once more than one backs but below threshold", () => {
    expect(effectiveStage({ ...base, backerCount: 3 })).toBe("shared_voice");
  });
  it("collective_signal once the threshold is met (before firing)", () => {
    expect(effectiveStage({ ...base, backerCount: 10 })).toBe("collective_signal");
  });
  it("pta_motion once the signal has fired", () => {
    expect(effectiveStage({ ...base, backerCount: 12, signalFiredAt: new Date() })).toBe("pta_motion");
  });
  it("school_recognition once the motion is declined", () => {
    expect(effectiveStage({ ...base, backerCount: 12, signalFiredAt: new Date(), ptaMotionOutcome: "vad_declined" })).toBe("school_recognition");
  });
  it("never regresses below the recorded stage", () => {
    expect(effectiveStage({ ...base, recordedStage: "school_recognition" })).toBe("school_recognition");
  });
});

describe("isPathwayComplete", () => {
  it("true on vad_adopted", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: "vad_adopted", schoolRecognisedAt: null, voiceStatus: "advocating" })).toBe(true);
  });
  it("true when the VOICE has converged (status converted)", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: null, schoolRecognisedAt: null, voiceStatus: "converted" })).toBe(true);
  });
  it("true when the school has recognised", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: null, schoolRecognisedAt: new Date(), voiceStatus: "advocating" })).toBe(true);
  });
  it("false otherwise (incl. vad_declined)", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: "vad_declined", schoolRecognisedAt: null, voiceStatus: "advocating" })).toBe(false);
  });
});

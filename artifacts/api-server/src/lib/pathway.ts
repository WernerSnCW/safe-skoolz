// Chapter 2 (spec §2/§4/§5): pure helpers for the legitimacy pathway. NO DB —
// callers supply the counts; this module decides the effective stage, whether
// the absolute signal threshold is met, the relative legitimacy metric, and the
// terminal gate Chapter 3 (elections) reads. Tracker-only: these never act.
import { type PathwayStage } from "@workspace/db";

const STAGE_ORDER: Record<PathwayStage, number> = {
  your_voice: 0, shared_voice: 1, collective_signal: 2, pta_motion: 3, school_recognition: 4,
};

/** Absolute gate (spec §4): the coalition can fire the signal at/above threshold. */
export function thresholdMet(backerCount: number, signalThreshold: number): boolean {
  return backerCount >= signalThreshold;
}

/**
 * Relative legitimacy measure (spec §4). nonVoicePta = max(0, declared −
 * ptaMembersInVoice); met when VOICE backers > nonVoicePta. Returns null fields
 * when no incumbent is declared (display "unknown", not "met/unmet"). This does
 * NOT gate the signal — the absolute threshold does; this strengthens the case.
 */
export function legitimacyMetric(input: {
  backerCount: number;
  declaredIncumbent: number | null;
  ptaMembersInVoice: number;
}): { nonVoicePta: number | null; met: boolean | null; backerCount: number; declaredIncumbent: number | null; ptaMembersInVoice: number } {
  const { backerCount, declaredIncumbent, ptaMembersInVoice } = input;
  if (declaredIncumbent == null) {
    return { nonVoicePta: null, met: null, backerCount, declaredIncumbent: null, ptaMembersInVoice };
  }
  const nonVoicePta = Math.max(0, declaredIncumbent - ptaMembersInVoice);
  return { nonVoicePta, met: backerCount > nonVoicePta, backerCount, declaredIncumbent, ptaMembersInVoice };
}

/**
 * The effective stage (spec §2) — computed from data, never below the highest
 * recorded stage. COMPUTED progression:
 *   your_voice → shared_voice (>1 backer) → collective_signal (threshold met
 *   OR signal fired) → school_recognition (motion declined or school recognised).
 * NOTE: pta_motion is NEVER computed here — it is only reached via the
 * recorded-stage floor, set exclusively by the motion endpoint on vad_adopted.
 * Terminal outcomes (vad_adopted / converged / school_recognised) are surfaced
 * separately via isPathwayComplete; the stage itself caps at school_recognition.
 */
export function effectiveStage(input: {
  recordedStage: PathwayStage;
  backerCount: number;
  signalThreshold: number;
  signalFiredAt: Date | null;
  ptaMotionOutcome: string | null;
  schoolRecognisedAt: Date | null;
  voiceStatus: string;
}): PathwayStage {
  let computed: PathwayStage = "your_voice";
  if (input.backerCount > 1) computed = "shared_voice";
  if (thresholdMet(input.backerCount, input.signalThreshold)) computed = "collective_signal";
  if (input.signalFiredAt != null) computed = "collective_signal";
  if (input.ptaMotionOutcome === "vad_declined") computed = "school_recognition";
  if (input.schoolRecognisedAt != null) computed = "school_recognition";
  // Never regress below the highest recorded stage.
  return STAGE_ORDER[computed] >= STAGE_ORDER[input.recordedStage] ? computed : input.recordedStage;
}

/**
 * Terminal gate (spec §2/§4b): the pathway is COMPLETE when the PTA adopted VAD
 * (vad_adopted) or the VOICE has converged (status converted) OR the school
 * formally recognised the coalition. Chapter 3 (elections) reads this. A
 * declined motion is NOT terminal (Stage 5 proceeds).
 */
export function isPathwayComplete(input: {
  ptaMotionOutcome: string | null;
  schoolRecognisedAt: Date | null;
  voiceStatus: string;
}): boolean {
  return (
    input.ptaMotionOutcome === "vad_adopted" ||
    input.voiceStatus === "converted" ||
    input.schoolRecognisedAt != null
  );
}

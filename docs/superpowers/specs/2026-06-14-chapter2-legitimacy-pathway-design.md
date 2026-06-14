# Chapter 2 — Legitimacy Pathway (PTA Journey + Delegated Voice) — Design

**Date:** 2026-06-14
**Branch:** feat/unified-app
**Status:** design — awaiting Tom's review before writing-plans
**Builds on:** Chapter 1 (`2026-06-14-phase4b-tenant-onboarding-design.md`, shipped) + B1 charter + B2 VOICE→PTA merge.
**Incorporates:** `~/Downloads/Accord Vibes PTA Brief V3.docx` (the PTA Journey + Delegated Voice brief) and the Ch2 IP capture (`2026-06-14-chapter2-legitimacy-pathway-IP.md`).

## 1. Context

Chapter 2 is **how a parent coalition earns the standing to change its PTA / school** — the journey from "my voice" to institutional recognition. Per Tom (this session) it is a **lightweight tracker**: VIBES records and surfaces where the coalition is on the journey and gates the next step; the PTA and school act in the real world, VIBES tracks the state. The **Accord brief** sharpens this into a concrete 5-stage journey + the **Delegated Voice** mechanic that gives it structural weight.

### 1.1 Mission scope — the two goals (HARD constraint)
All coalition activity is scoped to **exactly two goals** — enforced at the data layer, not just UI:
- **G1 — School adopts VBE.** The school formally embeds a values-based education framework.
- **G2 — PTA adopts VAD.** The PTA adopts the Values-Aligned Dialogue governance framework (the operating structure) to act as a genuine representative body.

This boundary is what keeps VIBES **non-adversarial**: it is *not* a general complaints channel. (Terminology: the brief's "VAD framework" = the built **operating structure** (B1 charter); the brief's "VIBE community" = our **VOICE** primitive. Naming reconciliation is Tom-owned — §9; this spec keeps the shipped code's `voice_*` naming and adopts the G1/G2 + journey framing.)

### 1.2 Non-adversarial framing (design principle)
Every screen frames collective action as constructive — an **invitation, not a campaign**. No language implying threat, conflict, or confrontation. The Stage-5 recognition request is framed as solving the school's *administrative* problem (one collective channel vs fifty individual parents), never as leverage. (Final copy is Tom-owned, end-of-redesign content audit — shipped as marked placeholders.)

## 2. The 5-Stage Journey (the pathway `stage` enum)

A `stage` per coalition, advanced as events are recorded:

1. **`your_voice`** — a parent registers their position (joins + intake; Ch1). The mandate (below) is captured here.
2. **`shared_voice`** — the coalition grows; the shared mandate becomes visible (counter; Ch1).
3. **`collective_signal`** — at the **signal threshold**, VIBES assembles ONE communication to the school + PTA on G1/G2 only, listing authorising parents by name and requesting a named point of contact. (§4)
4. **`pta_motion`** — if the PTA is responsive, the coalition brings a formal motion to adopt VAD (G2); the PTA votes (in the real world; recorded here). Outcome:
   - **`vad_adopted`** → hand to **B2 convergence** (VOICE→PTA merge) → terminal.
   - **`vad_declined`** → recorded; FAQ documents the no-confidence option (NOT a built control); proceed to Stage 5.
5. **`school_recognition`** — if the PTA declines VAD *or* no functioning PTA exists, the coalition requests the **school formally recognise VIBES as an official representative** of the parent community for G1/G2 communication. Outcome **`school_recognised`** (school-confirmable) → terminal.

**Terminal states** (`vad_adopted`/converged **or** `school_recognised`) **unlock Chapter 3 (elections).**

## 3. Delegated Voice mandate (the structural weight)

**Joining IS the authorisation** — no separate opt-in. The mandate is captured at join (extends Ch1's join flow):
- **Mandate-confirmation step at join:** the parent is shown G1 + G2 and a plain-language statement — *"By joining, you authorise VIBE to contact your school about these two things on your behalf."* Confirming is a condition of membership. This visible, explicit confirmation **doubles as the consent step** the brief's §7.1 (GDPR / Spanish data law) calls for — so it satisfies both "default-on mandate" and "explicit consent". No two-tier membership: there is no non-authorising member.
- **Storage:** a per-member, per-goal authorisation record — `{ userId, schoolId, goal: 'G1'|'G2', authorisedAt, confirmationEvent }`. This makes each member a real mandate signal from day one and gives each later school communication defensible standing (named parental instruction).
- **Scope lock:** the authorisation is topic-specific (G1/G2 only); VIBES has no mandate beyond them.

## 4. Threshold + the Collective Signal

- **Signal threshold** (`schools.signal_threshold`, default **10**, per-tenant configurable via the Ch1 platform-operator capability surface): below it, authorisations are logged internally, **no external communication**. At/above it, the coalition can **fire the collective signal** (Stage 3).
- **The collective signal** is ONE assembled communication (not per-join): the list of authorising parents by name, the two topics (G1/G2), and a request for a named school contact. Modelled as a recorded **signal log** row (recipients/topics/date/status). Given prod has **no Resend yet**, it is surfaced in-app + generates a shareable "send to your school" artefact (the Ch1 channel pattern); it auto-emails when Resend lands. **School responses are recorded and shared with ALL current members** (incl. those who joined after the response).
- **Legitimacy metric (the relative measure):** displayed alongside — *"the VOICE represents more parents than the current PTA."* Computed from a declared **incumbent PTA size** (`coalition_pathway.incumbent_pta_size`, school-confirmable per Ch1's trust model) minus VOICE backers who self-declared they are current PTA members (a `was_pta_member` boolean captured at backing). `nonVoicePta = max(0, declaredN − ptaMembersInVoice)`; the metric is "met" when VOICE backers > nonVoicePta. This metric does NOT gate the signal (the absolute threshold does); it strengthens the Stage-4 motion + Stage-5 recognition case and surfaces the "current PTA members are joining us" signal.

## 5. Data model (lightweight)

- **`coalition_pathway`** (one row per VOICE; created with/for the VOICE): `voiceId`, `schoolId`, `stage` (enum §2), `incumbentPtaSize` (declared, nullable), `incumbentConfirmedBySchoolAt`, `signalFiredAt`, `ptaMotionOutcome` (`vad_adopted`|`vad_declined`|null) + `ptaMotionRecordedAt`/`By`, `schoolRecognisedAt`. Stage transitions stamp these. Threshold-met is **computed** (not stored), like Ch1's release.
- **`voice_mandates`** — per-member per-goal authorisation: `userId`, `schoolId`, `goal`, `authorisedAt`, `confirmationEvent`. (One row per goal per member; both G1+G2 on join.)
- **`collective_signals`** — the signal log: `coalitionPathwayId`/`voiceId`, `firedAt`, `topics` (G1/G2), `memberCountAtFire`, `schoolResponseStatus`, `schoolResponseText`, `schoolRespondedAt`. Responses surfaced to all members.
- **`voice_supporters`/`voice_members`** — add `wasPtaMember` boolean (self-declared at backing) for the legitimacy metric.
- **`schools.signal_threshold`** (int, default 10) — per-tenant, operator-configurable.

## 6. Who does what
- **Raise/fire the collective signal, bring the motion** — any VOICE member (it is the collective's act), gated on the signal threshold.
- **Record the PTA's motion outcome + the school's recognition + confirm the declared incumbent size** — platform-operator / exec, school-confirmable (Ch1's trust anchor; the school records via the channel once email lands).
- **Mandate confirmation** — every joining member (condition of membership).

## 7. Surfacing
- A **journey/pathway section** on the community home (and/or a dedicated `/journey` view): the current stage, the live mandate counter, progress toward the signal threshold, the legitimacy metric, the recorded school responses, and the next step — all in the non-adversarial voice.
- **No-confidence** appears ONLY as FAQ copy (Tom-owned placeholder), never a built control.
- Copy is presentational placeholder; final wording = end-of-redesign content audit (Tom-owned).

## 8. Out of scope — captured as future-chapter IP
The Accord brief §8–§10 describe a large **post-recognition engagement layer** that is downstream of Chapter 2's terminal state — captured in `2026-06-14-chapter4-engagement-layer-IP.md`, NOT built here:
- **§8 Engagement layer:** Questions → Knowledge Base (permanent, dedup-searched); Ideas → Community Hall (member vote → tabled to school); the **AI rules engine** (hard-discard + classify Q/I + admin-flag edge cases).
- **§9 Three-depth content model** (L1 headline / L2 exec summary / L3 full detail) — platform-wide; ties to the content audit.
- **§10 Legal-obligation question framework** (Balearic Islands private-school obligation map; Questions anchored to existing legal duties, Ideas for aspirational G1/G2).

## 9. Open / Tom-owned
- **Terminology/branding:** VOICE vs "VIBE community"; VAD vs the built "operating structure". Keep shipped code naming until Tom decides; adopt G1/G2 + journey framing now.
- **Final non-adversarial copy** for every journey stage + the no-confidence FAQ (content audit).
- **Signal threshold default** (10 per the brief) — confirm; per-tenant configurable.
- Confirm the §4 reconciliation (absolute threshold fires the signal; relative measure is the legitimacy display).

## 10. Prod rollout
⚠ Schema-touching: `coalition_pathway`, `voice_mandates`, `collective_signals` tables; `schools.signal_threshold`; `was_pta_member` on the backing table. Additive DDL via the Railway Data box before `git push` (gated on Tom), per the Ch1 pattern. Final DDL in the implementation plan.

## 11. Decisions log
- Lightweight **tracker** (record + surface + gate), not active mechanisms; no-confidence = FAQ-only. *(Tom)*
- Incumbent PTA **external**, declared + **school-confirmable** count; relative legitimacy metric. *(Tom)*
- **Precise** legitimacy formula via a self-declared `was_pta_member` boolean. *(Tom — recommended option)*
- Adopt the brief's **5-stage journey** + **G1/G2 hard scope** + **Delegated Voice mandate** (join = authorisation = consent) + **threshold-batched collective signal** (absolute threshold fires it; default 10). *(brief + Tom "consider the attached")*
- §8–10 engagement layer **deferred** to a future chapter (IP captured).

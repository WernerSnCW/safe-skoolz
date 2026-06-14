# Chapter 4+ — Post-Recognition Engagement Layer (IP capture)

**Date:** 2026-06-14 · **Status:** captured IP, not designed/built. Source: `~/Downloads/Accord Vibes PTA Brief V3.docx` §8–§10. Downstream of Chapter 2's terminal state (PTA adopted VAD / school recognised VIBES) and Chapter 3 (elections). Needs its own brainstorm→spec→plan when reached.

> Once VIBES has a **recognised relationship** with the school (via PTA VAD adoption OR direct school recognition), the community can begin **structured engagement**. This layer is the long-term platform value (and moat). Scope stays locked to G1/G2; everything passes the rules engine first.

## §8 Engagement layer — two object types
Every member submission is classified as one of two fundamentally different objects:
- **Q — Question.** Expects a factual answer from the school (policy, process, timeline, position). → **Knowledge Base**: answer stored, searchable, permanent. **Pre-submission dedup search** (surface an existing answer before allowing a new Question). KB fields: canonical question, dates submitted/answered, backing count, verbatim school response, topic tag (G1/G2 sub-topic), status (awaiting/answered/declined). Across schools → a cross-school intelligence layer (the moat).
- **I — Idea / Thing to Consider.** A proposal for the school to deliberate (PHSE lessons, anti-bullying policy, values initiatives, PTA governance). → **Community Hall**: posted for member vote (time-limited, ~14 days) → if it reaches the vote threshold, elevated to VIBES's formal agenda and **tabled to the school** with backing count → school adopts/declines/discusses → response published + logged. Below-threshold ideas expire quietly (searchable, not deleted).

### The AI rules engine — first, always
Every submission passes the rules engine BEFORE anything else (not moderation — the "platform constitution" applied instantly):
- **Hard-discard (auto-reject, specific+constructive message, no V1 appeal):** names/describes an individual child/family/household; names/targets a staff member; outside G1/G2 scope; contains/implies a legal claim, safeguarding allegation, or discrimination complaint; abusive/threatening/discriminatory; duplicates an answered KB question.
- **Classification pass:** object type Q|I (+confidence); topic alignment (G1/G2 sub-topic); tone flag (constructive/neutral/borderline). High-confidence routes automatically; low-confidence/borderline → admin queue with the AI's reasoning.
- **Admin layer:** admin sees ONLY flagged edge cases (not every submission); can override/reclassify/edit-before-route; rules are configurable (not hardcoded); **admin-first mode** ships first (manual queue), AI layer added on top as volume grows. Admin = VIBES platform team initially; elected community moderator in V2. Log admin decisions WITH reasoning so the engine learns.

## §9 Three-depth content model (platform-wide)
Every content piece exists at three levels; the parent chooses depth, nothing hidden/forced:
- **L1 Headline** — one sentence, visible by default.
- **L2 Executive summary** — a short paragraph, one tap; why it matters / what it means for this parent / what the school committed to.
- **L3 Full detail** — data-backed, referenced; sources, law references, trigger criteria; for making a formal case / verifying compliance.
Applied to: VBE adoption status, KB answers, community updates, parent rights. Compliance detail (disciplinary triggers, rights, response times, safeguarding) lives at L3 — reachable in two taps, not leading the experience. (Ties to the held content audit.)

## §10 Legal-obligation question framework
Questions are anchored ONLY to what the school is already legally required to do/disclose — VIBES doesn't invent demands, it makes existing obligations visible. (Aspirational G1/G2 go through the **Ideas** track + vote, not Questions.) Includes a **legal-obligation map for Balearic Islands private schools** (LOPIVI, LOMLOE, Balearic coexistence decrees, LODE, LGDCU, Constitution Art.14) with example permitted questions per obligation area (safeguarding/bullying protocol, disciplinary triggers, child welfare/pastoral, coexistence-plan publication, parent information rights, complaint procedure, fair treatment/non-discrimination). Edge-case classification rules for complaints-disguised-as-questions and obligation-questions that implicate individuals (auto-reject individual/incident-specific; flag accusatory-tone for reframing).

## Open (for the future brainstorm)
- Whether the AI rules engine is V1 (admin-first manual queue) then AI-on-top.
- KB cross-school intelligence (multi-tenant) — out of scope until multi-school.
- Reconcile with Chapter 3 elections (elected moderator role) + the three-depth model with the content audit.

# vibez — sequencing & information architecture (design)

- **Date:** 2026-06-11
- **Branch:** `feat/unified-app`
- **Status:** design approved (Tom, 2026-06-11), build pending
- **Builds on:** the re-direction (three-mission framing) + the unified app. This does not undo that framing — it adds the *sequencing* layer the re-direction left open.

## Problem

The platform became rich — safeguarding/**reporting**, the **learning centre**, PTA governance, VOICE, diagnostics, resources. The re-direction wrapped it all in a "three missions" front door (Schools roll out VBE · Parents advocate · PTAs operate), which is a good entry story, but behind it everything arrives **at once**, with no sense of *what matters now*. Two concrete symptoms:

1. **Circular navigation.** Public marketing CTAs point at *gated* features — e.g. `schools.tsx` "run the diagnostic" → `/diagnostics` (ProtectedRoute) → bounces a logged-out visitor to login. The visitor→tool journey loops. Yet the product model says the diagnostic and resources are **free**.
2. **Differentiators are lost.** **Reporting** (bullying/wellness) and the **learning centre** are genuinely differentiated but buried — a "platform within a platform" with no moment where they're deliberately surfaced.

Root cause: there is no defined **sequence** — who sees what, first, and when.

## Principle

**Mission front door → a focused "start here" per role → surface each rich tool at its moment (role + context), not all at once.**

## The map (approved)

| Audience | Free, no-login on-ramp (fixes the loop) | First-run "start here" | Surfaced by moment |
|---|---|---|---|
| **Visitor** | Run the VBE diagnostic + a learning taster + the safeguarding/reporting story — all **public**, no wall | — | "Try vibez" → the (pre-filled) demo |
| **Parent** | — | Your child's wellbeing + raise a concern | **Reporting** up front; VOICE/PTA when advocacy; resources on demand |
| **Teacher / SLT** | — | The rollout + **report an incident** + today's lesson | **Reporting** + **Learning centre** as the two power tools |
| **PTA** | — | VOICE → decisions/voting → initiatives | Announcements when communicating |
| **Pupil** | — | How you feel + your diary | Lessons when learning; **speak up** when needed |

Reporting becomes the front-and-centre tool for parents/teachers/pupils (its real moment); the learning centre is a power tool for teachers. They don't compete because they surface by **role + moment**, not all on one screen. The circular nav dissolves because public CTAs point at genuinely-free, logged-out tools.

## Implementation (phased — one build + redeploy per phase)

### Phase 1 — Public free on-ramps (kills the loop)
The public site must deliver real, logged-out value where it currently promises gated features.

- **Public VBE diagnostic.** A standalone, client-side public diagnostic page (e.g. `/diagnostic`) that computes a readiness score with **no login and no DB write** (optional email capture later). The existing authed `/diagnostics` stays as the in-app version. *Decision (resolved): a standalone public version, NOT the authed route opened to anon — avoids auth/DB entanglement and matches the original free-funnel intent.*
- **Public learning taster** — a logged-out preview of the learning centre (sample lesson / what pupils & teachers get), linked from the public learning CTAs.
- **Public safeguarding/reporting story** — a public page that tells the reporting differentiator's story (this is the "lost" unique feature; give it a public home).
- **Repoint the circular CTAs** (`schools.tsx` "run the diagnostic", any "see the learning tools") at these public on-ramps. No public CTA may land a logged-out user on `/login`.

### Phase 2 — Role-based "start here"
Each role's home leads with a focused, sequenced start-here (1–2 primary actions + the role's power tools), not the full nav firehose. Builds on the existing `MissionActions` row but makes it a deliberate hierarchy:

- **Parent:** wellbeing + raise a concern (reporting) first.
- **Teacher/SLT:** report an incident + today's lesson (reporting + learning as the two power tools).
- **PTA:** VOICE → decisions/voting → initiatives.
- **Pupil:** feelings + diary (keep the bespoke wellbeing-first header), speak-up reachable.

### Phase 3 — Moment-based surfacing
Confirm each subsystem surfaces in its moment via nav grouping + contextual entry points (reporting in the safeguarding moment, learning in teaching, VOICE/PTA in advocacy, announcements in comms). Largely already supported by the grouped nav; this phase tunes the home/contextual prominence.

## Out of scope
- **Pupil Voice** (parent-advocacy extension) — parked at design Q3, separate spec.
- **Durable hosting** — the demo currently runs via a Cloudflare quick tunnel off the dev machine. An always-on Node host + hosted Postgres is the answer to "what do we need to do to make this real," queued as its own step after the IA lands.

## Verification
Per phase: build → (server restart / Pages redeploy as needed) → curl public on-ramps return 200 with real content (no login bounce) → in-browser per role that the start-here leads with the right tools → no console errors.

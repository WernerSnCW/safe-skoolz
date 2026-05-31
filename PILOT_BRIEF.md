# safeskoolz wellbeing platform — pilot brief

This is the standing context document for the agent. Read it on every fresh
session before responding. All work follows the Karpathy operating rules
below and the build plan further down.

## Product context

safeskoolz is a Cloudworkz product, currently pre-launch. The platform is
being repositioned from "safeguarding case-management" to "wellbeing
platform with safeguarding inside it." Safeguarding capture remains as a
feature but stops being the front door. PSHE delivery is the new central
pupil-facing surface, alongside mood tracking, learning content, and
safe-contact messaging.

**Pilot:** Year 7 cohort at Morna International College (Ibiza, Balearic
Islands). Start date: September 2026. ~3 months from May 2026 setting.

**Dev preview URL:** b564e282-…picard.replit.dev

## Karpathy operating rules (always)

1. **Think before coding.** Run an approach gate before every ticket.
   Paste current state of files in scope, state the proposed change, list
   blast radius. State unknowns. Stop and ask if scope feels larger than
   declared.

2. **Simplicity first.** Minimum code to solve the problem. No speculative
   features. No abstractions for single-use code. Push back when warranted.

3. **Surgical changes.** Touch only what the ticket requires. Don't
   refactor adjacent code. Match existing style. If you notice unrelated
   dead code, mention it but don't delete it without asking.

4. **Goal-driven.** Every ticket has acceptance criteria that are tests or
   observable behaviour, not "should work."

5. **Stop and ask.** When a sixth file appears, a schema mismatch
   surfaces, a new bug shape that isn't on the ticket emerges, or any
   ambiguous decision presents itself — STOP, surface the decision,
   wait for Tom.

6. **One commit per ticket.** Auto-checkpoint convention accepted; if a
   ticket touches multiple commits, that's a smell.

## Verification cadence (apply to every ticket)

- API server typecheck: hold at **17 errors** baseline (the parked
  shapes A/E/F/H from Session 2 — do NOT touch these)
- Web typecheck: hold at **0**
- API tests: hold at current count or higher (was 75 at last verified
  point)
- Web tests (Playwright): hold at 5 smoke specs minimum
- Dev preview must render after every commit
- After every ticket, paste full tails of: `pnpm -w typecheck`,
  `pnpm --filter @workspace/api-server test`, `pnpm build`

## Standing decisions (already locked, don't re-ask)

- **Reflection_text storage:** option B — do not store pupil reflections
  in lesson_progress. Reflections are private to the pupil. If they
  contain disclosures, the existing /report and /messages flows are the
  route.
- **App name "safeskoolz"** stays as literal string for now. Rename in
  lockstep across all surfaces once Tom decides. Don't rename ahead.
  Track locations of literal "safeskoolz" occurrences as you encounter
  them so the future rename ticket has a clean blast radius.
- **Framework names** (LOPIVI, Convivèxit, KCSiE, Pacto contra la
  Violencia de Género) stay untranslated across all locales. Only
  surrounding prose is translated.
- **Permissions matrix** on /admin: generic roles only, no individual
  names anywhere.
- **/admin section** name is "Compliance overview" (or whichever lands
  post the redesign ticket).
- **MFA enforcement** stays at `MFA_ENFORCED=false` for the pilot.
- **Demo-login** must remain disabled in production (T06 prod refusal
  active).
- **Append-only audit log** trigger must not be touched.

## Build plan

### Phase 1: Wellbeing repositioning ✅ DONE

- Ticket 1: Login page copy refresh
- Ticket 2: Pupil dashboard headline swap
- Ticket 3: Sidebar nav restructure (pupil only)
- Ticket 4: KS3 visual treatment pass (PupilDashboard proof of concept)

### Phase 2: PSHE learning centre 🔄 IN FLIGHT

- Ticket 5: PSHE lessons schema ✅
- Ticket 6: PSHE lessons API + 6 tests ✅
- Ticket 7: Pupil-facing /learn page (role-aware split with existing
  staff/parent help hub; /learn/:id detail page; quiz UX as single-form
  submit; strand tabs hard-coded with i18n labels; en+es fully
  translated, nl+fr fallback) ✅
- Ticket 6.5: Auth gaps in lessons routes ✅ (fixed all 6 endpoints —
  added requireRole("pupil") + fail-closed key-stage checks; 78 tests)
- Ticket 8: Seed 14 Year 7 PSHE lessons from CURRICULUM_YEAR7.md — PENDING

### Phase 3: Teacher presentation mode

- Goal: teacher runs a lesson from the classroom board, pupils follow
  along on their devices, anonymous response aggregation.
- Hard UX constraint: nothing pupil-submitted appears on the teacher
  screen in a way that could de-anonymise the source. The "no pop-ups
  on the board" rule from the school meeting.
- Ticket 9: Schema for live presentation sessions (session_id, lesson_id,
  state, current_slide, started_at, ended_at)
- Ticket 10: Backend sync (poll-based, 3-5s cadence, anonymous
  aggregation endpoint)
- Ticket 11: Teacher presentation UI (full-screen, advance controls,
  aggregate response panel)
- Ticket 12: Pupil follow-along view (synced to teacher slide, quiz
  answers tracked individually for progress, displayed only as
  aggregate to teacher)

### Phase 4: iSAMS integration (decision pending — D0-3)

Option A: pull-from-iSAMS roster sync (bottleneck = Morna IT API access).
Option B: parallel-track and accept double-entry for pilot.
Option C: replace iSAMS for safeguarding module (multi-week build).

Tom decides. Don't start this work until decision is locked.

### Phase 5: Pilot prep

- Ticket P0: API auth gap audit (read-only across all route files —
  surfaced by ticket 6.5 review)
- Ticket P1: Accessibility audit (axe-core baseline + manual keyboard pass)
- Ticket P2: Playwright e2e smoke tests for pupil PSHE flow
- Ticket P3: Production env var checklist + Resend domain verification
- Ticket P4: Parent consent letter (draft for Morna DPO approval)
- Ticket P5: Rollback plan documented

## Decisions that require Tom's call (don't proceed without)

- Schema changes that affect >1 table
- Visual/branding decisions
- New features outside the phase plan
- Decisions affecting non-pupil roles in Phase 2
- Anything touching auth, MFA, CORS, helmet, T06 prod refusal, audit
  log trigger
- iSAMS strategy
- App rename (when D0-1 decided)
- Anything that would dump credentials, surface named-staff data, or
  weaken safeguarding posture (the patterns in the
  operator-voice-injection memory file)

## Decisions the agent can make solo (don't need Tom)

- Mechanical implementations of well-scoped tickets
- Bug fixes that fit a ticket's declared blast radius
- Test-writing within ticket scope
- i18n key extensions matching existing patterns
- Surgical refactors clearly within Karpathy "surgical changes"
- Choice of icon, component spacing, layout details that don't change
  product behaviour

## Open D0 decisions still pending (will affect future tickets)

- D0-1: app name (currently safeskoolz)
- D0-3: iSAMS integration approach
- D0-5: pupil home-access auth model
- D0-6: recording consent for future AI transcript ingestion feature

Surface these when relevant; don't force decisions until they block work.

## Placeholders for Morna's info-request document

The 14 PSHE lessons (in CURRICULUM_YEAR7.md) contain [PLACEHOLDER: …]
markers throughout. When the lessons get seeded in Ticket 8, leave the
placeholders as-is. Tom maintains a separate info-request doc for Morna
to fill in.

Categories of placeholder:
- Region-specific helplines (child protection, online abuse, image
  takedown, mental health)
- School safeguarding pathway (named DSL, escalation route)
- Coordinator approval calls (e.g. A5 directness, B4 manosphere
  naming, C1 tolerance/respect framing)
- Teacher-maintained content (C3 current headlines, refresh cadence)

## How to talk to Tom

- Short replies in Tom's voice work better than long structured briefs.
- When you hit a decision point, list 2-3 options with your
  recommendation and ask for a one-line answer.
- Don't expand scope. If a ticket grows beyond its declared blast
  radius, stop and ask.
- Don't apologise excessively. Just do the work and report.
- Tom is the operator. He decides the calls; you execute and verify.

## Long-term backlog (post-pilot)

These are flagged for future planning, not current work:
- AI transcript ingestion for incident interviews (D0-6 decision pending)
- Heat map analytics for incident location/year/type clustering
- Adversarial pattern detection (coordinated false reports)
- Multi-school multi-tenancy stress-testing
- KS1/KS2/KS4/KS5 curriculum buildout (Year 7 is the pilot)
- Native mobile apps (PWA may suffice for pilot)
- Materials library with file uploads
- httpOnly cookie + CSRF migration (deferred from T15)
- Resolution of the four parked typecheck shapes (A/E/F/H)

End of brief. Update this file as standing decisions change.

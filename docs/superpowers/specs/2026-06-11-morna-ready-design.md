# Morna-Ready: Community Diagnostic, Membership, and PTA Operating Layer

**Date:** 2026-06-11
**Status:** Approved by Tom (brainstorming session, this date)
**Source documents:** `~/Downloads/Morna_PTA_Operating_Structure.docx` (the proposed PTA operating structure, quoted throughout), the Morna PTA Wellness & Safeguarding hub (vault `Companies/SchoolVBE/Brain-Box/working/MornaPTA_Wellness_and_Safeguarding_V1.html`), the community prevalence survey instruments (vault `Companies/SchoolVBE/site/resources/survey.html`).

## 1. Context and goal

Morna International College's school leadership responded receptively to the coalition's approach. The PTA exists but is, in Tom's words, dysfunctional and not yet officially signed up; to sign up it must agree to operate by the proposed operating structure (the docx — Tom is Chair). The structure doc itself commits to "building a community hub for the Morna PTA … live and available to the entire Morna community before the end of this term," whose primary purpose is **growing PTA membership**.

**The wedge is the diagnostic.** The aim of the game is a single stable link, pinned in Classlist, that any Morna parent can open: a public, anonymous community diagnostic about bullying, isolation, and the support the school gives. Completing it gates on email; **seeing the results requires signing up**. Results are anonymised aggregates, released at a moment the exec chooses, shared with every participant. From there the funnel runs: approved membership (with an anonymity option) → the member home that shows what outsiders can't see → VOICE backing and PTA participation → the PTA presenting evidence-backed asks to the school.

A second framing matters on the diagnostic page itself: **this is the start of the record, not a one-off survey.** Starting tracking now means parents will be able to follow reported bullying incidents and the school's responses over time.

## 2. Decisions made in this session

| Question | Decision |
|---|---|
| v1 scope | **Diagnostic-first wedge** — the Classlist link is the diagnostic; results gated behind signup |
| Diagnostic instrument | Based on the **existing Morna instruments** (wellness hub + prevalence survey): bullying experienced/witnessed, isolation, school support and response, belonging, values; customisable per school, Morna-specific items included |
| VOICE ↔ PTA model | **Claim-and-merge** — a school page can hold both; officers claim the PTA by acknowledging the operating structure; a VOICE can merge into a claimed PTA; a VOICE can constitute a PTA where none exists |
| Membership anonymity | **Anonymous to other parents, visible to admins** — display name "A Morna parent"; the approving exec always knows who they are |
| PTA standards gate | Claiming the PTA = the officers acknowledging the operating-structure charter in-app (rendered from the docx) |
| Hosting | **Durable host is part of this project** — always-on Node host + managed Postgres behind a stable URL; the Classlist link is never a tunnel |
| Results release | **Exec-released** (option C) — results invisible until the exec releases them; then all signed-up participants see them and are notified |
| Submission counter | **Public live counter** of submissions on the diagnostic page |
| Answer anonymity | **Unlinkable by construction** — answers carry no foreign key to the submission; "your answers cannot be traced to your email, even by us" is architecturally true |
| Architecture | **Approach 1: extend vibez in place** with a hard prod/demo split — one codebase, two databases |

## 3. The funnel (seven stages, each a real screen)

1. **The Classlist post** — one stable link, `<app-domain>/d/morna`. Never changes.
2. **The public diagnostic page** (no login) — "How is Morna really doing?", run by the Morna PTA. Value framing up front: answers anonymised; results shared with every participant when released; *starting the record now means parents can track reported bullying and school responses over time*. Live counter: "47 Morna families have taken part." ~12–15 questions (Likert + one open question) drawn from the existing instruments.
3. **Submit — email-gated** — email required (one submission per email, hashed for dedupe), name optional. Counter ticks: "You're counted — #48." Answers are stored unlinked from identity.
4. **Sign up to see the results** — emailed set-your-password link (reuses the password-reset token machinery); completing it verifies the email and creates the account. Promise: you'll see the results when the PTA releases them, and you'll be notified.
5. **Admin approval → anonymity choice** — an exec member approves each member (real-parents-only). On approval the member chooses **named** or **anonymous to other parents**.
6. **Member home** — the school's community page: results (when released), the VOICE and its backing, PTA goals and initiatives, the decision log, announcements; "Back the VOICE" / "Join the PTA" actions. This is the §Preamble hub — growth by demonstrated value.
7. **Exec side** — approve members; release results; annual goals; initiatives with the self-approval checklist; the five-stage school process with non-responses tracked; prepare the question pack for the school.

The loop: diagnostic → counted → signed up → approved → sees value → shares the link → counter rises → the PTA presents results to the school with the weight of numbers.

## 4. Data model and API

### 4.1 Identity & membership

- New columns on `users`: `membershipStatus` (`pending` → `approved` / `rejected`; existing rows default `approved`) and `displayMode` (`named` / `anonymous`).
- Community signups create `role=parent` users at the school with `membershipStatus=pending`. **No new role** — every existing role guard keeps working. The parent dashboard gets a *community mode* for parents with no linked pupils (no child KPIs; community content leads).
- Anonymous display: wherever member names render to other parents (VOICE backers, PTA member lists, votes), `displayMode=anonymous` renders "A Morna parent". Exec/admin surfaces always show the real name.
- Signup mechanics reuse the existing password-reset token flow: diagnostic submission (or invite) → emailed link → set password → session. Email verification and account creation are the same act.
- Approval API: exec lists pending members, approves/rejects; audit-logged.

### 4.2 The public diagnostic

- `diagnostic_surveys` gains: `publicSlug` (unique, e.g. `morna`), `instrument` (jsonb — the question set as data: key, text, type `likert`/`text`, section), `releasedAt` (nullable — the exec's release switch). The existing authed in-school diagnostics module is untouched.
- New table `diagnostic_submissions`: `surveyId`, `emailHash` (unique per survey — the one-per-email rule), `email` (kept for the signup invite and participant notification), `name` (optional), `createdAt`. **No answers here.**
- New table `diagnostic_answers`: `surveyId`, `questionKey`, `answer` (int) / `freeText`, `createdAt`. **No foreign key to the submission — unlinkable by design.** Both rows written in one transaction.
- Accepted trade-offs of unlinkability: an individual's answers can never be corrected or deleted after submit (the submission record/email can be erased — the answers are not personal data once unlinked); de-duplication is only ever the email gate, never forensic.
- Public API: `GET /api/d/:slug` (instrument + live count + released flag), `POST /api/d/:slug/submit` (validates, dedupes by emailHash, writes submission + answers, triggers the signup email). Results endpoint returns 404/locked until `releasedAt`; after release, signed-up participants (and members) see aggregates; free-text answers surface to exec only, shuffled.
- Release action: exec sets `releasedAt`; all participants with accounts are notified (in-app + email where available).

### 4.3 Claim & merge

- `pta_officers` role enum gains `president` and `vice_president` (doc roles: President — Ashley, school relationship; Vice President — Patricia, wellness; Secretary — Claudia, community; Chair — Tom, operational governance; Treasurer — Anika, finance).
- **Claiming the PTA**: the five officers are created and each acknowledges the operating-structure charter (existing `pta_policy_acknowledgements`); when the required officers have acknowledged, the school's PTA is active/claimed. The charter page renders the operating structure in-app.
- **VOICE merge**: the existing `POST /voice/:id/convert` extends to merge into a claimed PTA — backers become members at the agreed tiers (founder → senior group, members/supporters → general membership, skipping existing members), and the VOICE's mission carries over as a PTA initiative linked to its origin VOICE. Where no PTA exists, a VOICE can constitute one (founder becomes interim chair) — same mechanics, different entry.

### 4.4 PTA operating layer (the docx, encoded)

- New `pta_goals`: `schoolId`, `title`, `description`, `year`, `status` (`proposed` → `shortlisted` → `ratified` → `completed` / `failed`), `proposedBy` (any member or the wider community), `ballotId` (senior-group vote via the existing voting machinery), `ratifiedAt`. Published goals are visible to all members. A failed goal records a brief postmortem note.
- `pta_initiatives` upgraded with:
  - the **one-page-note fields**: `goalId` (must align with a ratified goal), owner (exists), `successCriteria`, `resourcesNeeded`, `conflicts`;
  - the **self-approval checklist** (six booleans: aligns with goal / no budget or within threshold / named owner / no conflict / defined success criteria / no formal school resource needed) plus `approvedBy`, `approvedAt`, `approvalType` (`self` — any single exec when all six are ticked, logged — or `board`);
  - the **five-stage school process**: `schoolStage` (`none` / `idea` / `presented` / `accepted` / `rejected` / `planning` / `delivering` / `delivered`) with a stage-history log recording dates, written outcomes, and the **reason on rejection**; `responseDueAt` with **non-response recorded as a first-class state** and follow-ups tracked — "silence is not acceptance" as a tracked state, not a slogan.
- The "prepare questions for the school" need is served by initiatives in the idea/presented stages plus the decision log — no separate entity in v1.

## 5. Deployment & environments

- **Production**: always-on Node host + managed Postgres (candidate: Railway or Render + Neon; final pick in the implementation plan), stable domain, `RESEND_API_KEY` configured so signup/notification emails send. Seeded with **Morna only**: school row + slug, the five exec officers, the charter, the diagnostic instrument. Zero demo content.
- **Demo**: unchanged — Riverside on Tom's Mac, tunnel + Pages proxy. Same codebase and branch; the database is the only difference.
- The Classlist link must be on the stable production domain before anything is shared.

## 6. Deliberately not in v1

- Multi-school self-serve directory ("enter your school" UI) — the schema is general; the seed is Morna. Built when there's a second school.
- General SaaS signup from the public marketing site — signup is reachable only via the diagnostic and direct invites ("the diagnostic is the way in").
- Pupil and teacher accounts at Morna — parents + exec only, until the school itself signs up.
- Editing or deleting submitted diagnostic answers; multiple submissions per email.
- Formal constitution/AGM machinery (elections, AGM votes) — the doc itself defers this; annual-goal and initiative machinery come first.

## 7. Milestones (sequencing inside Approach 1)

- **M0 — Durable host**: production host + Postgres + domain + email sending; Morna seed; smoke-verified deploy pipeline.
- **M1 — The link**: public diagnostic page with instrument, counter, email-gated submit, unlinkable storage, signup-via-email flow. *The Classlist link exists at the end of M1.*
- **M2 — Membership**: admin approval queue, anonymity choice, community-mode parent home, member-only school community page, results release + notification.
- **M3 — PTA depth**: officer roles (president/VP), charter claim flow, VOICE merge, annual goals, initiative checklist + five-stage school process.

M1 ships the shareable link early; M2–M3 land behind it while the first responses accumulate.

## 8. Open items (for the implementation plan)

- Final instrument wording — drafted from the Morna wellness hub + prevalence survey instruments; Tom reviews the question set before the link goes out.
- Host and domain choice (Railway vs Render vs Fly; which domain the link lives on).
- Submission counter threshold display (counter is public from zero; no unlock threshold — release is exec-controlled).
- Whether the charter acknowledgement requires all five officers or a quorum to activate the claim.

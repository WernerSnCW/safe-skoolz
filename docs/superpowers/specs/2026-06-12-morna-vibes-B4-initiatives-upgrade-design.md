# Morna Vibes — B4: pta_initiatives upgrade (design)

**Date:** 2026-06-12
**Status:** Approved by Tom (brainstorming session, this date)
**Part of:** Phase B (PTA depth) of the Morna Vibes "do-it-all" pathway. Phase B = **B1 (charter claim, shipped) → B2 (VOICE→PTA merge, shipped) → B3 (annual goals, shipped) → B4 (this, the final unit)**. B4 completes Phase B.
**Builds on:** B1 (claimed PTA + officer roles), B2 (the merge that auto-creates an initiative from the Morna Vibes mission), B3 (`pta_goals` with the proposed→shortlisted→senior-ballot→ratified→completed/failed lifecycle — ratified goals are what B4 initiatives align to), and the master spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md` §4.4 (the `pta_initiatives` upgrade half).
**Source of record:** the Morna PTA Operating Structure (`~/Downloads/Morna_PTA_Operating_Structure.docx`) — §5 Annual Goals, §6 Decision Authority, §7 Running an Initiative + the Self-Approval Checklist, §8 The Initiative Process with the School (the five stages), §10 Ongoing School Communications (non-responses). Quoted throughout.

## 1. Context and goal

The operating structure the PTA adopts (B1) defines how an initiative is run: a **one-page note** (§7), a **six-box self-approval checklist** that lets any single exec green-light low-risk work without a board meeting (§6/§7), and — for any initiative that touches the school — a **defined five-stage process** so "nothing stalls because of ambiguity and every proposal receives a clear decision" (§8), with **non-responses recorded and followed up** because "silence is not acceptance" (§10).

B4 upgrades the thin v1 `pta_initiatives` (title/summary/status/ownerId/originVoiceId/targetDate) into that full operating object. **Design principle (as throughout Phase B): reuse, don't rebuild.** The table, router (`POST`/`PATCH` in `ptaGovernance.ts`), page (`/pta/initiatives`), nav item, and B2's auto-create path all already exist; B4 adds columns, one history table, three endpoints, and upgrades the one page.

## 2. Key reconciliations (the open decisions, resolved)

| Question | Decision | Why |
|---|---|---|
| `goalId` alignment vs B2 reality | **`goalId` nullable at creation; alignment enforced at self-approval, not creation.** | §5/§7: "All initiative sign-offs must align with one of the agreed goals" — it is a *sign-off* requirement. B2 auto-creates an initiative from the Morna Vibes mission with `originVoiceId` and no goal; that must stay valid. You cannot tick checklist box 1 (and so cannot self-approve) unless `goalId` points to a **ratified** `pta_goals` row. |
| `status` vs `schoolStage` | **Orthogonal — keep both.** `status` (proposed/active/completed/cancelled) = the PTA's own run-state; `schoolStage` = where the initiative sits in the school's five-stage process, default `none`. | Internal/self-approved initiatives (checklist box 6 ticked) never touch the school and stay at `none`. Keeps v1's status control and B2's auto-created `proposed` initiative working untouched. Avoids conflating "PTA cancelled this" with "school rejected this". A stage move never auto-changes `status`. |
| "Five-stage" naming vs §4.4's 8 enum values | **Keep the 8-value enum as the state machine; the "five stages" is the human framing for the UI.** | §8 names five stages; two of them have two outcomes/sub-states each. Mapping below (§4.4). |
| Self-approval authority | **MANAGE = `requireRole("pta")`.** "Any single exec member" maps to any role=pta user; logged (`approvedById`/`approvedAt`/`approvalType='self'`) + audited. | Same guard every PTA mutation uses; consistent with the caretaker-Chair model (B1) where `executive_board` officer seats are largely vacant. |
| Who can create an initiative | **MANAGE-only (role=pta), unchanged from v1.** B2 convert still auto-creates. | §7 says "any senior-group member may propose"; deferred to keep B4 scoped and consistent with the current build. Flagged as a future fidelity item (§9). |
| Board approval path (checklist fails) | **Record-only.** Admin marks `approvalType='board'` with `approvedById`/`approvedAt` + optional free-text `boardNote`; no new board-vote machinery (the existing Voting / Decision Log already serve a formal vote if wanted). | §7: "If the checklist is not fully met, it comes to the full exec board." Keeps B4 scoped; a real ballot would be materially larger and over-engineered for v1 sign-off. |
| Non-response mechanics | **Computed, not stored** (same as proposals' `overdue`): `awaitingResponse = schoolStage==='presented' && responseDueAt && responseDueAt < now`. Follow-ups are first-class history rows. | §10: "Non-responses are also recorded … followed up. Silence is not acceptance and is not ignored." |

## 3. The five stages → enum mapping (§8)

| Stage (docx §8) | What happens | Enum value(s) |
|---|---|---|
| — (not a school matter) | Internal / self-approved; never presented | `none` (default) |
| 1. Idea | PTA member identifies an opportunity; one-page note | `idea` |
| 2. Presentation | Presented to school at a structured meeting; resources stated; `responseDueAt` set | `presented` |
| 3. Accept / Reject | Clear yes/no; reason recorded on no; "no proposal left without a decision" | `accepted` / `rejected` |
| 4. Implementation Plan | On accept, PTA produces a delivery plan signed off both sides | `planning` |
| 5. Delivery | PTA executes, reports, postmortem if needed | `delivering` / `delivered` |

`PTA_INITIATIVE_SCHOOL_STAGES = ["none", "idea", "presented", "accepted", "rejected", "planning", "delivering", "delivered"] as const`.

Allowed transitions (forward-only, validated): `none→idea`, `idea→presented`, `presented→accepted`, `presented→rejected`, `accepted→planning`, `planning→delivering`, `delivering→delivered`. `rejected` and `delivered` are terminal. Any other transition → 400.

## 4. Data model

Additive. **This slice DOES need a prod schema change** — apply via the Railway Postgres **Data SQL box**, one statement at a time (push-force is interactive/unreliable).

### 4.1 `pta_initiatives` new columns (in `lib/db/src/schema/ptaGovernance.ts`)

```
goalId           uuid → pta_goals.id        -- alignment target (nullable)
successCriteria  text                       -- "we'll know it worked when X"
resourcesNeeded  text                       -- help/resource needed
conflicts        text                       -- could it conflict with anything underway
checklist        jsonb  not null default {all false}
                 -- { alignsGoal, budgetOk, namedOwner, noConflict, successCriteria, noSchoolResource }: boolean
approvedById     uuid → users.id            -- who approved (nullable until approved)
approvedAt       timestamptz                -- when (nullable)
approvalType     varchar(10)                -- 'self' | 'board' (nullable until approved)
schoolStage      varchar(20) not null default 'none'
responseDueAt    timestamptz                -- when a school response is expected (set on → presented)
```

`PTA_INITIATIVE_APPROVAL_TYPES = ["self", "board"] as const`.
`InitiativeChecklist` type = `{ alignsGoal: boolean; budgetOk: boolean; namedOwner: boolean; noConflict: boolean; successCriteria: boolean; noSchoolResource: boolean }`; jsonb `$type` + default all-false.

### 4.2 New `pta_initiative_stage_history`

```
pta_initiative_stage_history
  id             uuid pk default random
  school_id      uuid not null → schools.id
  initiative_id  uuid not null → pta_initiatives.id
  entry_type     varchar(20) not null default 'transition'   -- 'transition' | 'follow_up'
  from_stage     varchar(20)                                 -- null on follow_up
  to_stage       varchar(20)                                 -- null on follow_up
  occurred_at    timestamptz not null default now()          -- the real-world event date (back-datable)
  outcome_note   text                                        -- written outcome
  reason         text                                        -- required when to_stage = 'rejected'
  recorded_by_id uuid not null → users.id
  created_at     timestamptz not null default now()
  index idx_pta_init_stage_hist_initiative (initiative_id)
```

`PTA_INITIATIVE_STAGE_ENTRY_TYPES = ["transition", "follow_up"] as const`.

### 4.3 Prod DDL (Railway Data box, one statement at a time)

```sql
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES pta_goals(id);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS success_criteria text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS resources_needed text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS conflicts text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{"alignsGoal":false,"budgetOk":false,"namedOwner":false,"noConflict":false,"successCriteria":false,"noSchoolResource":false}'::jsonb;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approved_by_id uuid REFERENCES users(id);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approval_type varchar(10);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS school_stage varchar(20) NOT NULL DEFAULT 'none';
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS response_due_at timestamptz;

CREATE TABLE IF NOT EXISTS pta_initiative_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  initiative_id uuid NOT NULL REFERENCES pta_initiatives(id),
  entry_type varchar(20) NOT NULL DEFAULT 'transition',
  from_stage varchar(20),
  to_stage varchar(20),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  outcome_note text,
  reason text,
  recorded_by_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pta_init_stage_hist_school ON pta_initiative_stage_history(school_id);
CREATE INDEX IF NOT EXISTS idx_pta_init_stage_hist_initiative ON pta_initiative_stage_history(initiative_id);
```

## 5. API — `/api/pta/initiatives*` (authed, in `ptaGovernance.ts`)

Reuse the existing aliases: `MANAGE = requireRole("pta")`, `VIEW = requireRole("parent","pta","coordinator","head_teacher")` (confirm at build time). Router stays registered before `ptaRouter` (no PII middleware — initiative/owner/proposer names are visible).

### 5.1 Extended existing endpoints

- **`POST /pta/initiatives`** (MANAGE) — body now also accepts `goalId?`, `successCriteria?`, `resourcesNeeded?`, `conflicts?` (all optional; `title`+`summary` still required). If `goalId` is set, validate it belongs to this school (else 404); **do not require it to be ratified at creation.** Inserts with `schoolStage='none'`, `checklist` all-false, unapproved. Existing `ownerId`/`originVoiceId`/`targetDate` behavior unchanged. Audit `pta_initiative_created` (unchanged event).
- **`PATCH /pta/initiatives/:id`** (MANAGE) — additionally accepts edits to `goalId` (school-scoped validate), `successCriteria`, `resourcesNeeded`, `conflicts`, and `checklist` (merge/replace the six booleans). `status` editing stays as today (stamps/clears `completedAt`). Editing the checklist does **not** approve — approval is its own endpoint. Audit `pta_initiative_updated` (unchanged).
- **`GET /pta/initiatives`** (VIEW) — list, extended per row with: `goalId`, `goalTitle` (joined), `goalStatus`, `schoolStage`, `responseDueAt`, `approvalType`, `approvedAt`, `approvedBy` (display name), `checklist`, `successCriteria`, `resourcesNeeded`, `conflicts`, and computed `awaitingResponse` (bool) + `followUpCount` (int). Names rendered identity-safe via `memberDisplayName`.

### 5.2 New endpoints

- **`GET /pta/initiatives/:id`** (VIEW) — full detail: the initiative (all fields above) + its `stageHistory` (newest first: entryType, fromStage, toStage, occurredAt, outcomeNote, reason, recordedBy display name). School-scoped (404).
- **`POST /pta/initiatives/:id/approve`** (MANAGE) — body `{ approvalType: 'self'|'board', boardNote? }`. School-scoped (404). Idempotent: if already approved → 409 `"already approved"`.
  - `self`: enforce **all six** checklist booleans are `true` **and** their backing invariants: `alignsGoal` ⇒ `goalId` set and that goal `status='ratified'`; `namedOwner` ⇒ `ownerId` set; `successCriteria` ⇒ `successCriteria` text non-empty. (`budgetOk`, `noConflict`, `noSchoolResource` are attestations with no backing field.) On any failure → 409 naming the unmet criterion.
  - `board`: record-only — no checklist gate (it is here *because* the checklist failed); store `boardNote` if given.
  - Both stamp `approvedById = caller`, `approvedAt = now`, `approvalType`. Audit `pta_initiative_approved` `{ approvalType }`.
- **`POST /pta/initiatives/:id/stage`** (MANAGE) — body `{ toStage, occurredAt?, outcomeNote?, reason? }`. School-scoped (404). Validate `fromStage(current)→toStage` is an allowed transition (else 400/409). `toStage='rejected'` requires non-empty `reason` (else 400). Transactionally: write a `transition` history row (`fromStage`=current, `occurredAt` defaults now), set `initiative.schoolStage=toStage`, and when `toStage='presented'` set `responseDueAt` from the body (`responseDueAt?` accepted here; optional — if absent the initiative is "presented, no due date" and never computes overdue). Does **not** touch `status`. Audit `pta_initiative_stage_changed` `{ toStage }`.
- **`POST /pta/initiatives/:id/follow-up`** (MANAGE) — body `{ note }` (required). School-scoped (404). Writes a `follow_up` history row (`entryType='follow_up'`, stages null, `outcomeNote=note`). For chasing a non-response. Audit `pta_initiative_followed_up`.

## 6. Frontend

`artifacts/safeschool/src/pages/pta-initiatives.tsx` (existing route `/pta/initiatives`, existing PTA nav item) — upgraded in place; plain elements, no framer enter-animations (prod-blank gotcha); errors/success surfaced like the other PTA pages.

- **Create form** gains: **Align to goal** select (ratified `pta_goals` only — fetched via the existing goals hook, filtered `status==='ratified'`), success criteria, resources needed, conflicts. Title/summary unchanged.
- **Each initiative card** surfaces:
  - the **one-page note** (goal alignment badge with goal title, success criteria, resources, conflicts);
  - the existing **status** control (orthogonal, unchanged);
  - the **six-box checklist** (admin toggles via PATCH) with an **Approve** button — offers *self* when all six are ticked and backed (else the unmet item is shown), and *board* (with an optional note) otherwise; once approved shows "✓ Self-approved by X" / "Board-approved by X";
  - a **five-stage stepper** (Idea→Presentation→Accept/Reject→Plan→Delivery) with admin stage-advance controls (reason field shown when advancing to Rejected); an **awaiting-response / overdue** banner when `awaitingResponse`; a **Log follow-up** action (with `followUpCount` shown);
  - an **inline-expandable stage-history timeline** (dates, outcomes, reasons, follow-ups) — stays on the single page, matching the other `/pta/*` pages (no separate detail route).
- On reaching `schoolStage='delivered'`, the UI **prompts** (does not force) marking `status='completed'`.

## 7. Conventions / build vertical

Proven M1/M2/A/B1/B2/B3 flow:
- **TDD backend** — extend/﻿add `artifacts/api-server/src/__tests__/` coverage (vitest: `app.listen(0)` + raw pool seeding + `fetch` + `signToken`; source `.env` first: `cd artifacts/api-server && set -a; . ../../.env; set +a`). Coverage: create with the note fields (goalId optional, unratified goal allowed at create); PATCH note fields + checklist; **self-approve** — all-six+backed succeeds and stamps; each unmet box / unratified goal / missing owner / empty success-criteria → 409; **board** approve record-only; already-approved → 409; **stage** transitions (each allowed step; illegal transition rejected; rejected requires reason; presented sets responseDueAt; writes history); **follow-up** writes a follow_up row + increments followUpCount; **awaitingResponse** computed true only when presented+past-due; detail returns ordered history; role guards (VIEW vs MANAGE); orthogonality (a stage move leaves status unchanged). Keep the existing 169 tests green.
- Schema → **additive SQL** (local via `psql`/`push-force`; **prod via the Railway Data box** per §4.3) → router (extend `ptaGovernance.ts`) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page upgrade in `pta-initiatives.tsx` (route + nav already exist).
- Front-end build preserves `dist/public/_worker.js`.
- Prod rollout is **Tom-gated**; the §4.3 DDL must be applied **before** `git push` (the endpoints error without the new columns/table). Then push auto-deploys to Railway.

## 8. Deliberately not in B4

- **Senior-group self-serve proposal** of initiatives (§7) — creation stays MANAGE-only; revisit when member-proposal UX is built (symmetric with a future goals change).
- **Real board ballot** for failed-checklist initiatives — `board` approval is record-only; the existing Voting / Decision Log already cover a formal vote.
- **Budget/threshold enforcement** — `budgetOk` is an attestation; no money model is introduced (Treasurer's spend log is out of scope).
- **Auto-completing `status`** when `schoolStage='delivered'` — UI prompts only; the axes stay orthogonal.
- **Editing/reverting stage history** — append-only; no undo of a logged transition in v1.
- **Notifications** on stage changes / overdue responses — surfaced in-app on the page; no new email/notification fan-out in B4.

## 9. Open items for the implementation plan

- Confirm the exact existing `MANAGE`/`VIEW` aliases and the owner/goal school-scoping query patterns in `ptaGovernance.ts`, and reuse them verbatim.
- Decide whether `checklist` PATCH is a full replace or a shallow merge of the six keys (lean: accept a partial and merge, so the UI can toggle one box at a time).
- Year/stepper empty-states and grouping to match the other `/pta/*` pages.
- Whether `GET /pta/initiatives` list should also return the latest stage-history entry (for a card sub-line) or leave full history to the detail endpoint (lean: detail only; list carries the computed `awaitingResponse`/`followUpCount`).
- Future fidelity: senior-group proposal of initiatives (§8 defers it).

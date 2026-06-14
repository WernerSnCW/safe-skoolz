# Morna Vibes — B3: PTA annual goals (design)

**Date:** 2026-06-12
**Status:** Approved by Tom (brainstorming session, this date)
**Part of:** Phase B (PTA depth) of the Morna Vibes "do-it-all" pathway. Phase B = **B1 (charter claim, shipped) → B2 (VOICE→PTA merge, shipped) → B3 (this) → B4 (initiatives upgrade + five-stage)**, in dependency order. This spec covers **B3 only**.
**Builds on:** B1 (the claimed PTA + officer roles), B2 (the merge that populates the membership + tiers), and the master spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md` §4.4 (the `pta_goals` half).

## 1. Context and goal

The operating structure the PTA adopts (B1) commits it to **annual goals proposed by the membership and ratified by a senior-group vote**, with all goals visible to all members. B3 encodes that: a `pta_goals` table with the lifecycle **proposed → shortlisted → (senior-group ballot) → ratified → completed / failed**, reusing the existing voting machinery (`pta_ballots` / `pta_votes`) for the ratifying vote.

**Design principle (as throughout Phase B): reuse, don't rebuild.** The PTA layer already has a roster with tiers (B2 populates `senior_group` / `general_membership` / `executive_board`), a full ballot/vote/quorum/proxy system, and an initiatives PATCH-transition pattern. B3 adds one new table, one additive column on `pta_ballots`, a small guard in the existing vote handler, and one page.

## 2. The key reconciliation: senior-group electorate vs. whole-roster ballots

Today every `pta_ballots` ballot's electorate is the **whole active roster** — any active member may vote, and the displayed eligible count is the active roster. The operating structure says goals are **ratified by a senior-group vote**. B3 makes the electorate a first-class property of a ballot rather than a process convention:

- **`pta_ballots` gains `electorate`** (`'all_members'` default | `'senior_group'`). Existing ballots default to `all_members` → unchanged behavior, existing voting tests stay green.
- **Goal ballots are opened with `electorate = 'senior_group'`.** The vote handler gains a guard: when a ballot's electorate is `senior_group`, a voter whose PTA tier is **not** `senior_group` or `executive_board` is rejected (403). This is the only change to the shared voting code, and it is inert for `all_members` ballots.
- **Senior-group electorate = tiers `senior_group` OR `executive_board`** (the two leadership layers). General membership proposes goals but does not ratify them; officers/execs are not excluded from the vote. *(Decision flagged for Tom's review — alternative is `senior_group` strictly.)*

## 3. Decisions

| Question | Decision |
|---|---|
| Electorate enforcement | **Enforce in code.** Add `electorate` to `pta_ballots`; goal ballots scope voting to senior_group+executive_board; existing ballots default `all_members` (unchanged). |
| Who proposes | **Any approved PTA member** (on the `pta_members` roster). Community input is served by Concerns; public proposals deferred. |
| Ratification trigger | **Manual admin ratify.** Admin closes the ballot, then explicitly ratifies (guard: linked ballot closed + carried) or marks failed with a postmortem. Decoupled from the existing ballot-close handler. |
| Shortlist step | **Keep it.** Admin promotes `proposed → shortlisted` before a ballot can open — the visible "this year's candidate goals" gate. |
| Goal↔ballot link | **`ballotId` on `pta_goals`** (nullable) — per master spec; leaves the ballots table structurally alone apart from the `electorate` column. |
| Goal visibility | **All members see all goals at every stage** — the "goals visible to all members" transparency principle. Read guard = the existing VIEW alias (members + exec). |
| Status transitions | Mirror the existing **initiatives PATCH** pattern (`PATCH /pta/initiatives/:id`) — one PATCH endpoint with validated transitions. |

## 4. Data model

Additive. **This slice DOES need a prod schema change** (unlike B2) — apply via the Railway Postgres **Data SQL box**, one statement at a time (push-force is interactive/unreliable).

### 4.1 New `pta_goals` (in `lib/db/src/schema/ptaGovernance.ts`)

```
pta_goals
  id              uuid pk default random
  school_id       uuid not null → schools.id
  title           varchar(255) not null
  description     text
  year            integer not null                 -- the academic/calendar year the goal is for
  status          varchar(20) not null default 'proposed'
  proposed_by_id  uuid not null → users.id         -- the member who proposed it
  ballot_id       uuid → pta_ballots.id            -- the ratifying senior-group ballot (nullable)
  ratified_at     timestamptz                      -- set on → ratified
  completed_at    timestamptz                      -- set on → completed
  postmortem_note text                             -- required on → failed
  created_at      timestamptz not null default now()
  index idx_pta_goals_school (school_id)
  index idx_pta_goals_status (school_id, status)
```

`PTA_GOAL_STATUSES = ["proposed", "shortlisted", "ratified", "completed", "failed"] as const`.

### 4.2 `pta_ballots` additive column

```
pta_ballots.electorate varchar(20) not null default 'all_members'
```

`PTA_BALLOT_ELECTORATES = ["all_members", "senior_group"] as const`.

### 4.3 Prod DDL (Railway Data box, one at a time)

```sql
ALTER TABLE pta_ballots ADD COLUMN IF NOT EXISTS electorate varchar(20) NOT NULL DEFAULT 'all_members';

CREATE TABLE IF NOT EXISTS pta_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  title varchar(255) NOT NULL,
  description text,
  year integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'proposed',
  proposed_by_id uuid NOT NULL REFERENCES users(id),
  ballot_id uuid REFERENCES pta_ballots(id),
  ratified_at timestamptz,
  completed_at timestamptz,
  postmortem_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pta_goals_school ON pta_goals(school_id);
CREATE INDEX IF NOT EXISTS idx_pta_goals_status ON pta_goals(school_id, status);
```

## 5. API — `/api/pta/goals*` (authed)

Role aliases as used in `ptaGovernance.ts`: `MANAGE = requireRole("pta")`, `VIEW = requireRole("parent","pta","coordinator","head_teacher")` (confirm the exact existing aliases at build time and reuse them). "Approved member" = a row in `pta_members` for the caller's `(schoolId, userId)` with `status = 'active'`.

- **`POST /pta/goals`** — propose. Caller must be an active member of this school's PTA roster (else 403). Body `{ title, description?, year? }`; `title` required; `year` defaults to the current year server-side if omitted. Inserts `status='proposed'`, `proposedById = caller`. `writeAudit("pta_goal_proposed")`. Returns `{ goal }`.
- **`GET /pta/goals`** — VIEW. Lists the school's goals (all stages — transparency), newest first, each with its linked ballot's status + tally (For/Against/Abstain counts, `closed`, `carried`) when `ballotId` is set, and the proposer's display name (identity-safe via `memberDisplayName`). Returns `{ goals: [...] }`.
- **`POST /pta/goals/:id/open-ballot`** — MANAGE. Requires the goal exists (school-scoped, else 404), is `shortlisted` (else 409), and has no `ballotId` yet (else 409). Body `{ quorum?, closesAt? }`. **Transactionally:** insert a `pta_ballots` row `{ schoolId, question: "Ratify goal: " + title (clamped 255), options default For/Against/Abstain, electorate: 'senior_group', quorum, closesAt, createdById: caller }`, then set `goal.ballotId`. `writeAudit("pta_goal_ballot_opened", { ballotId })`. The goal stays `shortlisted` while the ballot is open. Returns `{ goal, ballot }`.
- **`PATCH /pta/goals/:id`** — MANAGE. School-scoped (404). Body may carry a transition and/or edits:
  - `title`/`description` edits allowed **only while `proposed`** (else 409 "goal is locked once shortlisted").
  - `status` transition, validated:
    - `proposed → shortlisted` — allowed.
    - `→ ratified` — requires `ballotId` set, that ballot `status='closed'`, and **carried** (For > Against; and if the ballot has a `quorum`, total votes ≥ quorum). Else 409 with the reason. Stamps `ratifiedAt`.
    - `→ failed` — requires a non-empty `postmortemNote` in the body. Allowed from `proposed` or `shortlisted`. Stores the note.
    - `ratified → completed` — stamps `completedAt`.
    - Any other transition → 400.
  - `writeAudit("pta_goal_updated", { status })`. Returns `{ goal }`.

### 5.1 Existing vote handler change (`POST /pta/ballots/:id/vote`)

After resolving the voter's `pta_members` row (the handler already does this — voters must be on the roster), add: **if `ballot.electorate === 'senior_group'` and the voter's `tier` is not in `('senior_group','executive_board')`, return 403** `{ error: "Only the senior group may vote on this ballot" }`. No other change; `all_members` ballots are unaffected. The returned ballot objects in `GET /pta/ballots` include `electorate` so the UI can label senior-group ballots.

## 6. Frontend

- **Goals page** (`artifacts/safeschool/src/pages/pta-goals.tsx`, route `/pta/goals`, PTA nav item "Goals"): 
  - **Propose** form (any member): title, description, year.
  - **Goals list** grouped by `year`, each card showing stage, proposer, description, and — when a ballot is linked — its tally + status with a link to **`/pta/voting`** to cast the vote (the senior-group ballot surfaces there for eligible voters; we do not rebuild voting UI).
  - **Admin (MANAGE) actions** per stage: Shortlist (proposed), Open senior-group ballot (shortlisted, with optional quorum/close date), Ratify (after the ballot closes carried) / Mark failed (with a postmortem note), Mark completed (ratified).
  - Plain elements, no framer enter-animations (prod-blank gotcha). Error/success surfaced like the other PTA pages.
- **Voting page** (`pta-voting.tsx`, existing): show an `electorate` label on senior-group ballots (e.g. a "Senior group" chip) so non-eligible members understand why they can't vote. Low-effort; include if cheap.

## 7. Conventions / build vertical

Proven M1/M2/A/B1/B2 flow:
- **TDD backend** — new `artifacts/api-server/src/__tests__/ptaGoals.test.ts` (vitest: `app.listen(0)` + raw pool seeding + `fetch` + `signToken`; source `.env` first). Coverage: propose (member 201 / non-member 403 / missing title 400 / year default); list (all stages, ballot tally joined); shortlist transition; open-ballot (creates senior_group ballot + links, 409 when not shortlisted / already has ballot); the vote guard (senior/exec can vote a senior_group ballot, general_membership 403, all_members ballot unaffected); ratify guard (blocked when ballot open / not carried; succeeds + stamps ratifiedAt when closed+carried); fail requires postmortem; complete from ratified; role guards.
- Schema → **additive SQL** (local via `psql`/`push-force`; **prod via the Railway Data box** per §4.3) → router (register in `routes/index.ts` near `ptaGovernanceRouter`, NOT behind PII middleware — goal/member names are visible) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page + route in `App.tsx` + nav in `nav-config.tsx`.
- Front-end build preserves `dist/public/_worker.js`.
- Prod rollout is Tom-gated; push auto-deploys to Railway **but the §4.3 DDL must be applied first** (the goals endpoints 500/error without the table).

## 8. Deliberately not in B3

- **B4** — `pta_initiatives` upgrade: the `goalId` link (initiatives must align with a ratified goal), one-page-note fields, six-box self-approval checklist, five-stage school process + `pta_initiative_stage_history`. B3 ships goals as a standalone layer; B4 wires initiatives to them.
- Public/community goal proposals (non-members) — Concerns already serves community voice.
- Auto-ratification on ballot close — manual ratify chosen.
- Changing the quorum model (still an absolute integer; electorate affects who may vote, not the quorum arithmetic).
- Per-ballot eligible-count recomputation in `GET /pta/ballots` (the absolute `quorum` is unchanged; surfacing the senior-group eligible count is a nice-to-have, not required).

## 9. Open items for the implementation plan

- Confirm the exact existing role aliases (`MANAGE` / `VIEW`) and the proposer membership check pattern in `ptaGovernance.ts`, and reuse them verbatim.
- Confirm how the existing vote handler resolves the voter's member row + tier (so the electorate guard slots in cleanly without a second query if the tier is already loaded).
- Decide the goals page's grouping/empty-states to match the other `/pta/*` pages.
- Final call on the senior-group electorate definition (senior_group + executive_board vs. senior_group strictly) — §2, flagged for Tom.
- Year input UX (free integer vs. a small select of current/next year) — pick the simplest in the plan.

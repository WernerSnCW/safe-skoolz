# Morna Vibes — B1: Officer Roles + Charter Claim (design)

**Date:** 2026-06-12
**Status:** Approved by Tom (brainstorming session, this date)
**Part of:** Phase B (PTA depth) of the Morna Vibes "do-it-all" pathway. Phase B is decomposed into **B1 (this) → B2 (VOICE→PTA merge) → B3 (annual goals) → B4 (initiatives upgrade + five-stage)**, in dependency order. This spec covers **B1 only**.
**Builds on:** Phase A (the join experience, shipped + live) and the master spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md` §4.3 (the claim half).

## 1. Context and goal

This is **"Goal 2 made real"** — the second of the two asks parents back when they join Morna Vibes: *that the PTA adopt the proposed three-tier operating structure so every parent has an equal voice and the same information.* B1 makes the PTA's adoption of that structure a real, in-app act.

The PTA exists but is unclaimed/forming, and — critically — **Tom is not officially the Chair.** He operates the platform as **admin**, and the admin role carries the *operational authority the operating-structure doc assigns to "Chair"*, without asserting the title. So B1's claim flow is **admin-activated, ratified over time**: the admin adopts the operating structure on behalf of the forming committee (the PTA shows active/caretaker), and officer seats fill by approval and acknowledge as they come online. If/when a real Chair is approved into the seat, they hold it and the "acting" framing falls away. Nothing in the system asserts a title anyone doesn't hold.

**Design principle (as in A): reuse, don't rebuild.** The PTA layer already has members, officers, voting, decisions, announcements, initiatives, and `pta_policy_acknowledgements` — with routes and pages. B1 is a small, well-bounded addition: two enum values, one column, three endpoints, one page.

## 2. The admin / caretaker-Chair model (the key decision)

- **"Admin" = the existing `role=pta` / MANAGE capability.** No new role is introduced. Whoever holds PTA-manage authority (currently Tom's account) is the admin and carries Chair-equivalent operational authority (set up the PTA, invite/appoint officers, render and adopt the charter).
- **Officer seats are distinct from admin.** President / Vice President / Secretary / Chair / Treasurer are seats an *approved* person occupies (an existing `pta_officers` appointment). They are vacant until filled. The admin is not auto-appointed to any seat — in particular, the Chair seat may stay vacant (the admin acts in its stead) until a real Chair is approved.
- **The claim is admin-activated, then ratified over time.** The admin adopts the operating structure → the PTA is marked active (caretaker). Each officer, as their seat fills, acknowledges the charter; those acknowledgements are recorded and strengthen legitimacy but are not required for activation.

## 3. Decisions

| Question | Decision |
|---|---|
| Phase B structure | Decompose B1→B4 in dependency order; this is B1. |
| Activation threshold (spec §8 open item) | **Admin-activated, ratified over time** — admin adopts on behalf of the forming committee (sets the claim); officers acknowledge as seats fill. NOT "all five up front." |
| Tom's status | **Admin (caretaker), not Chair.** Admin = `role=pta`/MANAGE = Chair-equivalent authority. The Chair officer seat stays vacant until a real Chair is approved. |
| Officer roles | Add `president` + `vice_president` to the enum, **alongside** the existing chair/vice_chair (the structure has President *and* Chair as distinct roles). |
| "Claimed" representation | New `schools.ptaClaimedAt` (timestamptz, nullable) — no PTA-active flag exists today. |
| Acknowledgement mechanism | Reuse `pta_policy_acknowledgements` with `policyVersion="operating-structure-v1"`, `actionType="acknowledged"`. |
| Charter copy | Drafted from the operating-structure docx content; **Tom signs off the wording** (same gate as the instrument). |

## 4. Data model

All additive — apply via the Railway Postgres **Data SQL box** in prod (push-force is interactive/unreliable).

- **`pta_officers` role enum** (`PTA_OFFICER_ROLES` const in `lib/db/src/schema/ptaGovernance.ts`): add `"president"`, `"vice_president"`. Column is `varchar(50)`, so this is a const-array + UI change; no column change. Result: `["president", "vice_president", "chair", "vice_chair", "secretary", "treasurer", "domain_lead"]`.
- **`schools.ptaClaimedAt`** (timestamptz, nullable) — set when the admin adopts the charter; the activation marker.
- **`pta_policy_acknowledgements`** (exists, unchanged schema) — used with `policyVersion="operating-structure-v1"` for both the admin adoption row and each officer acknowledgement row. The actor is the row's `userId`.

## 5. API

All under `/api`, authed. "Exec/admin" = `requireRole("pta", "coordinator", "head_teacher")` (the established exec set); the **adopt** action requires MANAGE (`requireRole("pta")`) to match the existing officer/charter authority.

- **`GET /pta/charter`** — authed. Returns: the operating-structure charter content (served from a server-side constant module, versioned `operating-structure-v1`), the claim status (`claimedAt`, `claimed: boolean`), the current officer seats (role → member name, from `pta_officers`), and the acknowledgement roster (who has acknowledged `operating-structure-v1`, with timestamps). Members may read; the response is identity-safe (officer names are PTA-member names, already visible on the roster).
- **`POST /pta/charter/adopt`** — MANAGE (admin). Idempotent: if `schools.ptaClaimedAt` is already set, returns the existing claim. Otherwise: inserts an acknowledgement row (`operating-structure-v1`, actionType `"adopted"`, actor = admin) **and** sets `schools.ptaClaimedAt = now()` in one transaction; `writeAudit("pta_charter_adopted")`. Returns `{ claimedAt }`.
- **`POST /pta/charter/acknowledge`** — authed; intended for an appointed officer. Records the caller's acknowledgement row (`operating-structure-v1`, actionType `"acknowledged"`), idempotent per (user, policyVersion) — a second call returns 200 without a duplicate. `writeAudit("pta_charter_acknowledged")`. Does NOT change `ptaClaimedAt`. Returns `{ ok: true }`.

## 6. Frontend

- **Charter page** (`/pta/charter`, authed; allowedRoles parent + exec so members can read): renders the operating structure (the three tiers as responsibility-not-rank; the five officer roles + domains; the governance principles), the claim status ("Active since {date}" vs "Forming"), and the acknowledgement roster. The **admin** (role pta) sees an **"Adopt the operating structure"** button (calls adopt; disabled/relabelled once claimed). An **appointed officer** sees an **"I acknowledge"** button (calls acknowledge). Plain elements, no framer enter-animations (the prod-blank gotcha).
- **Officer appointment dropdown** (`/pta/governance`, existing page): add `President` and `Vice President` options to the role select.
- **Member shell** (the Vibes shell from A): once `ptaClaimedAt` is set, show a quiet line "Your PTA has adopted its operating structure" (low-effort; reads claim status from a small addition to the join/me payload or the charter endpoint). Optional polish — include only if cheap.

## 7. Charter content (draft — Tom signs off)

A server-side constant module (e.g. `artifacts/api-server/src/lib/operatingStructure.ts`) holding `policyVersion="operating-structure-v1"` and the rendered sections:
- **Purpose** — the PTA adopts this structure so every parent has an equal voice and the same information that is currently members-only.
- **Three tiers (responsibility, not rank)** — General membership (every approved parent), Senior group (members who take on coordinating work), Executive (the officers). Tier records work taken on, not authority over others.
- **Officer roles + domains** — President (school relationship), Vice President (wellness), Secretary (community), Chair (operational governance), Treasurer (finance).
- **Governance principles** — decisions and goals visible to all members; goals proposed by any member/community, ratified by a senior-group vote (B3); initiatives self-approve against a checklist and track the school's response with non-response recorded (B4); silence is not acceptance.

Draft wording is real (not placeholder) but flagged for Tom's review before the charter is presented to real officers.

## 8. Deliberately not in B1

- **B2** — extending `POST /voice/:id/convert` for the merge (backers→members, mission→initiative, constitute-where-none-exists, gate on claimed PTA).
- **B3** — `pta_goals` table + propose→shortlist→ballot→ratify.
- **B4** — `pta_initiatives` upgrade (one-page-note fields, six-box self-approval checklist, five-stage school process + `pta_initiative_stage_history`).
- Login-gating on `membershipStatus` (the A-review known gap) — a separate adjacent decision, not part of B1.
- Inviting/emailing officers (no Resend yet) — officers are appointed from existing members via the existing flow.

## 9. Open items for the implementation plan

- Exact route/file for the charter page (e.g. `pta-charter.tsx`, routed alongside the other `/pta/*` pages; add to the PTA nav in `nav-config.tsx`).
- Whether to thread `ptaClaimedAt` into an existing payload (e.g. `/api/join/:slug` or `/auth/me`) for the member-shell line, or read it from `GET /pta/charter` — pick the cheapest.
- Final charter wording (Tom's sign-off) — drafted per §7 from the operating-structure docx.
- Confirm the admin actor: the current Morna admin account is `tom@cloudworkz.com` (role pta, seeded as "Claudia (Secretary)"). The adopt action keys off `role=pta`/MANAGE, so it works regardless of the cosmetic name; note for the plan that this account is the caretaker admin.

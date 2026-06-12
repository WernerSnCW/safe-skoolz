# Morna Vibes — B2: VOICE → PTA merge (design)

**Date:** 2026-06-12
**Status:** Approved by Tom (brainstorming session, this date)
**Part of:** Phase B (PTA depth) of the Morna Vibes "do-it-all" pathway. Phase B = **B1 (charter claim, shipped) → B2 (this) → B3 (annual goals) → B4 (initiatives upgrade + five-stage)**, in dependency order. This spec covers **B2 only**.
**Builds on:** Phase A (the join experience, live), B1 (`docs/superpowers/specs/2026-06-12-morna-vibes-B1-charter-claim-design.md` — the admin/caretaker-Chair model), and the master spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md` §4.3 (the merge half).

## 1. Context and goal

B2 connects the two halves of the Morna Vibes arc. Phase A gets parents to sign up and **back the "Morna Vibes" VOICE group** (one `voice_groups` row for Morna, status `advocating`; backing it = backing both asks). B1 lets the admin **claim the PTA** by adopting the operating structure. B2 is the join: **the coalition becomes the membership.** When the admin merges Morna Vibes into the claimed PTA, every backer becomes a PTA member and the VOICE's mission carries forward as the PTA's first initiative — so the energy that formed the coalition becomes the PTA's first piece of organised work.

This is a **small, well-bounded extension of the existing `POST /voice/:id/convert`** (handler in `artifacts/api-server/src/routes/voiceGroups.ts`), not a new surface. Reuse, don't rebuild: `pta_members`, `pta_initiatives` (with `originVoiceId`), and `schools.ptaClaimedAt` all already exist. **No new tables, no prod schema change.**

## 2. The key reconciliation (admin/caretaker-Chair vs. "interim chair")

Master spec §4.3 says *"a VOICE can constitute a PTA where none exists (founder becomes interim chair)."* B1 deliberately **does not force anyone into the Chair title** — the admin (`role=pta`/MANAGE) is the caretaker-Chair, and the Chair officer *seat* stays vacant until a real Chair is approved.

**Resolution (Tom's call):** drop the "founder becomes interim chair" clause. Under the admin-caretaker model:

- **Claiming is a single deliberate act, and it belongs to B1.** There is no second, hidden "auto-constitute" claim path inside convert. The merge is **gated on a claimed PTA**: if `schools.ptaClaimedAt` is unset, convert refuses with a clear message telling the admin to adopt the operating structure first. For Morna this is the real sequence — B1 adopt, then B2 merge.
- **The founder folds in as a `senior_group` member** (exactly what convert already does for founders) — **no officer seat, no title.** The caretaker admin remains Chair-equivalent. "Constitute-where-none-exists" is therefore reconciled as: *B1's admin-activated adopt is the only constitution path; nobody is auto-made Chair.*

This keeps the entire system honest about titles (B1's core principle) and avoids two code paths that can set `ptaClaimedAt`.

## 3. Decisions

| Question | Decision |
|---|---|
| Claim gating | **Require a claimed PTA.** Convert returns 409 if `schools.ptaClaimedAt` is null. |
| Constitute-where-none / founder role | **Founder → `senior_group`, no title.** No auto-Chair, no officer seat. The "interim chair" clause is dropped; B1's adopt is the sole constitution path. |
| Mission → initiative | **Create one `pta_initiative`:** `title` = the VOICE name (e.g. "Morna Vibes"), `summary` = the mission, `status` = `proposed`, `originVoiceId` = the VOICE, `ownerId` = null (admin assigns later). |
| Supporters | Anonymous `voice_supporters` (no account) **cannot** become `pta_members` — only account-backed `voice_members` fold in. Resolves §4.3's "members/supporters → general membership" ambiguity. |
| Atomicity | Convert becomes **transactional** — member inserts + initiative create + VOICE status flip in one transaction. |
| Guard | Unchanged: `CONVERT = requireRole("pta", "coordinator", "head_teacher")`. |

## 4. Data model

All pre-existing — **no migration**:

- `schools.ptaClaimedAt` (timestamptz, nullable) — B1's claim marker; read as the gate.
- `pta_members` (tier `senior_group` | `general_membership`, status `active`) — the merge target; unchanged.
- `pta_initiatives` (already has `title`, `summary`, `status` default `proposed`, `ownerId`, `originVoiceId`, `createdById`) — the mission carries here; unchanged.
- `voice_groups` (status `advocating` → `converted`, `convertedAt`) — unchanged.

## 5. API — `POST /voice/:id/convert` (extended)

Authed, `CONVERT` guard. New behavior, in order:

1. Resolve the VOICE (school-scoped) → **404** if absent. *(existing)*
2. **Claim gate:** load `schools.ptaClaimedAt` for `u.schoolId`. If null → **409** `{ error: "Adopt the operating structure before merging Morna Vibes into the PTA." }`. *(new)*
3. If `status !== "advocating"` → **409** `"This VOICE has already been converted"`. *(existing)*
4. **In one transaction:**
   - Fold backers into `pta_members` — founder→`senior_group`, member→`general_membership`, skip anyone already on the roster. *(existing logic, moved inside the tx)*
   - **Create one `pta_initiative`** from the mission: `{ schoolId, title: voice.name, summary: voice.mission, status: "proposed", originVoiceId: voice.id, ownerId: null, createdById: u.userId }`. Defensive idempotency: skip creation if an initiative with this `originVoiceId` already exists (returns the existing one). *(new)*
   - Flip the VOICE → `status: "converted"`, `convertedAt: now()`. *(existing)*
5. `writeAudit("voice_converted", { backers, added, alreadyMembers, initiativeId })` — extended with `initiativeId`. *(extended)*
6. **Response:** `{ voice, converted: { backers, added, alreadyMembers }, initiative: { id, title } }` — `initiative` is new. *(extended)*

Notes:
- Convert is single-shot (step 3 blocks re-runs), so the initiative cannot be duplicated on a second call; the `originVoiceId`-exists guard is belt-and-braces.
- An already-claimed PTA with zero new backers still creates the initiative and flips the VOICE — the merge is meaningful even if everyone was already a member.

## 6. Frontend (`artifacts/safeschool/src/pages/voice.tsx`)

The convert action already exists (exec-gated "Convert to PTA" button with a `window.confirm`). B2:

- **Surface the merge result.** After a successful convert, show a concise success line/toast: *"Merged into the PTA — N members added · initiative 'Morna Vibes' created."* (reads the new response fields). Replaces the silent success.
- **Handle the claim gate.** If the PTA isn't claimed, the 409 message is shown to the admin (*"Adopt the operating structure first…"*). Cheapest-path refinement (decide in the plan): either surface the 409 inline, or read claim status (from `GET /pta/charter` or a lightweight field) and disable/relabel the convert button to *"Claim the PTA first"* with a link to `/pta/charter`. Lean toward the cheapest that's clear.
- Plain elements, no framer enter-animations (the prod-blank gotcha).

## 7. Conventions / build vertical

Proven M1/M2/A/B1 flow:
- **TDD backend** (vitest: `app.listen(0)` + raw pool seeding + `fetch` + `signToken`; source `.env` first: `cd artifacts/api-server && set -a; . ../../.env; set +a`). New tests cover: 409-when-unclaimed, founder→senior_group, member→general_membership, skip-existing-roster, initiative created with `originVoiceId` + correct title/summary, transactional rollback, response shape, audit row, re-convert 409, role guard (parent 403 / coordinator+head allowed).
- Update `lib/api-spec/openapi.yaml` for the new response field + the 409 → `pnpm --filter @workspace/api-spec codegen` (orval).
- Front-end build preserves `dist/public/_worker.js`.
- **No prod schema change** (all columns shipped in M1/B1). Prod rollout is Tom-gated; push auto-deploys.

## 8. Deliberately not in B2

- **B3** — `pta_goals` (propose → shortlist → senior-group ballot → ratify).
- **B4** — `pta_initiatives` upgrade (one-page-note fields, six-box self-approval checklist, five-stage school process + `pta_initiative_stage_history`).
- Auto-constituting a PTA inside convert (the "different entry" path) — superseded by the claim gate; B1's adopt is the sole constitution path.
- Folding anonymous public supporters into membership (no account to attach a member to).
- Login-gating on `membershipStatus` (a separate adjacent decision, as in B1).

## 9. Open items for the implementation plan

- Cheapest way to handle the unclaimed-PTA case in `voice.tsx` (surface the 409 vs. read claim status to disable the button) — pick in the plan.
- Confirm the initiative `title` length: VOICE names are short, but clamp to the 255-char column defensively.
- Whether the success line is a toast (if a toast primitive is already used on this page) or an inline status block — follow what `voice.tsx` already does.

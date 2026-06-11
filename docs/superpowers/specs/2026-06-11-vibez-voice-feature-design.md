# vibez VOICE feature (design)

- **Date:** 2026-06-11
- **Branch:** `feat/unified-app`
- **Status:** design locked (Tom's definition), build pending
- **Builds on:** the existing PTA governance system (`pta_members` with tiers executive_board / senior_group / general_membership; `pta_proposals`, `pta_ballots`, `pta_announcements`).

## Concept (Tom, 2026-06-11)

A **VOICE** is a **parent collective formed around a mission**. Its lifecycle:

1. **Advocate (pre-adoption).** Parents create/join a VOICE whose mission is to get the school (and PTA) to **adopt VBE**. The collective builds weight — members back the mission, it's visible to the school/PTA as one unified ask rather than scattered individual concerns.
2. **Convert (on adoption).** When the school adopts VBE, the VOICE converts: its members **join the PTA** at one of the **three tiers** (executive_board / senior_group / general_membership).
3. **Organise (post-adoption).** The PTA then uses the platform to **organise initiatives** (maps to the existing proposals / voting / announcements, plus a new "initiatives" concept later).

VOICE is the **on-ramp** to the PTA: scattered parents → one collective voice → adoption → folds into PTA governance.

## Data model (new)

- **`voice_groups`**: `id`, `schoolId`, `name`, `mission` (the advocacy goal text), `status` (`advocating` | `converted`), `createdById`, `createdAt`, `convertedAt?`.
- **`voice_members`**: `id`, `voiceId`, `userId`, `role` (`founder` | `member`), `joinedAt`. Unique (voiceId, userId).
- (Optional later) **`voice_backers`/endorsements** if backing should be distinct from membership; v1 = membership *is* backing.

Conversion (step 2) creates `pta_members` rows from `voice_members` at a chosen tier (default `general_membership`; founders → `senior_group`), and sets the voice `status = converted`.

## API (new router `voiceGroups.ts`, school-scoped, audited)

- `GET /voice` — list VOICEs for the school (with member counts, status).
- `POST /voice` — create (name + mission); creator becomes founder + first member.
- `GET /voice/:id` — detail (mission, members, count, status).
- `POST /voice/:id/join` — join (creates voice_member).
- `POST /voice/:id/leave` — leave.
- `POST /voice/:id/convert` — (PTA/coordinator role) convert to PTA: create pta_members at tier, set status=converted. Audited `voice_converted`.

All mutations `writeAudit` + school-scoped + role-guarded (create/join = parent; convert = pta/coordinator/head). Validate inline; openapi.yaml → orval generates hooks.

## UI

- **`/voice`** (page `voice.tsx`): parent-facing. Hero: "Be a voice for values." List of active VOICEs (name, mission, member count, Join button) + "Start a VOICE" (name + mission form). Founder/member views; "converted" VOICEs show a "now part of the PTA" state.
- Wire into: parent **MissionActions** ("Start/join a VOICE"), the **global launcher** ("Create a VOICE group" → `/voice`), and parent nav.
- Coordinator/PTA view: see VOICEs advocating, and a **Convert to PTA** action once the school has adopted.

## Build slices (each: schema→push→openapi→codegen→routes→page→nav→rebuild api-server→verify)

1. **Slice 1 — the collective.** `voice_groups` + `voice_members`; create / list / join / leave; `/voice` page + parent nav + launcher/MissionActions wiring. (The advocacy front end.)
2. **Slice 2 — conversion.** `POST /voice/:id/convert` → creates pta_members at tiers; converted-state UI; coordinator/PTA convert action.
3. **Slice 3 — initiatives.** PTA "initiatives" (organise post-adoption) — likely an extension of proposals/announcements.

## Operational note (important)

Building this touches the **backend**: schema migration + api-server rebuild + restart. The preview server currently owns port 8080 as the api-server, so the build sequence is: stop preview → schema push (`pnpm --filter @workspace/db push` or repo equivalent) → `pnpm --filter @workspace/api-spec codegen` → `cd artifacts/api-server && pnpm build` → restart (preview or runbook). Verify with curl + in-browser. This is the established PTA-slice recipe (see `schoolvbe-program.md`).

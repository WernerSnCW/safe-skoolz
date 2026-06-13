# Phase 4a — Tenant-Generic Hardening (hardcoded-Morna audit)

**Date:** 2026-06-14
**Status:** Scope agreed with Tom (4a/4b split; "do 4a, then everything else without my input"). Autonomous build authorized — no per-gate approval pause.
**Branch:** `feat/unified-app`
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — Phase 4 (tenant-generic hardening + 2nd-tenant onboarding), **sub-phase 4a** (the "audit out hardcoded-Morna assumptions" half). 4b (onboarding + capability-config + slug generation/backfill) is the follow-on.

## 1. What this is

Remove the hardcoded `"Morna"`/`"Riverside"` assumptions that make a non-Morna tenant behave or read wrong, so the platform is genuinely tenant-generic and the live Morna tenant is "instance #1, not the product." **Pure code change — no schema, no DB mutation, no new endpoints.** Fully self-verifiable (typecheck + prod build). Slug generation/backfill and the onboarding/capability-config path are **4b** (slug is tenant-creation/data; the existing null-slug already degrades gracefully — `ResultsSection` was guarded on `!!slug` in Phase 3).

## 2. The fixes (the audit result)

**Functional (a 2nd tenant gets the wrong data):**
1. `artifacts/api-server/src/routes/auth.ts:475` — blank-name signup writes `firstName = "Morna"`. → fallback `"Member"` (tenant-neutral; the adjacent `lastName` already falls back to `"Parent"`).
2. `artifacts/api-server/src/routes/communityDiagnostic.ts:205` — ghost-account creation `first = … || "Morna"`. → `|| "Member"`.

**Display/content (a 2nd tenant sees Morna/Riverside text):**
3. `artifacts/api-server/src/lib/operatingStructure.ts:9` — charter `title: "Morna PTA — Operating Structure"` (served to every tenant that adopts the structure). → `"PTA — Operating Structure"`. Tidy the line-1 comment too.
4. `artifacts/api-server/src/routes/voiceGroups.ts:262` — error `"… merging Morna Vibes into the PTA."` → `"… merging the VOICE into the PTA."`.
5. `artifacts/safeschool/src/pages/training.tsx:232` — `Pick "Riverside School" from the school dropdown.` → `Pick your school from the dropdown.`
6. `artifacts/safeschool/src/pages/how-it-works.tsx:1078` — demo notification `"Riverside School — Term 2 Safeguarding Update"` → `"Your school — Term 2 Safeguarding Update"`.
7. `artifacts/safeschool/src/components/home/YoureInBanner.tsx:17` — drop the `&& user.firstName !== "Morna"` guard (now that the fallback is never "Morna"): `const firstName = user?.firstName ?? "";`.
8. `artifacts/api-server/src/routes/join.ts:7` — comment "Morna Vibes front door" → tenant-neutral comment.

## 3. Out of scope (→ 4b or intentional)

- **Slug generation-on-create + backfill of existing null slugs** → 4b (tenant onboarding). The null-slug path already degrades gracefully in the UI.
- **`MORNA_INSTRUMENT` / `MORNA_YEAR_GROUPS` constant names** (`communityInstrument.ts:21,26`) — internal symbol names only; content is generic and shared by all tenants; renaming has no behavioural effect and unclear importers. Deferred (YAGNI).
- **Intentionally left** (per Phase 1): storage keys (`safeskoolz_lang`), i18n key names, `@safeschool.dev` demo emails.
- **No `PATCH /schools/:id` / onboarding endpoint** → 4b.

## 4. Verification

- **Typecheck:** `pnpm typecheck` — no NEW errors in changed files (pre-existing failures ignored).
- **Build:** `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` succeeds (the api-server changes are in the express build; the frontend changes compile + prerender clean).
- **api-server tests:** `pnpm --filter @workspace/api-server test` (or the repo's test command) — the existing suite must stay green (the firstName fallback + charter title may be asserted in tests; update any test that hardcodes the old "Morna" expectation to the new tenant-neutral value, noting it in the commit).
- **Holistic code review** over the 4a diff.
- No DB mutation; no prod step.

## 5. Note for the build

Search the test suite for assertions on the old values (`"Morna"` firstName, `"Morna PTA — Operating Structure"`) before changing, and update them in lockstep — these are the most likely source of a red suite.

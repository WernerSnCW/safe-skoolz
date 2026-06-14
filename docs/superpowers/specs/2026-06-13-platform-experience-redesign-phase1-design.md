# Phase 1 — Unified Shell + Tenant Config + Naming Cutover

**Date:** 2026-06-13
**Status:** Brainstormed with Tom (this date, visual companion) — design approved; ready for implementation plan.
**Type:** Single-phase implementation spec.
**Parent brief:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — this is **Phase 1** of that program (§6).
**Branch:** `feat/unified-app`. Frontend: `artifacts/safeschool/src`. API: `artifacts/api-server/src`. Schema: `lib/db/src/schema`.

---

## 1. Goal & scope

Phase 1 is **the backbone** the rest of the redesign hangs off. It does three things and no more:

1. **Tenant config** — give the platform a real per-tenant config object (display name, theme, enabled-capability flags) so the experience can *think* platform-first / tenant-generic.
2. **Naming cutover** — untangle the vibez / SchoolVBE / Morna knot so end users see only **"{School} Vibes"**, driven by tenant config; nothing Morna-specific stays hardcoded.
3. **One state-aware nav + one shell** — collapse the role-only nav into a single nav keyed by `membership state × role × tenant capabilities`, rendered in one shell across all states.

### In scope
- The `schools`-table config extension + seed for Morna and Riverside.
- The tenant-resolution + reading mechanism (public endpoint, `/auth/me`, `TenantProvider`, theme application, `/s/:slug` entry).
- The naming cutover (in-app brand + killing hardcoded "Morna").
- The state-aware nav **mechanism** and one-shell wiring.

### Explicitly deferred (do **not** build here)
| Deferred | Phase |
|---|---|
| Rich teach-then-ask front-door **content** + "Learn" area | 2 |
| Marketing-site (`PublicLayout` / prerendered `/schools` etc.) rebrand & retirement | 2 |
| Per-state **home-page composition** (consolidating dashboards/funnel tiles) | 3 |
| Capability-flag **admin UX** + second-tenant onboarding path | 4 |
| Final parent-facing copy (the "VBE improves ___" headline, behaviour wording) | Tom-owned |

In Phase 1 the **anon front door is a minimal placeholder** that the shell + nav can render; Phase 2 fills it.

---

## 2. Decisions locked in brainstorm

1. **Tenant entry = path-based slug.** Tenant lives in the URL path; canonical tenant root is **`/s/:slug`**. Existing `/d/:slug`, `/join/:slug`, `/v/:id` stay as deep links. Bare domain → the existing `/find-school` picker. (Subdomains remain a future presentation-only upgrade; not built now.)
2. **Config storage = extend `schools` + JSONB capabilities.** Not a new table; not per-capability boolean columns.
3. **Brand model = Option C (VBE + Vibes).** **VBE** = the free framework everyone can learn (the cause). **Vibes** = the tiered software platform (PTA → whole-school). **"{School} Vibes"** = a tenant's instance. **"SchoolVBE" retires as a spoken brand** (the `schoolvbe.com` domain is kept). End users see their tenant display name; the platform endorsement string becomes **"Vibes — software for VBE"** (login footnote / ops surfaces only).
4. **Marketing surfaces stay in Phase 2** — `PublicLayout` and the prerendered marketing pages are untouched here.
5. **Nav reveals by state; state-gated items are locked-but-visible** (not hidden). Off-capabilities collapse into one **"More of Vibes — switched on as {School} adopts"** block. Capability gating is **two states only** (on / "soon") — no third "hidden" state.
6. **Anon lives in the same shell** as the authed states.

---

## 3. Tenant config — the data backbone

### 3.1 Schema (extend `schools`)

`lib/db/src/schema/schools.ts` — add three columns (additive, nullable/defaulted so prod DDL is safe via the Railway Data box):

```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS display_name varchar(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;
```

- **`display_name`** — what "{X} Vibes" is built from. Backfill from `name` (`UPDATE schools SET display_name = name WHERE display_name IS NULL;`). Resolution rule: `displayName = display_name ?? name`.
- **`theme`** — `{ primaryColor?: string }` for v1 (room to grow: accent, logo URL). Empty `{}` ⇒ fall back to the existing global tokens (blue `#126AF9`). Keep it minimal — only `primaryColor` is read in Phase 1.
- **`capabilities`** — the enabled-capability map (see §3.2). Empty `{}` is treated as "nothing explicitly enabled" → resolve through `CAPABILITY_DEFAULTS` so an un-configured school still behaves sanely.

### 3.2 Capability taxonomy (v1)

A flat string→boolean map. The keys (v1):

| Capability key | Meaning | Morna (PTA tier) | Whole-school tier |
|---|---|---|---|
| `learn` | VBE education / resources area | on | on |
| `diagnostic` | VBE readiness survey (`/d/:slug`) | on | on |
| `voice` | Vibes advocacy / join / backing | on | on |
| `membership` | PTA roster + approval queue | on | on |
| `results` | diagnostic results aggregation | on | on |
| `concerns` | parent concerns channel | on | on |
| `pta` | PTA operating layer (charter/goals/initiatives/voting/decisions/announcements) | on | on |
| `safeguarding` | incident reporting / case management | **off** | on |
| `lessons` | PSHE / lessons | **off** | on |
| `behaviour` | behaviour tracking | **off** | on |

- A single source-of-truth constant `CAPABILITY_DEFAULTS` (shared, e.g. `lib/db` or an api-server lib) defines the full key set + default values; resolution = `{ ...CAPABILITY_DEFAULTS, ...school.capabilities }`. Adding a capability later = one line in the default map + the seed, no migration.
- **Phase 1 gating is presentational only.** Capability flags drive what the **nav** shows (live vs "soon"); they do **not** add new server-side 403s in Phase 1 (the deep-app routes are already role-gated and have no Morna data). Enforcing capabilities at the API is a Phase 4 concern, flagged there.

### 3.3 Seed

- **Morna** (`slug: 'morna'`): `display_name = 'Morna'`, `theme = {}` (default blue), `capabilities` = PTA-tier on, `safeguarding/lessons/behaviour` off.
- **Riverside** (demo): `display_name = 'Riverside'`, `theme = {}`, capabilities = all on (it's the full-stack demo per program memory).
- Extend the existing seed scripts (`scripts/src/seed.ts`, `scripts/src/seed-morna.ts`) to write these. Prod: apply the ALTERs + an idempotent `UPDATE`/`INSERT` of the capability JSON via the Railway Data box (the established pattern), then `git push`.

---

## 4. How the shell reads tenant config

### 4.1 API

- **New public `GET /api/tenant/:slug`** → `{ slug, displayName, theme, capabilities }`. Resolves the school by `slug`, `active: true`; 404 if unknown. Mirrors the existing public `join.ts` / `communityDiagnostic.ts` slug-lookup pattern. Leaks no internal ids beyond what `/join/:slug` already does.
- **Extend `/auth/me`** (`artifacts/api-server/src/routes/auth.ts`, `formatUser`) to include a `tenant: { slug, displayName, theme, capabilities }` block, resolved from the user's `schoolId`. (The user already carries `schoolId`; add a single `schools` lookup or join.)
- Update `lib/api-spec/openapi.yaml` for both, regenerate hooks (`pnpm --filter @workspace/api-spec codegen`) → `useGetTenant` (or similar) + the augmented `me` type.

### 4.2 Frontend

- **`TenantProvider`** (`src/providers/` or `src/hooks/`) exposes `useTenant() → { slug, displayName, capabilities, theme, isLoading }`.
  - **Authed:** read `tenant` off the `/auth/me` payload (via the existing `useAuth`/`useGetCurrentUser`).
  - **Anon (slug in path):** fetch `GET /api/tenant/:slug` for the slug resolved from the route.
  - **No tenant resolvable** (bare domain, no slug, not signed in): tenant is `null` → the shell shows the `/find-school` finder; no theme override.
- **Theme application:** when `theme.primaryColor` is set, override the relevant `index.css` CSS custom properties on a root element (e.g. set inline style / `data-tenant` on `<html>` or the app root once tenant resolves). Everything already derives from `hsl(var(--token))`, so this is a small, central change. Empty theme = no-op (global tokens stand).
- **Routing (`src/App.tsx`):**
  - Add **`/s/:slug`** as the canonical tenant root (anon → the placeholder front door inside the shell; authed → their home).
  - Replace the hardcoded `<Route path="/join">{() => <JoinPage slug="morna" />}</Route>` default with slug-from-context (no "morna" literal).
  - Bare `/` for anon: route to `/find-school` (or render it) rather than assuming a tenant. (The authed `/` → Dashboard behaviour via `HomeRoute` is unchanged.)

---

## 5. Naming cutover (Option C)

**Principle:** end users see **"{displayName} Vibes"** (from tenant config). The platform brand surfaces only as the endorsement string **"Vibes — software for VBE"** on ops/login surfaces. Internal identifiers are left alone.

### 5.1 In-app brand
- **`src/components/brand/BrandLockup.tsx`** — render the tenant **"{displayName} Vibes"** as the primary wordmark (consume `useTenant()`); replace the hard "vibez" + "by SchoolVBE" endorsement with "Vibes — software for VBE" where an endorsement is shown (login footnote / ops only, not the parent-facing sidebar). Where no tenant is resolved (bare-domain finder), fall back to a neutral "Vibes" wordmark.
- **`login.tsx`** — wordmark/tagline/`protectedBy` use the Option-C strings; the `protectedBy` locale line ("vibez by SchoolVBE …") updated in `en/es/nl/fr` `login.json` to "Vibes — software for VBE …" equivalents.
- Document `<title>` — set to "{displayName} Vibes" when a tenant is resolved.

### 5.2 Kill hardcoded "Morna" (app logic, not seed data)
- `ParentDashboard.tsx` (`eyebrow="Morna Vibes"`, the `/d/morna` + `/results/morna` tile links) → tenant-driven (`{displayName} Vibes`, `/d/${slug}`, `/results/${slug}`).
- `pta-charter.tsx` (`eyebrow="Morna Vibes"`) → tenant-driven.
- `App.tsx` `/join` default slug → from context (per §4.2).
- The API "Morna" first-name fallbacks (`auth.ts:474`, `communityDiagnostic.ts:195/199`) are cosmetic defaults for a missing name — **leave them** (renaming is churn; they never surface as a brand). Note in the plan, don't change.

### 5.3 Deliberately left unchanged
- Storage keys (`safeskoolz_lang`, `safeschool_token`, `safeschool_theme`), i18n **key names**, `@safeschool.dev` demo emails, code comments — internal, no user benefit, high churn.
- `PublicLayout` + prerendered marketing pages — Phase 2.

---

## 6. The single state-aware nav

### 6.1 Mechanism
Refactor `src/components/layout/nav-config.tsx`:

- `getNavSections(role, t, counts)` → **`getNav({ membershipState, role, capabilities, t, counts })`** returning `{ sections, footer }` where each `NavItem` gains an optional **`state`** of `'live' | 'locked' | 'soon'` and an optional `lockReason`/`badge`.
- **Membership-state derivation** (a small helper, e.g. `getMembershipState(user)`):
  - `anon` — no user.
  - `pending` — `user.membershipStatus === 'pending'`.
  - `approved` — `user.membershipStatus === 'approved'` and **not** exec.
  - `exec` — `isExecRole(role)` (reuse the existing `isExecRole` from `artifacts/api-server/src/lib/memberDisplay.ts` — mirror/share it on the client, or add a small client copy).
- **Capability gating:** an item whose backing capability is **off** for the tenant renders with `state: 'soon'` under the "More of Vibes" group. An item gated by a state the user hasn't reached (e.g. Results for a `pending` member) renders `state: 'locked'`.

### 6.2 Section structure across states
The four columns approved in the companion (anon / pending / approved / exec) are the canonical structure. The nav composes from capability-keyed groups, filtered/decorated by state:

- **Home** (pinned top; label/destination per state — the *content* of each home is Phase 3).
- **Learn VBE** (`learn`): What VBE is & why · Resources. (Placeholder content in P1; filled P2.)
- **The picture** (`diagnostic`, `results`): Diagnostic · Results (`locked` for pending).
- **Your community** (`voice`, `concerns`, `membership`): the ask & backing · Concerns · Members (exec) · Release results (exec).
- **PTA** (`pta`): Goals · Initiatives · Decisions · Voting (exec) · Charter (exec) · Announcements — `locked` for pending, read/participate for approved, run for exec.
- **More of Vibes — switched on as {School} adopts** (any capability that is off): Safeguarding · Lessons · Behaviour, all `state: 'soon'`.
- **Footer:** Notifications · Settings · (Sign in for anon).

> Note: the **whole-school staff/pupil role navs** (today's teacher/senco/coordinator/head_teacher/pupil sections in `nav-config.tsx`) are **not redesigned** in Phase 1 — Morna has no such users and those capabilities are off. Phase 1 must **keep them working** for the Riverside demo (regression-safe), wired through the same `getNav` signature. The state×role matrix beyond parent/exec is exercised but not visually reworked here.

### 6.3 Shell
- `AppLayout` consumes `useTenant()` for the brand slot and `getNav(...)` for the sidebar; renders `'locked'`/`'soon'` items in a muted style with the lock/soon affordance (visible, non-navigating or routing to an explainer).
- One shell across authed states. The **anon** state renders in the shell with the anon nav + the placeholder front door. (Marketing `PublicLayout` continues to serve the existing prerendered routes until Phase 2 — the two coexist this phase.)

---

## 7. Testing & verification

- **API:** unit/integration tests for `GET /api/tenant/:slug` (known slug, unknown→404, inactive→404, capability JSON shape) and for `tenant` presence on `/auth/me`. Keep the existing api-server suite green (currently 194 tests).
- **Capability resolution:** a focused test that `{ ...DEFAULTS, ...school.capabilities }` yields the expected on/off set for Morna vs Riverside.
- **Nav mechanism:** unit tests for `getMembershipState` and `getNav` — assert the right items appear with the right `state` for each (state × role × capabilities) combination, including the four Morna-parent columns and a Riverside whole-school role (regression).
- **In-browser (preview MCP, the `vibez` launch config):** verify per state that the brand reads "{School} Vibes", theme applies, locked/soon items render correctly, and the Riverside staff nav still works. Build clean + public routes 200 (no regression to the prerendered marketing pages).
- Follow the established loop: build → curl/test → in-browser → commit per slice.

---

## 8. Rollout notes

- Prod schema change: apply the §3.1 ALTERs + the backfill `UPDATE` + the capability-JSON seed via the **Railway Data box** *before* `git push` (so `/auth/me` and `/api/tenant/:slug` don't 500 on a missing column). Same gate discipline as B3/B4.
- No change to auth, tokens, or the existing public/prerender pipeline.

---

## 9. Open items for the implementation plan

1. Confirm the `/s/:slug` route shape (vs reusing `/join`) — spec assumes `/s/:slug` canonical + keep `/join`/`/d` deep links.
2. Where `CAPABILITY_DEFAULTS` + the `isExecRole`/`getMembershipState` helpers live so both client and server share one definition (avoid drift).
3. Exact CSS-var override mechanism for `theme.primaryColor` (root inline style vs a generated `<style>` vs `data-tenant` class) — pick the one that plays cleanest with the existing dark-mode toggle and SSR/prerender.
4. Whether the anon placeholder front door is a brand-new minimal page or a thin reuse of an existing one (keeping P2 free to replace it).

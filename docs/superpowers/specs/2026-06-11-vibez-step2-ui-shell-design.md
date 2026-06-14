# vibez Step 2 — UI/UX shell modernise (design)

- **Date:** 2026-06-11
- **Branch:** `feat/unified-app`
- **Status:** approved (brainstorm complete), pending implementation plan
- **Builds on:** Step 1 (`2026-06-10-vibez-step1-rebrand-design-system-design.md`) — the rebrand + full design-token colour system in `artifacts/safeschool/src/index.css`.

## Problem

The logged-in vibez app still reads as "rebranded SafeSchool", not as one modern product continuous with the SchoolVBE marketing site. Tom confirmed two priorities: the **shell feels incohesive** and the **site→app seam feels like two products**. Within those, all of the following ring true:

- Shell: flat 11–14-item nav lists; a leftover safeguarding **shield** identity fighting the brand; no calm home/hub; each page styles its own header/cards.
- Seam: the login page feels like a different product; no path back to the site; returning users get dumped at a dashboard; the SchoolVBE→vibez brand handoff is abrupt.

Chrome polish and the deferred accent-palette tokenisation are **not** priorities — addressed only where they're cheap wins (see §7).

## Design direction — convergence (not invention)

The marketing site (`PublicLayout.tsx`, `home.tsx`) **already defines the target visual language**. Step 2 pulls the app's visual language toward it; it does not invent a new one.

| | Marketing site (north star) | App shell (today) |
|---|---|---|
| Cards | `rounded-2xl border-border bg-card shadow-sm`, airy | `glass-panel`, denser `rounded-xl` |
| Icon treatment | clean `rounded-xl bg-accent` tiles | gradient `from-primary to-secondary` **shield** tiles |
| Headings | `font-display` (Quicksand) | mixed |
| Brand | calm "SchoolVBE" wordmark | gradient shield + lockup |
| Feel | spacious, considered | functional admin tool |

**Approach: shared design-layer first (Approach A).** Build a thin shared UI layer, then reskin shell → dashboards → login/seam onto it. No data/logic churn in the large dashboard files — restyle wrappers and add components only.

## 1. Shared design layer (build first)

New/[updated] components in `artifacts/safeschool/src/components/`:

- **`PageHeader`** (new, `components/layout/PageHeader.tsx`) — one header pattern for every authed page: mono **eyebrow** (e.g. role label) + `font-display` title + optional subtitle + optional right-aligned action slot. Replaces the ad-hoc per-page headers.
- **Converged card pattern** — standard authed card = `rounded-2xl border border-border bg-card shadow-sm` with an **accent icon-tile** (`rounded-xl bg-accent text-accent-foreground`, not the gradient shield tile). Applied via the existing shadcn `Card` styling + a small set of conventions; not a heavyweight new abstraction. Retire `glass-panel` usage in content areas (sidebar/header chrome can keep a subtle treatment).
- **`NavGroup`** (new) — a labelled, ordered group of nav items used by `AppLayout`'s sidebar.
- **Brand treatment** — retire the `ShieldCheck` gradient tile from the sidebar, mobile header, and login. Brand spot = the existing `BrandLockup` ("vibez by SchoolVBE") only. No new asset.

All consume existing `index.css` tokens. No new colour tokens required.

## 2. Shell — grouped nav + page-shell (`AppLayout.tsx`)

- **Grouped nav.** Replace each role's flat array with grouped sections. Group set: **Safeguarding · Wellbeing · Learning · People · Admin**, plus a **PTA** group for the `pta` role. `Home` is pinned at the top (ungrouped). Each role surfaces only the groups it uses; group membership derives from the existing per-role item lists (no items added/removed in Step 2, only grouped + reordered).
  - Indicative mapping (Coordinator): Safeguarding = Log incident, Incidents, Protocols, Alerts; Wellbeing = Behaviour, Noticeboard; Learning = Lessons, Learn, Case studies, Diagnostic; People = All pupils, Messages; Admin = Audit log, Admin.
  - Group labels are small mono uppercase, matching the eyebrow style.
- **Pinned footer.** Notifications + Settings + the user chip + Sign out pin to the sidebar footer (stop scrolling away). Add a quiet **"SchoolVBE ↗"** link here (path back to the public site — opens `/` public).
- **Groups always expanded** in Step 2. Collapsible groups are explicitly deferred (state-persistence complexity not justified yet).
- **Brand spot** = `BrandLockup` only, shield removed (desktop sidebar + mobile header).
- **Mobile** bottom-nav and dropdown menu keep their current role-priority logic; restyled onto the converged language. Grouping primarily affects the desktop sidebar; the mobile dropdown may show group labels as lightweight dividers.

## 3. Dashboards — reskin in place (`pages/dashboard/*`)

Pattern applied to all four (`PupilDashboard`, `ParentDashboard`, `TeacherDashboard`, `CoordinatorDashboard`):

- **`PageHeader` with a personal greeting** ("Welcome back, {firstName}") — this is also the **returning-user landing** fix (carries marketing warmth inward), handled on the dashboard rather than as a new surface.
- **"Since you were last here" digest band** (new shared component, e.g. `components/dashboard/WhatsNewBand.tsx`) — a calm band tying together cross-cutting updates. Fed per role from already-available sources:
  - **Parent:** new messages + incident updates about their child + PTA/noticeboard items.
  - **Pupil:** new messages + lessons/diary nudges + noticeboard.
  - **Teacher/Coordinator/SENCO:** new messages + incidents needing attention + alerts.
  - Each digest row **deep-links** into the relevant page. Sourced from existing hooks (`useListNotifications`, message notifications, role data already loaded by the dashboard) — no new endpoints.
- **Existing detail cards kept, restyled** onto the converged card system below the band. **No changes to dashboard data/logic** — only presentational wrappers.

## 4. Login & the site→app seam (`pages/login.tsx`)

- **Split layout.** Left = brand-warmth panel (vibez gradient ground, "vibez by SchoolVBE" lockup, tagline "New School Vibez, Old School Values", one-line product descriptor) carrying the marketing language across the seam. Right = the form. Mobile stacks: brand banner on top, form below.
- **Retire** the rotated `rounded-3xl` gradient-shield logo and the centered-card + backdrop blur treatment.
- **Role-tabs kept** (pupil/staff/parent/pta) **with their role accent tints** (deliberate variety) — re-housed in the converged card system. Per-tab info panels and the "Show me around" demo CTA stay, restyled.
- **"← Back to SchoolVBE"** link on login (to public `/`), matching the sidebar-footer link from §2 — the path back works both ways.

## 5. Sequencing

1. Shared design layer (§1): `PageHeader`, converged card conventions, `NavGroup`, brand/shield retirement.
2. Shell (§2): grouped nav + pinned footer + back-to-site link, on the new layer.
3. Dashboards (§3): `WhatsNewBand` + greeting header + restyle, one role at a time (Parent and Coordinator are the heavy files — do them carefully, smaller ones first to prove the pattern).
4. Login & seam (§4).

Each step is independently buildable + verifiable and gets its own commit(s) on `feat/unified-app`.

## 6. Verification (per Step-1 pattern)

- Build front-end: `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5`.
- If `api-server` changed (not expected in Step 2): `cd ../api-server && pnpm build` + restart.
- Public-route regress (all 200): `for p in / /schools /parents /ptas /coalitions /resources /about; do /usr/bin/curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:8080$p; done`.
- Authed visual checks: log in via Vite dev (:5173) or drive :8080 — `pta.chair@safeschool.dev` / `password123` (pupil PIN 1234). Verify each role's grouped nav, dashboard band, and the login/seam on desktop + mobile widths.
- Gotchas: use `/usr/bin/curl`; `pnpm typecheck` fails on pre-existing issues — verify per-batch with build.

## 7. Accent palettes (deferred decision — confirmed)

The dashboard accent palettes and login role-tab tints stay as deliberate accent variety. We do **not** tokenise them into `cat-*`/`role-*` in Step 2 unless the reskin makes a specific accent clash; revisit only if it gets in the way.

## 8. Out of scope / non-goals

- No backend/API/schema changes; no new endpoints (digest band reuses existing data).
- No changes to dashboard data/business logic — presentational only.
- No collapsible nav groups (deferred).
- No broad accent-palette tokenisation (§7).
- Step 3 (all-in demo + VOICE feature) is separate.
- Lower-priority leftovers (push/PR, announcement email, Phase-0 free/paid split, i18n key `safeskoolz_lang`) remain out of scope.

## Open questions to confirm in plan

- Exact per-role group membership for the remaining roles (pupil/parent/teacher/support_staff/senco/head_*/pta) — derive mechanically from current arrays.
- `WhatsNewBand` empty state ("You're all caught up").

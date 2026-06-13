# Phase 2c — The Learn Area

**Date:** 2026-06-13
**Status:** Brainstormed with Tom (this date) — design approved (visual companion). Ready for writing-plans.
**Branch:** `feat/unified-app`
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — Phase 2, sub-phase **2c** (the "Learn" area, §5/§5.1). Builds on **Phase 1** (unified shell + tenant config + naming, shipped/live), **Phase 2a** (one `AppShell` + one `getNav`; anon → top-nav, shipped/live), and **Phase 2b** (teach-then-ask front door + audience personalization, built+verified on branch).

## 1. What this is

Phase 2b built the **ask** half of teach-then-ask (the front door). Phase 2c builds the **teach** half: a structured public **Learn** area that gives "understanding VBE" **one canonical home** and ends today's scatter.

**The problem (from exploration):** VBE-education is fragmented and mis-wired. `/how-it-works` is the *real* framework explainer (Diagnose → Adopt → Embed → Sustain) but isn't prerendered and the **"Learn" nav doesn't point to it**; the **"Learn" nav points to `/learning`** (a lessons/PSHE taster, not concept education); plus `/safeguarding`, `/diagnostic`, `/resources`; and a **route collision** — anon "Learn" → `/learning` vs authed "Learn" → `/learn` (the in-app safeguarding-education + training dispatcher).

This is a **front-end-only** build (no schema, no API, no new server routes) — consistent with 2a/2b. It is **structure/IA only**: existing copy is reused/placed as-is; teaching copy is polished in the **end-of-phase content audit** (Tom's call this session).

## 2. Decisions locked this session

1. **Ambition = Option B (structured Learn section), structure/IA only.** Not a thin link-hub (A); not new authored curriculum (C — collides with the deferred content audit). A real Learn area with a curriculum spine that owns the IA, reusing/placing existing content.
2. **The hub organizes; it does not duplicate page bodies.** `/learn` is a single prerendered page that frames the spine and routes out to the canonical deep pages.
3. **`/learn` is auth-aware (mirrors the shipped `HomeRoute`).** Anon → the new public Learn hub (prerendered); authed → the existing in-app dispatcher, **unchanged**. This gives anyone the teach-half hub while keeping members' lessons/education exactly as today (no regression). Deeper member-Learn integration is Phase 3.
4. **Route/naming resolution (corrected during planning — see note):**
   - `/learn` route → a new `LearnRoute` wrapper: `!isAuthenticated && !isLoading ? <LearnHub/> : <ProtectedRoute component={LearnPage}/>` (the dispatcher).
   - The in-app dispatcher (`LearnPage` in `learn.tsx`) is **unchanged** — reached via the authed branch of `/learn` (plus its existing `/education` + `/training` aliases). The pupil lesson player `/learn/:id`, the staff lesson library `/lessons` (`StaffLessons`), and present-mode `/lessons/present/:id` are all **untouched**.
   - `/learning` (lessons taster) is **kept** as the hub's "Lessons & PSHE" deep link (not 301'd). Anon nav "Learn" + community "What VBE is & why" repoint `/learning` → `/learn`.
   - `/how-it-works` stays as the framework page but is **added to `PUBLIC_ROUTES`** (currently an SEO gap — not prerendered). `/how-it-works/safeguarding` (Sofia) unchanged.

   > **Planning correction (supersedes the originally-approved §4 mechanics):** the original spec assumed `/lessons` was the dispatcher's existing alias and planned to relocate the dispatcher there + rename `learn.tsx` + move the player to `/lessons/:id`. In fact `/lessons` is `StaffLessons` (staff-only), and the dispatcher already has `/education` + `/training` aliases. The auth-aware `LearnRoute` above is strictly lower-risk: **no file rename, no route moves, no nav repoints for authed users**, it reuses the proven `HomeRoute` pattern, and it avoids the pupil/staff regression that relocating the dispatcher would have caused (pupils reach their lessons via the dispatcher at `/learn`).
5. **4-section curriculum spine, teach order** (see §3).
6. **Naming = Option C (Phase 1/2a):** platform brand "Vibes", framework "VBE". No new design language — reuse the established marketing idiom.

## 3. The hub spine — `/learn`

A single page (`src/pages/learn.tsx`, new). Each section is a short framing + a route-out; the hub duplicates no page bodies.

| # | Section | Treatment | Routes to |
|---|---|---|---|
| 1 | **What VBE is** | Short inline framing (the intro; placeholder copy, end-audit) | — |
| 2 | **The framework** | Section card → the real explainer | `/how-it-works` (kept, now prerendered) |
| 3 | **What it improves** | Frames the observed behaviours | `/diagnostic` |
| 4 | **For your role** | Four role cards | `/schools` · `/parents` · `/ptas` · `/pupils` |

Plus a **"Supporting tools"** band linking the kept deep pages: **Diagnostic** (`/diagnostic`) · **Lessons & PSHE** (`/learning`) · **Safeguarding** (`/safeguarding`) · **Free resources** (`/resources`).

**Copy note (end-audit, like 2b §8):** section framing strings are honest placeholders, reused from the existing pages where possible; final teaching copy is dropped in during the complete content audit. The build marks placeholders clearly.

## 4. Components & files

| File | Change | Responsibility |
|---|---|---|
| `src/pages/learn-hub.tsx` | **create (new)** | The public **Learn hub** (`LearnHub`): the 4 spine sections + supporting-tools band, established marketing idiom (mono eyebrow, `font-display` titles, `rounded-2xl border bg-card` cards, `buttonVariants`/`<Link>`). Self-wraps `AppShell`; presentational; routes out only. |
| `src/pages/learn.tsx` | **untouched** | The existing in-app dispatcher (`LearnPage`: pupil → `PupilLearn`; staff → Education + Training tabs) stays exactly as-is. |
| `src/App.tsx` | **modify** | Import `LearnHub`; add a `LearnRoute` function mirroring `HomeRoute` (`!isAuthenticated && !isLoading ? <LearnHub/> : <ProtectedRoute component={LearnPage}/>`); point `<Route path="/learn">` at `LearnRoute`. Nothing else changes — `/learn/:id`, `/lessons`, `/lessons/present/:id`, `/education`, `/training` all unchanged. |
| `src/prerender-entry.tsx` | **modify** | Import `LearnHub` + `HowVbeWorks`; add `/learn` → `LearnHub` and `/how-it-works` → `HowVbeWorks` to `PUBLIC_ROUTES` + `ROUTE_COMPONENTS`. |
| `src/components/layout/nav-config.tsx` | **modify** | Anon `marketingNav` "Learn" href `/learning` → `/learn`; `communityNav` "What VBE is & why" href `/learning` → `/learn`. **Authed role-nav "Learn" entries unchanged** (still `/learn` → now auth-aware → the dispatcher for authed users — identical behaviour to today). |
| `src/components/layout/AppShell.tsx` | **modify** | PublicShell footer item "The learning centre" (`/learning`) → relabel "Learn VBE", href `/learn`. |

The hub's section/card markup may live inline in `learn-hub.tsx` or as a small local component — the plan decides per-component; the firm seams are the new `LearnRoute`, the prerender registration, and the nav/footer href repoints.

## 5. Data flow / SSR-prerender safety

- The Learn hub (`LearnHub`) is **purely presentational links** — no provider-dependent hooks, no `window`/`localStorage` at render → SSR-safe by construction. `AppShell` is already SSR-safe (returns `ANON_AUTH` with no `AuthProvider`, per 2a). The prerender registers `LearnHub` **directly** (not `LearnRoute`), so the prerendered `/learn` HTML is the anon hub — exactly what crawlers + first paint should see. `LearnRoute`'s `useAuth()` branch only runs client-side in the live SPA (mirroring `HomeRoute`, which already prerenders `HomePage` directly the same way).
- `/how-it-works` (`how-vbe-works.tsx`) already renders anon today — registering it in `PUBLIC_ROUTES` just adds prerender + clean per-route SEO HTML; verify it has no render-time browser dependency.
- React HTML-encodes apostrophes to `&#x27;` in prerendered output — grep apostrophe-free substrings.

## 6. Verification

- **Build** (from `artifacts/safeschool/`): `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` runs vite build + prerender clean; all existing public routes still prerender to populated `#root`, **plus** new `/learn` and `/how-it-works`.
  - `grep` the hub section titles in `dist/public/learn/index.html` (What VBE is / framework / improves / role + the supporting-tools labels) and the framework headline in `dist/public/how-it-works/index.html`.
- **Typecheck:** `pnpm typecheck` — no NEW errors referencing changed files (pre-existing api-zod/implicit-any failures ignored, per 2a/2b).
- **In-browser (preview MCP, unified prod server, real DB):**
  - Anon `/learn` renders the 4 sections + supporting-tools band; every route-out link resolves (`/how-it-works`, `/diagnostic`, `/schools`, `/parents`, `/ptas`, `/pupils`, `/learning`, `/safeguarding`, `/resources`); nav "Learn" → `/learn`; zero console errors.
  - `/how-it-works` renders + prerenders clean.
  - **Regression gate (the auth-aware branch is the risk):** **authed `/learn` still shows the dispatcher exactly as before** (pupil → PupilLearn lessons; staff → Education + Training tabs) — the authed nav "Learn" is unchanged; the pupil lesson player `/learn/:id` still opens + tracks progress; staff `/lessons` (`StaffLessons`) and `/lessons/present/:id` untouched; `/learning` taster still renders; **anon `/learn` shows the new public hub**; the 2a/2b chrome + brand intact.
- **No api-server changes** → no new server tests; existing suite stays green.

## 7. Out of scope (later phases / Tom-owned)

- **Final teaching copy** across the Learn area and the pages it routes to — the **complete content audit** at the end of the experience redesign (Tom's sequencing this session).
- **Member "keep learning" surfacing** (pending/approved states see Learn in-context) — Phase 3 (four-state progressive home).
- **In-app lesson-delivery + the dispatcher** — untouched; authed users reach it via the auth-aware branch of `/learn` exactly as today.
- **The unbuilt `/schools/why-vbe`, `/vbe-international`, `/adopt-vbe` deep pages** — "For your role" points at the existing audience pages; the deep sub-pages stay soft-redirected.
- **Standalone marketing-site retirement** — the Tom-run 301 runbook from 2a (Task 6), parallel and non-blocking.

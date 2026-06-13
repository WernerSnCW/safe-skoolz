# Phase 2a — One Shell, One Nav, Retire the Standalone Site

**Date:** 2026-06-13
**Status:** Brainstormed with Tom (this date, visual companion) — design approved; ready for implementation plan.
**Type:** Single-phase implementation spec (the structural spine of Phase 2).
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) §5. Phase 2 is decomposed into **2a (this — shell + nav + retire standalone site)**, 2b (teach-then-ask front door + complete-solution story), 2c (Learn area). Builds on Phase 1 (unified shell foundations + tenant config + state-aware `getNav`), shipped 2026-06-13.
**Branch:** `feat/unified-app`. Frontend: `artifacts/safeschool/src`.

---

## 1. Goal & scope

Collapse today's **two shells** (`PublicLayout` marketing chrome + `AppLayout` authed chrome) into **one `AppShell` with one nav model that spans anon → authed**, finish the Option-C naming cutover on the marketing chrome, and **retire the standalone static site** so there is one canonical surface. This delivers Tom's "one domain, one site, one navigation."

### In scope
- One `AppShell` component with two presentations (top-nav for unauthenticated, sidebar for authenticated), driven by one `getNav` source.
- Extend `getNav`'s **anon branch** to return the real marketing nav items.
- Move `PublicLayout`'s header/footer into the shell's top-nav presentation; **delete `PublicLayout`**.
- Repoint the prerender pipeline at the unified shell so public routes stay crawlable static HTML (no SEO regression).
- Finish the Option-C naming cutover on the marketing **chrome** (brand/nav/footer strings).
- Retire the legacy static deploys (`main.schoolvbe.pages.dev`, `vibez-1k3.pages.dev`) via 301s to the canonical Railway app.

### Explicitly deferred
| Deferred | Phase |
|---|---|
| Teach-then-ask reframe of the landing + complete-solution story | 2b |
| Audience personalization (self-select schools/parents/PTAs tracks) | 2b |
| Restructuring the VBE-education pages into an in-product "Learn" area | 2c |
| Custom domain (`schoolvbe.com` → Railway) | Parallel, Tom-owned |

**Scope guard:** existing marketing page **bodies render as-is** inside the new shell. 2a changes the *chrome and the wiring*, not the page content.

---

## 2. Decisions locked in brainstorm

1. **Shell chrome = adaptive (Option C):** one shell + one nav source; **unauthenticated → top-nav** presentation, **authenticated → sidebar** presentation. Rationale: marketing landings and a feature-dense app have different nav ergonomics; one chrome for both sacrifices one context. "One nav model, two presentations" honours "one site/one nav" with a legitimate reason for the presentation split.
2. **Presentation switch rule:** `isAuthenticated` → sidebar; else → top-nav. Applies to **both** anon contexts (generic bare-domain marketing *and* tenant-scoped `/s/:slug`).
3. **Bare domain = platform marketing landing** ("Vibes for VBE" — audience entries); `/s/:slug` = tenant-scoped "{School} Vibes" front door. Brand slot: "Vibes" generic / "{School} Vibes" when a tenant resolves.
4. **2a is structural only** — content reframe + personalization + Learn are 2b/2c.
5. **One canonical surface = the Railway unified app.** 301-redirect the legacy Pages deploys to it now; custom domain is a parallel Tom task, non-blocking.

---

## 3. The unified shell

### 3.1 `AppShell` component
Create `artifacts/safeschool/src/components/layout/AppShell.tsx` as the single shell. It:
- Reads `useAuth()` (`{ user, isAuthenticated }`) and `useTenant()` (`{ tenant }`).
- Computes `membershipState = getMembershipState(user)` and the nav via `getNav({ membershipState, role, capabilities, displayName, slug, t, counts })` (Phase-1 helper).
- **If `isAuthenticated`:** renders the **sidebar presentation** — the current `AppLayout` body (sidebar with `BrandLockup`, `GlobalLauncher`, grouped `getNav` sections, footer items, user card; mobile header + bottom-nav). This is a near-verbatim lift of today's `AppLayout`.
- **Else:** renders the **top-nav presentation** — a horizontal header (brand + top-level nav items + Log in / Join) and the marketing footer. This is `PublicLayout`'s markup, restyled to consume `getNav`'s anon items instead of its hardcoded `NAV`/`FOOTER` arrays.
- Brand: `BrandLockup` (already tenant-driven from Phase 1) — shows "Vibes" when no tenant, "{School} Vibes" when resolved.

`AppLayout` is absorbed into `AppShell`'s authed branch; `PublicLayout` is absorbed into the anon branch and **deleted**.

### 3.2 One nav source — extend `getNav` for anon
`nav-config.tsx` `getNav` currently dispatches `parent|pta → communityNav`, else `getRoleNavSections`. Add an explicit **anon branch** (when `membershipState === "anon"`) returning the marketing nav:

- **Top-level items** (the top-nav renders these): How it works (`/how-it-works`) · For schools (`/schools`) · For parents (`/parents`) · For PTAs (`/ptas`) · For pupils (`/pupils`) · Learn (`/learning`) · Diagnostic (`/diagnostic`).
- **Actions** (right side of top-nav): Log in (`/login`) · Find your school (`/find-school`). When a tenant is resolved (`/s/:slug`), add Join (`/s/${slug}` or the join action) — minimal in 2a; the front-door content is 2b.
- Returned in the same `{ sections, footer }` shape so the top-nav presentation can flatten `sections[].items` into a horizontal bar and the footer mirrors today's marketing footer (links sourced here, not hardcoded in a deleted `PublicLayout`).

The hrefs above are the **existing** routes (verified present); 2a does not add or restructure marketing pages.

### 3.3 Routing (`App.tsx`)
- `AppShell` becomes the wrapper for **both** public and protected routes. Public pages currently self-wrap `PublicLayout`; migrate them to render bare content wrapped by `AppShell` at the route level (or a thin `<PublicRoute>` helper that wraps in `AppShell`), mirroring how `ProtectedRoute` wraps authed pages in the shell. `ProtectedRoute` renders `<AppShell>` (authed → sidebar) instead of `<AppLayout>`.
- `HomeRoute` unchanged in intent: anon `/` → the marketing landing (home page) in `AppShell` top-nav; authed `/` → Dashboard in `AppShell` sidebar.
- No route paths change in 2a.

---

## 4. SEO / prerender preservation (the one real constraint)

The prerender pipeline (`prerender-entry.tsx` `PUBLIC_ROUTES` + `ROUTE_COMPONENTS`, driven by `prerender.mjs` via `renderRoute` → `renderToString`) must keep emitting crawlable static HTML for the 16 public routes.

- The prerender renders each public route through **`AppShell` in its unauthenticated/top-nav presentation** (SSR has no token → `isAuthenticated` is false → top-nav branch). `AppShell` must be **SSR-safe** in the anon branch (no `window`/auth-only calls at render) — `PublicLayout` already meets this bar; preserve it.
- `prerender-entry.tsx` is updated so `renderRoute` wraps the page component in `AppShell` (replacing the implicit `PublicLayout` wrap). `PUBLIC_ROUTES` list is unchanged.
- **Acceptance:** every prerendered route still produces populated `<div id="root">…</div>` static HTML with the marketing chrome; `pnpm build` completes all 16 prerenders.

---

## 5. Naming cutover — finish Option C on the marketing chrome

Phase 1 left `PublicLayout` saying "SchoolVBE"/"vibez". In the absorbed top-nav presentation:
- Brand → `BrandLockup` ("Vibes" / "{School} Vibes").
- "Try vibez" CTA → "Log in" (or "Join" where appropriate); "Log in to vibez" footer link → "Log in".
- Footer "© SchoolVBE" / "SchoolVBE" headings → "Vibes" / "Vibes — software for VBE" endorsement.
- Marketing page **body** copy (still says SchoolVBE/vibez in places) is **2b** — only the chrome strings here.

---

## 6. Retire the standalone site → one canonical surface

- The Railway unified app (`safe-skoolz-production.up.railway.app`, custom domain later) is the single canonical surface.
- **301-redirect** `main.schoolvbe.pages.dev` and `vibez-1k3.pages.dev` to the canonical app (Cloudflare Pages redirect rules / a `_redirects` `/* https://<canonical>/:splat 301`), then decommission the projects. This preserves inbound links and consolidates SEO.
- **Tom-run step:** the Cloudflare/wrangler redirect config + project decommission (as with prior CF deploys — I can't deploy headlessly). The app code needs no change for this; document the exact redirect rule in the plan.

---

## 7. Testing & verification

No frontend test runner (per Phase 1) — server logic is unaffected; verify via build + in-browser (the established pattern).
- **Build + prerender:** `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build` completes; all 16 prerender routes emit populated static HTML (grep the prerendered `/schools/index.html` etc. for hero content + the new "Vibes" chrome).
- **In-browser (preview MCP `vibez`):**
  - Anon `/`, `/schools`, `/parents` → **top-nav** chrome, brand "Vibes", marketing body renders, no console errors.
  - `/s/morna` (anon) → top-nav, brand "Morna Vibes".
  - Log in (pta / parent) → **sidebar** chrome, brand "{School} Vibes", grouped nav intact (Phase-1 regression).
  - The anon→authed transition (log in from the top-nav shell) lands in the sidebar shell with no flash/broken state.
- **SEO check:** `curl` a public route on the running prod-mode server → returns populated static HTML (not an empty SPA shell).
- **Regression:** authed sidebar nav (all four states + staff roles) unchanged from Phase 1.

---

## 8. Open items for the implementation plan

1. The exact migration mechanic for public pages off `PublicLayout` (route-level `AppShell` wrap + strip the self-wrap, vs a `<PublicRoute>` helper). Plan picks one and applies it consistently.
2. How the top-nav presentation renders `getNav`'s grouped `sections` (flatten top-level items into the bar; whether any go into an overflow / "More" menu given 7 marketing items).
3. Mobile presentation of the top-nav (the existing `PublicLayout` mobile dropdown vs a new pattern) — keep it simple, reuse the existing dropdown markup.
4. The precise canonical redirect rule + decommission steps for the two CF Pages projects (Tom runs; plan documents verbatim).

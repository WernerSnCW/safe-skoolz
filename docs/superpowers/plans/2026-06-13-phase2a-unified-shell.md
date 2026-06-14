# Phase 2a — Unified Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two shells (`PublicLayout` + `AppLayout`) into one `AppShell` that presents as a top-nav for unauthenticated visitors and a sidebar for the authed app, driven by one `getNav` source — finishing the Option-C naming on the marketing chrome and retiring the standalone static site.

**Architecture:** A single `AppShell` reads `useAuth`/`useTenant`; `isAuthenticated` → sidebar presentation (today's `AppLayout` body), else → top-nav presentation (today's `PublicLayout` markup, fed by a new `getNav` anon branch). Public pages stop self-wrapping `PublicLayout` and wrap `AppShell` instead; `ProtectedRoute` wraps `AppShell` instead of `AppLayout`; both old shells are deleted. The prerenderer renders `AppShell`'s unauthenticated branch, so the public routes stay crawlable static HTML — which requires `useAuth` to be SSR/no-provider safe (Task 1).

**Tech Stack:** React 19, wouter, TanStack Query, Tailwind v4, custom `renderToString` prerender (`prerender.mjs` + `prerender-entry.tsx`). No frontend test runner — verification is build + prerender + in-browser (preview MCP), the established pattern.

**Spec:** `docs/superpowers/specs/2026-06-13-phase2a-unified-shell-design.md`

**Build/verify commands (used throughout):**
- Frontend build + prerender: `cd /Users/thomasking/dev/safe-skoolz && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build`
- In-browser: preview MCP `vibez` config (`:8080`, runs the unified prod server). Login: `pta.chair@safeschool.dev` / `password123` (exec); a parent account for member states.

---

## File Structure

**Create:**
- `artifacts/safeschool/src/components/layout/AppShell.tsx` — the one shell (top-nav + sidebar presentations).

**Modify:**
- `artifacts/safeschool/src/hooks/use-auth.tsx` — make `useAuth()` return anon-safe defaults outside a provider (SSR).
- `artifacts/safeschool/src/components/layout/nav-config.tsx` — add the `getNav` anon branch (`marketingNav`).
- `artifacts/safeschool/src/App.tsx` — `ProtectedRoute` wraps `AppShell`; (pages migrate per Task 4).
- ~19 public page components in `src/pages/*.tsx` — swap `PublicLayout` → `AppShell`.

**Delete (after migration):**
- `artifacts/safeschool/src/components/layout/PublicLayout.tsx`
- `artifacts/safeschool/src/components/layout/AppLayout.tsx`

---

## Task 1: Make `useAuth` SSR / no-provider safe

**Why first:** the prerenderer renders pages with no `AuthProvider` in the tree. Once `AppShell` (which calls `useAuth`) wraps those pages, prerender will crash unless `useAuth` returns safe defaults without a provider.

**Files:**
- Modify: `artifacts/safeschool/src/hooks/use-auth.tsx`

- [ ] **Step 1: Read the current `useAuth`**

Run: `grep -n "export function useAuth\|useContext(AuthContext)\|throw" artifacts/safeschool/src/hooks/use-auth.tsx`
Confirm how `useAuth` resolves context today (it likely does `const ctx = useContext(AuthContext)` and either returns it or throws when undefined). `AuthContext` is `createContext<AuthContextType | undefined>(undefined)`.

- [ ] **Step 2: Return anon-safe defaults when no provider**

Change `useAuth` so that when the context is `undefined` (no provider — i.e. SSR/prerender), it returns a stable anon value instead of throwing:

```tsx
const ANON_AUTH: AuthContextType = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  logout: () => {},
  setToken: () => {},
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  return ctx ?? ANON_AUTH;
}
```

(If `useAuth` currently throws on missing context, replace that throw with the `?? ANON_AUTH` return. Keep the type `AuthContextType`.)

- [ ] **Step 3: Verify the build/prerender still works (nothing consumes the new path yet, but confirm no type break)**

Run: `cd /Users/thomasking/dev/safe-skoolz && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build 2>&1 | tail -6`
Expected: build succeeds, 16 prerender routes (unchanged from today).

- [ ] **Step 4: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/hooks/use-auth.tsx
git commit -m "feat(web): make useAuth SSR/no-provider safe (anon defaults)"
```

---

## Task 2: Add the `getNav` anon branch (marketing nav)

**Files:**
- Modify: `artifacts/safeschool/src/components/layout/nav-config.tsx`

- [ ] **Step 1: Add a `marketingNav` builder + dispatch it for anon**

In `nav-config.tsx`, ensure these icons are imported (add any missing to the existing lucide import): `HelpCircle, School, Users, Heart, GraduationCap, BookOpen, Gauge, LogIn, Search`. Then add the builder above `getNav`:

```ts
// The anonymous (marketing) nav — top-level audience + tool entries for the
// top-nav presentation, plus right-side actions. All hrefs are existing routes.
// The big multi-column marketing footer lives in AppShell (lifted from
// PublicLayout); getNav only supplies the bar items + actions here.
function marketingNav(
  displayName: string,
  slug: string,
): { sections: NavSection[]; footer: NavItem[] } {
  const items: NavItem[] = [
    { name: "How it works", href: "/how-it-works", icon: HelpCircle, state: "live" },
    { name: "For schools", href: "/schools", icon: School, state: "live" },
    { name: "For parents", href: "/parents", icon: Users, state: "live" },
    { name: "For PTAs", href: "/ptas", icon: Heart, state: "live" },
    { name: "For pupils", href: "/pupils", icon: GraduationCap, state: "live" },
    { name: "Learn", href: "/learning", icon: BookOpen, state: "live" },
    { name: "Diagnostic", href: "/diagnostic", icon: Gauge, state: "live" },
  ];
  const footer: NavItem[] = [
    { name: "Find your school", href: "/find-school", icon: Search, state: "live" },
    { name: "Log in", href: "/login", icon: LogIn, state: "live" },
  ];
  // When a tenant is resolved (/s/:slug), the front-door "Join" action leads.
  if (slug) {
    footer.unshift({ name: "Join", href: `/s/${slug}`, icon: LogIn, state: "live" });
  }
  return { sections: [{ label: null, items }], footer };
}
```

- [ ] **Step 2: Dispatch it from `getNav`**

In `getNav`, add the anon branch as the FIRST check (before the `parent|pta` check):

```ts
  if (membershipState === "anon") {
    return marketingNav(displayName, slug);
  }
```

- [ ] **Step 3: Build to confirm no type break**

Run: `cd /Users/thomasking/dev/safe-skoolz && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build 2>&1 | tail -6`
Expected: build succeeds (nothing renders the anon nav yet; this just confirms types).

- [ ] **Step 4: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/components/layout/nav-config.tsx
git commit -m "feat(web): getNav anon branch (marketing nav items)"
```

---

## Task 3: Create `AppShell` (two presentations + Option-C naming)

**Files:**
- Create: `artifacts/safeschool/src/components/layout/AppShell.tsx`
- Read (to lift): `artifacts/safeschool/src/components/layout/AppLayout.tsx`, `artifacts/safeschool/src/components/layout/PublicLayout.tsx`

**Approach:** `AppShell` is a faithful merge of the two existing shells — do NOT invent new chrome. Lift each shell's render body into a branch.

- [ ] **Step 1: Read both shells fully**

Run: `sed -n '1,250p' artifacts/safeschool/src/components/layout/AppLayout.tsx` and `sed -n '1,180p' artifacts/safeschool/src/components/layout/PublicLayout.tsx`. Note: AppLayout's imports (useAuth, useTenant, getMembershipState, getNav, BrandLockup, GlobalLauncher, flattenSections, icons), its sidebar + mobile-header + bottom-nav markup, and the locked/soon `NavRow` branch from Phase 1. Note PublicLayout's header (brand, NAV bar, mobile dropdown), `MOBILE_TOOLS`, and the multi-column `FOOTER`.

- [ ] **Step 2: Author `AppShell.tsx`**

Structure:

```tsx
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";
import { getNav, flattenSections, type NavItem } from "@/components/layout/nav-config";
import { BrandLockup } from "@/components/brand/BrandLockup";
// ...the rest of AppLayout's imports (GlobalLauncher, icons, useTranslation, notification hooks, wouter Link/useLocation, framer if used) and PublicLayout's imports (Link, icons).

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AuthedShell>{children}</AuthedShell>;   // sidebar presentation
  }
  return <PublicShell>{children}</PublicShell>;      // top-nav presentation
}
```

- **`AuthedShell`** = the **current `AppLayout` component body verbatim** (it already computes `useTenant`, `getMembershipState(user)`, `getNav({...})`, renders the sidebar + grouped sections + locked/soon `NavRow` + mobile header + bottom-nav + user card). Move it into `AppShell.tsx` as an internal component. Keep every class, the GlobalLauncher, the mobile filter (`flattenSections(sections).filter(i => i.state !== "soon" && i.state !== "locked")`), and the user/logout card unchanged. (It already returns `<>{children}</>` when `!user`; inside `AuthedShell` that guard is redundant but harmless — keep behaviour identical.)
- **`PublicShell`** = the **current `PublicLayout` body**, with two changes:
  1. **Source the nav from `getNav` anon items** instead of the hardcoded `NAV`/`MOBILE_TOOLS` arrays: `const { tenant } = useTenant(); const { sections, footer } = getNav({ membershipState: "anon", role: "", capabilities: {} as any, displayName: tenant?.displayName ?? "", slug: tenant?.slug ?? "", t: ((k)=>k) as any, counts: { messageUnread: 0, unreadCount: 0 } });` — render the top bar from `sections[0].items` and the right-side actions from `footer`. (The multi-column marketing footer stays as lifted static markup — see step 3.)
  2. **Option-C naming** (step 3).

- [ ] **Step 3: Finish Option-C naming inside `PublicShell`**

In the lifted `PublicShell` markup:
- Replace the hardcoded "SchoolVBE" brand wordmark in the header with `<BrandLockup size="md" />` (renders "Vibes" / "{School} Vibes").
- Replace the "Try vibez" CTA with "Log in" (href `/login`) — or "Join" when `tenant?.slug` is set.
- Replace the footer "Log in to vibez" → "Log in"; footer "© … SchoolVBE" / any "SchoolVBE" heading text → "Vibes" / "Vibes — software for VBE".
- Leave the marketing **page bodies** untouched (2b).

- [ ] **Step 4: Build (still not wired into routes; confirm AppShell compiles + is SSR-safe by itself)**

Run the build. Expected: succeeds. (AppShell isn't rendered yet; this just type-checks it.)

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/components/layout/AppShell.tsx
git commit -m "feat(web): AppShell — merge AppLayout (sidebar) + PublicLayout (top-nav), one nav source, Option-C naming"
```

---

## Task 4: Migrate routes + pages to `AppShell`; delete the old shells

**Files:**
- Modify: `artifacts/safeschool/src/App.tsx` (ProtectedRoute) + ~19 `src/pages/*.tsx`
- Delete: `PublicLayout.tsx`, `AppLayout.tsx`

- [ ] **Step 1: Point `ProtectedRoute` at `AppShell`**

In `App.tsx`, replace the `import { AppLayout }` with `import { AppShell }`, and in `ProtectedRoute` change `<AppLayout>...</AppLayout>` (both the access-denied and the normal render, ~lines 114 & 124) to `<AppShell>...</AppShell>`.

- [ ] **Step 2: Swap `PublicLayout` → `AppShell` in every public page**

These pages self-wrap `PublicLayout`. Replace the import and the JSX tag in each. Run this to list them, then edit each:

```bash
cd /Users/thomasking/dev/safe-skoolz/artifacts/safeschool/src
grep -rl "PublicLayout" pages
```

For each file: change `import { PublicLayout } from "@/components/layout/PublicLayout";` → `import { AppShell } from "@/components/layout/AppShell";`, and `<PublicLayout>` / `</PublicLayout>` → `<AppShell>` / `</AppShell>`. (A scripted replace is fine: `grep -rl PublicLayout pages | xargs sed -i '' -e 's#@/components/layout/PublicLayout#@/components/layout/AppShell#g' -e 's/PublicLayout/AppShell/g'` — then eyeball the diff.)

- [ ] **Step 3: Confirm no references remain, then delete the old shells**

```bash
cd /Users/thomasking/dev/safe-skoolz/artifacts/safeschool/src
grep -rn "PublicLayout" . ; echo "should be empty"
grep -rn "AppLayout" . | grep -v "AppShell" ; echo "should be empty (AppLayout only referenced as the lifted internal, if you named it differently)"
rm components/layout/PublicLayout.tsx components/layout/AppLayout.tsx
```
(If `AppLayout` is still referenced anywhere other than the lifted code inside `AppShell.tsx`, fix those first.)

- [ ] **Step 4: Update the prerender entry if it imports PublicLayout (it likely doesn't — pages self-wrap)**

Run: `grep -n "PublicLayout\|AppLayout\|AppShell" artifacts/safeschool/src/prerender-entry.tsx`. The `ROUTE_COMPONENTS` reference the page components (which now self-wrap `AppShell`), so `renderRoute` needs no change. If it imports either old shell directly, repoint to `AppShell`.

- [ ] **Step 5: Build + prerender (the SEO gate)**

Run the full build. Expected: succeeds; **all 16 prerender routes complete**. Then confirm a prerendered public route has populated, chrome-bearing HTML:

```bash
cd /Users/thomasking/dev/safe-skoolz
grep -o 'id="root"><[^<]*' artifacts/safeschool/dist/public/schools/index.html | head
grep -c "Vibes" artifacts/safeschool/dist/public/schools/index.html   # >0 (new brand in chrome)
grep -c "SchoolVBE" artifacts/safeschool/dist/public/schools/index.html  # 0 in chrome (body copy may still have it — that's 2b)
```
Expected: `#root` is populated (not empty), the new "Vibes" chrome present. If `#root` is empty, AppShell crashed during SSR — revisit Task 1 (useAuth must return anon defaults) and ensure `PublicShell` calls nothing window/auth-only at render.

- [ ] **Step 6: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add -A artifacts/safeschool/src
git commit -m "feat(web): migrate all routes to AppShell; delete PublicLayout + AppLayout"
```

---

## Task 5: In-browser verification (anon top-nav / authed sidebar / transition)

**Files:** none (verification + any fixes)

- [ ] **Step 1: Build api-server + run the unified prod server**

```bash
cd /Users/thomasking/dev/safe-skoolz/artifacts/api-server && pnpm build
```
Then start via the preview MCP `vibez` config (`:8080`) — it serves `dist/public` (the fresh build) + `/api`.

- [ ] **Step 2: Verify each context (preview MCP)**

- Anon `/` → **top-nav** chrome, brand "Vibes", marketing home body renders, footer shows "Vibes" not "SchoolVBE", no console errors.
- Anon `/schools`, `/parents`, `/ptas` → top-nav, marketing bodies render.
- Anon `/s/morna` → top-nav, brand "Morna Vibes", a "Join" action present.
- Log in as `pta.chair@safeschool.dev` / `password123` → **sidebar** chrome, brand "{School} Vibes", the Phase-1 grouped nav intact (Learn/Picture/Community/PTA, locked/soon as applicable). This is the Phase-1 regression gate.
- The anon→authed transition: log in from the top-nav shell → lands in the sidebar shell, no flash/broken state.
- `preview_console_logs level=error` → empty on each.

- [ ] **Step 3: SEO curl check (served static HTML)**

```bash
/usr/bin/curl -s http://localhost:8080/schools | grep -c "id=\"root\"><" ; echo "root should be populated"
```
Expected: the served `/schools` HTML has a populated `#root` (prerendered), not an empty SPA shell.

- [ ] **Step 4: Commit any fixes**

```bash
cd /Users/thomasking/dev/safe-skoolz && git add -A && git commit -m "fix(web): AppShell verification fixes" # only if fixes were needed
```

---

## Task 6: Standalone-site retirement runbook (Tom-run; document only)

**Files:** none (this is an ops runbook, executed by Tom — the app needs no code change).

- [ ] **Step 1: Write the retirement steps into the PR/handover**

Document verbatim for Tom to run (he owns Cloudflare/wrangler):

1. **Pick the canonical surface:** the Railway unified app (`https://safe-skoolz-production.up.railway.app` today; custom domain later — parallel task).
2. **`main.schoolvbe.pages.dev`** (project that serves the legacy SchoolVBE static site) and **`vibez-1k3.pages.dev`** (project `vibez`): add a catch-all 301 to the canonical app. For a Pages project, deploy a `_redirects` containing:
   ```
   /*  https://safe-skoolz-production.up.railway.app/:splat  301
   ```
   (Replace the target with the custom domain once it's live.) Re-deploy each project with only that `_redirects` (and a minimal `index.html`), or use the Cloudflare dashboard **Bulk Redirects** / a Pages redirect rule.
3. **Verify:** `curl -sI https://main.schoolvbe.pages.dev/schools` returns `301` with `location:` pointing at the canonical app.
4. **Decommission** (optional, after redirects confirmed): delete or archive the two Pages projects so they're no longer separately indexed.

- [ ] **Step 2: No commit** (documentation lives in the PR body / handover; nothing in the repo to commit for this task unless you add a `docs/` runbook note — optional).

---

## Self-Review (author)

- **Spec coverage:** §3 unified shell → Tasks 2 (anon nav), 3 (AppShell), 4 (migrate/delete); §4 SEO/prerender → Tasks 1 (SSR-safe useAuth) + 4 Step 5 + 5 Step 3; §5 naming → Task 3 Step 3; §6 retirement → Task 6; §7 testing → Tasks 4–5. All covered.
- **Open items (spec §8):** (1) migration mechanic = per-page `PublicLayout`→`AppShell` swap + `ProtectedRoute` swap (Task 4) — chosen because pages self-wrap today, lowest churn, prerender-safe. (2) top-nav renders `sections[0].items` flattened into a bar (Task 2/3); a "More" overflow is a styling detail left to Task 3's lift (7 items fit a standard bar; collapse to the existing mobile dropdown under `md`). (3) mobile top-nav = reuse PublicLayout's existing mobile dropdown markup (Task 3 lift). (4) retirement rule documented verbatim (Task 6).
- **Placeholder scan:** no TBDs; the AppShell body is a described faithful lift of two existing files (their full source isn't pasted because the implementer reads + moves it — the structure, nav-sourcing change, and naming edits are specified concretely).
- **Type consistency:** `getNav` signature unchanged (anon branch added inside); `marketingNav` returns the same `{sections, footer}` shape; `AppShell({children})` consumed identically by pages and `ProtectedRoute`; `useAuth` returns `AuthContextType` in all paths.
- **Regression guard:** `AuthedShell` is AppLayout verbatim → Phase-1 sidebar nav (all states + staff roles) unchanged; the mobile live-items filter preserved.

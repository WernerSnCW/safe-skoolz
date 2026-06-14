# Phase 2c — The Learn Area — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public "Learn VBE" hub at `/learn` — the teach half of teach-then-ask — that organises the VBE-education spine (framework · what it improves · for your role) and routes out to the canonical deep pages, while keeping the existing in-app learning dispatcher untouched.

**Architecture:** Front-end only (no schema / API / server routes). A new presentational `LearnHub` page is registered as a prerendered public route; `/learn` becomes auth-aware via a `LearnRoute` wrapper that mirrors the shipped `HomeRoute` (anon → `LearnHub`, authed → the existing `LearnPage` dispatcher). The framework page `/how-it-works` is added to the prerender set (it was an SEO gap). Nav + footer "Learn" links repoint to `/learn`. The hub duplicates no page bodies — it links out.

**Tech Stack:** React 19 + Vite + wouter + TanStack Query; Tailwind with HSL CSS-var tokens; custom `renderToString` prerender (`prerender.mjs` + `prerender-entry.tsx`). Spec: [`docs/superpowers/specs/2026-06-13-phase2c-learn-design.md`](../specs/2026-06-13-phase2c-learn-design.md).

---

## Context the engineer must know

- **All paths below are relative to `artifacts/safeschool/`.** Work on branch `feat/unified-app`.
- **No frontend test framework exists** (no vitest in this package). "Verification" = TypeScript typecheck + a production build that runs the prerender + grepping the prerendered HTML + (orchestrator-run) in-browser preview MCP. Do **not** add a test runner.
- **`pnpm typecheck` has PRE-EXISTING failures** in this repo (generated `api-zod` duplicate re-exports, some implicit-any pages, lib build order) that are NOT yours. Verification rule: run typecheck and confirm **no new errors reference the files you created/modified**. Ignore the known pre-existing ones.
- **Production build command** (run from `artifacts/safeschool/`): `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` — runs `vite build` then `node prerender.mjs`, writing `dist/public/<route>/index.html`. **`pnpm build` wipes `dist/public`.**
- **Prerender renders pages with NO provider tree** — just `<Router ssrPath={route}><Page/></Router>` (see `src/prerender-entry.tsx`). So any page registered for prerender MUST be SSR-safe: no `window`/`localStorage`/`document` at render, no provider-dependent hooks. `LearnHub` is pure presentational markup; `HowVbeWorks` is already SSR-safe (only imports `AppShell`).
- **`/learn` is auth-aware via a Router wrapper, but prerender registers the anon component directly.** This mirrors `HomeRoute`: the live SPA route uses `LearnRoute` (which calls `useAuth()`), but `prerender-entry.tsx` maps `/learn → LearnHub` directly, so the prerendered HTML is the anon hub. `LearnRoute`'s `useAuth()` only runs client-side. `main.tsx` uses `createRoot` (not `hydrateRoot`), so there is no hydration-mismatch risk.
- **React HTML-encodes apostrophes** to `&#x27;` in prerendered output. When grepping prerendered HTML, grep for apostrophe-free substrings (the grep strings below are all apostrophe-free).
- **Pages self-wrap `AppShell`** (Phase 2a). The anon path renders `AppShell` → `PublicShell` (top-nav marketing chrome). Keep that wrapping.
- **Design idiom** (reuse, do not invent): mono eyebrow (`text-sm font-semibold uppercase tracking-[0.2em] text-primary`), `font-display` titles, `rounded-2xl border border-border bg-card` cards, `h-12 w-12 rounded-xl bg-accent text-accent-foreground` icon tiles, `buttonVariants({ size, variant })` for CTAs, lucide icons. `cn` is at `@/lib/utils`.
- **lucide's `Route` icon collides with wouter's `Route`** — `LearnHub` imports it as `Route as RouteIcon` (it imports only `Link` from wouter, but the alias keeps it unambiguous).

## File structure (what gets created / modified)

| File | Responsibility |
|---|---|
| `src/pages/learn-hub.tsx` **(create)** | The public `LearnHub` page — hero + "what VBE is" framing + the 3-card spine + the supporting-tools band. Presentational, SSR-safe, self-wraps `AppShell`. |
| `src/App.tsx` **(modify)** | Import `LearnHub`; add a `LearnRoute` function (mirrors `HomeRoute`); point `<Route path="/learn">` at it. Nothing else changes. |
| `src/prerender-entry.tsx` **(modify)** | Register `/learn → LearnHub` and `/how-it-works → HowVbeWorks` in `PUBLIC_ROUTES` + `ROUTE_COMPONENTS`. |
| `src/components/layout/nav-config.tsx` **(modify)** | Anon `marketingNav` "Learn" and community "What VBE is & why" hrefs `/learning → /learn`. |
| `src/components/layout/AppShell.tsx` **(modify)** | PublicShell footer "The learning centre" (`/learning`) → "Learn VBE" (`/learn`). |

`learn.tsx` (the `LearnPage` dispatcher), `/learn/:id`, `/lessons`, `/lessons/present/:id`, `/education`, `/training`, and `/learning` (the taster) are **untouched**.

---

### Task 1: Create the `LearnHub` page

**Files:**
- Create: `src/pages/learn-hub.tsx`

- [ ] **Step 1: Create the hub page**

Create `src/pages/learn-hub.tsx` with exactly:

```tsx
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Route as RouteIcon, Activity, Users, ClipboardCheck, BookOpen, ShieldCheck, FolderOpen, ArrowRight,
} from "lucide-react";

// Phase 2c: the public "Learn VBE" hub — the teach half of teach-then-ask.
// Organises the VBE-education spine and routes out to the canonical deep pages;
// it duplicates no page bodies. Presentational / SSR-safe (prerenders for SEO).
// Anon visitors land here at /learn; authed users get the in-app dispatcher via
// LearnRoute (App.tsx). Copy is honest placeholder — final wording lands in the
// end-of-phase content audit (spec §1).

const SPINE: {
  icon: typeof RouteIcon;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
}[] = [
  {
    icon: RouteIcon,
    eyebrow: "The framework",
    title: "How a school adopts VBE",
    body: "Diagnose, Adopt, Embed, Sustain — the end-to-end journey, and what Vibes does at each step.",
    cta: { label: "See the framework", href: "/how-it-works" },
  },
  {
    icon: Activity,
    eyebrow: "What it improves",
    title: "The behaviours VBE works on",
    body: "VBE focuses on how children treat each other and how the school responds when they fall short. The readiness diagnostic measures exactly those patterns.",
    cta: { label: "Run the diagnostic", href: "/diagnostic" },
  },
  {
    icon: Users,
    eyebrow: "For your role",
    title: "What VBE means for you",
    body: "Schools, parents, PTAs and pupils each have a part to play. See how values-based education works for your role.",
    cta: { label: "Explore by who you are", href: "/schools" },
  },
];

const TOOLS: { icon: typeof RouteIcon; title: string; body: string; href: string }[] = [
  { icon: ClipboardCheck, title: "Readiness diagnostic", body: "A free, no-login self-assessment of where your community stands.", href: "/diagnostic" },
  { icon: BookOpen, title: "Lessons & PSHE", body: "The values-based lessons and ready-to-teach materials.", href: "/learning" },
  { icon: ShieldCheck, title: "Safeguarding & reporting", body: "How every voice gets a safe, structured way to be heard.", href: "/safeguarding" },
  { icon: FolderOpen, title: "Free resources", body: "The VBE Adoption Pack, operating structure, and more.", href: "/resources" },
];

export default function LearnHub() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Learn VBE</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Understand values-based education
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          What VBE is, how a school adopts it, and what it changes — so you can decide for your community. Free, no sign-in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/how-it-works" className={cn(buttonVariants({ size: "lg" }))}>
            See how it works
          </Link>
          <Link href="/diagnostic" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Run the diagnostic
          </Link>
        </div>
      </section>

      {/* What VBE is — inline framing */}
      <section className="mx-auto max-w-3xl px-4 pb-4 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <p className="text-lg text-foreground">
            Values-based education makes a school&apos;s values something children live every day — not a poster on the wall.
            It works on how children treat each other, and how the adults respond. Vibes is the software that makes it run.
          </p>
        </div>
      </section>

      {/* The spine */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {SPINE.map((s) => (
            <div key={s.title} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{s.eyebrow}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{s.title}</h2>
              <p className="mt-2 flex-1 text-muted-foreground">{s.body}</p>
              <Link href={s.cta.href} className="mt-4 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                {s.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Supporting tools */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Supporting tools</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Everything, in one place</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <tool.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{tool.title}</h3>
              <p className="mt-2 text-muted-foreground">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify typecheck (no new errors)**

Run from `artifacts/safeschool/`:
```bash
pnpm typecheck 2>&1 | grep -E "learn-hub" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/learn-hub.tsx
git commit -m "feat(2c): add public LearnHub page"
```

---

### Task 2: Make `/learn` auth-aware via `LearnRoute`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import `LearnHub`**

In `src/App.tsx`, add near the other page imports (the dispatcher import `import LearnPage from "@/pages/learn";` is at line 48):

```tsx
import LearnHub from "@/pages/learn-hub";
```

- [ ] **Step 2: Add the `LearnRoute` wrapper**

`HomeRoute` is defined at `src/App.tsx:137-143`. Add `LearnRoute` immediately after it (it uses the same in-scope `useAuth` and `ProtectedRoute`):

```tsx
// /learn is auth-aware, mirroring HomeRoute: anonymous visitors get the public
// Learn hub (prerendered to static HTML for SEO); authenticated users get the
// in-app learning dispatcher exactly as before. use-auth reports isLoading=false
// immediately with no token, so the anon render is synchronous and matches the
// prerendered markup.
function LearnRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (!isAuthenticated && !isLoading) {
    return <LearnHub />;
  }
  return <ProtectedRoute component={LearnPage} />;
}
```

- [ ] **Step 3: Point the `/learn` route at `LearnRoute`**

In the `Router` `<Switch>`, replace the existing `/learn` route (currently at `src/App.tsx:225-227`):

```tsx
      <Route path="/learn">
        {() => <ProtectedRoute component={LearnPage} />}
      </Route>
```

with:

```tsx
      <Route path="/learn">
        {() => <LearnRoute />}
      </Route>
```

Leave `/learn/:id`, `/lessons`, `/lessons/present/:id`, `/education`, `/training` exactly as they are.

- [ ] **Step 4: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "App.tsx" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(2c): make /learn auth-aware (anon hub, authed dispatcher)"
```

---

### Task 3: Register `/learn` + `/how-it-works` for prerender

**Files:**
- Modify: `src/prerender-entry.tsx`

- [ ] **Step 1: Add the imports**

In `src/prerender-entry.tsx`, add after the existing page imports (the last is `import SchoolsCaseStudy from "@/pages/schools-case-study";` at line 19):

```tsx
import LearnHub from "@/pages/learn-hub";
import HowVbeWorks from "@/pages/how-vbe-works";
```

- [ ] **Step 2: Add both routes to `PUBLIC_ROUTES`**

Add `"/learn"` and `"/how-it-works"` to the `PUBLIC_ROUTES` array (e.g. right after `"/learning",`):

```tsx
  "/learning",
  "/learn",
  "/how-it-works",
```

- [ ] **Step 3: Add both to `ROUTE_COMPONENTS`**

Add the two mappings to the `ROUTE_COMPONENTS` record (e.g. after `"/learning": LearningPage,`):

```tsx
  "/learning": LearningPage,
  "/learn": LearnHub,
  "/how-it-works": HowVbeWorks,
```

(Note: `/learn` maps to `LearnHub` — the anon component — NOT `LearnRoute`. The prerender path has no auth, so the static HTML is the anon hub, exactly as `/` prerenders `HomePage`.)

- [ ] **Step 4: Build + prerender, confirm both routes prerender**

```bash
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```
Expected: build + prerender succeed; the prerender log lists `/learn` and `/how-it-works` among the routes.

Then confirm the static HTML (apostrophe-free substrings):
```bash
grep -o "Understand values-based education" dist/public/learn/index.html
grep -o "How a school adopts VBE" dist/public/learn/index.html
grep -o "Supporting tools" dist/public/learn/index.html
grep -o "Readiness diagnostic" dist/public/learn/index.html
grep -o "Diagnose" dist/public/how-it-works/index.html
```
Expected: every grep prints its match (the hub hero + spine + tools band are in `/learn`; the framework step "Diagnose" is in `/how-it-works`).

- [ ] **Step 5: Commit**

```bash
git add src/prerender-entry.tsx
git commit -m "feat(2c): prerender /learn hub + /how-it-works framework page"
```

---

### Task 4: Repoint the "Learn" nav + footer links

**Files:**
- Modify: `src/components/layout/nav-config.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Repoint the anon nav "Learn" item**

In `src/components/layout/nav-config.tsx`, the anonymous `marketingNav` "Learn" item is at line 302:

```tsx
    { name: "Learn", href: "/learning", icon: BookOpen, state: "live" },
```
Change its href to `/learn`:
```tsx
    { name: "Learn", href: "/learn", icon: BookOpen, state: "live" },
```

- [ ] **Step 2: Repoint the community "What VBE is & why" item**

In the same file, the `communityNav` "Learn VBE" section item is at line 248:

```tsx
      { name: "What VBE is & why", href: "/learning", icon: BookOpen, state: "live" },
```
Change its href to `/learn`:
```tsx
      { name: "What VBE is & why", href: "/learn", icon: BookOpen, state: "live" },
```

**Do NOT change** the authed role-nav "Learn" items (the `{ name: t("learn"), href: "/learn", … }` entries) — they already point at `/learn`, which is now auth-aware and resolves to the dispatcher for authed users (identical behaviour to today).

- [ ] **Step 3: Repoint the PublicShell footer "learning centre" link**

In `src/components/layout/AppShell.tsx`, the footer "Tools & resources" column has at line 366:

```tsx
      { label: "The learning centre", href: "/learning" },
```
Change it to:
```tsx
      { label: "Learn VBE", href: "/learn" },
```

- [ ] **Step 4: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "nav-config|AppShell" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 5: Build + confirm the anon nav points at /learn**

```bash
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
grep -o 'href="/learn"' dist/public/index.html | head -1
```
Expected: prints `href="/learn"` (the homepage top-nav "Learn" link now resolves to the hub).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/nav-config.tsx src/components/layout/AppShell.tsx
git commit -m "feat(2c): point Learn nav + footer at the /learn hub"
```

---

### Task 5: Holistic in-browser verification (orchestrator-run)

This task is run by the orchestrator (not a build subagent) using the preview MCP against the unified prod server. No code; it gates "done".

**Files:** none.

- [ ] **Step 1: Ensure a clean prod build is served**

From `artifacts/safeschool/`: `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build`. Confirm the build log lists all public routes prerendered (now 18: the prior 16 + `/learn` + `/how-it-works`) with no errors. Start/ensure the unified server (the api-server serves `dist/public` from disk — no api-server rebuild needed). **Note:** port 8080 may be occupied by the Claude desktop app; the vault `.claude/launch.json` has a `vibez-verify` config on **port 8095** for the preview MCP — use `preview_start name=vibez-verify`.

- [ ] **Step 2: Anon Learn hub**

Navigate to `http://localhost:8095/learn`. `preview_snapshot`: confirm the hero ("Learn VBE" eyebrow + "Understand values-based education" H1), the "what VBE is" framing panel, the 3 spine cards (The framework / What it improves / For your role), and the 4 supporting-tools cards. `preview_console_logs` (error): zero errors. Confirm the nav "Learn" item links to `/learn` and lands here.

- [ ] **Step 3: Hub links route out correctly**

From `/learn`, confirm (via snapshot hrefs or clicks) the route-outs resolve: framework → `/how-it-works`, "Run the diagnostic" → `/diagnostic`, "Explore by who you are" → `/schools`, and the tools band → `/diagnostic` · `/learning` · `/safeguarding` · `/resources`. Spot-check `/how-it-works` renders (the Diagnose→Adopt→Embed→Sustain journey) with no console errors.

- [ ] **Step 4: Regression — authed `/learn` still shows the dispatcher**

Log in (e.g. `parent.a@safeschool.dev` / `password123` on the local/preview DB). Navigate to `/learn`: confirm it shows the **in-app dispatcher** inside the sidebar shell (parent → Education + Training tabs), NOT the public hub. Log in as a pupil if convenient and confirm `/learn` shows their lessons (PupilLearn). Confirm a staff member's `/lessons` still shows the staff lesson library and `/learning` still shows the public lessons taster. No console errors.

- [ ] **Step 5: Screenshot for the record**

`preview_screenshot` the anon `/learn` hub.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

Only if Step 2–4 surfaced fixes. Otherwise nothing to commit here.

---

## Self-review notes (author)

- **Spec coverage:** Learn hub spine (Task 1) ✓; `/learn` auth-aware `LearnRoute` mirroring `HomeRoute` (Task 2) ✓; prerender `/learn` (anon `LearnHub` directly) + `/how-it-works` SEO gap closed (Task 3) ✓; nav "Learn" + community + footer repoint `/learning → /learn` (Task 4) ✓; `/learning` taster kept + linked from the hub's tools band (Task 1) ✓; in-app dispatcher / `/learn/:id` / `/lessons` / `/lessons/present/:id` untouched — regression-gated (Task 5 Step 4) ✓; no backend (no api tasks) ✓; naming "Vibes"/"VBE" (Task 1 copy) ✓.
- **Type consistency:** `LearnHub` is the default export of `learn-hub.tsx`, imported by both `App.tsx` (for `LearnRoute`) and `prerender-entry.tsx` (for `ROUTE_COMPONENTS`); `LearnRoute` returns `<LearnHub/>` or `<ProtectedRoute component={LearnPage}/>` using the existing in-scope `useAuth`/`ProtectedRoute`; `HowVbeWorks` (default export of `how-vbe-works.tsx`) added to the prerender map. lucide `Route` imported as `RouteIcon` to avoid the wouter `Route` name clash.
- **Out of scope (held):** final teaching copy (end-of-phase content audit); member "keep learning" surfacing (Phase 3); the unbuilt `/schools/why-vbe` etc. deep pages ("For your role" points at the existing audience pages); standalone marketing-site retirement runbook.

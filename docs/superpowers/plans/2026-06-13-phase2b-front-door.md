# Phase 2b — Teach-Then-Ask Front Door + Audience Personalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the anonymous `/` homepage as a teach-then-ask front door whose content reshapes in place when a visitor self-selects Schools / Parents / PTAs, add the four-stakeholder complete-solution story, and rebuild `/ptas` as the public "Get your PTA VIBING" page.

**Architecture:** Front-end only (no schema / API / server routes). A tiny `AudienceProvider`/`useAudience` context (SSR-safe, default `'all'`, resolved from URL param → localStorage) drives in-place reshaping of three homepage blocks; all per-audience copy lives in one typed content module. The homepage prerenders in its broad `'all'` state (SEO-safe); reshaping is a post-hydration client enhancement. The dedicated `/schools`, `/parents`, `/ptas` pages are kept; only `/ptas` is rebuilt with new PTA VIBES content.

**Tech Stack:** React 19 + Vite + wouter + TanStack Query; Tailwind with HSL CSS-var tokens; custom `renderToString` prerender (`prerender.mjs` + `prerender-entry.tsx`). Spec: [`docs/superpowers/specs/2026-06-13-phase2b-front-door-design.md`](../specs/2026-06-13-phase2b-front-door-design.md).

---

## Context the engineer must know

- **All paths below are relative to `artifacts/safeschool/`** unless stated otherwise. Work on branch `feat/unified-app`.
- **No frontend test framework exists** (no vitest in this package). "Verification" = TypeScript typecheck + a production build that runs the prerender + grepping the prerendered HTML + (orchestrator-run) in-browser preview MCP. Do **not** add a test runner.
- **`pnpm typecheck` has PRE-EXISTING failures** in this repo (generated `api-zod` duplicate re-exports, some implicit-any pages, lib build order) that are NOT yours. Verification rule: run typecheck and confirm **no new errors reference the files you created/modified**. Ignore the known pre-existing ones.
- **Production build command** (run from `artifacts/safeschool/`): `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` — this runs `vite build` then `node prerender.mjs`, writing `dist/public/<route>/index.html`. **`pnpm build` wipes `dist/public`** (note for anyone who restored a `_worker.js`).
- **Prerender renders pages with NO provider tree** — just `<Router ssrPath={route}><Page/></Router>` (see `src/prerender-entry.tsx`). So any hook a marketing page uses MUST be SSR-safe: return a sensible default when no provider is mounted and when `window` is undefined. `useAuth` (ANON_AUTH) and `useTenant` (default context value) already do this — mirror them.
- **React HTML-encodes apostrophes** to `&#x27;` in prerendered output. When grepping prerendered HTML, grep for apostrophe-free substrings.
- **Pages self-wrap `AppShell`** (Phase 2a). The anon path renders `AppShell` → `PublicShell` (top-nav marketing chrome). Keep that wrapping.
- **Design idiom** (reuse, do not invent): mono eyebrow (`text-sm uppercase tracking-[0.2em] text-primary`), `font-display` (Quicksand) titles, `rounded-2xl border bg-card` cards, `h-12 w-12 rounded-xl bg-accent` icon tiles, `buttonVariants({ size, variant })` for CTAs, lucide icons.

## File structure (what gets created / modified)

| File | Responsibility |
|---|---|
| `src/providers/audience.tsx` **(create)** | `Audience` type, `AudienceProvider`, `useAudience()` — SSR-safe state (URL param → localStorage → `'all'`), setter writes URL + localStorage. |
| `src/components/marketing/audienceContent.ts` **(create)** | Typed `AUDIENCE_CONTENT` map: per-audience copy for the three reshape blocks + the ask CTA label. Single source of truth for marketing copy. |
| `src/components/marketing/AudienceSwitcher.tsx` **(create)** | The "I'm a… School · Parent · PTA" chips; reads/sets `useAudience`. |
| `src/components/marketing/CompleteSolution.tsx` **(create)** | The four-stakeholder complete-solution block (BROAD). |
| `src/pages/home.tsx` **(rewrite)** | The 7-block teach-then-ask spine; reshape blocks read `useAudience` + the content map. |
| `src/pages/ptas.tsx` **(rewrite)** | "Get your PTA VIBING" — the public PTA VIBES page. |
| `src/App.tsx` **(modify)** | Mount `<AudienceProvider>` in the provider tree. |

`prerender-entry.tsx` needs **no change** — `/` and `/ptas` are already registered; only their component bodies change.

---

### Task 1: Audience provider + hook

**Files:**
- Create: `src/providers/audience.tsx`
- Modify: `src/App.tsx` (mount the provider)

- [ ] **Step 1: Create the provider**

Create `src/providers/audience.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// The three self-select tracks plus the broad default. "all" = no selection;
// the homepage renders its broad state (and prerenders in this state).
export type Audience = "all" | "schools" | "parents" | "ptas";

const STORAGE_KEY = "vibes_audience";

function isAudience(value: unknown): value is Audience {
  return value === "all" || value === "schools" || value === "parents" || value === "ptas";
}

// Precedence on first load: URL param (?audience=) → localStorage → "all".
// SSR-safe: returns "all" when there is no window (prerender path).
function readInitialAudience(): Audience {
  if (typeof window === "undefined") return "all";
  const fromUrl = new URLSearchParams(window.location.search).get("audience");
  if (isAudience(fromUrl)) return fromUrl;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isAudience(stored)) return stored;
  return "all";
}

type AudienceContextValue = { audience: Audience; setAudience: (a: Audience) => void };

// Default value lets components read the hook with NO provider mounted (the
// prerender path renders pages bare) — they get the broad "all" state.
const AudienceContext = createContext<AudienceContextValue>({
  audience: "all",
  setAudience: () => {},
});

export function useAudience() {
  return useContext(AudienceContext);
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>(readInitialAudience);

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    // Reflect to the URL without navigating (shareable / pre-personalized link).
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("audience");
    else url.searchParams.set("audience", next);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <AudienceContext.Provider value={{ audience, setAudience }}>
      {children}
    </AudienceContext.Provider>
  );
}
```

- [ ] **Step 2: Mount the provider in `App.tsx`**

In `src/App.tsx`, add the import near the other provider imports (the line `import { TenantProvider } from "@/providers/tenant";` is at line 11):

```tsx
import { AudienceProvider } from "@/providers/audience";
```

Then wrap `<DemoProvider>` with `<AudienceProvider>` inside the `App()` tree (currently around lines 343–356). The tree becomes:

```tsx
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AudienceProvider>
                <DemoProvider>
                  <ScrollToTop />
                  <Router />
                  <DemoOverlay />
                </DemoProvider>
              </AudienceProvider>
            </WouterRouter>
```

(Placing it inside `WouterRouter` keeps it scoped to the live SPA; the prerender path never mounts it, so pages fall back to the `'all'` default — exactly what we want.)

- [ ] **Step 3: Verify typecheck (no new errors)**

Run from `artifacts/safeschool/`:
```bash
pnpm typecheck 2>&1 | grep -E "providers/audience|App.tsx" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 4: Commit**

```bash
git add src/providers/audience.tsx src/App.tsx
git commit -m "feat(2b): add SSR-safe AudienceProvider + useAudience"
```

---

### Task 2: Audience content module

**Files:**
- Create: `src/components/marketing/audienceContent.ts`

- [ ] **Step 1: Create the content map**

Create `src/components/marketing/audienceContent.ts`. This is the single source of truth for the three reshape blocks. Copy is honest draft; the observed-behaviour wording is **Tom-owned/legal-reviewed** (marked) — these are placeholders good enough to ship as draft, not final.

```ts
import type { Audience } from "@/providers/audience";

export type AudienceContent = {
  whyItMatters: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  whatYouGet: {
    eyebrow: string;
    title: string;
    items: { title: string; body: string }[];
  };
  goDeeper: { label: string; href: string };
  askLabel: string;
};

// NOTE: "Why it matters" wording describes the behaviours the diagnostic
// measures. Final copy is Tom-owned and legal-reviewed (spec §8) — the strings
// below are honest drafts, safe to ship as placeholder, replace on sign-off.
export const AUDIENCE_CONTENT: Record<Audience, AudienceContent> = {
  all: {
    whyItMatters: {
      eyebrow: "Why it matters",
      title: "Values show up in how a community behaves",
      body: "VBE works on the everyday patterns a school and its community can actually see — how children treat each other, and how the adults respond. The diagnostic measures those patterns so you start from evidence, not assumption.",
      points: [
        "How children treat each other day to day",
        "How the school responds when they fall short",
        "Whether parents have a real, structured voice",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A complete VBE operating system for your community",
      items: [
        { title: "The real picture", body: "See the diagnostic results — the honest read on where your community stands." },
        { title: "A voice with weight", body: "Back the change, raise concerns, and shape what happens next." },
        { title: "Operate well together", body: "The structure a PTA, a school, and parents need to actually get things done." },
      ],
    },
    goDeeper: { label: "Explore by who you are", href: "/schools" },
    askLabel: "Find your school",
  },

  schools: {
    whyItMatters: {
      eyebrow: "For schools",
      title: "Adopt VBE on evidence, not a hunch",
      body: "Before you commit, see where your community actually stands. The diagnostic surfaces the behaviour patterns VBE is designed to improve, so adoption is grounded and your parents are already behind it.",
      points: [
        "A baseline read of your community in days, not terms",
        "Parents brought along before you commit",
        "A 10-day rollout, not a year-long programme",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "Everything your SLT, staff, parents and pupils need",
      items: [
        { title: "Run the diagnostic", body: "A readiness read on your community before you decide." },
        { title: "Adopt in 10 days", body: "The full pack — lessons, PSHE, safeguarding — ready to deploy." },
        { title: "Respond with evidence", body: "Safeguarding and incidents on record; embed VBE and show it." },
      ],
    },
    goDeeper: { label: "See how schools adopt VBE", href: "/schools" },
    askLabel: "Find your school",
  },

  parents: {
    whyItMatters: {
      eyebrow: "For parents",
      title: "Your child's school runs on its values",
      body: "How children treat each other — and how the school responds when they do not — shapes your child's day. VBE works on exactly those patterns, and you get a real, structured way to be part of it.",
      points: [
        "A voice that does not depend on attending meetings",
        "Concerns that reach the right place, not a dead end",
        "See the real picture once results are released",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A real voice, from anywhere, any time",
      items: [
        { title: "Back the change", body: "Add your weight to your school adopting VBE." },
        { title: "Raise a concern", body: "A structured channel that goes somewhere — not ad hoc." },
        { title: "Stay informed", body: "The results and what the PTA is doing, shared with you." },
      ],
    },
    goDeeper: { label: "See how parents take part", href: "/parents" },
    askLabel: "Find your school",
  },

  ptas: {
    whyItMatters: {
      eyebrow: "For PTAs",
      title: "Without structure, parents become second- and third-class citizens",
      body: "Parents outside the PTA get no information. Parents inside it but outside the inner circle know less than the executive. A PTA with VIBES levels that: transparent by default, equal access to information, participation from anywhere.",
      points: [
        "No structure means information lives with a few people",
        "Busy and overseas parents are shut out of the in-person model",
        "Good ideas stall without owners, criteria, or a process",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A PTA with VIBES — the operating infrastructure",
      items: [
        { title: "Five seats, equal responsibility", body: "President, VP, Chair, Secretary, Treasurer — responsibility, not rank." },
        { title: "Transparent by default", body: "Voting, decisions, goals and initiatives, visible to every member." },
        { title: "Get things done", body: "Rolling agendas, tracked initiatives, formal questions to the school." },
      ],
    },
    goDeeper: { label: "Get your PTA VIBING", href: "/ptas" },
    askLabel: "Find your school",
  },
};
```

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "audienceContent" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/audienceContent.ts
git commit -m "feat(2b): add per-audience marketing content map"
```

---

### Task 3: AudienceSwitcher component

**Files:**
- Create: `src/components/marketing/AudienceSwitcher.tsx`

- [ ] **Step 1: Create the switcher**

Create `src/components/marketing/AudienceSwitcher.tsx`:

```tsx
import { useAudience, type Audience } from "@/providers/audience";
import { cn } from "@/lib/utils";

const TRACKS: { value: Audience; label: string }[] = [
  { value: "schools", label: "School" },
  { value: "parents", label: "Parent" },
  { value: "ptas", label: "PTA" },
];

// Self-select chips. Clicking a chip reshapes the homepage in place (no nav);
// clicking the active chip again clears back to the broad "all" state.
export function AudienceSwitcher({ className }: { className?: string }) {
  const { audience, setAudience } = useAudience();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">I'm a…</span>
      {TRACKS.map((track) => {
        const active = audience === track.value;
        return (
          <button
            key={track.value}
            type="button"
            aria-pressed={active}
            onClick={() => setAudience(active ? "all" : track.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {track.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "AudienceSwitcher" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/AudienceSwitcher.tsx
git commit -m "feat(2b): add AudienceSwitcher chips"
```

---

### Task 4: CompleteSolution component

**Files:**
- Create: `src/components/marketing/CompleteSolution.tsx`

- [ ] **Step 1: Create the four-stakeholder block**

Create `src/components/marketing/CompleteSolution.tsx`. BROAD (audience-agnostic). The "switched on as your school adopts" line is honest-aspirational copy (no live tenant on the bare homepage; real gating is the Phase-1 authed nav).

```tsx
import { Shield, Users, Vote, School } from "lucide-react";

const STAKEHOLDERS: { icon: typeof Shield; title: string; body: string }[] = [
  { icon: Shield, title: "Children", body: "Report safely, learn the values, and have a voice in their school." },
  { icon: Users, title: "Parents", body: "Stay informed, raise concerns, and back the change — from anywhere." },
  { icon: Vote, title: "The PTA", body: "Operate with real structure: membership, voting, goals, tracked initiatives." },
  { icon: School, title: "The school", body: "Keep safeguarding on record, embed VBE, and respond with evidence." },
];

// The complete-solution story: one VBE operating system for the whole community,
// not a survey or a funnel. Always shown (broad) regardless of audience.
export function CompleteSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          The complete solution
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          One operating system for the whole community
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          VBE works when everyone is part of it. Vibes brings all four together —
          switched on for your community as your school adopts VBE.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STAKEHOLDERS.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <s.icon className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "CompleteSolution" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/CompleteSolution.tsx
git commit -m "feat(2b): add CompleteSolution four-stakeholder block"
```

---

### Task 5: Rebuild the homepage spine

**Files:**
- Modify (full rewrite): `src/pages/home.tsx`

- [ ] **Step 1: Rewrite `home.tsx` with the 7-block spine**

Replace the entire contents of `src/pages/home.tsx` with:

```tsx
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";
import { useAudience } from "@/providers/audience";
import { AUDIENCE_CONTENT } from "@/components/marketing/audienceContent";
import { AudienceSwitcher } from "@/components/marketing/AudienceSwitcher";
import { CompleteSolution } from "@/components/marketing/CompleteSolution";

// Phase 2b: the teach-then-ask front door. BROAD blocks are audience-agnostic
// and prerender as-is for SEO; RESHAPE blocks (Why it matters / What you get /
// Go deeper / the ask CTA label) read useAudience and swap in place after
// hydration. With no AudienceProvider (the prerender path) useAudience returns
// "all", so the broad state is what crawlers and first paint see.
//
// HEADS UP: the H1 below is Tom-owned draft copy (spec §8) — replace on sign-off.
export default function HomePage() {
  const { audience } = useAudience();
  const content = AUDIENCE_CONTENT[audience];

  return (
    <AppShell>
      {/* 1 · Hero — the VBE value (BROAD) */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Values-Based Education
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          VBE improves how children treat each other — and how the school responds when they don't.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Vibes is the software that makes Values-Based Education work for your whole
          community — children, parents, the PTA, and the school.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/find-school" className={cn(buttonVariants({ size: "lg" }))}>
            Find your school
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Log in
          </Link>
        </div>
        <AudienceSwitcher className="mt-10 justify-center" />
      </section>

      {/* 2 · Why this exists (BROAD) */}
      <section className="mx-auto max-w-3xl px-4 pb-4 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <p className="text-lg text-foreground">
            Vibes helps your school adopt VBE — working <em>with</em> the school, not against it.
            For a school to commit, it needs its parents behind it. That's what this is for.
          </p>
        </div>
      </section>

      {/* 3 · Why it matters (RESHAPE) */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {content.whyItMatters.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {content.whyItMatters.title}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{content.whyItMatters.body}</p>
        <ul className="mt-6 space-y-3">
          {content.whyItMatters.points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="text-foreground">{point}</span>
            </li>
          ))}
        </ul>
        <Link href="/diagnostic" className="mt-6 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          See where your school stands <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {/* 4 · The complete solution (BROAD) */}
      <CompleteSolution />

      {/* 5 · What you get (RESHAPE) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {content.whatYouGet.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {content.whatYouGet.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {content.whatYouGet.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · Go deeper (RESHAPE) */}
      <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <Link
          href={content.goDeeper.href}
          className="inline-flex items-center gap-1 text-lg font-semibold text-primary hover:underline"
        >
          {content.goDeeper.label} <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </section>

      {/* 7 · The ask (BROAD frame, RESHAPE CTA label) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Find your school's community and join in — it takes a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/find-school"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
            >
              {content.askLabel}
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "pages/home" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Build + prerender, confirm the homepage prerenders in broad state**

```bash
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```
Expected: build + prerender succeed; output lists the prerendered routes including `/`.

Then confirm the broad content and the switcher are in the static HTML (apostrophe-free substrings):
```bash
grep -c "Values-Based Education" dist/public/index.html
grep -o "The complete solution" dist/public/index.html
grep -o "Values show up in how a community behaves" dist/public/index.html   # the "all" Why-it-matters title
grep -o ">School<\|>Parent<\|>PTA<" dist/public/index.html | sort -u          # switcher chips present
```
Expected: count ≥ 1 for the eyebrow; the complete-solution heading present; the broad ("all") Why-it-matters title present (proves it prerenders broad, NOT a per-audience variant); all three switcher chip labels present.

- [ ] **Step 4: Commit**

```bash
git add src/pages/home.tsx
git commit -m "feat(2b): rebuild homepage as teach-then-ask front door"
```

---

### Task 6: Rebuild `/ptas` as "Get your PTA VIBING"

**Files:**
- Modify (full rewrite): `src/pages/ptas.tsx`

The public PTA VIBES page the homepage PTA track links into. Showcases the full model (spec decision §2.3). Reconciliation note (spec §6): present the clean public 5-seat model; where the built software is richer, the page simplifies.

- [ ] **Step 1: Rewrite `ptas.tsx`**

Replace the entire contents of `src/pages/ptas.tsx` with:

```tsx
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Users, Settings, FileText, Wallet, ArrowRight } from "lucide-react";

// Phase 2b: the public "Get your PTA VIBING" page — the PTA VIBES model + the
// why-structure argument + what VIBES facilitates + the engagement principles.
// Presentational / SSR-safe (prerenders for SEO). Source: PTA VIBES brief.

const SEATS: { icon: typeof Crown; seat: string; remit: string }[] = [
  { icon: Crown, seat: "President", remit: "The primary channel to the school." },
  { icon: Users, seat: "Vice President", remit: "Growing membership and community engagement." },
  { icon: Settings, seat: "Chair", remit: "Runs the platform — the operational, caretaker-admin seat." },
  { icon: FileText, seat: "Secretary", remit: "Records, agendas, and the paper trail." },
  { icon: Wallet, seat: "Treasurer", remit: "Funds and financial transparency." },
];

const FACILITATES: string[] = [
  "Structured meetings with rolling agendas",
  "Reviewing the data from survey results",
  "Formal questions and responses to the school",
  "Clear, agreed goals",
  "Initiatives that are tracked end to end",
];

const PRINCIPLES: string[] = [
  "We support the school, the PTA, and each other — we don't criticise any of them.",
  "Partners, not petitioners: every message reads as working with the school.",
  "Every proposal reaches a decision; silence is recorded, not accepted.",
];

export default function PtasPage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">For PTAs</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Get your PTA VIBING
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          A PTA with VIBES runs on structure, not personalities — transparent by default,
          equal access to information, and participation from anywhere in the world.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/find-school" className={cn(buttonVariants({ size: "lg" }))}>
            Find your school
          </Link>
        </div>
      </section>

      {/* Why structure matters */}
      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <h2 className="font-display text-2xl font-bold">Why structure matters</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Without structure you get second- and third-class citizens. Parents outside the
            PTA have no information. Parents inside it, but outside the inner circle, know less
            than the executive. VIBES levels that: transparent by default, equal access to
            information, async participation from anywhere — no meeting attendance required.
          </p>
        </div>
      </section>

      {/* The 5-seat model */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">The model</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Five seats — equal responsibility, not rank
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SEATS.map((s) => (
            <div key={s.seat} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{s.seat}</h3>
              <p className="mt-2 text-muted-foreground">{s.remit}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold">Active Members</h3>
            <p className="mt-2 text-muted-foreground">
              Take part in meetings and run initiatives — with sign-off from any one exec member.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold">Voting Members</h3>
            <p className="mt-2 text-muted-foreground">
              Vote, raise issues, and get equal access to information. A voice without a time commitment.
            </p>
          </div>
        </div>
      </section>

      {/* What VIBES facilitates */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What VIBES facilitates</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          The software that does the operating
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {FACILITATES.map((item) => (
            <li key={item} className="rounded-2xl border border-border bg-card p-5 text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Engagement principles */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight">How we work together</h2>
          <ul className="mt-6 space-y-4">
            {PRINCIPLES.map((p) => (
              <li key={p} className="text-lg text-primary-foreground/90">{p}</li>
            ))}
          </ul>
          <Link
            href="/find-school"
            className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "mt-8 inline-flex items-center gap-1")}
          >
            Find your school <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "pages/ptas" || echo "OK: no new errors in changed files"
```
Expected: `OK: no new errors in changed files`.

- [ ] **Step 3: Build + prerender, confirm `/ptas` prerenders the new content**

```bash
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
grep -o "Get your PTA VIBING" dist/public/ptas/index.html
grep -o "equal responsibility, not rank" dist/public/ptas/index.html
grep -o ">President<\|>Treasurer<" dist/public/ptas/index.html | sort -u
```
Expected: the headline, the 5-seat subhead, and the seat names are present in the static HTML.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ptas.tsx
git commit -m "feat(2b): rebuild /ptas as Get your PTA VIBING"
```

---

### Task 7: Holistic in-browser verification (orchestrator-run)

This task is run by the orchestrator (not a build subagent) using the preview MCP against the unified prod server on `:8080`. No code; it gates "done".

**Files:** none.

- [ ] **Step 1: Ensure a clean prod build is served**

From `artifacts/safeschool/`: `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build`. Confirm the build log lists all existing public routes prerendered (the 16 in `PUBLIC_ROUTES`) with no errors. Start/ensure the unified server (`preview_start name=vibez`, or the runbook: from `artifacts/api-server`, `set -a; . ../../.env; set +a; PORT=8080 NODE_ENV=production node dist/index.cjs`). The api-server serves `dist/public` from disk, so no api-server rebuild is needed.

- [ ] **Step 2: Anon homepage — broad state**

`preview_start`/navigate to `http://localhost:8080/`. `preview_snapshot`: confirm the hero eyebrow "Values-Based Education", the H1, the switcher chips (School/Parent/PTA), the four complete-solution cards (Children/Parents/The PTA/The school), and the "all" Why-it-matters + What-you-get copy. `preview_console_logs`: zero errors.

- [ ] **Step 3: Reshape in place**

`preview_click` the "PTA" chip. `preview_snapshot`: blocks 3/5/6 now show the PTA variant ("second- and third-class citizens", "A PTA with VIBES", "Get your PTA VIBING" go-deeper); the complete-solution block and hero are unchanged; no navigation occurred (still `/`). Click "Parent" and "School" and confirm each swaps. Click the active chip again → returns to broad "all". No console errors.

- [ ] **Step 4: Deep-link + persistence**

Navigate to `http://localhost:8080/?audience=ptas`: page lands with the PTA track pre-selected (chip active, PTA copy shown). Reload the page (no query param this time, e.g. plain `/` via `preview_eval` setting `window.location.href`): the PTA selection persists from localStorage. Clear: `preview_eval` `localStorage.removeItem('vibes_audience')` then reload `/` → back to broad.

- [ ] **Step 5: `/ptas` page + go-deeper**

Navigate to `http://localhost:8080/ptas`: the "Get your PTA VIBING" page renders (5 seats, Active/Voting members, what VIBES facilitates, engagement principles). From `/?audience=ptas`, clicking the "Get your PTA VIBING" go-deeper link navigates to `/ptas`. No console errors.

- [ ] **Step 6: Regression**

Confirm: authed user still lands on the Dashboard at `/` (log in as `pta.chair@safeschool.dev` / `password123` — but note prod/Riverside; on the local/preview DB use the prefilled creds), sidebar chrome intact; `/schools` and `/parents` still render their existing pages and their homepage go-deeper links resolve; the 2a anon top-nav chrome + brand ("Vibes") unchanged. `preview_screenshot` the broad homepage and the PTA-selected homepage for the record.

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

Only if Step 2–6 surfaced fixes. Otherwise nothing to commit here.

---

## Self-review notes (author)

- **Spec coverage:** front door spine (Tasks 5) ✓; audience personalization mechanism — provider/URL/localStorage/SSR-safe (Task 1), switcher (Task 3), content map (Task 2) ✓; reshape blocks 3/5/6 + CTA (Task 5) ✓; complete-solution story (Task 4) ✓; PTA VIBES content + rebuilt `/ptas` (Task 6) ✓; SEO = prerender broad + grep checks (Tasks 5/6/7) ✓; no backend (no api tasks) ✓; naming "Vibes" (Tasks 5/6 copy) ✓; verification in-browser (Task 7) ✓.
- **Type consistency:** `Audience` defined once in `providers/audience.tsx`, imported by `audienceContent.ts` and `AudienceSwitcher.tsx`; `AUDIENCE_CONTENT: Record<Audience, AudienceContent>` consumed in `home.tsx` via `AUDIENCE_CONTENT[audience]`; `useAudience()` returns `{ audience, setAudience }` used consistently.
- **Out of scope (held):** Tom-owned final H1 + observed-behaviour copy (placeholders marked in code), `/s/:slug` tenant front door, Learn area, `/schools` + `/parents` reframes, legal-rights tools, marketing-site retirement runbook.

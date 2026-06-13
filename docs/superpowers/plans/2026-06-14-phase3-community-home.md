# Phase 3 — Community Home (four-state, capability-gated) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the parent-role dashboard with a single state-aware `CommunityHome` composed of independently-gated sections (capability + data + membership state), reusing existing endpoints and extracting the safeguarding widgets out of `ParentDashboard`.

**Architecture:** A thin `CommunityHome` composer renders seven self-gating section components under `src/components/home/`. Six are new (You're in · VOICE · PTA · Results · Concerns · Switched-on promises); one (`ChildrenSafeguardingSection`) is extracted near-verbatim from today's `ParentDashboard` safeguarding mode. `dashboard.tsx` routes `role === "parent"` to `CommunityHome`; `ParentDashboard.tsx` is deleted. Front-end only — no schema/API/new endpoints; the home is authed-only so it is NOT prerendered.

**Tech Stack:** React 19 + Vite + wouter + TanStack Query; generated hooks from `@workspace/api-client-react`; Tailwind HSL tokens; `ui-polished` Card/Button, `PageHeader`, `MissionActions`, `WhatsNewBand`. Spec: [`docs/superpowers/specs/2026-06-14-phase3-community-home-design.md`](../specs/2026-06-14-phase3-community-home-design.md).

---

## Context the engineer must know

- **All paths relative to `artifacts/safeschool/`.** Branch `feat/unified-app`.
- **No frontend test framework** (no vitest). Verification = `pnpm typecheck` (no NEW errors in changed files — pre-existing api-zod/implicit-any failures are NOT yours) + a production build + (orchestrator-run) in-browser preview MCP. Do not add a test runner.
- **Build:** from `artifacts/safeschool/`, `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` (vite build + prerender). The parent home is **authed → never prerendered**; the build must still compile it.
- **Capabilities** come fully resolved (all 10 boolean keys) from the server on `tenant.capabilities` via `useTenant()`. Keys: `learn diagnostic voice membership results concerns pta safeguarding lessons behaviour`. Morna defaults: `voice/pta/results/concerns/diagnostic/learn/membership` = **on**; `safeguarding/lessons/behaviour` = **off**.
- **Avoid load flicker:** `useTenant()` returns `{ tenant, isLoading }`. Each capability-gated section calls its hooks unconditionally, then early-returns `null` while `isLoading` or when its gate is unmet. (Hooks before any early return — Rules of Hooks.)
- **Membership state:** `getMembershipState(user)` from `@/lib/membership` → `"pending" | "approved" | "exec"` (a parent is only ever pending/approved; exec is pta/coordinator/head, who never reach `CommunityHome`).
- **Capability gating here is presentational only** (API still enforces per-endpoint, e.g. results 403 for pending) — consistent with Phases 1–2.
- **Design idiom:** `Card`/`CardContent` from `@/components/ui-polished`; `PageHeader` from `@/components/layout/PageHeader`; section headings `font-display text-xl font-bold`; lucide icons with `aria-hidden`; `text-primary` accents.
- **Hook return shape:** generated hooks return a TanStack query object; read `q.data`, `q.isLoading`, `q.isError`. List payloads are wrapped: `(q.data as any)?.voices` / `.members` / `.goals` / `.initiatives` / `.proposals` / `.announcements` / `.concerns`. `useGetJoinSummary(slug, opts)` and `useGetDiagnosticResults(slug, opts)` take the slug as first arg; the rest take `(opts)` only. Pass `{ query: { enabled: <bool> } }` to gate fetches.

## File structure

| File | Responsibility |
|---|---|
| `src/components/home/YoureInBanner.tsx` **(create)** | Always-on standing banner + live join counter. |
| `src/components/home/VoiceSection.tsx` **(create)** | The cause / VOICE (gate: `voice` cap + a VOICE exists). |
| `src/components/home/PtaSection.tsx` **(create)** | PTA operating content + "bring VIBES" pitch + join-to-advocate CTA (gate: `pta` cap + a PTA exists). |
| `src/components/home/ResultsSection.tsx` **(create)** | The diagnostic report / locked card (gate: `results` cap). |
| `src/components/home/ConcernsSection.tsx` **(create)** | Raise/track concerns (gate: `concerns` cap). |
| `src/components/home/ChildrenSafeguardingSection.tsx` **(create — extracted from ParentDashboard)** | The safeguarding widgets (gate: `safeguarding` cap + children linked). |
| `src/components/home/SwitchedOnPromises.tsx` **(create)** | "Switched on as…" cards for off-capabilities. |
| `src/pages/community-home.tsx` **(create)** | The composer — renders the 7 sections in order. |
| `src/pages/dashboard.tsx` **(modify)** | `role === "parent"` → `<CommunityHome />`. |
| `src/pages/dashboard/ParentDashboard.tsx` **(delete)** | After its safeguarding content is extracted. |

---

### Task 1: Extract `ChildrenSafeguardingSection` from `ParentDashboard`

This is a near-verbatim **move** of today's parent safeguarding view into a gated section. The source is `src/pages/dashboard/ParentDashboard.tsx` (1088 lines).

**Files:**
- Create: `src/components/home/ChildrenSafeguardingSection.tsx`

- [ ] **Step 1: Create the section by moving the safeguarding view**

Create `src/components/home/ChildrenSafeguardingSection.tsx`. Move into it, **unchanged**, from `ParentDashboard.tsx`:
- the two helper components `ParentReportCard` (lines 29–232) and `ContactPTACard` (lines 234–362), with their imports;
- the `CHART_COLORS_PARENT` const (line 27);
- the **entire body** of the current `ParentDashboard` function (the hooks/state/queries at lines 365–531: `useTranslation`, `useListNotifications`, `notifications`/`unread`, `PERIOD_OPTIONS`, the label maps, the `parentData` query, `messageUnread`, `childBehaviourData`, `disclosures`/`pendingDisclosures`, the acknowledge mutation + ack state, `schoolData` query + `showSchoolOverview`, the cutoff/filtered computations, `categoryData`/`statusData`, `childrenList`/`childName`, `digest`) **and** the loading skeleton (533–549) **and** the **safeguarding `return (...)`** (581–1087).

Make these four changes during the move:
1. **Signature + gate.** Replace `export default function ParentDashboard({ user }: { user: any })` with a named export. Add the capability gate **before** the existing loading skeleton (so a tenant without `safeguarding`, e.g. Morna, never fetches/flashes a skeleton), and the children gate **after** the skeleton (so a genuine `parentData` load still shows the skeleton):
   ```tsx
   export function ChildrenSafeguardingSection() {
     const { user } = useAuth();
     const { tenant, isLoading: tenantLoading } = useTenant();
     const cap = (tenant?.capabilities ?? {}) as any;
     // ... existing hooks/state/computations unchanged (parentData query, childBehaviourData,
     //     disclosures, schoolData, period state, digest, chart computations, childrenList) ...
     const childrenList = parentData?.children || [];

     if (tenantLoading || !cap.safeguarding) return null;   // capability gate (before skeleton)
     if (isLoading) return ( /* the existing loading-skeleton return, unchanged */ );
     if (childrenList.length === 0) return null;            // data gate (after skeleton)
     // ... existing safeguarding return (the big return at 581–1087), unchanged ...
   }
   ```
   (Add `import { useAuth } from "@/hooks/use-auth";` — `user` was passed as a prop before. `isLoading` is the existing `parentData` query flag.)
2. **Drop the community-mode branch** entirely (the `if (childrenList.length === 0) { ... }` block, lines 551–579) — the new community sections replace it.
3. **Replace the top `PageHeader`** (lines 583–604) with a plain section heading so the home's `YoureInBanner` owns the page title:
   ```tsx
   <div className="flex items-center justify-between flex-wrap gap-3">
     <h2 className="font-display text-xl font-bold flex items-center gap-2">
       <Users size={20} className="text-primary" aria-hidden /> Your children
     </h2>
     <div className="flex items-center gap-2">
       {PERIOD_OPTIONS.map((opt) => ( /* the existing period buttons, unchanged */ ))}
     </div>
   </div>
   ```
   Keep the outer wrapper as `<div className="space-y-8">` (drop `max-w-5xl mx-auto` — the composer centers).
4. **Keep `useTenant` import** (already imported at line 4) and all recharts/lucide/ui-polished imports that the moved code uses.

Everything else (the queries hitting `/api/dashboard/parent`, `/api/behaviour/pupil/:id`, disclosures, school overview, charts, report history) moves **unchanged**.

- [ ] **Step 2: Verify typecheck (no new errors)**

```bash
pnpm typecheck 2>&1 | grep -E "ChildrenSafeguardingSection" || echo "OK: no new errors in changed files"
```
Expected: `OK`. (`ParentDashboard.tsx` still exists and is still imported by `dashboard.tsx` at this point — that's fine; it's removed in Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/components/home/ChildrenSafeguardingSection.tsx
git commit -m "feat(3): extract ChildrenSafeguardingSection from ParentDashboard (capability+children gated)"
```

---

### Task 2: `YoureInBanner`

**Files:** Create `src/components/home/YoureInBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";
import { useGetJoinSummary } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Users } from "lucide-react";

// Phase 3: the always-on "you're in" banner — standing + live join counter.
// Copy is placeholder (end-of-redesign content audit).
export function YoureInBanner() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const slug = tenant?.slug ?? "";
  const joinQ = useGetJoinSummary(slug, { query: { enabled: !!slug } });
  const summary = joinQ.data as any;
  const state = getMembershipState(user);
  const firstName = user?.firstName && user.firstName !== "Morna" ? user.firstName : "";
  const eyebrow = `${tenant?.displayName ?? ""} Vibes`.trim();
  const subtitle =
    state === "pending"
      ? "You're in — your membership is awaiting approval. You'll be notified when results are released."
      : "You're backing the cause. Here's everything in one place.";

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={eyebrow} title={firstName ? `Welcome, ${firstName}` : "Welcome"} subtitle={subtitle} />
      {summary?.joinCount != null && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          {summary.joinCount} families have joined{summary.voiceName ? ` ${summary.voiceName}` : ""}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "YoureInBanner" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/YoureInBanner.tsx && git commit -m "feat(3): add YoureInBanner section"`

---

### Task 3: `VoiceSection`

**Files:** Create `src/components/home/VoiceSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useListVoice } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Vote, ArrowRight } from "lucide-react";

// Phase 3: the cause / VOICE. Gate: voice capability + a VOICE exists.
export function VoiceSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListVoice({ query: { enabled: !!cap.voice } });
  const voices = (q.data as any)?.voices ?? [];
  if (isLoading || !cap.voice || voices.length === 0) return null;

  const lead = voices.find((v: any) => v.status === "advocating") ?? voices[0];
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Vote size={20} className="text-primary" aria-hidden /> The cause
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="font-semibold text-foreground">{lead.name}</p>
          {lead.mission && <p className="mt-1 text-sm text-muted-foreground">{lead.mission}</p>}
          <p className="mt-2 text-sm text-muted-foreground">{lead.memberCount ?? 0} backing this</p>
          <Link href="/voice" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Back it &amp; share <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "VoiceSection" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/VoiceSection.tsx && git commit -m "feat(3): add VoiceSection"`

---

### Task 4: `PtaSection`

**Files:** Create `src/components/home/PtaSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";
import {
  useListPtaMembers, useGetPtaCharter, useListPtaGoals,
  useListPtaInitiatives, useGetPtaAnnouncementFeed,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Users, Flag, ListChecks, Megaphone, Sparkles, ArrowRight, Lock } from "lucide-react";

// Phase 3: the PTA. Gate: pta capability + a PTA exists (members ≥ 1).
// Shows the "bring VIBES to your PTA" pitch when no charter is claimed, the
// read-only operating content (locked for pending members), and a running
// join-to-advocate CTA. Copy is placeholder (end-of-redesign content audit).
export function PtaSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const { user } = useAuth();
  const state = getMembershipState(user);

  const membersQ = useListPtaMembers({ query: { enabled: !!cap.pta } });
  const charterQ = useGetPtaCharter({ query: { enabled: !!cap.pta } });
  const goalsQ = useListPtaGoals({ query: { enabled: !!cap.pta } });
  const initiativesQ = useListPtaInitiatives({ query: { enabled: !!cap.pta } });
  const feedQ = useGetPtaAnnouncementFeed({ query: { enabled: !!cap.pta } });

  const members = (membersQ.data as any)?.members ?? [];
  if (isLoading || !cap.pta || members.length === 0) return null;

  const adopted = !!(charterQ.data as any)?.claimed;
  const goals = ((goalsQ.data as any)?.goals ?? []).slice(0, 3);
  const initiatives = ((initiativesQ.data as any)?.initiatives ?? []).slice(0, 3);
  const announcements = ((feedQ.data as any)?.announcements ?? []).slice(0, 2);
  const locked = state === "pending";

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Users size={20} className="text-primary" aria-hidden /> The PTA
      </h2>

      {!adopted && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Bring VIBES to your PTA
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adopt the VIBES operating principles — transparent by default, equal access to information, participation from anywhere.
            </p>
            <Link href="/pta/charter" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Get your PTA VIBING <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      {locked ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden /> PTA goals, initiatives and decisions unlock once your membership is approved.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold flex items-center gap-2"><Flag className="h-4 w-4 text-primary" aria-hidden /> Goals</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {goals.length ? goals.map((g: any) => <li key={g.id}>{g.title}</li>) : <li>No goals yet.</li>}
              </ul>
              <Link href="/pta/goals" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All goals <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" aria-hidden /> Initiatives</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {initiatives.length ? initiatives.map((i: any) => <li key={i.id}>{i.title}</li>) : <li>No initiatives yet.</li>}
              </ul>
              <Link href="/pta/initiatives" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All initiatives <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!locked && announcements.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" aria-hidden /> Latest from the PTA</p>
            <ul className="mt-2 space-y-2">
              {announcements.map((a: any) => (
                <li key={a.id} className="text-sm font-medium text-foreground">{a.title}</li>
              ))}
            </ul>
            <Link href="/pta-updates" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              All updates <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border-role-pta/30 bg-role-pta/5">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Add your voice</p>
            <p className="text-sm text-muted-foreground">More members, more advocacy weight.</p>
          </div>
          <Link href="/voice" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Join <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "PtaSection" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/PtaSection.tsx && git commit -m "feat(3): add PtaSection (operating content + VIBES pitch + advocacy CTA)"`

---

### Task 5: `ResultsSection`

**Files:** Create `src/components/home/ResultsSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useGetDiagnosticResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { BarChart3, Lock, ArrowRight } from "lucide-react";

// Phase 3: the real picture = the diagnostic report. Gate: results capability.
// The hook 403s (→ isError) for pending/unreleased non-exec; treat that as locked.
export function ResultsSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const slug = tenant?.slug ?? "";
  const q = useGetDiagnosticResults(slug, { query: { enabled: !!cap.results && !!slug } });
  if (isLoading || !cap.results) return null;

  const data = q.data as any;
  const available = !q.isError && !!data && data.released;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" aria-hidden /> The real picture
      </h2>
      {available ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">The community diagnostic report is ready — the honest read on where your community stands.</p>
            <Link href={`/results/${slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View the report <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden /> The diagnostic report unlocks once your membership is approved and results are released. You'll be notified.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "ResultsSection" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/ResultsSection.tsx && git commit -m "feat(3): add ResultsSection (report / locked)"`

---

### Task 6: `ConcernsSection`

**Files:** Create `src/components/home/ConcernsSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useListConcerns } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { AlertTriangle, ArrowRight } from "lucide-react";

// Phase 3: concerns. Gate: concerns capability.
export function ConcernsSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListConcerns({ query: { enabled: !!cap.concerns } });
  if (isLoading || !cap.concerns) return null;

  const concerns = (q.data as any)?.concerns ?? [];
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <AlertTriangle size={20} className="text-primary" aria-hidden /> Concerns
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">The patterns we&apos;ve seen — and add your own.</p>
          {concerns.length > 0 && <p className="mt-2 text-sm font-medium text-foreground">{concerns.length} raised by the community</p>}
          <Link href="/concerns" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Raise or review concerns <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "ConcernsSection" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/ConcernsSection.tsx && git commit -m "feat(3): add ConcernsSection"`

---

### Task 7: `SwitchedOnPromises`

**Files:** Create `src/components/home/SwitchedOnPromises.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useTenant } from "@/providers/tenant";
import { Card, CardContent } from "@/components/ui-polished";
import { Shield, BookOpen, Sparkles } from "lucide-react";

// Phase 3: honest "switched on as your school adopts VBE" cards for the
// whole-school capabilities a tenant hasn't turned on yet. Copy is placeholder.
const PROMISES: { cap: string; icon: typeof Shield; title: string; body: string }[] = [
  { cap: "safeguarding", icon: Shield, title: "Safeguarding & reporting", body: "Confidential reporting and incident handling — switched on when your school adopts VBE." },
  { cap: "lessons", icon: BookOpen, title: "Lessons & PSHE", body: "Values-based lessons for every class — switched on when your school adopts VBE." },
];

export function SwitchedOnPromises() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  if (isLoading) return null;

  const off = PROMISES.filter((p) => !cap[p.cap]);
  if (off.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Sparkles size={20} className="text-primary" aria-hidden /> More of Vibes
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {off.map((p) => (
          <Card key={p.cap} className="border-dashed">
            <CardContent className="p-5 opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <p.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-3 font-semibold text-foreground">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck 2>&1 | grep -E "SwitchedOnPromises" || echo OK` → `OK`.
- [ ] **Step 3: Commit** — `git add src/components/home/SwitchedOnPromises.tsx && git commit -m "feat(3): add SwitchedOnPromises section"`

---

### Task 8: `CommunityHome` composer + route swap + delete `ParentDashboard`

**Files:**
- Create: `src/pages/community-home.tsx`
- Modify: `src/pages/dashboard.tsx`
- Delete: `src/pages/dashboard/ParentDashboard.tsx`

- [ ] **Step 1: Create the composer**

Create `src/pages/community-home.tsx`:

```tsx
import { YoureInBanner } from "@/components/home/YoureInBanner";
import { VoiceSection } from "@/components/home/VoiceSection";
import { PtaSection } from "@/components/home/PtaSection";
import { ResultsSection } from "@/components/home/ResultsSection";
import { ConcernsSection } from "@/components/home/ConcernsSection";
import { ChildrenSafeguardingSection } from "@/components/home/ChildrenSafeguardingSection";
import { SwitchedOnPromises } from "@/components/home/SwitchedOnPromises";

// Phase 3: the parent community home — an ordered list of self-gating sections.
// Each renders live / locked / promised / nothing based on capability + data +
// membership state. Copy is placeholder (end-of-redesign content audit).
export default function CommunityHome() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <YoureInBanner />
      <VoiceSection />
      <PtaSection />
      <ResultsSection />
      <ConcernsSection />
      <ChildrenSafeguardingSection />
      <SwitchedOnPromises />
    </div>
  );
}
```

- [ ] **Step 2: Swap the parent route in `dashboard.tsx`**

In `src/pages/dashboard.tsx`: replace the import `import ParentDashboard from "./dashboard/ParentDashboard";` with `import CommunityHome from "./community-home";`, and change the parent branch (line ~74–75) from `<ParentDashboard user={user} />` to `<CommunityHome />`.

- [ ] **Step 3: Delete `ParentDashboard.tsx`**

```bash
git rm src/pages/dashboard/ParentDashboard.tsx
```
Then `grep -rn "ParentDashboard" src/` and confirm **no remaining references** (the only one was in `dashboard.tsx`, now removed).

- [ ] **Step 4: Verify typecheck + build**

```bash
pnpm typecheck 2>&1 | grep -E "community-home|dashboard.tsx|home/" || echo "OK: no new errors in changed files"
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5
```
Expected: typecheck `OK`; build + prerender succeed (the parent home is authed → not among prerendered routes; the build must compile it without error).

- [ ] **Step 5: Commit**

```bash
git add src/pages/community-home.tsx src/pages/dashboard.tsx
git commit -m "feat(3): route parent home to CommunityHome; remove ParentDashboard"
```

---

### Task 9: Holistic in-browser verification (orchestrator-run)

Run by the orchestrator (not a build subagent) using the preview MCP. No code; gates "done".

**Files:** none.

- [ ] **Step 1: Build + serve.** `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` from `artifacts/safeschool/`; `preview_start name=vibez-verify` (port 8095 — 8080 is taken by the Claude desktop app).
- [ ] **Step 2: Pending community parent.** Log in as a pending parent (the local DB seed has community parents; if needed set one `membership_status='pending'`). At `/`: `YoureInBanner` shows "awaiting approval" + the join counter; `VoiceSection`/`PtaSection` readable; `ResultsSection` 🔒 locked; PTA content shows the locked teaser; `SwitchedOnPromises` shows Safeguarding + Lessons (Morna caps off). `preview_console_logs` error → zero.
- [ ] **Step 3: Approved community parent.** Log in as `parent.a@safeschool.dev` / `password123` (approved). At `/`: results section shows either the report link (if released) or the locked card; PTA goals/initiatives/announcements read; concerns usable; no locked teaser. Zero console errors.
- [ ] **Step 4: Capability variations.** Via the preview/DB, temporarily flip Morna caps and revert: with only `voice` on (no `pta`) → VOICE section + "PTA" promise absent (PTA section hidden) ; with `safeguarding` on + a parent who has children linked (use the Riverside/whole-school demo parent) → `ChildrenSafeguardingSection` renders the live incident/behaviour widgets exactly as the old ParentDashboard did. Revert any DB changes.
- [ ] **Step 5: Regression.** `pta` exec still lands at `/pta`; coordinator/teacher/pupil dashboards unchanged; the 2a/2b/2c chrome + brand intact; a school-parent-with-children sees the safeguarding widgets identical to before. `preview_screenshot` the pending and approved community homes.
- [ ] **Step 6: Final commit** (only if Steps 2–5 surfaced fixes).

---

## Self-review notes (author)

- **Spec coverage:** the 7 sections (spec §3) → Tasks 1–7; composer + parent-route swap (§4) → Task 8; gates (§5: capability via `useTenant`, data via the list hooks, charter for VIBES-adoption, membership via `getMembershipState`) → embedded per section; `ParentDashboard` decomposition (§4/§6) → Tasks 1 + 8; SSR/authed-not-prerendered (§7) → Task 8 build note; verification (§8) → Task 9; staff/pupil/pta untouched (§2.1/§9) → only the parent branch changes; presentational-only gating (§7) → no API edits.
- **Type consistency:** every section reads `(tenant?.capabilities ?? {}) as any` then gates on the named flag; `getMembershipState(user)` used identically in `YoureInBanner`/`PtaSection`; list payloads unwrapped via `(q.data as any)?.<key> ?? []`; `useGetJoinSummary`/`useGetDiagnosticResults` take `(slug, opts)`, the rest `(opts)`; `ChildrenSafeguardingSection` is a **named** export (composer imports `{ ChildrenSafeguardingSection }`), `CommunityHome` is the **default** export (composer file) imported default in `dashboard.tsx`.
- **Out of scope (held):** staff/pupil dashboards; final copy (content audit); new endpoints / API capability-enforcement (Phase 4); the `/pta` exec home; any persisted maturity field.
```

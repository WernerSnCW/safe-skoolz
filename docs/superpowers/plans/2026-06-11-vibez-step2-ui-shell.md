# vibez Step 2 — UI/UX Shell Modernise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the logged-in vibez app feel like one modern product continuous with the SchoolVBE marketing site, by converging the app's visual language onto the site's and fixing the shell + site→app seam.

**Architecture:** Approach A — build a thin shared design layer first (`PageHeader`, converged `Card`, grouped nav, retired shield), then reskin shell → dashboards → login onto it. Pure presentational/structural work: no backend, API, schema, or dashboard business-logic changes. The "what's new" band reuses existing data hooks.

**Tech Stack:** React + Vite, wouter (routing), TailwindCSS with the `index.css` token system, `@/components/ui-polished` (Card/Button), `@workspace/api-client-react` (orval hooks), lucide-react icons, react-i18next, framer-motion.

**Spec:** `docs/superpowers/specs/2026-06-11-vibez-step2-ui-shell-design.md`

**Branch:** `feat/unified-app` (continue; ~20 commits, not pushed).

---

## Verification model (read before starting)

This repo has **no unit-test harness for visual/UI changes**. Each task is verified by:

1. **Build clean** — `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5` (exit 0, no new errors).
2. **Public-route regress (200s)** — only when shell/routing touched:
   ```bash
   for p in / /schools /parents /ptas /coalitions /resources /about; do /usr/bin/curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:8080$p; done
   ```
   (Restart server first if needed — see below.)
3. **Visual check** — log in via Vite dev (`:5173`, proxies `/api`→`:8080`) or drive `:8080`. Creds `pta.chair@safeschool.dev` / `password123` (pupil PIN `1234`). Check desktop + mobile widths.

**Server restart** (api-server has no watch): `cd ~/dev/safe-skoolz/artifacts/api-server; lsof -ti:8080 | xargs kill; set -a; . ../../.env; set +a; PORT=8080 NODE_ENV=production node dist/index.cjs` (wait ~5s for boot/seed). Step 2 changes are front-end only, so a rebuilt SPA is picked up by the running server after `pnpm build` in `safeschool` — no api-server rebuild needed unless noted.

**Gotchas:** use `/usr/bin/curl` (not on PATH in zsh funcs); `pnpm typecheck` fails on PRE-EXISTING issues — verify per-task with `build`, not typecheck. React HTML-encodes apostrophes (`&#x27;`) in prerendered output.

**Commit convention:** per coherent change, on `feat/unified-app`, trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File structure

**New files:**
- `artifacts/safeschool/src/components/layout/PageHeader.tsx` — shared authed page header (eyebrow + title + subtitle + action slot).
- `artifacts/safeschool/src/components/layout/nav-config.tsx` — grouped nav data (`NavItem`, `NavSection`, `getNavSections(role)`), extracted from `AppLayout`.
- `artifacts/safeschool/src/components/dashboard/WhatsNewBand.tsx` — the "Since you were last here" digest band.

**Modified files:**
- `components/layout/AppLayout.tsx` — retire shield; consume `getNavSections`; render grouped sidebar + pinned footer + SchoolVBE back-link.
- `components/ui-polished.tsx` — converge the polished `Card` base to `rounded-2xl` + softer shadow.
- `pages/dashboard/{TeacherDashboard,PupilDashboard,ParentDashboard,CoordinatorDashboard}.tsx` — `PageHeader` greeting + `WhatsNewBand` + accent-tile restyle.
- `pages/login.tsx` — split brand-warmth layout, restyled role-tabs, back-to-SchoolVBE, shield retired.

---

## Task 1: Retire the shield from the app brand spot

**Files:**
- Modify: `artifacts/safeschool/src/components/layout/AppLayout.tsx` (sidebar brand block ~L209-215; mobile header ~L272-276)

- [ ] **Step 1: Remove the gradient shield tile from the desktop sidebar brand block**

In `AppLayout.tsx`, replace the sidebar header block (the `<div className="p-6 flex items-center gap-3 border-b ...">` containing the gradient `ShieldCheck` tile + `BrandLockup`) with the lockup alone:

```tsx
<div className="p-6 flex items-center border-b border-border/50">
  <BrandLockup size="md" />
</div>
```

- [ ] **Step 2: Remove the shield from the mobile header**

Replace the mobile header brand block (`<div className="flex items-center gap-2"><ShieldCheck .../><BrandLockup size="sm" /></div>`) with:

```tsx
<BrandLockup size="sm" />
```

- [ ] **Step 3: Drop now-unused `ShieldCheck` import if no longer referenced**

`ShieldCheck` is still used as a nav-item icon (pta "Members & Officers", coordinator "Admin"). **Keep the import** — verify it's still referenced before removing. (It is — leave the import.)

- [ ] **Step 4: Build**

Run: `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5`
Expected: builds clean, no new errors.

- [ ] **Step 5: Visual check** — log in, confirm sidebar + mobile header show the "vibez by SchoolVBE" lockup with no shield, layout not broken.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/layout/AppLayout.tsx
git commit -m "refactor(vibez): retire safeguarding shield from app brand spot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Shared `PageHeader` component

**Files:**
- Create: `artifacts/safeschool/src/components/layout/PageHeader.tsx`
- Modify: `pages/dashboard/TeacherDashboard.tsx:80-86` (adopt it as proof)

- [ ] **Step 1: Create `PageHeader.tsx`**

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One header pattern for every authed page: a mono eyebrow, a display-font
// title, an optional subtitle, and an optional right-aligned action slot.
// Mirrors the marketing-site language (mono eyebrow + Quicksand display).
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            — {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Adopt in `TeacherDashboard`**

Replace the existing header block:

```tsx
<div>
  <h1 className="text-3xl font-display font-bold">{t("welcomeBack", { name: user.firstName })}</h1>
  <p className="text-muted-foreground mt-1">
    {isHoY ? t("headOfYearFor", { group: scopeLabel }) : t("classTeacherFor", { group: scopeLabel })} — {t("pupilsInYourCare", { count: totalPupils })}
  </p>
</div>
```

with:

```tsx
<PageHeader
  eyebrow={isHoY ? t("headOfYear") : t("classTeacher")}
  title={t("welcomeBack", { name: user.firstName })}
  subtitle={`${isHoY ? t("headOfYearFor", { group: scopeLabel }) : t("classTeacherFor", { group: scopeLabel })} — ${t("pupilsInYourCare", { count: totalPupils })}`}
/>
```

Add the import at top: `import { PageHeader } from "@/components/layout/PageHeader";`

> Note: `t("headOfYear")` / `t("classTeacher")` may not exist as keys. If a key is missing i18next renders the key string — acceptable for the eyebrow short-term, but prefer reusing an existing label. If unsure, set `eyebrow={isHoY ? "Head of year" : "Class teacher"}` (plain string) to avoid a raw key showing.

- [ ] **Step 3: Build** — `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5`. Expected: clean.

- [ ] **Step 4: Visual check** — log in as a teacher (or use a teacher demo); confirm the header renders with eyebrow + greeting + subtitle.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/layout/PageHeader.tsx artifacts/safeschool/src/pages/dashboard/TeacherDashboard.tsx
git commit -m "feat(vibez): shared PageHeader; adopt in TeacherDashboard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Converge the `ui-polished` Card

**Files:**
- Modify: `artifacts/safeschool/src/components/ui-polished.tsx` (the `Card` definition)

This updates the shared Card once, so every dashboard/page card converges to the marketing `rounded-2xl` + soft shadow automatically.

- [ ] **Step 1: Find the polished `Card` className**

Run: `grep -n "Card" artifacts/safeschool/src/components/ui-polished.tsx | head` to locate the `Card` forwardRef and its `cn(...)` base classes.

- [ ] **Step 2: Update the Card base classes**

Change the polished Card's base from its current `rounded-xl ... shadow` to the converged target. Set the base className to:

```
rounded-2xl border border-border bg-card text-card-foreground shadow-sm
```

Preserve any existing hover/transition props passed via `className` at call sites (they compose). Do **not** change `CardHeader`/`CardContent` padding.

- [ ] **Step 3: Build** — clean.

- [ ] **Step 4: Visual regression sweep** — log in and click through 3–4 pages that use polished cards (a dashboard, `/incidents`, `/messages`, `/pta`). Confirm cards now read as rounded-2xl + soft shadow and nothing is visually broken (no double-borders, no clipped corners).

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/ui-polished.tsx
git commit -m "refactor(vibez): converge polished Card to marketing rounded-2xl

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Grouped, hierarchical nav

**Files:**
- Create: `artifacts/safeschool/src/components/layout/nav-config.tsx`
- Modify: `artifacts/safeschool/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create `nav-config.tsx` with types + grouped builder**

Move the nav-item construction out of `AppLayout` into a builder that returns sections. Keep the exact same items/hrefs/icons as today — only group + order them. Footer items (`Notifications`, `Settings`) are returned separately.

```tsx
import {
  ShieldCheck, Home, AlertTriangle, FileText, Shield, Bell, Settings,
  Users, Activity, BookOpen, MessageCircle, ClipboardList, Gauge,
  ClipboardCheck, BookHeart, Megaphone, BookMarked, ScrollText, Presentation,
} from "lucide-react";

export type NavItem = { name: string; href: string; icon: any; badge?: number };
export type NavSection = { label: string | null; items: NavItem[] };

// t = i18next nav-namespace translator; counts passed in from AppLayout.
export function getNavSections(
  role: string,
  t: (k: string) => string,
  counts: { messageUnread: number; unreadCount: number },
): { sections: NavSection[]; footer: NavItem[] } {
  const { messageUnread, unreadCount } = counts;
  const home: NavItem = { name: t("dashboard"), href: "/", icon: Home };
  const footer: NavItem[] = [
    { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];

  if (role === "pupil") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Wellbeing", items: [
          { name: t("myDiary"), href: "/diary", icon: BookHeart },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
        ]},
        { label: "Safeguarding", items: [
          { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
        ]},
        { label: "People", items: [
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "parent") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
          { name: "PTA Updates", href: "/pta-updates", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "teacher" || role === "head_of_year" || role === "support_staff") {
    const classItem: NavItem =
      role === "support_staff"
        ? { name: t("myPupils"), href: "/class", icon: Users }
        : { name: role === "head_of_year" ? t("myYearGroup") : t("myClass"), href: "/class", icon: Users };
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          ...(role !== "support_staff" ? [{ name: t("alerts"), href: "/alerts", icon: Activity }] : []),
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          classItem,
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "senco") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("myCaseload"), href: "/caseload", icon: ClipboardList },
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          { name: t("protocols"), href: "/protocols", icon: Shield },
          { name: t("alerts"), href: "/alerts", icon: Activity },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("allPupils"), href: "/class", icon: Users },
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "pta") {
    return {
      sections: [
        { label: "PTA", items: [
          { name: t("ptaDashboard"), href: "/pta", icon: Home },
          { name: "Members & Officers", href: "/pta/governance", icon: ShieldCheck },
          { name: "Decision Log", href: "/pta/decisions", icon: ScrollText },
          { name: "Voting", href: "/pta/voting", icon: ClipboardList },
          { name: "Announcements", href: "/pta/announcements", icon: Megaphone },
        ]},
        { label: "Wellbeing", items: [
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
      ],
      footer,
    };
  }

  if (role === "coordinator" || role === "head_teacher") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          { name: t("protocols"), href: "/protocols", icon: Shield },
          { name: t("alerts"), href: "/alerts", icon: Activity },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("allPupils"), href: "/class", icon: Users },
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
        { label: "Admin", items: [
          { name: t("auditLog"), href: "/audit", icon: ScrollText },
          ...(role === "coordinator" ? [{ name: t("admin"), href: "/admin", icon: ShieldCheck }] : []),
        ]},
      ],
      footer,
    };
  }

  // Fallback: home only
  return { sections: [{ label: null, items: [home] }], footer };
}

// Flatten for the mobile bottom-nav priority logic (preserves existing behaviour).
export function flattenSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}
```

> This preserves every current item and href; it only adds grouping + order. The mobile `MOBILE_PRIORITY_HREFS` logic stays in `AppLayout` and consumes `flattenSections(...)`.

- [ ] **Step 2: Rewire `AppLayout` to consume `getNavSections`**

In `AppLayout.tsx`: delete the inline `getNavItems()` function. Import from nav-config:

```tsx
import { getNavSections, flattenSections, type NavItem } from "@/components/layout/nav-config";
```

Build sections + flat list:

```tsx
const { sections, footer } = getNavSections(role, t, { messageUnread, unreadCount });
const navItems = flattenSections(sections); // for mobile priority + dropdown
```

- [ ] **Step 3: Render grouped sidebar**

Replace the desktop sidebar nav body (`<div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">{navItems.map(...)}</div>`) with grouped rendering. Extract the existing item-row markup into a local `NavRow` to avoid duplication:

```tsx
function NavRow({ item, location }: { item: NavItem; location: string }) {
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} className="block">
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
        isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                 : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}>
        <div className="flex items-center gap-3 font-medium">
          <item.icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "text-primary-foreground")} />
          {item.name}
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
            isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground")}>
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}
```

Sidebar body:

```tsx
<div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
  {sections.map((section, i) => (
    <div key={section.label ?? `s${i}`} className={cn(section.label && "pt-3")}>
      {section.label && (
        <p className="px-4 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
          {section.label}
        </p>
      )}
      <div className="space-y-1">
        {section.items.map((item) => <NavRow key={item.name} item={item} location={location} />)}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Pinned footer — Notifications + Settings + SchoolVBE link + user/sign-out**

In the existing sidebar footer block (`<div className="p-4 border-t ...">`), ABOVE the user chip, add the footer nav items (Notifications + Settings) and a clean SchoolVBE back-link. Add `ExternalLink` to the lucide imports:

```tsx
<div className="space-y-1 mb-2">
  {footer.map((item) => <NavRow key={item.name} item={item} location={location} />)}
  <a href="/" target="_blank" rel="noopener"
     className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium">
    <ExternalLink size={18} />
    SchoolVBE
  </a>
</div>
```

Keep the existing user chip + Sign out button + "powered by Cloudworkz" line as-is below this block.

> Note: because `HomeRoute` sends authed users to the Dashboard at `/`, the "SchoolVBE" link should target the public marketing homepage. If `/` always resolves to the dashboard for an authed user, link to a public route the user can browse (e.g. `/about` or `/schools`) OR open `/` in a new tab with `target="_blank" rel="noopener"` so they can see the public site without logging out. **Use `target="_blank" rel="noopener"` on the SchoolVBE link** to avoid the auth-aware `/` bouncing them back to the dashboard.

- [ ] **Step 5: Mobile dropdown — add lightweight group dividers (optional, low-risk)**

The mobile dropdown currently maps `navItems`. Leave it mapping the flattened `navItems` (behaviour preserved). The mobile bottom-nav (`getMobileNavItems(navItems, role)`) is unchanged because `navItems` is still the flat list.

- [ ] **Step 6: Build** — clean.

- [ ] **Step 7: Public-route regress** (shell touched):
   ```bash
   for p in / /schools /parents /ptas /coalitions /resources /about; do /usr/bin/curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:8080$p; done
   ```
   Expected: all `200`. (Rebuild SPA already done in Step 6; restart server only if it died.)

- [ ] **Step 8: Visual check across roles** — log in as `pta.chair` (PTA groups), and use "Show me around" demos / seeded accounts for coordinator + parent + pupil. Confirm: grouped sidebar with mono labels, Home pinned top, Notifications/Settings/SchoolVBE pinned in footer, user chip + sign-out intact, mobile bottom-nav unchanged, no missing nav items vs. before.

- [ ] **Step 9: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/layout/nav-config.tsx artifacts/safeschool/src/components/layout/AppLayout.tsx
git commit -m "feat(vibez): grouped sidebar nav + pinned footer + back-to-site link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `WhatsNewBand` component (+ wire into TeacherDashboard)

**Files:**
- Create: `artifacts/safeschool/src/components/dashboard/WhatsNewBand.tsx`
- Modify: `pages/dashboard/TeacherDashboard.tsx`

The band takes pre-shaped digest items from the caller (each dashboard maps its own already-loaded data into items). The component is presentational + SSR-safe.

- [ ] **Step 1: Create `WhatsNewBand.tsx`**

```tsx
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type DigestTone = "info" | "primary" | "warning" | "destructive" | "pta";

export type DigestItem = {
  id: string;
  icon: any;          // lucide icon component
  tone: DigestTone;
  title: string;
  detail?: string;
  when?: string;
  href: string;       // deep-link target
  unread?: boolean;
};

const TONE: Record<DigestTone, string> = {
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  pta: "bg-role-pta/10 text-role-pta",
};

export function WhatsNewBand({
  items,
  heading = "Since you were last here",
  emptyLabel = "You're all caught up.",
}: {
  items: DigestItem[];
  heading?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-1.5">
      <p className="px-3 pt-2.5 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
        {heading}
      </p>
      {items.length === 0 ? (
        <p className="px-3 pb-3 pt-1 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        items.map((it) => (
          <Link key={it.id} href={it.href} className="block">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE[it.tone])}>
                <it.icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{it.title}</p>
                {it.detail && <p className="truncate text-xs text-muted-foreground">{it.detail}</p>}
              </div>
              {it.when && <span className="shrink-0 text-[10px] text-muted-foreground">{it.when}</span>}
              {it.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into TeacherDashboard from existing data**

Teacher already has `incidents` (recent, from `useListIncidents`) and message unread via the shared hook. Add the message hook + build digest items. Imports:

```tsx
import { WhatsNewBand, type DigestItem } from "@/components/dashboard/WhatsNewBand";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { MessageCircle, FileText as FileIcon } from "lucide-react"; // FileText already imported; reuse it
```

Inside the component, after data hooks:

```tsx
const { totalUnread: messageUnread } = useMessageNotifications();
const digest: DigestItem[] = [];
if (messageUnread > 0) {
  digest.push({
    id: "messages", icon: MessageCircle, tone: "info",
    title: t("newMessagesCount", { count: messageUnread, defaultValue: `${messageUnread} new messages` }),
    href: "/messages", unread: true,
  });
}
for (const inc of incidents.slice(0, 2)) {
  digest.push({
    id: `inc-${inc.id}`, icon: FileText,
    tone: inc.escalationTier === 3 ? "destructive" : inc.escalationTier === 2 ? "warning" : "info",
    title: `${t("incidents")}: ${(inc.category ?? "").split(",")[0]}`.trim(),
    detail: inc.referenceNumber, href: `/incidents/${inc.id}`,
  });
}
```

Render the band directly under the `PageHeader` (and above the action-card grid):

```tsx
<WhatsNewBand items={digest} heading={t("sinceLastHere", { defaultValue: "Since you were last here" })} emptyLabel={t("allCaughtUp", { defaultValue: "You're all caught up." })} />
```

> The `defaultValue` option makes missing i18n keys render readable English instead of the raw key. Use it for all new strings in this Step.

- [ ] **Step 3: Build** — clean.

- [ ] **Step 4: Visual check** — teacher view shows the band with messages/incident rows that deep-link; empty state reads "You're all caught up."

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/dashboard/WhatsNewBand.tsx artifacts/safeschool/src/pages/dashboard/TeacherDashboard.tsx
git commit -m "feat(vibez): WhatsNewBand digest; wire into TeacherDashboard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Apply header + band + restyle to the remaining dashboards

Repeat the Task-2 (`PageHeader`) + Task-5 (`WhatsNewBand`) pattern in `PupilDashboard`, `ParentDashboard`, `CoordinatorDashboard`. **No data/logic changes** — only swap the header block for `PageHeader`, insert the band fed from each role's already-loaded data, and replace any in-content `glass-panel`/`rounded-xl` ad-hoc cards with the polished `Card` (already converged in Task 3) or the `bg-accent` icon-tile convention. Do one dashboard per commit.

**Per-role digest feed (from spec §3, using already-loaded data only):**
- **Pupil:** unread messages → `/messages`; latest noticeboard/learnings item → `/learnings`; diary nudge → `/diary`. Tone `info`/`primary`.
- **Parent:** unread messages → `/messages`; incident updates about their child (from the dashboard's incident data) → `/incidents/:id`; PTA/noticeboard → `/pta-updates`. Tones `info`/`warning`/`pta`.
- **Coordinator/Head/SENCO** (`CoordinatorDashboard`, no `user` prop — read `useAuth().user` if a name is needed for the greeting): unread messages → `/messages`; incidents needing attention → `/incidents`; alerts → `/alerts`. Tones `info`/`warning`/`destructive`.

- [ ] **Step 6a: PupilDashboard** — add `PageHeader` (eyebrow "Pupil", title `welcomeBack`), `WhatsNewBand` from pupil data, restyle ad-hoc cards. Build → visual check (pupil PIN `1234`) → commit `feat(vibez): PupilDashboard header + WhatsNewBand + restyle`.

- [ ] **Step 6b: ParentDashboard** — same pattern; eyebrow "Parent", greeting referencing the child where the data already provides it. Build → visual check → commit `feat(vibez): ParentDashboard header + WhatsNewBand + restyle`.

- [ ] **Step 6c: CoordinatorDashboard** — `CoordinatorDashboard` takes no `user` prop; pull `const { user } = useAuth();` for the greeting name. Eyebrow = role-appropriate ("Coordinator"/"Head teacher"/"SENCO" from `user.role`). Build → visual check → commit `feat(vibez): CoordinatorDashboard header + WhatsNewBand + restyle`.

> For each: after editing, run the build (`PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5`), confirm clean, log in to the relevant role, confirm header + band + cards render and digest rows deep-link, then commit. If a dashboard's existing data doesn't cleanly supply a feed source, omit that row (don't add new fetches) — the band gracefully shows fewer items or the empty state.

---

## Task 7: Login split layout + seam

**Files:**
- Modify: `artifacts/safeschool/src/pages/login.tsx`

Goal: replace the centered-card + rotated gradient-shield with a split layout (brand-warmth panel + form), keep the role-tabs and their role tints, add "← Back to SchoolVBE", retire the shield.

- [ ] **Step 1: Replace the page wrapper + decorative shield with a split grid**

The current root is `<div className="min-h-screen w-full flex bg-background relative overflow-hidden">` with a decorative gradient (~L429) and a rotated `rounded-3xl` gradient `ShieldCheck` tile (~L440). Restructure to a two-column grid that stacks on mobile:

```tsx
<div className="min-h-screen w-full grid md:grid-cols-2 bg-background">
  {/* Brand-warmth panel */}
  <div className="relative hidden md:flex flex-col justify-between p-10 text-white"
       style={{ background: "linear-gradient(150deg,#0A4EC0,#126AF9 55%,#1EF4F4)" }}>
    <a href="/" target="_blank" rel="noopener" className="text-sm font-bold/relaxed opacity-90 hover:opacity-100">← Back to SchoolVBE</a>
    <div>
      <BrandLockup size="lg" className="text-white" />
      <p className="mt-4 max-w-xs text-lg font-semibold">New School Vibez, Old School Values.</p>
      <p className="mt-3 max-w-sm text-sm text-white/85">The safeguarding, PSHE &amp; wellbeing platform for VBE schools.</p>
    </div>
    <p className="text-xs text-white/70">Everything on SchoolVBE is free. vibez is the platform schools deploy after adopting VBE.</p>
  </div>

  {/* Form column */}
  <div className="flex flex-col px-6 py-10 sm:px-10">
    <a href="/" target="_blank" rel="noopener" className="md:hidden text-sm font-bold text-primary mb-6">← Back to SchoolVBE</a>
    {/* existing <Card> with tabs + form goes here, shield tile removed */}
  </div>
</div>
```

Import `BrandLockup`: `import { BrandLockup } from "@/components/brand/BrandLockup";`. Remove the rotated gradient-shield block and the full-bleed decorative gradient overlay. Keep `ShieldCheck` import only if still used elsewhere in the file; otherwise drop it.

> `BrandLockup` uses `from-primary to-secondary` gradient text — on the blue panel pass `className="text-white"` won't recolour the gradient text. If the wordmark is illegible on the gradient, render a plain white variant inline here (`<span className="font-brand italic text-5xl text-white">vibez</span><span className="block text-xs uppercase tracking-wide text-white/80">by SchoolVBE</span>`) instead of `BrandLockup`. Decide visually in Step 3.

- [ ] **Step 2: Restyle the tabs + Card onto the converged language**

Keep the 4 role tabs (`activeTab` state, the `.map` over tab defs ~L464-484) and the per-tab role-tinted info panels (`bg-role-pupil/10` etc. — these are the deliberate role tints, keep them). Move the `Card` (currently `shadow-2xl ... bg-background/80 backdrop-blur-xl`) to the plain converged card: `className="border-border bg-card shadow-sm"`. Keep all form logic, MFA flow, demo "Show me around" CTA, and submit handlers untouched.

- [ ] **Step 3: Build + visual check (desktop & mobile)**

Build clean. Then visually verify at `:8080/login` (and a narrow mobile width): brand panel left / form right on desktop; on mobile the brand panel is hidden and the form shows the back-link; tabs switch role panels with their tints; the rotated shield is gone; "Back to SchoolVBE" opens the public site in a new tab; login + "Show me around" still work.

- [ ] **Step 4: Public-route regress** (login is public-adjacent; confirm nothing broke):
   ```bash
   for p in / /schools /login /about; do /usr/bin/curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:8080$p; done
   ```
   Expected: `/ /schools /about` = 200; `/login` = 200 (SPA shell).

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/pages/login.tsx
git commit -m "feat(vibez): split login with brand-warmth panel + back-to-SchoolVBE seam

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Full build clean: `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5`.
- [ ] Public-route regress all 200: `for p in / /schools /parents /ptas /coalitions /resources /about; do /usr/bin/curl -s -o /dev/null -w "$p %{http_code}\n" http://localhost:8080$p; done`.
- [ ] Per-role visual pass (pupil, parent, teacher, coordinator, pta) on desktop + mobile: grouped nav, no shield, dashboard greeting + band, converged cards, login seam.
- [ ] `git log --oneline` shows one coherent commit per task on `feat/unified-app`.
- [ ] Update project memory (`schoolvbe-program.md`) with a "Step 2 DONE" entry noting the new shared components and the deferred items (collapsible nav groups, accent-palette tokenisation).

## Notes / deferred (from spec)

- Collapsible nav groups — deferred (always-expanded in Step 2).
- Accent-palette tokenisation (`cat-*`/`role-*`) — deferred unless a clash appears during restyle.
- No backend/API/schema changes anywhere in this plan.
- Step 3 (all-in demo + VOICE feature) is the next step after this.

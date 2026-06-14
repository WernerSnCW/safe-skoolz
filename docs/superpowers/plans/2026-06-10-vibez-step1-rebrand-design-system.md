# vibez Step 1 — Rebrand + Design-System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the logged-in app read unmistakably as *vibez (part of the SchoolVBE family)* by finishing the "safeskoolz" rebrand, adding a "vibez by SchoolVBE" lockup, and single-sourcing the colour palette — without changing app structure or features.

**Architecture:** Pure front-end work in `artifacts/safeschool` (the unified site+app). No api-server changes, no schema, no new dependencies. Two-names brand model: **SchoolVBE** = public funnel (untouched, lives in `PublicLayout`), **vibez** = the product (every old "safeskoolz" product-name → "vibez"). Verification is grep-assertion + production build + curl regression + browser spot-check (this is a rebrand/CSS task, not unit-testable logic).

**Tech Stack:** React + TypeScript, Vite 7, Tailwind v4 (CSS-first `@theme` in `src/index.css`), wouter, react-i18next (locales in `src/locales/{en,es,fr,nl}`), Kenyan Coffee `.font-brand` wordmark.

**Spec:** `docs/superpowers/specs/2026-06-10-vibez-step1-rebrand-design-system-design.md`

**Hard exclusions (never touch in this plan):**
- `@safeschool.dev` email addresses (functional demo credentials).
- Code identifiers / i18n key names / storage keys (`safeschool_token`, `safeschool_theme`, `safeschool_start_demo`, `safeschool-message`, TS props like `whatSafeskoolzShows`).
- The `login.tsx` role-tab accent palette (teal/indigo/amber/purple, ~lines 520–578) — deferred to Step 2.

**Brand style:** the wordmark is always lowercase **`vibez`**, even at the start of a sentence.

**Run context (this machine):** unified server must run `NODE_ENV=production`; `curl` is not on PATH inside zsh functions → use `/usr/bin/curl`; React encodes apostrophes as `&#x27;` in prerendered HTML.

---

## Task 1: Add `--success` token + fix stale teal in `index.css`

**Files:**
- Modify: `artifacts/safeschool/src/index.css`

- [ ] **Step 1: Add the `--color-success` mappings to the `@theme inline` block**

In `src/index.css`, inside `@theme inline { … }`, immediately after the two `--color-warning*` lines (currently lines ~32–33), add:

```css
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
```

- [ ] **Step 2: Add the success HSL vars to `:root` and fix the palette comment**

In `:root`, change the comment on the first palette line from:

```css
  /* Calming Teal & Soft Blue Palette */
```

to:

```css
  /* vibez blue palette (single source of truth) */
```

Then, in `:root`, immediately after the two `--warning*` lines (currently ~73–74), add:

```css
  --success: 152 69% 40%;          /* emerald 600 — positive/success state */
  --success-foreground: 210 40% 98%;
```

- [ ] **Step 3: Add the success vars to `.dark` and fix the stale teal ring**

In `.dark`, immediately after the two `--warning*` lines (currently ~108–109), add:

```css
  --success: 152 60% 50%;          /* emerald (dark mode) */
  --success-foreground: 222 47% 11%;
```

Then, in `.dark`, change the ring line from:

```css
  --ring: 173 80% 46%;
```

to:

```css
  --ring: 217 92% 62%;             /* vibez blue (dark mode) — matches --primary */
```

- [ ] **Step 4: Verify the build still compiles the CSS**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5
```
Expected: build succeeds (`built in …`, prerender lists the 7 routes). No "unknown utility class" errors.

- [ ] **Step 5: Verify `text-success` resolves (no stale teal ring left)**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && grep -n "173 80% 46%" src/index.css || echo "OK: stale teal ring gone"
grep -n -- "--success" src/index.css | wc -l   # expect 6 (2x @theme map + 2x :root + 2x .dark)
```
Expected: "OK: stale teal ring gone" and count `6`.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/index.css
git commit -m "feat(vibez): add --success token, fix stale teal ring + palette comment

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `BrandLockup` component + wire into shell & login

**Files:**
- Create: `artifacts/safeschool/src/components/brand/BrandLockup.tsx`
- Modify: `artifacts/safeschool/src/components/layout/AppLayout.tsx` (sidebar ~208–216; mobile header ~273–277)
- Modify: `artifacts/safeschool/src/pages/login.tsx` (~440–442)

- [ ] **Step 1: Create the `BrandLockup` component**

Create `src/components/brand/BrandLockup.tsx`:

```tsx
import { cn } from "@/lib/utils";

// The vibez wordmark with a quiet "by SchoolVBE" endorsement, so the app
// always reads as part of the SchoolVBE family (two-names, one-system brand
// model). Used in the sidebar, mobile header, and login. Text-only — no asset.
export function BrandLockup({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const wordmark = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl",
  }[size];
  const endorse = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  }[size];

  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-brand tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary",
          wordmark,
        )}
      >
        vibez
      </span>
      <span className={cn("font-display font-medium uppercase tracking-wide text-muted-foreground", endorse)}>
        by SchoolVBE
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Use the lockup in the desktop sidebar**

In `src/components/layout/AppLayout.tsx`, replace the sidebar wordmark span:

```tsx
          <span className="font-brand text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            vibez
          </span>
```

with:

```tsx
          <BrandLockup size="md" />
```

- [ ] **Step 3: Use the lockup in the mobile header (kills the `safeskoolz` text)**

In `src/components/layout/AppLayout.tsx`, replace the mobile-header brand block:

```tsx
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={24} />
          <span className="font-display font-bold text-lg">safeskoolz</span>
        </div>
```

with:

```tsx
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={24} />
          <BrandLockup size="sm" />
        </div>
```

- [ ] **Step 4: Import `BrandLockup` in AppLayout**

In `src/components/layout/AppLayout.tsx`, add to the import block near the top (after the `cn` import on line ~5):

```tsx
import { BrandLockup } from "@/components/brand/BrandLockup";
```

- [ ] **Step 5: Use the lockup on the login page**

In `src/pages/login.tsx`, replace the wordmark `<h1>` (~line 442):

```tsx
          <h1 className="font-brand text-5xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">vibez</h1>
```

with:

```tsx
          <BrandLockup size="lg" className="items-center" />
```

Then add the import near the top of `login.tsx` (after the existing `@/` imports):

```tsx
import { BrandLockup } from "@/components/brand/BrandLockup";
```

- [ ] **Step 6: Build and verify**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5
grep -rn "by SchoolVBE" src/components/brand/BrandLockup.tsx && echo "lockup present"
grep -n "safeskoolz" src/components/layout/AppLayout.tsx || echo "OK: no safeskoolz in AppLayout"
```
Expected: build succeeds; "lockup present"; "OK: no safeskoolz in AppLayout".

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/components/brand/BrandLockup.tsx artifacts/safeschool/src/components/layout/AppLayout.tsx artifacts/safeschool/src/pages/login.tsx
git commit -m "feat(vibez): 'vibez by SchoolVBE' lockup in sidebar, mobile header, login

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Rebrand user-visible prose `safeskoolz` → `vibez` (app .tsx pages)

**Transformation:** in JSX text / attribute strings only, replace the standalone product name `safeskoolz` → `vibez` and `Safeskoolz` → `vibez` (always lowercase result). **Do not** touch: `@safeschool.dev` emails, `*_token`/storage keys, TS identifiers/props, import paths, i18n key names.

**Files & exact occurrences to change** (verified inventory):
- `src/pages/forgot-password.tsx:52` — "…on your Safeskoolz account…" → "…on your vibez account…"
- `src/pages/training.tsx` lines 164, 165, 193, 217, 293, 476, 482, 484, 494, 505, 558, 560, 561, 562 (all prose `safeskoolz` → `vibez`)
- `src/pages/learn.tsx:44` — "Using safeskoolz" → "Using vibez"
- `src/pages/admin.tsx:76` — `aria-label="View safeskoolz as a pupil"` → `aria-label="View vibez as a pupil"`
- `src/pages/my-class.tsx` lines 246, 256, 262 (printed PIN-slip HTML strings) → `vibez`
- `src/pages/education.tsx` lines 403, 443, 593, 664, 761, 802, 819, 831, 842, 901, 955, 1018, 1020 → `vibez`
- `src/pages/case-studies.tsx` lines 413, 502, 517, 592, 625, 650 (prose only — **leave** the `whatSafeskoolzShows` TS property on lines 24, 47, 122, 195, 268, 341, 417, 595)
- `src/pages/how-it-works.tsx` lines 167, 173, 291, 554, 805, 1298, 1493 → `vibez`
- `src/pages/login.tsx` — **none here** (its only visible "Safeskoolz" comes from the `whatSafeskoolzDoes` i18n value, handled in Task 4; the `@safeschool.dev` emails on lines 941–956 are excluded).

- [ ] **Step 1: Apply the replacements file-by-file**

For each file above, open it and replace each listed prose occurrence of `safeskoolz`/`Safeskoolz` with `vibez`. Worked example (`training.tsx:164`):

```tsx
// before
          <h2 className="text-xl font-display font-bold">Welcome to safeskoolz</h2>
// after
          <h2 className="text-xl font-display font-bold">Welcome to vibez</h2>
```

Worked example (`education.tsx:443`):

```tsx
// before
            <li><strong>Use safeskoolz</strong> — you can report what you saw, even if it didn't happen to you</li>
// after
            <li><strong>Use vibez</strong> — you can report what you saw, even if it didn't happen to you</li>
```

- [ ] **Step 2: Verify no prose `safeskoolz` remains (only excluded identifiers/emails)**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
grep -rniE "safe ?skoolz|safe ?school" src --include="*.tsx" \
  | grep -viE "getItem|setItem|removeItem|localStorage|sessionStorage|_token|_theme|_start_demo|Notification\(|tag:|import |from \"|@safeschool\.dev|whatSafeskoolzShows"
```
Expected: **no output** (every remaining match is an excluded identifier, storage key, or `@safeschool.dev` email).

- [ ] **Step 3: Build**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/dev/safe-skoolz && git add -A artifacts/safeschool/src/pages
git commit -m "rebrand: safeskoolz -> vibez in app page prose (emails/identifiers preserved)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Rebrand locale **values** `safeskoolz` → `vibez` (en/es/fr/nl)

**Transformation:** in `src/locales/**/*.json`, replace `safeskoolz` → `vibez` inside **values only** (never key names). Keys like `whatSafeskoolzDoes`, `usingSafeskoolz` stay; their string values change.

**Files & lines (verified inventory):**
- `en/login.json:6,53`; `en/learn.json:3`; `en/tour.json:55,71,72,112,315`; `en/pta.json:33`; `en/howItWorks.json:3,12,18,130,132,219,329`
- `es/login.json:6,53`; `es/learn.json:3`; `es/tour.json:55,71,72,112,315`; `es/howItWorks.json:3,12,18,130,132,219,329`
- `fr/login.json:6,53`; `fr/learn.json:3`
- `nl/login.json:6,53`; `nl/learn.json:3`

- [ ] **Step 1: Apply the value replacements**

For each file/line above, replace `safeskoolz` with `vibez` in the value. Worked example (`en/login.json:6`):

```json
// before
  "whatSafeskoolzDoes": "What safeskoolz does for you",
// after
  "whatSafeskoolzDoes": "What vibez does for you",
```

Worked example (`es/howItWorks.json:130`):

```json
// before
      "title": "safeskoolz une los puntos",
// after
      "title": "vibez une los puntos",
```

- [ ] **Step 2: Verify no `safeskoolz` remains in any locale value**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && grep -rniE "safe ?skoolz" src/locales || echo "OK: locales clean in all languages"
```
Expected: "OK: locales clean in all languages".

- [ ] **Step 3: Confirm JSON is still valid (build parses locales)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && for f in $(grep -rl "vibez" src/locales); do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "INVALID: $f"; done; echo "json check done"
```
Expected: "json check done" with no "INVALID" lines.

- [ ] **Step 4: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/locales
git commit -m "rebrand: safeskoolz -> vibez in locale values (en/es/fr/nl)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Migrate `emerald` success classes → `success` token + login brand-teal → `primary`

**Mapping rule (apply per occurrence; collapse light+dark pairs into one token class):**

| Hardcoded class pattern | Replace with |
|---|---|
| `bg-emerald-50`, `bg-emerald-100`, `bg-emerald-950/<n>` (light tint bg + its dark pair) | `bg-success/10` |
| `text-emerald-600/700/800` (+ dark `text-emerald-300/400`) | `text-success` |
| `border-emerald-200/400/800` | `border-success/30` |
| `from-emerald-400/<n>`, `to-teal-400/<n>` (gradient) | `from-success/15`, `to-success/5` |
| `text-emerald-500` (icon) | `text-success` |

The `--success` token is dark-mode-aware (Task 1), so the separate `dark:*-emerald-*` classes are **removed**, not replaced.

**Files & lines (verified inventory — emerald = success):**
- `src/pages/learn-pupil.tsx`: 34, 35, 36, 66
- `src/pages/learn-present.tsx`: 235, 315, 323, 338
- `src/pages/learn-lesson.tsx`: 421, 442, 464

**Brand teal (→ primary):**
- `src/pages/login.tsx:422` — `bg-teal-700` / `bg-teal-600` (badge) → `bg-primary` / `bg-primary` (drop the hover shade or use `hover:bg-primary/90`).

**Excluded (Step 2, do NOT touch):** `login.tsx` lines 520, 521, 524, 528, 532 (teal role-tab accent).

- [ ] **Step 1: Migrate the emerald success classes**

Open each file/line above and rewrite per the mapping table. Worked example (`learn-lesson.tsx:421`):

```tsx
// before
        className="rounded-xl border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4"
// after
        className="rounded-xl border border-success/30 bg-success/10 p-4"
```

Worked example (`learn-present.tsx:235`):

```tsx
// before
            <Check className="text-emerald-500" />
// after
            <Check className="text-success" />
```

- [ ] **Step 2: Migrate the login brand-teal badge (line 422 only)**

```tsx
// before (login.tsx:422 — the small badge)
          <span className="… bg-teal-700 … hover:bg-teal-600 …">
// after
          <span className="… bg-primary … hover:bg-primary/90 …">
```

- [ ] **Step 3: Verify only the deferred login role-tab teal remains**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
echo "--- emerald should be GONE ---"
grep -rnE "(text|bg|border|ring|from|via|to|fill|stroke|shadow)-emerald-" src --include="*.tsx" || echo "OK: no emerald left"
echo "--- teal should remain ONLY on login role tabs (lines ~520-532) ---"
grep -rnE "(text|bg|border|ring|from|via|to|fill|stroke|shadow)-teal-" src --include="*.tsx"
```
Expected: "OK: no emerald left"; the only remaining `teal` matches are `login.tsx` lines ~520–532 (the deferred role-tab palette). No `teal` on line 422 or anywhere else.

- [ ] **Step 4: Build**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build 2>&1 | tail -5
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add -A artifacts/safeschool/src/pages
git commit -m "refactor(vibez): emerald success states -> --success token; login badge -> primary

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Full verification + regression + browser spot-check

**Files:** none (verification only).

- [ ] **Step 1: Final rebrand grep (success criterion 1)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
echo "--- visible prose/locale safeskoolz (expect none) ---"
grep -rniE "safe ?skoolz" src --include="*.tsx" --include="*.json" \
  | grep -viE "getItem|setItem|removeItem|localStorage|sessionStorage|_token|_theme|_start_demo|Notification\(|tag:|whatSafeskoolzShows|whatSafeskoolzDoes|usingSafeskoolz" \
  || echo "OK: no visible safeskoolz anywhere"
```
Expected: "OK: no visible safeskoolz anywhere" (remaining matches are only the excluded i18n KEY names and storage identifiers).

- [ ] **Step 2: Restart the unified server (production mode)**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server
lsof -ti:8080 | xargs kill 2>/dev/null
set -a; . ../../.env; set +a
PORT=8080 NODE_ENV=production node dist/index.cjs &
sleep 2
```
Expected: "Server listening on port 8080" + "Serving front end from …/dist/public".

- [ ] **Step 3: Regression — public prerendered routes + api still 200**

```bash
C=/usr/bin/curl
for p in / /schools /parents /ptas /coalitions /resources /about; do
  echo "$p -> $($C -s -o /dev/null -w '%{http_code}' http://localhost:8080$p)"
done
echo "/api/healthz -> $($C -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/healthz)"
```
Expected: every route `200`.

- [ ] **Step 4: Browser spot-check the logged-in shell**

Log in at `http://localhost:8080/login` as `pta.chair@safeschool.dev` / `password123`. Confirm:
- Login page shows the **"vibez by SchoolVBE"** lockup (not a bare "vibez", no "safeskoolz").
- Desktop sidebar + mobile header (narrow the window) show the lockup; "Powered by Cloudworkz" still in the sidebar footer.
- A lesson "correct/complete" state renders **green** (success token), not blue.
- No "safeskoolz" anywhere (check the training/how-to pages).

- [ ] **Step 5: Update project memory**

Append to the memory file `~/.claude/projects/-Users-thomasking-Documents-Co-Work-Reset/memory/schoolvbe-program.md`: Step 1 (rebrand + design-system) complete — `--success` token added, lockup shipped, app prose + 4-language locales rebranded vibez, emerald→success/login badge→primary; login role-tab palette deferred to Step 2.

- [ ] **Step 6: Final confirmation (no extra commit needed — Tasks 1–5 already committed)**

```bash
cd ~/dev/safe-skoolz && git log --oneline -6 && git status --short
```
Expected: 5 new Step-1 commits on `feat/unified-app`; clean working tree (dist is gitignored).

---

## Self-review notes (author)

- **Spec coverage:** scope §1 (rebrand prose+locales) → Tasks 3–4; §2 (lockup) → Task 2; §3 (palette: `--success`, ring, comment, emerald→token, brand-teal→primary, role-tabs deferred) → Tasks 1 & 5; §4 (keep Cloudworkz) → verified Task 6 Step 4. Success criteria 1→T6S1, 2→T2/T6S4, 3→T1/T5/T6S3, 4→T6S4, 5(no session breakage)→storage keys untouched throughout.
- **Placeholders:** none — every edit has exact file/line + before/after or an explicit mapping table with a worked example.
- **Consistency:** token name `--success` / class `success` used identically across Tasks 1 and 5; `BrandLockup` signature (`size`, `className`) consistent across Task 2 usages.

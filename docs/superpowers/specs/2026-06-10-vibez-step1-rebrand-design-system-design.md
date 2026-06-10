# Step 1 — Finish the rebrand + single-source the design system

**Date:** 2026-06-10
**Branch:** `feat/unified-app`
**Status:** Design approved (pending spec review)
**Part of:** the "unify the SchoolVBE site + vibez app into one product" initiative (3 sequenced steps — see *Context*).

---

## Context

The SchoolVBE marketing site and the vibez app now live in **one codebase** (`artifacts/safeschool`) and are served by one Node process (unified-app Phases 1–3). The owner's feedback: logged in, it still "looks like the old SafeSchool app rebranded." Diagnosis: the features exist but the **rebrand is half-finished**, the **palette is not single-sourced**, and the two halves feel disconnected.

The work is sequenced into three steps, each its own spec → plan → build cycle:

1. **(this spec) Finish the rebrand + single-source the design system** — make the app unmistakably *vibez*, kill the leftovers, unify the colour source of truth.
2. **Site → app as one journey** — shared shell/language, public resources flowing into the app, a unified in-app hub (replaces role silos).
3. **All-in demo (capstone)** — a guided tour across diagnostic → VOICE → PTA voting → PSHE → reporting, including building the in-app **VOICE** feature.

### Brand model (decided)

**Two names, one system.** Keep **SchoolVBE** (the free public funnel / the methodology and movement) and **vibez** (the paid app deployed after a school adopts VBE). They tell the story *adopt the methodology → run it with the tool*, and they protect the "everything on SchoolVBE is free; vibez is the one paid product" line. Unification is achieved through a **shared visual system, consistent tone, and an endorsement lockup** — not by collapsing to one name.

---

## Goal

Make the logged-in app read unmistakably as *vibez, part of the SchoolVBE family*, and remove the "old SafeSchool reskinned" impression — **without changing app structure, navigation, or features** (those are Steps 2–3).

## Non-goals (deferred on purpose)

- App-shell UX redesign / unified hub → **Step 2**.
- Building the **VOICE** feature → **Step 3**.
- Porting more public marketing pages (`/schools/*`, `/how-it-works`) → the separate Phase 3 porting track.
- Renaming **internal storage keys** (`safeschool_token`, `safeschool_theme`, `safeschool_start_demo`, the `safeschool-message` notification tag, etc.). These are invisible to users; renaming the token key would invalidate live sessions / log everyone out for zero visible benefit. **Left untouched.** (Optional, careful, separately-planned migration far later.)

---

## Scope

### 1. Rebrand user-visible "safeskoolz / Safeskoolz" → "vibez"

Replace only occurrences **rendered to a user** (JSX text, alt/aria text, and i18n locale values). Confirmed targets:

- `src/components/layout/AppLayout.tsx` — mobile header currently renders the literal text `safeskoolz` (~line 276). Replace with the vibez lockup (see §2).
- `src/pages/training.tsx` — "Welcome to safeskoolz" heading.
- `src/pages/forgot-password.tsx` — "…on your Safeskoolz account…".
- i18n locale values in **all four languages** (`src/locales/{en,es,fr,nl}/`): at minimum `login.json` (`whatSafeskoolzDoes`, `protectedBy`), `learn.json` (`usingSafeskoolz`), and `tour.json` titles/descriptions. A full grep sweep of locale JSON values is part of the work.

**Rule:** brand the product as **vibez** (lowercase, as the existing wordmark). Where a sentence references "the app/service," prefer "vibez." Do **not** touch code identifiers, storage keys, or import paths.

### 2. "vibez by SchoolVBE" endorsement lockup

Introduce one consistent shell brand treatment so the app always reads as part of the family:

- **Desktop sidebar** (`AppLayout.tsx`): the `vibez` wordmark (Kenyan Coffee `.font-brand`, existing gradient is fine) with a small, muted **"by SchoolVBE"** beneath/beside it.
- **Mobile header** (`AppLayout.tsx`): same lockup, scaled down (this replaces the `safeskoolz` text).
- **Login** (`src/pages/login.tsx`): the same lockup in the brand area.

Keep it lightweight (text lockup; no new logo asset required). Define it once as a small `BrandLockup` component if it's used in 3 places, to avoid drift.

### 3. Single-source the palette

- Fix the stale teal **dark-mode `--ring`** in `src/index.css` (currently `173 80% 46%`) → the blue ring value used in `:root` (`217 90% 52%`-equivalent for dark).
- Fix the misleading `/* Calming Teal & Soft Blue Palette */` comment to reflect the vibez blue system.
- **Add a `--success` token** (light + dark) in `index.css` `@theme`/`:root`/`.dark`, plus the `--color-success` / `--color-success-foreground` mappings. Rationale: there is a `--warning` token but no `--success`, so existing green/emerald classes are doing "positive/success" duty. They must map to `--success`, **not** to the blue brand, or positive states would turn blue.
- Migrate the ~73 hardcoded `teal*` / `emerald*` Tailwind colour classes in user-visible components to semantic tokens:
  - brand teal → `primary` / `secondary` / `accent`,
  - success/positive green → the new `success` token.
  Lead with the memory-flagged offenders (admin role pill, login role panels). Each swap is verified visually (some greens are genuinely "success," not brand — classify before swapping).

### 4. Retain "Powered by Cloudworkz"

Confirmed intentional. Keep the existing `poweredByCloudworkz` footer credit; ensure it renders consistently.

---

## Success criteria

1. **No user-visible** `safeskoolz` / `Safeskoolz` / `SafeSchool` string anywhere in the running app, in **all 4 languages**. Verify: grep of JSX text + `src/locales/**/*.json` *values*, plus an in-browser spot-check of login, training, forgot-password, mobile header, and the demo tour.
2. The **"vibez by SchoolVBE" lockup** appears consistently in the desktop sidebar, mobile header, and login.
3. **Palette single-sourced:** no `teal*`/`emerald*` colour classes remain in user-visible components; dark-mode `--ring` is blue; `--success` token exists and is used for positive states (success states still render green, not blue).
4. **"Powered by Cloudworkz"** still present.
5. **No regressions:** production build is clean; the unified server still serves `/`, `/schools`, `/parents`, `/ptas`, `/coalitions`, `/resources`, `/about` (prerendered) and `/api/*`; login works; **no session breakage** (storage keys untouched — an already-logged-in user stays logged in across the change).

## Verification approach

- `grep -rni 'safeskoolz\|safeschool' src --include=*.tsx --include=*.ts` returns **only** code identifiers / storage keys (no JSX text); a values-only sweep of `src/locales/**/*.json` returns nothing.
- `grep -rniE '(text|bg|border|ring|from|to|via)-(teal|emerald)-' src` returns nothing in user-visible components.
- Production build (`PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` in `artifacts/safeschool`) succeeds.
- Restart the api-server (`cd artifacts/api-server; set -a; . ../../.env; set +a; PORT=8080 NODE_ENV=production node dist/index.cjs`) and `/usr/bin/curl` the public routes (200 + prerendered hero) as a regression check.
- Browser spot-check of the logged-in shell (login `pta.chair@safeschool.dev` / `password123`) for the lockup and absence of leftovers.

## Risks / notes

- **i18n completeness:** missing one of the 4 locale files leaves a stale brand visible in that language — sweep all four.
- **Green ≠ brand:** classify each `emerald/green` usage as *success* (→ `--success`) vs incidental before swapping; don't force success states onto the blue brand.
- **Session safety:** storage keys are deliberately untouched; do not "tidy" them in this step.
- **Build environment quirks (this machine):** the unified server must run with `NODE_ENV=production` to serve static/prerendered output; `curl` is not on PATH inside zsh functions (use `/usr/bin/curl`); React HTML-encodes apostrophes to `&#x27;` in prerendered output.

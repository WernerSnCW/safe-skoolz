# vibez Re-direction (design + program of record)

- **Date:** 2026-06-11
- **Branch:** `feat/unified-app`
- **Status:** approved (brainstorm complete), executing all phases in order
- **Supersedes parts of:** `2026-06-11-vibez-step2-ui-shell-design.md` (Step 2 chrome). The converged design language, `PageHeader`, `BrandLockup`, and split login survive; grouped nav + incident-centric dashboards are superseded by the mission spine below.

## Why (the reframe)

Step 2 polished the shell but vibez still *felt like SafeSchool* — incident/safeguarding-centric, with its distinctive value buried. The real positioning:

> **SchoolVBE's mission** = help **Schools** roll out VBE, support **Parents** advocating for VBE, support **PTAs** to operate well — all free. **vibez is the free software that operationalises each of those three missions.**

So vibez is **one platform, three missions**, not a safeguarding tool with extras. Safeguarding/incidents become a *tool within* the School mission, not the front door.

## Principles
- **Three-mission spine:** Schools (roll out VBE) · Parents (advocate for VBE) · PTAs (operate well). Each audience's logged-in experience leads with *their* mission + tools + VBE progress.
- **Get everywhere from anywhere:** any action or resource reachable from any screen (global launcher ⌘K + "Do"); no dead ends, no deep menus.
- **Resources integrated, not siloed:** the marketing-site resources/packs/guides live *in* the app (Resource Centre) and surface contextually.
- **Public face stays SchoolVBE:** resources-forward homepage for the three groups + clear "see the software / log in" paths. Reference: the live site `main.schoolvbe.pages.dev` (intact, separate deploy — our port is a copy).
- **Language is VBE, not anti-bullying:** drop safeguarding-only framing ("a safe space to speak up") throughout; values/advocacy/community-led voice.

## Phases (each: build → verify → commit)

**Phase 0 — Unblock.**
- Fix the production blank-content bug: framer-motion enter-animations (`initial opacity:0 → animate opacity:1`) leave content stuck invisible at `:8080` (app-wide, ~17 pages). Root-cause (likely duplicate framer-motion copies in the pnpm monorepo splitting MotionContext, or a prod-build issue) and fix at source.
- Re-language pass: remove anti-bullying/safeguarding-only copy (login tagline, info panels, marketing strings) → VBE platform language. Locale files + components.

**Phase 1 — Public homepage.** Evolve the unified app's public pages to faithfully match the live SchoolVBE site: resources-forward for the three groups, with clear "see the software" + "log in" paths. Honour the existing PublicLayout/home work; bring the resources forward.

**Phase 2 — Logged-in mission spine.** Replace incident-centric role dashboards with **mission-hub homes** per audience (Schools/Parents/PTAs): mission line → hero actions (the distinctly-theirs tools) → VBE progress → inline resources. Nav split: **"Your mission"** (audience tools) + **"Always here"** (Resource Centre, VBE journey, Messages). Incidents/safeguarding live under the School mission.

**Phase 3 — Resource Centre.** Permanent in-app destination surfacing the marketing resources/packs/guides, filterable by group, downloadable; plus contextual surfacing in each hub.

**Phase 4 — Global launcher.** Persistent ⌘K + "Do" command palette: fire any action or download any resource from any screen — create a VOICE group, initiate a diagnostic, open a vote, run a survey, get a Pack. Cross-mission where permissions allow.

(Then Step 3 proper: build VOICE + deepen surveys/diagnostics.)

## Verify pattern (unchanged)
Front-end build `cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build`; serve via preview `vibez` (port 8080) or runbook; visual checks via preview MCP (desktop+mobile, per role); public-route curl regress all 200; `/usr/bin/curl`; commit per coherent change on `feat/unified-app`.

---
type: handoff
owner: tom-king
date: 2026-06-11
repo: ~/dev/safe-skoolz
branch: feat/unified-app
pr: https://github.com/WernerSnCW/safe-skoolz/pull/2
parent_session: "VOICE Slices 1–3, dead-page ports, For Pupils, sequencing/IA (public on-ramps + role start-here), demo publish (CF tunnel + Pages proxy), frictionless login + Morna→Riverside white-label, mobile+desktop burger, scroll-to-top, sidebar un-cramp, public shareable VOICE page + Riverside campaign, VOICE explainer, content audit"
next_session_focus: "1) SEED the demo with realistic content (it's empty). 2) Build an end-to-end guided tour. 3) Work the content-audit High/Small backlog."
---

# Handover — vibez (SchoolVBE unified app), 2026-06-11

## START HERE
Everything below is built, committed, and pushed on `feat/unified-app` ([PR #2](https://github.com/WernerSnCW/safe-skoolz/pull/2)). A live demo is served via a **Cloudflare quick tunnel + Pages proxy** (see Runbook) — it depends on Tom's Mac + two terminals staying up. Read the project memory (`schoolvbe-program.md`) first — it has the full running history.

## Top priorities for the next session (Tom's words)
1. **The demo is empty — seed it.** Dashboards show 0 incidents / 0 messages / no behaviour data, so the app looks hollow in the demo. Add realistic seed content (incidents, messages, behaviour points, a couple of PTA proposals/ballots/announcements, lessons progress, a populated VOICE with backers/supporters) for the demo school (Riverside / `d6b7ea92-31a5-402d-b982-c17f2b38b721`). The base seed runs on boot but only creates school/users/codes; it does NOT create activity content. Likely add a `seed-demo-content` step (note: the old `seed-demo` was broken — check before reusing).
2. **End-to-end guided tour** (once content exists). A walkthrough of the whole journey: **sign up → create a VOICE → build a coalition (back/share) → run diagnostics → prepare what the school needs (the pack) → roll out to the school → kids/teachers/pupils using the system.** There's an existing `DemoProvider`/`DemoOverlay`/`DemoWalkthrough` + a "Take a guided tour" band already in the app — extend that rather than start fresh. Make it role-aware and tie each step to the real screens.
3. **Content-audit backlog** — a fresh 11-agent audit landed: `Companies/SchoolVBE/Brain-Box/working/content-audit-report-V1.md` (vault). Start with its **High severity / Small effort** tier (About VBE-first definition; hero states the offer + defines VBE; re-translate es/fr/nl `protectedBy`; honest-badge the 404 calculator/survey; real contact mailto; gloss "VOICE" in nav; repoint "Get the VBE Adoption Pack"). Several audit items were already dented this session (see report's note + below).

## What shipped this session
- **VOICE feature, all 3 slices:** Slice 1 collective (create/list/join/leave), Slice 2 conversion→PTA at tiers, Slice 3 PTA initiatives (the "organise" primitive, linked to origin VOICE). `/voice` page + PTA/parent nav.
- **Public shareable VOICE page** (the WhatsApp unlock): `voice_supporters` table; public no-auth `GET /voice/:id/public` + `POST /voice/:id/support`; page `/v/:id` (name+email, no login) + WhatsApp share; in-app "Share" button. **Live Riverside campaign:** `/v/91bedd3e-460d-4782-8fcc-478cf8e7a24e` ("Riverside Parents for VBE", two-ask mission: school adopts VBE + PTA adopts open operating framework).
- **VOICE explainer:** `/coalitions` reworked into the canonical "What is a VOICE" page (Gather→Ask→Adopt journey, live-example CTA), unified on the term VOICE; homepage door + `/v/:id` link repointed.
- **Sequencing/IA** (spec `docs/superpowers/specs/2026-06-11-vibez-sequencing-ia-design.md`): Phase 1 free public on-ramps `/diagnostic` (client-side), `/learning`, `/safeguarding` — killed the circular public→gated CTAs. Phase 2 role "start here" (reporting up front for parent/teacher/SLT; learning for teachers; Teacher dashboard got a start-here row).
- **Dead public guide pages ported** (5): /schools/10-day-rollout, /schools/case-study, /parents/join-pta, /ptas/operating-pack, /ptas/school-engagement.
- **For Pupils** public page + homepage band.
- **Demo polish:** frictionless login (prefilled `password123`, pupil PIN `1234`, parent tab default, account auto-select); "Try vibez" lead CTA; **Morna → "Riverside School"** white-label everywhere (DB + seed + access codes `X-RIVER` + copy).
- **Public nav UX:** scroll-to-top on route change; burger menu on **all** sizes (was mobile-only); **sidebar un-cramp** (moved Resource Centre/Notifications/Settings/SchoolVBE into the scroll so the nav isn't squeezed).
- **Content audit** (11-agent sweep) → report in vault.
- Docs in vault `Companies/SchoolVBE/Brain-Box/working/`: `content-audit-brief-V1.md`, `first-voice-launch-plan-V1.md` (incl. §11 explainer, §12 sign-up journey, §13 Riverside campaign), `content-audit-report-V1.md`.

## Runbook (the live demo)
The unified app is a **Node/Express + Postgres** server; **Cloudflare Pages can't run it**. Live demo = local server + quick tunnel + a Pages `_worker.js` proxy.
- **Server (Terminal 1, must stay up):**
  ```
  lsof -ti:8080 | xargs kill -9 2>/dev/null; sleep 1
  cd ~/dev/safe-skoolz/artifacts/api-server
  set -a; . ../../.env; set +a
  PORT=8080 NODE_ENV=production node dist/index.cjs
  ```
  (the force-kill matters — a plain restart was missing the new build twice this session.)
- **Tunnel (Terminal 2, must stay up):** `cloudflared tunnel --url http://localhost:8080` → prints a `*.trycloudflare.com` URL. **Ephemeral:** if it restarts the URL changes and the Pages proxy breaks — update `API_ORIGIN` in `artifacts/safeschool/dist/public/_worker.js` and redeploy.
- **Public link:** https://vibez-1k3.pages.dev (CF Pages project `vibez`). Login `pta.chair@safeschool.dev` / `password123`, or any role from the login page.
- **Rebuild + redeploy cycle:**
  ```
  cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
  printf 'const API_ORIGIN="<TUNNEL_URL>";export default{async fetch(r,e){const u=new URL(r.url);if(u.pathname.startsWith("/api/"))return fetch(new Request(new URL(u.pathname+u.search,API_ORIGIN),r));const s=await e.ASSETS.fetch(r);if(s.status===404&&(r.method==="GET"||r.method==="HEAD")&&!u.pathname.includes("."))return e.ASSETS.fetch(new Request(new URL("/index.html",u),r));return s;}};' > dist/public/_worker.js
  wrangler pages deploy dist/public --project-name vibez --commit-dirty=true
  ```
  - `pnpm build` WIPES dist/public → **always re-add `_worker.js`** before deploy.
  - The **tunnel auto-serves new front-end builds** (server reads dist/public from disk); only **Pages** needs the redeploy. After api-server changes, **restart the server** (force-kill above).
  - wrangler auth = `CLOUDFLARE_API_TOKEN` env (so `wrangler login` errors but token deploys work). Claude can't deploy headlessly — Tom runs the deploy.
- **Durable hosting (NOT done):** the real fix so it's not laptop-tethered = an always-on Node host + hosted Postgres. Queued.

## Gotchas
- **framer-motion 12 + React 19 prod-blank:** `<motion.div initial={{opacity:0}}>` content wrappers can stick invisible in the PROD build (worked on :5173 dev). Hit dashboard.tsx + pta.tsx (fixed). When adding pages, avoid gating content on framer enter-animations. (NB: this session's "menu not working" turned out NOT to be this — it was a cramped sidebar; see below.)
- **"menu not working" was a layout bug:** the pinned footer squeezed the nav scroll region to ~263px. Fixed by moving secondary nav into the scroll. Watch sidebar height with many nav items (parent has ~15 — a trim is worth considering, ties to the audit's clarity findings).
- `/usr/bin/curl` (curl not on PATH in zsh funcs). React HTML-encodes apostrophes (`&#x27;`) in prerendered output.
- `pnpm typecheck` fails on PRE-EXISTING issues; verify per-layer with build, not typecheck.
- **SchoolVBE/ is approve-per-file** (personal/family per `Companies/CLAUDE.md`); Tom directs the work and the working docs live in `Brain-Box/working/`.
- **Background workflows can stall on interruption:** the content audit's synthesis didn't run when the session was interrupted mid-run; resume with `Workflow({scriptPath, resumeFromRunId})` (cached agents return instantly).

## Build recipe (proven PTA/VOICE-slice pattern)
schema (`lib/db/src/schema/*`, register in index.ts) → `pnpm --filter @workspace/db push-force` → API router (`artifacts/api-server/src/routes/*`, register in routes/index.ts) → openapi (`lib/api-spec/openapi.yaml`) → `pnpm --filter @workspace/api-spec codegen` → page + route (App.tsx) + nav (nav-config.tsx) → build front-end + api-server → restart server → curl + in-browser verify. For inspecting the authed app without touching :8080, a `vibez-inspect` config (port 8095) is in the vault `.claude/launch.json`.

## Open backlog (beyond the top 3)
- **VOICE launch plan** (`first-voice-launch-plan-V1.md`) remaining: parent micro-survey + send-to-others + report rollup; VOICE **pack** generation; VOICE→PTA **formal asks** (request a vote / minutes / initiative) with logged responses; magic-link supporter→account upgrade; **per-VOICE Open-Graph** previews (so WhatsApp cards show the actual VOICE, not generic).
- **Pupil Voice** design (pupils advocating for change) — parked mid-brainstorm at **Q3** (Q1 = heard-by-school destination; Q2 = broad student voice + light category). Resume from there.
- **Value-driven content** (Tom's direction): make content benefit-led so visitors *feel* how each value stream works, and link the experience pages (e.g. "see what pupils experience") through to the real day-to-day app — which itself needs to read more clearly. This is the lens for working the audit backlog.
- Full multilingual re-language (nl/fr/es parity + stale anti-bullying register — big audit theme).
- Decide PR #1 (feat/pta-governance) vs PR #2 disposition with Werner.

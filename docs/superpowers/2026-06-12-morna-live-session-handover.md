---
type: handoff
owner: tom-king
date: 2026-06-12
repo: ~/dev/safe-skoolz (origin: github.com/cloudworkz-org/safe-skoolz — TRANSFERRED from WernerSnCW; PRs preserved)
branch: feat/unified-app
pr: https://github.com/cloudworkz-org/safe-skoolz/pull/2
production: https://safe-skoolz-production.up.railway.app
parent_session: "Riverside demo seed + content-audit High/Small + VBE-journey guided tour + Morna-ready brainstorm→spec→plan→build→production deploy"
next_session_focus: "Pathway = do it all: Phase A (Morna Vibes join experience) SHIPPED + live in prod 2026-06-12 (code deployed; Tom runs 2 prod DB steps before the Mon 6/15 PTA meeting — see below). NEXT: Phase B (PTA depth / M3 §4.3-4.4: officer roles, charter claim, VOICE→PTA merge, pta_goals, initiatives + five-stage) and Track C (the affluent-abuse report — parallel, LEGALLY GATED). Plus: Resend/domain so signup emails send; Tom's instrument + goal/concern copy sign-off; demo-track leftovers. (M2 SHIPPED 6/12 too.)"
---

# Handover — Morna live in production, 2026-06-12

## START HERE

**Morna's community diagnostic is LIVE: `https://safe-skoolz-production.up.railway.app/d/morna`** — smoke-tested end-to-end against prod (submission, dedupe 409, completeness 400, unlinkable answers verified in the DB, invite token created); test data wiped, counter at 0. Tom handles survey **content separately** — do not rewrite instrument copy without him. Read the project memory (`schoolvbe-program.md`) first: it carries the full history including this session.

Canonical artifacts (don't duplicate, read them):
- Spec: `docs/superpowers/specs/2026-06-11-morna-ready-design.md` (all design decisions + §4.5 instrument)
- Plan (M0+M1, EXECUTED): `docs/superpowers/plans/2026-06-11-morna-diagnostic-wedge.md`
- Ops: `docs/PROD_RUNBOOK.md` (deploy, seed, smoke, cleanup recipes)
- Demo runbook: `docs/superpowers/2026-06-11-vibez-session-handover.md` (tunnel + Pages, still accurate)

## Production state (Railway)

- Project **industrious-solace** in Tom's Railway Hobby workspace: ONE app service (`safe-skoolz`, branch `feat/unified-app`, auto-deploys on push) + Postgres 18.
- Config is in-repo: `railway.json` (build/start) + `nixpacks.toml` (install-phase override). Vars: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, `PORT=8080`, `JWT_SECRET`, `JWT_EXPIRES_IN=1h`, `JOBS_ENABLED=true`, `MFA_ENFORCED=false`, `APP_URL=https://safe-skoolz-production.up.railway.app`. NO `RESEND_API_KEY` yet (deliberate — see gates).
- Prod DB: 54 tables (pg_dump -s from local), seeded with **Morna only** (school slug `morna`, the 16-question survey, and one account: `tom@cloudworkz.com` named **"Claudia (Secretary)"**, role pta, approved, **no password yet** — Tom's testing seat; the chair seat is deliberately empty).
- **Secrets hygiene**: the prod Postgres public URL and a JWT_SECRET were pasted in the session chat. Rotate both when convenient (Railway → Postgres → regenerate credentials; service Variables → new JWT_SECRET — note rotating JWT logs everyone out, trivial now).

## Gates before the Classlist post (Tom)

1. **Tom's sign-off on the 16 questions** as rendered at `/d/morna` (spec §8 hard gate). Also decide: invite email currently says "the community diagnostic" (generic) — make it "the Morna community diagnostic"? One-line change in `routes/communityDiagnostic.ts`.
2. **Resend** — needs a verified domain Tom owns (domain itself still undecided; likely buy `schoolvbe.com` via Cloudflare Registrar). Until `RESEND_API_KEY` is set, signup links only appear in Railway Deploy Logs (`[community-diagnostic] DEV signup link …`), so real parents can't complete signup.
3. (Optional, better conversion) custom domain CNAME → Railway, via the same Cloudflare zone.
4. Tom sets his Claudia password (forgot-password flow once Resend works, or mint a token directly in the DB) and does his own test pass — then wipe it (cleanup SQL in PROD_RUNBOOK).

## Backlog

### Morna track (the main line)
- **A — Morna Vibes "join experience" — SHIPPED + deployed (2026-06-12), for the Mon 6/15 PTA meeting.** Spec `docs/superpowers/specs/2026-06-12-morna-voice-join-experience-design.md`; plan `docs/superpowers/plans/2026-06-12-morna-vibes-join-experience.md`. 8 tasks (subagent-driven, two-stage review + final holistic review), pushed, auto-deployed, prod-smoked: `/api/join/morna` 200, `/api/auth/signup` 400(no body), `/api/schools/search` 200, `/api/concerns` 401, `/api/schools/create-request` 400. Delivered: public front door `/join/morna` + email/password sign-up (instant login, no email needed — backs the Morna Vibes VOICE group = backing both goals; rate-limited, dup-race 409); five-tile shell (Goal 1 · Goal 2 · Concerns · Survey→/d/morna · Results→/results/morna gated) evolved from the M2 community dashboard; goal explainers `/goals`; Concerns read-patterns+submit+exec-triage `/concerns` (voice_concerns table); school search + request-to-create `/find-school` (Morna-only data). Branding "Morna Vibes" only (no submark). 138 api-server tests green. **PROD DB STEPS DONE (2026-06-12 eve):** voice_concerns + school_create_requests tables created in prod (via the Railway Data SQL box), and the Morna Vibes voice_groups row seeded (via a direct idempotent INSERT in the same box — NOT the seed CLI; school/survey/chair already existed). Verified: `/api/join/morna` now returns `voiceName:"Morna Vibes", hasVibes:true, joinCount:0` (count climbs as parents sign up). **Shareable link: https://safe-skoolz-production.up.railway.app/join/morna. REMAINING GATES (Tom): (1) sign off the goal/concern copy + 16-q instrument wording; (2) the M2 Resend/domain + Claudia password gates still stand (signup works WITHOUT email, but signup invite/results-release emails won't send until Resend is configured).** Known follow-ups (non-blocking): membershipStatus enforced at /results but not at login; create-request/search rate-limited but no captcha.
- **M2 — SHIPPED + live in prod (2026-06-12).** Plan: `docs/superpowers/plans/2026-06-12-morna-m2-membership-results.md`. 16 commits (`6361858..99a3bcc`) on `feat/unified-app`, pushed, auto-deployed, prod-smoked (`/d/morna/results`, `/d/morna/release`, `/membership/pending` all 401 = deployed+guarded). Delivered: exec approval queue (`GET/POST /api/membership/*` — list pending / approve+anonymity choice / reject; idempotent, transactional, audited, notifies) + `/membership` UI page; the shared anonymity rule (`lib/memberDisplay.ts`) applied to all three VOICE surfaces; results release (`POST /d/:slug/release`, race-safe, notifies participants) + privacy-safe aggregation (`GET /d/:slug/results` — per-question distributions, year-group segments suppressed below n≥5, exec-only shuffled free-text, locked to non-execs until released, gated on approved membership, readable when closed) + `/results/:slug` page; community-mode `ParentDashboard` for parents with no linked pupils. **No schema migration** (M1 shipped the columns). 123 api-server tests green. NOTE: `membershipStatus` is enforced at `/results` but NOT yet at login — a non-approved member can log in (sees only aggregate results, no identities/free-text); tighten in M3 if desired.
- **M3 — plan then build** (NOW the next big unit): officer roles president/vice_president (enum + UI); charter claim flow (operating-structure doc rendered in-app, acknowledgements via `pta_policy_acknowledgements`, claim activates PTA); VOICE merge into claimed PTA (extend `POST /voice/:id/convert`); `pta_goals` (propose→shortlist→senior ballot→ratify); initiative upgrade (one-page-note fields, six-box self-approval checklist, five-stage school process with non-response tracking). Spec §4.3-4.4; the operating-structure docx content is quoted in the spec and memory.
- M1 polish candidates (small, post-sign-off): per-survey OG/meta tags on `/d/:slug` for WhatsApp/Classlist link previews; "Morna" naming in invite email; answer-aggregation clamps (final-review F3 note: M2 aggregation should clamp answer to option range and dedupe per responseId — validation now rejects these at submit, so only legacy concern).

### Demo track (Riverside, Tom's Mac)
- **Pages redeploy pending (Tom runs wrangler)** — vibez-1k3.pages.dev is several builds behind (tunnel link is current).
- Live campaign VOICE `/v/91bedd3e…` deliberately unpopulated — Tom's call whether to seed supporters.
- **Content-audit remaining tiers** (`Companies/SchoolVBE/Brain-Box/working/content-audit-report-V1.md` in the vault): High/M — "Try vibez" off the login wall, disambiguate the two how-it-works pages, unify coalition/VOICE naming, resolve free-vs-paid story, re-translate es/fr/nl role blurbs, fix hub deep-link self-redirects, per-route titles/meta/OG/sitemap; High/L — resources email-gate seam, nl/fr locale backfills; plus Medium/Low tiers.
- VOICE launch-plan leftovers (vault `first-voice-launch-plan-V1.md`): parent micro-survey, VOICE pack generation, formal asks to PTA, magic-link supporter→account upgrade, per-VOICE OG previews.
- Pupil Voice design parked at Q3 (resume the brainstorm from memory).
- PR disposition with Werner: PR #2 (60+ commits, everything) supersedes PR #1; decide merge strategy. Note repo now lives in `cloudworkz-org`.

## Gotchas (this session's scar tissue)

- **Railway's GitHub-import wizard splits the pnpm monorepo into 7 broken services.** Always: New Project → **Empty Service** → Settings → Connect Repo → branch `feat/unified-app`.
- **Railway's billable Agent opens auto-fix PRs against the repo** (closed #3 and #4 this session). Decline its offers; keep fixes on our branch.
- Build quirks (all fixed in-repo, don't regress): vite.config **throws without PORT at build time** (`PORT=5173` in railway.json buildCommand); nixpacks exports `NODE_ENV=production` globally so its install phase skips devDeps → `nixpacks.toml` overrides install with `NODE_ENV=development … --prod=false`.
- **Boot-seed ordering**: api-server's startup seed creates the Riverside demo school on an EMPTY schools table. On any fresh DB, run `seed-morna` BEFORE first boot.
- `push-force` was permission-blocked against the live local DB earlier — additive SQL via psql is the accepted fallback (prod schema was applied via `pg_dump -s` from local).
- The shared API client throws `ApiError` with `.data`/`.status` (NOT axios's `e.response.data`) — bug fixed once in diagnostic-community.tsx; watch for it in new pages.
- Local demo server runbook unchanged (force-kill :8080, `_worker.js` re-add after every front-end build).

## Suggested skills for the next session

- `superpowers:writing-plans` — for the M2 plan (spec already approved; no re-brainstorm needed unless scope shifts).
- `superpowers:subagent-driven-development` — to execute it (worked well: two-stage review caught real bugs every task).
- `superpowers:verification-before-completion` — prod claims need curl/psql evidence, pattern is established in PROD_RUNBOOK.
- `superpowers:brainstorming` — only if picking up Pupil Voice (parked at Q3) or any new feature surface.

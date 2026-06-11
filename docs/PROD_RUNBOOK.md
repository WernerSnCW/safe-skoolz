# Production Runbook — Morna (vibez)

The Morna community hub runs on an always-on Node host + managed Postgres, completely
separate from the Riverside demo (Tom's Mac + tunnel + Pages proxy). Same codebase,
same branch (`feat/unified-app`), different database. Spec:
`docs/superpowers/specs/2026-06-11-morna-ready-design.md`. Plan Task 8:
`docs/superpowers/plans/2026-06-11-morna-diagnostic-wedge.md`.

## One-time setup (Tom)

1. **Host + DB** — recommended: Railway (one project: a service from the GitHub repo
   `WernerSnCW/safe-skoolz`, branch `feat/unified-app`, plus the Postgres add-on).
   Alternative: Render + Neon.
2. **Service config**
   - Build command:
     `pnpm install --frozen-lockfile && cd artifacts/safeschool && BASE_PATH=/ NODE_ENV=production pnpm build && cd ../api-server && pnpm build`
   - Start command: `node artifacts/api-server/dist/index.cjs`
   - Env vars:
     - `DATABASE_URL` — the hosted Postgres URL
     - `NODE_ENV=production`
     - `PORT` — host-injected (Railway does this automatically)
     - `JWT_SECRET` — fresh: `openssl rand -hex 32`
     - `APP_URL` — the public URL (host-provided domain first; custom domain later).
       Used in the signup/reset email links — must be right or invite links break.
     - `RESEND_API_KEY` — plus a verified sender in Resend. Without it, signup
       emails only log to the server console (the conversion step dies).
3. **Initialise the prod DB — ORDER MATTERS** (run locally, pointed at prod):
   ```bash
   cd ~/dev/safe-skoolz
   DATABASE_URL="<prod-url>" pnpm --filter @workspace/db push-force      # fresh DB — nothing to lose
   DATABASE_URL="<prod-url>" MORNA_CHAIR_EMAIL=<tom-email> pnpm --filter @workspace/scripts seed-morna
   ```
   Run seed-morna BEFORE the service's first boot: the api-server boot seed only
   fires on an EMPTY schools table, so seeding Morna first means Riverside demo
   data is never created in prod. (If Riverside appears, delete it.)
4. **Set the chair password** — visit `<APP_URL>/reset-password` via the standard
   "forgot password" flow with the chair email (seed-morna creates the account
   passwordless).

## Smoke test (after every deploy)

```bash
curl -s https://<prod-url>/api/d/morna | python3 -m json.tool | head -8
# expect: "How is Morna really doing?", 16 questions, submissionCount
```
Browser: open `https://<prod-url>/d/morna`, complete a test pass with a personal
test email, confirm the signup email arrives and the set-password link works.
Then clean the test rows:
```bash
psql "<prod-url>" -c "DELETE FROM diagnostic_answers     WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');
DELETE FROM diagnostic_response_meta WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');
DELETE FROM diagnostic_submissions   WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');"
```
(Remove the test user too if one was created: check `users` by the test email.)

## The Classlist link

`https://<prod-url>/d/morna` — only after Tom signs off the instrument wording
(spec §8 gate). The instrument lives as data on the survey row
(`diagnostic_surveys.instrument`); wording edits are a psql UPDATE, no deploy.

## Operating notes

- **Deploys**: push to `feat/unified-app` → host auto-builds (if auto-deploy on).
  Schema changes: run `push-force` against prod BEFORE the deploy that needs them.
- **Reading contact/diagnostic data**: `contact_messages` (site form),
  `diagnostic_submissions` (who took part — emails, NO answers),
  `diagnostic_answers` (answers — anonymous by construction, day-truncated
  timestamps; never joinable to emails, by design — do not "fix" this).
- **Results release (M2, not built yet)**: setting `released_at` on the survey row
  will gate the results endpoints when they land.
- **Rate limits**: 60 submissions/hour/IP. Spanish carrier CGNAT can funnel many
  families through one IP — on launch evening, if parents report "try again later"
  errors, this is why; the message is retryable and the window is one hour.
- **Demo stays demo**: never point the local Mac setup at the prod DATABASE_URL;
  never run seed-demo-content against prod.

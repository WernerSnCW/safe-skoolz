# Local dev runbook (migrated off Replit)

Migrated to a local Mac (Intel/x86_64) on 2026-06-10. The app runs unchanged except for the env/port wiring below.

## One-time setup
1. **pnpm**: `npm i -g pnpm@9` (corepack wasn't available on this Node).
2. **Replit override fix** (already applied): `pnpm-workspace.yaml` had `overrides` that set every platform-native binary (esbuild/rollup/@tailwindcss/oxide/lightningcss) to `'-'`, which breaks install off-Replit. Those lines were removed (backup: `pnpm-workspace.yaml.replit-bak`). Kept `esbuild: 0.27.3` and the esm-loader→tsx override.
3. **Install**: `pnpm install` (from repo root).
4. **Postgres 16**: `brew install postgresql@16 && brew services start postgresql@16`. Add to PATH: `export PATH="/usr/local/opt/postgresql@16/bin:$PATH"`. Create DB: `createdb safeskoolz`.
5. **.env** (repo root) — the api-server does NOT load dotenv; env must be exported when running. Keys: `DATABASE_URL=postgres://<youruser>@localhost:5432/safeskoolz`, `JWT_SECRET`, `MFA_ENC_KEY` (base64 32 bytes), `JWT_EXPIRES_IN=1h`, `APP_URL`, `JOBS_ENABLED=true`, `RESEND_API_KEY`/`OPENAI_API_KEY` optional.
6. **Schema**: `cd lib/db && DATABASE_URL=... pnpm push-force` (drizzle-kit push; no migration files). Creates 38 tables.
7. **Seed**: `cd scripts && DATABASE_URL=... pnpm seed` (base seed → 1 school, 92 users). NOTE: `seed-demo` is **stale/broken** (references pupil names the base seed doesn't create) — skip it.

## Run (two processes)
- **API** (Express, port 8080 — the web client proxies `/api` here):
  ```
  cd artifacts/api-server
  set -a; . ../../.env; set +a
  PORT=8080 pnpm dev
  ```
- **Web** (Vite, port 5173 — requires PORT and BASE_PATH or it throws):
  ```
  cd artifacts/safeschool
  PORT=5173 BASE_PATH=/ NODE_ENV=development pnpm dev
  ```
- Open http://localhost:5173 (proxies `/api` → :8080).

## Login (demo seed)
- Coordinator `coordinator@safeschool.dev` / `password123` (login path `POST /api/auth/staff/login`)
- Head `head@safeschool.dev`, Teacher `teacher@safeschool.dev`, SENCO `senco@safeschool.dev` — all `password123`
- Parent `parent.a@safeschool.dev` / `parent123`; PTA `pta.chair@safeschool.dev` / `pta123`
- Pupils: PIN `1234`, access code `MORNA2025`

## Gotchas / migration notes
- api-server **requires** `PORT` and reads env directly (no dotenv) — export env before `pnpm dev`.
- Web client **requires** `PORT` + `BASE_PATH`.
- Audit-log immutability trigger is applied by the api-server **at boot** (not by drizzle push).
- Seed data is **Morna-branded** (`MORNA2025`, demo school) — private dev data; unrelated to the public SchoolVBE site.
- App is branded **SafeSkoolZ**; pending rename to **vibez** (pre-launch, per handoff).
- Node 26 local vs Node 24 on Replit — fine so far.

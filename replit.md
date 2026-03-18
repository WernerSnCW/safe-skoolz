# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Auth**: Custom JWT + bcrypt (NOT Replit Auth)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (port 8080)
│   └── safeschool/         # React+Vite frontend (SafeSchool app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks + custom fetch with auth token injection
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## SafeSchool App (v0.2.0)

Multi-role safeguarding and incident reporting platform for schools.

### Auth & Roles
- JWT-based authentication (custom, bcrypt passwords/PINs)
- Roles: pupil, parent, teacher, coordinator, head_teacher, senco
- Token stored in localStorage as `safeschool_token`
- `customFetch` in `lib/api-client-react/src/custom-fetch.ts` auto-injects Bearer token

### API Proxy
- Vite dev server proxies `/api/*` to `http://localhost:8080`
- API server mounts all routes at `/api` prefix

### Database Schema
- schools, users, incidents, protocols, interviews, notifications, patternAlerts, auditLog
- All in `lib/db/src/schema/index.ts`

### Seed Data
- 1 school: International School of Mallorca
- 8 pupils (PIN: 1234), 5 staff (password: password123), 2 parents (password: parent123)
- Run: `pnpm --filter @workspace/scripts run seed`

### Demo Credentials
- Coordinator: coordinator@safeschool.dev / password123
- Head Teacher: head@safeschool.dev / password123
- Teacher: teacher@safeschool.dev / password123
- Parent: parent.martinez@safeschool.dev / parent123
- Pupils: Select school → select name → PIN 1234

### Key Features
- Role-based login (pupil selector, staff/parent email login)
- Incident reporting with emotional state tracking (pupils) and safeguarding checks (staff)
- Escalation tiers: sexual/coercive→tier3, physical/psychological/online→tier2, others→tier1
- Pattern detection alerts (async, post-incident)
- Safeguarding protocols management
- Notifications with acknowledgment
- Audit logging
- Coordinator dashboard with stats

### Frontend Pages
- `/login` - Multi-tab login (pupil/staff/parent)
- `/` - Dashboard (role-specific views)
- `/report` - Report incident form
- `/incidents` - Incidents list (coordinator/head_teacher)
- `/incidents/:id` - Incident detail
- `/protocols` - Protocols list
- `/alerts` - Pattern alerts
- `/notifications` - Notifications

### API Routes (all under /api)
- `GET /healthz` - Health check
- `POST /auth/pupil/login` - Pupil login
- `POST /auth/staff/login` - Staff login
- `POST /auth/parent/login` - Parent login
- `GET /auth/me` - Current user (auth required)
- `GET /schools` - List schools (public)
- `GET /schools/:id/pupils` - List pupils for login (public, last names truncated)
- `GET /schools/:id/staff` - List staff (coordinator/head_teacher only)
- CRUD for incidents, protocols, alerts, notifications, dashboard

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files emitted during typecheck
- **Project references** — packages declare dependencies via `references` array

## Root Scripts

- `pnpm run build` — typecheck + recursive build
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`

## Important Notes

- bcrypt added to `onlyBuiltDependencies` in pnpm-workspace.yaml
- `useQueryClient` must be imported from `@tanstack/react-query`, NOT from `@workspace/api-client-react`
- Public pupil endpoint returns truncated last names (first initial only) for privacy

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
- Roles: pupil, parent, teacher, head_of_year, coordinator, head_teacher, senco, support_staff
- Token stored in localStorage as `safeschool_token`
- `customFetch` in `lib/api-client-react/src/custom-fetch.ts` auto-injects Bearer token
- Staff visibility hierarchy:
  - teacher → sees assigned class only
  - head_of_year → sees all classes in assigned year group
  - head_teacher / coordinator / senco → sees all classes in school
  - support_staff → customised (className, yearGroup, or whole school)

### API Proxy
- Vite dev server proxies `/api/*` to `http://localhost:8080`
- API server mounts all routes at `/api` prefix

### Database Schema
- Core: schools, users, incidents, protocols, interviews, notifications, patternAlerts, auditLog, messages
- Compliance: delegatedRoles, annexTemplates, referralBodies, caseTasks
- Protocols extended with: riskFactors (jsonb), protectiveFactors (jsonb), familyContext (jsonb), externalReferralBodyId
- All in `lib/db/src/schema/index.ts`

### Compliance Frameworks
- **LOPIVI**: Protection delegate governance via delegated_roles, duty to report, safe environment assessments
- **Convivèxit 2024**: Anti-bullying protocol with 7 annexes (ANNEX-I through ANNEX-VII) in annex_templates
- **Machista Violence (CAIB)**: Gender-based violence protocol with 4 annexes (MV-I through MV-IV), risk/protective factors on protocols
- Delegated role types: lopivi_delegate, convivexit_coordinator, machista_protocol_lead, safeguarding_governor, senco_lead
- Referral body types: ib_dona, municipal_services, policia_nacional, guardia_civil, fiscalia_menores, servicios_sociales, salud_mental, caib_education

### Seed Data
- 1 school: Morna
- 8 pupils: Boy A–D, Girl A–D (PIN: 1234)
- 8 staff: Coordinator A, Head Teacher A, Teacher A (head_of_year Y6), Teacher B–D, Support Staff A, SENCO A (password: password123)
- 2 parents: Parent A, Parent B (password: parent123)
- Run: `pnpm --filter @workspace/scripts run seed`
- Compliance data: 15 annex templates, 10 referral bodies, 4 delegated role appointments
- Run: `pnpm --filter @workspace/scripts run seed-compliance`

### Demo Credentials
- Coordinator A: coordinator@safeschool.dev / password123
- Head Teacher A: head@safeschool.dev / password123
- Teacher A (Head of Year Y6): teacher@safeschool.dev / password123
- Teacher B: teacher2@safeschool.dev / password123
- Teacher C: teacher3@safeschool.dev / password123
- Teacher D: teacher4@safeschool.dev / password123
- Support Staff A: support@safeschool.dev / password123
- SENCO A: senco@safeschool.dev / password123
- Parent A: parent.a@safeschool.dev / parent123
- Parent B: parent.b@safeschool.dev / parent123
- Pupils: Boy A, Boy B, Boy C, Boy D, Girl A, Girl B, Girl C, Girl D → PIN 1234

### Key Features
- Role-based login (pupil selector, staff/parent email login)
- **Quick Demo Login** panel on login page with instant one-click access for every role
- Incident reporting with emotional state tracking (multi-select), safeguarding checks (staff)
- **Person identification**: Pupil search-as-you-type for victims/perpetrators/witnesses + "I don't know their name" toggle showing structured description builder (gender, year, age relation, staff/pupil, physical description, friends, location seen, count). Descriptions tagged with roleInIncident (victim/perpetrator)
- **Unknown person descriptions** stored as JSONB on incidents (`unknownPersonDescriptions`), displayed on incident detail page with role badges
- Escalation tiers: sexual/coercive→tier3, physical/psychological/online→tier2, others→tier1
- **Incident filtering**: by child, year group, class, category, status
- Victim/perpetrator names shown on incident cards
- Pattern detection alerts (async, post-incident)
- **Protocol risk assessment**: Structured risk level (low/medium/high/critical) selector, fixed-category risk factor checkboxes (8 options), protective factor checkboxes (4 options), additional risk notes. All displayed on protocol detail page with color-coded badges
- **Teacher assessment workflow**: Staff can assess incidents (add to pupil file, write staff notes, multi-witness statements with timestamps, parent summary). Toggle to share with parents. Role-based response filtering: parents see only curated parent summary (no other children's names/details); pupils see basic info; staff see full details. Authorization: teachers can only assess incidents involving their class pupils
- **Multi-witness statements**: witnessStatements stored as JSONB array on incidents. Each entry: { witnessId?, witnessName, statement, recordedAt, recordedBy? }. Assessment panel has add/remove buttons per witness. Display shows individual statements with name, timestamp. Timestamps enable response-time KPI tracking
- Safeguarding protocols management
- Notifications with acknowledgment
- Audit logging
- Coordinator dashboard with stats
- **Pupil messaging system**: Dynamic safe contacts (form tutor first, then staff), send messages with priority flags (green/amber/red), request a chat, quick phrases, urgent help button with location, message confirmation. Staff inbox at `/messages` with conversation threads and reply capability
- **Parent messaging**: Parents can message school staff from `/messages`. "New Message" button loads child's teachers/staff via `/api/parent-contacts` (sorted: child's class teacher first, then head of year, then other staff). Parents can send messages, view conversations, and receive replies. Navigation includes Messages link for parent role
- **Parent school overview analytics**: Expandable "School Overview" section on parent dashboard showing anonymised school-wide macro stats — total reports, resolution rate, pupils enrolled, resolved cases, monthly trend line chart, report types bar chart, location hotspots, severity levels. No individual names exposed. Endpoint: `GET /api/dashboard/school-overview`
- Messages table: id, schoolId, senderId, recipientId, senderRole, priority (normal/important/urgent), type (message/chat_request/urgent_help), body, location, readAt, parentMessageId

### Demo Incidents (seed-demo)
- 11 pre-seeded incidents across all categories and escalation tiers (child-friendly language throughout)
- Boy B appears in 4 incidents involving Boy A (repeated unkind behaviour pattern)
- Girl B: welfare concern (teacher noticed she needs extra support)
- Girl C: tier 3 safeguarding case (LOPIVI protocol)
- Girl D: feeling left out (exclusion)
- Boy D: being made fun of in class (anonymous report)
- Run: `pnpm --filter @workspace/scripts run seed-demo`
- Historical: 44 incidents spanning 6 months (Boy A→Boy B pattern: 8 incidents, Girl A: 4 incidents, plus random incidents across all pupils, many shared with parents)
- Run: `pnpm --filter @workspace/scripts run seed-history`
- Full platform seed (protocols, alerts, notifications, tasks, interviews, messages, audit log — all linked to demo incidents):
- Run: `pnpm --filter @workspace/scripts run seed-full` (requires seed-demo to be run first)
- Creates: 2 protocols (Convivèxit + LOPIVI), 3 pattern alerts, 17 notifications, 7 case tasks, 4 interviews, 13 messages, 5 audit log entries, parent-visible assessed incidents

### Frontend Pages
- `/login` - Multi-tab login (pupil/staff/parent) + Quick Demo Login panel
- `/` - Dashboard (role-specific: pupil→speak up, teacher→action cards + recent incidents, parent→child reports/analytics/history with time filters, coordinator→stats overview)
- `/report` - Report incident form (role-aware language: staff see "Log a Safeguarding Incident" with professional labels, awareness checkboxes, staff safeguarding checks; pupils see child-friendly "Tell us what happened" with emotions and anonymity option)
- `/class` - My Class / My Year Group / All Pupils (role-scoped, with "View incidents" per pupil)
- `/incidents` - Incidents list with filters (category, status, year, class, pupil) — accessible to coordinator, head_teacher, senco, head_of_year, teacher
- `/incidents/:id` - Incident detail (role-scoped access, actions: status change, open protocol, teacher assessment panel)
- `/protocols` - Protocols list (coordinator, head_teacher, senco)
- `/protocols/new` - Open formal protocol form (pre-fills from linked incident)
- `/protocols/:id` - Protocol detail view
- `/alerts` - Pattern alerts
- `/notifications` - Notifications
- `/messages` - Staff messages inbox (conversation list + threaded replies, auto-marks as read)
- `/settings` - Edit profile (name, email for staff, avatar for pupils)

### API Routes (all under /api)
- `GET /healthz` - Health check
- `POST /auth/pupil/login` - Pupil login
- `POST /auth/staff/login` - Staff login
- `POST /auth/parent/login` - Parent login
- `GET /auth/me` - Current user (auth required)
- `GET /schools` - List schools (public)
- `GET /schools/:id/pupils` - List pupils for login (public, last names truncated)
- `GET /schools/:id/staff` - List staff (coordinator/head_teacher only)
- `GET /my-pupils` - Role-scoped pupil list (teacher→class, head_of_year→year, head_teacher→school, support_staff→customised)
- `GET /pupils/search?q=name` - Search pupils by name (staff + pupil roles only, returns first/last name, yearGroup, className)
- `PATCH /auth/profile` - Update profile (name, email, avatar)
- `PATCH /incidents/:id/assess` - Teacher assessment (teacher, head_of_year, coordinator, head_teacher, senco; sets staffNotes, witnessStatements, parentSummary, addedToFile, parentVisible, assessedBy/At)
- CRUD for incidents, protocols, alerts, notifications, dashboard
- `GET /delegated-roles` - Governance appointments (coordinator/head_teacher)
- `POST /delegated-roles` - Create appointment
- `PATCH /delegated-roles/:id/revoke` - Revoke appointment
- `GET /annex-templates` - List all annex templates
- `GET /annex-templates/:framework` - Filter by framework
- `POST /annex-templates` - Create template
- `GET /referral-bodies` - External referral contacts
- `POST /referral-bodies` - Add referral body
- `PATCH /referral-bodies/:id` - Update referral body
- `GET /case-tasks` - Protocol task list (filterable by protocolId, status)
- `POST /case-tasks` - Create task
- `PATCH /case-tasks/:id` - Update/complete task
- `GET /dashboard/analytics` - Analytics data: incidents by type, year group, status, location, escalation tier, monthly trend, top victims/perpetrators (coordinator, head_teacher, senco)
- `GET /safe-contacts` - Pupil safe contacts (pupil only; returns staff sorted by form tutor first, includes displayRole, isFormTutor)
- `POST /messages` - Send message (auth required; recipientId, body, priority, type, location)
- `GET /messages` - List messages (auth; optional contactId filter)
- `PATCH /messages/:id/read` - Mark message read (recipient only)
- `GET /messages/conversations` - Staff conversations summary (staff only; groups by contact, unread counts)

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

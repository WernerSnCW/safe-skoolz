# CURRENT STATE OF THE APP

## 1. ONE-LINER
- **What it does:** Multi-role safeguarding case-management platform for K-12 schools — pupils, parents, teachers, coordinators, SENCO, head teacher, PTA and admins all sign in to a single web app to report incidents, run protocols, track behaviour, send safe-contact messages, complete training and view audit logs.
- **Intended user:** Morna International College (Ibiza) is the named demo school; design targets Spanish/Balearic schools needing LOPIVI + Convivèxit + Machista-Violence compliance.
- **Problem solved:** Centralised, role-scoped, append-only audit trail for safeguarding events so schools can show regulators that incidents → assessments → protocols → external referrals are all tracked and timestamped.
- **Current stage:** Pre-launch demo build (`DEMO_MODE=true` in dev). Demo seed data + demo quick-login present. `git log` shows the very first deployment was published on May 1 2026 (commit `9480010`). No paying-customer signal in code.

---

## 2. STACK & RUNTIME

| Layer | Choice | Version / evidence |
|---|---|---|
| Node runtime | Node.js 24 | `.replit` modules `nodejs-24` |
| Python runtime | 3.11 (unused by app code) | `.replit` modules `python-3.11` |
| Package manager | pnpm workspaces (catalog) | `pnpm-workspace.yaml`, `preinstall` forces pnpm |
| Language | TypeScript ~5.9.2 | root `package.json` |
| Backend framework | Express 5 | `artifacts/api-server/package.json` |
| Frontend framework | React 19.1.0 + Vite 7 | catalog in `pnpm-workspace.yaml` |
| Frontend router | Wouter 3.3.5 | `artifacts/safeschool/package.json` |
| Server state | TanStack React Query 5.90.21 | catalog |
| Styling | Tailwind CSS v4 + `@tailwindcss/vite` | catalog |
| UI primitives | Radix UI (28 `@radix-ui/react-*` packages), Shadcn pattern (`components/ui/`), Lucide icons | safeschool deps |
| Forms | react-hook-form 7.71 + zod 3.25.76 + @hookform/resolvers | safeschool deps |
| Charts | recharts 2.15.4 | safeschool deps |
| Toasts | sonner 2.0.7 | safeschool deps |
| Animations | framer-motion 12.35 | catalog |
| i18n | i18next 26 + react-i18next 17, 4 languages (en/es/fr/nl), 16 namespaces, `localStorage` key `safeskoolz_lang` | safeschool deps |
| Database | Replit-managed PostgreSQL 16 | `.replit` modules `postgresql-16`, `DATABASE_URL` env |
| ORM | Drizzle ORM 0.45.1 + drizzle-zod + drizzle-kit 0.31.9 (schema push, no SQL migrations) | catalog, `lib/db/package.json` |
| API contract | OpenAPI 3.1.0 + Orval 8.5.2 codegen → React Query hooks (`lib/api-client-react/src/generated/`) and Zod schemas (`lib/api-zod/src/generated/`) | `lib/api-spec/`, `lib/api-client-react/` |
| Auth | bcrypt 6 password hashing, jsonwebtoken 9 JWT, cookie-parser 1.4 | api-server deps |
| Rate limit | express-rate-limit 8.3 (in-memory) | api-server deps |
| Email | Resend 6.10 via `src/lib/emailHelper.ts` | api-server deps |
| LLM | OpenAI 6.32 via Replit AI Integrations proxy (`AI_INTEGRATIONS_OPENAI_*` env) | api-server deps |
| PDF | pdfkit 0.18 (Buffer-based) | api-server deps |
| Tests | vitest 4.1.4 + @vitest/coverage-v8 (api-server only) | api-server devDeps |
| Linter / formatter | prettier 3.8.1 (no eslint config found in root) | root devDeps |
| Build (api-server) | esbuild via `tsx ./build.ts` | api-server scripts |
| Deployment | Replit Autoscale (`router = "application"`, `deploymentTarget = "autoscale"`) | `.replit` `[deployment]` |
| Post-merge hook | `scripts/post-merge.sh`, 20s timeout | `.replit` `[postMerge]` |

**Ports / artifacts.** Each artifact reads `PORT` from env (proxy-assigned). Three artifacts registered: `artifacts/api-server` (kind `api`), `artifacts/safeschool` (kind `web`), `artifacts/mockup-sandbox` (kind `design`). `.replit` only lists `api-server` and `mockup-sandbox` under `[[artifacts]]` — `safeschool` is configured via the artifacts skill / `.replit-artifact` directory.

**replit.nix** — present but empty (`replit.nix` is 0 bytes).

---

## 3. FILE & FOLDER STRUCTURE

```
.
├── artifacts/
│   ├── api-server/          Express 5 API, Drizzle, Resend, OpenAI, pdfkit, vitest
│   ├── safeschool/          React 19 + Vite 7 + Wouter frontend (the actual app)
│   └── mockup-sandbox/      Component preview server for Canvas/design subagent
├── lib/
│   ├── api-spec/            OpenAPI 3.1.0 source + Orval config
│   ├── api-client-react/    Generated React Query hooks (do not hand-edit)
│   ├── api-zod/             Generated Zod request/response schemas
│   └── db/                  Drizzle schemas (one file per table) + drizzle.config.ts
├── scripts/                 post-merge.sh + scripts/src/* helpers
├── .local/                  Replit agent skills + session metadata (not app code)
├── attached_assets/         User-pasted briefs/screenshots
├── CTX_architecture_safeskoolz_v1_0.md   Living architecture doc (393 lines)
├── 100_scan_phase5_safeskoolz.txt        Pre-build scan from RR-2026-05-03-010
├── RR-2026-05-03-010_build_report.txt    Latest build report
├── package.json             Workspace root — only typecheck + build scripts
├── pnpm-workspace.yaml      pnpm catalog + binary overrides
├── tsconfig.json            Composite root referencing lib/*
├── tsconfig.base.json       Shared compiler options (see §9)
└── .replit                  Modules, deployment, postMerge, userenv
```

**Dead / experimental folders:** none obvious. `attached_assets/` is human paste-in (briefs, screenshots, audit prompts) — keep, but not application code. `mockup-sandbox` is only used for design exploration and is not deployed.

---

## 4. ENTRY POINTS & ROUTING

### Server entry
- **`artifacts/api-server/src/index.ts`** — boots the Express app. Reads `PORT`, runs a raw-SQL `CREATE OR REPLACE FUNCTION prevent_audit_log_modify()` + trigger that **blocks UPDATE/DELETE on the `audit_log` table at the DB level**, calls `seedDemoData()` (idempotent), kicks off `runScheduledPatternScan` via `setInterval`, then listens.
- **`artifacts/api-server/src/app.ts`** — Express app factory. Permissive CORS that allows any origin and logs it; `express.json({ limit: "5mb" })`; in-memory `express-rate-limit` mounted only on `/api/auth/pupil/start`, `/api/auth/pupil/login`, `/api/auth/staff/login`, `/api/auth/parent/login`, `/api/auth/demo-login` (30 req / 15 min) and `/api/newsletter` (10 req / hour). All routes prefixed `/api`. Unhandled-error handler returns 500.
- **`artifacts/safeschool/src/main.tsx`** — React 19 root, imports i18n, mounts `<App />`.

### HTTP routes
All prefixed `/api`. Router files in `artifacts/api-server/src/routes/`. Mount order from `routes/index.ts`: health, config, newsletter, auth, schools, export, incidents, protocols, alerts, notifications, dashboard, delegatedRoles, annexTemplates, referralBodies, caseTasks, messages, senco, behaviour, pta, dataRetention, diagnostics, diary, teacherPosts, training, audit.

| Method | Path | Handler | Purpose |
|---|---|---|---|
| GET  | /api/healthz | health.ts | Liveness check |
| GET  | /api/config | config.ts | `{ demoEnabled }` — public, frontend uses this instead of env |
| POST | /api/newsletter/subscribe | newsletter.ts | Add email to waitlist |
| GET  | /api/auth/login-accounts | auth.ts | Demo quick-login list |
| GET  | /api/auth/locked-pupils | auth.ts | Pupils with failed-login lockout (coordinator/head_teacher) |
| POST | /api/auth/pupil/start | auth.ts | Class access code → pupil profile picker |
| POST | /api/auth/pupil/login | auth.ts | PIN login → JWT |
| POST | /api/auth/staff/login | auth.ts | Email+password → JWT |
| POST | /api/auth/parent/login | auth.ts | Email+password → JWT |
| POST | /api/auth/demo-login | auth.ts | Demo-mode quick-login by role |
| GET  | /api/auth/me | auth.ts | Current JWT payload |
| PATCH| /api/auth/profile | auth.ts | Update own profile |
| GET  | /api/schools | schools.ts | Active schools |
| GET  | /api/schools/my-pupils | schools.ts | Pupils in scope (class/year) |
| GET  | /api/schools/:schoolId/staff | schools.ts | Staff for a school |
| GET  | /api/schools/pupils/search | schools.ts | Pupil search by name |
| POST | /api/schools/pupils/reset-pin/:pupilId | schools.ts | Reset pupil PIN + clear lockout |
| POST | /api/schools/pupils/bulk-reset-pins | schools.ts | Bulk PIN reset for class/year |
| POST | /api/schools/users/:id/avatar | schools.ts | Set user avatar |
| GET  | /api/incidents | incidents.ts | List/filter incidents (role-scoped) |
| POST | /api/incidents | incidents.ts | Create incident (computes escalationTier, may send emails/alerts) |
| GET  | /api/incidents/my-disclosures | incidents.ts | Parent's pending disclosure requests (STATIC — must stay before :id) |
| GET  | /api/incidents/:id | incidents.ts | Incident detail |
| PATCH| /api/incidents/:id/status | incidents.ts | Lifecycle update |
| PATCH| /api/incidents/:id/assess | incidents.ts | Coordinator assessment + parent visibility |
| POST | /api/incidents/:id/disclosure-request | incidents.ts | Ask parent to acknowledge disclosure |
| PATCH| /api/incidents/:incidentId/disclosure/:disclosureId/acknowledge | incidents.ts | Parent acknowledgement |
| GET  | /api/incidents/:id/export | export.ts | PDF export (pdfkit, Buffer) |
| GET  | /api/protocols | protocols.ts | Open/closed protocols list |
| POST | /api/protocols | protocols.ts | Open new safeguarding protocol |
| GET  | /api/protocols/:id | protocols.ts | Protocol detail |
| PATCH| /api/protocols/:id | protocols.ts | Update protocol fields/status |
| GET  | /api/protocols/:id/export | export.ts | Protocol PDF |
| GET  | /api/alerts | alerts.ts | Pattern-detected safeguarding alerts |
| PATCH| /api/alerts/:id | alerts.ts | Acknowledge / resolve |
| GET  | /api/notifications | notifications.ts | In-app notifications |
| PATCH| /api/notifications/:id/read | notifications.ts | Mark one read |
| PATCH| /api/notifications/read-all | notifications.ts | Mark all read |
| GET  | /api/dashboard/coordinator | dashboard.ts | Coordinator stats |
| GET  | /api/dashboard/analytics | dashboard.ts | Deep analytics |
| GET  | /api/dashboard/teacher-analytics | dashboard.ts | Teacher/year scope |
| GET  | /api/dashboard/parent | dashboard.ts | Parent stats |
| GET  | /api/dashboard/child/:id | dashboard.ts | Per-child overview |
| GET  | /api/dashboard/school-overview | dashboard.ts | Public school overview |
| GET  | /api/delegated-roles | delegatedRoles.ts | List appointments |
| POST | /api/delegated-roles | delegatedRoles.ts | New appointment |
| DELETE| /api/delegated-roles/:id | delegatedRoles.ts | Revoke |
| GET  | /api/annex-templates | annexTemplates.ts | List templates |
| GET  | /api/annex-templates/:framework | annexTemplates.ts | By framework |
| POST | /api/annex-templates | annexTemplates.ts | Create template |
| GET  | /api/referral-bodies | referralBodies.ts | External agencies |
| POST | /api/referral-bodies | referralBodies.ts | Add agency |
| PATCH| /api/referral-bodies/:id | referralBodies.ts | Update agency |
| GET  | /api/case-tasks | caseTasks.ts | Tasks per protocol |
| POST | /api/case-tasks | caseTasks.ts | Create task |
| PATCH| /api/case-tasks/:id | caseTasks.ts | Update task |
| GET  | /api/messages | messages.ts | Inbox |
| POST | /api/messages | messages.ts | Send message |
| GET  | /api/messages/conversations | messages.ts | Threaded view |
| GET  | /api/messages/child-alerts | messages.ts | Parent: child-related alerts |
| GET  | /api/messages/parent-contacts | messages.ts | Parent: reachable staff |
| GET  | /api/messages/safe-contacts | messages.ts | Pupil: trusted adults |
| PATCH| /api/messages/:id/read | messages.ts | Mark read |
| GET  | /api/senco/caseload | senco.ts | SENCO active caseload |
| POST | /api/senco/caseload | senco.ts | Add pupil |
| DELETE| /api/senco/caseload/:id | senco.ts | Remove |
| GET  | /api/senco/caseload/:id/tracking | senco.ts | Tracking entries |
| POST | /api/senco/caseload/:id/tracking | senco.ts | New tracking entry |
| GET  | /api/senco/pupils-available | senco.ts | Pupils not on caseload |
| GET  | /api/behaviour/levels | behaviour.ts | Level thresholds |
| GET  | /api/behaviour/pupil/:pupilId | behaviour.ts | Per-pupil points |
| GET  | /api/behaviour/summary | behaviour.ts | School-wide summary (LEFT JOIN — all 88 pupils) |
| POST | /api/behaviour/points | behaviour.ts | Issue points |
| GET  | /api/behaviour/my-record | behaviour.ts | Pupil own record |
| GET  | /api/pta/dashboard | pta.ts | Anonymised aggregates (ptaPiiMiddleware) |
| GET  | /api/pta/messages, POST /api/pta/messages | pta.ts | PTA committee messaging |
| GET  | /api/pta/concerns, POST /api/pta/concerns | pta.ts | Formal concerns |
| GET  | /api/pta/policy, POST /api/pta/policy/acknowledge, POST /api/pta/policy/flag | pta.ts | Policy lifecycle |
| GET  | /api/pta/report/latest, /api/pta/report/all, POST /api/pta/report/generate, POST /api/pta/report/approve | pta.ts | Annual report |
| GET  | /api/pta/codesign, POST /api/pta/codesign/response | pta.ts | Co-design Q&A |
| GET  | /api/pta/mood-trends | pta.ts | Anonymised mood |
| GET  | /api/pta/resources | pta.ts | Parent resources |
| GET  | /api/parent/pta-contacts, POST /api/parent/pta-message | pta.ts | Parent → PTA outreach |
| GET  | /api/data-retention/policy | dataRetention.ts | Retention policy text |
| GET  | /api/diagnostics/results, POST /api/diagnostics/check | diagnostics.ts | Wellbeing surveys (1028-line file — uses OpenAI) |
| GET  | /api/diary, POST /api/diary | diary.ts | Pupil mood diary (uses OpenAI safeguarding scan) |
| GET  | /api/teacher-posts, POST /api/teacher-posts, DELETE /api/teacher-posts/:id | teacherPosts.ts | Noticeboard |
| GET  | /api/training/status, POST /api/training/complete | training.ts | Staff training completion |
| GET  | /api/audit/event-types | audit.ts | 45 static event-type strings (coordinator + head_teacher) |
| GET  | /api/audit | audit.ts | Paginated audit log, keyset cursor, filterable (coordinator + head_teacher) |

> **Note on explorer drift:** the route-explorer subagent reported `/api/audit/logs` and `/api/audit/summary` — those do **not** exist. The actual two audit endpoints are listed above (verified against `routes/audit.ts`).

### Frontend routes (Wouter — `artifacts/safeschool/src/App.tsx`)

| Path | Component | Guard | Notes |
|---|---|---|---|
| `/login` | `Login` | public | Multi-role login (Pupil / Staff / Parent / PTA tabs) |
| `/how-it-works` | `HowItWorksPage` | public | 1506-line marketing page |
| `/case-studies` | `CaseStudiesPage` | auth | — |
| `/` | `Dashboard` | auth | Role-adaptive switcher → Pupil/Teacher/Parent/Coordinator dashboard |
| `/report` | `ReportIncident` | auth | Multi-step incident form (1110 lines) |
| `/incidents` | `IncidentsList` | auth | — |
| `/incidents/:id` | `IncidentDetail` | auth | 1041 lines, includes disclosure UI |
| `/protocols`, `/protocols/new`, `/protocols/:id` | `ProtocolsList` / `NewProtocol` / `ProtocolDetail` | auth | — |
| `/class` | `MyClass` | auth | Teacher year/class view |
| `/alerts` | `AlertsPage` | auth | Pattern alerts |
| `/notifications` | `NotificationsPage` | auth | — |
| `/learn`, `/education`, `/training` | `LearnPage` | auth | Merged Education + Training (sub-tabs) |
| `/messages` | `MessagesPage` | auth | — |
| `/caseload` | `CaseloadPage` | auth | SENCO |
| `/behaviour` | `BehaviourPage` | auth | — |
| `/pta` | `PtaPortal` | auth | 5-tab PTA portal (841 lines) |
| `/diagnostics`, `/diagnostics/:id/results` | `DiagnosticsList` / `DiagnosticsResults` | auth | 975 lines for results |
| `/diary` | `DiaryPage` | auth | Pupil mood diary |
| `/learnings` | `LearningsPage` | auth | Noticeboard (nav label "Noticeboard") |
| `/training-status` | `TrainingStatusPage` | coordinator + head_teacher | Staff completion matrix |
| `/audit` | `AuditPage` | coordinator + head_teacher | This build's deliverable |
| `/settings` | `SettingsPage` | auth | Profile editor |

### Background jobs
- **`runScheduledPatternScan`** — `setInterval` in `artifacts/api-server/src/index.ts`. In-process; runs in every autoscale instance (known issue, see §15 / §11).
- **Audit-log Postgres trigger** — `audit_log_no_update BEFORE UPDATE OR DELETE` defined at server boot in `index.ts`.

No websockets. No queue system.

---

## 5. DATA MODEL

Tables defined in `lib/db/src/schema/*.ts`, barrel-exported via `lib/db/src/schema/index.ts`. **No raw SQL migrations** — schema is `drizzle-kit push` only (declared in `lib/db/package.json` scripts as `push` and `push-force`).

**Tables** (24 total, all UUIDs, all `school_id`-scoped except `newsletter_subscribers`):

| Table | File | Key fields | FK to |
|---|---|---|---|
| `schools` | schools.ts | name, legal_entity, cif, country (default ES), region (default Balearic Islands), active | — |
| `users` | users.ts | role, first/last_name, email (unique nullable), pin_hash, password_hash, year_group, class_name, avatar_*, parent_of (uuid[]), failed_login_attempts, locked_until, active, last_login | schools |
| `incidents` | incidents.ts | reference_number (unique, SS-YYYY-NNNN), reporter_role, anonymous, category, escalation_tier, safeguarding_trigger, incident_date/time, location, description, victim_ids (uuid[]), perpetrator_ids (uuid[]), unknown_person_descriptions (jsonb), witness_ids/text, emotional_state, status, protocol_id, parent_visible, witness_statements (jsonb), parent_summary, assessed_by, assessed_at | schools, users |
| `protocols` | protocols.ts | reference_number (unique, PROT-YYYY-NNN), protocol_type, gender_based_violence, linked_incident_ids (uuid[]), victim_id, alleged_perpetrator_ids (uuid[]), risk_level, risk_factors/protective_factors/protective_measures (text[]), external_referral_*, family_context (jsonb), status, closed_at | schools, users, referral_bodies |
| `interviews` | interviews.ts | protocol_id, interviewee_id/role, conducted_by, interview_date, summary, annex_reference | protocols, schools, users |
| `notifications` | notifications.ts | trigger, channel (in_app default), subject, body, reference, sent_at, acknowledged_at, delivered | schools, users |
| `pattern_alerts` | patternAlerts.ts | rule_id, rule_label, alert_level (amber/red), victim_id, perpetrator_ids/linked_incident_ids (uuid[]), status, notes | schools, users |
| `audit_log` | auditLog.ts | event_type (varchar 60), actor_role, actor_id, target_type/id, details (jsonb), ip_address, user_agent | schools |
| `delegated_roles` | delegatedRoles.ts | role_type, mandate_scope, training_date, appointed_at, expires_at, revoked_at | schools, users |
| `annex_templates` | annexTemplates.ts | framework, annex_code, title, template_url, version, active | — |
| `referral_bodies` | referralBodies.ts | name, body_type, island, municipality, contact_*, active | schools (nullable) |
| `case_tasks` | caseTasks.ts | protocol_id, task_type, title, assignee_id, priority, status, due_at, completed_at/by | schools, protocols, users |
| `messages` | messages.ts | sender_id, recipient_id, sender_role, priority, type, body, location, read_at, parent_message_id | schools, users |
| `senco_caseload` | sencoCaseload.ts | senco_id, pupil_id, reason, active | schools, users |
| `senco_tracking` | sencoCaseload.ts | caseload_id, pupil_id, recorded_by, progress/feelings/attitude_* (int), notes | schools, senco_caseload, users |
| `behaviour_points` | behaviourPoints.ts | pupil_id, points (int, signed), reason, category, incident_id, issued_by, issued_at, note | schools, users |
| `pta_messages` / `pta_concerns` / `pta_policy_acknowledgements` / `pta_codesign_responses` / `pta_annual_reports` | pta.ts | (see explorer output for details) | schools, users |
| `newsletter_subscribers` | newsletter.ts | organisation_type, email (unique), consent_given, subscribed_at, unsubscribed_at | — |
| `diagnostic_surveys` / `diagnostic_responses` / `diagnostic_actions` | diagnostics.ts | survey/question_key/answer (int)/comment/status | schools, users |
| `pupil_diary` | diary.ts | mood (int), note | schools, users |
| `teacher_posts` | teacherPosts.ts | title, body, category, audience | schools, users |
| `school_login_codes` | schoolLoginCodes.ts | code_type, code_hash, year_group, class_name, active, expires_at | schools |
| `incident_disclosure_permissions` | disclosurePermissions.ts | incident_id, subject_pupil_id, requested_by/from_parent_id, target_roles (text[]), target_user_ids (uuid[]), scope, status, responded_by/at, acknowledged_at, parent_response | schools, users |
| `training_completions` | trainingCompletions.ts | user_id, module_id, completed_at — UNIQUE(user_id, module_id) | schools, users |

**Migrations system:** none — schema is push-based via `pnpm --filter @workspace/db run push`. No `migrations/` directory exists. Drizzle reflects the schema and pushes diffs.

**Seed data:** `artifacts/api-server/src/lib/seed.ts` (`seedDemoData()` — idempotent, runs at server start when `DEMO_MODE=true`).

**Append-only enforcement:** `audit_log` has a Postgres trigger `audit_log_no_update BEFORE UPDATE OR DELETE` raised in `artifacts/api-server/src/index.ts` at boot. No application code or migration can bypass this without dropping the trigger.

---

## 6. AUTH & ACCESS CONTROL

- **Providers:** in-house only. No Replit Auth, no Clerk, no OAuth.
  - **Pupils:** class access code (`school_login_codes.code_hash`, bcrypt) → profile picker → 4-digit PIN (`users.pin_hash`, bcrypt). Failed attempts increment `users.failed_login_attempts`; after threshold sets `locked_until`. Unlock = coordinator/head_teacher resets PIN via `POST /api/schools/pupils/reset-pin/:pupilId`.
  - **Staff / Parent / PTA:** email + `password_hash` (bcrypt). Rate-limited to 30 attempts / 15 min per IP via in-memory `express-rate-limit`.
  - **Demo quick-login:** `POST /api/auth/demo-login` — only enabled when `DEMO_MODE=true`. Frontend gates the button on `GET /api/config`.
- **Session mechanism:** JWT (`jsonwebtoken`), `JWT_SECRET` env, expiry from `JWT_EXPIRES_IN`. Stored in browser `localStorage` under key `safeschool_token`, sent as `Authorization: Bearer …`. No refresh tokens. No httpOnly cookies (token is JS-readable — XSS risk vector, see §10).
- **Middleware:** `artifacts/api-server/src/lib/auth.ts` exports `authMiddleware` (verifies JWT, attaches `req.user: JwtPayload { userId, schoolId, role, email }`) and `requireRole(...allowed)` (returns 403 if `req.user.role` not in list).
- **Roles (9, all lowercase):** `coordinator, head_teacher, teacher, head_of_year, senco, parent, pupil, pta, admin`.
- **Tenancy:** every query is `WHERE school_id = req.user.schoolId`. `school_id` is **never** accepted from query strings. The `pta` role goes through `ptaPiiMiddleware` which strips PII from responses.
- **Admin surface:** No dedicated admin UI. The `admin` role exists in code but there are no `/admin/*` routes. Coordinator + Head Teacher are effectively the privileged users (training-status, audit log, alerts, full incident visibility).

---

## 7. EXTERNAL INTEGRATIONS & SECRETS

### Third-party services called from code

| Service | Called from | Purpose |
|---|---|---|
| Resend (email) | `artifacts/api-server/src/lib/emailHelper.ts` | All transactional emails. 3 triggers: disclosure-approved → parent, Tier 2/3 incident → coordinator+head_teacher, amber/red pattern alert → coordinator+head_teacher. Wrapper never throws — failures are audited with `eventType=email_send_failed`. |
| OpenAI (via Replit AI Integrations proxy) | `artifacts/api-server/src/routes/diary.ts`, `artifacts/api-server/src/routes/diagnostics.ts` | Diary entry safeguarding scan + diagnostic survey analysis. Model: `gpt-5-nano`. Accessed via `getOpenAI()` helper which returns `null` if env missing — caller must check and create a `diary_scan_skipped` coordinator notification. |
| Google Fonts (Inter, Nunito) | `artifacts/safeschool/index.html` | Stylesheet `<link>` |
| Shadcn UI schema | `artifacts/safeschool/components.json` | Tooling reference only — no runtime call |
| Replit AI Integrations | implicit, via OpenAI client baseURL | Acts as the LLM proxy (no own OpenAI key needed) |

**Stripe:** appears as a string literal `"stripe"` in `artifacts/api-server/build.ts` external-bundle list. **Not actually imported or called anywhere** — likely scaffolding boilerplate from a template. Flag for cleanup.

**Object storage / S3 / file uploads:** none. The app currently has no user-uploaded binary data; avatars are URL strings or selected presets.

**Analytics / Sentry / PostHog / GA:** none referenced.

### Environment variables referenced in code (names only)

| Var | Referenced in | Status |
|---|---|---|
| `PORT` | `api-server/src/index.ts` | Set by Replit |
| `NODE_ENV` | `api-server/src/routes/diagnostics.ts`, build | Standard |
| `DATABASE_URL` | `lib/db/src/index.ts` | Replit-managed Postgres |
| `JWT_SECRET` | `api-server/src/lib/auth.ts` | Must be set in all envs |
| `JWT_EXPIRES_IN` | `api-server/src/lib/auth.ts` | — |
| `DEMO_MODE` | `api-server/src/routes/config.ts`, `auth.ts`, `seed.ts` | Set `"true"` in `[userenv.development]`, absent in prod |
| `RESEND_API_KEY` | `api-server/src/lib/emailHelper.ts` | **UNKNOWN whether set in production** — wrapper logs console warning and skips silently if missing |
| `EMAIL_FROM_ADDRESS` | `api-server/src/lib/emailHelper.ts` | Defaults to `noreply@safeskoolz.com` if missing |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | `api-server/src/routes/diary.ts` (helper) | Replit AI Integrations |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | same | Replit AI Integrations proxy URL |
| `BASE_PATH` | `artifacts/safeschool/vite.config.ts` | Artifact preview path |
| `REPL_ID` | `artifacts/safeschool/vite.config.ts` | Replit identifier (cartographer plugin) |

**Referenced-but-not-confirmed-set:** `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` — UNKNOWN whether configured in the production deployment. CTX doc says "Must be set before go-live".

---

## 8. KEY USER FLOWS

### A. Pupil reports an incident
1. Pupil opens `/login`, picks **Pupil** tab → `artifacts/safeschool/src/pages/login.tsx`.
2. School select → class access code → `POST /api/auth/pupil/start` (`routes/auth.ts`) returns pupil-profile picker.
3. Profile + PIN → `POST /api/auth/pupil/login` → JWT in `localStorage.safeschool_token`.
4. Lands on `PupilDashboard.tsx`; clicks "I need help" or "Report something".
5. `/report` → `pages/report-incident.tsx` (1110 lines) multi-step form: who, what, when, where, how I feel.
6. Submits → `POST /api/incidents` (`routes/incidents.ts`):
   - `determineEscalationTier()` from `lib/escalation.ts` computes tier 1/2/3.
   - Row inserted into `incidents`.
   - `writeAudit({eventType:"incident_created"})` from `lib/auditHelper.ts`.
   - If `escalationTier >= 2`: create coordinator notification + (async, non-blocking IIFE) send email via `emailHelper.sendEmail`.
   - `runScheduledPatternScan` may later raise a `pattern_alerts` row, which itself triggers an email if amber/red.

### B. Parent acknowledges a disclosure
1. Coordinator viewing `/incidents/:id` (`pages/incidents/detail.tsx`) clicks **Request disclosure**.
2. `POST /api/incidents/:id/disclosure-request` → row in `incident_disclosure_permissions`, status `pending`.
3. Parent logs in (`/login` → Parent tab → `POST /api/auth/parent/login`).
4. `ParentDashboard.tsx` calls `GET /api/incidents/my-disclosures` (STATIC route — declared before `/incidents/:id`).
5. Parent clicks → reads the `parent_summary` field → `PATCH /api/incidents/:incidentId/disclosure/:disclosureId/acknowledge` with optional response text.
6. Server sets `acknowledged_at`, stores `parent_response` (null for whitespace-only), `writeAudit({eventType:"disclosure_acknowledged"})`, sends "disclosure approved" email to parent via Resend (non-blocking).

### C. Coordinator views the audit log (this build)
1. Coordinator dashboard `Overview` tab shows an "Audit Log" card (gated on `canManageReports`) → links to `/audit`.
2. `pages/audit.tsx` mounts under `ProtectedRoute allowedRoles={["coordinator","head_teacher"]}`. Wrong-role users see in-layout "Access denied".
3. Page fires two queries:
   - `GET /api/audit/event-types` → 45 strings for the filter dropdown.
   - `GET /api/audit?limit=50` → first page of rows.
4. Each row renders Date/Time, Event, Actor (`role + short uuid` or "System"), Target, IP.
5. "Load more" sends the server-issued `nextCursor` (base64 JSON `{createdAt, id}`); keyset ordering is `(createdAt DESC, id DESC)`. Malformed cursors return **400** `{error:"Invalid cursor"}`. Limit is integer-truncated then clamped to `[1, 200]`.
6. All requests pass `authMiddleware` → `requireRole("coordinator","head_teacher")`; tenancy is `WHERE school_id = req.user.schoolId`. The `audit_log` Postgres trigger guarantees no UPDATE/DELETE could ever have run against the rows being read.

### D. Pattern detection → amber/red alert → email
1. `setInterval` in `index.ts` runs `runScheduledPatternScan` from `lib/patternDetection.ts`.
2. Scan queries `incidents` for clusters (same victim, same category, same window).
3. If a rule fires: `createAlert()` inserts into `pattern_alerts` (rule_id, alert_level).
4. If `alert_level in ('amber','red')`: insert a coordinator+head_teacher notification and (async, non-blocking) send an email via `emailHelper`.
5. Coordinators see the row at `/alerts`; they `PATCH /api/alerts/:id` to acknowledge or resolve.

---

## 9. CODE QUALITY SIGNALS

### LOC (excluding generated + node_modules)

| Language | Lines |
|---|---|
| TypeScript (.ts) | 20,175 |
| TypeScript JSX (.tsx) | 30,226 |
| JSON | 9,726 |
| Markdown | 1,043 |
| CSS | 289 |
| JS/JSX/SQL | 0 |

### Top 10 longest first-party files (LOC, excluding generated)
| Lines | File |
|---|---|
| 1506 | `artifacts/safeschool/src/pages/how-it-works.tsx` |
| 1110 | `artifacts/safeschool/src/pages/report-incident.tsx` |
| 1100 | `artifacts/safeschool/src/pages/education.tsx` |
| 1041 | `artifacts/safeschool/src/pages/incidents/detail.tsx` |
| 1028 | `artifacts/api-server/src/routes/diagnostics.ts` |
| 1015 | `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx` |
| 1010 | `artifacts/api-server/src/routes/incidents.ts` |
| 975  | `artifacts/safeschool/src/pages/diagnostics-results.tsx` |
| 841  | `artifacts/safeschool/src/pages/pta.tsx` |
| (Generated: `lib/api-client-react/src/generated/api.ts` = 3298; `lib/api-zod/src/generated/api.ts` = 1232) |

### Linter / formatter / type-check
- **eslint:** no config found in the repo.
- **prettier:** `^3.8.1` in root devDeps, no `.prettierrc` found.
- **tsconfig (base):** `strictNullChecks: true`, `noImplicitAny: true`, `noImplicitReturns: true`, `noImplicitThis: true`, `strictBindCallApply: true`, `strictPropertyInitialization: true`, `useUnknownInCatchVariables: true`, `alwaysStrict: true`, `noFallthroughCasesInSwitch: true`. **`strictFunctionTypes: false`** and **`noImplicitOverride: false`** — slightly relaxed from full strict. `noUnusedLocals: false`. `skipLibCheck: true`. `target: es2022`, `moduleResolution: bundler`.
- **Typecheck status:** api-server typecheck clean. Safeschool `tsc --noEmit` reports **pre-existing** errors (none in audit-related files): `pages/protocols/detail.tsx`, `protocols/new.tsx`, `pta.tsx` (multiple), `report-incident.tsx`, `settings.tsx`. Not introduced by the latest builds (carry-forward issue).

### Tests
- **Framework:** vitest 4.1.4 + `@vitest/coverage-v8`. Backend only.
- **Count:** **38 tests across 5 files**, all passing as of latest run.
  - `auth.lockout.test.ts`
  - `emailHelper.test.ts`
  - `escalation.test.ts`
  - `incidents.escalation.test.ts`
  - `patternDetection.test.ts`
- **Coverage:** UNKNOWN — `pnpm test:coverage` script exists but no published report.
- **Frontend tests:** **none** (no `*.test.tsx`, no Playwright config in repo; e2e is run only via the testing-skill subagent).

### TODO / FIXME / HACK / XXX
- `rg "TODO|FIXME|HACK|XXX" -g '*.ts' -g '*.tsx' -g '!**/generated/**'` returned **zero matches**. Either truly clean, or markers were systematically scrubbed.

### Code smells observed
- **God pages:** several pages > 1000 LOC (`how-it-works.tsx`, `report-incident.tsx`, `education.tsx`, `incidents/detail.tsx`, `ParentDashboard.tsx`, `pta.tsx`, `diagnostics-results.tsx`). Mixed concerns (data fetching + UI + i18n + step logic) in single files.
- **Mixed data-fetch patterns:** some pages use generated React Query hooks (`lib/api-client-react/`), others use raw `fetch()` with hand-rolled `${import.meta.env.BASE_URL}api/...` + bearer token. Both coexist; CTX doc explicitly says "do not mix them within a single data-fetch concern on the same page".
- **Stripe dead reference:** `"stripe"` listed in `build.ts` externals but never imported.
- **No barrel for `safeschool` components:** ad-hoc relative imports throughout.
- **Permissive CORS:** allows any origin in `app.ts` (deliberate per code comment, but worth highlighting).
- **`runScheduledPatternScan` runs in-process** — duplicates alerts under autoscale (acknowledged in CTX as `FIX-04`).

---

## 10. SECURITY & SAFETY POSTURE

| Area | State |
|---|---|
| **Input validation** | Drizzle-zod schemas exist (`lib/api-zod/src/generated/api.ts`). Some routes parse with zod, others trust `req.body` shape — UNKNOWN coverage % without per-route audit. |
| **SQL injection** | Drizzle ORM with parameterised queries throughout. No raw `sql\`\`` template seen except the audit-log trigger DDL at boot (no user input). LOW risk. |
| **XSS** | React 19 default escaping. No `dangerouslySetInnerHTML` audit performed (UNKNOWN — flag for sweep). |
| **CSRF** | All mutating endpoints require `Authorization: Bearer …`; JWT in `localStorage`. No cookie-based session, so classic CSRF is N/A. **But** localStorage tokens are exfiltrable by any XSS. |
| **Secrets in code** | grep for `sk-`, `password = "`, hardcoded tokens — none found. Only `password123` / `parent123` / `pta123` literals appear in `seed.ts` / `CTX_architecture_safeskoolz_v1_0.md` as documented demo passwords. |
| **CORS** | `cors({ origin: (origin, cb) => cb(null, true), credentials: true })` — any origin allowed (deliberate for demo). Should be restricted before go-live. |
| **Rate limiting** | `express-rate-limit` in-memory, only on auth endpoints (30/15min) and newsletter (10/1hr). Per-instance — not shared across autoscale replicas (CTX `FIX-04`). |
| **Audit append-only** | Enforced by Postgres trigger `audit_log_no_update`. Verified. |
| **PII handling** | `pta` role responses pass through `ptaPiiMiddleware` to strip names. Other roles get raw data. |
| **Password storage** | bcrypt for both `password_hash` and `pin_hash` (4-digit PINs hashed). |
| **Account lockout** | `users.failed_login_attempts` + `users.locked_until`. Coordinator/head_teacher can list and reset via `/api/auth/locked-pupils` + `/api/schools/pupils/reset-pin/:pupilId`. |
| **Body size** | `express.json({ limit: "5mb" })` — generous. |
| **JWT expiry** | UNKNOWN — depends on `JWT_EXPIRES_IN` env. |
| **Anything publicly exposed that shouldn't be** | `GET /api/healthz`, `GET /api/config`, `POST /api/newsletter/subscribe`, `GET /api/auth/login-accounts` are all unauthenticated. `login-accounts` reveals demo accounts only when `DEMO_MODE=true`. |

---

## 11. PERFORMANCE & SCALABILITY

- **Known autoscale-hostile patterns** (documented in CTX as "FIX-04, do not go live without fixing"):
  1. `loginSessions` Map in `auth.ts` — pupil-login intermediate sessions held in-process; lost on instance restart, not shared.
  2. `runScheduledPatternScan` `setInterval` in `index.ts` — runs in every instance → duplicate alerts.
  3. `express-rate-limit` in-memory — per-instance counters, easy to bypass under autoscale.
- **N+1 queries:** not systematically audited. `dashboard.ts`, `incidents.ts`, `pta.ts` warrant a check.
- **Indexes:** `audit_log` has indexes on `school_id`, `event_type`, `created_at` (declared in `lib/db/src/schema/auditLog.ts`). Other tables: UNKNOWN coverage without inspecting each schema file.
- **Caching:** none — no Redis, no in-process cache, no HTTP cache headers on API responses.
- **Frontend bundle:** UNKNOWN — no published build report or bundle-analyzer output.
- **Load testing:** none — no `k6`, `artillery`, or similar in repo.
- **Sync IO on request path:** PDF generation uses pdfkit which buffers in memory then `res.send(buffer)` — fine for small docs, could be a problem for very long incident histories.

---

## 12. OBSERVABILITY

- **Logging:** plain `console.log` / `console.error` only. No structured logger (pino / winston / bunyan).
- **Error tracking:** none. The unhandled-error middleware in `app.ts` just logs and returns 500.
- **Analytics:** none.
- **Health checks:** `GET /api/healthz` (very basic — UNKNOWN whether it does a DB ping; if not, only proves the process is up).
- **Audit log:** strong observability for *user actions* (45 event types). Weak observability for *system state* (no metrics, no traces).

---

## 13. BUILD, DEPLOY, CI

### Commands
- Root: `pnpm build` → `pnpm run typecheck && pnpm -r --if-present run build`.
- Root typecheck: `pnpm typecheck` → `tsc --build` for libs + per-artifact `tsc --noEmit`.
- API server dev: `pnpm --filter @workspace/api-server run dev` → `NODE_ENV=development tsx ./src/index.ts`.
- API server build: `tsx ./build.ts` (esbuild).
- Safeschool dev: `vite --config vite.config.ts --host 0.0.0.0`.
- Safeschool build: `vite build`.
- Tests: `pnpm --filter @workspace/api-server test` → `vitest run`.

### Deployment
- **Target:** Replit Autoscale (`.replit` `[deployment] deploymentTarget = "autoscale"`).
- **Router:** `application` (path-based routing — each artifact mounted at its own preview path).
- **Post-build hook:** `pnpm store prune` (with `CI=true`).
- **Post-merge hook:** `scripts/post-merge.sh`, 20 s timeout.
- **Custom domain:** UNKNOWN — not declared in `.replit`.
- **Two prior publishes** visible in git log: `ea28b56` and `9480010` (commit messages "Published your App").

### CI
- **No `.github/workflows`** — there is no `.github` directory at all.
- All quality gates are local-only (`pnpm test`, `pnpm typecheck`).

---

## 14. KNOWN ISSUES & TODOS

### `TODO|FIXME|HACK|XXX` markers in `.ts`/`.tsx`
- **Zero.** Either truly clean or scrubbed.

### Known issues from CTX architecture doc (`CTX_architecture_safeskoolz_v1_0.md`)
1. **FIX-04 (DO NOT GO LIVE WITHOUT):** in-memory `loginSessions` Map (auth.ts), in-process `setInterval` pattern scanner, in-memory rate limiter. All three break under autoscale.
2. **FIX-05:** mixed React Query hooks vs raw fetch — inconsistency only, no functional bug.
3. **Pre-existing TS errors in frontend:** `pages/protocols/detail.tsx`, `protocols/new.tsx`, `pta.tsx`, `report-incident.tsx`, `settings.tsx` — flagged in CTX but not yet fixed. `tsc --noEmit` exits non-zero on the safeschool package.
4. **Deferred acceptance criteria still requiring live DEMO_MODE verification** (per CTX §"Deferred acceptance criteria"):
   - Demo login button render (RR-001)
   - PTA login E2E (RR-002)
   - Parent disclosure card E2E (RR-003)
   - Incident/Protocol PDF download E2E + parent/PTA 403 on export (RR-004)
   - Training UI + CSV (RR-005)
   - Locked-pupils card E2E (RR-006)
   - Email delivery for all 3 triggers (RR-007 — requires `RESEND_API_KEY`)
   - Audit log filter + load-more E2E (RR-010 — now verified by Playwright in the latest build)

### Other observed issues
- Stripe import string in `artifacts/api-server/build.ts:32` with no actual Stripe usage — likely template leftover.
- `replit.nix` is empty (0 bytes) — fine because `.replit` uses the `modules = […]` system instead, but worth confirming.
- README.md is **empty** (0 bytes).

---

## 15. WHAT'S MISSING (vs. expectations for a production K-12 safeguarding SaaS)

- **No `.github/workflows` (CI).** All checks are local.
- **No frontend tests.** No Playwright/Cypress/Vitest-DOM in the repo.
- **No structured logging or error tracking** (Sentry, etc.).
- **No analytics.**
- **No backup/restore documentation** for the Postgres database.
- **No data-retention enforcement** beyond the policy text endpoint (`/api/data-retention/policy`). No scheduled deletion of old incidents, messages, diary entries, etc.
- **No GDPR/LOPIVI tooling:** no "export my data" or "delete my account" self-service endpoints for parents/pupils.
- **No 2FA / MFA** for staff or coordinator accounts handling sensitive safeguarding data.
- **No password-reset flow** for staff/parents (only pupil PIN reset by coordinator). If a teacher forgets their password, UNKNOWN how they recover.
- **JWT in `localStorage`** rather than httpOnly cookie — typical XSS exposure.
- **No CSP / `helmet`** middleware on the Express app.
- **CORS allow-all** — needs origin allowlist for production.
- **In-memory state on autoscale** — `loginSessions`, rate limiter, pattern scanner all break (CTX FIX-04).
- **No db-backed background-job system** (cron / queue) — only `setInterval`.
- **No `README.md`** at the project root.
- **No `replit.md`** (Replit's convention for project overview + user preferences).
- **No production environment-variable checklist / `.env.example`.**
- **No staging environment** indication.
- **No accessibility audit** evidence (despite the app targeting children and parents).
- **No file/document upload** for incident evidence (photos, witness statements as files).

---

## 16. OPEN QUESTIONS

1. **Business model:** Is this licensed per-school, per-pupil, or free for the demo school only? Are there committed paying customers beyond Morna International?
2. **Scale targets:** how many concurrent schools / pupils / coordinators does the platform need to support at GA? This determines whether FIX-04 (autoscale-hostile in-memory state) is launch-blocking.
3. **Regulatory:** which exact LOPIVI / Convivèxit / Machista Violence clauses must the audit log + protocols satisfy? Any audit certifications planned (ISO 27001, SOC 2)?
4. **Data residency:** must the Postgres instance live in the EU? Replit's Postgres location and Resend's processing region need confirming.
5. **Account management at scale:** how do new staff/parents get onboarded — invite emails, school-admin self-service, IT sync? Currently invisible in the codebase.
6. **PDF export retention:** PDFs are generated on-demand and not stored. Is that intended, or are signed exports expected to be archived for the audit trail?
7. **Email deliverability:** has the `safeskoolz.com` sending domain been verified in Resend with SPF/DKIM/DMARC? `RESEND_API_KEY` status in production is UNKNOWN.
8. **Pupil PIN policy:** 4-digit PINs are easy to brute-force even with lockout. Is there a longer-term plan (rotating PINs, parent-managed PINs, QR-code login)?
9. **Disaster recovery:** what's the backup cadence and tested restore time for the Postgres database holding safeguarding case files?
10. **Languages:** the i18n covers en/es/fr/nl. Is Catalan (`ca`) intentionally excluded given the Balearic-Islands target market?

---

## 17. RAW METADATA

### `package.json` (root)
```json
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "scripts": {
    "preinstall": "sh -c 'rm -f package-lock.json yarn.lock; case \"$npm_config_user_agent\" in pnpm/*) ;; *) echo \"Use pnpm instead\" >&2; exit 1 ;; esac'",
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "typecheck:libs": "tsc --build",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck"
  },
  "private": true,
  "devDependencies": {
    "typescript": "~5.9.2",
    "prettier": "^3.8.1"
  }
}
```

### `.replit`
```
modules = ["nodejs-24", "python-3.11", "postgresql-16"]

[[artifacts]]
id = "artifacts/api-server"

[[artifacts]]
id = "artifacts/mockup-sandbox"

[deployment]
router = "application"
deploymentTarget = "autoscale"

[deployment.postBuild]
args = ["pnpm", "store", "prune"]
env = { "CI" = "true" }

[workflows]
runButton = "Project"

[agent]
stack = "PNPM_WORKSPACE"
expertMode = true

[postMerge]
path = "scripts/post-merge.sh"
timeoutMs = 20000

[userenv]

[userenv.shared]

[userenv.development]
DEMO_MODE = "true"

[nix]
channel = "stable-25_05"
```

### `replit.nix`
Empty (0 bytes).

### `README.md`
Empty (0 bytes).

### `pnpm-workspace.yaml`
```yaml
packages:
  - artifacts/*
  - lib/*
  - lib/integrations/*
  - scripts

autoInstallPeers: false

catalog:
  '@replit/vite-plugin-cartographer': ^0.5.0
  '@replit/vite-plugin-dev-banner': ^0.1.1
  '@replit/vite-plugin-runtime-error-modal': ^0.0.6
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  class-variance-authority: ^0.7.1
  clsx: 2.1.1
  drizzle-orm: 0.45.1
  framer-motion: 12.35.1
  lucide-react: ^0.545.0
  react: 19.1.0
  react-dom: 19.1.0
  tailwind-merge: 3.5.0
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.0
  zod: 3.25.76

minimumReleaseAge: 1440

onlyBuiltDependencies: [ '@swc/core', bcrypt, esbuild, msw, unrs-resolver ]

# (large `overrides:` block omitted — exclusively strips unused
#  native binaries for esbuild / rollup / @tailwindcss/oxide /
#  lightningcss / @expo/ngrok-bin to shrink install size)
```

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmitOnError": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": false,
    "noImplicitReturns": true,
    "noUnusedLocals": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": false,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "skipLibCheck": true,
    "target": "es2022",
    "types": [],
    "customConditions": ["workspace"]
  }
}
```

### `artifacts/api-server/package.json` (key fields)
```json
{
  "name": "@workspace/api-server",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx ./src/index.ts",
    "build": "tsx ./build.ts",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@workspace/api-zod": "workspace:*",
    "@workspace/db": "workspace:*",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2",
    "drizzle-orm": "catalog:",
    "express": "^5",
    "express-rate-limit": "^8.3.1",
    "jsonwebtoken": "^9.0.3",
    "openai": "^6.32.0",
    "pdfkit": "^0.18.0",
    "resend": "^6.10.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "catalog:",
    "@vitest/coverage-v8": "^4.1.4",
    "esbuild": "^0.27.3",
    "tsx": "catalog:",
    "vitest": "^4.1.4"
  }
}
```

### `artifacts/safeschool/package.json` (key fields)
```json
{
  "name": "@workspace/safeschool",
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "i18next": "^26.0.4",
    "react-i18next": "^17.0.2"
  },
  "devDependencies": {
    // React 19, Vite 7, Wouter 3, Tailwind v4, React Query (catalog),
    // 28 @radix-ui/react-* primitives, react-hook-form, zod,
    // recharts, sonner, framer-motion, lucide-react, cmdk, vaul,
    // date-fns, @workspace/api-client-react
    // (see full file)
  }
}
```

### `lib/db/package.json`
```json
{
  "name": "@workspace/db",
  "type": "module",
  "exports": { ".": "./src/index.ts", "./schema": "./src/schema/index.ts" },
  "scripts": {
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force": "drizzle-kit push --force --config ./drizzle.config.ts"
  },
  "dependencies": {
    "drizzle-orm": "catalog:",
    "drizzle-zod": "^0.8.3",
    "pg": "^8.20.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/pg": "^8.18.0",
    "drizzle-kit": "^0.31.9"
  }
}
```

### `lib/api-spec/package.json`
```json
{ "name": "@workspace/api-spec", "private": true,
  "scripts": { "codegen": "orval --config ./orval.config.ts" },
  "devDependencies": { "orval": "^8.5.2" } }
```

### `lib/api-zod/package.json`
```json
{ "name": "@workspace/api-zod", "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "catalog:" } }
```

### Last 20 git log entries
```
8066fa9 Update architecture documentation and improve email sending functionality
22014de Update audit log to return errors for invalid cursors
f0c271f Update audit log viewer with correct event type count
b1bd209 Update architecture documentation with audit log details
53e77d7 Add detailed audit log viewer with enhanced security and filtering capabilities
1f5955a Add an audit log viewer for authorized personnel
e8f096b Add file to track scan results for Safeskoolz pre-scan phase
815765b Show all pupils on the behaviour page, including those with no points
513fcd5 Fix navigation highlighting to prevent multiple items from illuminating
5c8a057 Add more emotion options to the incident reporting feature
8497d1e Improve pupil login reliability by using signed tokens
94ce889 Fix contrast issue for incident reporting information popovers
90db311 Add new message notification system with toasts, sounds, and badges
8c4bb90 Improve pupil chat functionality by creating an inline conversation window
10223cf Allow users to type names to find pupils instead of only scrolling
788b627 Ensure all pupils appear when selecting who was affected by an incident
f76919b Translate the demo tour into Spanish and other languages
85650c4 Published your App
ea28b56 Make demo access codes available to all users by default
9480010 Published your App
```

END OF STATE DUMP

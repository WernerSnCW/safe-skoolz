# CTX_ARCHITECTURE
Project: Safeskoolz
Version: 2026-04-13 — incorporating RR-2026-04-10-001
through RR-2026-04-12-008

---

## Stack

- Frontend: React 19, Wouter routing, TanStack React Query, Radix UI
  primitives (components/ui/), safeskoolz overrides (ui-polished.tsx),
  Tailwind CSS v4, Lucide icons
- Backend: Express (version from pnpm-workspace.yaml), TypeScript, Node.js
- Database: PostgreSQL (Replit-managed), Drizzle ORM (schema-first,
  drizzle-kit push — no raw SQL migrations)
- API contract: OpenAPI 3.1.0 (lib/api-spec/openapi.yaml) + Orval codegen
- Codegen output: React Query hooks → lib/api-client-react/src/generated/;
  Zod schemas → lib/api-zod/src/generated/
- Monorepo: pnpm workspaces — lib/*, artifacts/*, scripts/*.
  Cross-package refs use @workspace/ prefix
- LLM: OpenAI gpt-5-nano via AI_INTEGRATIONS_OPENAI_API_KEY env var.
  Used in: routes/diary.ts (safeguarding scan), routes/diagnostics.ts
  (survey analysis). Access via getOpenAI() helper — never instantiate
  client directly
- PDF generation: pdfkit (installed in artifacts/api-server package).
  Server-side, Buffer-based. Do not use stream piping — return Buffer
  and send via res.send()
- Email: Resend (installed in artifacts/api-server). Non-blocking,
  plain text only. See "Email notifications" section below
- Deployment: Replit autoscale

---

## Protected files

Files that must not be modified without explicit spec approval:

- `lib/api-spec/openapi.yaml`: API contract source of truth. Orval codegen
  runs from this. Do not edit without also running codegen:
  `pnpm --filter @workspace/api-spec run g`
- `lib/db/src/schema/index.ts`: barrel export — add new schema files here,
  do not remove existing exports
- `artifacts/api-server/src/lib/auditHelper.ts`: writeAudit() is the sole
  authorised way to write audit log entries. Do not insert directly into
  audit_log table. Do not modify writeAudit() signature without a phase
  doc naming this file explicitly
- `artifacts/api-server/src/lib/seed.ts`: seedDemoData() is idempotent and
  runs at server start when DEMO_MODE=true. Seed changes can corrupt demo
  data if not carefully gated. Follow insert-if-not-exists pattern
- `artifacts/api-server/src/lib/escalation.ts`: determineEscalationTier()
  and buildProtocolGuidance() implement LOPIVI/Convivèxit/Machista Violence
  compliance logic. Do not modify without a compliance phase doc

---

## Canonical values and env vars

- DEMO_MODE: controls demo quick-login and seed data. Set in
  [userenv.development] only — absent in production. Check via
  process.env.DEMO_MODE === "true"
- AI_INTEGRATIONS_OPENAI_API_KEY: OpenAI key for diary scan and
  diagnostics AI analysis. May be absent — always check getOpenAI()
  return value before use
- JWT_SECRET: shared env var (available in all environments)
- DATABASE_URL: Replit-managed PostgreSQL connection string
- API prefix: all routes mounted at /api in
  artifacts/api-server/src/app.ts
- Demo access code: MORNA2025 (school: Morna International College,
  schoolId: 0a6a9fba-5ecb-474f-8544-a7f2caafd924)
- Demo staff password: password123
- Demo parent password: parent123
- Demo PTA password: pta123
- Reference number formats: incidents: SS-YYYY-NNNN,
  protocols: PROT-YYYY-NNN

---

## Roles

Nine roles in the system. All role strings are lowercase:
coordinator, head_teacher, teacher, head_of_year, senco, parent, pupil,
pta, admin

Role access levels (general guidance — always check existing route RBAC
before adding new endpoints):
- coordinator: full access to all safeguarding data
- head_teacher: similar to coordinator for most views
- teacher / head_of_year: scoped to their class/year group pupils
- senco: caseload management + incident visibility
- parent: own children's data only, PII-limited
- pupil: own data only, child-safe UI
- pta: anonymised aggregate data only, all responses pass through
  ptaPiiMiddleware
- admin: system administration

---

## Patterns that must be followed

**Express route structure:**
Each domain gets its own Router() file in
artifacts/api-server/src/routes/<domain>.ts (or <domain>/index.ts).
All routers mounted in routes/index.ts.
CRITICAL: static routes must be declared before parameterised :id routes
within the same router. Example: GET /incidents/my-disclosures must appear
before GET /incidents/:id. Violation causes Express to match static paths
as :id values.

**Drizzle schema:**
Tables defined in lib/db/src/schema/*.ts, exported via barrel index.ts.
Schema changes pushed via drizzle-kit push. No raw SQL migrations ever.
New nullable columns on existing tables require no data migration —
existing rows get null automatically.

**Audit log:**
Every mutation and every sensitive read (e.g. PDF export) must call
writeAudit() from lib/auditHelper.ts. Audit log is append-only (Postgres
trigger prevents UPDATE/DELETE). Write audit AFTER successful operation,
not before — do not log actions that have not yet completed.

**Notification creation:**
Insert directly into notificationsTable via db. Look up recipient by
role + schoolId (e.g. coordinator for diary scan alerts). Match the
pattern in existing routes — do not create a notification service layer.

**AI scan failure handling (diary.ts):**
When getOpenAI() returns null or the OpenAI call throws: the operation
(diary entry creation) must still succeed. Create a coordinator
notification with trigger "diary_scan_skipped" and write an audit log
entry. Never fail the primary operation because AI is unavailable.

**PDF generation (pdfkit):**
Use pdfExport.ts helper functions. Always return a Buffer — do not pipe
the PDFDocument stream directly to the Express response. Pattern:
  const doc = new PDFDocument()
  const chunks: Buffer[] = []
  doc.on("data", chunk => chunks.push(chunk))
  doc.on("end", () => resolve(Buffer.concat(chunks)))
  // ... build PDF ...
  doc.end()
Set headers before sending:
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="..."`)
  res.send(buffer)

**Frontend data access:**
Pages may use either generated React Query hooks (from
lib/api-client-react/) or raw fetch() calls. Both patterns coexist —
do not mix them within a single data-fetch concern on the same page.
Do not run or modify Orval codegen as part of a UI build.

**Shadcn UI + Lucide:**
All new UI components must use Radix-based Shadcn UI primitives from
components/ui/ and Lucide icons. Do not introduce new UI libraries.

**Demo config endpoint:**
GET /api/config returns { demoEnabled: boolean } — public, no auth.
Use this in any frontend component that needs to conditionally show
demo-only UI. Do not hardcode IS_DEMO or check env vars in frontend code.

---

## Routing — frontend (Wouter)

Key routes as of 2026-04-10:
- /login — public
- /how-it-works — public
- /case-studies — public
- / — dashboard (role-adaptive)
- /report — report incident
- /incidents — incident list
- /incidents/:id — incident detail
- /protocols — protocol list
- /protocols/:id — protocol detail
- /protocols/new — new protocol
- /diary — pupil mood diary
- /messages — messaging
- /alerts — pattern alerts
- /behaviour — behaviour points
- /learn — merged Education + Training (sub-tabs: "About Safeguarding",
  "Using safeskoolz"). Created in RR-2026-04-10-002.
  /education and /training kept as backward-compatible aliases.
- /learnings — noticeboard (uses /api/teacher-posts backend).
  Nav label: "Noticeboard". Page heading: "Noticeboard".
- /diagnostics — wellbeing surveys
- /diagnostics/:id/results — survey results
- /pta — PTA portal (5 tabs)
- /caseload — SENCO caseload
- /training — kept as alias (content now in /learn)
- /education — kept as alias (content now in /learn)
- /training-status — staff training completion matrix (coordinator + head_teacher)
- /my-class — teacher class management
- /settings — profile editor
- /delegated-roles — role appointments
- /annex-templates — document templates

Removed routes (RR-2026-04-10-001):
- /newsletter — removed from frontend. Backend endpoint and
  newsletter_subscribers table retained.

---

## Schema additions (post-initial build)

### RR-2026-04-10-003 — disclosure_permissions table

Added two nullable columns:
- acknowledgedAt: timestamp with timezone, nullable
- parentResponse: text, nullable

Acknowledgement flow:
- PATCH /api/incidents/:incidentId/disclosure/:disclosureId/acknowledge
- Parent role only
- Validates: existence, ownership (parentId = authenticated user),
  status = "approved", idempotency (acknowledgedAt must be null)
- Uses atomic WHERE clause — do not split into separate select + update
- Writes audit log: eventType "disclosure_acknowledged"
- parentResponse: store null for empty/whitespace-only strings —
  check typeof response === "string" && response.trim().length > 0

New endpoint:
- GET /api/incidents/my-disclosures — parent role only, returns approved
  disclosures for authenticated parent scoped by schoolId
- CRITICAL: this static route must remain before GET /incidents/:id in
  the router declaration

---

## Export routes (RR-2026-04-10-004)

New route file: artifacts/api-server/src/routes/export.ts
Mounted in routes/index.ts.

Endpoints:
- GET /api/incidents/:id/export — roles: coordinator, head_teacher,
  senco, teacher, head_of_year. Per-record authorization matches detail
  view (teachers/heads of year scoped to their class/year group pupils).
- GET /api/protocols/:id/export — roles: coordinator, head_teacher, senco

PDF helper: artifacts/api-server/src/lib/pdfExport.ts
Functions: generateIncidentPDF(incident, school, requestingUser),
generateProtocolPDF(protocol, school, tasks, requestingUser)
Both return Promise<Buffer>.

PDF requirements (non-negotiable):
- "CONFIDENTIAL" in header and footer
- "This document is subject to LOPIVI data retention requirements" in footer
- Generation date and requesting user name in footer
- Filename: incident-[referenceNumber].pdf or protocol-[referenceNumber].pdf

---

## Training completions (RR-2026-04-10-005)

New table: training_completions
Schema file: lib/db/src/schema/trainingCompletions.ts
Fields: id (UUID PK), schoolId (UUID FK→schools), userId (UUID FK→users),
moduleId (varchar 100), completedAt (timestamptz default now())
Unique constraint: (userId, moduleId) — one completion record per user
per module. Idempotency enforced at application level before DB insert.
Index on (schoolId, userId) for staff-status query.

New route file: artifacts/api-server/src/routes/training.ts
Mounted at /api/training in routes/index.ts.
Route order (static before parameterised):
  GET /status — before
  GET /staff-status — before
  POST /complete/:moduleId — after (parameterised)

Module IDs (9 total — these are the canonical values, do not change
without a phase doc):
  loggingIncident        — "Logging an incident"
  assessingIncident      — "Assessing an incident"
  managingPupilPins      — "Managing pupil PINs"
  behaviourPoints        — "Behaviour points"
  respondingToMessages   — "Responding to messages"
  understandingAlerts    — "Understanding alerts"
  managingProtocols      — "Managing protocols" (coordinator/head_teacher)
  sencoCaseload          — "SENCO caseload management" (senco)
  dashboardOverview      — "Dashboard overview"

POST /api/training/complete/:moduleId behaviour:
- Validates moduleId against MODULE_IDS list — rejects unknown IDs with 400
- Idempotent — returns { moduleId, completedAt, alreadyCompleted: true }
  on re-completion, no duplicate insert, no audit log on re-completion
- Writes audit log eventType "training_module_completed" on first completion only

Roles excluded from training endpoints: pupil, pta
Roles included in staff-status: coordinator, head_teacher, teacher,
head_of_year, senco, support_staff

New frontend route: /training-status (coordinator + head_teacher only)
File: artifacts/safeschool/src/pages/training-status.tsx
Staff × module matrix table with per-module completion percentages.
CSV export is client-side only (Blob URL) — no backend endpoint.

---

## Locked pupils and audit corrections (RR-2026-04-10-006)

### New endpoint: GET /api/auth/locked-pupils

File: artifacts/api-server/src/routes/auth.ts
Auth: authMiddleware + requireRole("coordinator", "head_teacher")
Returns: array of { id, firstName, lastName, className, yearGroup,
lockedUntil, failedLoginAttempts } for pupils with lockedUntil > now(),
scoped by schoolId. Returns empty array when none locked. Ordered by
lockedUntil desc.
Declared before parameterised routes in auth.ts (line 91).

Unlock action: uses existing POST /api/schools/pupils/reset-pin/:pupilId
(schools.ts). This endpoint already clears lockedUntil = null and
failedLoginAttempts = 0, generates a new PIN, and writes audit log with
eventType "pin_reset". No separate unlock endpoint was needed.

### UrgentHelpDialog fix

File: artifacts/safeschool/src/pages/dashboard/PupilDashboard.tsx
Changed type field in urgent help POST from "message" to "urgent_help".
This ensures:
- Parent child-alerts endpoint (GET /messages/child-alerts) correctly
  finds urgent help messages (filters on type === "urgent_help")
- Notification trigger fires "urgent_help_request" instead of falling
  through to "pupil_message"

### Corrected audit events

Events that were previously missing or broken, now fixed:
- **diary_entry_created** (diary.ts): writeAudit after db.insert, before
  response. Previously unaudited.
- **diary_entry_deleted** (diary.ts): writeAudit after db.delete.
  Previously unaudited.
- **notification_acknowledged** (notifications.ts): writeAudit after
  db.update, after 404 check. Previously unaudited.
- **notification_broadcast** (notifications.ts): actor field corrected
  from user.userId (string) to user (JwtPayload). actorId and actorRole
  now correctly populated in audit log.

### Coordinator dashboard: locked pupils card

File: artifacts/safeschool/src/pages/dashboard/CoordinatorDashboard.tsx
Amber warning card in Overview tab, between stat cards and training card.
Only renders when locked pupils exist. Shows per-pupil:
- Name, class/year group
- Lock type (admin reset required vs timed lockout)
- Failed attempt count
- "Reset lockout" button → calls reset-pin endpoint → displays new PIN
  in green badge for coordinator to communicate to pupil

---

## Email notifications (RR-2026-04-12-007)

Provider: Resend (resend npm package, installed in artifacts/api-server)
Helper: artifacts/api-server/src/lib/emailHelper.ts

sendEmail({ to, toName, subject, bodyText, trigger, recipientId,
schoolId }): Promise<void>
Never throws. Catches both Resend { error } response field and thrown
exceptions. Writes audit log eventType "email_send_failed" on any
failure. Skips silently if RESEND_API_KEY not set (console warning only).

Env vars:
- RESEND_API_KEY: Resend API key. If absent, all emails skipped.
- EMAIL_FROM_ADDRESS: sender address. Defaults to "noreply@safeskoolz.com".
  Domain must be verified in Resend account before live use.

All email sends are non-blocking — fire-and-forget after response.
Do not await email sends in request handlers.

Three active triggers:
1. **Disclosure approved** (incidents.ts): when parent approves a
   disclosure request (decision === "approved"), email sent to parent
   with incident referenceNumber. Skips silently if parent has no email.
2. **Tier 2/3 incident** (incidents.ts): when escalationTier >= 2,
   email sent to all active coordinators + head_teachers with email.
3. **Pattern alert amber/red** (patternDetection.ts): inside
   createAlert() after successful insert, if alertLevel is "amber"
   or "red". Email sent to all active coordinators + head_teachers.

Plain text only — no HTML emails in this build. Do not add new email
triggers without a phase doc. Do not introduce HTML templates without
speccing the template system first. Existing in-app notifications
unchanged — email is purely additive.

---

## Test infrastructure (RR-2026-04-12-008)

Runner: vitest 4.x (devDependency in artifacts/api-server)
Coverage: @vitest/coverage-v8
Config: artifacts/api-server/vitest.config.ts
Scripts: `pnpm test` (vitest run), `pnpm test:coverage` (with v8)

Test files (38 tests total, all passing):
- src/__tests__/escalation.test.ts — 21 tests, pure function tests for
  determineEscalationTier, isSafeguardingTrigger, buildProtocolGuidance
- src/__tests__/auth.lockout.test.ts — 6 tests, lockout constant
  assertions + computeLockoutAction boundary tests
- src/__tests__/emailHelper.test.ts — 4 tests, sendEmail with mocked
  Resend (missing key, API error, thrown error, success)
- src/__tests__/incidents.escalation.test.ts — 3 tests, coordinator
  in-app notification logic for Tier 1/2/3
- src/__tests__/patternDetection.test.ts — 4 tests, createAlert
  deduplication + email send for amber/red alerts

Exported for testing (@internal):
- auth.ts: PUPIL_LOCK_MINUTES, PUPIL_LOCK_THRESHOLD,
  PUPIL_ADMIN_RESET_THRESHOLD (constants), computeLockoutAction()
- patternDetection.ts: createAlert() (was private, now exported)

Bug fix applied (RR-2026-04-12-008):
- incidents.ts line 218 (now 221): coordinator in-app notification
  condition changed from `escalationTier >= 3` to `escalationTier >= 2`.
  This aligns in-app notifications with the email trigger threshold
  (both now fire at tier >= 2). The || safeguardingTrigger part is
  unchanged.

---

## Known architectural weaknesses (do not resolve without a dedicated phase)

These are documented technical debt items. Do not address them as part of
unrelated builds — each requires its own phase doc:

1. **In-memory loginSessions Map (auth.ts):** Pupil login sessions stored
   in-process. Not shared across autoscale instances. Requires PostgreSQL-
   backed session store. Build ID: FIX-04 (not yet built).

2. **setInterval pattern detection (index.ts):** Runs in every instance
   in autoscale — creates duplicate alerts. Requires DB-backed lock or
   leader election. Build ID: FIX-04 (not yet built).

3. **express-rate-limit in-memory (app.ts):** Rate limit counters not
   shared across instances. Requires Redis or pg-backed store. Build ID:
   FIX-04 (not yet built).

4. **Mixed API call patterns:** Some pages use generated React Query hooks,
   others use raw fetch(). Both are acceptable but inconsistency increases
   maintenance burden. Build ID: FIX-05 (not yet built).

---

## Deferred acceptance criteria (carry forward)

These ACs require DEMO_MODE=true or a live authenticated session.
Verify when environment access is available:

From RR-2026-04-10-001:
- Demo login button renders and functions when DEMO_MODE=true

From RR-2026-04-10-002:
- PTA login end-to-end (JWT + redirect to PTA portal)

From RR-2026-04-10-003:
- Parent disclosure acknowledgement card end-to-end
- Empty parentResponse stored as null (not empty string) — NOTE: confirmed
  correct in code (trim check implemented) — can be marked VERIFIED

From RR-2026-04-10-004:
- Incident PDF download end-to-end (authenticated session required)
- Protocol PDF download end-to-end (authenticated session required)
- Parent/PTA role returns 403 on export endpoint (direct API call required)

From RR-2026-04-10-005:
- "Mark as read" updates UI without page reload (authenticated staff session)
- training-status.tsx table renders correctly and CSV downloads valid file
- Coordinator dashboard training card shows correct count and links correctly

From RR-2026-04-10-006:
- Parent child-alerts feed receives urgent help messages (pupil triggers
  Help Now → parent calls GET /messages/child-alerts → message appears)
- Broadcast audit log has non-null actorId and actorRole (trigger
  broadcast as coordinator → check audit_log)
- End-to-end lockout and reset flow (3 failed pupil PIN attempts →
  coordinator sees amber card → clicks Reset → new PIN shown → pupil
  logs in with new PIN)

From RR-2026-04-12-007 (require RESEND_API_KEY):
- Disclosure approved: parent receives email after approving disclosure
- Tier 2/3 incident: coordinators/head_teachers receive email on creation
- Pattern alert amber/red: coordinators/head_teachers receive email
- Email failure: audit_log entry with eventType "email_send_failed"

---

## Audit Log Viewer (RR-2026-05-03-010)

Route file: artifacts/api-server/src/routes/audit.ts
Mounted in routes/index.ts (after training).

Endpoints (both: requireRole("coordinator", "head_teacher")):
- GET /api/audit/event-types — static, returns 45 known event types
- GET /api/audit — paginated, filterable, keyset cursor on
  (createdAt DESC, id DESC)

Always scoped to user.schoolId — never accepts schoolId from query.
Limit: default 50, integer-truncated and clamped to [1, 200].
Malformed cursor (bad base64, invalid JSON, non-UUID id) silently
falls back to the first page (no 500). Audit log table is APPEND-ONLY
— do not add mutation endpoints to this router.

Frontend page: artifacts/safeschool/src/pages/audit.tsx
Route: /audit — ProtectedRoute, allowedRoles=["coordinator","head_teacher"].
Features: event-type filter dropdown, paginated table, "Load more".
Columns: Date/Time, Event, Actor, Target, IP Address.

Navigation: ScrollText icon imported in AppLayout.tsx. Nav item
"Audit Log" added to coordinator + head_teacher nav array
(after alerts, before diagnostic). Translation keys in EN/ES/FR/NL.

Dashboard: Audit Log card on CoordinatorDashboard Overview tab
(after Staff Training card), gated by canManageReports.

Defence in depth: three independent access controls —
ProtectedRoute (frontend route), requireRole (API), and
nav-branch role check (sidebar visibility).

ProtectedRoute extension: gained an optional allowedRoles?: string[]
prop. When set, an authenticated user whose role is not in the list
sees an in-layout "Access denied" panel.

---

## Out of date?

If a spec describes something that contradicts this file, flag it in Step 4.
Do not silently apply the older constraint.
Last reviewed against codebase: 2026-05-03 (updated after RR-2026-05-03-010)

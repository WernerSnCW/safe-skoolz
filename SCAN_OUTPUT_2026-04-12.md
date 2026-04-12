# CURRENT STATE OUTPUT — safeskoolz Code Scan

## 0. Scan coverage

**Scope:** scoped to: 7 files as specified  
**Fully scanned:** artifacts/api-server/src/routes/auth.ts, artifacts/api-server/src/routes/notifications.ts, artifacts/api-server/src/routes/messages.ts, artifacts/api-server/src/routes/diary.ts, artifacts/api-server/src/lib/auditHelper.ts, artifacts/safeschool/src/pages/dashboard/CoordinatorDashboard.tsx, artifacts/safeschool/src/pages/dashboard/PupilDashboard.tsx  
**Summarised at directory level:** none  
**Could not reach:** none  
**Limitations:** none

---

## 1. Key files

### artifacts/api-server/src/routes/auth.ts

**What it does:** Handles all authentication flows — pupil PIN-based login (two-phase: access code → profile select → PIN), staff email/password login, parent email/password login, demo login, profile update, login-account listing, and /auth/me identity endpoint.

**Key functions, variables, data structures:**

- `ROLE_LABELS` — Record mapping role strings to display labels (coordinator → "Safeguarding Coordinator", etc.)
- `STAFF_ROLES` — array of 6 staff role strings used by login-accounts endpoint
- `GET /auth/login-accounts` — public, no auth. Returns `[{label, subtitle, email}]` for active users by schoolId + type (staff/parent/pta). Sorted alphabetically.
- `loginSessions` — in-memory `Map<string, {schoolId, profiles, expiresAt}>` storing pupil login sessions. Cleaned every 60s via `setInterval`. Known autoscale weakness (FIX-04).
- `PUPIL_LOCK_MINUTES` (15), `PUPIL_LOCK_THRESHOLD` (3), `PUPIL_ADMIN_RESET_THRESHOLD` (5) — progressive lockout constants
- `POST /auth/pupil/start` — validates access code via bcrypt against `schoolLoginCodesTable`, returns `loginSessionToken` + pupil profile list. Class-scoped if code has className.
- `POST /auth/pupil/login` — validates PIN via bcrypt, implements progressive lockout (3 failures = 15-min lock, 5 failures = admin-reset lock via year 2099 sentinel). Clears session on success.
- `POST /auth/staff/login` — validates email+password via `StaffLoginBody` Zod schema + bcrypt. Restricts to 7 staff roles (teacher, head_of_year, coordinator, head_teacher, senco, support_staff, pta).
- `POST /auth/parent/login` — same pattern, restricted to role "parent".
- `PATCH /auth/profile` — authenticated, updates firstName/lastName/email/avatarType/avatarValue. Audits changes.
- `POST /auth/demo-login` — gated on `DEMO_MODE=true`. Picks first matching user by role. Bypasses password.
- `GET /auth/me` — returns `formatUser()` for authenticated user.
- `formatUser()` — maps usersTable row to safe API shape (id, schoolId, role, firstName, lastName, email, yearGroup, className, avatarType, avatarValue, avatarImageUrl, parentOf, active, lastLogin).

---

### artifacts/api-server/src/routes/notifications.ts

**What it does:** Manages in-app notification retrieval, acknowledgement, and broadcast delivery for school-wide alerts.

**Key functions, variables, data structures:**

- `GET /notifications` — authenticated, paginated (default page 1, limit 20). Returns notifications for `recipientId = user.userId` scoped by schoolId. Includes total count.
- `PATCH /notifications/:id/acknowledge` — sets `acknowledgedAt = now()` on a notification owned by the requesting user.
- `BROADCAST_ROLES` — `["coordinator", "head_teacher"]` — roles permitted to broadcast.
- `AUDIENCE_ROLES` — maps audience keys (`all_parents`, `all_staff`, `all`, `parents_and_staff`) to arrays of target role strings.
- `POST /notifications/broadcast` — validates subject (≤200 chars), body (≤2000 chars), audience. Queries all active users matching target roles in school, batch-inserts notifications (100 per batch). Writes audit log with `notification_broadcast` event. Uses trigger `school_broadcast`, channel `in_app`. Stores category in `reference` field.

---

### artifacts/api-server/src/routes/messages.ts

**What it does:** Implements the messaging system — contact discovery for pupils and parents, message sending with priority/type handling, conversation threading, read receipts, and child urgent-help alert visibility for parents.

**Key functions, variables, data structures:**

- `ALL_STAFF_ROLES` — readonly tuple of 6 staff roles.
- `GET /parent-contacts` — parent role only. Looks up parent's children via `parentOf` array, finds children's classes/year groups, returns all staff sorted by relevance (child's class teacher first, then head of year, then by role order). Adds `isChildsTeacher` and `displayRole` fields.
- `GET /safe-contacts` — pupil role only. Returns all staff sorted by form tutor first (matching pupil's className). Adds `isFormTutor` and `displayRole` (note: SENCO displayed as "School Counsellor" for pupils).
- `POST /messages` — authenticated. Validates recipientId + body. Validates priority (normal/important/urgent) and type (message/chat_request/urgent_help). Enforces pupil/parent→staff-only rule. Creates message row, generates notification with type-specific subject/body formatting: urgent_help gets "URGENT:" prefix with location; chat_request gets "would like to talk"; normal gets priority prefix. Writes audit log.
- `GET /messages` — authenticated. Returns messages where user is sender or recipient, optionally filtered by contactId. Limit 100, ordered by createdAt desc. Enriches with sender/recipient names and `isFromMe` flag.
- `PATCH /messages/:id/read` — sets `readAt = now()` for message owned by recipient. Idempotent.
- `GET /messages/conversations` — staff and parent roles only. Builds conversation map from all user messages, groups by contact, calculates unread count per contact. Returns sorted by unread-first, then recency.
- `GET /messages/child-alerts` — parent role only. Returns urgent_help messages sent by parent's children (via `parentOf`), limit 50.

---

### artifacts/api-server/src/routes/diary.ts

**What it does:** Manages the pupil feelings diary — CRUD for diary entries with non-blocking AI safeguarding scan via OpenAI gpt-5-nano. Flagged entries create pattern alerts; scan failures notify coordinators.

**Key functions, variables, data structures:**

- `openaiClient` — lazily initialised singleton OpenAI client via `getOpenAI()`. Uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` env vars. Returns null if not configured.
- `notifyScanSkipped(entryId, pupilId, schoolId, reason)` — creates coordinator + head_teacher in-app notifications with trigger `diary_scan_skipped`. Writes audit log with eventType `diary_scan_skipped`. Wraps in try/catch to prevent side effects from failing.
- `scanDiaryEntry(entryId, note, mood, pupilId, schoolId)` — called non-blockingly after diary entry creation. Skips notes < 10 chars. If no OpenAI client, calls `notifyScanSkipped`. Sends system prompt defining safeguarding concern criteria (self-harm, abuse, bullying, substance abuse, neglect, exploitation, domestic violence) and exclusion criteria (normal sadness, homework stress, peer conflict). Expects JSON `{flag, level, reason}`. If flagged, inserts into `patternAlertsTable` with ruleId `diary_ai_safeguard`, status `open`. On parse failure or API error, calls `notifyScanSkipped`.
- `GET /diary/entries` — pupil role only. Returns own entries, limit 100, ordered by createdAt desc.
- `POST /diary/entries` — pupil role only. Validates mood (1-5) and note (≤1000 chars). At least one required. Inserts entry, responds 201, then fires scan asynchronously via `.catch(() => {})`.
- `DELETE /diary/entries/:id` — pupil role only. Deletes own entry by id. Ownership-checked.

---

### artifacts/api-server/src/lib/auditHelper.ts

**What it does:** Provides the sole authorised function for writing to the append-only audit_log table.

**Key functions, variables, data structures:**

- `writeAudit(opts)` — accepts `{schoolId, eventType, actor?, targetType?, targetId?, details?, req?}`. Actor can be a `JwtPayload` (extracts role and userId) or undefined. Extracts IP from `req.ip`, user-agent from `req.headers["user-agent"]`. Inserts into `auditLogTable`. Details defaults to `{}`. No return value, no error handling (throws to caller).

---

### artifacts/safeschool/src/pages/dashboard/CoordinatorDashboard.tsx

**What it does:** Renders the coordinator/head_teacher dashboard with three tabs (Overview, Analytics, PTA Reports), stat cards, incident analytics charts, staff training summary, and annual PTA report generation/approval.

**Key functions, variables, data structures:**

- `CoordinatorDashboardView` — main export. Uses `useGetCoordinatorDashboard()` (generated React Query hook) for overview stats + raw `useQuery` for training staff-status and analytics.
- `CATEGORY_LABELS`, `STATUS_LABELS`, `CHART_COLORS` — static lookup maps for chart labels.
- Training query fetches `/api/training/staff-status` with raw fetch, counts staff who completed all 9 modules (`totalModules = 9` hardcoded). Shows "Staff Training Completion" card linking to `/training-status`.
- Analytics query fetches `/api/dashboard/analytics` with raw fetch. **Note: uses hardcoded `/api/dashboard/analytics` without BASE_URL prefix** (inconsistent with training query which uses `apiBase`).
- Overview tab: links to /incidents, /protocols, /report + training card.
- Analytics tab: 6 Recharts visualisations — incidents by type (horizontal bar), by year group (pie), monthly trend (line), incident status (donut), escalation tiers (bar), top locations (horizontal bar). Plus "Most Involved Victims" and "Most Named Perpetrators" lists with links to `/class?pupil=${id}`.
- `AnnualReportManager` — child component. Uses raw fetch to `/api/pta/report/all`, `/api/pta/report/generate` (POST), `/api/pta/report/approve` (POST). **Note: all three use hardcoded `/api/...` without BASE_URL prefix.** Renders report cards with status badges (draft/approved), approve button, and 4-stat summary grid (total incidents, categories, protocols, pattern alerts).

---

### artifacts/safeschool/src/pages/dashboard/PupilDashboard.tsx

**What it does:** Renders the child-safe pupil dashboard with a "Speak Up" report-incident card, safe contacts list, urgent help button, message dialog, and recent messages.

**Key functions, variables, data structures:**

- `QUICK_PHRASES` — array of 6 pre-written message phrases for pupils.
- `SCHOOL_LOCATIONS_MSG` — array of 11 school locations (playground, classroom, corridor, canteen, toilets, sports_field, changing_rooms, bus_stop, library, entrance_gate, other).
- `PRIORITY_OPTIONS` — 3 priority levels (normal/"Just letting you know", important/"I need help soon", urgent/"I need help now").
- `MessageDialog` — modal for sending messages to a safe contact. Supports message and chat_request types. Shows quick phrases, free-text input, priority selector, location selector (only for urgent). Uses raw fetch to `POST /api/messages`. Shows success confirmation with reassuring copy.
- `UrgentHelpDialog` — modal for "I Need Help NOW". Auto-selects form tutor + coordinator as recipients. Sends urgent messages to both. Location grid, optional body text. Shows "Help is on the way" on success, fallback text on error. **Note: uses hardcoded `/api/messages` without BASE_URL prefix.**
- `PupilMyMessages` — displays last 8 messages with sender/recipient, priority badges (URGENT/IMPORTANT), chat request badge, unread indicator. **Note: uses hardcoded `/api/messages` without BASE_URL prefix.**
- `PupilDashboard` — main export. Fetches `/api/safe-contacts` (hardcoded path). Renders greeting with first name + wave emoji, "Speak Up" card linking to /report, safe contacts list (top 4), urgent help button, messages section.

---

## 2. Data model

- **usersTable:** id (UUID PK), schoolId (UUID FK), role (string), firstName (string), lastName (string), email (string|null), passwordHash (string|null), pinHash (string|null), yearGroup (string|null), className (string|null), avatarType (string|null), avatarValue (string|null), avatarImageUrl (string|null), parentOf (string[]|null), active (boolean), lastLogin (timestamp|null), failedLoginAttempts (number|null), lockedUntil (timestamp|null)
- **schoolLoginCodesTable:** id, schoolId, codeType (string), codeHash (string), className (string|null), active (boolean), expiresAt (timestamp|null)
- **notificationsTable:** id (UUID PK), schoolId, recipientId, trigger (string), channel (string), subject (string), body (string), reference (string|null), sentAt (timestamp), acknowledgedAt (timestamp|null), delivered (boolean)
- **messagesTable:** id (UUID PK), schoolId, senderId, recipientId, senderRole (string), priority (string), type (string), body (string), location (string|null), parentMessageId (string|null), createdAt (timestamp), readAt (timestamp|null)
- **pupilDiaryTable:** id (UUID PK), pupilId, schoolId, mood (number|null), note (string|null), createdAt (timestamp)
- **patternAlertsTable:** id (UUID PK), schoolId, ruleId (string), ruleLabel (string), alertLevel (string), victimId (string), perpetratorIds (string[]|null), linkedIncidentIds (string[]|null), status (string), notes (string|null)
- **auditLogTable:** id (UUID PK), schoolId, eventType (string), actorRole (string|null), actorId (string|null), targetType (string|null), targetId (string|null), details (jsonb), ipAddress (string|null), userAgent (string|null), createdAt (timestamp)
- **JwtPayload (type):** `{ userId: string, schoolId: string, role: string, email?: string }`

---

## 3. Data flow

- **Pupil login:** `/auth/pupil/start` validates access code hash → stores session in in-memory Map → returns profiles → `/auth/pupil/login` validates PIN hash → progressive lockout on failure → JWT signed with `signToken()` → audit logged → token stored client-side in localStorage as `safeschool_token`
- **Staff/parent login:** POST `/auth/staff/login` or `/auth/parent/login` → Zod validation → bcrypt comparison → JWT → audit logged → token to client
- **Login account listing:** GET `/auth/login-accounts?schoolId=X&type=staff` → queries usersTable for active users by role/school → returns `[{label, subtitle, email}]` → frontend populates "Find my name" dropdown
- **Diary entry + AI scan:** POST `/diary/entries` → insert entry → respond 201 → fire `scanDiaryEntry()` non-blocking → OpenAI gpt-5-nano analysis → if flagged → insert patternAlert → if scan fails → `notifyScanSkipped()` → coordinator notification + audit log
- **Messaging:** Pupil/parent fetches contacts → selects recipient → POST `/messages` → insert message + insert notification for recipient → audit log. Staff fetch `/messages/conversations` for threaded view.
- **Notifications:** Created by messages, diary scan, broadcast. Fetched by `GET /notifications` (paginated). Acknowledged by `PATCH /notifications/:id/acknowledge`.
- **Coordinator dashboard:** Fetches overview stats via generated hook + analytics and training data via raw fetch → renders stat cards + Recharts visualisations + PTA report management.
- **Pupil dashboard:** Fetches safe contacts → renders contact cards + message dialogs + urgent help flow. Messages sent via `POST /api/messages` → notification created server-side.

---

## 4. Dependencies between files

- **auth.ts:** depends on `@workspace/db` (usersTable, schoolLoginCodesTable), `@workspace/api-zod` (StaffLoginBody), `../lib/auth` (signToken, authMiddleware, JwtPayload), `../lib/auditHelper` (writeAudit)
- **notifications.ts:** depends on `@workspace/db` (notificationsTable, usersTable), `@workspace/api-zod` (ListNotificationsQueryParams), `../lib/auth` (authMiddleware, JwtPayload), `../lib/auditHelper` (writeAudit)
- **messages.ts:** depends on `@workspace/db` (messagesTable, usersTable, notificationsTable), `../lib/auth` (authMiddleware, requireRole, JwtPayload), `../lib/auditHelper` (writeAudit)
- **diary.ts:** depends on `@workspace/db` (pupilDiaryTable, patternAlertsTable, notificationsTable, usersTable), `../lib/auth` (authMiddleware, requireRole, JwtPayload), `../lib/auditHelper` (writeAudit), `openai` package
- **auditHelper.ts:** depends on `@workspace/db` (auditLogTable), `./auth` (JwtPayload type)
- **CoordinatorDashboard.tsx:** depends on `@workspace/api-client-react` (useGetCoordinatorDashboard), `@/hooks/use-auth`, `@/components/ui-polished`, `recharts`, `lucide-react`, `@tanstack/react-query`
- **PupilDashboard.tsx:** depends on `@/components/ui-polished`, `@/lib/utils` (formatDate), `lucide-react`, `framer-motion`, `@tanstack/react-query`

---

## 5. Test coverage

No tests currently exist in the scanned files.

---

## 6. External services

- **OpenAI (gpt-5-nano):** Used in diary.ts for AI safeguarding scan of pupil diary entries. Accessed via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`. Gracefully degrades — scan failures do not block diary entry creation.
- **bcrypt:** Used in auth.ts for password/PIN hashing comparison and access code verification.
- **Recharts:** Used in CoordinatorDashboard.tsx for incident analytics visualisations (bar, pie, line, donut charts).
- **Framer Motion:** Used in PupilDashboard.tsx for message/urgent-help dialog animations.

---

## 7. Patterns and conventions

- **writeAudit() is mandatory:** Every mutation (login, message send, profile update, notification broadcast) and sensitive action calls `writeAudit()`. The audit log is append-only with a Postgres trigger preventing UPDATE/DELETE. Audit writes happen after the successful operation, not before.
- **Notification creation via direct insert:** All files insert into `notificationsTable` directly — there is no notification service layer. Pattern established in messages.ts (message notifications), diary.ts (scan-skipped alerts), notifications.ts (broadcasts).
- **Auth casting pattern:** `(req as any).user as JwtPayload` is used consistently across all authenticated routes to extract the user from the request.
- **requireRole middleware:** Used for role-based access control on specific routes (e.g., `requireRole("pupil")` for diary, `requireRole("parent")` for parent-contacts).
- **Static routes before parameterised:** Observed in auth.ts (login-accounts before pupil routes) and other route files.
- **Error shape:** All endpoints return `{ error: string }` on failure. No standard error middleware — each route handles its own errors.
- **Mixed data fetching on frontend:** CoordinatorDashboard.tsx uses both generated React Query hooks (`useGetCoordinatorDashboard`) and raw `fetch()` calls within `useQuery`. PupilDashboard.tsx uses only raw `fetch()`.

---

## 8. Inconsistencies and flags

1. **BASE_URL prefix inconsistency in CoordinatorDashboard.tsx:** The training staff-status query correctly uses `apiBase` (derived from `import.meta.env.BASE_URL`), but the analytics query uses hardcoded `"/api/dashboard/analytics"` and all three AnnualReportManager fetch calls use hardcoded `"/api/pta/report/..."`. This will break under path-based artifact routing if the app is not mounted at root.

2. **BASE_URL prefix missing in PupilDashboard.tsx:** All fetch calls (`/api/safe-contacts`, `/api/messages`) use hardcoded paths without BASE_URL prefix. Same path-routing risk.

3. **writeAudit actor inconsistency in notifications.ts:** The broadcast route passes `actor: user.userId` (a string) instead of the full JwtPayload object. All other files pass the JwtPayload object or structured `{userId, schoolId, role}`. This means broadcast audit log entries will have `actorRole` and `actorId` set incorrectly — `actorRole` will be undefined (since string has no `.role` property) and `actorId` will be undefined (since string has no `.userId` property).

4. **Notification trigger field in messages.ts:** The `POST /messages` trigger logic uses `user.role === "parent" ? "parent_message" : "pupil_message"` as the fallback, but staff-to-staff or staff-to-pupil messages would also hit this branch and get trigger `"pupil_message"` — which is semantically wrong for staff senders.

5. **SENCO display name inconsistency:** In messages.ts `GET /safe-contacts` (pupil view), SENCO is displayed as "School Counsellor". In `GET /parent-contacts` (parent view), SENCO is displayed as "SENCO". In auth.ts `ROLE_LABELS`, SENCO is "SENCO". The pupil-facing "School Counsellor" label may be intentional (child-safe language) but is not documented.

6. **No audit log on diary operations:** `POST /diary/entries` and `DELETE /diary/entries/:id` do not call `writeAudit()`. The scan-skipped path does write an audit log, but normal diary CRUD does not. Deletion of a diary entry is unaudited.

7. **No audit log on notification acknowledgement:** `PATCH /notifications/:id/acknowledge` does not call `writeAudit()`.

8. **UrgentHelpDialog sends type "message" not "urgent_help":** In PupilDashboard.tsx line 226, the urgent help dialog sends `type: "message"` with `priority: "urgent"` instead of `type: "urgent_help"`. This means the `GET /messages/child-alerts` parent endpoint (which filters on `type: "urgent_help"`) will not find these urgent messages. The notification trigger also falls through to `"pupil_message"` instead of `"urgent_help_request"`.

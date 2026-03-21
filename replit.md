# Overview

This is a pnpm workspace monorepo using TypeScript, designed for a multi-role safeguarding and incident reporting platform for schools called SafeSchool. The project aims to provide a comprehensive solution for managing incidents, ensuring compliance with various safeguarding frameworks (LOPIVI, Convivèxit 2024, Machista Violence), and facilitating communication among pupils, parents, and staff.

Key capabilities include:
- Role-based authentication and access control.
- Incident reporting with detailed tracking and escalation tiers.
- Compliance framework integration with delegated roles and annex templates.
- Pattern detection alerts for recurring issues.
- Structured risk assessment for safeguarding protocols.
- Pupil and parent messaging systems.
- SENCO caseload management.
- Comprehensive analytics dashboards for staff.

The project emphasizes a secure, privacy-conscious, and user-friendly experience to enhance child protection and school safety.

# User Preferences

- I prefer clear and concise communication.
- I appreciate detailed explanations when new concepts or significant changes are introduced.
- I expect iterative development with regular updates on progress.
- Please ask for confirmation before making any major architectural changes or introducing new dependencies.
- Ensure that all code adheres to TypeScript best practices and maintains type safety.
- Prioritize security and data privacy in all implementations, especially concerning pupil data.

# System Architecture

The project is structured as a pnpm workspace monorepo, separating deployable applications from shared libraries and utility scripts.

**Monorepo Structure:**
- `artifacts/`: Contains deployable applications like `api-server` (Express API) and `safeschool` (React+Vite frontend).
- `lib/`: Houses shared libraries including `api-spec` (OpenAPI), `api-client-react` (generated React Query hooks), `api-zod` (generated Zod schemas), and `db` (Drizzle ORM schema).
- `scripts/`: Holds various utility scripts.

**Technical Stack:**
- **Backend:** Node.js 24, Express 5, PostgreSQL with Drizzle ORM, Zod for validation, Orval for API codegen.
- **Frontend:** React, Vite, TailwindCSS for styling, Framer Motion for animations.
- **Authentication:** Custom JWT-based authentication with bcrypt for password hashing. Tokens are stored in `localStorage`.
- **Build System:** esbuild for CJS bundles.

**UI/UX Decisions:**
- The SafeSchool frontend is a React+Vite application.
- Role-specific dashboards and interfaces are provided for pupils, parents, teachers, and coordinators.
- Quick Demo Login panel on the login page facilitates easy access for demonstrations.
- Incident reporting forms adapt language based on the user's role (child-friendly for pupils, professional for staff).
- Data visualization for analytics includes monthly trend line charts and bar charts.
- Color-coded badges are used for protocol risk assessments.
- Pupil search functionality includes truncated last names for privacy.

**Feature Specifications & System Design:**
- **Auth & Roles:** JWT-based custom authentication with bcrypt. Supports various roles (pupil, parent, teacher, head_of_year, coordinator, head_teacher, senco, support_staff, pta) with a defined visibility hierarchy. Pupil PINs are unique random 4-digit numbers (not shared). Staff can reset PINs individually or in bulk from the My Class page, with printable PIN slips. PTA login uses staff login endpoint with role=pta.
- **API Proxy:** Vite development server proxies `/api/*` requests to the Express API server running on port 8080.
- **Database Schema:** Core entities include schools, users, incidents, protocols, interviews, notifications, pattern alerts, audit logs, messages, SENCO caseload, and tracking. Compliance-related tables manage delegated roles, annex templates, and referral bodies. Protocols can include JSONB fields for risk/protective factors and family context.
- **Compliance Frameworks:** Supports LOPIVI, Convivèxit 2024, and Machista Violence protocols, with dedicated tables for delegated roles, annex templates, and referral bodies.
- **Incident Management:**
    - Incident reporting captures emotional state and incorporates safeguarding checks.
    - Person identification supports searching by name and structured descriptions for unknown individuals, stored as JSONB.
    - Escalation tiers (tier1, tier2, tier3) categorize incidents based on severity.
    - Robust incident filtering by various criteria (child, year group, class, category, status).
    - Teacher assessment workflow allows staff to add notes, witness statements (JSONB array with timestamps), and parent summaries, with role-based visibility controls.
- **Messaging System:**
    - Pupil messaging with dynamic safe contacts, priority flags, and urgent help features.
    - Staff messaging inbox with conversation threads.
    - Parent messaging allows communication with school staff, listing child's teachers first.
- **SENCO Caseload Tracker:** Dedicated page for SENCOs to manage pupil caseloads, track progress, feelings, and attitudes, with a timeline history.
- **Behaviour Escalation Tracker:** Points-based system with 7 escalation levels (Good Standing → Warning → Formal Warning → Suspension Risk → Suspended → Term Exclusion → Full Exclusion). Staff can issue points by category, view school-wide summary. Pupils and parents see their own record with visual gauge and escalation ladder. DB: `behaviour_points`. Routes: `/api/behaviour/*`. Page: `/behaviour`.
- **PTA Portal (v0.3):** Full PTA portal at `/pta` with 6 sub-tabs: Dashboard (anonymised KPIs, category/trend/behaviour charts), Coordinator Channel (messaging between PTA and coordinator), Policy (acknowledge/flag current safeguarding policy), Annual Report (view approved reports), Co-Design (submit feedback on system design), Resources (LOPIVI guide, Convivèxit guide, templates, PTA rights checklist). DB tables: `pta_messages`, `pta_concerns`, `pta_policy_acknowledgements`, `pta_codesign_responses`, `pta_annual_reports`. All dashboard data is anonymised — no PII returned. Seed accounts: pta.chair@safeschool.dev / pta123, pta.member1@safeschool.dev / pta123.
- **Newsletter / Register Interest:** Public page at `/newsletter` (no auth required) for schools, authorities, trusts, NGOs, and other organisations to sign up for updates. Collects organisation type, name, contact details, role, region, interests, and consent. DB table: `newsletter_subscribers`. API: `POST /api/newsletter/subscribe` (public). Duplicate email protection. Link from the login page footer.
- **Analytics:** Anonymized school-wide analytics for parents and detailed staff dashboards with incident statistics, trends, and hotspots.
- **TypeScript & Composite Projects:** The monorepo leverages TypeScript with composite projects and project references for efficient type-checking and build processes.

# External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express (Node.js)
- **Frontend Framework:** React
- **Build Tool:** Vite, esbuild
- **Styling:** TailwindCSS
- **Animation Library:** Framer Motion
- **Validation:** Zod
- **API Code Generation:** Orval (from OpenAPI specification)
- **Authentication Hashing:** bcrypt
- **Query Management:** TanStack React Query (specifically `@tanstack/react-query`)
- **Rate Limiting:** express-rate-limit (auth and newsletter endpoints)

# v0.3.0 CRAFT Security & Architecture Fixes

The following 15 priority fixes from the CRAFT review have been implemented:

**Security (T001):**
- Demo login gated behind `DEMO_MODE=true` env var
- JWT secret fails startup if missing (no hardcoded fallback)
- `GET /schools` and `GET /schools/:schoolId/pupils` require auth + cross-school IDOR check
- Newsletter subscribe always returns 200 (no email existence leak)
- CORS restricted to dev domain
- Cross-tenant incident/protocol updates blocked by schoolId enforcement

**Data Integrity (T002):**
- Parent notification uses correct `parentOf` field (not `childIds`)
- Alert scope filtered to teacher/head_of_year's own pupils

**Rate Limiting (T003):**
- Auth endpoints: 10 req/15min per IP
- Newsletter: 5 req/hour per IP

**Safeguarding (T004):**
- Mandatory referral engine in escalation.ts for Tier 3/sexual/coercive incidents
- Protocol close blocked if mandatory referral not recorded

**Database (T005):**
- Indexes on schoolId, status, createdAt for incidents, protocols, pattern_alerts, audit_log, users, behaviour_points

**Audit (T006):**
- Audit logging for PIN reset, bulk PIN reset, behaviour points, SENCO caseload changes, message send

**API Contract (T007-T008):**
- api-zod duplicate export conflict resolved (single barrel export from generated/api)
- PTA report generation changed from GET to POST in OpenAPI, generated client, and backend

**Accessibility (T009):**
- Login tabs: role="tablist/tab", aria-selected, aria-live error banner
- AppLayout mobile menu: aria-label, aria-expanded
- Report incident: submit error state with aria-live
- Dashboard/PTA tabs: full ARIA tab semantics
- Charts wrapped with role="img" and descriptive aria-labels

**Data Retention (T010):**
- `GET /api/data-retention/policy` endpoint (coordinator/head_teacher/senco/pta only)
- 8 data categories with retention periods and LOPIVI legal bases

**Architecture (T011):**
- Dashboard split from 1857-line monolith into 4 sub-components: PupilDashboard, CoordinatorDashboard, TeacherDashboard, ParentDashboard
- Main dashboard.tsx reduced to ~40-line role router

## Spec Compliance Enhancements (Post-CRAFT)

**Pattern Detection — All 6 Rules (spec-complete):**
- `sexual_any` — Red alert on any sexual/sexualised category, notifies coordinator + head_teacher
- `same_victim_3_incidents` — Amber alert for 3+ incidents same victim in 30 days
- `same_pair_escalating` — Red alert if 3+ incidents across 2+ categories
- `group_targeting` — Red alert for same victim targeted by 3+ distinct perpetrators in 14 days
- `location_hotspot` — Amber alert for 3+ incidents at same location in 14 days
- `repeat_perpetrator` — Amber alert for 3+ incidents by same perpetrator in 30 days
- `emotional_distress_pattern` — Amber alert for 3+ distress reports in 30 days, notifies coordinator + SENCO
- Scheduled cron scan runs every 60 minutes across all schools
- Alert deduplication: `createAlert()` checks for existing open alerts with same rule + school + victim before inserting; notifications only sent for new alerts (idempotent)

**Pupil Session Timeout (90 seconds):**
- Inactivity auto-logout for pupil role only (mousedown, mousemove, keydown, touchstart, scroll events)
- Non-pupil roles unaffected (no timeout)
- Implemented in AuthProvider via useEffect with cleanup

**Schools/Pupils Endpoints — Public for Login:**
- `GET /schools` returns only id + name (minimal data for login selector)
- `GET /schools/:schoolId/pupils` returns truncated names for pupil login name picker
- No sensitive fields (email, address, CIF, legal entity) exposed on public endpoints

**PTA PII Middleware:**
- Dedicated `ptaPiiMiddleware.ts` intercepts all `/pta/*` responses for PTA role users
- Comprehensive PII field set (40+ fields): names, emails, IDs, phone, address, DOB, victim/perpetrator/witness identifiers
- Applied as Express middleware on the PTA route group — defense-in-depth alongside query-level anonymisation
- Recursively strips PII from nested objects and arrays

**Audit Log Immutability:**
- PostgreSQL BEFORE trigger `audit_log_no_update` blocks all UPDATE and DELETE on audit_log table
- Raises exception: "audit_log is append-only: UPDATE and DELETE operations are not permitted"
- Database-level enforcement — cannot be bypassed by application code
- Trigger auto-applied on API server startup via `ensureAuditLogImmutability()` in index.ts

## UX Improvements (Post-CRAFT)

**Demo Account Gating:**
- Staff/parent/PTA demo account lists and "Show me around" button gated behind `IS_DEMO` flag
- `IS_DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true"` — visible in dev, hidden in production unless explicitly enabled
- When not in demo mode, login shows only email/password manual entry (no account selector)

**Dark Mode Toggle:**
- Settings page includes Appearance section with Light/Dark/System toggle buttons
- Theme preference persisted to localStorage (`safeschool_theme` key)
- System option listens to `prefers-color-scheme` media query and auto-switches
- Inline script in `index.html` applies theme before React mounts (prevents flash of wrong theme)
- Full dark theme CSS variables defined in `.dark` class in `index.css`

**Smart Mobile Bottom Navigation:**
- Replaced arbitrary `navItems.slice(0,4)` with role-specific priority item selection
- `MOBILE_PRIORITY_HREFS` map defines most important nav items per role (e.g., pupils get Dashboard/Report/Education/Settings, coordinators get Dashboard/Incidents/Protocols/Alerts)
- Falls back to filling remaining slots from full nav list if fewer than 4 priority items match

**Skeleton Loaders & Error States:**
- TeacherDashboard: shimmer skeleton during data load, error state with refresh button if both queries fail
- ParentDashboard: structured skeleton matching dashboard layout (4 stat cards + content blocks)
- Loading state uses proper `isLoading` query flags (not data presence checks) to avoid premature skeleton dismissal

**Form Accessibility:**
- `autoComplete` attributes on login form: PIN (`one-time-code`), password (`current-password`), email (`email`)
- Unicode emoji escapes fixed to actual emoji characters in report-incident.tsx, ParentDashboard.tsx
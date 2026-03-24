# Overview

This project, safeskoolz (formerly SafeSchool), is a pnpm workspace monorepo using TypeScript, designed as a multi-role safeguarding and incident reporting platform for schools. Powered by Cloudworkz. Its core purpose is to provide a comprehensive solution for managing incidents, ensuring compliance with safeguarding frameworks (LOPIVI, Convivèxit 2024, Machista Violence), and facilitating secure communication among all school community members.

Key capabilities include role-based access, detailed incident tracking with escalation, compliance framework integration, pattern detection for early alerts, structured risk assessment, and dedicated messaging systems for pupils, parents, and staff. The platform also offers SENCO caseload management and comprehensive analytics. SafeSchool aims to enhance child protection and school safety through a secure, privacy-conscious, and user-friendly experience.

# User Preferences

- I prefer clear and concise communication.
- I appreciate detailed explanations when new concepts or significant changes are introduced.
- I expect iterative development with regular updates on progress.
- Please ask for confirmation before making any major architectural changes or introducing new dependencies.
- Ensure that all code adheres to TypeScript best practices and maintains type safety.
- Prioritize security and data privacy in all implementations, especially concerning pupil data.

# System Architecture

The project is a pnpm workspace monorepo, separating deployable applications from shared libraries.

**Monorepo Structure:**
- `artifacts/`: Contains deployable applications (`api-server`, `safeschool`).
- `lib/`: Houses shared libraries (`api-spec`, `api-client-react`, `api-zod`, `db`).

**Technical Stack:**
- **Backend:** Node.js 24, Express 5, PostgreSQL with Drizzle ORM, Zod, Orval.
- **Frontend:** React, Vite, TailwindCSS, Framer Motion.
- **Authentication:** Custom JWT-based authentication with bcrypt.
- **Build System:** esbuild.

**UI/UX Decisions:**
- React+Vite frontend with role-specific dashboards.
- Adaptive incident reporting forms (child-friendly vs. professional).
- Data visualization with charts and color-coded badges.
- Privacy-conscious pupil search.
- Dark mode toggle with system preference support.
- Smart mobile bottom navigation with role-specific priority items.
- Skeleton loaders and accessible error states.
- Enhanced form accessibility with `autoComplete` attributes.

**Feature Specifications & System Design:**
- **Auth & Roles:** JWT-based custom authentication supporting multiple roles (pupil, parent, staff, coordinator, etc.) with a visibility hierarchy. Pupil PINs are unique and resettable by staff. Pupil login uses a staged flow: school select → access code entry → profile tile selection → PIN entry. JWT payload: `userId` (NOT `id`), `schoolId`, `role`, `email`.
- **API Proxy:** Vite development server proxies API requests to the Express backend.
- **Database Schema:** Core entities include schools, users, incidents, protocols, notifications, pattern alerts, audit logs, messages, SENCO caseload, and compliance-related tables (delegated roles, annex templates, referral bodies). Protocols can include JSONB for dynamic data.
- **Compliance Frameworks:** Supports LOPIVI, Convivèxit 2024, and Machista Violence.
- **Incident Management:** Detailed reporting with emotional state capture, safeguarding checks, person identification (including unknown individuals), and three escalation tiers. Robust filtering and a teacher assessment workflow with role-based visibility. **Disclosure permission model:** Teachers/HoY/support staff see redacted incident data (no pupil names, descriptions hidden) until parent grants scoped disclosure permission. Coordinators/head teachers/SENCOs can request disclosure; parents approve/decline via incident detail page. Disclosure decisions are audit-trailed. Separate `incident_disclosure_permissions` table with scopes: `behavioural_action_only`, `summary_only`, `named_staff_view`, `full_incident_detail`. Only parent of the subject pupil may respond. Incidents carry `disclosureStatus` (not_requested/pending/approved/declined). API: `POST /incidents/:id/disclosure-request` (coordinator/head_teacher/senco), `PATCH /incidents/:id/disclosure-respond` (parent only), `GET /incidents/:id/disclosure-permissions`.
- **Messaging System:** Dedicated messaging for pupils (safe contacts, urgent help), staff (inbox), and parents (school staff communication).
- **SENCO Caseload Tracker:** Page for SENCOs to manage pupil caseloads, track progress, and view history.
- **Behaviour Escalation Tracker:** Points-based system with 7 escalation levels, visible to staff, pupils, and parents.
- **PTA Portal:** Full portal for PTA members with a dashboard (anonymized KPIs, **anonymised school-wide mood trend chart** from pupil diary data), messaging, policy acknowledgment, annual reports, co-design feedback, and resources. Data is anonymized. API: `GET /api/pta/mood-trends` returns weekly avg mood (12-week rolling, school-wide, no individual data). **Annual Report Management:** Coordinators can generate (`POST /pta/report/generate`) and approve (`POST /pta/report/approve`) annual safeguarding reports from the Dashboard > PTA Reports tab. Reports contain incident statistics, protocol outcomes, and alert summaries. Approved reports are visible to PTA members. `GET /pta/report/all` lists all reports for coordinators. Demo DB is seeded with a sample approved report.
- **Newsletter / Register Interest:** Public page for organizations to sign up for updates, collecting contact details and interests.
- **Analytics:** Anonymized school-wide analytics for parents and detailed staff dashboards with incident statistics and trends.
- **TypeScript & Composite Projects:** Monorepo uses TypeScript with composite projects for efficient type-checking.
- **Security Enhancements:** Demo login gated by environment variable, JWT secret validation, secure endpoint access (IDOR checks), newsletter subscribe returns 200 to prevent email leaks, restricted CORS, cross-tenant data enforcement, mandatory referral engine for critical incidents, immutable audit logs via PostgreSQL trigger.
- **Data Integrity:** Correct parent notification logic, alert scope filtering.
- **Rate Limiting:** Implemented on authentication and newsletter endpoints.
- **Pattern Detection:** Seven specific rules (`sexual_any`, `same_victim_3_incidents`, `same_pair_escalating`, `group_targeting`, `location_hotspot`, `repeat_perpetrator`, `emotional_distress_pattern`, `mood_decline`) trigger alerts with scheduled cron scans and deduplication. The `mood_decline` rule scans `pupil_diary` for sustained low mood (avg ≤2 over 5+ entries in 14 days), triggering amber alerts to SENCO + coordinators.
- **Pupil Session Timeout:** 90-second inactivity auto-logout for pupil roles only.
- **Public Endpoints:** `GET /schools` returns minimal data for login school selector. Public `GET /schools/:schoolId/pupils` has been **REMOVED** — replaced by staged pupil login flow: `POST /api/auth/pupil/start` (validates school access code, returns session token + profile tiles) → `POST /api/auth/pupil/login` (loginSessionToken + loginKey + pin → JWT). Sessions are in-memory with 10 min TTL. School access codes are bcrypt-hashed in `school_login_codes` table (demo: MORNA2025). Pupil lockout: 3 fails = 15 min lock, 5 fails = admin reset required.
- **PTA PII Middleware:** Dedicated middleware to strip PII from `/pta/*` responses for PTA users.
- **School Onboarding Diagnostic:** Multi-role climate survey for pupils, staff, and parents to assess safeguarding culture. Features role-adaptive UI, a 20-question bank across 5 categories, tiered disclosure (coordinators see full confidential results with charts; **teachers/parents/PTA see published summary with aggregated category scores, participation counts, bar charts by group, and published Agreed Actions** via `GET /diagnostics/:id/summary`), growth-oriented insight framing (Strengths/Growth Areas/Alignment Notes), an Agreed Actions workflow, **Priorities & KPIs** (auto-ranked by urgency with colour-coded badges — Critical/High/Moderate/Strength; each priority includes recommended KPIs with baseline/target/timeframe and suggested actions mapped to the 5 diagnostic categories), and **demo data seeding** (dev-only `POST /api/diagnostics/:id/seed-demo` replaces responses with realistic synthetic data across all role groups, transactional, gated to non-production).
- **Parent-to-PTA Contact:** Parents can message PTA representatives directly from their dashboard ("Contact Your PTA" card) and from the diagnostic actions page. Messages are stored as `pta_concerns` with category `parent_outreach` and audited. PTA member names (first name + last initial only) shown to parents via GET `/parent/pta-contacts`.
- **Pupil Feelings Diary:** Fully private wellbeing diary for pupils — only the pupil can see their entries. No parent, teacher, or coordinator access. Pupils record daily mood (1-5 emoji scale with standard Unicode emojis) with optional text notes. Physical diary aesthetic: leather-look cover, lined paper background, serif fonts (Georgia), date tabs, and warm brown colour scheme. **AI Safeguarding Scan:** After each diary entry, the backend non-blockingly scans note content via OpenAI (gpt-5-nano) for serious safeguarding concerns (self-harm, abuse, suicidal ideation, etc.). If flagged, a `pattern_alert` is created for the school's welfare lead with a fixed safe message ("A pupil's diary entry has been flagged for welfare review") — no diary text is ever included in alerts or logs. DB: `pupil_diary` table with CHECK constraint on mood range. API: `GET/POST/DELETE /diary/entries` (pupil only). Frontend: `/diary` page (pupil-only role guard).
- **Broadcast Notifications:** `POST /api/notifications/broadcast` endpoint for coordinator/head_teacher roles. Sends in-app alerts to audiences: `all_parents`, `all_staff`, `parents_and_staff`, `all`. Accepts subject (max 200 chars), body (max 2000 chars), audience, and optional category tag. Batched inserts (100/batch), audit-logged. Frontend: expandable "Send School Alert" panel on notifications page with audience/category dropdowns, subject/body inputs, success confirmation. Only visible to coordinator/head_teacher roles.
- **Case Studies Page:** Interactive page at `/case-studies` accessible from all role nav menus. Contains 6 real-pattern case studies with named characters (Marcus/Sofia ringleader bullying, Luna/Oliver retaliation cluster, Liam material/socio-economic bullying, Jack/Thomas classroom volatility pair, Mia slow emotional collapse, **casual misogyny/gender-based harassment under LOPIVI Machista Violence protocol**). Each case study has three layers: narrative (human story), what safeskoolz surfaces (data/pattern alerts), and interventions enabled. Content is role-adaptive: pupils see empowerment messaging, parents see "what you'd notice at home", teachers see "what to look for", coordinators see full data picture. **"What parents receive" section** shows example school alerts, PTA reports, and diagnostic insights for parent/PTA/coordinator roles. Links to relevant platform features. Demo data seeded with matching incidents, diary entries, behaviour points, and pattern alerts. Seed script: `scripts/src/seed-case-studies.ts`.
- **How It Works Page:** Public page at `/how-it-works` (no login required). Interactive step-by-step platform walkthrough following Sofia's bullying case through 7 stages (Week 1, 2, 3, 3, 4, 6, 8). Each stage shows actual platform screens with mockup UI elements: diary entry with mood selector, incident report form, pattern alert badges, coordinator dashboard with behaviour tracker, broadcast notifications, diagnostic surveys with perception gaps, and PTA annual report. Users navigate with Previous/Next buttons and switch between role perspectives (pupil, parent, teacher, coordinator, system) within each stage. Each screen mockup has a browser-style frame with the page name. Links to demo login and newsletter. Accessible from login page via purple "See how it works" banner. Demo parent accounts labelled "Parent of Bob" and "Parent of Caroline".
- **Diagnostic Perception Gaps:** Parent/non-leadership diagnostic results view includes a "Perception Gaps" card showing where respondent groups differ by ≥0.8 points, with human-readable interpretations (e.g., "Pupils experience this area very differently from Staff"). Displayed alongside the existing bar charts and published actions.
- **Teacher School Updates (Learnings):** Staff can broadcast posts to the school community. Posts have a title, body, category (general/safeguarding/wellbeing/curriculum/event/policy/heads_up), and audience (everyone/pupils/parents/staff/pupils_parents). Only staff roles can compose posts; all authenticated users see posts filtered by audience. Authors and coordinators/head teachers can delete posts. Cross-tenant isolation enforced on all operations. The "Heads Up" category auto-sets audience to "staff" and displays a prominent orange observation guidance banner at the top of the page for staff only. DB: `teacher_posts` table. API: `GET/POST /teacher-posts`, `DELETE /teacher-posts/:id`. Frontend: `/learnings` page with compose form (staff), filterable feed (all roles), and Heads Up banner (staff only). Nav: "School Updates" (Megaphone icon) in all role nav lists.

# External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express (Node.js)
- **Frontend Framework:** React
- **Build Tool:** Vite, esbuild
- **Styling:** TailwindCSS
- **Animation Library:** Framer Motion
- **Validation:** Zod
- **API Code Generation:** Orval
- **Authentication Hashing:** bcrypt
- **Query Management:** TanStack React Query
- **Rate Limiting:** express-rate-limit
- **AI Integration:** OpenAI SDK via Replit AI Integrations (gpt-5-nano for diary safeguarding scans)
# Overview

This project, SafeSkoolZ (formerly SafeSchool), is a pnpm workspace monorepo using TypeScript, designed as a multi-role safeguarding and incident reporting platform for schools. Powered by Cloudworkz. Its core purpose is to provide a comprehensive solution for managing incidents, ensuring compliance with safeguarding frameworks (LOPIVI, Convivèxit 2024, Machista Violence), and facilitating secure communication among all school community members.

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
- **Auth & Roles:** JWT-based custom authentication supporting multiple roles (pupil, parent, staff, coordinator, etc.) with a visibility hierarchy. Pupil PINs are unique and resettable by staff.
- **API Proxy:** Vite development server proxies API requests to the Express backend.
- **Database Schema:** Core entities include schools, users, incidents, protocols, notifications, pattern alerts, audit logs, messages, SENCO caseload, and compliance-related tables (delegated roles, annex templates, referral bodies). Protocols can include JSONB for dynamic data.
- **Compliance Frameworks:** Supports LOPIVI, Convivèxit 2024, and Machista Violence.
- **Incident Management:** Detailed reporting with emotional state capture, safeguarding checks, person identification (including unknown individuals), and three escalation tiers. Robust filtering and a teacher assessment workflow with role-based visibility. **Per-incident teacher consent:** Teachers/HoY/support staff see redacted incident data (no pupil names, descriptions hidden) until parent explicitly consents. Coordinators can request consent; parents approve/decline via incident detail page. Consent decisions are audit-trailed. DB fields: `teacher_consent_status` (not_requested/requested/approved/declined), `teacher_consent_requested_at`, `teacher_consent_responded_at`, `teacher_consent_responded_by`. API: `POST /incidents/:id/consent-request` (coordinator), `PATCH /incidents/:id/consent-respond` (parent).
- **Messaging System:** Dedicated messaging for pupils (safe contacts, urgent help), staff (inbox), and parents (school staff communication).
- **SENCO Caseload Tracker:** Page for SENCOs to manage pupil caseloads, track progress, and view history.
- **Behaviour Escalation Tracker:** Points-based system with 7 escalation levels, visible to staff, pupils, and parents.
- **PTA Portal:** Full portal for PTA members with a dashboard (anonymized KPIs, **anonymised school-wide mood trend chart** from pupil diary data), messaging, policy acknowledgment, annual reports, co-design feedback, and resources. Data is anonymized. API: `GET /api/pta/mood-trends` returns weekly avg mood (12-week rolling, school-wide, no individual data).
- **Newsletter / Register Interest:** Public page for organizations to sign up for updates, collecting contact details and interests.
- **Analytics:** Anonymized school-wide analytics for parents and detailed staff dashboards with incident statistics and trends.
- **TypeScript & Composite Projects:** Monorepo uses TypeScript with composite projects for efficient type-checking.
- **Security Enhancements:** Demo login gated by environment variable, JWT secret validation, secure endpoint access (IDOR checks), newsletter subscribe returns 200 to prevent email leaks, restricted CORS, cross-tenant data enforcement, mandatory referral engine for critical incidents, immutable audit logs via PostgreSQL trigger.
- **Data Integrity:** Correct parent notification logic, alert scope filtering.
- **Rate Limiting:** Implemented on authentication and newsletter endpoints.
- **Pattern Detection:** Seven specific rules (`sexual_any`, `same_victim_3_incidents`, `same_pair_escalating`, `group_targeting`, `location_hotspot`, `repeat_perpetrator`, `emotional_distress_pattern`, `mood_decline`) trigger alerts with scheduled cron scans and deduplication. The `mood_decline` rule scans `pupil_diary` for sustained low mood (avg ≤2 over 5+ entries in 14 days), triggering amber alerts to SENCO + coordinators.
- **Pupil Session Timeout:** 90-second inactivity auto-logout for pupil roles only.
- **Public Endpoints:** `GET /schools` and `GET /schools/:schoolId/pupils` return minimal, privacy-preserving data for login.
- **PTA PII Middleware:** Dedicated middleware to strip PII from `/pta/*` responses for PTA users.
- **School Onboarding Diagnostic:** Multi-role climate survey for pupils, staff, and parents to assess safeguarding culture. Features role-adaptive UI, a 20-question bank across 5 categories, tiered disclosure (coordinators see full confidential results with charts; all other roles see only published Agreed Actions), growth-oriented insight framing (Strengths/Growth Areas/Alignment Notes), an Agreed Actions workflow, **Priorities & KPIs** (auto-ranked by urgency with colour-coded badges — Critical/High/Moderate/Strength; each priority includes recommended KPIs with baseline/target/timeframe and suggested actions mapped to the 5 diagnostic categories), and **demo data seeding** (dev-only `POST /api/diagnostics/:id/seed-demo` replaces responses with realistic synthetic data across all role groups, transactional, gated to non-production).
- **Parent-to-PTA Contact:** Parents can message PTA representatives directly from their dashboard ("Contact Your PTA" card) and from the diagnostic actions page. Messages are stored as `pta_concerns` with category `parent_outreach` and audited. PTA member names (first name + last initial only) shown to parents via GET `/parent/pta-contacts`.
- **Pupil Feelings Diary:** Fully private wellbeing diary for pupils — only the pupil can see their entries. No parent, teacher, or coordinator access. Pupils record daily mood (1-5 emoji scale with standard Unicode emojis) with optional text notes. Physical diary aesthetic: leather-look cover, lined paper background, serif fonts (Georgia), date tabs, and warm brown colour scheme. **AI Safeguarding Scan:** After each diary entry, the backend non-blockingly scans note content via OpenAI (gpt-5-nano) for serious safeguarding concerns (self-harm, abuse, suicidal ideation, etc.). If flagged, a `pattern_alert` is created for the school's welfare lead with a fixed safe message ("A pupil's diary entry has been flagged for welfare review") — no diary text is ever included in alerts or logs. DB: `pupil_diary` table with CHECK constraint on mood range. API: `GET/POST/DELETE /diary/entries` (pupil only). Frontend: `/diary` page (pupil-only role guard).
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
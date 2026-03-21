# Overview

This project, SafeSchool, is a pnpm workspace monorepo using TypeScript, designed as a multi-role safeguarding and incident reporting platform for schools. Its core purpose is to provide a comprehensive solution for managing incidents, ensuring compliance with safeguarding frameworks (LOPIVI, Convivèxit 2024, Machista Violence), and facilitating secure communication among all school community members.

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
- **Incident Management:** Detailed reporting with emotional state capture, safeguarding checks, person identification (including unknown individuals), and three escalation tiers. Robust filtering and a teacher assessment workflow with role-based visibility.
- **Messaging System:** Dedicated messaging for pupils (safe contacts, urgent help), staff (inbox), and parents (school staff communication).
- **SENCO Caseload Tracker:** Page for SENCOs to manage pupil caseloads, track progress, and view history.
- **Behaviour Escalation Tracker:** Points-based system with 7 escalation levels, visible to staff, pupils, and parents.
- **PTA Portal:** Full portal for PTA members with a dashboard (anonymized KPIs), messaging, policy acknowledgment, annual reports, co-design feedback, and resources. Data is anonymized.
- **Newsletter / Register Interest:** Public page for organizations to sign up for updates, collecting contact details and interests.
- **Analytics:** Anonymized school-wide analytics for parents and detailed staff dashboards with incident statistics and trends.
- **TypeScript & Composite Projects:** Monorepo uses TypeScript with composite projects for efficient type-checking.
- **Security Enhancements:** Demo login gated by environment variable, JWT secret validation, secure endpoint access (IDOR checks), newsletter subscribe returns 200 to prevent email leaks, restricted CORS, cross-tenant data enforcement, mandatory referral engine for critical incidents, immutable audit logs via PostgreSQL trigger.
- **Data Integrity:** Correct parent notification logic, alert scope filtering.
- **Rate Limiting:** Implemented on authentication and newsletter endpoints.
- **Pattern Detection:** Six specific rules (`sexual_any`, `same_victim_3_incidents`, `same_pair_escalating`, `group_targeting`, `location_hotspot`, `repeat_perpetrator`, `emotional_distress_pattern`) trigger alerts with scheduled cron scans and deduplication.
- **Pupil Session Timeout:** 90-second inactivity auto-logout for pupil roles only.
- **Public Endpoints:** `GET /schools` and `GET /schools/:schoolId/pupils` return minimal, privacy-preserving data for login.
- **PTA PII Middleware:** Dedicated middleware to strip PII from `/pta/*` responses for PTA users.
- **School Onboarding Diagnostic:** Multi-role climate survey for pupils, staff, and parents to assess safeguarding culture. Features role-adaptive UI, a 20-question bank across 5 categories, tiered disclosure (coordinators see full confidential results with charts; all other roles see only published Agreed Actions), growth-oriented insight framing (Strengths/Growth Areas/Alignment Notes), and an Agreed Actions workflow where coordinators create, refine, and publish action items for the wider school community.
- **Parent-to-PTA Contact:** Parents can message PTA representatives directly from their dashboard ("Contact Your PTA" card) and from the diagnostic actions page. Messages are stored as `pta_concerns` with category `parent_outreach` and audited. PTA member names (first name + last initial only) shown to parents via GET `/parent/pta-contacts`.
- **Pupil Feelings Diary:** Private wellbeing diary for pupils — only the pupil and their linked parent can see entries. Pupils record daily mood (1-5 emoji scale) with optional text notes. Parents see a "Feelings Diary" card on their dashboard showing their child's recent mood trend and entries. Staff/coordinators have no access. DB: `pupil_diary` table with CHECK constraint on mood range. API: `GET/POST/DELETE /diary/entries` (pupil), `GET /diary/child/:childId` (parent with parentOf check). Frontend: `/diary` page (pupil-only role guard), `ChildDiaryCard` on parent dashboard.
- **Teacher School Updates (Learnings):** Staff can broadcast posts to the school community. Posts have a title, body, category (general/safeguarding/wellbeing/curriculum/event/policy), and audience (everyone/pupils/parents/staff/pupils_parents). Only staff roles can compose posts; all authenticated users see posts filtered by audience. Authors and coordinators/head teachers can delete posts. Cross-tenant isolation enforced on all operations. DB: `teacher_posts` table. API: `GET/POST /teacher-posts`, `DELETE /teacher-posts/:id`. Frontend: `/learnings` page with compose form (staff) and filterable feed (all roles). Nav: "School Updates" (Megaphone icon) in all role nav lists.

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
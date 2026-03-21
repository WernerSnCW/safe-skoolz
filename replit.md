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
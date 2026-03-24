# Overview

safeskoolz is a pnpm workspace monorepo designed as a multi-role safeguarding and incident reporting platform for schools. Its core purpose is to provide a comprehensive solution for managing incidents, ensuring compliance with safeguarding frameworks (LOPIVI, Convivèxit 2024, Machista Violence), and facilitating secure communication among all school community members. Key capabilities include role-based access, detailed incident tracking with escalation, compliance integration, pattern detection for early alerts, structured risk assessment, and dedicated messaging systems. The platform also offers SENCO caseload management and comprehensive analytics, aiming to enhance child protection and school safety.

# User Preferences

- I prefer clear and concise communication.
- I appreciate detailed explanations when new concepts or significant changes are introduced.
- I expect iterative development with regular updates on progress.
- Please ask for confirmation before making any major architectural changes or introducing new dependencies.
- Ensure that all code adheres to TypeScript best practices and maintains type safety.
- Prioritize security and data privacy in all implementations, especially concerning pupil data.

# System Architecture

The project is a pnpm workspace monorepo, separating deployable applications (`artifacts/`) from shared libraries (`lib/`).

**Technical Stack:**
- **Backend:** Node.js 24, Express 5, PostgreSQL with Drizzle ORM, Zod.
- **Frontend:** React, Vite, TailwindCSS, Framer Motion.
- **Authentication:** Custom JWT-based authentication with bcrypt.
- **Build System:** esbuild.

**UI/UX Decisions:**
- React+Vite frontend with role-specific dashboards.
- Adaptive incident reporting forms and data visualizations.
- Privacy-conscious pupil search and dark mode support.
- Smart mobile navigation, skeleton loaders, and accessible error states.
- Enhanced form accessibility with `autoComplete` attributes.

**Feature Specifications & System Design:**
- **Auth & Roles:** JWT-based custom authentication supporting multiple roles with a visibility hierarchy. Pupil login uses a staged flow with PIN entry.
- **Database Schema:** Core entities include schools, users, incidents, protocols, notifications, pattern alerts, audit logs, messages, SENCO caseload, and compliance-related tables.
- **Compliance Frameworks:** Supports LOPIVI, Convivèxit 2024, and Machista Violence.
- **Incident Management:** Detailed reporting with emotional state capture, safeguarding checks, three escalation tiers, and a teacher assessment workflow. A disclosure permission model allows parents to grant scoped access to incident details.
- **Messaging System:** Dedicated messaging for pupils, staff, and parents.
- **SENCO Caseload Tracker:** Manages pupil caseloads, progress, and history.
- **Behaviour Escalation Tracker:** Points-based system with 7 escalation levels.
- **PTA Portal:** Dashboard with anonymized KPIs, messaging, policy acknowledgment, and annual reports. Includes a "School-wide Mood Trend Chart" derived from pupil diary data.
- **Newsletter / Register Interest:** Public page for organizations to sign up for updates.
- **Analytics:** Anonymized school-wide analytics and detailed staff dashboards.
- **Security Enhancements:** Demo login gating, JWT secret validation, secure endpoint access (IDOR checks), restricted CORS, cross-tenant data enforcement, mandatory referral engine for critical incidents, immutable audit logs.
- **Data Integrity:** Correct parent notification logic and alert scope filtering.
- **Rate Limiting:** Implemented on authentication and newsletter endpoints.
- **Pattern Detection:** Seven rules (e.g., `same_victim_3_incidents`, `mood_decline`) trigger alerts with scheduled cron scans and deduplication. The `mood_decline` rule scans pupil diaries for sustained low mood.
- **Pupil Session Timeout:** 90-second inactivity auto-logout for pupil roles.
- **Public Endpoints:** `GET /schools` for school selector. Pupil login is a staged process (`POST /api/auth/pupil/start` then `POST /api/auth/pupil/login`).
- **PTA PII Middleware:** Strips PII from `/pta/*` responses for PTA users.
- **School Onboarding Diagnostic:** Multi-role climate survey with role-adaptive UI, 20-question bank, tiered disclosure (coordinators see full results; others see summaries and agreed actions), and growth-oriented insights. Includes `Priorities & KPIs` with recommended actions.
- **Parent-to-PTA Contact:** Parents can message PTA representatives directly.
- **Pupil Feelings Diary:** Private wellbeing diary for pupils with mood tracking and optional notes. Backend non-blockingly scans notes via OpenAI (gpt-5-nano) for safeguarding concerns, creating an alert without revealing diary text if flagged.
- **Broadcast Notifications:** Coordinator/head_teacher roles can send in-app alerts to various audiences (e.g., `all_parents`, `all_staff`).
- **Case Studies Page:** Interactive page with 6 real-pattern case studies demonstrating platform features, role-adaptive content, and interventions.
- **How It Works Page:** Public page with an interactive step-by-step walkthrough of the platform's features using a case study.
- **Protocol Guidance on Serious Incidents:** Post-submission guidance for Tier 2/3 incidents, displaying detailed protocols (LOPIVI, Convivèxit) with steps, warnings, legal basis, and referral requirements.
- **Diagnostic Perception Gaps:** Diagnostic results for parents/non-leadership include a "Perception Gaps" card highlighting significant differences in respondent group scores.
- **Teacher School Updates (Learnings):** Staff can broadcast posts with various categories and audience targeting. A "Heads Up" category provides prominent observation guidance for staff.

# External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express (Node.js)
- **Frontend Framework:** React
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Animation Library:** Framer Motion
- **Validation:** Zod
- **API Code Generation:** Orval
- **Authentication Hashing:** bcrypt
- **Query Management:** TanStack React Query
- **Rate Limiting:** express-rate-limit
- **AI Integration:** OpenAI SDK (gpt-5-nano)
# Morna Vibes — The Join Experience (Sub-project A)

**Date:** 2026-06-12
**Status:** Approved by Tom (brainstorming session, this date)
**Deadline:** PTA meeting **Monday 2026-06-15** — the join experience must be live so parents can sign up in the room.
**Part of:** the agreed pathway to deliver the full vision — Phase 0 (branding spine, settled here) → **Phase 1 = this (A)** → Phase 2 (B: PTA depth / M3 §4.3–4.4) → Track C (the report, parallel + legally gated). This spec covers **A only**.
**Source decisions:** the M2 spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md` (this spec supersedes parts of its §6 — see §7) and the live M2 build (membership approval, results, diagnostic, VOICE).

## 1. Context and goal

Morna's PTA meeting is Monday. Tom's aim is to get **every parent in the room to sign up** to "Morna Vibes" — the parent coalition asking (1) the school to adopt Values-based Education (VBE) and (2) the PTA to adopt the proposed three-tier operating structure so every parent has an equal voice and the same information that is currently PTA-members-only. A second on-ramp (an independent-feeling report on the behaviour patterns) is Track C and out of scope here.

**The wedge for A is the join itself.** A stable link (shared / pinned in Classlist) opens a **Morna Vibes front door**; a parent signs up with email + password and is **instantly inside** a deliberately simple one-screen shell — Goal 1, Goal 2, Concerns, Survey, Results — already backing both goals.

**Design principle: reuse, don't rebuild.** The app already has the VOICE object (join/back mechanics), the diagnostic survey (`/d/morna`), the results view (`/results/:slug`), and the membership approval queue (all shipped in M1/M2). A is mostly **new front-end wrapping existing capability**, plus two genuinely new pieces: a **sign-up page** and a **Concerns intake**. "Morna Vibes" *is* a VOICE group whose mission is the two goals; signing up and joining = backing it.

## 2. Branding (Phase 0, settled)

- The parent-facing name is simply **"Morna Vibes"** — one name, everywhere. **No submark, no "powered by", no promotional tagline.** It reads as the natural per-school convention "{School} Vibes" (so a future school's instance is "{Their School} Vibes"), carrying the vibes product identity without ever needing to say so.
- Internally the platform still evolves through stages (the parent coalition → an incorporated PTA → the school's reporting line — Phase B and beyond), but those stages are **not surfaced as separate brands** to parents. The name stays "Morna Vibes".
- Visual language follows the existing vibez rebrand (blue accent, Kenyan Coffee wordmark per the design-system memory). In-widget mockups used the `info` (blue) semantic; the build uses the app's existing vibez theme tokens.

## 3. Decisions made in this session

| Question | Decision |
|---|---|
| Pathway | Do it all, sequenced: Phase 0 (branding) → **A (this)** → B (PTA depth) → Track C (report, parallel/legal). |
| Sign-up friction | **Instant in** — sign up → straight inside the shell; can read/back goals and take the survey immediately. Approval-gating of Results is the **last** thing wired and may slip past Monday (M2 already enforces it server-side). |
| Auth model | **Email + password, instant login, no email-verification step to get in.** Forced by reality: production has no `RESEND_API_KEY` yet, so any magic-link flow would silently fail. (Email verification / Resend remains a separate later gate.) |
| Front door | **Morna-direct landing** (the shared link) → sign up → inside. The generic **search → join / request-to-create** flow is built (for the real multi-school pattern) but sits behind a quiet "different school?" link; Morna is the only school in the data. |
| What "Morna Vibes" is | The existing **VOICE group** for the Morna school, mission = the two goals. Signing up + joining = backing it (one act backs both goals). |
| Concerns tile | **Read + submit + admin triage.** Parents read the behaviour patterns (plain language, **never naming Morna**) and may privately submit their own concern; submissions land in an exec queue to consider. Distinct from the school's own formal safeguarding reporting line. |
| Naming | Just **"Morna Vibes"** — no submark, no "powered by", no promotion. Per-school convention "{School} Vibes". |
| The shell | One screen, five tiles: **Goal 1 · Goal 2 · Concerns · Survey · Results** + a "you're backing both goals" confirmation. |

## 4. The experience

### 4.1 Front door (public, the shared link)
A stable, slug-based Morna Vibes landing (recommended route `/join/:slug`, e.g. `/join/morna`; the exact path is an implementation detail). Shows: the "Morna Vibes" wordmark (no tagline); a one-line value framing ("How is Morna really doing? Join the parents asking the school and PTA to act."); the two goals as one-line teasers; a live **join counter** ("48 Morna families have joined" — sourced from the Morna Vibes group's backer count); and the **sign-up form** (email + create-password + "Sign up & join Morna Vibes"). Secondary links: "Already joined? Log in" (existing login) and "Different school?" (the generic search flow, §4.4).

### 4.2 Sign-up (the one net-new auth surface)
- `POST /api/auth/signup` (or equivalently named): body `{ email, password, schoolSlug }`. Validates email format + uniqueness; creates a `role=parent` user at the target school with `membershipStatus=pending` and a bcrypt password hash; **adds a `voice_members` backing row** for that school's Morna Vibes group (this is the "join = back both goals" act); returns a JWT exactly like login (instant session). No email is sent (so it works with Resend unconfigured).
- Existing `/login` is unchanged and is the return path.
- Pending status does **not** block entry (instant in); it only gates Results (already enforced by M2's `/d/:slug/results` membership check) and member-only views.

### 4.3 The shell (logged-in home for a community parent)
The single screen a community parent (no linked pupils) lands in — an evolution of the M2 community-mode `ParentDashboard` branch into the five-tile Morna Vibes home:
- **Goal 1 — Ask the school to adopt VBE.** Plain-language explainer; shows you're backing it + the backing count.
- **Goal 2 — Ask the PTA to adopt the 3-tier structure.** Explainer emphasising "every parent gets an equal voice and the same information that is PTA-members-only today"; backing + count.
- **Concerns.** The behaviour patterns explained plainly (seeded content, generic, never naming Morna) + "add your own" (§4.5).
- **Survey.** Links to the live diagnostic `/d/morna` (reused as-is).
- **Results.** Links to `/results/morna` (reused as-is); rendered as locked ("unlocks when released") until the exec releases AND the member is approved — both already enforced server-side by M2.
- A persistent "**you're backing both goals**" confirmation strip.

Joining backs both goals in one act; the Goal tiles are where the detail and the backing count live. (Granular per-goal proposal/ballot machinery is Phase B `pta_goals`, not A.)

### 4.4 School search → join / request-to-create (built, Morna-only data)
Reached via "Different school?". A search input → `GET /api/schools/search?q=` returns matching schools (by name/slug) and whether each already has a Voice/PTA. For a match: "Request to join" → sign up as a pending parent at that school (same as §4.2, but school chosen by search). For no match: "Request to create a Voice for your school" → `POST /api/schools/create-request` writes to an admin queue (name + requester contact). Morna is the only seeded school, so search returns Morna; the create path is wired but will only ever queue requests until a second school is approved. This is the funnel-entry pattern, not the full multi-school directory (that remains deferred — §7).

### 4.5 Concerns intake (the second net-new piece)
- Read: a concise, plain-language account of the behaviour patterns (the six recurring patterns / affluent-context harms), seeded as content, generic and **never naming Morna or any incident**.
- Submit: `POST /api/concerns` body `{ body }` (authed) → a `voice_concerns` row (`schoolId`, `userId`, `body`, `status='pending'`, `createdAt`). Private to the submitter and exec.
- Triage: `GET /api/concerns` (exec, school-scoped) lists submissions; an exec can mark `status` (`pending` → `reviewed`/`actioned`/`dismissed`). Audited via `writeAudit`.
- Kept strictly distinct from the school's own safeguarding reporting line — this is a community concern to the Morna Vibes coalition / PTA, not a safeguarding report.

## 5. Data model and API

**New:**
- `voice_concerns` table: `id`, `schoolId` (fk), `userId` (fk, submitter), `body` (text), `status` (`pending`/`reviewed`/`actioned`/`dismissed`, default pending), `createdAt`.
- `school_create_requests` table (lightweight): `id`, `schoolName`, `requestedByEmail`, `note?`, `status` (`pending`/`approved`/`declined`), `createdAt`. (May be deferred to the plan as the lowest-priority slice if Monday time is tight.)
- `POST /api/auth/signup` — create parent + back the Voice + return JWT (§4.2).
- `GET /api/schools/search?q=` — public; returns `[{ slug, name, hasVoice, hasPta }]`.
- `POST /api/schools/create-request` — public; queues a create request.
- `GET/POST /api/concerns` + concern status update — authed; submit + exec triage (§4.5).

**Reused as-is (no change):** the VOICE group join/backing (`voice_members`, the `/voice/*` endpoints) for the "join = back" act and the counter; the diagnostic (`/d/:slug`); results (`/d/:slug/results`, `/d/:slug/release`); membership approval (`/membership/*`); login + JWT/auth middleware; `memberDisplayName` anonymity (already applied to VOICE surfaces).

**Seed:** a "Morna Vibes" `voice_groups` row for the Morna school (mission = the two goals) so signups have something to back and the counter has a source. Tom (chair) seeded as its founder/owner.

## 6. Components / front-end

- `front-door` page (public) — the §4.1 landing + sign-up form (new).
- `morna-voice` shell page (authed) — the §4.3 five-tile home; evolves the M2 community-mode `ParentDashboard` branch (new, but replaces/extends that branch).
- Goal 1 / Goal 2 detail (can be sections or light sub-pages off the shell) — content + backing state (new, thin).
- Concerns page — read patterns + submit + (exec) triage list (new).
- School search page — behind "different school?" (new, thin).
- Reuses existing `diagnostic-community` (`/d/morna`), `diagnostic-results` (`/results/morna`), `login`, `membership-queue` pages unchanged.

Each new page is small and single-purpose; the shell composes links, not heavy logic.

## 7. Supersedes (recorded per the supersede-not-edit rule)

The M2 spec §6 deliberately deferred two things "until there's a second school." The goal shifted ("get everyone to sign up at the PTA meeting"), so A consciously reverses them **in shape, not in data**:
- **General sign-up** — A adds an explicit email+password sign-up (M2 said "signup reachable only via the diagnostic and direct invites"). Still single-tenant (Morna).
- **Multi-school "enter your school" UX** — A builds the search → join / request-to-create flow as the funnel entry, with Morna the only seeded school. The **full** multi-school self-serve directory remains deferred until a real second school exists.

## 8. Deliberately not in A

- Approval-gating UX polish (Results gating is already enforced server-side by M2; the exec approval *flow* niceties are the last thing wired and may slip past Monday).
- All Phase B / M3 depth: officer roles, charter claim, VOICE→PTA merge, `pta_goals` proposal/ballot, initiatives + five-stage process.
- Track C: the independent report (separate, legally gated).
- Email sending / Resend / domain (still Tom's gate; A is designed to work without it).
- The full multi-school directory and cross-school browsing.

## 9. Open items for the implementation plan

- Final route for the front door (`/join/morna` vs `/morna` vs reusing a slug pattern) — pick one that won't collide with `/d/:slug`, `/results/:slug`, `/v/:id`.
- Whether the join counter reads the Voice backer count or a distinct sign-up count (recommend Voice backer count).
- Whether Goal 1/Goal 2 are sections on the shell or thin sub-pages (recommend sections first; sub-pages only if needed).
- Seeded Concerns "patterns" copy — drafted generic, never naming Morna; Tom reviews wording (same gate as the instrument).
- Slice ordering for Monday: front door + sign-up + shell + survey/results links FIRST (meeting-critical); Concerns and school-search/create are the next slices; approval-gating UX last.

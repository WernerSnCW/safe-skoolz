# Chapter 2: Legitimacy Pathway (PTA Journey + Delegated Voice) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chapter 2 of the legitimacy spec (`docs/superpowers/specs/2026-06-14-chapter2-legitimacy-pathway-design.md`): the **5-stage PTA journey** a parent coalition walks from "my voice" to institutional recognition (`your_voice` → `shared_voice` → `collective_signal` → `pta_motion` → `school_recognition`, terminating in `vad_adopted`/converged **or** `school_recognised`), the **Delegated Voice mandate** captured at join (joining IS the G1+G2 authorisation, doubling as the GDPR consent step), a **threshold-batched collective signal** (default 10, per-tenant), the **legitimacy metric** (VOICE backers vs the non-VOICE incumbent PTA), and a **journey/pathway surface** on the community home — all non-adversarial, lightweight TRACKER-only (record + surface + gate), no active mechanisms, no-confidence as FAQ copy only. Builds on Chapter 1 (shipped) + the B2 VOICE→PTA convert path. The §8–10 engagement layer is OUT (future chapter).

**Architecture:** Extends the unified app on branch `feat/unified-app`. Three new tables — `coalition_pathway` (one row per VOICE, stage + outcome stamps), `voice_mandates` (per-member per-goal authorisation), `collective_signals` (the assembled signal log + recorded school response) — plus `schools.signal_threshold` (int default 10) and a `was_pta_member` boolean on **both** backing tables (`voice_members` and `voice_supporters`) for the legitimacy metric. The pathway row is created **at `POST /api/schools`** (in the same transaction that creates the founder-less advocating VOICE — it keys off voiceId/schoolId, no user needed), exactly as Ch1 provisions there. Mandates are written **at `/auth/signup`** inside the existing advocating-VOICE backing block (where Ch1 already promotes the first backer to founder + provisions the intake survey). A new pure `lib/pathway.ts` computes the effective stage, signal-threshold-met (backer count ≥ `schools.signal_threshold`), the legitimacy metric, and the terminal `isPathwayComplete` gate that Chapter 3 reads. Pathway endpoints hang off the existing `voiceGroupsRouter` (`GET /api/voice/:id/pathway`, `POST /api/voice/:id/signal`, `POST /api/voice/:id/pathway/motion`, `POST /api/voice/:id/pathway/recognition`, `PATCH /api/voice/:id/pathway/incumbent`) guarded member-vs-operator and school-scoped. On `vad_adopted` the motion endpoint hands to the existing `POST /voice/:id/convert` (B2) path by setting the pathway terminal + returning a `convert` hint (the actual merge stays the gated PTA/exec action, not auto-fired). Frontend adds a mandate-confirmation step at join and a `JourneySection` on community-home (+ a `/journey` route). Capabilities stay server-resolved; operator controls reuse `requirePlatformOperator`. Frontend reuses `AppShell`, `useTenant`, orval-generated hooks.

**Tech Stack:** Express 5 + Drizzle + Postgres (existing monorepo), vitest (existing harness: `app.listen(0)`, raw `pool` seeding, `fetch`, `jwt.sign` mint), React + wouter + orval-generated react-query hooks, Tailwind + the `AppShell` / `ui-polished` components.

**Conventions to follow (proven in this repo + the Ch1 plan):**
- Build vertical per slice: schema → apply DDL (additive `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`) → router (already registered: `voiceGroupsRouter`/`schoolsRouter` in `routes/index.ts`; mind PII-middleware ordering — voiceGroups is registered BEFORE `ptaRouter`, so no `ptaPiiMiddleware`) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page/section + route in `App.tsx`.
- Schema apply: `pnpm --filter @workspace/db push-force` is **interactive** (prompts on column/constraint changes) and has been permission-blocked before — prefer the equivalent additive SQL via `psql` (shown per task); it is exactly what push would generate (no drops).
- `pnpm typecheck` fails on PRE-EXISTING issues repo-wide — verify per-layer with the api-server tests and the safeschool build, not repo-wide typecheck.
- API tests load env first: `set -a; . ../../.env; set +a` from `artifacts/api-server`, then `pnpm exec vitest run <file>`. Tests INSERT their own school/voice/survey/user rows via `pool.query`, mint JWTs with `jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!)`, and never depend on seed scripts.
- Front-end build wipes `dist/public` → re-add `_worker.js` after every build (only matters for the demo Pages deploy, not prod). Build command: `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build`.
- AppShell-wrapped, SSR-safe (no top-level browser globals; guard `window`/`navigator`), **no framer enter-animations** on the journey surface.
- **Keep the shipped `voice_*` / "operating structure" naming** — the brief's "VAD framework" = the built operating structure (B1 charter), the brief's "VIBE community" = our VOICE. The terminology/branding rename is **Tom-owned** (spec §9); this plan adopts only the G1/G2 + journey framing.
- **Non-adversarial framing is a hard constraint** (spec §1.2): every string is constructive ("invitation, not a campaign"). All journey copy is **placeholder, Tom-owned** (end-of-redesign content audit) — marked in code.
- **G1/G2 hard scope** (spec §1.1) is enforced at the data layer: `voice_mandates.goal` is a 2-value enum, `collective_signals.topics` carries only G1/G2.
- **No-confidence is FAQ COPY only** (spec §7) — never a built control; no endpoint, no button.
- **No new privileged tenant role.** Member actions (fire signal, bring motion) are any VOICE member, threshold-gated. Recording motion outcome / recognition / incumbent size is **platform-operator / exec** (reuse `requirePlatformOperator` + the exec-role check), school-confirmable per Ch1's trust model.

---

## File Structure

| File | Create / Modify | Responsibility |
|---|---|---|
| `lib/db/src/schema/schools.ts` | Modify | Add `signalThreshold` int (default 10) to `schoolsTable`. |
| `lib/db/src/schema/voice.ts` | Modify | Add `wasPtaMember` boolean to BOTH `voiceMembersTable` and `voiceSupportersTable`; add the new `coalitionPathwayTable`, `voiceMandatesTable`, `collectiveSignalsTable` + enums + types. |
| `lib/db/src/schema/index.ts` | Modify | No new file (all Ch2 tables live in `voice.ts`, already exported via `export * from "./voice"`) — verify only. |
| `artifacts/api-server/src/lib/pathway.ts` | Create | Pure helpers: `PATHWAY_STAGES`, `effectiveStage`, `thresholdMet`, `legitimacyMetric`, `isPathwayComplete`. No DB. |
| `artifacts/api-server/src/routes/schools.ts` | Modify | In `POST /api/schools`, create the `coalition_pathway` row in the same transaction as the VOICE. |
| `artifacts/api-server/src/routes/auth.ts` | Modify | In the founder/voice-backing block, write `voice_mandates` (G1+G2) for the new member; capture `wasPtaMember` onto the backing row (`voice_members`). |
| `artifacts/api-server/src/routes/voiceGroups.ts` | Modify | Add the 5 pathway endpoints (`GET pathway`, `POST signal`, `POST pathway/motion`, `POST pathway/recognition`, `PATCH pathway/incumbent`). |
| `artifacts/api-server/src/lib/auth.ts` | Modify | Add `isExecOrOperator` helper (exec role OR platform operator) for the operator-gated pathway writes. |
| `artifacts/api-server/src/__tests__/pathway-lib.test.ts` | Create | TDD: stage/threshold/legitimacy/terminal pure-function unit tests. |
| `artifacts/api-server/src/__tests__/pathway-provision.test.ts` | Create | TDD: `POST /api/schools` creates a `your_voice` pathway row; signup writes G1+G2 mandates + `was_pta_member`. |
| `artifacts/api-server/src/__tests__/pathway-status.test.ts` | Create | TDD: `GET /api/voice/:id/pathway` shape (stage, counts, threshold, legitimacy, signal log, school response). |
| `artifacts/api-server/src/__tests__/pathway-signal.test.ts` | Create | TDD: `POST signal` gated on threshold; records `collective_signals`; returns the shareable artefact; school response surfaces to all. |
| `artifacts/api-server/src/__tests__/pathway-outcomes.test.ts` | Create | TDD: motion (`vad_adopted`/`vad_declined`), recognition, incumbent PATCH; member-vs-operator guard; school-scoped; terminal gate. |
| `lib/api-spec/openapi.yaml` | Modify | Add paths: `getVoicePathway`, `fireCollectiveSignal`, `recordPtaMotion`, `recordSchoolRecognition`, `setIncumbentPtaSize`; add `wasPtaMember` to the `signup` body. |
| `artifacts/safeschool/src/pages/join.tsx` | Modify | Mandate-confirmation step (G1/G2 + plain-language authorisation/consent statement, default-on, condition of joining) + `was_pta_member` checkbox; pass to `useSignup`. |
| `artifacts/safeschool/src/components/home/JourneySection.tsx` | Create | Community-home journey card: current stage, mandate counter, progress to threshold, legitimacy metric, the collective-signal action (gated), recorded school responses, next step. Placeholder copy (Tom-owned). |
| `artifacts/safeschool/src/components/home/PathwayOperatorControls.tsx` | Create | Operator/exec controls: record motion outcome / recognition / set incumbent size. Hidden for non-operators. |
| `artifacts/safeschool/src/pages/journey.tsx` | Create | Full-page `/journey` view wrapping `JourneySection` + `PathwayOperatorControls` in `AppShell`. |
| `artifacts/safeschool/src/pages/community-home.tsx` | Modify | Render `JourneySection` after `VoiceSection`. |
| `artifacts/safeschool/src/App.tsx` | Modify | Add the protected `/journey` route. |

---

### Task 1: Schema — signal threshold, was_pta_member, coalition_pathway, voice_mandates, collective_signals

**Files:**
- Modify: `lib/db/src/schema/schools.ts` (after the `releaseThreshold` column, line 28)
- Modify: `lib/db/src/schema/voice.ts` (add `wasPtaMember` to two tables; append three tables + enums + types)
- Verify: `lib/db/src/schema/index.ts` (already `export * from "./voice"` — no edit)

- [ ] **Step 1: Add `signalThreshold` to `schoolsTable`**

In `lib/db/src/schema/schools.ts`, add after the `releaseThreshold` line (line 28), before the `displayName` block:

```ts
  // Chapter 2 (spec §4): the collective-signal threshold. Below it, mandates are
  // logged internally and NO external communication fires; at/above it the
  // coalition can fire the collective signal (Stage 3). Per-tenant configurable
  // via the Ch1 platform-operator capability surface. Default 10 (brief).
  signalThreshold: integer("signal_threshold").default(10).notNull(),
```

(`integer` is already imported on line 1.)

- [ ] **Step 2: Add `wasPtaMember` to BOTH backing tables**

The spec (§4) computes the legitimacy metric from "VOICE backers who self-declared they are current PTA members" — and a backer is **either** a `voice_members` row (signed-up parent) **or** a `voice_supporters` row (public, account-less backer). Both must carry the flag so the count is complete.

In `lib/db/src/schema/voice.ts`, in `voiceMembersTable`, add after the `role` column (line 49):

```ts
  // Chapter 2 (spec §4): self-declared at backing — is this parent a CURRENT PTA
  // member? Feeds the legitimacy metric (VOICE backers vs the non-VOICE PTA).
  // Captured at /auth/signup; null = not asked / unknown.
  wasPtaMember: boolean("was_pta_member"),
```

In `voiceSupportersTable`, add after the `email` column (line 65):

```ts
  // Chapter 2 (spec §4): self-declared at public backing (mirrors voice_members).
  wasPtaMember: boolean("was_pta_member"),
```

Add `boolean` to the `drizzle-orm/pg-core` import on line 1:

```ts
import { pgTable, uuid, varchar, text, timestamp, index, unique, boolean } from "drizzle-orm/pg-core";
```

- [ ] **Step 3: Append the three Chapter-2 tables to `voice.ts`**

At the end of `lib/db/src/schema/voice.ts` (after the existing `export type` lines), add. `pgEnum` is avoided in favour of `varchar` + a TS const tuple to match the shipped `VOICE_STATUSES`/`VOICE_MEMBER_ROLES` style (no new pg enum types to migrate):

```ts
// ── Chapter 2: the Legitimacy Pathway (spec §2/§5) ───────────────────────────

// The 5-stage journey. Stages advance as events are recorded; the EFFECTIVE
// stage is COMPUTED from data (lib/pathway.ts), not blindly trusted from the
// column — the column is the highest recorded stage. Terminal outcomes live in
// dedicated columns (ptaMotionOutcome / schoolRecognisedAt + the VOICE's own
// status='converted'), not in the stage enum.
export const PATHWAY_STAGES = [
  "your_voice",         // 1: a parent registers their position (join + intake; Ch1)
  "shared_voice",       // 2: the coalition grows; the shared mandate is visible
  "collective_signal",  // 3: at threshold, ONE communication is assembled + fired
  "pta_motion",         // 4: a formal motion to adopt VAD is brought; PTA votes
  "school_recognition", // 5: the coalition requests formal school recognition
] as const;
export type PathwayStage = (typeof PATHWAY_STAGES)[number];

// PTA motion outcome (Stage 4). vad_adopted hands to B2 convergence (terminal);
// vad_declined is recorded and the FAQ documents the no-confidence option.
export const PTA_MOTION_OUTCOMES = ["vad_adopted", "vad_declined"] as const;
export type PtaMotionOutcome = (typeof PTA_MOTION_OUTCOMES)[number];

// The two — and only two — mission goals (spec §1.1 HARD scope).
export const MANDATE_GOALS = ["G1", "G2"] as const;
export type MandateGoal = (typeof MANDATE_GOALS)[number];

// One row per VOICE, created with the VOICE at POST /api/schools. Stage
// transitions stamp the *_at columns; threshold-met is computed, not stored.
export const coalitionPathwayTable = pgTable("coalition_pathway", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull().unique(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  // The highest RECORDED stage (effective stage is computed in lib/pathway.ts).
  stage: varchar("stage", { length: 24 }).notNull().default("your_voice"),
  // Declared incumbent PTA size (spec §4, school-confirmable). Nullable.
  incumbentPtaSize: integer("incumbent_pta_size"),
  incumbentConfirmedBySchoolAt: timestamp("incumbent_confirmed_by_school_at", { withTimezone: true }),
  // Stage-3 stamp (also stamped on the collective_signals row).
  signalFiredAt: timestamp("signal_fired_at", { withTimezone: true }),
  // Stage-4 outcome.
  ptaMotionOutcome: varchar("pta_motion_outcome", { length: 16 }),
  ptaMotionRecordedAt: timestamp("pta_motion_recorded_at", { withTimezone: true }),
  ptaMotionRecordedBy: uuid("pta_motion_recorded_by").references(() => usersTable.id),
  // Stage-5 terminal stamp.
  schoolRecognisedAt: timestamp("school_recognised_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_coalition_pathway_school").on(t.schoolId),
]);

// Per-member, per-goal Delegated Voice authorisation (spec §3). One row per goal
// per member (both G1+G2 on join). Joining IS the authorisation; the
// confirmationEvent records the consent act (doubles as the GDPR consent step).
export const voiceMandatesTable = pgTable("voice_mandates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  goal: varchar("goal", { length: 2 }).notNull(), // 'G1' | 'G2'
  authorisedAt: timestamp("authorised_at", { withTimezone: true }).notNull().defaultNow(),
  // Free-text record of the consent act, e.g. "join:2026-06-14 — accepted G1/G2 mandate".
  confirmationEvent: text("confirmation_event"),
}, (t) => [
  index("idx_voice_mandates_school_goal").on(t.schoolId, t.goal),
  // One mandate per (user, school, goal).
  unique("uq_voice_mandates_user_school_goal").on(t.userId, t.schoolId, t.goal),
]);

// The signal log (spec §4): ONE assembled communication fired at/above the
// threshold. School responses are recorded here and surfaced to ALL members.
export const collectiveSignalsTable = pgTable("collective_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
  firedById: uuid("fired_by_id").references(() => usersTable.id),
  // Topics carried — G1/G2 only (spec §1.1 scope lock). Stored as a JSON array.
  topics: jsonb("topics").notNull().default(["G1", "G2"]),
  memberCountAtFire: integer("member_count_at_fire").notNull(),
  // The recorded school response (operator/exec-recorded; surfaced to all members).
  schoolResponseStatus: varchar("school_response_status", { length: 20 }), // pending | responded | none
  schoolResponseText: text("school_response_text"),
  schoolRespondedAt: timestamp("school_responded_at", { withTimezone: true }),
}, (t) => [
  index("idx_collective_signals_voice").on(t.voiceId),
]);

export type CoalitionPathway = typeof coalitionPathwayTable.$inferSelect;
export type VoiceMandate = typeof voiceMandatesTable.$inferSelect;
export type CollectiveSignal = typeof collectiveSignalsTable.$inferSelect;
```

(`jsonb` is NOT yet imported in `voice.ts` — add it to the `drizzle-orm/pg-core` import alongside `boolean`: final import line is `import { pgTable, uuid, varchar, text, timestamp, index, unique, boolean, jsonb, integer } from "drizzle-orm/pg-core";`.)

- [ ] **Step 4: Verify the barrel exports**

`lib/db/src/schema/index.ts` already has `export * from "./voice"` (line 18), so the three new tables + types are re-exported automatically. Confirm `lib/db/src/index.ts` re-exports the schema barrel (it does via `export * from "./schema"`). No edit needed — verify only:

```bash
cd ~/dev/safe-skoolz && grep -n 'from "./schema"' lib/db/src/index.ts
```

- [ ] **Step 5: Apply the schema (local; recorded for prod in Task 9)**

`push-force` is interactive — prefer the additive SQL. From the repo root:

```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" <<'SQL'
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS signal_threshold integer NOT NULL DEFAULT 10;
ALTER TABLE voice_members
  ADD COLUMN IF NOT EXISTS was_pta_member boolean;
ALTER TABLE voice_supporters
  ADD COLUMN IF NOT EXISTS was_pta_member boolean;
CREATE TABLE IF NOT EXISTS coalition_pathway (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id uuid NOT NULL UNIQUE REFERENCES voice_groups(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  stage varchar(24) NOT NULL DEFAULT 'your_voice',
  incumbent_pta_size integer,
  incumbent_confirmed_by_school_at timestamptz,
  signal_fired_at timestamptz,
  pta_motion_outcome varchar(16),
  pta_motion_recorded_at timestamptz,
  pta_motion_recorded_by uuid REFERENCES users(id),
  school_recognised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coalition_pathway_school ON coalition_pathway(school_id);
CREATE TABLE IF NOT EXISTS voice_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  goal varchar(2) NOT NULL,
  authorised_at timestamptz NOT NULL DEFAULT now(),
  confirmation_event text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_mandates_user_school_goal ON voice_mandates(user_id, school_id, goal);
CREATE INDEX IF NOT EXISTS idx_voice_mandates_school_goal ON voice_mandates(school_id, goal);
CREATE TABLE IF NOT EXISTS collective_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id uuid NOT NULL REFERENCES voice_groups(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  fired_at timestamptz NOT NULL DEFAULT now(),
  fired_by_id uuid REFERENCES users(id),
  topics jsonb NOT NULL DEFAULT '["G1","G2"]'::jsonb,
  member_count_at_fire integer NOT NULL,
  school_response_status varchar(20),
  school_response_text text,
  school_responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_collective_signals_voice ON collective_signals(voice_id);
SQL
```

- [ ] **Step 6: Verify**

```bash
psql "$DATABASE_URL" -c "\d schools" | grep signal_threshold
psql "$DATABASE_URL" -c "\d voice_members" | grep was_pta_member
psql "$DATABASE_URL" -c "\d voice_supporters" | grep was_pta_member
psql "$DATABASE_URL" -c "\d coalition_pathway" | grep -E "stage|incumbent_pta_size|school_recognised_at"
psql "$DATABASE_URL" -c "\d voice_mandates" | grep goal
psql "$DATABASE_URL" -c "\d collective_signals" | grep member_count_at_fire
```
Expected: every grep returns its column.

- [ ] **Step 7: Commit**

```bash
git add lib/db/src/schema/voice.ts lib/db/src/schema/schools.ts
git commit -m "feat(db): Ch2 pathway schema — signal_threshold, was_pta_member, coalition_pathway, voice_mandates, collective_signals

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `lib/pathway.ts` — pure stage / threshold / legitimacy / terminal helpers (TDD)

**Files:**
- Create: `artifacts/api-server/src/lib/pathway.ts`
- Test: `artifacts/api-server/src/__tests__/pathway-lib.test.ts`

These are **pure functions** (no DB) so the computations are unit-testable in isolation and reused by every endpoint. The endpoints supply the counts; the lib decides stage/threshold/legitimacy.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/pathway-lib.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { effectiveStage, thresholdMet, legitimacyMetric, isPathwayComplete } from "../lib/pathway";

describe("thresholdMet", () => {
  it("is false below the threshold and true at/above", () => {
    expect(thresholdMet(9, 10)).toBe(false);
    expect(thresholdMet(10, 10)).toBe(true);
    expect(thresholdMet(11, 10)).toBe(true);
  });
});

describe("legitimacyMetric", () => {
  it("nonVoicePta = max(0, declared - ptaMembersInVoice); met when backers > nonVoicePta", () => {
    // declared 30, 8 of our backers were PTA members -> nonVoice 22; 25 backers > 22 => met
    const m = legitimacyMetric({ backerCount: 25, declaredIncumbent: 30, ptaMembersInVoice: 8 });
    expect(m.nonVoicePta).toBe(22);
    expect(m.met).toBe(true);
  });
  it("clamps nonVoicePta at 0 and is not-met when backers <= nonVoicePta", () => {
    const m = legitimacyMetric({ backerCount: 5, declaredIncumbent: 3, ptaMembersInVoice: 10 });
    expect(m.nonVoicePta).toBe(0); // 3 - 10 clamped
    expect(m.met).toBe(true); // 5 > 0
    const m2 = legitimacyMetric({ backerCount: 10, declaredIncumbent: 30, ptaMembersInVoice: 0 });
    expect(m2.nonVoicePta).toBe(30);
    expect(m2.met).toBe(false);
  });
  it("is null/unknown when no incumbent is declared", () => {
    const m = legitimacyMetric({ backerCount: 25, declaredIncumbent: null, ptaMembersInVoice: 8 });
    expect(m.met).toBeNull();
    expect(m.nonVoicePta).toBeNull();
  });
});

describe("effectiveStage", () => {
  const base = { recordedStage: "your_voice" as const, backerCount: 1, signalThreshold: 10, signalFiredAt: null as Date | null, ptaMotionOutcome: null as string | null, schoolRecognisedAt: null as Date | null, voiceStatus: "advocating" };
  it("your_voice with a single backer", () => {
    expect(effectiveStage(base)).toBe("your_voice");
  });
  it("shared_voice once more than one backs but below threshold", () => {
    expect(effectiveStage({ ...base, backerCount: 3 })).toBe("shared_voice");
  });
  it("collective_signal once the threshold is met (before firing)", () => {
    expect(effectiveStage({ ...base, backerCount: 10 })).toBe("collective_signal");
  });
  it("pta_motion once the signal has fired", () => {
    expect(effectiveStage({ ...base, backerCount: 12, signalFiredAt: new Date() })).toBe("pta_motion");
  });
  it("school_recognition once the motion is declined", () => {
    expect(effectiveStage({ ...base, backerCount: 12, signalFiredAt: new Date(), ptaMotionOutcome: "vad_declined" })).toBe("school_recognition");
  });
  it("never regresses below the recorded stage", () => {
    // recorded school_recognition but only 1 backer now -> stays school_recognition
    expect(effectiveStage({ ...base, recordedStage: "school_recognition" })).toBe("school_recognition");
  });
});

describe("isPathwayComplete", () => {
  it("true on vad_adopted", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: "vad_adopted", schoolRecognisedAt: null, voiceStatus: "advocating" })).toBe(true);
  });
  it("true when the VOICE has converged (status converted)", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: null, schoolRecognisedAt: null, voiceStatus: "converted" })).toBe(true);
  });
  it("true when the school has recognised", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: null, schoolRecognisedAt: new Date(), voiceStatus: "advocating" })).toBe(true);
  });
  it("false otherwise (incl. vad_declined)", () => {
    expect(isPathwayComplete({ ptaMotionOutcome: "vad_declined", schoolRecognisedAt: null, voiceStatus: "advocating" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/pathway-lib.test.ts
```
Expected: FAIL — module `../lib/pathway` does not exist.

- [ ] **Step 3: Implement the lib**

Create `artifacts/api-server/src/lib/pathway.ts`:

```ts
// Chapter 2 (spec §2/§4/§5): pure helpers for the legitimacy pathway. NO DB —
// callers supply the counts; this module decides the effective stage, whether
// the absolute signal threshold is met, the relative legitimacy metric, and the
// terminal gate Chapter 3 (elections) reads. Tracker-only: these never act.
import { PATHWAY_STAGES, type PathwayStage } from "@workspace/db";

const STAGE_ORDER: Record<PathwayStage, number> = {
  your_voice: 0, shared_voice: 1, collective_signal: 2, pta_motion: 3, school_recognition: 4,
};

/** Absolute gate (spec §4): the coalition can fire the signal at/above threshold. */
export function thresholdMet(backerCount: number, signalThreshold: number): boolean {
  return backerCount >= signalThreshold;
}

/**
 * Relative legitimacy measure (spec §4). nonVoicePta = max(0, declared −
 * ptaMembersInVoice); met when VOICE backers > nonVoicePta. Returns null fields
 * when no incumbent is declared (display "unknown", not "met/unmet"). This does
 * NOT gate the signal — the absolute threshold does; this strengthens the case.
 */
export function legitimacyMetric(input: {
  backerCount: number;
  declaredIncumbent: number | null;
  ptaMembersInVoice: number;
}): { nonVoicePta: number | null; met: boolean | null; backerCount: number; declaredIncumbent: number | null; ptaMembersInVoice: number } {
  const { backerCount, declaredIncumbent, ptaMembersInVoice } = input;
  if (declaredIncumbent == null) {
    return { nonVoicePta: null, met: null, backerCount, declaredIncumbent: null, ptaMembersInVoice };
  }
  const nonVoicePta = Math.max(0, declaredIncumbent - ptaMembersInVoice);
  return { nonVoicePta, met: backerCount > nonVoicePta, backerCount, declaredIncumbent, ptaMembersInVoice };
}

/**
 * The effective stage (spec §2) — computed from data, never below the highest
 * recorded stage. Progression:
 *   your_voice → shared_voice (>1 backer) → collective_signal (threshold met)
 *   → pta_motion (signal fired) → school_recognition (motion declined).
 * Terminal outcomes (vad_adopted / converged / school_recognised) are surfaced
 * separately via isPathwayComplete; the stage itself caps at school_recognition.
 */
export function effectiveStage(input: {
  recordedStage: PathwayStage;
  backerCount: number;
  signalThreshold: number;
  signalFiredAt: Date | null;
  ptaMotionOutcome: string | null;
  schoolRecognisedAt: Date | null;
  voiceStatus: string;
}): PathwayStage {
  let computed: PathwayStage = "your_voice";
  if (input.backerCount > 1) computed = "shared_voice";
  if (thresholdMet(input.backerCount, input.signalThreshold)) computed = "collective_signal";
  if (input.signalFiredAt != null) computed = "pta_motion";
  if (input.ptaMotionOutcome === "vad_declined") computed = "school_recognition";
  if (input.schoolRecognisedAt != null) computed = "school_recognition";
  // Never regress below the highest recorded stage.
  return STAGE_ORDER[computed] >= STAGE_ORDER[input.recordedStage] ? computed : input.recordedStage;
}

/**
 * Terminal gate (spec §2/§4b): the pathway is COMPLETE when the PTA adopted VAD
 * (vad_adopted) or the VOICE has converged (status converted) OR the school
 * formally recognised the coalition. Chapter 3 (elections) reads this. A
 * declined motion is NOT terminal (Stage 5 proceeds).
 */
export function isPathwayComplete(input: {
  ptaMotionOutcome: string | null;
  schoolRecognisedAt: Date | null;
  voiceStatus: string;
}): boolean {
  return (
    input.ptaMotionOutcome === "vad_adopted" ||
    input.voiceStatus === "converted" ||
    input.schoolRecognisedAt != null
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/pathway-lib.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pathway.ts src/__tests__/pathway-lib.test.ts
git commit -m "feat(api): pathway lib — effectiveStage, thresholdMet, legitimacyMetric, isPathwayComplete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Provision the pathway at create + mandates at join (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/schools.ts` (in `POST /api/schools`)
- Modify: `artifacts/api-server/src/routes/auth.ts` (in the founder/voice-backing block)
- Test: `artifacts/api-server/src/__tests__/pathway-provision.test.ts`

**Where the pathway row is created (decision):** at `POST /api/schools`, in the same transaction as the founder-less advocating VOICE. It keys off `voiceId`/`schoolId` and needs no user, so this is the founder-less-model-consistent place (Ch1 already provisions there). The intake survey, by contrast, needs a `created_by` user and is provisioned at founder-signup in `auth.ts` — the pathway has no such dependency, so it does NOT move to signup.

**Where mandates are written (decision):** at `/auth/signup`, inside the existing advocating-VOICE backing block (where Ch1 promotes the first backer to founder + provisions the intake). Every joining member (founder or member) gets both G1 and G2 mandate rows. `wasPtaMember` (from the signup body) is written onto the `voice_members` backing row (the account-bearing backing); public supporters set it via the existing `/voice/:id/support` flow in a later pass — out of scope for Ch2's join flow, but the column exists (Task 1) so the metric query is uniform.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/pathway-provision.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM voice_mandates WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM collective_signals WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM coalition_pathway WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id IN (SELECT id FROM voice_groups WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM diagnostic_surveys WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM users WHERE school_id IN (SELECT id FROM schools WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const createSchool = (body: unknown) =>
  fetch(`${baseUrl}/api/schools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const signup = (body: unknown) =>
  fetch(`${baseUrl}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("pathway provisioning at POST /api/schools", () => {
  it("creates a your_voice coalition_pathway row for the new VOICE, signal_threshold defaulting to 10", async () => {
    const r = await createSchool({ name: `PathSchool ${TAG}`, slug: `path-${TAG}` });
    expect(r.status).toBe(201);
    const { voice, school } = await r.json();
    const cp = await pool.query(`SELECT * FROM coalition_pathway WHERE voice_id=$1`, [voice.id]);
    expect(cp.rows).toHaveLength(1);
    expect(cp.rows[0].stage).toBe("your_voice");
    const sch = await pool.query(`SELECT signal_threshold FROM schools WHERE slug=$1`, [school.slug]);
    expect(sch.rows[0].signal_threshold).toBe(10);
  });
});

describe("mandates + was_pta_member at /auth/signup", () => {
  it("writes G1 and G2 mandate rows for the joining member and records was_pta_member on the backing", async () => {
    await createSchool({ name: `MandateSchool ${TAG}`, slug: `mandate-${TAG}` });
    const su = await signup({ email: `parent-${TAG}@t.example`, password: "password123", name: "P One", schoolSlug: `mandate-${TAG}`, wasPtaMember: true });
    expect(su.status).toBe(201);
    const { user } = await su.json();

    const mandates = await pool.query(`SELECT goal FROM voice_mandates WHERE user_id=$1 ORDER BY goal`, [user.id]);
    expect(mandates.rows.map((r: any) => r.goal)).toEqual(["G1", "G2"]);

    const vm = await pool.query(`SELECT was_pta_member FROM voice_members WHERE user_id=$1`, [user.id]);
    expect(vm.rows[0].was_pta_member).toBe(true);
  });

  it("defaults was_pta_member to false when not declared, and is idempotent on re-signup attempt", async () => {
    await createSchool({ name: `Mandate2 ${TAG}`, slug: `mandate2-${TAG}` });
    const su = await signup({ email: `parent2-${TAG}@t.example`, password: "password123", name: "P Two", schoolSlug: `mandate2-${TAG}` });
    expect(su.status).toBe(201);
    const { user } = await su.json();
    const vm = await pool.query(`SELECT was_pta_member FROM voice_members WHERE user_id=$1`, [user.id]);
    expect(vm.rows[0].was_pta_member).toBe(false);
    // Same email again -> 409 (no duplicate mandates).
    const dup = await signup({ email: `parent2-${TAG}@t.example`, password: "password123", schoolSlug: `mandate2-${TAG}` });
    expect(dup.status).toBe(409);
    const m = await pool.query(`SELECT count(*)::int AS n FROM voice_mandates WHERE user_id=$1`, [user.id]);
    expect(m.rows[0].n).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/pathway-provision.test.ts
```
Expected: FAIL — no `coalition_pathway` row after create; no mandates / `was_pta_member` null after signup.

- [ ] **Step 3: Provision the pathway in `POST /api/schools`**

In `artifacts/api-server/src/routes/schools.ts`, add `coalitionPathwayTable` to the `@workspace/db` import (line 4):

```ts
import { db, schoolsTable, voiceGroupsTable, usersTable, coalitionPathwayTable } from "@workspace/db";
```

Then inside the `db.transaction` (after the VOICE insert, before `return { school, voice }`, around line 98), add the pathway row:

```ts
      // Chapter 2 (spec §5): the coalition_pathway is created WITH the VOICE
      // (keys off voiceId/schoolId, no user needed). Starts at your_voice.
      await tx.insert(coalitionPathwayTable).values({
        voiceId: voice.id,
        schoolId: school.id,
        stage: "your_voice",
      });
```

- [ ] **Step 4: Write the mandates + was_pta_member in `/auth/signup`**

In `artifacts/api-server/src/routes/auth.ts`:

Add `voiceMandatesTable` to the `@workspace/db` import (line 6):

```ts
import { db, usersTable, schoolLoginCodesTable, pupilLoginSessionsTable, userMfaSecretsTable, schoolsTable, voiceGroupsTable, voiceMembersTable, voiceMandatesTable, diagnosticSurveysTable } from "@workspace/db";
```

Pull `wasPtaMember` from the body — change the destructure on line 448:

```ts
  const { email, password, name, schoolSlug, wasPtaMember } = req.body ?? {};
```

Normalise it once, before the backing block (e.g. just after `passwordHash` is computed, ~line 478):

```ts
  // Chapter 2 (spec §4): self-declared current-PTA-membership, captured at join
  // for the legitimacy metric. Defaults to false when not declared.
  const declaredPtaMember = wasPtaMember === true;
```

In the backing block, set `wasPtaMember` on the `voice_members` insert (line 547) and write the two mandate rows. Replace the existing member insert line:

```ts
      await db.insert(voiceMembersTable).values({ voiceId: voice.id, userId: newUser.id, role }).onConflictDoNothing();
```

with:

```ts
      await db.insert(voiceMembersTable)
        .values({ voiceId: voice.id, userId: newUser.id, role, wasPtaMember: declaredPtaMember })
        .onConflictDoNothing();

      // Chapter 2 (spec §3): joining IS the Delegated Voice authorisation. Write
      // one mandate row per goal (G1+G2). confirmationEvent records the consent
      // act (doubles as the GDPR consent step, spec §3/§7.1). Idempotent per
      // (user, school, goal) via the unique index.
      const confirmationEvent = `join:${new Date().toISOString()} — accepted G1/G2 delegated-voice mandate`;
      await db.insert(voiceMandatesTable).values([
        { userId: newUser.id, schoolId: school.id, goal: "G1", confirmationEvent },
        { userId: newUser.id, schoolId: school.id, goal: "G2", confirmationEvent },
      ]).onConflictDoNothing();
```

(Note: this lives inside the `if (voice) { … }` branch, so mandates are only written when the school has an advocating VOICE — which every Ch1/Ch2-created school does. `voiceMandatesTable` is now imported.)

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/pathway-provision.test.ts
```
Expected: PASS. Re-run the Ch1 signup/founder coverage to confirm no regression:

```bash
pnpm exec vitest run src/__tests__/membership-flag.test.ts src/__tests__/schools-create.test.ts
```
Expected: PASS (unchanged counts).

- [ ] **Step 6: Commit**

```bash
git add src/routes/schools.ts src/routes/auth.ts src/__tests__/pathway-provision.test.ts
git commit -m "feat(api): provision coalition_pathway at create + write G1/G2 mandates + was_pta_member at signup

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Pathway status endpoint `GET /api/voice/:id/pathway` (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts`
- Test: `artifacts/api-server/src/__tests__/pathway-status.test.ts`

Returns the full pathway view for any school member who can VIEW the VOICE (reuse the existing `VIEW = requireRole("parent","pta","coordinator","head_teacher")`): effective stage, backer count, signal threshold + threshold-met, the legitimacy metric, the signal log (with recorded school responses), and whether the pathway is complete. School-scoped (the VOICE must belong to the caller's school).

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/pathway-status.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, memberTok: string, otherSchoolTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Stat ${TAG}','stat-${TAG}',3) RETURNING id`);
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','S','M',$2,'approved') RETURNING id`, [schoolId, `sm-${TAG}@t.example`]);
  memberTok = mint(u.rows[0].id, schoolId, "parent", `sm-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, u.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage, incumbent_pta_size) VALUES ($1,$2,'your_voice',20)`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, u.rows[0].id]);

  const s2 = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Other ${TAG}','other-${TAG}') RETURNING id`);
  const u2 = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','O','M',$2) RETURNING id`, [s2.rows[0].id, `om-${TAG}@t.example`]);
  otherSchoolTok = mint(u2.rows[0].id, s2.rows[0].id, "parent", `om-${TAG}@t.example`);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM collective_signals WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const get = (tok: string) => fetch(`${baseUrl}/api/voice/${voiceId}/pathway`, { headers: { Authorization: `Bearer ${tok}` } });

describe("GET /api/voice/:id/pathway", () => {
  it("returns stage, counts, threshold, legitimacy, signal log, complete flag", async () => {
    const r = await get(memberTok);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.stage).toBe("your_voice"); // 1 backer
    expect(b.backerCount).toBe(1);
    expect(b.signalThreshold).toBe(3);
    expect(b.thresholdMet).toBe(false);
    expect(b.legitimacy.declaredIncumbent).toBe(20);
    expect(b.legitimacy.met).toBe(false); // 1 backer not > 20
    expect(Array.isArray(b.signals)).toBe(true);
    expect(b.signals).toHaveLength(0);
    expect(b.complete).toBe(false);
  });

  it("404s a VOICE from another school (school-scoped)", async () => {
    const r = await get(otherSchoolTok);
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/pathway-status.test.ts
```
Expected: FAIL — `/pathway` is 404.

- [ ] **Step 3: Implement the endpoint**

In `artifacts/api-server/src/routes/voiceGroups.ts`, extend the `@workspace/db` import (lines 3–12) and the drizzle-orm import (line 2), and add the pathway imports:

```ts
// line 2 — add isNull, gte (already has eq, and, desc, inArray, sql):
import { eq, and, desc, inArray, sql } from "drizzle-orm";
// extend the @workspace/db import block with the Ch2 tables:
import {
  db,
  voiceGroupsTable,
  voiceMembersTable,
  voiceSupportersTable,
  ptaMembersTable,
  ptaInitiativesTable,
  schoolsTable,
  usersTable,
  coalitionPathwayTable,
  collectiveSignalsTable,
} from "@workspace/db";
// add the pathway lib + the operator/exec guard:
import { effectiveStage, thresholdMet, legitimacyMetric, isPathwayComplete } from "../lib/pathway";
import { isExecOrOperator } from "../lib/auth";
```

Add a shared loader + the metric query helper after `memberCounts` (~line 60). Backer count = `voice_members` + `voice_supporters` (mirrors the public `/v/:id` `backerCount`); PTA-members-in-VOICE counts `was_pta_member = true` across both backing tables:

```ts
// Chapter 2: load the pathway row for a VOICE scoped to the caller's school.
async function loadPathway(voiceId: string, schoolId: string) {
  const [row] = await db.select().from(coalitionPathwayTable)
    .where(and(eq(coalitionPathwayTable.voiceId, voiceId), eq(coalitionPathwayTable.schoolId, schoolId)));
  return row ?? null;
}

// Backer count + PTA-members-in-VOICE across BOTH backing tables (members +
// public supporters) — the legitimacy metric needs the full self-declared count.
async function backingStats(voiceId: string): Promise<{ backerCount: number; ptaMembersInVoice: number }> {
  const [m] = await db.select({
    n: sql<number>`count(*)::int`,
    pta: sql<number>`count(*) filter (where ${voiceMembersTable.wasPtaMember} = true)::int`,
  }).from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, voiceId));
  const [s] = await db.select({
    n: sql<number>`count(*)::int`,
    pta: sql<number>`count(*) filter (where ${voiceSupportersTable.wasPtaMember} = true)::int`,
  }).from(voiceSupportersTable).where(eq(voiceSupportersTable.voiceId, voiceId));
  return {
    backerCount: (m?.n ?? 0) + (s?.n ?? 0),
    ptaMembersInVoice: (m?.pta ?? 0) + (s?.pta ?? 0),
  };
}

// Assemble the full pathway view (shared by GET pathway + the action endpoints'
// responses). Computes the effective stage, threshold, legitimacy, signal log.
async function pathwayView(voiceRow: { id: string; status: string }, schoolId: string) {
  const [school] = await db.select({ signalThreshold: schoolsTable.signalThreshold }).from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  const pathway = await loadPathway(voiceRow.id, schoolId);
  if (!pathway) return null;
  const stats = await backingStats(voiceRow.id);
  const signalThreshold = school?.signalThreshold ?? 10;
  const signals = await db.select().from(collectiveSignalsTable)
    .where(eq(collectiveSignalsTable.voiceId, voiceRow.id)).orderBy(desc(collectiveSignalsTable.firedAt));

  const stage = effectiveStage({
    recordedStage: pathway.stage as any,
    backerCount: stats.backerCount,
    signalThreshold,
    signalFiredAt: pathway.signalFiredAt,
    ptaMotionOutcome: pathway.ptaMotionOutcome,
    schoolRecognisedAt: pathway.schoolRecognisedAt,
    voiceStatus: voiceRow.status,
  });
  const legitimacy = legitimacyMetric({
    backerCount: stats.backerCount,
    declaredIncumbent: pathway.incumbentPtaSize,
    ptaMembersInVoice: stats.ptaMembersInVoice,
  });
  return {
    voiceId: voiceRow.id,
    stage,
    backerCount: stats.backerCount,
    signalThreshold,
    thresholdMet: thresholdMet(stats.backerCount, signalThreshold),
    legitimacy: { ...legitimacy, incumbentConfirmedBySchoolAt: pathway.incumbentConfirmedBySchoolAt },
    signalFiredAt: pathway.signalFiredAt,
    ptaMotionOutcome: pathway.ptaMotionOutcome,
    schoolRecognisedAt: pathway.schoolRecognisedAt,
    complete: isPathwayComplete({ ptaMotionOutcome: pathway.ptaMotionOutcome, schoolRecognisedAt: pathway.schoolRecognisedAt, voiceStatus: voiceRow.status }),
    signals: signals.map((sg) => ({
      id: sg.id, firedAt: sg.firedAt, topics: sg.topics, memberCountAtFire: sg.memberCountAtFire,
      schoolResponseStatus: sg.schoolResponseStatus, schoolResponseText: sg.schoolResponseText, schoolRespondedAt: sg.schoolRespondedAt,
    })),
  };
}
```

Add the `GET` handler after the existing `GET /voice/:id` handler (~line 199):

```ts
// GET /voice/:id/pathway (spec §7) — the journey state for any VOICE member.
// Stage, counts, threshold-met, legitimacy metric, signal log + school
// responses, terminal flag. School-scoped. Non-adversarial — facts only.
router.get("/voice/:id/pathway", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const [voiceRow] = await db.select({ id: voiceGroupsTable.id, status: voiceGroupsTable.status })
    .from(voiceGroupsTable).where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId)));
  if (!voiceRow) { res.status(404).json({ error: "VOICE not found" }); return; }
  const view = await pathwayView(voiceRow, u.schoolId);
  if (!view) { res.status(404).json({ error: "Pathway not found" }); return; }
  res.json(view);
});
```

- [ ] **Step 4: Add `isExecOrOperator` to `lib/auth.ts`**

The motion/recognition/incumbent writes are "platform-operator / exec" (spec §6). Add a helper after `requirePlatformOperator` in `artifacts/api-server/src/lib/auth.ts`:

```ts
/**
 * Chapter 2 (spec §6): pathway outcome writes (motion / recognition / incumbent)
 * are recorded by an EXEC (school leadership / PTA) OR a platform operator —
 * school-confirmable per the Ch1 trust model. Reuses the exec role set.
 */
const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);
export function isExecOrOperator(payload: JwtPayload): boolean {
  return isPlatformOperator(payload) || (!!payload.role && EXEC_ROLES.has(payload.role));
}
export function requireExecOrOperator(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as JwtPayload;
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  if (!isExecOrOperator(user)) { res.status(403).json({ error: "Only school leadership or a platform operator can record this." }); return; }
  next();
}
```

(Confirm `JwtPayload` has `role` — it does, per `signToken`. `Request`/`Response`/`NextFunction` are already imported in `auth.ts`.)

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/pathway-status.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/routes/voiceGroups.ts src/lib/auth.ts src/__tests__/pathway-status.test.ts
git commit -m "feat(api): GET /voice/:id/pathway status + isExecOrOperator guard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Collective signal `POST /api/voice/:id/signal` (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts`
- Test: `artifacts/api-server/src/__tests__/pathway-signal.test.ts`

Any VOICE member fires it (reuse `ADVOCATE = requireRole("parent","pta")`), gated on threshold-met. It assembles ONE `collective_signals` row (the authorising-parent list by name + the two topics + the member count at fire), stamps `signalFiredAt` on the pathway, advances the recorded stage to `collective_signal`, and — since prod has no Resend — returns the shareable artefact (recipients/topics/the assembled message) rather than emailing. Idempotent-ish: a second fire is allowed (the coalition may re-send) but the test asserts the first works and the threshold guard blocks below it.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/pathway-signal.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, memberTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

async function addBacker(i: number) {
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','B','${i}',$2,'approved') RETURNING id`, [schoolId, `b${i}-${TAG}@t.example`]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, u.rows[0].id]);
  return u.rows[0].id;
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Sig ${TAG}','sig-${TAG}',3) RETURNING id`);
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Found','Er',$2,'approved') RETURNING id`, [schoolId, `f-${TAG}@t.example`]);
  memberTok = mint(u.rows[0].id, schoolId, "parent", `f-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, u.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage) VALUES ($1,$2,'your_voice')`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, u.rows[0].id]);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM collective_signals WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const fire = () => fetch(`${baseUrl}/api/voice/${voiceId}/signal`, { method: "POST", headers: { Authorization: `Bearer ${memberTok}` } });

describe("POST /api/voice/:id/signal", () => {
  it("409s below the threshold", async () => {
    const r = await fire(); // 1 backer < 3
    expect(r.status).toBe(409);
  });

  it("fires at the threshold: records a signal, stamps the pathway, returns the shareable artefact", async () => {
    await addBacker(1); await addBacker(2); // now 3 backers
    const r = await fire();
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.signal.topics).toEqual(["G1", "G2"]);
    expect(b.signal.memberCountAtFire).toBe(3);
    expect(b.artefact.message).toBeTruthy(); // assembled shareable text
    expect(Array.isArray(b.artefact.authorisingParents)).toBe(true);
    expect(b.pathway.stage).toBe("collective_signal");

    const cs = await pool.query(`SELECT * FROM collective_signals WHERE voice_id=$1`, [voiceId]);
    expect(cs.rows).toHaveLength(1);
    expect(cs.rows[0].school_response_status).toBe("pending");
    const cp = await pool.query(`SELECT signal_fired_at, stage FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].signal_fired_at).not.toBeNull();
    expect(cp.rows[0].stage).toBe("collective_signal");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/pathway-signal.test.ts
```
Expected: FAIL — `/signal` is 404.

- [ ] **Step 3: Implement the endpoint**

In `voiceGroups.ts`, add after the `GET /voice/:id/pathway` handler. The authorising-parent list comes from `voice_mandates` joined to users (named, per spec §4 — these are adults who opted into a public ask, so names are visible, matching the file's PII stance):

```ts
// POST /voice/:id/signal (spec §4) — fire the collective signal. ANY VOICE
// member, gated on threshold-met. Assembles ONE communication: the authorising
// parents by name, the two topics (G1/G2), a request for a named school contact.
// No Resend yet -> records the signal + returns the shareable artefact (the Ch1
// channel pattern); auto-emails when Resend lands. Non-adversarial framing.
router.post("/voice/:id/signal", authMiddleware, ADVOCATE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const [voiceRow] = await db.select({ id: voiceGroupsTable.id, name: voiceGroupsTable.name, status: voiceGroupsTable.status })
    .from(voiceGroupsTable).where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId)));
  if (!voiceRow) { res.status(404).json({ error: "VOICE not found" }); return; }
  if (voiceRow.status !== "advocating") { res.status(409).json({ error: "This VOICE is no longer advocating" }); return; }

  const pathway = await loadPathway(id, u.schoolId);
  if (!pathway) { res.status(404).json({ error: "Pathway not found" }); return; }

  const [school] = await db.select({ signalThreshold: schoolsTable.signalThreshold, name: schoolsTable.name })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  const stats = await backingStats(id);
  const signalThreshold = school?.signalThreshold ?? 10;
  if (!thresholdMet(stats.backerCount, signalThreshold)) {
    res.status(409).json({ error: "The coalition hasn't reached the threshold to send a collective message yet.", backerCount: stats.backerCount, signalThreshold });
    return;
  }

  // Authorising parents by name (those who hold a mandate at this school).
  const authorising = await db.select({
    firstName: usersTable.firstName, lastName: usersTable.lastName, displayMode: usersTable.displayMode,
  }).from(voiceMandatesTable)
    .innerJoin(usersTable, eq(usersTable.id, voiceMandatesTable.userId))
    .where(and(eq(voiceMandatesTable.schoolId, u.schoolId), eq(voiceMandatesTable.goal, "G1")));
  const authorisingParents = authorising.map((a) => memberDisplayName({ firstName: a.firstName, lastName: a.lastName, displayMode: a.displayMode }, false));

  let signal: typeof collectiveSignalsTable.$inferSelect;
  await db.transaction(async (tx) => {
    const [s] = await tx.insert(collectiveSignalsTable).values({
      voiceId: id, schoolId: u.schoolId, firedById: u.userId,
      topics: ["G1", "G2"], memberCountAtFire: stats.backerCount, schoolResponseStatus: "pending",
    }).returning();
    signal = s;
    await tx.update(coalitionPathwayTable)
      .set({ signalFiredAt: sql`now()`, stage: "collective_signal" })
      .where(eq(coalitionPathwayTable.voiceId, id));
  });

  await writeAudit({ schoolId: u.schoolId, eventType: "collective_signal_fired", actor: u, targetType: "voice_group", targetId: id, details: { memberCountAtFire: stats.backerCount }, req }).catch(() => {});

  // The shareable artefact (placeholder copy — Tom-owned, non-adversarial). G1/G2
  // only; framed as solving the school's administrative problem (one channel).
  const message =
    `Parents of ${school?.name ?? "our school"} are asking to work with you on two things: ` +
    `(G1) embedding a values-based education framework, and (G2) giving the PTA a structure that represents every family. ` +
    `${authorisingParents.length} parents have authorised this message. We'd value a named point of contact to take these forward together.`;

  const view = await pathwayView({ id: voiceRow.id, status: voiceRow.status }, u.schoolId);
  res.status(201).json({
    signal: { id: signal!.id, topics: signal!.topics, memberCountAtFire: signal!.memberCountAtFire, firedAt: signal!.firedAt },
    artefact: { topics: ["G1", "G2"], authorisingParents, message },
    pathway: view,
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/pathway-signal.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/voiceGroups.ts src/__tests__/pathway-signal.test.ts
git commit -m "feat(api): POST /voice/:id/signal — threshold-gated collective signal + shareable artefact

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Outcome + incumbent endpoints + signal response (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts`
- Test: `artifacts/api-server/src/__tests__/pathway-outcomes.test.ts`

Four operator/exec-guarded writes (reuse `requireExecOrOperator` from Task 4), all school-scoped:
- `POST /voice/:id/pathway/motion` — body `{ outcome: "vad_adopted"|"vad_declined" }`. Records `ptaMotionOutcome` + `ptaMotionRecordedAt`/`By`, advances recorded stage to `pta_motion`. On `vad_adopted`, returns `{ convert: { eligible, voiceId } }` hinting the B2 `POST /voice/:id/convert` path (the actual merge stays the gated PTA action — not auto-fired, per the tracker-only constraint); on `vad_declined`, advances recorded stage to `school_recognition`.
- `POST /voice/:id/pathway/recognition` — stamps `schoolRecognisedAt` (terminal).
- `PATCH /voice/:id/pathway/incumbent` — body `{ incumbentPtaSize, confirm?: boolean }`. Sets the declared size; `confirm:true` stamps `incumbentConfirmedBySchoolAt`.
- `POST /voice/:id/signal/:signalId/response` — record the school's response on a fired signal (`{ status: "responded"|"none", text? }`), surfaced to all members via the pathway view.

**B2 convert trigger (decision):** on `vad_adopted`, the endpoint does NOT call convert directly — convert requires `ptaClaimedAt` (B1) and is the gated PTA/leadership action. It returns a `convert` hint so the UI can route an exec to the existing convert flow; `isPathwayComplete` already treats `vad_adopted` (and a subsequent `status='converted'`) as terminal.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/pathway-outcomes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const TAG = Date.now().toString(36);
let schoolId: string, voiceId: string, signalId: string, memberTok: string, execTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, signal_threshold) VALUES ('Out ${TAG}','out-${TAG}',1) RETURNING id`);
  schoolId = s.rows[0].id;
  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','M','One',$2,'approved') RETURNING id`, [schoolId, `m-${TAG}@t.example`]);
  memberTok = mint(m.rows[0].id, schoolId, "parent", `m-${TAG}@t.example`);
  const ex = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'head_teacher','Ex','Ec',$2) RETURNING id`, [schoolId, `ex-${TAG}@t.example`]);
  execTok = mint(ex.rows[0].id, schoolId, "head_teacher", `ex-${TAG}@t.example`);
  const v = await pool.query<{ id: string }>(`INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'V ${TAG}','m','advocating',$2) RETURNING id`, [schoolId, m.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO coalition_pathway (voice_id, school_id, stage, signal_fired_at) VALUES ($1,$2,'collective_signal', now())`, [voiceId, schoolId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, m.rows[0].id]);
  const cs = await pool.query<{ id: string }>(`INSERT INTO collective_signals (voice_id, school_id, member_count_at_fire, school_response_status) VALUES ($1,$2,1,'pending') RETURNING id`, [voiceId, schoolId]);
  signalId = cs.rows[0].id;
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM collective_signals WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voiceId]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const post = (path: string, tok: string, body?: unknown) =>
  fetch(`${baseUrl}/api/voice/${voiceId}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: body ? JSON.stringify(body) : undefined });
const patch = (path: string, tok: string, body: unknown) =>
  fetch(`${baseUrl}/api/voice/${voiceId}${path}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify(body) });

describe("incumbent PATCH", () => {
  it("a member cannot set the incumbent size (403)", async () => {
    expect((await patch("/pathway/incumbent", memberTok, { incumbentPtaSize: 30 })).status).toBe(403);
  });
  it("an exec sets + confirms the incumbent size", async () => {
    const r = await patch("/pathway/incumbent", execTok, { incumbentPtaSize: 30, confirm: true });
    expect(r.status).toBe(200);
    const cp = await pool.query(`SELECT incumbent_pta_size, incumbent_confirmed_by_school_at FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].incumbent_pta_size).toBe(30);
    expect(cp.rows[0].incumbent_confirmed_by_school_at).not.toBeNull();
  });
});

describe("signal response", () => {
  it("an exec records the school response, surfaced in the pathway view", async () => {
    const r = await post(`/signal/${signalId}/response`, execTok, { status: "responded", text: "We'll appoint a contact." });
    expect(r.status).toBe(200);
    const cs = await pool.query(`SELECT school_response_status, school_response_text FROM collective_signals WHERE id=$1`, [signalId]);
    expect(cs.rows[0].school_response_status).toBe("responded");
    expect(cs.rows[0].school_response_text).toBe("We'll appoint a contact.");
  });
});

describe("motion outcome", () => {
  it("rejects an unknown outcome (400)", async () => {
    expect((await post("/pathway/motion", execTok, { outcome: "nope" })).status).toBe(400);
  });
  it("records vad_declined and advances to school_recognition", async () => {
    const r = await post("/pathway/motion", execTok, { outcome: "vad_declined" });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.pathway.ptaMotionOutcome).toBe("vad_declined");
    expect(b.pathway.stage).toBe("school_recognition");
    expect(b.pathway.complete).toBe(false);
    expect(b.convert).toBeUndefined();
  });
  it("records vad_adopted, returns a convert hint, and is terminal", async () => {
    const r = await post("/pathway/motion", execTok, { outcome: "vad_adopted" });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.pathway.ptaMotionOutcome).toBe("vad_adopted");
    expect(b.pathway.complete).toBe(true);
    expect(b.convert.voiceId).toBe(voiceId);
  });
});

describe("recognition", () => {
  it("an exec records school recognition (terminal)", async () => {
    const r = await post("/pathway/recognition", execTok);
    expect(r.status).toBe(200);
    const cp = await pool.query(`SELECT school_recognised_at FROM coalition_pathway WHERE voice_id=$1`, [voiceId]);
    expect(cp.rows[0].school_recognised_at).not.toBeNull();
    const b = await r.json();
    expect(b.pathway.complete).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/pathway-outcomes.test.ts
```
Expected: FAIL — the four endpoints are 404 (except the guard 403s, which also fail since the routes don't exist).

- [ ] **Step 3: Implement the four endpoints**

In `voiceGroups.ts`, add `requireExecOrOperator` to the auth import (it's exported from `lib/auth` in Task 4):

```ts
import { authMiddleware, requireRole, requireExecOrOperator, type JwtPayload } from "../lib/auth";
import { PTA_MOTION_OUTCOMES } from "@workspace/db"; // add to the @workspace/db import block
```

Add after the `POST /voice/:id/signal` handler. A shared scoped-loader keeps each handler terse:

```ts
// Shared: load a VOICE + its pathway scoped to the caller's school, or null.
async function loadVoiceAndPathway(id: string, schoolId: string) {
  const [voiceRow] = await db.select({ id: voiceGroupsTable.id, status: voiceGroupsTable.status })
    .from(voiceGroupsTable).where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, schoolId)));
  if (!voiceRow) return null;
  const pathway = await loadPathway(id, schoolId);
  if (!pathway) return null;
  return { voiceRow, pathway };
}

// POST /voice/:id/pathway/motion (spec §2 Stage 4) — exec/operator records the
// PTA's vote. vad_adopted => terminal + a convert HINT (the B2 merge stays the
// gated PTA action, NOT auto-fired). vad_declined => advance to Stage 5.
router.post("/voice/:id/pathway/motion", authMiddleware, requireExecOrOperator, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const outcome = req.body?.outcome;
  if (!PTA_MOTION_OUTCOMES.includes(outcome)) {
    res.status(400).json({ error: "outcome must be vad_adopted or vad_declined." });
    return;
  }
  const loaded = await loadVoiceAndPathway(id, u.schoolId);
  if (!loaded) { res.status(404).json({ error: "Pathway not found" }); return; }

  const nextStage = outcome === "vad_declined" ? "school_recognition" : "pta_motion";
  await db.update(coalitionPathwayTable).set({
    ptaMotionOutcome: outcome, ptaMotionRecordedAt: sql`now()`, ptaMotionRecordedBy: u.userId, stage: nextStage,
  }).where(eq(coalitionPathwayTable.voiceId, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_motion_recorded", actor: u, targetType: "voice_group", targetId: id, details: { outcome }, req }).catch(() => {});

  const view = await pathwayView(loaded.voiceRow, u.schoolId);
  const body: any = { pathway: view };
  if (outcome === "vad_adopted") {
    // Hand to B2: the convert path (POST /voice/:id/convert) is the gated PTA
    // action. We surface eligibility, not an auto-merge.
    body.convert = { voiceId: id, eligible: true, hint: "Merge the VOICE into the PTA via the convert flow." };
  }
  res.json(body);
});

// POST /voice/:id/pathway/recognition (spec §2 Stage 5) — exec/operator records
// that the school formally recognised the coalition. Terminal.
router.post("/voice/:id/pathway/recognition", authMiddleware, requireExecOrOperator, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const loaded = await loadVoiceAndPathway(id, u.schoolId);
  if (!loaded) { res.status(404).json({ error: "Pathway not found" }); return; }
  await db.update(coalitionPathwayTable).set({ schoolRecognisedAt: sql`now()`, stage: "school_recognition" })
    .where(eq(coalitionPathwayTable.voiceId, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "school_recognised", actor: u, targetType: "voice_group", targetId: id, details: {}, req }).catch(() => {});
  res.json({ pathway: await pathwayView(loaded.voiceRow, u.schoolId) });
});

// PATCH /voice/:id/pathway/incumbent (spec §4) — exec/operator sets/confirms the
// declared incumbent PTA size. confirm:true stamps the school-confirmed time.
router.patch("/voice/:id/pathway/incumbent", authMiddleware, requireExecOrOperator, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const size = req.body?.incumbentPtaSize;
  if (!Number.isInteger(size) || size < 0) { res.status(400).json({ error: "incumbentPtaSize must be a non-negative integer." }); return; }
  const loaded = await loadVoiceAndPathway(id, u.schoolId);
  if (!loaded) { res.status(404).json({ error: "Pathway not found" }); return; }
  await db.update(coalitionPathwayTable).set({
    incumbentPtaSize: size,
    ...(req.body?.confirm === true ? { incumbentConfirmedBySchoolAt: sql`now()` } : {}),
  }).where(eq(coalitionPathwayTable.voiceId, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "incumbent_pta_size_set", actor: u, targetType: "voice_group", targetId: id, details: { size, confirmed: req.body?.confirm === true }, req }).catch(() => {});
  res.json({ pathway: await pathwayView(loaded.voiceRow, u.schoolId) });
});

// POST /voice/:id/signal/:signalId/response (spec §4) — exec/operator records the
// school's response on a fired signal. Surfaced to ALL members via the view.
router.post("/voice/:id/signal/:signalId/response", authMiddleware, requireExecOrOperator, async (req, res): Promise<void> => {
  const u = user(req);
  const { id, signalId } = req.params;
  const status = req.body?.status;
  if (status !== "responded" && status !== "none") { res.status(400).json({ error: "status must be responded or none." }); return; }
  const loaded = await loadVoiceAndPathway(id, u.schoolId);
  if (!loaded) { res.status(404).json({ error: "Pathway not found" }); return; }
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 4000) : null;
  const [updated] = await db.update(collectiveSignalsTable).set({
    schoolResponseStatus: status, schoolResponseText: text, schoolRespondedAt: sql`now()`,
  }).where(and(eq(collectiveSignalsTable.id, signalId), eq(collectiveSignalsTable.voiceId, id))).returning();
  if (!updated) { res.status(404).json({ error: "Signal not found" }); return; }
  await writeAudit({ schoolId: u.schoolId, eventType: "signal_response_recorded", actor: u, targetType: "voice_group", targetId: id, details: { signalId, status }, req }).catch(() => {});
  res.json({ pathway: await pathwayView(loaded.voiceRow, u.schoolId) });
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/pathway-outcomes.test.ts
```
Expected: PASS. Re-run the full Ch2 api suite + the touched Ch1 suites:

```bash
pnpm exec vitest run src/__tests__/pathway-lib.test.ts src/__tests__/pathway-provision.test.ts src/__tests__/pathway-status.test.ts src/__tests__/pathway-signal.test.ts src/__tests__/pathway-outcomes.test.ts
pnpm exec vitest run src/__tests__/membership-flag.test.ts src/__tests__/schools-create.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/voiceGroups.ts src/__tests__/pathway-outcomes.test.ts
git commit -m "feat(api): pathway motion/recognition/incumbent + signal response (exec/operator, school-scoped)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: OpenAPI additions + codegen

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add `wasPtaMember` to the `signup` body**

In `lib/api-spec/openapi.yaml`, in the `/auth/signup` request body `properties` (after `schoolSlug`, line 2192):

```yaml
                wasPtaMember: { type: boolean }
```

- [ ] **Step 2: Add the pathway paths** (place next to the existing `/voice/{id}` entries; inline schemas matching the repo convention)

```yaml
  /voice/{id}/pathway:
    get:
      operationId: getVoicePathway
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Pathway status
          content:
            application/json:
              schema:
                type: object
                required: [voiceId, stage, backerCount, signalThreshold, thresholdMet, legitimacy, complete, signals]
                properties:
                  voiceId: { type: string }
                  stage: { type: string }
                  backerCount: { type: integer }
                  signalThreshold: { type: integer }
                  thresholdMet: { type: boolean }
                  signalFiredAt: { type: string, nullable: true }
                  ptaMotionOutcome: { type: string, nullable: true }
                  schoolRecognisedAt: { type: string, nullable: true }
                  complete: { type: boolean }
                  legitimacy:
                    type: object
                    properties:
                      backerCount: { type: integer }
                      declaredIncumbent: { type: integer, nullable: true }
                      ptaMembersInVoice: { type: integer }
                      nonVoicePta: { type: integer, nullable: true }
                      met: { type: boolean, nullable: true }
                      incumbentConfirmedBySchoolAt: { type: string, nullable: true }
                  signals:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string }
                        firedAt: { type: string }
                        topics: { type: array, items: { type: string } }
                        memberCountAtFire: { type: integer }
                        schoolResponseStatus: { type: string, nullable: true }
                        schoolResponseText: { type: string, nullable: true }
                        schoolRespondedAt: { type: string, nullable: true }
        "404": { description: Not found }
  /voice/{id}/signal:
    post:
      operationId: fireCollectiveSignal
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "201":
          description: Signal fired
          content:
            application/json:
              schema:
                type: object
                required: [signal, artefact, pathway]
                properties:
                  signal: { type: object, additionalProperties: true }
                  artefact:
                    type: object
                    properties:
                      topics: { type: array, items: { type: string } }
                      authorisingParents: { type: array, items: { type: string } }
                      message: { type: string }
                  pathway: { type: object, additionalProperties: true }
        "404": { description: Not found }
        "409": { description: Below the signal threshold }
  /voice/{id}/pathway/motion:
    post:
      operationId: recordPtaMotion
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [outcome]
              properties:
                outcome: { type: string, enum: [vad_adopted, vad_declined] }
      responses:
        "200":
          description: Recorded
          content:
            application/json:
              schema:
                type: object
                required: [pathway]
                properties:
                  pathway: { type: object, additionalProperties: true }
                  convert: { type: object, additionalProperties: true }
        "400": { description: Invalid outcome }
        "403": { description: Exec or platform-operator only }
        "404": { description: Not found }
  /voice/{id}/pathway/recognition:
    post:
      operationId: recordSchoolRecognition
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Recorded
          content:
            application/json:
              schema:
                type: object
                required: [pathway]
                properties:
                  pathway: { type: object, additionalProperties: true }
        "403": { description: Exec or platform-operator only }
        "404": { description: Not found }
  /voice/{id}/pathway/incumbent:
    patch:
      operationId: setIncumbentPtaSize
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [incumbentPtaSize]
              properties:
                incumbentPtaSize: { type: integer }
                confirm: { type: boolean }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema:
                type: object
                required: [pathway]
                properties:
                  pathway: { type: object, additionalProperties: true }
        "400": { description: Invalid size }
        "403": { description: Exec or platform-operator only }
        "404": { description: Not found }
  /voice/{id}/signal/{signalId}/response:
    post:
      operationId: recordSignalResponse
      tags: [voice]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
        - { name: signalId, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [responded, none] }
                text: { type: string }
      responses:
        "200":
          description: Recorded
          content:
            application/json:
              schema:
                type: object
                required: [pathway]
                properties:
                  pathway: { type: object, additionalProperties: true }
        "400": { description: Invalid status }
        "403": { description: Exec or platform-operator only }
        "404": { description: Not found }
```

- [ ] **Step 3: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: no errors; generates `useGetVoicePathway`, `useFireCollectiveSignal`, `useRecordPtaMotion`, `useRecordSchoolRecognition`, `useSetIncumbentPtaSize`, `useRecordSignalResponse` into `lib/api-client-react/src/generated/` (exported via the barrel). The `signup` hook now accepts `wasPtaMember`.

- [ ] **Step 4: Commit**

```bash
git add lib/api-spec lib/api-client-react lib/api-zod
git commit -m "feat(api-spec): Ch2 pathway endpoints + wasPtaMember on signup + hooks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Frontend — mandate at join, journey section, operator controls, /journey route

**Files:**
- Modify: `artifacts/safeschool/src/pages/join.tsx`
- Create: `artifacts/safeschool/src/components/home/JourneySection.tsx`
- Create: `artifacts/safeschool/src/components/home/PathwayOperatorControls.tsx`
- Create: `artifacts/safeschool/src/pages/journey.tsx`
- Modify: `artifacts/safeschool/src/pages/community-home.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`

All copy is placeholder, Tom-owned (content audit), non-adversarial. AppShell-wrapped, SSR-safe, no framer enter-animations.

- [ ] **Step 1: Mandate-confirmation step at join (`join.tsx`)**

Add the G1/G2 + plain-language authorisation/consent block and the `was_pta_member` checkbox. The mandate is **default-on and a condition of joining** (spec §3) — so the existing two-bullet block (lines 48–51) becomes the explicit, confirmable mandate, and the submit is disabled until the mandate checkbox is ticked (it starts ticked). Pass `wasPtaMember` to `useSignup`.

Add state after line 17:

```tsx
  // Chapter 2 (spec §3): the Delegated Voice mandate. Joining IS the authorisation;
  // the checkbox is default-on and a condition of joining (cannot submit unticked).
  // Copy is placeholder — Tom-owned (content audit).
  const [mandateConfirmed, setMandateConfirmed] = useState(true);
  const [wasPtaMember, setWasPtaMember] = useState(false);
```

Pass it through in `onSubmit` (line 23):

```tsx
      const res = (await signup.mutateAsync({ data: { email: email.trim(), password, name: name.trim() || undefined, schoolSlug: slug, wasPtaMember } })) as any;
```

Replace the two-bullet block (lines 48–51) with the explicit mandate + the PTA-member declaration:

```tsx
        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">By joining, you authorise {data?.voiceName ?? "Vibes"} to contact your school about two things on your behalf:</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Ask the school to adopt VBE</strong> — embed a values-based education framework.</span></div>
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Ask the PTA to give every parent a voice</strong> — adopt a structure that represents every family.</span></div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={mandateConfirmed} onChange={(e) => setMandateConfirmed(e.target.checked)} aria-label="Confirm the mandate" />
            <span>I authorise this on these two topics only. (You can leave any time.)</span>
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={wasPtaMember} onChange={(e) => setWasPtaMember(e.target.checked)} aria-label="I am currently a PTA member" />
            <span>I'm currently a member of the school's PTA.</span>
          </label>
        </div>
```

Update the submit `disabled` (line 65) to also require the mandate:

```tsx
          disabled={!email.trim() || password.length < 8 || !mandateConfirmed || signup.isPending}
```

- [ ] **Step 2: `JourneySection.tsx`**

Create `artifacts/safeschool/src/components/home/JourneySection.tsx`. Reads the lead advocating VOICE id (same pattern as `ShareSchoolCard` via `useListVoice`), then `useGetVoicePathway`. Shows stage, mandate counter (backerCount), progress to threshold, the legitimacy line, recorded school responses, and the gated collective-signal action. Gates on `cap.voice`. Placeholder copy.

```tsx
import { useState } from "react";
import { useTenant } from "@/providers/tenant";
import { useListVoice, useGetVoicePathway, useFireCollectiveSignal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Flag } from "lucide-react";

// Chapter 2 (spec §7): the journey/pathway surface. Current stage, mandate
// counter, progress to the signal threshold, the legitimacy metric, recorded
// school responses, the gated collective-signal action, the next step — all
// non-adversarial. Copy is placeholder (Tom-owned, content audit).
const STAGE_LABELS: Record<string, string> = {
  your_voice: "Your voice",
  shared_voice: "A shared voice",
  collective_signal: "Ready to send a collective message",
  pta_motion: "Bringing it to the PTA",
  school_recognition: "Asking the school to recognise the coalition",
};

export function JourneySection() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const voices = useListVoice({ query: { enabled: !!cap.voice } as any });
  const list = (voices.data as any)?.voices ?? [];
  const lead = list.find((v: any) => v.status === "advocating") ?? list[0];
  const pathway = useGetVoicePathway(lead?.id ?? "", { query: { enabled: !!lead?.id } as any });
  const fire = useFireCollectiveSignal();
  const [artefact, setArtefact] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!cap.voice || !lead) return null;
  const p = pathway.data as any;
  if (!p) return null;

  const onFire = async () => {
    setErr(null);
    try {
      const res = (await fire.mutateAsync({ id: lead.id })) as any;
      setArtefact(res.artefact);
      pathway.refetch?.();
    } catch (e: any) {
      setErr(e?.data?.error ?? "Not ready to send yet.");
    }
  };

  const pct = Math.min(100, Math.round((p.backerCount / Math.max(1, p.signalThreshold)) * 100));

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Flag size={20} className="text-primary" aria-hidden /> The journey
      </h2>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">{STAGE_LABELS[p.stage] ?? p.stage}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.backerCount} {p.backerCount === 1 ? "parent has" : "parents have"} joined and authorised the two asks.
            </p>
          </div>

          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.thresholdMet
                ? "The coalition is ready to send one collective message to the school."
                : `${p.backerCount} of ${p.signalThreshold} families needed to send a collective message.`}
            </p>
          </div>

          {p.legitimacy?.met != null && (
            <p className="text-sm text-muted-foreground">
              {p.legitimacy.met
                ? "This coalition now represents more parents than the current PTA."
                : "As more families join, the coalition will represent more parents than the current PTA."}
            </p>
          )}

          {p.thresholdMet && !p.complete && (
            <div>
              <button
                type="button"
                onClick={onFire}
                disabled={fire.isPending}
                className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {fire.isPending ? "Preparing…" : "Send the collective message"}
              </button>
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            </div>
          )}

          {artefact && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">Ready to share with your school</p>
              <p className="mt-1 text-sm text-muted-foreground">{artefact.message}</p>
            </div>
          )}

          {Array.isArray(p.signals) && p.signals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">School responses</p>
              {p.signals.map((s: any) => (
                <div key={s.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {s.schoolResponseStatus === "responded"
                      ? (s.schoolResponseText || "The school responded.")
                      : s.schoolResponseStatus === "none"
                        ? "No response recorded yet."
                        : "Awaiting the school's response."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 3: `PathwayOperatorControls.tsx`**

Create `artifacts/safeschool/src/components/home/PathwayOperatorControls.tsx`. Exec/operator-only controls (gated on the user's role being an exec — `pta`/`coordinator`/`head_teacher`; the server enforces operator-too). Records motion outcome, recognition, incumbent size. Hidden otherwise.

```tsx
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListVoice, useRecordPtaMotion, useRecordSchoolRecognition, useSetIncumbentPtaSize } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

// Chapter 2 (spec §6): operator/exec controls to RECORD real-world outcomes.
// Hidden for plain members (the server also enforces exec/operator). Placeholder copy.
export function PathwayOperatorControls() {
  const { user } = useAuth();
  const voices = useListVoice();
  const list = (voices.data as any)?.voices ?? [];
  const lead = list.find((v: any) => v.status === "advocating") ?? list[0];
  const motion = useRecordPtaMotion();
  const recognition = useRecordSchoolRecognition();
  const incumbent = useSetIncumbentPtaSize();
  const [size, setSize] = useState("");

  if (!user || !EXEC_ROLES.has(user.role) || !lead) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Record an outcome</h2>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">For school leadership / the PTA to record what happened in the real world.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => motion.mutate({ id: lead.id, data: { outcome: "vad_adopted" } })} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">PTA adopted the structure</button>
            <button type="button" onClick={() => motion.mutate({ id: lead.id, data: { outcome: "vad_declined" } })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground">PTA declined</button>
            <button type="button" onClick={() => recognition.mutate({ id: lead.id })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground">School recognised the coalition</button>
          </div>
          <div className="flex items-center gap-2">
            <input className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm" type="number" min={0} placeholder="Current PTA size" aria-label="Current PTA size" value={size} onChange={(e) => setSize(e.target.value)} />
            <button type="button" disabled={!size} onClick={() => incumbent.mutate({ id: lead.id, data: { incumbentPtaSize: Number(size), confirm: true } })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60">Confirm size</button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 4: `/journey` page**

Create `artifacts/safeschool/src/pages/journey.tsx`:

```tsx
import { AppShell } from "@/components/layout/AppShell";
import { JourneySection } from "@/components/home/JourneySection";
import { PathwayOperatorControls } from "@/components/home/PathwayOperatorControls";

// Chapter 2 (spec §7): the dedicated journey view. AppShell-wrapped, SSR-safe,
// no framer enter-animations. Copy lives in the sections (placeholder, Tom-owned).
export default function JourneyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
        <JourneySection />
        <PathwayOperatorControls />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Wire `JourneySection` into community-home + add the `/journey` route**

In `artifacts/safeschool/src/pages/community-home.tsx`, add the import and render it after `<VoiceSection />`:

```tsx
import { JourneySection } from "@/components/home/JourneySection";
```

```tsx
      <VoiceSection />
      <JourneySection />
      <ShareSchoolCard />
```

In `artifacts/safeschool/src/App.tsx`, add the import next to the other page imports (~line 82):

```tsx
import JourneyPage from "@/pages/journey";
```

Add a protected route in the authed `Router()` switch (next to `/goals`, ~line 194):

```tsx
      <Route path="/journey">{() => <ProtectedRoute component={JourneyPage} allowedRoles={["parent", "pta", "coordinator", "head_teacher"]} />}</Route>
```

- [ ] **Step 6: Build the front-end (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
test -f dist/public/_worker.js && cp dist/public/_worker.js /tmp/_worker.js.bak || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build
test -f /tmp/_worker.js.bak && cp /tmp/_worker.js.bak dist/public/_worker.js || true
```
Expected: `✓ built`, prerender lines print, worker restored.

- [ ] **Step 7: Verify in the browser**

Start the server, then with the preview tooling:
- **Join flow:** `/join/:slug` shows the G1/G2 mandate block, default-on checkbox + the PTA-member checkbox; submit disabled if the mandate is unticked; signing up lands on `/` and the community home shows the **journey section** at stage `your_voice`/`shared_voice` with the mandate counter and threshold progress.
- **Threshold:** add backers (or seed) past the signal threshold → the "Send the collective message" button appears → firing shows the shareable artefact + advances the stage.
- **Operator controls:** as an exec role (`/journey`), the record-outcome controls appear; as a plain parent they do not. No console errors (`preview_console_logs`).

- [ ] **Step 8: Commit**

```bash
git add artifacts/safeschool/src
git commit -m "feat(web): join mandate-confirmation + journey section + operator controls + /journey route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Prod rollout (gated on Tom)

**Files:** none (ops). Per Tom's rule, the deploy push is gated on Tom: apply the additive DDL via the Railway Data box **before** `git push` (Railway auto-deploys on push). All statements are additive (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`) — no drops, safe to run one at a time, idempotent on re-run.

- [ ] **Step 1 [TOM]: Apply the schema DDL via the Railway Data box (prod Morna DB)**

Open the Railway project → the Morna Postgres service → **Data** → SQL editor. Run, one statement at a time (verify success after each):

```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS signal_threshold integer NOT NULL DEFAULT 10;
ALTER TABLE voice_members ADD COLUMN IF NOT EXISTS was_pta_member boolean;
ALTER TABLE voice_supporters ADD COLUMN IF NOT EXISTS was_pta_member boolean;

CREATE TABLE IF NOT EXISTS coalition_pathway (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id uuid NOT NULL UNIQUE REFERENCES voice_groups(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  stage varchar(24) NOT NULL DEFAULT 'your_voice',
  incumbent_pta_size integer,
  incumbent_confirmed_by_school_at timestamptz,
  signal_fired_at timestamptz,
  pta_motion_outcome varchar(16),
  pta_motion_recorded_at timestamptz,
  pta_motion_recorded_by uuid REFERENCES users(id),
  school_recognised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coalition_pathway_school ON coalition_pathway(school_id);

CREATE TABLE IF NOT EXISTS voice_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  goal varchar(2) NOT NULL,
  authorised_at timestamptz NOT NULL DEFAULT now(),
  confirmation_event text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_mandates_user_school_goal ON voice_mandates(user_id, school_id, goal);
CREATE INDEX IF NOT EXISTS idx_voice_mandates_school_goal ON voice_mandates(school_id, goal);

CREATE TABLE IF NOT EXISTS collective_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id uuid NOT NULL REFERENCES voice_groups(id),
  school_id uuid NOT NULL REFERENCES schools(id),
  fired_at timestamptz NOT NULL DEFAULT now(),
  fired_by_id uuid REFERENCES users(id),
  topics jsonb NOT NULL DEFAULT '["G1","G2"]'::jsonb,
  member_count_at_fire integer NOT NULL,
  school_response_status varchar(20),
  school_response_text text,
  school_responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_collective_signals_voice ON collective_signals(voice_id);
```

- [ ] **Step 2 [TOM]: Backfill a pathway row for Morna's existing advocating VOICE (if one exists pre-Ch2)**

Ch2-created schools get a pathway at `POST /api/schools`, but Morna's VOICE predates Ch2. Create its `your_voice` pathway row so the journey surface renders:

```sql
INSERT INTO coalition_pathway (voice_id, school_id, stage)
SELECT vg.id, vg.school_id, 'your_voice'
FROM voice_groups vg
JOIN schools s ON s.id = vg.school_id
WHERE s.slug = 'morna' AND vg.status = 'advocating'
ON CONFLICT (voice_id) DO NOTHING;
```

- [ ] **Step 3 [TOM]: Set Morna's signal threshold (optional — defaults to 10)**

```sql
UPDATE schools SET signal_threshold = 10 WHERE slug = 'morna';
```

(`PLATFORM_OPERATOR_EMAILS` is already set from Chapter 1 — exec roles can record outcomes without it; no new env var is required for Ch2.)

- [ ] **Step 4 [TOM]: Push to deploy**

After the DDL is applied and verified:

```bash
git push
```
Railway auto-deploys `feat/unified-app`. Smoke-test (authenticated as a Morna member; substitute a real VOICE id):

```bash
curl -s https://<prod-url>/api/voice/<voiceId>/pathway -H "Authorization: Bearer <token>" | python3 -m json.tool
```
Expected: `{ "stage": "...", "backerCount": N, "signalThreshold": 10, "thresholdMet": ..., "legitimacy": {...}, "complete": false, "signals": [] }`.

---

## Self-review

**(a) Spec coverage — every spec section maps to a task:**
- §1.1 G1/G2 hard scope (data layer) → **Task 1** (`MANDATE_GOALS` 2-value, `voice_mandates.goal` varchar(2), `collective_signals.topics` default `["G1","G2"]`), **Task 3** (signup writes exactly G1+G2).
- §1.2 / §7 non-adversarial framing, placeholder Tom-owned copy → baked into the header constraints; **Task 5** artefact message + **Task 8** journey/join copy marked placeholder.
- §2 the 5-stage journey + terminal states → **Task 1** (`PATHWAY_STAGES` + outcome columns), **Task 2** (`effectiveStage`, never-regress), **Task 4b** (`isPathwayComplete`).
- §3 Delegated Voice mandate (join = authorisation = consent, scope lock) → **Task 1** (`voice_mandates`), **Task 3** (G1+G2 rows + `confirmationEvent` at signup), **Task 8** (mandate-confirmation step, default-on, condition of joining).
- §4 threshold + collective signal + legitimacy metric → **Task 1** (`signal_threshold`, `collective_signals`, `was_pta_member` on BOTH backing tables), **Task 2** (`thresholdMet`, `legitimacyMetric`), **Task 5** (`POST /signal` gated, shareable artefact, no email), **Task 6** (signal response surfaced to all), **Task 4** (metric in the status view).
- §5 data model → **Task 1** (all three tables + columns exactly as specced).
- §6 who does what (member fires/brings; operator/exec records) → **Task 5** (`ADVOCATE` member-fires), **Task 4/6** (`requireExecOrOperator` for motion/recognition/incumbent/response).
- §7 surfacing (journey section + `/journey`, no-confidence FAQ-only) → **Task 8** (`JourneySection` + `/journey` route; no no-confidence control built — it is FAQ copy only, not in scope as a build).
- §4b terminal gate Chapter 3 reads → **Task 2** (`isPathwayComplete`), surfaced as `complete` in **Task 4**'s view.
- §8–10 engagement layer → explicitly OUT (future chapter); not mapped, by spec.
- §10 prod rollout (additive DDL via Railway before push) → **Task 9**.

**(b) No placeholders:** every code step contains real, runnable code. The only intentional placeholders are the **journey/join/artefact copy** (spec §1.2/§7 mandate Tom-owned wording — clearly marked) and the **no-confidence FAQ copy** (spec §7 defers it; no control built). These are spec-mandated content gates, not implementation gaps.

**(c) Type/name consistency:** `PATHWAY_STAGES`/`PathwayStage` (Task 1) drive `effectiveStage` (Task 2), the `stage` column (Task 1), and `STAGE_LABELS` (Task 8). `PTA_MOTION_OUTCOMES` (Task 1) is the validation set in `recordPtaMotion` (Task 6) and the OpenAPI enum (Task 7). `MANDATE_GOALS` G1/G2 (Task 1) match the two mandate inserts (Task 3) and the topics default. `signalThreshold`/`signal_threshold` (Task 1) used in `thresholdMet`/`pathwayView` (Tasks 2/4), the signal gate (Task 5), and the prod DDL (Task 9). `was_pta_member`/`wasPtaMember` consistent across both backing tables (Task 1), the signup write (Task 3), `backingStats` (Task 4), the signup OpenAPI body + frontend join (Tasks 7/8). `isExecOrOperator`/`requireExecOrOperator` defined once in `lib/auth.ts` (Task 4) and used by all four operator endpoints (Tasks 4/6). Hook names `useGetVoicePathway`/`useFireCollectiveSignal`/`useRecordPtaMotion`/`useRecordSchoolRecognition`/`useSetIncumbentPtaSize`/`useRecordSignalResponse` (Task 7 operationIds) match the frontend imports (Task 8). `backerCount` = members + supporters everywhere (Task 4 `backingStats` mirrors the shipped public `/v/:id` count).

**Decisions made where the spec was ambiguous:**
1. **Pathway row creation site:** at `POST /api/schools`, in the VOICE transaction (keys off voiceId/schoolId, no user needed) — the founder-less-model-consistent place, per the prompt's guidance. The intake survey, which needs a `created_by` user, stays at founder-signup; the pathway has no such dependency.
2. **B2 convert trigger on `vad_adopted`:** the motion endpoint records the outcome + marks the pathway terminal and returns a `convert` HINT, but does NOT auto-fire `POST /voice/:id/convert` — convert requires `ptaClaimedAt` (B1) and is the gated PTA/leadership action, and the spec's tracker-only constraint forbids active mechanisms. The UI routes an exec to the existing convert flow.
3. **`was_pta_member` backing table:** added to BOTH `voice_members` and `voice_supporters` (a backer is either), so the legitimacy metric (`backingStats`) counts the full self-declared population uniformly. The Ch2 join flow writes it on `voice_members` only (supporters set it via the existing public `/support` flow, a later pass).
4. **Stage enum vs outcome fields:** the `stage` column holds the highest RECORDED stage and is varchar (matching the shipped `VOICE_STATUSES`/`VOICE_MEMBER_ROLES` const-tuple style, no new pg enum to migrate); the EFFECTIVE stage is computed in `lib/pathway.ts` and never regresses below the recorded one. Terminal outcomes live in dedicated columns + the VOICE's own `status='converted'`, not in the stage enum (so the enum stays the spec's 5 values).
5. **Operator gate = exec OR platform-operator:** spec §6 says "platform-operator / exec, school-confirmable". Implemented `isExecOrOperator` (exec role set `pta`/`coordinator`/`head_teacher` OR the Ch1 `PLATFORM_OPERATOR_EMAILS` allowlist) so a school's own leadership can record outcomes without needing operator status, matching the school-confirmable trust model.

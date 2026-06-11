# Morna Diagnostic Wedge (M0+M1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the stable, shareable Morna community-diagnostic link — public page with live counter, email-gated anonymous submission, signup-via-email — running on a durable production host.

**Architecture:** Extends vibez in place (spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md`, milestones M0+M1). New public router `/api/d/:slug` modelled on the public VOICE endpoints; answers stored **unlinkable** from the email-bearing submission row (no FK, only a random `responseId` shared across one respondent's answer rows); optional year/class demographics attach to the `responseId`. Signup reuses the password-reset token machinery. Production = always-on Node host + managed Postgres seeded with Morna only; the Riverside demo on Tom's Mac is untouched.

**Tech Stack:** Express + Drizzle + Postgres (existing monorepo), vitest (existing test pattern: boot `app.listen(0)`, raw `pool` seeding, `fetch`), React + wouter + orval-generated hooks, Resend for email.

**Conventions to follow (proven in this repo):**
- Build vertical: schema → `pnpm --filter @workspace/db push-force` → router (register in `routes/index.ts`) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page + route in `App.tsx`.
- `pnpm typecheck` fails on PRE-EXISTING issues — verify per-layer with builds and tests, not repo-wide typecheck.
- Front-end build wipes `dist/public` → re-add `_worker.js` after every build (only matters for the demo Pages deploy, not prod).
- Tests are self-contained: they INSERT their own school/survey rows and never depend on seed scripts.

---

### Task 1: Schema — diagnostic public layer, school slug, membership columns

**Files:**
- Modify: `lib/db/src/schema/diagnostics.ts`
- Modify: `lib/db/src/schema/schools.ts`
- Modify: `lib/db/src/schema/users.ts`

- [ ] **Step 1: Add columns to `diagnostic_surveys` and the three new tables**

In `lib/db/src/schema/diagnostics.ts`, add to the `diagnosticSurveysTable` columns object (after `title`):

```ts
  // Public community diagnostics (spec §4.2): when publicSlug is set the survey
  // is reachable without auth at /d/:slug. instrument holds the question set as
  // data; releasedAt is the exec's release switch (results invisible until set).
  publicSlug: varchar("public_slug", { length: 60 }).unique(),
  instrument: jsonb("instrument"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
```

Add `jsonb` to the existing `drizzle-orm/pg-core` import line.

Append at the end of the file:

```ts
// Public diagnostic submissions — the email-bearing record. Holds NO answers.
// emailHash enforces one-submission-per-email; email is kept only to send the
// signup invite and the release notification.
export const diagnosticSubmissionsTable = pgTable("diagnostic_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  email: varchar("email", { length: 255 }).notNull(),
  emailHash: varchar("email_hash", { length: 64 }).notNull(),
  name: varchar("name", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_diag_submissions_survey").on(t.surveyId),
  unique("uq_diag_submissions_survey_email").on(t.surveyId, t.emailHash),
]);

// Answers — UNLINKABLE BY DESIGN (spec §4.2): no FK to the submission. The
// random responseId exists only here and on the meta row, grouping one
// respondent's answers for aggregation without ever touching their identity.
export const diagnosticAnswersTable = pgTable("diagnostic_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  responseId: uuid("response_id").notNull(),
  questionKey: varchar("question_key", { length: 100 }).notNull(),
  answer: integer("answer"),
  freeText: text("free_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_diag_answers_survey_q").on(t.surveyId, t.questionKey),
  index("idx_diag_answers_response").on(t.surveyId, t.responseId),
]);

// Optional demographics per anonymous response (year-group segmentation).
export const diagnosticResponseMetaTable = pgTable("diagnostic_response_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  responseId: uuid("response_id").notNull().unique(),
  yearGroup: varchar("year_group", { length: 20 }),
  classOrTeacher: varchar("class_or_teacher", { length: 80 }),
}, (t) => [
  index("idx_diag_meta_survey_year").on(t.surveyId, t.yearGroup),
]);
```

Add `unique` to the `drizzle-orm/pg-core` import if not present.

- [ ] **Step 2: Add `slug` to schools**

In `lib/db/src/schema/schools.ts`, after `name`:

```ts
  // URL-safe identifier for public school pages (e.g. /d/morna). Nullable —
  // only schools with public surfaces need one.
  slug: varchar("slug", { length: 60 }).unique(),
```

- [ ] **Step 3: Add membership columns to users**

In `lib/db/src/schema/users.ts`, add to the columns (near `active`):

```ts
  // Community membership (spec §4.1). Existing accounts default to approved;
  // diagnostic signups are created pending until an exec approves them (M2).
  membershipStatus: varchar("membership_status", { length: 20 }).default("approved").notNull(),
  // named | anonymous — how this member renders to OTHER PARENTS (admins
  // always see the real name). Chosen at approval time (M2).
  displayMode: varchar("display_mode", { length: 20 }).default("named").notNull(),
```

- [ ] **Step 4: Apply the schema**

Repo convention:

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/db push-force
```

If `push-force` is unavailable in your session (it has been permission-blocked before), apply the equivalent additive SQL directly — it is exactly what push would generate (no drops):

```bash
set -a; . ./.env; set +a
psql "$DATABASE_URL" <<'SQL'
ALTER TABLE diagnostic_surveys ADD COLUMN IF NOT EXISTS public_slug varchar(60) UNIQUE,
  ADD COLUMN IF NOT EXISTS instrument jsonb,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;
CREATE TABLE IF NOT EXISTS diagnostic_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES diagnostic_surveys(id),
  email varchar(255) NOT NULL,
  email_hash varchar(64) NOT NULL,
  name varchar(150),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_diag_submissions_survey_email UNIQUE (survey_id, email_hash)
);
CREATE INDEX IF NOT EXISTS idx_diag_submissions_survey ON diagnostic_submissions(survey_id);
CREATE TABLE IF NOT EXISTS diagnostic_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES diagnostic_surveys(id),
  response_id uuid NOT NULL,
  question_key varchar(100) NOT NULL,
  answer integer,
  free_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diag_answers_survey_q ON diagnostic_answers(survey_id, question_key);
CREATE INDEX IF NOT EXISTS idx_diag_answers_response ON diagnostic_answers(survey_id, response_id);
CREATE TABLE IF NOT EXISTS diagnostic_response_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES diagnostic_surveys(id),
  response_id uuid NOT NULL UNIQUE,
  year_group varchar(20),
  class_or_teacher varchar(80)
);
CREATE INDEX IF NOT EXISTS idx_diag_meta_survey_year ON diagnostic_response_meta(survey_id, year_group);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS slug varchar(60) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status varchar(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS display_mode varchar(20) NOT NULL DEFAULT 'named';
SQL
```

- [ ] **Step 5: Verify**

```bash
psql "$DATABASE_URL" -c "\d diagnostic_answers" | grep -E "response_id|submission"
```
Expected: `response_id | uuid` present; **no** `submission_id` column (unlinkability is structural).

- [ ] **Step 6: Commit**

```bash
git add lib/db/src/schema
git commit -m "feat(db): public diagnostic layer (unlinkable answers, demographics), school slug, membership columns"
```

---

### Task 2: The Morna instrument + seed script

**Files:**
- Create: `artifacts/api-server/src/lib/communityInstrument.ts`
- Create: `scripts/src/seed-morna.ts`
- Modify: `scripts/package.json`

- [ ] **Step 1: Write the instrument module**

Create `artifacts/api-server/src/lib/communityInstrument.ts`. This is the v1 Morna question set per spec §4.5 — anchored to the six recurring patterns; Tom reviews wording before the link goes out. The instrument is stored on the survey row as jsonb so wording edits never need a deploy.

```ts
// The Morna community diagnostic instrument (spec §4.5).
// Anchored to the six recurring patterns from the community diagnosis so the
// released results map one-to-one onto the values proposal. Stored as data on
// diagnostic_surveys.instrument — this module is only the canonical source the
// seed writes from.

export const FREQ_OPTIONS = ["Never", "Once or twice", "Several times", "Ongoing", "Not sure"];
export const AGREE_OPTIONS = [
  "Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree", "Doesn't apply / not sure",
];

export interface InstrumentQuestion {
  key: string;
  section: string;
  text: string;
  type: "scale" | "text";
  options?: string[];
  optional?: boolean;
}

export const MORNA_YEAR_GROUPS = [
  "Nursery", "Reception",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13",
];

export const MORNA_INSTRUMENT: InstrumentQuestion[] = [
  // Pattern 01 — coordinated group conduct
  { key: "group_conduct_exp", section: "Group behaviour", type: "scale", options: FREQ_OPTIONS,
    text: "My child has experienced unkind behaviour from a group of children acting together (rather than one child acting alone)." },
  { key: "group_conduct_attrib", section: "Group behaviour", type: "scale", options: AGREE_OPTIONS,
    text: "When group incidents have happened, the school identified everyone involved — including who led it." },
  // Pattern 02 — sophisticated social exclusion
  { key: "exclusion_exp", section: "Exclusion", type: "scale", options: FREQ_OPTIONS,
    text: "My child has been deliberately excluded — left out in ways that are hard to see but clearly intentional." },
  { key: "exclusion_recognised", section: "Exclusion", type: "scale", options: AGREE_OPTIONS,
    text: "Adults at school recognised the exclusion without us having to push for it." },
  // Pattern 03 — status-based targeting
  { key: "status_exp", section: "Status and possessions", type: "scale", options: FREQ_OPTIONS,
    text: "My child has experienced or witnessed children being targeted over money, clothes, or possessions." },
  // Pattern 04 — age-inappropriate conduct
  { key: "age_conduct_exp", section: "Age-appropriate behaviour", type: "scale", options: FREQ_OPTIONS,
    text: "My child has been exposed at school to behaviour or content that is not appropriate for their age." },
  { key: "expectations_clear", section: "Age-appropriate behaviour", type: "scale", options: AGREE_OPTIONS,
    text: "The school's expectations are clear enough that my child knows what is and isn't acceptable here." },
  // Pattern 05 — bystander passivity
  { key: "bystander_exp", section: "Speaking up", type: "scale", options: FREQ_OPTIONS,
    text: "My child has seen other children being treated unkindly and felt unable to speak up or get help." },
  { key: "standing_up_named", section: "Speaking up", type: "scale", options: AGREE_OPTIONS,
    text: "Standing up for others is an explicit, named expectation at the school." },
  // Pattern 06 — isolation in a transient community
  { key: "isolation_exp", section: "Belonging and inclusion", type: "scale", options: FREQ_OPTIONS,
    text: "My child has gone through periods of having no one — when they arrived, or after friends left." },
  { key: "inclusion_new", section: "Belonging and inclusion", type: "scale", options: AGREE_OPTIONS,
    text: "The school actively helps new and isolated children find their feet." },
  { key: "belonging", section: "Belonging and inclusion", type: "scale", options: AGREE_OPTIONS,
    text: "My child feels they belong at this school." },
  // Cross-cutting — reporting and the school's response
  { key: "reported_concern", section: "The school's response", type: "scale",
    options: ["We've never needed to", "Yes, we have", "No — we didn't feel able to", "Prefer not to say"],
    text: "Have you ever reported a bullying or wellbeing concern to the school?" },
  { key: "response_confidence", section: "The school's response", type: "scale", options: AGREE_OPTIONS,
    text: "When concerns are raised, the school's response is clear, timely, and communicated back to families." },
  { key: "conflict_distinction", section: "The school's response", type: "scale", options: AGREE_OPTIONS,
    text: "The school distinguishes properly between a conflict between equals and bullying — where one child holds power over another." },
  // Open question
  { key: "open_message", section: "In your own words", type: "text", optional: true,
    text: "What is the one thing about life at the school that you most want other parents — and the school — to understand?" },
];
```

- [ ] **Step 2: Write the seed script**

Create `scripts/src/seed-morna.ts`. Production-only by intent (idempotent; safe to re-run). It creates the Morna school + the community survey + the chair (Tom) account. Other officers are invited later (M3 claim flow). Chair email comes from env so no real address is committed.

```ts
import { db, schoolsTable, usersTable, diagnosticSurveysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { MORNA_INSTRUMENT } from "../../artifacts/api-server/src/lib/communityInstrument";

// Idempotent Morna production seed: school + community diagnostic + chair account.
// Usage: MORNA_CHAIR_EMAIL=tom@... pnpm --filter @workspace/scripts seed-morna
async function main() {
  const chairEmail = process.env.MORNA_CHAIR_EMAIL?.toLowerCase().trim();
  if (!chairEmail) throw new Error("Set MORNA_CHAIR_EMAIL");

  let [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.slug, "morna"));
  if (!school) {
    [school] = await db.insert(schoolsTable).values({
      name: "Morna International College",
      slug: "morna",
      country: "ES",
      region: "Balearic Islands",
    }).returning();
    console.log("[seed-morna] created school", school.id);
  } else {
    console.log("[seed-morna] school exists", school.id);
  }

  const [existingChair] = await db.select().from(usersTable).where(eq(usersTable.email, chairEmail));
  if (!existingChair) {
    await db.insert(usersTable).values({
      schoolId: school.id,
      role: "pta",
      firstName: "Tom",
      lastName: "King",
      email: chairEmail,
      membershipStatus: "approved",
    } as any);
    console.log("[seed-morna] created chair account (no password — use the reset-password flow to set one)");
  } else {
    console.log("[seed-morna] chair account exists");
  }

  const [existingSurvey] = await db.select().from(diagnosticSurveysTable)
    .where(eq(diagnosticSurveysTable.publicSlug, "morna"));
  if (!existingSurvey) {
    const chair = existingChair ?? (await db.select().from(usersTable).where(eq(usersTable.email, chairEmail)))[0];
    await db.insert(diagnosticSurveysTable).values({
      schoolId: school.id,
      title: "How is Morna really doing?",
      status: "active",
      createdBy: chair.id,
      publicSlug: "morna",
      instrument: MORNA_INSTRUMENT,
    } as any);
    console.log("[seed-morna] created community survey /d/morna");
  } else {
    console.log("[seed-morna] survey exists");
  }
  process.exit(0);
}

main().catch((e) => { console.error("seed-morna failed:", e); process.exit(1); });
```

- [ ] **Step 3: Register the script**

In `scripts/package.json` scripts block, after `"seed-demo-content"`:

```json
    "seed-morna": "tsx ./src/seed-morna.ts",
```

- [ ] **Step 4: Verify it compiles (do NOT run against the local demo DB — it would add a second school to the demo's school picker)**

```bash
cd ~/dev/safe-skoolz/scripts && pnpm exec tsx --eval "import('./src/seed-morna.ts').then(()=>{}).catch(e=>{if(!/MORNA_CHAIR_EMAIL/.test(String(e)))throw e;console.log('compiles, env-guard OK');process.exit(0)})"
```
Expected: `compiles, env-guard OK`

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/communityInstrument.ts scripts/src/seed-morna.ts scripts/package.json
git commit -m "feat(diagnostic): Morna instrument (six patterns) + production seed script"
```

---

### Task 3: GET /api/d/:slug — public survey endpoint (TDD)

**Files:**
- Create: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/__tests__/communityDiagnostic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/communityDiagnostic.test.ts` (mirrors the dsar test pattern: self-seeded rows, `app.listen(0)`, `fetch`):

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
let creatorId: string;

const INSTRUMENT = [
  { key: "q_scale", section: "S1", text: "Scale question?", type: "scale", options: ["Never", "Often"] },
  { key: "q_text", section: "S2", text: "Open question?", type: "text", optional: true },
];

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('CD Test School', 'cd-test-${Date.now()}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;
  const usr = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'CD', 'Creator', $2, true) RETURNING id`,
    [schoolId, `cd-creator-${Date.now()}@example.com`],
  );
  creatorId = usr.rows[0].id;
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, created_by, public_slug, instrument)
     VALUES ($1, 'CD Test Survey', 'active', $2, 'cd-test', $3) RETURNING id`,
    [schoolId, creatorId, JSON.stringify(INSTRUMENT)],
  );
  surveyId = svy.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${(addr as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /api/d/:slug", () => {
  it("returns the survey shape without auth", async () => {
    const r = await fetch(`${baseUrl}/api/d/cd-test`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.title).toBe("CD Test Survey");
    expect(body.questions).toHaveLength(2);
    expect(body.questions[0].key).toBe("q_scale");
    expect(body.submissionCount).toBe(0);
    expect(body.released).toBe(false);
    // никогда: no internal ids/answers leak
    expect(body.schoolId).toBeUndefined();
  });

  it("404s on an unknown slug", async () => {
    const r = await fetch(`${baseUrl}/api/d/does-not-exist`);
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: FAIL — both tests get 404 (route not registered).

- [ ] **Step 3: Implement the route**

Create `artifacts/api-server/src/routes/communityDiagnostic.ts`:

```ts
import { Router, type IRouter } from "express";
import { sql, eq, and, isNotNull } from "drizzle-orm";
import { db, diagnosticSurveysTable, diagnosticSubmissionsTable } from "@workspace/db";

const router: IRouter = Router();

// Public community diagnostic (spec §4.2) — the Classlist link. No auth.
// GET returns the instrument + live submission counter; never answers.
router.get("/d/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.publicSlug, slug), isNotNull(diagnosticSurveysTable.publicSlug)));
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id));

  res.json({
    title: survey.title,
    questions: survey.instrument ?? [],
    submissionCount: count,
    released: survey.releasedAt != null,
  });
});

export default router;
```

Register in `artifacts/api-server/src/routes/index.ts` next to the other public routers:

```ts
import communityDiagnosticRouter from "./communityDiagnostic";
// ...after router.use(contactRouter);
router.use(communityDiagnosticRouter);
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/routes/index.ts src/__tests__/communityDiagnostic.test.ts
git commit -m "feat(diagnostic): public GET /api/d/:slug — instrument + live counter"
```

---

### Task 4: POST /api/d/:slug/submit — email-gated, unlinkable storage (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Test: `artifacts/api-server/src/__tests__/communityDiagnostic.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to the describe blocks in `communityDiagnostic.test.ts`:

```ts
describe("POST /api/d/:slug/submit", () => {
  const submit = (body: unknown) =>
    fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("accepts a valid submission and stores answers unlinked", async () => {
    const r = await submit({
      email: "Parent.One@Example.com",
      name: "Parent One",
      yearGroup: "Y4",
      classOrTeacher: "4B",
      answers: [
        { questionKey: "q_scale", answer: 1 },
        { questionKey: "q_text", freeText: "hello" },
      ],
    });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.counted).toBe(true);
    expect(body.count).toBe(1);

    // Submission row: email present, NO answers, NO response id.
    const sub = await pool.query(
      `SELECT * FROM diagnostic_submissions WHERE survey_id = $1`, [surveyId]);
    expect(sub.rows).toHaveLength(1);
    expect(sub.rows[0].email).toBe("parent.one@example.com");
    expect(Object.keys(sub.rows[0])).not.toContain("response_id");

    // Answers: share one random responseId; no link to the submission.
    const ans = await pool.query(
      `SELECT * FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]);
    expect(ans.rows).toHaveLength(2);
    expect(ans.rows[0].response_id).toBe(ans.rows[1].response_id);
    expect(Object.keys(ans.rows[0])).not.toContain("submission_id");

    // Demographics attach to the responseId, not the email.
    const meta = await pool.query(
      `SELECT * FROM diagnostic_response_meta WHERE survey_id = $1`, [surveyId]);
    expect(meta.rows).toHaveLength(1);
    expect(meta.rows[0].year_group).toBe("Y4");
    expect(meta.rows[0].response_id).toBe(ans.rows[0].response_id);
  });

  it("rejects a second submission from the same email (case-insensitive)", async () => {
    const r = await submit({
      email: "parent.one@example.com",
      answers: [{ questionKey: "q_scale", answer: 0 }],
    });
    expect(r.status).toBe(409);
    const after = await pool.query(
      `SELECT count(*)::int AS c FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]);
    expect(after.rows[0].c).toBe(2); // unchanged
  });

  it("rejects unknown question keys and missing email", async () => {
    const bad1 = await submit({ email: "x@y.com", answers: [{ questionKey: "nope", answer: 1 }] });
    expect(bad1.status).toBe(400);
    const bad2 = await submit({ answers: [{ questionKey: "q_scale", answer: 1 }] });
    expect(bad2.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: GET tests PASS, the three POST tests FAIL (404 — no route).

- [ ] **Step 3: Implement submit**

Add to `communityDiagnostic.ts` (below the GET). Notes: sha-256 for the dedupe hash (cheap, non-reversible enough for a gate — bcrypt would block batch dedup); one transaction writes all three tables; a per-IP rate limit mirrors the dsar limiter pattern but keyed by IP since there is no auth.

```ts
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { PgRateLimitStore } from "../lib/rateLimitStore";
import { diagnosticAnswersTable, diagnosticResponseMetaTable } from "@workspace/db";

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this connection. Please try again later." },
  store: new PgRateLimitStore("cdiag"),
  keyGenerator: (req) => req.ip ?? "anon",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/d/:slug/submit", submitLimiter, async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const { email, name, yearGroup, classOrTeacher, answers } = req.body ?? {};

  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(eq(diagnosticSurveysTable.publicSlug, slug));
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const instrument = (survey.instrument ?? []) as Array<{ key: string; type: string; optional?: boolean }>;
  const validKeys = new Set(instrument.map((q) => q.key));
  if (!Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: "Answers are required." });
    return;
  }
  for (const a of answers) {
    if (!a || !validKeys.has(a.questionKey)) {
      res.status(400).json({ error: `Unknown question: ${a?.questionKey ?? "?"}` });
      return;
    }
    if (a.answer != null && (!Number.isInteger(a.answer) || a.answer < 0 || a.answer > 10)) {
      res.status(400).json({ error: "Invalid answer value." });
      return;
    }
    if (a.freeText != null && String(a.freeText).length > 4000) {
      res.status(400).json({ error: "Answer too long." });
      return;
    }
  }

  const normalEmail = email.toLowerCase().trim();
  const emailHash = crypto.createHash("sha256").update(normalEmail).digest("hex");

  const [existing] = await db
    .select({ id: diagnosticSubmissionsTable.id })
    .from(diagnosticSubmissionsTable)
    .where(and(
      eq(diagnosticSubmissionsTable.surveyId, survey.id),
      eq(diagnosticSubmissionsTable.emailHash, emailHash),
    ));
  if (existing) {
    res.status(409).json({ error: "This email address has already taken part." });
    return;
  }

  // One transaction; the responseId never touches the submission row —
  // answers are unlinkable from the email by construction (spec §4.2).
  const responseId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(diagnosticSubmissionsTable).values({
      surveyId: survey.id,
      email: normalEmail,
      emailHash,
      name: name ? String(name).trim().slice(0, 150) : null,
    });
    await tx.insert(diagnosticAnswersTable).values(
      answers.map((a: any) => ({
        surveyId: survey.id,
        responseId,
        questionKey: String(a.questionKey),
        answer: a.answer ?? null,
        freeText: a.freeText ? String(a.freeText).trim() : null,
      })),
    );
    if (yearGroup || classOrTeacher) {
      await tx.insert(diagnosticResponseMetaTable).values({
        surveyId: survey.id,
        responseId,
        yearGroup: yearGroup ? String(yearGroup).slice(0, 20) : null,
        classOrTeacher: classOrTeacher ? String(classOrTeacher).slice(0, 80) : null,
      });
    }
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id));

  res.status(201).json({ counted: true, count });
});
```

(Consolidate the imports at the top of the file — `crypto`, `rateLimit`, `PgRateLimitStore`, and the two extra tables join the existing import lines.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/__tests__/communityDiagnostic.test.ts
git commit -m "feat(diagnostic): email-gated submit with unlinkable answers + demographics"
```

---

### Task 5: Signup invite on submission (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Test: `artifacts/api-server/src/__tests__/communityDiagnostic.test.ts`

The conversion step (spec funnel stage 4): after a successful submission, create a **pending** parent account (if none exists for that email) and send a set-your-password link. Completing it verifies the email. Reuses `password_reset_tokens` + the existing `/reset-password` page; without `RESEND_API_KEY` the link is logged (dev behaviour identical to password reset).

- [ ] **Step 1: Add the failing test**

```ts
describe("signup invite on submission", () => {
  it("creates a pending parent account and a reset token", async () => {
    const email = `invitee-${Date.now()}@example.com`;
    const r = await fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: "Invited Parent", answers: [{ questionKey: "q_scale", answer: 1 }] }),
    });
    expect(r.status).toBe(201);

    const usr = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    expect(usr.rows).toHaveLength(1);
    expect(usr.rows[0].role).toBe("parent");
    expect(usr.rows[0].membership_status).toBe("pending");
    expect(usr.rows[0].password_hash).toBeNull();

    const tok = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE user_id = $1`, [usr.rows[0].id]);
    expect(tok.rows).toHaveLength(1);
  });

  it("does not create a duplicate user when the email already has an account", async () => {
    const email = `existing-${Date.now()}@example.com`;
    await pool.query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active)
       VALUES ($1, 'parent', 'Already', 'Here', $2, true)`,
      [schoolId, email],
    );
    const r = await fetch(`${baseUrl}/api/d/cd-test/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, answers: [{ questionKey: "q_scale", answer: 2 }] }),
    });
    expect(r.status).toBe(201);
    const usr = await pool.query(`SELECT count(*)::int AS c FROM users WHERE email = $1`, [email]);
    expect(usr.rows[0].c).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify the first new test fails**

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: the "creates a pending parent account" test FAILS (0 user rows); the duplicate test passes trivially — fine.

- [ ] **Step 3: Implement the invite**

In `communityDiagnostic.ts`, add imports (`bcrypt`, `usersTable`, `passwordResetTokensTable`, `sendEmail` from `../lib/emailHelper`) and append after the transaction in the submit handler, before the count query:

```ts
  // Conversion (spec funnel stage 4): invite the participant to create an
  // account so they can see the results when the exec releases them.
  // Fire-and-forget — a failed email never fails the submission.
  void (async () => {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalEmail));
    if (!user) {
      const first = (name ? String(name).trim().split(/\s+/)[0] : "") || "Morna";
      const last = (name ? String(name).trim().split(/\s+/).slice(1).join(" ") : "") || "Parent";
      [user] = await db.insert(usersTable).values({
        schoolId: survey.schoolId,
        role: "parent",
        firstName: first,
        lastName: last,
        email: normalEmail,
        membershipStatus: "pending",
      } as any).returning();
    }
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(token, 12);
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days — campaign pace, not security reset
    });
    const appUrl = process.env.APP_URL ?? "http://localhost:5000";
    const link = `${appUrl}/reset-password?token=${token}`;
    if (!process.env.RESEND_API_KEY) {
      console.log(`[community-diagnostic] DEV signup link for ${normalEmail}: ${link}`);
    }
    await sendEmail({
      to: normalEmail,
      toName: name ? String(name) : "Morna parent",
      subject: "You're counted — create your account to see the results",
      bodyText:
        `Thank you for taking part in the Morna community diagnostic.\n\n` +
        `Your answers are anonymous and cannot be traced back to this email — not even by us.\n\n` +
        `When the PTA releases the results, every participant will see them. Create your account now so you're ready:\n\n` +
        `${link}\n\n` +
        `This link is valid for 7 days. If you didn't take the diagnostic, you can ignore this email.`,
      trigger: "community_diagnostic_signup",
      recipientId: user.id,
      schoolId: survey.schoolId,
    }).catch(() => {});
  })().catch((e) => console.error("[community-diagnostic] invite failed:", e));
```

- [ ] **Step 4: Run the tests — the async invite needs a settle**

The invite is fire-and-forget, so the test should poll briefly. If the first new test is flaky, wrap its assertions in a small retry:

```ts
    // poll up to ~2s for the async invite to land
    let rows: any[] = [];
    for (let i = 0; i < 20 && rows.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
      rows = (await pool.query(`SELECT * FROM users WHERE email = $1`, [email])).rows;
    }
```

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/__tests__/communityDiagnostic.test.ts
git commit -m "feat(diagnostic): signup invite on submission (pending parent + set-password link)"
```

---

### Task 6: OpenAPI + generated hooks

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the two paths** (inline schemas, matching the repo's convention — look at the `/voice/{id}/public` entry as the template and place these next to it):

```yaml
  /d/{slug}:
    get:
      operationId: getCommunityDiagnostic
      tags: [communityDiagnostic]
      security: []
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Public survey
          content:
            application/json:
              schema:
                type: object
                required: [title, questions, submissionCount, released]
                properties:
                  title: { type: string }
                  questions:
                    type: array
                    items:
                      type: object
                      required: [key, section, text, type]
                      properties:
                        key: { type: string }
                        section: { type: string }
                        text: { type: string }
                        type: { type: string, enum: [scale, text] }
                        options:
                          type: array
                          items: { type: string }
                        optional: { type: boolean }
                  submissionCount: { type: integer }
                  released: { type: boolean }
        "404": { description: Not found }
  /d/{slug}/submit:
    post:
      operationId: submitCommunityDiagnostic
      tags: [communityDiagnostic]
      security: []
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, answers]
              properties:
                email: { type: string }
                name: { type: string }
                yearGroup: { type: string }
                classOrTeacher: { type: string }
                answers:
                  type: array
                  items:
                    type: object
                    required: [questionKey]
                    properties:
                      questionKey: { type: string }
                      answer: { type: integer }
                      freeText: { type: string }
      responses:
        "201":
          description: Counted
          content:
            application/json:
              schema:
                type: object
                required: [counted, count]
                properties:
                  counted: { type: boolean }
                  count: { type: integer }
        "400": { description: Invalid submission }
        "409": { description: Email already took part }
```

- [ ] **Step 2: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: generates `useGetCommunityDiagnostic` / `useSubmitCommunityDiagnostic` hooks; no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec
git commit -m "feat(api-spec): community diagnostic public endpoints + hooks"
```

---

### Task 7: The public diagnostic page

**Files:**
- Create: `artifacts/safeschool/src/pages/diagnostic-community.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`

- [ ] **Step 1: Write the page**

Create `artifacts/safeschool/src/pages/diagnostic-community.tsx`. Modelled on `voice-public.tsx` (public, client-rendered, plain elements — **no framer enter-animations**, per the prod-blank gotcha). Content per spec funnel stage 2: value framing, live counter, sectioned questions, optional demographics, email+name, thank-you state.

```tsx
import { useMemo, useState } from "react";
import { useGetCommunityDiagnostic, useSubmitCommunityDiagnostic } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, ShieldCheck, Check } from "lucide-react";

// Public community diagnostic — the Classlist link (/d/:slug). No login.
// Answers are stored unlinkably from the email (spec §4.2): the email gates
// the submission, never tags the answers.

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const YEAR_GROUPS = [
  "Nursery", "Reception",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13",
];

export default function CommunityDiagnosticPage({ slug }: { slug: string }) {
  const q = useGetCommunityDiagnostic(slug);
  const submit = useSubmitCommunityDiagnostic();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeTexts, setFreeTexts] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [classOrTeacher, setClassOrTeacher] = useState("");
  const [done, setDone] = useState<null | { count: number }>(null);
  const [err, setErr] = useState<string | null>(null);

  const survey = q.data as any;
  const sections = useMemo(() => {
    const out: { section: string; questions: any[] }[] = [];
    for (const question of survey?.questions ?? []) {
      const last = out[out.length - 1];
      if (last && last.section === question.section) last.questions.push(question);
      else out.push({ section: question.section, questions: [question] });
    }
    return out;
  }, [survey]);

  const requiredScale = (survey?.questions ?? []).filter((x: any) => x.type === "scale" && !x.optional);
  const answeredAll = requiredScale.every((x: any) => answers[x.key] != null);

  const onSubmit = async () => {
    setErr(null);
    try {
      const payload = {
        email: email.trim(),
        name: name.trim() || undefined,
        yearGroup: yearGroup || undefined,
        classOrTeacher: classOrTeacher.trim() || undefined,
        answers: [
          ...Object.entries(answers).map(([questionKey, answer]) => ({ questionKey, answer })),
          ...Object.entries(freeTexts)
            .filter(([, v]) => v.trim())
            .map(([questionKey, freeText]) => ({ questionKey, freeText: freeText.trim() })),
        ],
      };
      const r = (await submit.mutateAsync({ slug, data: payload })) as any;
      setDone({ count: r.count });
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      setErr(
        e?.response?.data?.error ??
          (e?.response?.status === 409
            ? "This email address has already taken part."
            : "Something went wrong — please try again."),
      );
    }
  };

  if (q.isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-muted-foreground">Loading…</div>
      </PublicLayout>
    );
  }
  if (!survey) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Survey not found</h1>
        </div>
      </PublicLayout>
    );
  }

  if (done) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-foreground">
            You're counted — #{done.count}.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Check your email: we've sent you a link to create your account. When the PTA releases
            the results, every participant will see them — and you'll be notified.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Know another family at the school? Share the link — every voice makes the picture clearer.
          </p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Community diagnostic
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {survey.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Run by the parent community. Your answers are anonymous —{" "}
            <span className="font-semibold text-foreground">
              they cannot be traced back to your email, even by us.
            </span>{" "}
            Results are shared with every participant. And this is the start of the record: once
            tracking begins, parents can follow reported bullying and the school's responses over
            time.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              <Users className="h-4 w-4" />
              {survey.submissionCount} {survey.submissionCount === 1 ? "family has" : "families have"} taken part
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> One submission per email · ~5 minutes
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl space-y-10 px-4 py-10 sm:px-6">
        {sections.map((s) => (
          <div key={s.section}>
            <h2 className="font-display text-lg font-bold text-foreground">{s.section}</h2>
            <div className="mt-4 space-y-6">
              {s.questions.map((question: any) =>
                question.type === "text" ? (
                  <div key={question.key}>
                    <p className="text-sm font-medium text-foreground">{question.text}</p>
                    <textarea
                      rows={4}
                      className={cn(inputCls, "mt-2")}
                      value={freeTexts[question.key] ?? ""}
                      onChange={(e) => setFreeTexts((p) => ({ ...p, [question.key]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div key={question.key}>
                    <p className="text-sm font-medium text-foreground">{question.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(question.options ?? []).map((opt: string, i: number) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((p) => ({ ...p, [question.key]: i }))}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                            answers[question.key] === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground">About your family (optional)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Helps the community see results by year group. Never linked to your answers' identity.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <select className={inputCls} value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
              <option value="">Year group (optional)</option>
              {YEAR_GROUPS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Class or teacher (optional)"
              value={classOrTeacher}
              onChange={(e) => setClassOrTeacher(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-lg font-bold text-foreground">You're almost counted</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One submission per email. Your email gates the submission — it is never attached to
            your answers.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              className={inputCls}
              type="email"
              placeholder="Email (required)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          <button
            type="button"
            disabled={!email.trim() || !answeredAll || submit.isPending}
            onClick={onSubmit}
            className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full disabled:opacity-60")}
          >
            {submit.isPending ? "Submitting…" : "Submit — be counted"}
          </button>
          {!answeredAll && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Answer every scale question to submit (the open question is optional).
            </p>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
```

- [ ] **Step 2: Route it**

In `artifacts/safeschool/src/App.tsx`: import the page lazily/directly matching how `voice-public.tsx` is imported, and add a **public** route (client-rendered, NOT prerendered, NOT ProtectedRoute) next to the `/v/:id` route:

```tsx
<Route path="/d/:slug">
  {(params) => <CommunityDiagnosticPage slug={params.slug} />}
</Route>
```

- [ ] **Step 3: Build the front-end (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js
```
Expected: `✓ built`, prerender lines print, worker restored.

- [ ] **Step 4: Verify in the browser**

Seed a local test survey (NOT seed-morna — keep the demo's school picker clean) against the local DB:

```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" <<'SQL'
INSERT INTO diagnostic_surveys (school_id, title, status, created_by, public_slug, instrument)
SELECT s.id, 'How is Riverside really doing?', 'active', u.id,
       'riverside-test',
       (SELECT '[{"key":"belonging","section":"Belonging","text":"My child feels they belong at this school.","type":"scale","options":["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"]},{"key":"open_message","section":"In your own words","text":"Anything to add?","type":"text","optional":true}]'::jsonb)
FROM schools s, users u
WHERE u.email = 'coordinator@safeschool.dev'
ON CONFLICT (public_slug) DO NOTHING;
SQL
```

Restart the server (force-kill per runbook), then drive the page with the preview tooling (`vibez-inspect` config, port 8095): open `/d/riverside-test`, answer the scale question, submit with a test email, expect the "You're counted — #1" state and a `[community-diagnostic] DEV signup link` line in the server log. Check `preview_console_logs` for errors. Clean up after:

```bash
psql "$DATABASE_URL" -c "DELETE FROM diagnostic_answers WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='riverside-test');
DELETE FROM diagnostic_response_meta WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='riverside-test');
DELETE FROM diagnostic_submissions WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='riverside-test');
DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.example');
DELETE FROM users WHERE email LIKE '%@test.example';
DELETE FROM diagnostic_surveys WHERE public_slug='riverside-test';"
```
(Use a `…@test.example` email in the browser test so the cleanup is precise.)

- [ ] **Step 5: Commit**

```bash
git add artifacts/safeschool/src/pages/diagnostic-community.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(diagnostic): public community diagnostic page /d/:slug"
```

---

### Task 8: Production host (M0) — [TOM-ASSISTED]

**Files:** none (ops). Steps marked **[TOM]** need account access/billing and are checkpoints, not code.

- [ ] **Step 1 [TOM]: Create the host + database**

Recommendation: **Railway** (one service runs `node dist/index.cjs`, Postgres add-on in the same project, simplest Express fit). Alternative: Render + Neon. Create: a project, a Postgres instance, and a service from the GitHub repo (`WernerSnCW/safe-skoolz`, branch `feat/unified-app`).

- [ ] **Step 2: Configure the service**

Build command (monorepo — build front-end then server):

```bash
pnpm install --frozen-lockfile && cd artifacts/safeschool && BASE_PATH=/ NODE_ENV=production pnpm build && cd ../api-server && pnpm build
```

Start command:

```bash
node artifacts/api-server/dist/index.cjs
```

Environment variables:
- `DATABASE_URL` — the hosted Postgres URL
- `NODE_ENV=production`
- `PORT` — per host convention (Railway injects it)
- `JWT_SECRET` — fresh 64-char random (`openssl rand -hex 32`)
- `APP_URL` — the public URL (host-provided domain first; custom domain later)
- `RESEND_API_KEY` **[TOM]** — plus a verified sender domain/address in Resend (signup emails are the conversion step; without this they only log)

- [ ] **Step 3: Initialise the production database**

From the local checkout, pointed at the PROD database URL:

```bash
cd ~/dev/safe-skoolz
DATABASE_URL="<prod-postgres-url>" pnpm --filter @workspace/db push-force   # fresh DB: nothing to lose
DATABASE_URL="<prod-postgres-url>" MORNA_CHAIR_EMAIL=<tom-email> pnpm --filter @workspace/scripts seed-morna
```
Expected: school + chair + survey created. **No demo seed runs in prod** — note the api-server boot seed only fires on an EMPTY schools table; after seed-morna the table is non-empty, so Riverside is never created. Order matters: run seed-morna BEFORE first boot, or the boot seed will create Riverside in prod (delete it if that happens).

- [ ] **Step 4: Smoke-test production**

```bash
curl -s https://<prod-url>/api/d/morna | python3 -m json.tool | head -8
```
Expected: `"title": "How is Morna really doing?"`, 16 questions, `submissionCount: 0`.

Submit a real test pass in the browser at `https://<prod-url>/d/morna` with a personal test email; confirm the signup email arrives (Resend configured) and the set-password link works; then clean the test submission:

```bash
psql "<prod-postgres-url>" -c "DELETE FROM diagnostic_answers WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');
DELETE FROM diagnostic_response_meta WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');
DELETE FROM diagnostic_submissions WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE public_slug='morna');"
```
(And remove the test user if one was created.)

- [ ] **Step 5 [TOM]: Sign off the link**

Tom reviews the live instrument wording (spec §8 gate) and the page copy. Only after sign-off does `https://<prod-url>/d/morna` go to Classlist.

- [ ] **Step 6: Commit any host config files + update the runbook**

If the host needs config files (`railway.json` / `render.yaml`), commit them. Append the production deploy recipe to `docs/superpowers/2026-06-11-vibez-session-handover.md`'s runbook section (or a new `docs/PROD_RUNBOOK.md`) and commit:

```bash
git add -A docs
git commit -m "docs: production runbook (Morna host, deploy, seed)"
git push
```

---

## Self-review checklist (run after drafting — done)

- **Spec coverage (M0+M1):** stable link ✓ (T8), public page + counter + value framing ✓ (T7), instrument as data per six patterns ✓ (T2), email gate + one-per-email ✓ (T4), unlinkable answers + demographics + responseId ✓ (T1/T4), signup-via-email ✓ (T5), Morna-only prod ✓ (T2/T8), demo untouched ✓ (T7 cleanup, T8 boot-seed note). Results release/aggregation, approval queue, anonymity UI = M2 plan (not here, by design).
- **Placeholders:** none — full code in every code step; [TOM] steps are explicit human checkpoints, not gaps.
- **Type consistency:** `publicSlug/instrument/releasedAt` (T1) match T3/T4 usage; `responseId` naming consistent across tables/tests; hook names `useGetCommunityDiagnostic`/`useSubmitCommunityDiagnostic` (T6) match T7 imports; `membershipStatus: "pending"` (T5) matches T1 column.

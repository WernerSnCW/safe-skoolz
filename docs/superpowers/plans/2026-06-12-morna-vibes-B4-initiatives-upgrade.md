# Morna Vibes B4 — pta_initiatives Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the thin v1 `pta_initiatives` into the full operating-structure object — one-page-note fields, the six-box self-approval checklist with `self`/`board` approval, and the five-stage school process with a stage-history log and computed non-response tracking.

**Architecture:** Additive schema (10 columns on `pta_initiatives` + a new `pta_initiative_stage_history` table). All routes extend the existing `artifacts/api-server/src/routes/ptaGovernance.ts` (registered before `ptaRouter`, no PII middleware). `status` (PTA run-state) and `schoolStage` (school-process axis) stay orthogonal — a stage move never changes `status`. Alignment to a ratified goal is enforced at **self-approval**, not creation (so B2's auto-created initiative stays valid). Non-response is **computed** (`schoolStage='presented' && responseDueAt < now`), mirroring proposals' `overdue`. One page (`pta-initiatives.tsx`) is upgraded in place.

**Tech Stack:** Drizzle ORM + Postgres, Express, vitest (TDD: `app.listen(0)` + raw `pool` seeding + `fetch` + `signToken`), `@workspace/api-spec` (OpenAPI → orval hooks), React + wouter + lucide.

**Spec:** `docs/superpowers/specs/2026-06-12-morna-vibes-B4-initiatives-upgrade-design.md`

**Repo / branch:** `~/dev/safe-skoolz` on `feat/unified-app`. Currently **169 api-server tests green** — keep them green.

**Pre-flight env (run once per shell before backend tests):**
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a
```
Test command used throughout: `pnpm --filter @workspace/api-server test -- <file>` (vitest). Run a single file, e.g. `pnpm --filter @workspace/api-server test -- ptaInitiatives`.

---

## Task 1: Schema — columns + stage-history table + enums

**Files:**
- Modify: `lib/db/src/schema/ptaGovernance.ts` (extend `ptaInitiativesTable`, add `ptaInitiativeStageHistoryTable`, add enums + types)

The db package re-exports everything via `lib/db/src/index.ts` → `export * from "./schema"` → `lib/db/src/schema/index.ts` → `export * from "./ptaGovernance"`. New tables/consts/types automatically become importable from `@workspace/db`. No barrel edits needed.

- [ ] **Step 1: Add the enums next to the existing initiative constants**

In `lib/db/src/schema/ptaGovernance.ts`, just below the existing line `export const PTA_INITIATIVE_STATUSES = [...] as const;` (around line 58), add:

```ts
// B4 — the five-stage school process (docx §8), as a granular state machine.
// 'none' is the off-ramp for internal / self-approved initiatives that never
// touch the school. The five named stages map: idea=1, presented=2,
// accepted/rejected=3, planning=4, delivering/delivered=5.
export const PTA_INITIATIVE_SCHOOL_STAGES = ["none", "idea", "presented", "accepted", "rejected", "planning", "delivering", "delivered"] as const;
// self = any single exec, all six checklist boxes ticked + backed (docx §6/§7);
// board = checklist failed, recorded as a board decision (record-only).
export const PTA_INITIATIVE_APPROVAL_TYPES = ["self", "board"] as const;
// Stage-history rows: an actual stage transition, or a logged follow-up chase
// against a non-response ("silence is not acceptance", docx §10).
export const PTA_INITIATIVE_STAGE_ENTRY_TYPES = ["transition", "follow_up"] as const;

// The six self-approval booleans (docx §7), stored as one jsonb object.
export type InitiativeChecklist = {
  alignsGoal: boolean;
  budgetOk: boolean;
  namedOwner: boolean;
  noConflict: boolean;
  successCriteria: boolean;
  noSchoolResource: boolean;
};
export const EMPTY_INITIATIVE_CHECKLIST: InitiativeChecklist = {
  alignsGoal: false, budgetOk: false, namedOwner: false, noConflict: false, successCriteria: false, noSchoolResource: false,
};
```

- [ ] **Step 2: Extend `ptaInitiativesTable` with the new columns**

In the `ptaInitiativesTable` definition (currently ends ~line 197), add these columns inside the `pgTable("pta_initiatives", { ... })` object, after the existing `completedAt` line and before the closing `}, (t) => [`:

```ts
  // --- B4: one-page note (docx §7) ---
  goalId: uuid("goal_id").references(() => ptaGoalsTable.id),
  successCriteria: text("success_criteria"),
  resourcesNeeded: text("resources_needed"),
  conflicts: text("conflicts"),
  // --- B4: six-box self-approval checklist (docx §6/§7) ---
  checklist: jsonb("checklist").$type<InitiativeChecklist>().notNull().default(EMPTY_INITIATIVE_CHECKLIST),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalType: varchar("approval_type", { length: 10 }),
  // --- B4: five-stage school process (docx §8) ---
  schoolStage: varchar("school_stage", { length: 20 }).notNull().default("none"),
  // When a school response is expected, set on → presented. Past + still
  // 'presented' = a non-response (computed, not stored).
  responseDueAt: timestamp("response_due_at", { withTimezone: true }),
```

`ptaGoalsTable` is declared later in the same file (line ~208). Forward reference inside the `.references(() => ...)` thunk is fine — it is lazily evaluated. (If the build complains about declaration order, move the `ptaGoalsTable` block above `ptaInitiativesTable`; both are in this one file.)

- [ ] **Step 3: Add the `pta_initiative_stage_history` table**

After the `ptaGoalsTable` block (end of file, after its `export type PtaGoal = ...`), add:

```ts
// B4 — append-only history of an initiative's journey through the school's
// five-stage process. Each 'transition' row records a stage change (with the
// real-world occurredAt, a written outcome, and a reason on rejection); each
// 'follow_up' row records a chase against a non-response.
export const ptaInitiativeStageHistoryTable = pgTable("pta_initiative_stage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  initiativeId: uuid("initiative_id").references(() => ptaInitiativesTable.id).notNull(),
  entryType: varchar("entry_type", { length: 20 }).notNull().default("transition"),
  fromStage: varchar("from_stage", { length: 20 }),
  toStage: varchar("to_stage", { length: 20 }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  outcomeNote: text("outcome_note"),
  reason: text("reason"),
  recordedById: uuid("recorded_by_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_init_stage_hist_initiative").on(t.initiativeId),
]);
export type PtaInitiativeStageHistory = typeof ptaInitiativeStageHistoryTable.$inferSelect;
```

- [ ] **Step 4: Apply the additive SQL to the LOCAL dev DB**

`push-force` is interactive/unreliable; apply the DDL directly. Run against the local `safeskoolz` DB:

```bash
psql "$DATABASE_URL" <<'SQL'
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES pta_goals(id);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS success_criteria text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS resources_needed text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS conflicts text;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{"alignsGoal":false,"budgetOk":false,"namedOwner":false,"noConflict":false,"successCriteria":false,"noSchoolResource":false}'::jsonb;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approved_by_id uuid REFERENCES users(id);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS approval_type varchar(10);
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS school_stage varchar(20) NOT NULL DEFAULT 'none';
ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS response_due_at timestamptz;
CREATE TABLE IF NOT EXISTS pta_initiative_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  initiative_id uuid NOT NULL REFERENCES pta_initiatives(id),
  entry_type varchar(20) NOT NULL DEFAULT 'transition',
  from_stage varchar(20),
  to_stage varchar(20),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  outcome_note text,
  reason text,
  recorded_by_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pta_init_stage_hist_initiative ON pta_initiative_stage_history(initiative_id);
SQL
```

If `psql` is not on PATH, use the absolute path or `/usr/bin/psql`. `$DATABASE_URL` is exported by the pre-flight `set -a; . ../../.env`.

- [ ] **Step 5: Verify the db package type-checks / builds**

Run: `pnpm --filter @workspace/db build`
Expected: builds clean (no TS errors from the new columns/table).

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz
git add lib/db/src/schema/ptaGovernance.ts
git commit -m "B4: pta_initiatives schema — one-page note, checklist, school-stage + stage history"
```

---

## Task 2: Test harness + extended POST (one-page-note fields)

**Files:**
- Create: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts`
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (the `POST /pta/initiatives` handler ~line 700)

- [ ] **Step 1: Write the test harness + failing POST tests**

Create `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts`. This harness is reused by Tasks 2–8 (later tasks append `describe` blocks to it). It seeds a school, a pta admin (exec_board member), a general member, a stranger, a **ratified** goal, and a **proposed** (unratified) goal.

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let strangerTok: string;
let adminUserId: string; let ratifiedGoalId: string; let proposedGoalId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Init Test','init-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `init-admin-${stamp}@example.com`]);
  adminUserId = admin.rows[0].id;
  adminTok = signToken({ userId: adminUserId, schoolId, role: "pta" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active')`, [schoolId, adminUserId]);

  const stranger = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','St','Ranger',$2,true) RETURNING id`,
    [schoolId, `init-stranger-${stamp}@example.com`]);
  strangerTok = signToken({ userId: stranger.rows[0].id, schoolId, role: "parent" });

  const rg = await pool.query<{ id: string }>(
    `INSERT INTO pta_goals (school_id, title, year, status, proposed_by_id, ratified_at) VALUES ($1,'Ratified goal',2026,'ratified',$2, now()) RETURNING id`,
    [schoolId, adminUserId]);
  ratifiedGoalId = rg.rows[0].id;
  const pg = await pool.query<{ id: string }>(
    `INSERT INTO pta_goals (school_id, title, year, status, proposed_by_id) VALUES ($1,'Proposed goal',2026,'proposed',$2) RETURNING id`,
    [schoolId, adminUserId]);
  proposedGoalId = pg.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_initiative_stage_history WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_initiatives WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_goals WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
// Shared helper: create an initiative via the API, return its id.
async function createInitiative(body: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "T", summary: "S", ...body }) });
  if (r.status !== 201) throw new Error(`create failed ${r.status}: ${await r.text()}`);
  return (await r.json()).initiative.id;
}
export { }; // keep this a module

describe("POST /api/pta/initiatives (one-page note)", () => {
  it("requires MANAGE (stranger 403)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ title: "X", summary: "Y" }) });
    expect(r.status).toBe(403);
  });
  it("creates with the one-page-note fields (201)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({
      title: "Reading corner", summary: "Build a calm reading nook", goalId: ratifiedGoalId,
      successCriteria: "Nook used daily by week 3", resourcesNeeded: "Beanbags", conflicts: "None",
    }) });
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.initiative.goalId).toBe(ratifiedGoalId);
    expect(b.initiative.successCriteria).toBe("Nook used daily by week 3");
    expect(b.initiative.schoolStage).toBe("none");
    expect(b.initiative.checklist.alignsGoal).toBe(false);
    expect(b.initiative.approvalType ?? null).toBe(null);
  });
  it("allows an UNratified goal at creation (alignment is enforced at sign-off, not creation)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "Early", summary: "S", goalId: proposedGoalId }) });
    expect(r.status).toBe(201);
  });
  it("rejects a goalId from another school (404)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "Bad", summary: "S", goalId: "00000000-0000-0000-0000-000000000000" }) });
    expect(r.status).toBe(404);
  });
  it("still requires title + summary (400)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ title: "" }) });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — the new fields (`goalId`, `successCriteria`, `schoolStage`, `checklist`) are not returned/accepted yet.

- [ ] **Step 3: Extend the POST handler**

In `artifacts/api-server/src/routes/ptaGovernance.ts`, add `ptaGoalsTable` and `ptaInitiativeStageHistoryTable` plus the new enums to the `@workspace/db` import block at the top, alongside the existing imports:

```ts
  ptaGoalsTable,
  ptaInitiativeStageHistoryTable,
  PTA_INITIATIVE_SCHOOL_STAGES,
  PTA_INITIATIVE_APPROVAL_TYPES,
```

Then replace the body-destructure + validation of the existing `POST /pta/initiatives` handler (currently lines ~700–722) so it also reads and validates the note fields:

```ts
router.post("/pta/initiatives", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, summary, ownerId = null, originVoiceId = null, targetDate,
          goalId = null, successCriteria = null, resourcesNeeded = null, conflicts = null } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }
  if (!summary || typeof summary !== "string" || !summary.trim()) { res.status(400).json({ error: "summary is required" }); return; }

  if (ownerId) {
    const o = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, ownerId), eq(usersTable.schoolId, u.schoolId))).limit(1);
    if (!o.length) { res.status(404).json({ error: "Owner not found in this school" }); return; }
  }
  if (originVoiceId) {
    const v = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.id, originVoiceId), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
    if (!v.length) { res.status(404).json({ error: "Origin VOICE not found" }); return; }
  }
  // goalId is OPTIONAL at creation and need NOT be ratified yet (alignment is a
  // sign-off requirement, docx §5/§7); just verify it belongs to this school.
  if (goalId) {
    const g = await db.select({ id: ptaGoalsTable.id }).from(ptaGoalsTable)
      .where(and(eq(ptaGoalsTable.id, goalId), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
    if (!g.length) { res.status(404).json({ error: "Goal not found in this school" }); return; }
  }
  let target: Date | null = null;
  if (targetDate) { target = new Date(targetDate); if (isNaN(target.getTime())) { res.status(400).json({ error: "targetDate must be a valid date" }); return; } }

  const [initiative] = await db.insert(ptaInitiativesTable)
    .values({ schoolId: u.schoolId, title: title.trim(), summary: summary.trim(),
      ownerId: ownerId || null, originVoiceId: originVoiceId || null, targetDate: target, createdById: u.userId,
      goalId: goalId || null,
      successCriteria: successCriteria ? String(successCriteria).trim() : null,
      resourcesNeeded: resourcesNeeded ? String(resourcesNeeded).trim() : null,
      conflicts: conflicts ? String(conflicts).trim() : null })
    .returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_created", actor: u, targetType: "pta_initiative", targetId: initiative.id, details: { title: title.trim(), originVoiceId }, req });
  res.status(201).json({ initiative });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS (all POST tests). The returned `initiative` is the raw row, so `checklist`, `schoolStage`, `approvalType` come straight from the DB defaults.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/__tests__/ptaInitiatives.test.ts artifacts/api-server/src/routes/ptaGovernance.ts
git commit -m "B4: extend POST /pta/initiatives with one-page-note fields"
```

---

## Task 3: Extend PATCH (note fields + checklist merge)

**Files:**
- Modify: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts` (append a `describe`)
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (the `PATCH /pta/initiatives/:id` handler ~line 729)

- [ ] **Step 1: Write the failing PATCH tests** — append to the test file:

```ts
describe("PATCH /api/pta/initiatives/:id (note + checklist)", () => {
  it("edits the one-page-note fields", async () => {
    const id = await createInitiative({ goalId: ratifiedGoalId });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ successCriteria: "Updated", resourcesNeeded: "Paint", conflicts: "Clashes with fair" }) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.initiative.successCriteria).toBe("Updated");
    expect(b.initiative.conflicts).toBe("Clashes with fair");
  });
  it("merges checklist booleans (partial update keeps the others)", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { namedOwner: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { budgetOk: true } }) });
    const b = await r.json();
    expect(b.initiative.checklist.namedOwner).toBe(true);
    expect(b.initiative.checklist.budgetOk).toBe(true);
    expect(b.initiative.checklist.alignsGoal).toBe(false);
  });
  it("changes goalId (school-scoped)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ goalId: ratifiedGoalId }) });
    expect(r.status).toBe(200);
    expect((await r.json()).initiative.goalId).toBe(ratifiedGoalId);
  });
  it("rejects a checklist with an unknown key (400)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { bogus: true } }) });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — PATCH ignores `successCriteria`/`checklist`/`goalId`.

- [ ] **Step 3: Extend the PATCH handler**

In `PATCH /pta/initiatives/:id`, add to the destructure and the patch-building. Update the destructure line:

```ts
  const { status, title, summary, ownerId, targetDate, goalId, successCriteria, resourcesNeeded, conflicts, checklist } = req.body ?? {};
```

Then, after the existing `targetDate` handling block and before the `if (status !== undefined)` block, insert:

```ts
  if (goalId !== undefined) {
    if (goalId) {
      const g = await db.select({ id: ptaGoalsTable.id }).from(ptaGoalsTable)
        .where(and(eq(ptaGoalsTable.id, goalId), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
      if (!g.length) { res.status(404).json({ error: "Goal not found in this school" }); return; }
    }
    patch.goalId = goalId || null;
  }
  if (successCriteria !== undefined) patch.successCriteria = successCriteria ? String(successCriteria).trim() : null;
  if (resourcesNeeded !== undefined) patch.resourcesNeeded = resourcesNeeded ? String(resourcesNeeded).trim() : null;
  if (conflicts !== undefined) patch.conflicts = conflicts ? String(conflicts).trim() : null;
  if (checklist !== undefined) {
    if (typeof checklist !== "object" || checklist === null || Array.isArray(checklist)) { res.status(400).json({ error: "checklist must be an object" }); return; }
    const KEYS = ["alignsGoal", "budgetOk", "namedOwner", "noConflict", "successCriteria", "noSchoolResource"] as const;
    for (const k of Object.keys(checklist)) {
      if (!(KEYS as readonly string[]).includes(k)) { res.status(400).json({ error: `unknown checklist key: ${k}` }); return; }
      if (typeof (checklist as any)[k] !== "boolean") { res.status(400).json({ error: `checklist.${k} must be a boolean` }); return; }
    }
    // Shallow-merge onto the existing checklist so the UI can toggle one box at a time.
    patch.checklist = { ...(existing[0].checklist as Record<string, boolean>), ...checklist };
  }
```

(`existing` is the array already fetched by the handler's school-scoped `db.select(...).limit(1)`; reuse it — it selects `*`.)

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ptaInitiatives.test.ts
git commit -m "B4: PATCH /pta/initiatives — note fields + checklist merge"
```

---

## Task 4: Extend the list endpoint (goal join, stage, approval, computed fields)

**Files:**
- Modify: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts` (append a `describe`)
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (the `GET /pta/initiatives` handler ~line 658)

- [ ] **Step 1: Write the failing list tests** — append:

```ts
describe("GET /api/pta/initiatives (extended list)", () => {
  it("returns goal title, schoolStage, checklist, and computed awaitingResponse + followUpCount", async () => {
    await createInitiative({ goalId: ratifiedGoalId, successCriteria: "X" });
    const r = await fetch(`${baseUrl}/api/pta/initiatives`, { headers: auth(adminTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    const row = b.initiatives.find((i: any) => i.goalId === ratifiedGoalId);
    expect(row.goalTitle).toBe("Ratified goal");
    expect(row.goalStatus).toBe("ratified");
    expect(row.schoolStage).toBe("none");
    expect(row.checklist).toBeTruthy();
    expect(row.awaitingResponse).toBe(false);
    expect(row.followUpCount).toBe(0);
    expect(row.approvalType ?? null).toBe(null);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — `goalTitle`/`awaitingResponse`/`followUpCount` undefined.

- [ ] **Step 3: Extend the GET list handler**

Replace the `GET /pta/initiatives` handler body. Add a goal alias join, select the new columns, run a grouped follow-up count, and compute `awaitingResponse`:

```ts
router.get("/pta/initiatives", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const owner = alias(usersTable, "owner_u");
  const approver = alias(usersTable, "approver_u");
  const rows = await db
    .select({
      id: ptaInitiativesTable.id,
      title: ptaInitiativesTable.title,
      summary: ptaInitiativesTable.summary,
      status: ptaInitiativesTable.status,
      ownerId: ptaInitiativesTable.ownerId,
      originVoiceId: ptaInitiativesTable.originVoiceId,
      targetDate: ptaInitiativesTable.targetDate,
      createdAt: ptaInitiativesTable.createdAt,
      completedAt: ptaInitiativesTable.completedAt,
      goalId: ptaInitiativesTable.goalId,
      successCriteria: ptaInitiativesTable.successCriteria,
      resourcesNeeded: ptaInitiativesTable.resourcesNeeded,
      conflicts: ptaInitiativesTable.conflicts,
      checklist: ptaInitiativesTable.checklist,
      schoolStage: ptaInitiativesTable.schoolStage,
      responseDueAt: ptaInitiativesTable.responseDueAt,
      approvalType: ptaInitiativesTable.approvalType,
      approvedAt: ptaInitiativesTable.approvedAt,
      ownerFirst: owner.firstName, ownerLast: owner.lastName,
      approverFirst: approver.firstName, approverLast: approver.lastName,
      originVoiceName: voiceGroupsTable.name,
      goalTitle: ptaGoalsTable.title,
      goalStatus: ptaGoalsTable.status,
    })
    .from(ptaInitiativesTable)
    .leftJoin(owner, eq(owner.id, ptaInitiativesTable.ownerId))
    .leftJoin(approver, eq(approver.id, ptaInitiativesTable.approvedById))
    .leftJoin(voiceGroupsTable, eq(voiceGroupsTable.id, ptaInitiativesTable.originVoiceId))
    .leftJoin(ptaGoalsTable, eq(ptaGoalsTable.id, ptaInitiativesTable.goalId))
    .where(eq(ptaInitiativesTable.schoolId, u.schoolId))
    .orderBy(desc(ptaInitiativesTable.createdAt));

  // Follow-up counts, grouped per initiative.
  const fu = await db
    .select({ initiativeId: ptaInitiativeStageHistoryTable.initiativeId, n: sql<number>`count(*)::int` })
    .from(ptaInitiativeStageHistoryTable)
    .where(and(eq(ptaInitiativeStageHistoryTable.schoolId, u.schoolId), eq(ptaInitiativeStageHistoryTable.entryType, "follow_up")))
    .groupBy(ptaInitiativeStageHistoryTable.initiativeId);
  const fuMap = new Map(fu.map((x) => [x.initiativeId, x.n]));
  const now = Date.now();

  res.json({
    initiatives: rows.map((i) => ({
      id: i.id, title: i.title, summary: i.summary, status: i.status,
      ownerId: i.ownerId, owner: i.ownerFirst ? `${i.ownerFirst} ${i.ownerLast}`.trim() : null,
      originVoiceId: i.originVoiceId, originVoiceName: i.originVoiceName ?? null,
      targetDate: i.targetDate, createdAt: i.createdAt, completedAt: i.completedAt,
      goalId: i.goalId, goalTitle: i.goalTitle ?? null, goalStatus: i.goalStatus ?? null,
      successCriteria: i.successCriteria, resourcesNeeded: i.resourcesNeeded, conflicts: i.conflicts,
      checklist: i.checklist, schoolStage: i.schoolStage, responseDueAt: i.responseDueAt,
      approvalType: i.approvalType ?? null, approvedAt: i.approvedAt ?? null,
      approvedBy: i.approverFirst ? `${i.approverFirst} ${i.approverLast}`.trim() : null,
      awaitingResponse: i.schoolStage === "presented" && !!i.responseDueAt && new Date(i.responseDueAt).getTime() < now,
      followUpCount: fuMap.get(i.id) ?? 0,
    })),
  });
});
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ptaInitiatives.test.ts
git commit -m "B4: extend GET /pta/initiatives — goal join, stage, approval, awaitingResponse, followUpCount"
```

---

## Task 5: Approval endpoint (`POST /:id/approve` — self + board)

**Files:**
- Modify: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts` (append a `describe`)
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (add a handler after PATCH)

- [ ] **Step 1: Write the failing approval tests** — append:

```ts
describe("POST /api/pta/initiatives/:id/approve", () => {
  // Fully-backed, all six boxes ticked → self-approvable.
  async function backedInitiative(): Promise<string> {
    const id = await createInitiative({ goalId: ratifiedGoalId, ownerId: adminUserId, successCriteria: "Done when X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: true, noSchoolResource: true } }) });
    return id;
  }
  it("self-approves when all six boxes ticked + backed (stamps approver/type)", async () => {
    const id = await backedInitiative();
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.initiative.approvalType).toBe("self");
    expect(b.initiative.approvedById).toBe(adminUserId);
    expect(b.initiative.approvedAt).toBeTruthy();
  });
  it("blocks self-approve when a box is unticked (409)", async () => {
    const id = await createInitiative({ goalId: ratifiedGoalId, ownerId: adminUserId, successCriteria: "X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: false, noSchoolResource: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(409);
  });
  it("blocks self-approve when alignsGoal ticked but goal is NOT ratified (409)", async () => {
    const id = await createInitiative({ goalId: proposedGoalId, ownerId: adminUserId, successCriteria: "X" });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ checklist: { alignsGoal: true, budgetOk: true, namedOwner: true, noConflict: true, successCriteria: true, noSchoolResource: true } }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "self" }) });
    expect(r.status).toBe(409);
  });
  it("board-approves with no checklist gate (record-only)", async () => {
    const id = await createInitiative({});
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board", boardNote: "Approved at exec board 12 Jun" }) });
    expect(r.status).toBe(200);
    expect((await r.json()).initiative.approvalType).toBe("board");
  });
  it("is idempotent — re-approving an approved initiative 409s", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board" }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "board" }) });
    expect(r.status).toBe(409);
  });
  it("rejects an invalid approvalType (400) and a stranger (403)", async () => {
    const id = await createInitiative({});
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ approvalType: "magic" }) })).status).toBe(400);
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/approve`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ approvalType: "board" }) })).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — route 404 (not defined).

- [ ] **Step 3: Implement the approve handler**

Add after the `PATCH /pta/initiatives/:id` handler (before `export default router;`):

```ts
// POST /pta/initiatives/:id/approve — self (all six boxes + backed) or board (record-only).
router.post("/pta/initiatives/:id/approve", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { approvalType, boardNote = null } = req.body ?? {};
  if (!PTA_INITIATIVE_APPROVAL_TYPES.includes(approvalType)) { res.status(400).json({ error: `approvalType must be one of: ${PTA_INITIATIVE_APPROVAL_TYPES.join(", ")}` }); return; }

  const existing = await db.select().from(ptaInitiativesTable)
    .where(and(eq(ptaInitiativesTable.id, id), eq(ptaInitiativesTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Initiative not found" }); return; }
  const init = existing[0];
  if (init.approvalType) { res.status(409).json({ error: "already approved" }); return; }

  if (approvalType === "self") {
    const c = init.checklist as Record<string, boolean>;
    const allTicked = ["alignsGoal", "budgetOk", "namedOwner", "noConflict", "successCriteria", "noSchoolResource"].every((k) => c[k] === true);
    if (!allTicked) { res.status(409).json({ error: "All six checklist boxes must be ticked to self-approve" }); return; }
    // Backing invariants behind the ticked boxes.
    if (!init.goalId) { res.status(409).json({ error: "alignsGoal requires a linked goal" }); return; }
    const g = await db.select({ status: ptaGoalsTable.status }).from(ptaGoalsTable)
      .where(and(eq(ptaGoalsTable.id, init.goalId), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
    if (!g.length || g[0].status !== "ratified") { res.status(409).json({ error: "Initiatives must align with a ratified goal to self-approve" }); return; }
    if (!init.ownerId) { res.status(409).json({ error: "namedOwner requires an assigned owner" }); return; }
    if (!init.successCriteria || !init.successCriteria.trim()) { res.status(409).json({ error: "successCriteria must be defined" }); return; }
  }

  const [initiative] = await db.update(ptaInitiativesTable)
    .set({ approvalType, approvedById: u.userId, approvedAt: sql`now()`,
      conflicts: approvalType === "board" && boardNote ? init.conflicts : init.conflicts })
    .where(eq(ptaInitiativesTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_approved", actor: u, targetType: "pta_initiative", targetId: id, details: { approvalType, boardNote: boardNote || undefined }, req });
  res.json({ initiative });
});
```

(The `boardNote` is audit-logged rather than stored on a dedicated column — the spec keeps the board path record-only; the audit trail is the record. The no-op `conflicts` line above just avoids adding an unused column; you may drop it and simply not touch `conflicts`.)

Simplify the update to:

```ts
  const [initiative] = await db.update(ptaInitiativesTable)
    .set({ approvalType, approvedById: u.userId, approvedAt: sql`now()` })
    .where(eq(ptaInitiativesTable.id, id)).returning();
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ptaInitiatives.test.ts
git commit -m "B4: POST /pta/initiatives/:id/approve — self (gated) + board (record-only)"
```

---

## Task 6: Stage transitions (`POST /:id/stage`) + the transition map

**Files:**
- Modify: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts` (append a `describe`)
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (add the transition map near the top of the file + the handler)

- [ ] **Step 1: Write the failing stage tests** — append:

```ts
describe("POST /api/pta/initiatives/:id/stage", () => {
  it("walks the happy path none→idea→presented→accepted→planning→delivering→delivered, writing history", async () => {
    const id = await createInitiative({});
    for (const toStage of ["idea", "presented", "accepted", "planning", "delivering", "delivered"]) {
      const body: any = { toStage, outcomeNote: `now ${toStage}` };
      if (toStage === "presented") body.responseDueAt = new Date(Date.now() + 7 * 864e5).toISOString();
      const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify(body) });
      expect(r.status).toBe(200);
      expect((await r.json()).initiative.schoolStage).toBe(toStage);
    }
  });
  it("rejects an illegal transition (idea→delivered) 409", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea" }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "delivered" }) });
    expect(r.status).toBe(409);
  });
  it("requires a reason when rejecting (400 without, 200 with)", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea" }) });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "presented" }) });
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "rejected" }) })).status).toBe(400);
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "rejected", reason: "Budget unavailable" }) })).status).toBe(200);
  });
  it("does NOT change status (orthogonal axes)", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "active" }) });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea" }) });
    const list = await (await fetch(`${baseUrl}/api/pta/initiatives`, { headers: auth(adminTok) })).json();
    const row = list.initiatives.find((i: any) => i.id === id);
    expect(row.status).toBe("active");
    expect(row.schoolStage).toBe("idea");
  });
  it("computes awaitingResponse once presented + past due", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea" }) });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "presented", responseDueAt: new Date(Date.now() - 864e5).toISOString() }) });
    const list = await (await fetch(`${baseUrl}/api/pta/initiatives`, { headers: auth(adminTok) })).json();
    expect(list.initiatives.find((i: any) => i.id === id).awaitingResponse).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — route 404.

- [ ] **Step 3: Add the transition map + handler**

Near the top of `ptaGovernance.ts` (after the `MANAGE`/`VIEW` aliases), add:

```ts
// B4 — the five-stage school process (docx §8). Forward-only transitions.
const STAGE_TRANSITIONS: Record<string, readonly string[]> = {
  none: ["idea"],
  idea: ["presented"],
  presented: ["accepted", "rejected"],
  accepted: ["planning"],
  planning: ["delivering"],
  delivering: ["delivered"],
  rejected: [],
  delivered: [],
};
```

Add the handler after the approve handler:

```ts
// POST /pta/initiatives/:id/stage — advance the school-process stage + log history.
router.post("/pta/initiatives/:id/stage", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { toStage, occurredAt, outcomeNote = null, reason = null, responseDueAt } = req.body ?? {};
  if (!PTA_INITIATIVE_SCHOOL_STAGES.includes(toStage)) { res.status(400).json({ error: `toStage must be one of: ${PTA_INITIATIVE_SCHOOL_STAGES.join(", ")}` }); return; }

  const existing = await db.select().from(ptaInitiativesTable)
    .where(and(eq(ptaInitiativesTable.id, id), eq(ptaInitiativesTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Initiative not found" }); return; }
  const init = existing[0];
  const from = init.schoolStage;
  if (!STAGE_TRANSITIONS[from]?.includes(toStage)) { res.status(409).json({ error: `Cannot move from ${from} to ${toStage}` }); return; }
  if (toStage === "rejected" && (!reason || !String(reason).trim())) { res.status(400).json({ error: "A reason is required when the school rejects an initiative" }); return; }

  let occurred: Date | undefined;
  if (occurredAt) { occurred = new Date(occurredAt); if (isNaN(occurred.getTime())) { res.status(400).json({ error: "occurredAt must be a valid date" }); return; } }
  let due: Date | null | undefined;
  if (toStage === "presented" && responseDueAt) { due = new Date(responseDueAt); if (isNaN(due.getTime())) { res.status(400).json({ error: "responseDueAt must be a valid date" }); return; } }

  const initiative = await db.transaction(async (tx) => {
    await tx.insert(ptaInitiativeStageHistoryTable).values({
      schoolId: u.schoolId, initiativeId: id, entryType: "transition",
      fromStage: from, toStage, occurredAt: occurred,
      outcomeNote: outcomeNote ? String(outcomeNote).trim() : null,
      reason: reason ? String(reason).trim() : null, recordedById: u.userId,
    });
    const setPatch: Record<string, unknown> = { schoolStage: toStage };
    if (toStage === "presented") setPatch.responseDueAt = due ?? null;
    const [row] = await tx.update(ptaInitiativesTable).set(setPatch).where(eq(ptaInitiativesTable.id, id)).returning();
    return row;
  });

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_stage_changed", actor: u, targetType: "pta_initiative", targetId: id, details: { fromStage: from, toStage }, req });
  res.json({ initiative });
});
```

(When `occurredAt` is omitted, leaving `occurredAt: undefined` lets the DB default `now()` apply.)

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ptaInitiatives.test.ts
git commit -m "B4: POST /pta/initiatives/:id/stage — five-stage transitions + history"
```

---

## Task 7: Follow-up endpoint + detail endpoint (`POST /:id/follow-up`, `GET /:id`)

**Files:**
- Modify: `artifacts/api-server/src/__tests__/ptaInitiatives.test.ts` (append a `describe`)
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (two handlers)

- [ ] **Step 1: Write the failing tests** — append:

```ts
describe("follow-up + detail", () => {
  it("logs a follow-up (follow_up history row) and increments followUpCount", async () => {
    const id = await createInitiative({});
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea" }) });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "presented", responseDueAt: new Date(Date.now() - 864e5).toISOString() }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}/follow-up`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ note: "Chased the head 14 Jun" }) });
    expect(r.status).toBe(201);
    const list = await (await fetch(`${baseUrl}/api/pta/initiatives`, { headers: auth(adminTok) })).json();
    expect(list.initiatives.find((i: any) => i.id === id).followUpCount).toBe(1);
  });
  it("rejects a follow-up without a note (400)", async () => {
    const id = await createInitiative({});
    expect((await fetch(`${baseUrl}/api/pta/initiatives/${id}/follow-up`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({}) })).status).toBe(400);
  });
  it("GET /:id returns the initiative + ordered stage history", async () => {
    const id = await createInitiative({ goalId: ratifiedGoalId });
    await fetch(`${baseUrl}/api/pta/initiatives/${id}/stage`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ toStage: "idea", outcomeNote: "kickoff" }) });
    const r = await fetch(`${baseUrl}/api/pta/initiatives/${id}`, { headers: auth(adminTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.initiative.id).toBe(id);
    expect(b.initiative.goalTitle).toBe("Ratified goal");
    expect(Array.isArray(b.stageHistory)).toBe(true);
    expect(b.stageHistory[0].toStage).toBe("idea");
    expect(b.stageHistory[0].recordedBy).toBeTruthy();
  });
  it("GET /:id 404s for another school's id", async () => {
    expect((await fetch(`${baseUrl}/api/pta/initiatives/00000000-0000-0000-0000-000000000000`, { headers: auth(adminTok) })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: FAIL — routes 404.

- [ ] **Step 3: Implement follow-up + detail handlers**

Add after the stage handler:

```ts
// POST /pta/initiatives/:id/follow-up — record a chase against a non-response.
router.post("/pta/initiatives/:id/follow-up", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { note } = req.body ?? {};
  if (!note || !String(note).trim()) { res.status(400).json({ error: "note is required" }); return; }

  const existing = await db.select({ id: ptaInitiativesTable.id }).from(ptaInitiativesTable)
    .where(and(eq(ptaInitiativesTable.id, id), eq(ptaInitiativesTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Initiative not found" }); return; }

  const [row] = await db.insert(ptaInitiativeStageHistoryTable)
    .values({ schoolId: u.schoolId, initiativeId: id, entryType: "follow_up", outcomeNote: String(note).trim(), recordedById: u.userId })
    .returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_followed_up", actor: u, targetType: "pta_initiative", targetId: id, details: {}, req });
  res.status(201).json({ entry: row });
});

// GET /pta/initiatives/:id — full detail + ordered stage history.
router.get("/pta/initiatives/:id", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const owner = alias(usersTable, "d_owner");
  const approver = alias(usersTable, "d_approver");
  const rows = await db.select({
      id: ptaInitiativesTable.id, title: ptaInitiativesTable.title, summary: ptaInitiativesTable.summary,
      status: ptaInitiativesTable.status, ownerId: ptaInitiativesTable.ownerId,
      originVoiceId: ptaInitiativesTable.originVoiceId, targetDate: ptaInitiativesTable.targetDate,
      createdAt: ptaInitiativesTable.createdAt, completedAt: ptaInitiativesTable.completedAt,
      goalId: ptaInitiativesTable.goalId, successCriteria: ptaInitiativesTable.successCriteria,
      resourcesNeeded: ptaInitiativesTable.resourcesNeeded, conflicts: ptaInitiativesTable.conflicts,
      checklist: ptaInitiativesTable.checklist, schoolStage: ptaInitiativesTable.schoolStage,
      responseDueAt: ptaInitiativesTable.responseDueAt, approvalType: ptaInitiativesTable.approvalType,
      approvedAt: ptaInitiativesTable.approvedAt,
      ownerFirst: owner.firstName, ownerLast: owner.lastName,
      approverFirst: approver.firstName, approverLast: approver.lastName,
      goalTitle: ptaGoalsTable.title, goalStatus: ptaGoalsTable.status,
    })
    .from(ptaInitiativesTable)
    .leftJoin(owner, eq(owner.id, ptaInitiativesTable.ownerId))
    .leftJoin(approver, eq(approver.id, ptaInitiativesTable.approvedById))
    .leftJoin(ptaGoalsTable, eq(ptaGoalsTable.id, ptaInitiativesTable.goalId))
    .where(and(eq(ptaInitiativesTable.id, id), eq(ptaInitiativesTable.schoolId, u.schoolId))).limit(1);
  if (!rows.length) { res.status(404).json({ error: "Initiative not found" }); return; }
  const i = rows[0];

  const rec = alias(usersTable, "hist_u");
  const hist = await db.select({
      id: ptaInitiativeStageHistoryTable.id, entryType: ptaInitiativeStageHistoryTable.entryType,
      fromStage: ptaInitiativeStageHistoryTable.fromStage, toStage: ptaInitiativeStageHistoryTable.toStage,
      occurredAt: ptaInitiativeStageHistoryTable.occurredAt, outcomeNote: ptaInitiativeStageHistoryTable.outcomeNote,
      reason: ptaInitiativeStageHistoryTable.reason, recFirst: rec.firstName, recLast: rec.lastName,
    })
    .from(ptaInitiativeStageHistoryTable)
    .leftJoin(rec, eq(rec.id, ptaInitiativeStageHistoryTable.recordedById))
    .where(eq(ptaInitiativeStageHistoryTable.initiativeId, id))
    .orderBy(desc(ptaInitiativeStageHistoryTable.occurredAt));
  const now = Date.now();

  res.json({
    initiative: {
      id: i.id, title: i.title, summary: i.summary, status: i.status, ownerId: i.ownerId,
      owner: i.ownerFirst ? `${i.ownerFirst} ${i.ownerLast}`.trim() : null,
      originVoiceId: i.originVoiceId, targetDate: i.targetDate, createdAt: i.createdAt, completedAt: i.completedAt,
      goalId: i.goalId, goalTitle: i.goalTitle ?? null, goalStatus: i.goalStatus ?? null,
      successCriteria: i.successCriteria, resourcesNeeded: i.resourcesNeeded, conflicts: i.conflicts,
      checklist: i.checklist, schoolStage: i.schoolStage, responseDueAt: i.responseDueAt,
      approvalType: i.approvalType ?? null, approvedAt: i.approvedAt ?? null,
      approvedBy: i.approverFirst ? `${i.approverFirst} ${i.approverLast}`.trim() : null,
      awaitingResponse: i.schoolStage === "presented" && !!i.responseDueAt && new Date(i.responseDueAt).getTime() < now,
    },
    stageHistory: hist.map((h) => ({
      id: h.id, entryType: h.entryType, fromStage: h.fromStage, toStage: h.toStage,
      occurredAt: h.occurredAt, outcomeNote: h.outcomeNote, reason: h.reason,
      recordedBy: h.recFirst ? `${h.recFirst} ${h.recLast}`.trim() : null,
    })),
  });
});
```

**Route-order note:** Express matches in declaration order. `GET /pta/initiatives/:id` must be declared so it does not shadow the literal `GET /pta/initiatives`. The literal list route is registered earlier in the file (Task 4), so adding `:id` later is safe. Verify the existing `GET /pta/initiatives` still returns the list after this task.

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @workspace/api-server test -- ptaInitiatives
```
Expected: PASS.

- [ ] **Step 5: Run the FULL api-server suite to confirm no regressions**

```bash
pnpm --filter @workspace/api-server test
```
Expected: all green (169 prior + the new B4 tests).

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ptaInitiatives.test.ts
git commit -m "B4: follow-up + GET /pta/initiatives/:id detail with stage history"
```

---

## Task 8: OpenAPI + codegen (typed hooks)

**Files:**
- Modify: `lib/api-spec/openapi.yaml` (extend the two existing initiative path entries + add four new operations)
- Generated: `@workspace/api-client-react` hooks (via codegen — do not hand-edit)

- [ ] **Step 1: Extend the existing initiative paths in `openapi.yaml`**

In `/pta/initiatives` `get` → `responses.200` → the `initiatives` items `properties`, add (after `completedAt`):

```yaml
                        goalId: { type: string, nullable: true }
                        goalTitle: { type: string, nullable: true }
                        goalStatus: { type: string, nullable: true }
                        successCriteria: { type: string, nullable: true }
                        resourcesNeeded: { type: string, nullable: true }
                        conflicts: { type: string, nullable: true }
                        checklist: { type: object }
                        schoolStage: { type: string }
                        responseDueAt: { type: string, nullable: true }
                        approvalType: { type: string, nullable: true }
                        approvedAt: { type: string, nullable: true }
                        approvedBy: { type: string, nullable: true }
                        awaitingResponse: { type: boolean }
                        followUpCount: { type: integer }
```

In `/pta/initiatives` `post` → `requestBody` schema `properties`, add (alongside the existing ones):

```yaml
                goalId: { type: string, nullable: true }
                successCriteria: { type: string, nullable: true }
                resourcesNeeded: { type: string, nullable: true }
                conflicts: { type: string, nullable: true }
```

In `/pta/initiatives/{id}` `patch` → `requestBody` schema `properties`, add:

```yaml
                goalId: { type: string, nullable: true }
                successCriteria: { type: string, nullable: true }
                resourcesNeeded: { type: string, nullable: true }
                conflicts: { type: string, nullable: true }
                checklist: { type: object }
```

- [ ] **Step 2: Add the new operations**

Under the `/pta/initiatives/{id}:` path entry (which currently only has `patch`), add a `get`. Then add three new path entries. Place these immediately after the existing `/pta/initiatives/{id}:` block (before `/pta/goals:`):

```yaml
  /pta/initiatives/{id}/detail:
    get:
      operationId: getPtaInitiative
      tags: [pta]
      summary: Initiative detail + stage history
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Detail
          content:
            application/json:
              schema:
                type: object
                properties:
                  initiative: { type: object }
                  stageHistory: { type: array, items: { type: object } }
        "404": { description: Not found }
  /pta/initiatives/{id}/approve:
    post:
      operationId: approvePtaInitiative
      tags: [pta]
      summary: Approve an initiative (self or board)
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [approvalType]
              properties:
                approvalType: { type: string }
                boardNote: { type: string, nullable: true }
      responses:
        "200": { description: Approved, content: { application/json: { schema: { type: object, properties: { initiative: { type: object } } } } } }
        "400": { description: Invalid }
        "409": { description: Checklist not met or already approved }
  /pta/initiatives/{id}/stage:
    post:
      operationId: advancePtaInitiativeStage
      tags: [pta]
      summary: Advance the school-process stage
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [toStage]
              properties:
                toStage: { type: string }
                occurredAt: { type: string, nullable: true }
                outcomeNote: { type: string, nullable: true }
                reason: { type: string, nullable: true }
                responseDueAt: { type: string, nullable: true }
      responses:
        "200": { description: Advanced, content: { application/json: { schema: { type: object, properties: { initiative: { type: object } } } } } }
        "400": { description: Invalid }
        "409": { description: Illegal transition }
  /pta/initiatives/{id}/follow-up:
    post:
      operationId: followUpPtaInitiative
      tags: [pta]
      summary: Record a follow-up against a non-response
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [note]
              properties:
                note: { type: string }
      responses:
        "201": { description: Logged, content: { application/json: { schema: { type: object, properties: { entry: { type: object } } } } } }
        "400": { description: Invalid }
```

**Why `/detail`:** orval derives a unique route key per path; `GET /pta/initiatives/{id}` cannot coexist with the existing `PATCH /pta/initiatives/{id}` AND a separate `get` cleanly in all generators, and the backend already serves `GET /pta/initiatives/:id`. Rather than risk an operationId/route clash, expose the detail read at a distinct OpenAPI path `/pta/initiatives/{id}/detail` mapped to the SAME backend handler. **Add a backend alias route** so both URLs work — in `ptaGovernance.ts`, register the detail handler on both paths:

```ts
router.get(["/pta/initiatives/:id", "/pta/initiatives/:id/detail"], authMiddleware, VIEW, async (req, res): Promise<void> => {
```

(Replace the single-path registration from Task 7 Step 3 with this array form.)

- [ ] **Step 3: Run codegen**

```bash
cd ~/dev/safe-skoolz
pnpm --filter @workspace/api-spec codegen
```
Expected: regenerates hooks; new `useGetPtaInitiative`, `useApprovePtaInitiative`, `useAdvancePtaInitiativeStage`, `useFollowUpPtaInitiative` appear in `@workspace/api-client-react`. The existing `useListPtaInitiative`/`useCreatePtaInitiative`/`useUpdatePtaInitiative` keep working with the widened shapes.

- [ ] **Step 4: Verify the spec build / client typechecks**

```bash
pnpm --filter @workspace/api-spec build
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/api-spec/openapi.yaml artifacts/api-server/src/routes/ptaGovernance.ts
git add -A lib/api-spec  # generated client outputs
git commit -m "B4: openapi + codegen for initiative note/approval/stage/follow-up + detail alias route"
```

---

## Task 9: Frontend — upgrade `pta-initiatives.tsx`

**Files:**
- Modify: `artifacts/safeschool/src/pages/pta-initiatives.tsx`

The route `/pta/initiatives` and the PTA nav item already exist. Upgrade the page in place. Plain elements, no framer enter-animations (prod-blank gotcha). Use the existing `useListPtaGoals` hook (filter `status==='ratified'`) for the goal-align select.

- [ ] **Step 1: Add the new hooks + ratified-goals + helpers**

At the top of the component, alongside the existing hooks, add:

```tsx
import {
  useListPtaInitiatives, useCreatePtaInitiative, useUpdatePtaInitiative,
  useListPtaMembers, useListVoice, useListPtaGoals,
  useApprovePtaInitiative, useAdvancePtaInitiativeStage, useFollowUpPtaInitiative,
} from "@workspace/api-client-react";
```

Inside the component:

```tsx
  const goalsQ = useListPtaGoals();
  const approve = useApprovePtaInitiative();
  const advance = useAdvancePtaInitiativeStage();
  const followUp = useFollowUpPtaInitiative();
  const ratifiedGoals = ((goalsQ.data as any)?.goals ?? []).filter((g: any) => g.status === "ratified");

  const CHECK_ITEMS: { key: string; label: string }[] = [
    { key: "alignsGoal", label: "Aligns with a ratified annual goal" },
    { key: "budgetOk", label: "No budget (or within the small-spend threshold)" },
    { key: "namedOwner", label: "Has a named, accountable owner" },
    { key: "noConflict", label: "Does not conflict with existing work" },
    { key: "successCriteria", label: "Has defined success criteria" },
    { key: "noSchoolResource", label: "Needs no formal school resource or approval" },
  ];
  const STAGES = ["idea", "presented", "accepted", "planning", "delivering", "delivered"];
  const NEXT: Record<string, string[]> = { none: ["idea"], idea: ["presented"], presented: ["accepted", "rejected"], accepted: ["planning"], planning: ["delivering"], delivering: ["delivered"], rejected: [], delivered: [] };
```

- [ ] **Step 2: Extend the create form**

Add to the create form (after the existing summary textarea, inside the same form block) — a ratified-goal select, success criteria, resources, conflicts; and include them in the `create.mutateAsync` `data`. Add state:

```tsx
  const [goalId, setGoalId] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [resourcesNeeded, setResourcesNeeded] = useState("");
  const [conflicts, setConflicts] = useState("");
```

Form fields:

```tsx
  <label className="flex flex-col gap-1">
    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Align to goal (optional)</span>
    <select className={selectCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
      <option value="">No goal yet</option>
      {ratifiedGoals.map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}
    </select>
  </label>
  <label className="block">
    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Success criteria</span>
    <textarea className={inputCls + " mt-1 min-h-[56px]"} placeholder="We'll know it worked when…" value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} />
  </label>
  <label className="block">
    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Resources needed</span>
    <input className={inputCls + " mt-1"} value={resourcesNeeded} onChange={(e) => setResourcesNeeded(e.target.value)} />
  </label>
  <label className="block">
    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Possible conflicts</span>
    <input className={inputCls + " mt-1"} value={conflicts} onChange={(e) => setConflicts(e.target.value)} />
  </label>
```

Update the create call's `data` to include `goalId: goalId || null, successCriteria: successCriteria || null, resourcesNeeded: resourcesNeeded || null, conflicts: conflicts || null` and reset them on success.

- [ ] **Step 3: Build the per-card operating UI**

Replace the initiative card body so each card shows: the one-page note (goal badge + success/resources/conflicts), the existing status select, the six-box checklist with an Approve action, the five-stage stepper with advance controls + awaiting-response banner + follow-up, and an inline-expandable history (lazy-loads `useGetPtaInitiative(i.id)` when expanded). Concrete card JSX:

```tsx
  {/* goal alignment + one-page note */}
  {i.goalTitle && (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
      <Flag className="w-3 h-3" /> {i.goalTitle}{i.goalStatus !== "ratified" ? " (not ratified)" : ""}
    </span>
  )}
  {i.successCriteria && <p className="mt-2 text-xs text-muted-foreground"><b>Success:</b> {i.successCriteria}</p>}
  {i.resourcesNeeded && <p className="text-xs text-muted-foreground"><b>Needs:</b> {i.resourcesNeeded}</p>}
  {i.conflicts && <p className="text-xs text-muted-foreground"><b>Conflicts:</b> {i.conflicts}</p>}

  {/* approval */}
  {i.approvalType ? (
    <p className="mt-2 text-xs text-success">✓ {i.approvalType === "self" ? "Self-approved" : "Board-approved"}{i.approvedBy ? ` by ${i.approvedBy}` : ""}</p>
  ) : (
    <div className="mt-3 rounded-md border border-border p-3">
      <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">Self-approval checklist</p>
      {CHECK_ITEMS.map((c) => (
        <label key={c.key} className="flex items-center gap-2 text-sm py-0.5">
          <input type="checkbox" checked={!!(i.checklist?.[c.key])}
            onChange={(e) => run(() => update.mutateAsync({ id: i.id, data: { checklist: { [c.key]: e.target.checked } } }))} />
          {c.label}
        </label>
      ))}
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={!CHECK_ITEMS.every((c) => i.checklist?.[c.key])}
          onClick={() => run(() => approve.mutateAsync({ id: i.id, data: { approvalType: "self" } }))}>Self-approve</Button>
        <Button size="sm" variant="outline"
          onClick={() => run(() => approve.mutateAsync({ id: i.id, data: { approvalType: "board" } }))}>Board-approve</Button>
      </div>
    </div>
  )}

  {/* five-stage school process */}
  <div className="mt-3">
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {STAGES.map((s) => (
        <span key={s} className={`rounded-full px-2 py-0.5 ${i.schoolStage === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</span>
      ))}
    </div>
    {i.awaitingResponse && (
      <div className="mt-2 rounded-md border border-warning/40 bg-warning/10 text-warning text-xs px-2 py-1">
        Awaiting school response — overdue. Silence is not acceptance. {i.followUpCount > 0 ? `${i.followUpCount} follow-up(s) logged.` : ""}
      </div>
    )}
    <div className="mt-2 flex flex-wrap gap-2">
      {(NEXT[i.schoolStage] ?? []).map((to) => (
        <Button key={to} size="sm" variant="outline" onClick={() => run(async () => {
          const body: any = { toStage: to };
          if (to === "rejected") { const reason = window.prompt("Reason the school gave for rejecting:"); if (!reason) return; body.reason = reason; }
          if (to === "presented") { const due = window.prompt("Response due date (YYYY-MM-DD), optional:"); if (due) body.responseDueAt = new Date(due).toISOString(); }
          await advance.mutateAsync({ id: i.id, data: body });
        })}>→ {to}</Button>
      ))}
      {i.schoolStage === "presented" && (
        <Button size="sm" variant="ghost" onClick={() => run(async () => { const note = window.prompt("Follow-up note:"); if (note) await followUp.mutateAsync({ id: i.id, data: { note } }); })}>Log follow-up</Button>
      )}
    </div>
    {i.schoolStage === "delivered" && i.status !== "completed" && (
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => run(() => update.mutateAsync({ id: i.id, data: { status: "completed" } }))}>Mark initiative completed</Button>
    )}
  </div>
```

(`run` is the existing helper that clears `err`, awaits, and refetches. `text-success`/`text-warning`/`bg-warning` are existing theme tokens.)

- [ ] **Step 4: Add the inline-expandable history**

Add an "Show history" toggle per card; when open, call `useGetPtaInitiative(i.id)` (in a small child component so the hook isn't called conditionally in the parent) and render the timeline:

```tsx
function StageHistory({ id }: { id: string }) {
  const q = useGetPtaInitiative(id);
  const hist = (q.data as any)?.stageHistory ?? [];
  if (q.isLoading) return <p className="text-xs text-muted-foreground mt-2">Loading history…</p>;
  if (!hist.length) return <p className="text-xs text-muted-foreground mt-2">No history yet.</p>;
  return (
    <ul className="mt-2 space-y-1 border-l border-border pl-3">
      {hist.map((h: any) => (
        <li key={h.id} className="text-xs text-muted-foreground">
          <span className="font-mono">{new Date(h.occurredAt).toLocaleDateString()}</span>{" "}
          {h.entryType === "follow_up" ? <b>Follow-up:</b> : <b>{h.fromStage} → {h.toStage}</b>}{" "}
          {h.outcomeNote}{h.reason ? ` — reason: ${h.reason}` : ""}{h.recordedBy ? ` (${h.recordedBy})` : ""}
        </li>
      ))}
    </ul>
  );
}
```

Import `useGetPtaInitiative` and gate the child on an open-state set (`const [openId, setOpenId] = useState<string|null>(null)`), rendering `{openId === i.id && <StageHistory id={i.id} />}` with a toggle button.

- [ ] **Step 5: Build the front-end and verify it compiles**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```
Expected: vite build + prerender succeed (no TS errors). **After the build, restore `dist/public/_worker.js`** if the demo Pages proxy is in use (the build wipes `dist/public`); for local prod verification it is not required.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz
git add artifacts/safeschool/src/pages/pta-initiatives.tsx
git commit -m "B4: upgrade /pta/initiatives page — one-page note, self-approval checklist, five-stage timeline"
```

---

## Task 10: In-browser verification (local prod)

**Files:** none (verification only)

- [ ] **Step 1: Build + (re)start the unified server on :8080**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cd ~/dev/safe-skoolz/artifacts/api-server && pnpm build
lsof -ti:8080 | xargs kill 2>/dev/null; set -a; . ../../.env; set +a; PORT=8080 NODE_ENV=production node dist/index.cjs &
```

- [ ] **Step 2: Drive the page with the preview MCP**

Use the `vibez` preview config (port 8080). Log in as the pta admin (the seed's `pta.chair@safeschool.dev` / `password123` on the local Riverside DB), go to `/pta/initiatives`, and confirm:
- create an initiative with a ratified-goal alignment + success criteria;
- tick all six checklist boxes → Self-approve succeeds; verify a partially-ticked one cannot self-approve;
- advance through Idea → Presentation (set a past due date) → confirm the "Awaiting school response — overdue" banner; log a follow-up; advance to Accept → Planning → Delivery → Delivered; confirm the "Mark completed" prompt;
- expand history and confirm the timeline shows the transitions + follow-up with dates and the rejection reason path.
Confirm no console errors (`preview_console_logs`).

- [ ] **Step 3: Screenshot proof**

`preview_screenshot` the upgraded card with the checklist + stepper + history for the build record.

---

## Task 11: Production rollout (TOM-GATED — do not run without his go-ahead)

**Files:** none (ops)

B4 needs the §4.3 schema in prod **before** the push (the endpoints error without the new columns/table), exactly like B3.

- [ ] **Step 1: STOP — get Tom's go-ahead.** Confirm he wants to roll B4 to prod now.

- [ ] **Step 2: Apply the DDL via the Railway Postgres Data SQL box, one statement at a time** — the ten `ALTER TABLE pta_initiatives ADD COLUMN IF NOT EXISTS …` statements, then the `CREATE TABLE IF NOT EXISTS pta_initiative_stage_history …`, then the `CREATE INDEX …` (full block in the spec §4.3 and Task 1 Step 4). One at a time; each should report success.

- [ ] **Step 3: Push the branch** (auto-deploys to Railway, ~140s).

```bash
cd ~/dev/safe-skoolz && git push origin feat/unified-app
```

- [ ] **Step 4: Prod smoke** (unauthenticated guards):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://safe-skoolz-production.up.railway.app/api/pta/initiatives        # expect 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://safe-skoolz-production.up.railway.app/api/pta/initiatives/x/approve  # expect 401
```
Expected: `401` (deployed + auth-guarded). A `500` on the list before the columns exist means the DDL did not apply — fix before declaring done.

---

## Self-review notes (coverage check)

- **Spec §4.1 columns** → Task 1. **§4.2 stage-history table** → Task 1. **§4.3 prod DDL** → Task 1 (local) + Task 11 (prod).
- **§5.1 extended POST/PATCH/list** → Tasks 2/3/4. **§5.2 GET /:id, approve, stage, follow-up** → Tasks 5/6/7 (+ detail alias in Task 8).
- **§2 goalId-at-sign-off** → Task 2 (unratified allowed at create) + Task 5 (ratified enforced at self-approve). **Orthogonal status/stage** → Task 6 (explicit test). **Five-stage map** → Task 6 transition map. **Non-response computed** → Task 4 (`awaitingResponse`) + Task 7 (follow-up). **Self=role=pta, board record-only** → Task 5.
- **§6 frontend** → Task 9 (+ verify Task 10). **§7 conventions / 169 green** → Task 7 Step 5 full-suite run.
- Type consistency: `checklist` keys (`alignsGoal/budgetOk/namedOwner/noConflict/successCriteria/noSchoolResource`), enum names (`PTA_INITIATIVE_SCHOOL_STAGES`, `PTA_INITIATIVE_APPROVAL_TYPES`, `PTA_INITIATIVE_STAGE_ENTRY_TYPES`), and the `STAGE_TRANSITIONS` map are identical across Tasks 1, 5, 6, 9.

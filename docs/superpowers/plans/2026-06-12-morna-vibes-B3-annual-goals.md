# Morna Vibes B3 — PTA annual goals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pta_goals` with the lifecycle proposed → shortlisted → senior-group ballot → ratified → completed/failed, reusing the existing `pta_ballots`/`pta_votes` machinery (extended with a per-ballot `electorate`) for the ratifying vote.

**Architecture:** One new table (`pta_goals`) + one additive column (`pta_ballots.electorate`) in `lib/db/src/schema/ptaGovernance.ts`. A small electorate guard in the existing vote handler. A new focused router `routes/ptaGoals.ts` (propose/list/open-ballot/PATCH transitions) registered before `ptaRouter` (so it bypasses the PII middleware, like the other PTA routers). OpenAPI + orval codegen, then a new `pta-goals.tsx` page modelled on `pta-initiatives.tsx`.

**Tech Stack:** Express + Drizzle (Postgres), vitest (`app.listen(0)` + raw `pg` pool seeding + `fetch` + `signToken`), OpenAPI + orval, React + wouter + generated react-query hooks.

**Spec:** `docs/superpowers/specs/2026-06-12-morna-vibes-B3-annual-goals-design.md`

**Before running backend tests** (each backend task):
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a
```
Local Postgres must be up. Baseline is **150 api-server tests green** — keep them green.

**Key existing facts (verified):**
- `ptaGovernance.ts`: `MANAGE = requireRole("pta")`, `VIEW = requireRole("pta","coordinator","head_teacher")` (NOTE: this VIEW excludes `parent` — the goals router needs its own VIEW that includes `parent`).
- The vote handler `POST /pta/ballots/:id/vote` (ptaGovernance.ts:450) resolves the voter via `myMember(schoolId, userId)` which currently returns only `{ id }`.
- `pta_ballots` default `options` = `["For","Against","Abstain"]`; `quorum` is a nullable absolute integer; `quorumMet = total >= quorum`.
- Routers mount at root in `routes/index.ts`; `ptaGovernanceRouter` (line ~73) is registered BEFORE `ptaRouter` (line ~79) on purpose. New router goes in that same pre-`ptaRouter` group.
- `lib/db` re-exports schema via a barrel — new table/consts must be reachable from `@workspace/db`.

---

### Task 1: Schema — `pta_goals` table, `electorate` column, consts

**Files:**
- Modify: `lib/db/src/schema/ptaGovernance.ts`
- (Verify barrel) `lib/db/src/index.ts` or `lib/db/src/schema/index.ts`

- [ ] **Step 1: Add the consts**

In `lib/db/src/schema/ptaGovernance.ts`, near the other status consts (after `PTA_INITIATIVE_STATUSES`, ~line 58), add:

```ts
export const PTA_GOAL_STATUSES = ["proposed", "shortlisted", "ratified", "completed", "failed"] as const;
export const PTA_BALLOT_ELECTORATES = ["all_members", "senior_group"] as const;
```

- [ ] **Step 2: Add the `electorate` column to `ptaBallotsTable`**

In the `ptaBallotsTable` definition (~line 110), add this column after the `options` column:

```ts
  // Who may vote: 'all_members' (default, the whole active roster) or 'senior_group'
  // (senior_group + executive_board tiers — used for goal ratification, B3).
  electorate: varchar("electorate", { length: 20 }).notNull().default("all_members"),
```

- [ ] **Step 3: Add the `ptaGoalsTable` + type**

After `ptaInitiativesTable` and its type export (~line 197), add:

```ts
// PTA annual goals (B3). Proposed by any member, shortlisted by admin, ratified
// by a senior-group ballot (ballotId → pta_ballots with electorate='senior_group'),
// then completed or failed (failed records a postmortem). Visible to all members.
export const ptaGoalsTable = pgTable("pta_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("proposed"),
  proposedById: uuid("proposed_by_id").references(() => usersTable.id).notNull(),
  ballotId: uuid("ballot_id").references(() => ptaBallotsTable.id),
  ratifiedAt: timestamp("ratified_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  postmortemNote: text("postmortem_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_goals_school").on(t.schoolId),
  index("idx_pta_goals_status").on(t.schoolId, t.status),
]);
export type PtaGoal = typeof ptaGoalsTable.$inferSelect;
```

(`integer`, `varchar`, `text`, `timestamp`, `uuid`, `index`, `pgTable`, `schoolsTable`, `usersTable` are all already imported/used in this file — confirm `integer` is in the drizzle import; `ptaBallotsTable` uses `integer("quorum")` so it is.)

- [ ] **Step 4: Confirm the barrel re-exports them**

Check `lib/db/src/index.ts` (and/or `lib/db/src/schema/index.ts`). If it uses `export * from "./schema/ptaGovernance"` (or re-exports the schema barrel), the new symbols are already exported — verify with:
```bash
cd ~/dev/safe-skoolz && grep -rn "ptaGovernance\|export \*" lib/db/src/index.ts lib/db/src/schema/index.ts 2>/dev/null
```
If there's an explicit per-symbol export list instead, add `ptaGoalsTable`, `PtaGoal`, `PTA_GOAL_STATUSES`, `PTA_BALLOT_ELECTORATES` to it.

- [ ] **Step 5: Build the db package to typecheck**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/db build
```
Expected: builds clean.

- [ ] **Step 6: Apply the additive DDL to the LOCAL database**

`push-force` is interactive/unreliable; apply the same SQL we'll use in prod, against local. Get the local URL from `.env`:
```bash
cd ~/dev/safe-skoolz && set -a; . .env; set +a
psql "$DATABASE_URL" -c "ALTER TABLE pta_ballots ADD COLUMN IF NOT EXISTS electorate varchar(20) NOT NULL DEFAULT 'all_members';"
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS pta_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  title varchar(255) NOT NULL,
  description text,
  year integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'proposed',
  proposed_by_id uuid NOT NULL REFERENCES users(id),
  ballot_id uuid REFERENCES pta_ballots(id),
  ratified_at timestamptz,
  completed_at timestamptz,
  postmortem_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);"
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_pta_goals_school ON pta_goals(school_id);"
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_pta_goals_status ON pta_goals(school_id, status);"
psql "$DATABASE_URL" -c "\d pta_goals"
```
Expected: the final `\d pta_goals` prints the table with all columns. (If `psql` isn't on PATH, use the full path or the project's documented client.)

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add lib/db/src/schema/ptaGovernance.ts lib/db/src/index.ts lib/db/src/schema/index.ts 2>/dev/null; git add lib/db
git commit -m "feat(db): pta_goals table + pta_ballots.electorate (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Vote-handler electorate guard

**Files:**
- Modify: `artifacts/api-server/src/routes/ptaGovernance.ts` (the `myMember` helper ~line 354 and the vote handler ~line 450)
- Test: `artifacts/api-server/src/__tests__/ballotElectorate.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/ballotElectorate.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string;
let seniorTok: string; let generalTok: string;
let seniorMemberId: string; let generalMemberId: string;
let seniorBallotId: string; let allBallotId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Elec Test','elec-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const su = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Se','Nior',$2,true) RETURNING id`,
    [schoolId, `elec-senior-${stamp}@example.com`]);
  seniorTok = signToken({ userId: su.rows[0].id, schoolId, role: "parent" });
  const sm = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'senior_group','active') RETURNING id`, [schoolId, su.rows[0].id]);
  seniorMemberId = sm.rows[0].id;

  const gu = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Ge','Neral',$2,true) RETURNING id`,
    [schoolId, `elec-general-${stamp}@example.com`]);
  generalTok = signToken({ userId: gu.rows[0].id, schoolId, role: "parent" });
  const gm = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active') RETURNING id`, [schoolId, gu.rows[0].id]);
  generalMemberId = gm.rows[0].id;

  // NOTE: voting requires role pta (MANAGE) on the vote route. The two users above are 'parent'.
  // The vote route guard is requireRole("pta"); so to exercise the ELECTORATE guard specifically,
  // both voters must carry role 'pta'. Re-sign their tokens as pta (their pta_members tier is what the
  // electorate guard checks, independent of the JWT role).
  seniorTok = signToken({ userId: su.rows[0].id, schoolId, role: "pta" });
  generalTok = signToken({ userId: gu.rows[0].id, schoolId, role: "pta" });

  const sb = await pool.query<{ id: string }>(
    `INSERT INTO pta_ballots (school_id, question, options, electorate, created_by_id, status) VALUES ($1,'Senior only?','["For","Against","Abstain"]','senior_group',$2,'open') RETURNING id`,
    [schoolId, su.rows[0].id]);
  seniorBallotId = sb.rows[0].id;
  const ab = await pool.query<{ id: string }>(
    `INSERT INTO pta_ballots (school_id, question, options, electorate, created_by_id, status) VALUES ($1,'Everyone?','["For","Against","Abstain"]','all_members',$2,'open') RETURNING id`,
    [schoolId, su.rows[0].id]);
  allBallotId = ab.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_votes WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_ballots WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const vote = (ballotId: string, tok: string) =>
  fetch(`${baseUrl}/api/pta/ballots/${ballotId}/vote`, { method: "POST", headers: auth(tok), body: JSON.stringify({ choice: "For" }) });

describe("ballot electorate guard", () => {
  it("senior_group member may vote a senior_group ballot", async () => {
    expect((await vote(seniorBallotId, seniorTok)).status).toBe(201);
  });
  it("general_membership member is rejected from a senior_group ballot", async () => {
    const r = await vote(seniorBallotId, generalTok);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/senior group/i);
  });
  it("general_membership member may vote an all_members ballot (unchanged)", async () => {
    expect((await vote(allBallotId, generalTok)).status).toBe(201);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ballotElectorate.test.ts
```
Expected: FAIL — the general-member-on-senior-ballot test gets 201 (no guard yet).

- [ ] **Step 3: Extend `myMember` to return the tier**

In `ptaGovernance.ts`, change `myMember` (~line 354):

```ts
async function myMember(schoolId: string, userId: string): Promise<{ id: string; tier: string } | null> {
  const r = await db.select({ id: ptaMembersTable.id, tier: ptaMembersTable.tier }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, schoolId), eq(ptaMembersTable.userId, userId))).limit(1);
  return r[0] ?? null;
}
```
(Existing callers only read `.id`; adding `.tier` is safe.)

- [ ] **Step 4: Add the electorate guard in the vote handler**

In `POST /pta/ballots/:id/vote`, AFTER the block that resolves `targetMemberId` and `viaProxy` (the proxy check, ~line 473) and BEFORE the duplicate-vote check (~line 476), insert:

```ts
  // Senior-group ballots (e.g. goal ratification, B3) are restricted to the
  // senior_group + executive_board tiers. The member whose vote is recorded
  // (the grantor, when by proxy) must be in the electorate.
  if (ballot.electorate === "senior_group") {
    const eligible = ["senior_group", "executive_board"];
    let targetTier = voter.tier;
    if (targetMemberId !== voter.id) {
      const tm = await db.select({ tier: ptaMembersTable.tier }).from(ptaMembersTable)
        .where(and(eq(ptaMembersTable.id, targetMemberId), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
      targetTier = tm[0]?.tier ?? "";
    }
    if (!eligible.includes(targetTier)) {
      res.status(403).json({ error: "Only the senior group may vote on this ballot" });
      return;
    }
  }
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ballotElectorate.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 6: Run the full suite (no regressions to existing voting)**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: all green (was 150; now 153).

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/api-server/src/routes/ptaGovernance.ts artifacts/api-server/src/__tests__/ballotElectorate.test.ts
git commit -m "feat(pta): senior_group ballot electorate guard on vote (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Goals router — propose + list

**Files:**
- Create: `artifacts/api-server/src/routes/ptaGoals.ts`
- Modify: `artifacts/api-server/src/routes/index.ts` (import + register before `ptaRouter`)
- Test: `artifacts/api-server/src/__tests__/ptaGoals.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/ptaGoals.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let memberTok: string; let strangerTok: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Goals Test','goals-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `goals-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active')`, [schoolId, admin.rows[0].id]);

  const member = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Me','Mber',$2,true) RETURNING id`,
    [schoolId, `goals-member-${stamp}@example.com`]);
  memberTok = signToken({ userId: member.rows[0].id, schoolId, role: "parent" });
  await pool.query(`INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active')`, [schoolId, member.rows[0].id]);

  // A 'parent' who is NOT on the PTA roster.
  const stranger = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','St','Ranger',$2,true) RETURNING id`,
    [schoolId, `goals-stranger-${stamp}@example.com`]);
  strangerTok = signToken({ userId: stranger.rows[0].id, schoolId, role: "parent" });

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_votes WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`UPDATE pta_goals SET ballot_id=NULL WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_ballots WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_goals WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("POST /api/pta/goals (propose)", () => {
  it("requires auth", async () => {
    expect((await fetch(`${baseUrl}/api/pta/goals`, { method: "POST" })).status).toBe(401);
  });
  it("a roster member proposes a goal (201, status proposed, year default)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({ title: "Calmer mornings" }) });
    expect(r.status).toBe(201);
    const b = await r.json();
    expect(b.goal.status).toBe("proposed");
    expect(b.goal.title).toBe("Calmer mornings");
    expect(Number.isInteger(b.goal.year)).toBe(true);
  });
  it("rejects a missing title (400)", async () => {
    expect((await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({}) })).status).toBe(400);
  });
  it("rejects a non-member (403)", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(strangerTok), body: JSON.stringify({ title: "Nope" }) });
    expect(r.status).toBe(403);
  });
});

describe("GET /api/pta/goals (list)", () => {
  it("lists goals for a member, newest first, with proposer + ballot fields", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals`, { headers: auth(memberTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(Array.isArray(b.goals)).toBe(true);
    expect(b.goals.length).toBeGreaterThanOrEqual(1);
    const g = b.goals[0];
    expect(g).toHaveProperty("status");
    expect(g).toHaveProperty("proposedBy");
    expect(g).toHaveProperty("ballot"); // null when no ballot
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ptaGoals.test.ts
```
Expected: FAIL — the route doesn't exist (404/401 mismatch).

- [ ] **Step 3: Create the router with propose + list**

Create `artifacts/api-server/src/routes/ptaGoals.ts`:

```ts
import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  ptaGoalsTable,
  ptaMembersTable,
  ptaBallotsTable,
  ptaVotesTable,
  usersTable,
  PTA_GOAL_STATUSES,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";

/**
 * PTA annual goals (B3). Proposed by any approved member, shortlisted by admin,
 * ratified by a senior-group ballot, then completed/failed. Visible to all
 * members (transparency). Registered before ptaRouter so it bypasses the PII
 * middleware — these are adult PTA volunteers managing their own body.
 */
const router: IRouter = Router();

const MANAGE = requireRole("pta");
// Members must be able to read + propose, so this VIEW includes parent (unlike ptaGovernance's).
const VIEW = requireRole("parent", "pta", "coordinator", "head_teacher");

function user(req: any): JwtPayload { return req.user as JwtPayload; }

// The caller's ACTIVE membership row, or null.
async function activeMember(schoolId: string, userId: string): Promise<{ id: string } | null> {
  const r = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, schoolId), eq(ptaMembersTable.userId, userId), eq(ptaMembersTable.status, "active"))).limit(1);
  return r[0] ?? null;
}

// POST /pta/goals — propose a goal. Any active roster member. Body { title, description?, year? }
router.post("/pta/goals", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, description = null, year } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const member = await activeMember(u.schoolId, u.userId);
  if (!member) { res.status(403).json({ error: "Only approved PTA members can propose goals" }); return; }

  const yr = Number.isInteger(year) ? year : new Date().getFullYear();
  const [goal] = await db.insert(ptaGoalsTable).values({
    schoolId: u.schoolId,
    title: title.trim().slice(0, 255),
    description: description && typeof description === "string" && description.trim() ? description.trim() : null,
    year: yr,
    status: "proposed",
    proposedById: u.userId,
  }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_proposed", actor: u, targetType: "pta_goal", targetId: goal.id, details: { title: goal.title, year: yr }, req });
  res.status(201).json({ goal });
});

// GET /pta/goals — all goals (every stage; transparency), newest first, each with
// proposer name + its linked ballot's tally/status when present.
router.get("/pta/goals", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const rows = await db.select({
      id: ptaGoalsTable.id,
      title: ptaGoalsTable.title,
      description: ptaGoalsTable.description,
      year: ptaGoalsTable.year,
      status: ptaGoalsTable.status,
      ballotId: ptaGoalsTable.ballotId,
      ratifiedAt: ptaGoalsTable.ratifiedAt,
      completedAt: ptaGoalsTable.completedAt,
      postmortemNote: ptaGoalsTable.postmortemNote,
      createdAt: ptaGoalsTable.createdAt,
      proposerFirst: usersTable.firstName,
      proposerLast: usersTable.lastName,
      proposerDisplayMode: usersTable.displayMode,
    })
    .from(ptaGoalsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaGoalsTable.proposedById))
    .where(eq(ptaGoalsTable.schoolId, u.schoolId))
    .orderBy(desc(ptaGoalsTable.createdAt));

  const ballotIds = rows.map((r) => r.ballotId).filter((x): x is string => !!x);
  const ballots = ballotIds.length
    ? await db.select().from(ptaBallotsTable).where(inArray(ptaBallotsTable.id, ballotIds))
    : [];
  const votes = ballotIds.length
    ? await db.select({ ballotId: ptaVotesTable.ballotId, choice: ptaVotesTable.choice }).from(ptaVotesTable).where(inArray(ptaVotesTable.ballotId, ballotIds))
    : [];

  const now = Date.now();
  function ballotView(id: string | null) {
    if (!id) return null;
    const b = ballots.find((x) => x.id === id);
    if (!b) return null;
    const bv = votes.filter((v) => v.ballotId === id);
    const tally: Record<string, number> = {};
    for (const opt of (b.options as string[])) tally[opt] = 0;
    for (const v of bv) tally[v.choice] = (tally[v.choice] ?? 0) + 1;
    const total = bv.length;
    const expired = !!b.closesAt && new Date(b.closesAt).getTime() < now;
    const status = b.status === "open" && expired ? "closed" : b.status;
    const carried = (tally["For"] ?? 0) > (tally["Against"] ?? 0) && (b.quorum == null || total >= b.quorum);
    return { id: b.id, status, tally, totalVotes: total, quorum: b.quorum, closesAt: b.closesAt, carried };
  }

  const viewerIsExec = isExecRole(u.role);
  res.json({
    goals: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      year: r.year,
      status: r.status,
      ratifiedAt: r.ratifiedAt,
      completedAt: r.completedAt,
      postmortemNote: r.postmortemNote,
      createdAt: r.createdAt,
      proposedBy: memberDisplayName({ firstName: r.proposerFirst, lastName: r.proposerLast, displayMode: r.proposerDisplayMode }, viewerIsExec),
      ballot: ballotView(r.ballotId),
    })),
  });
});

export default router;
```

- [ ] **Step 4: Register the router**

In `artifacts/api-server/src/routes/index.ts`: add the import near the other PTA imports (after `ptaGovernanceRouter`):
```ts
import ptaGoalsRouter from "./ptaGoals";
```
and mount it in the pre-`ptaRouter` group (right after `router.use(ptaGovernanceRouter);`):
```ts
router.use(ptaGoalsRouter);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ptaGoals.test.ts
```
Expected: PASS (the propose + list describe blocks; 6 tests).

- [ ] **Step 6: Full suite**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: green (159).

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/api-server/src/routes/ptaGoals.ts artifacts/api-server/src/routes/index.ts artifacts/api-server/src/__tests__/ptaGoals.test.ts
git commit -m "feat(pta): goals router — propose + list (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Goals router — open-ballot + PATCH transitions

**Files:**
- Modify: `artifacts/api-server/src/routes/ptaGoals.ts`
- Modify: `artifacts/api-server/src/__tests__/ptaGoals.test.ts` (append a describe block)

- [ ] **Step 1: Append the failing tests**

Append to `ptaGoals.test.ts` (inside the file, after the existing describe blocks). It re-proposes a goal so it's self-contained:

```ts
describe("goal lifecycle: shortlist → open-ballot → vote → ratify", () => {
  let goalId: string; let ballotId: string;

  it("shortlist requires MANAGE and moves proposed → shortlisted", async () => {
    const created = await (await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({ title: "Termly family events", year: 2026 }) })).json();
    goalId = created.goal.id;

    // member (non-MANAGE) cannot shortlist
    expect((await fetch(`${baseUrl}/api/pta/goals/${goalId}`, { method: "PATCH", headers: auth(memberTok), body: JSON.stringify({ status: "shortlisted" }) })).status).toBe(403);

    const r = await fetch(`${baseUrl}/api/pta/goals/${goalId}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "shortlisted" }) });
    expect(r.status).toBe(200);
    expect((await r.json()).goal.status).toBe("shortlisted");
  });

  it("open-ballot creates a senior_group ballot and links it", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals/${goalId}/open-ballot`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({}) });
    expect(r.status).toBe(200);
    const b = await r.json();
    ballotId = b.ballot.id;
    expect(b.ballot.electorate).toBe("senior_group");
    expect(b.goal.ballotId).toBe(ballotId);
    // a second open-ballot is rejected (already has one)
    expect((await fetch(`${baseUrl}/api/pta/goals/${goalId}/open-ballot`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({}) })).status).toBe(409);
  });

  it("ratify is blocked while the ballot is open", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals/${goalId}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "ratified" }) });
    expect(r.status).toBe(409);
  });

  it("ratify succeeds once the ballot is closed + carried", async () => {
    // admin (executive_board) votes For on the senior_group ballot, then closes it
    await fetch(`${baseUrl}/api/pta/ballots/${ballotId}/vote`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({ choice: "For" }) });
    await fetch(`${baseUrl}/api/pta/ballots/${ballotId}/close`, { method: "POST", headers: auth(adminTok) });

    const r = await fetch(`${baseUrl}/api/pta/goals/${goalId}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "ratified" }) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.goal.status).toBe("ratified");
    expect(b.goal.ratifiedAt).toBeTruthy();
  });

  it("ratified → completed stamps completedAt", async () => {
    const r = await fetch(`${baseUrl}/api/pta/goals/${goalId}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "completed" }) });
    expect(r.status).toBe(200);
    expect((await r.json()).goal.completedAt).toBeTruthy();
  });

  it("→ failed requires a postmortem note", async () => {
    const g = await (await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({ title: "Abandon me", year: 2026 }) })).json();
    const noNote = await fetch(`${baseUrl}/api/pta/goals/${g.goal.id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "failed" }) });
    expect(noNote.status).toBe(400);
    const withNote = await fetch(`${baseUrl}/api/pta/goals/${g.goal.id}`, { method: "PATCH", headers: auth(adminTok), body: JSON.stringify({ status: "failed", postmortemNote: "No capacity this year." }) });
    expect(withNote.status).toBe(200);
    expect((await withNote.json()).goal.postmortemNote).toMatch(/no capacity/i);
  });

  it("open-ballot is rejected when the goal is not shortlisted", async () => {
    const g = await (await fetch(`${baseUrl}/api/pta/goals`, { method: "POST", headers: auth(memberTok), body: JSON.stringify({ title: "Still proposed", year: 2026 }) })).json();
    expect((await fetch(`${baseUrl}/api/pta/goals/${g.goal.id}/open-ballot`, { method: "POST", headers: auth(adminTok), body: JSON.stringify({}) })).status).toBe(409);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ptaGoals.test.ts
```
Expected: FAIL — open-ballot + PATCH routes don't exist yet.

- [ ] **Step 3: Add the open-ballot endpoint**

In `ptaGoals.ts`, add these imports to the existing `@workspace/db` import block: `ptaBallotsTable` is already imported (Task 3). Add the endpoints BEFORE `export default router;`:

```ts
// POST /pta/goals/:id/open-ballot — open the senior-group ratifying ballot for a
// shortlisted goal and link it. MANAGE. Body { quorum?, closesAt? }.
router.post("/pta/goals/:id/open-ballot", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { quorum = null, closesAt } = req.body ?? {};

  const goals = await db.select().from(ptaGoalsTable)
    .where(and(eq(ptaGoalsTable.id, id), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
  if (!goals.length) { res.status(404).json({ error: "Goal not found" }); return; }
  const goal = goals[0];
  if (goal.status !== "shortlisted") { res.status(409).json({ error: "Only a shortlisted goal can go to a ballot" }); return; }
  if (goal.ballotId) { res.status(409).json({ error: "This goal already has a ballot" }); return; }

  if (quorum != null && (!Number.isInteger(quorum) || quorum < 0)) { res.status(400).json({ error: "quorum must be a non-negative integer" }); return; }
  let closes: Date | null = null;
  if (closesAt) { closes = new Date(closesAt); if (isNaN(closes.getTime())) { res.status(400).json({ error: "closesAt must be a valid date" }); return; } }

  let ballotId = "";
  await db.transaction(async (tx) => {
    const [ballot] = await tx.insert(ptaBallotsTable).values({
      schoolId: u.schoolId,
      question: `Ratify goal: ${goal.title}`.slice(0, 255),
      electorate: "senior_group",
      quorum,
      closesAt: closes,
      createdById: u.userId,
    }).returning({ id: ptaBallotsTable.id });
    ballotId = ballot.id;
    await tx.update(ptaGoalsTable).set({ ballotId }).where(eq(ptaGoalsTable.id, id));
  });

  const [updated] = await db.select().from(ptaGoalsTable).where(eq(ptaGoalsTable.id, id)).limit(1);
  const [ballot] = await db.select().from(ptaBallotsTable).where(eq(ptaBallotsTable.id, ballotId)).limit(1);
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_ballot_opened", actor: u, targetType: "pta_goal", targetId: id, details: { ballotId }, req });
  res.json({ goal: updated, ballot });
});
```

- [ ] **Step 4: Add the PATCH transition endpoint**

Add after the open-ballot endpoint (still before `export default router;`):

```ts
// PATCH /pta/goals/:id — MANAGE. Status transitions (+ title/description edits
// while still proposed). Body { status?, title?, description?, postmortemNote? }.
router.patch("/pta/goals/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { status, title, description, postmortemNote } = req.body ?? {};

  if (status !== undefined && !PTA_GOAL_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${PTA_GOAL_STATUSES.join(", ")}` }); return;
  }

  const goals = await db.select().from(ptaGoalsTable)
    .where(and(eq(ptaGoalsTable.id, id), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
  if (!goals.length) { res.status(404).json({ error: "Goal not found" }); return; }
  const goal = goals[0];

  const patch: Record<string, unknown> = {};

  // Title / description edits — only while still proposed.
  if (title !== undefined || description !== undefined) {
    if (goal.status !== "proposed") { res.status(409).json({ error: "A goal can only be edited while it is proposed" }); return; }
    if (title !== undefined) {
      if (!title || !String(title).trim()) { res.status(400).json({ error: "title cannot be empty" }); return; }
      patch.title = String(title).trim().slice(0, 255);
    }
    if (description !== undefined) patch.description = description && String(description).trim() ? String(description).trim() : null;
  }

  // Status transition.
  if (status !== undefined && status !== goal.status) {
    const from = goal.status;
    if (status === "shortlisted") {
      if (from !== "proposed") { res.status(409).json({ error: "Only a proposed goal can be shortlisted" }); return; }
    } else if (status === "ratified") {
      if (!goal.ballotId) { res.status(409).json({ error: "Open a ballot before ratifying" }); return; }
      const [b] = await db.select().from(ptaBallotsTable).where(eq(ptaBallotsTable.id, goal.ballotId)).limit(1);
      const expired = !!b?.closesAt && new Date(b.closesAt).getTime() < Date.now();
      const closed = b?.status === "closed" || expired;
      if (!closed) { res.status(409).json({ error: "Close the ballot before ratifying" }); return; }
      const vs = await db.select({ choice: ptaVotesTable.choice }).from(ptaVotesTable).where(eq(ptaVotesTable.ballotId, goal.ballotId));
      const forN = vs.filter((v) => v.choice === "For").length;
      const againstN = vs.filter((v) => v.choice === "Against").length;
      const total = vs.length;
      const carried = forN > againstN && (b!.quorum == null || total >= b!.quorum);
      if (!carried) { res.status(409).json({ error: "The ballot did not carry (need For > Against and quorum met)" }); return; }
      patch.ratifiedAt = sql`now()`;
    } else if (status === "completed") {
      if (from !== "ratified") { res.status(409).json({ error: "Only a ratified goal can be completed" }); return; }
      patch.completedAt = sql`now()`;
    } else if (status === "failed") {
      if (!postmortemNote || !String(postmortemNote).trim()) { res.status(400).json({ error: "A postmortem note is required to fail a goal" }); return; }
      patch.postmortemNote = String(postmortemNote).trim();
    } else {
      res.status(400).json({ error: `Cannot move a goal from ${from} to ${status}` }); return;
    }
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [updated] = await db.update(ptaGoalsTable).set(patch).where(eq(ptaGoalsTable.id, id)).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_updated", actor: u, targetType: "pta_goal", targetId: id, details: patch.status ? { status: patch.status } : { fields: Object.keys(patch) }, req });
  res.json({ goal: updated });
});
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/ptaGoals.test.ts
```
Expected: PASS (all describe blocks).

- [ ] **Step 6: Full suite**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: green (~166).

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/api-server/src/routes/ptaGoals.ts artifacts/api-server/src/__tests__/ptaGoals.test.ts
git commit -m "feat(pta): goal open-ballot + lifecycle PATCH transitions (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: OpenAPI contract + client codegen

**Files:**
- Modify: `lib/api-spec/openapi.yaml`
- Generated: `lib/api-client-react`, `lib/api-zod` (regenerated)

- [ ] **Step 1: Add the goal paths**

In `lib/api-spec/openapi.yaml`, add these paths (place them near the other `/pta/*` paths; match the surrounding 2-space indentation and the `tags: [pta]` convention used by sibling PTA endpoints):

```yaml
  /pta/goals:
    get:
      operationId: listPtaGoals
      tags: [pta]
      summary: List PTA annual goals (all stages) with proposer + ballot tally
      responses:
        "200":
          description: Goals
          content:
            application/json:
              schema:
                type: object
                properties:
                  goals:
                    type: array
                    items: { type: object }
    post:
      operationId: proposePtaGoal
      tags: [pta]
      summary: Propose a PTA goal (any approved member)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title]
              properties:
                title: { type: string }
                description: { type: string, nullable: true }
                year: { type: integer, nullable: true }
      responses:
        "201":
          description: Proposed
          content:
            application/json:
              schema:
                type: object
                properties:
                  goal: { type: object }
        "400": { description: Invalid }
        "403": { description: Not an approved member }
  /pta/goals/{id}/open-ballot:
    post:
      operationId: openPtaGoalBallot
      tags: [pta]
      summary: Open the senior-group ratifying ballot for a shortlisted goal
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                quorum: { type: integer, nullable: true }
                closesAt: { type: string, nullable: true }
      responses:
        "200":
          description: Ballot opened
          content:
            application/json:
              schema:
                type: object
                properties:
                  goal: { type: object }
                  ballot: { type: object }
        "409": { description: Not shortlisted, or already has a ballot }
  /pta/goals/{id}:
    patch:
      operationId: updatePtaGoal
      tags: [pta]
      summary: Update a PTA goal (status transitions + edits while proposed)
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status: { type: string }
                title: { type: string }
                description: { type: string, nullable: true }
                postmortemNote: { type: string }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  goal: { type: object }
        "400": { description: Invalid transition }
        "409": { description: Transition not allowed in the current state }
```

- [ ] **Step 2: Add `electorate` to the ballot response (so the voting UI can label it)**

Find the `GET /pta/ballots` 200 response schema's per-ballot object in `openapi.yaml` and add `electorate: { type: string }` to its `properties` (alongside `question`, `status`, `quorum`, etc.). If the ballots array items are typed as a bare `{ type: object }`, skip this step (no typed field to add) and note it.

- [ ] **Step 3: Regenerate the client**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: orval regenerates cleanly; `useListPtaGoals`, `useProposePtaGoal`, `useOpenPtaGoalBallot`, `useUpdatePtaGoal` now exist.

- [ ] **Step 4: Confirm the hooks exist**

```bash
cd ~/dev/safe-skoolz && grep -rn "useListPtaGoals\|useProposePtaGoal\|useOpenPtaGoalBallot\|useUpdatePtaGoal" lib/api-client-react/src/generated | head
```
Expected: matches found.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add lib/api-spec/openapi.yaml lib/api-client-react lib/api-zod
git commit -m "feat(api-spec): pta goals endpoints + ballot electorate field (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — goals page + route + nav

**Files:**
- Create: `artifacts/safeschool/src/pages/pta-goals.tsx`
- Modify: `artifacts/safeschool/src/App.tsx` (route)
- Modify: `artifacts/safeschool/src/components/layout/nav-config.tsx` (PTA nav item)

- [ ] **Step 1: Create the page**

Create `artifacts/safeschool/src/pages/pta-goals.tsx` (modelled on `pta-initiatives.tsx`; admin actions gated by `role === "pta"`, like voice.tsx's `canConvert`):

```tsx
import { useState } from "react";
import { Link } from "wouter";
import {
  useListPtaGoals,
  useProposePtaGoal,
  useOpenPtaGoalBallot,
  useUpdatePtaGoal,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Target, Plus, CheckCircle2, CircleDot, ListChecks, Vote, XCircle } from "lucide-react";

// PTA annual goals (B3). Members propose; admin shortlists; the senior group
// ratifies via a ballot; then the goal is completed or failed. Plain elements,
// no framer enter-anim (prod-blank gotcha).

const STAGE = {
  proposed: { label: "Proposed", icon: CircleDot },
  shortlisted: { label: "Shortlisted", icon: ListChecks },
  ratified: { label: "Ratified", icon: CheckCircle2 },
  completed: { label: "Completed", icon: CheckCircle2 },
  failed: { label: "Failed", icon: XCircle },
} as const;

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PtaGoals() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "";
  const canManage = role === "pta";

  const goalsQ = useListPtaGoals();
  const propose = useProposePtaGoal();
  const openBallot = useOpenPtaGoalBallot();
  const update = useUpdatePtaGoal();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const goals = (goalsQ.data as any)?.goals ?? [];

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null); setOkMsg(null);
    try { await fn(); goalsQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  const failGoal = (id: string) => {
    const note = window.prompt("Why did this goal fail? (a short postmortem note)");
    if (note && note.trim()) run(() => update.mutateAsync({ id, data: { status: "failed", postmortemNote: note.trim() } }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> PTA · Goals
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Annual goals</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Any member can propose a goal. The committee shortlists candidates, the senior group ratifies
          by vote, and ratified goals guide the year's work — visible to every member.
        </p>
      </header>

      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
      {okMsg && <div className="rounded-md border border-primary/30 bg-primary/10 text-primary text-sm px-3 py-2">{okMsg}</div>}

      {/* Propose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Propose a goal</span>
            {!showForm && <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setErr(null); }}>New goal</Button>}
          </CardTitle>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Title</span>
                <input className={inputCls + " mt-1"} placeholder="e.g. Calmer, kinder mornings" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Description (optional)</span>
                <textarea className={inputCls + " mt-1 min-h-[72px]"} placeholder="What is the goal, and why does it matter?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="block max-w-[140px]">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Year</span>
                <input className={inputCls + " mt-1"} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!title.trim() || propose.isPending}
                  onClick={() => run(async () => {
                    await propose.mutateAsync({ data: { title: title.trim(), description: description.trim() || null, year: Number(year) || new Date().getFullYear() } });
                    setTitle(""); setDescription(""); setShowForm(false);
                  })}
                >
                  Propose goal
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setDescription(""); setErr(null); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* List */}
      {goalsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No goals yet. Propose the first one above.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g: any) => {
            const stage = (STAGE as any)[g.status] ?? STAGE.proposed;
            const StageIcon = stage.icon;
            return (
              <Card key={g.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{g.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">{g.year}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                          <StageIcon className="w-3 h-3" /> {stage.label}
                        </span>
                      </div>
                      {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                      <div className="mt-2 text-xs text-muted-foreground">Proposed by {g.proposedBy}</div>
                      {g.ballot && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Senior-group ballot · {g.ballot.status} · For {g.ballot.tally?.For ?? 0} / Against {g.ballot.tally?.Against ?? 0}
                          {g.ballot.status === "open" && <> · <Link href="/pta/voting" className="text-primary hover:underline">Cast your vote</Link></>}
                        </div>
                      )}
                      {g.status === "failed" && g.postmortemNote && (
                        <p className="mt-2 text-xs text-muted-foreground italic">Postmortem: {g.postmortemNote}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {g.status === "proposed" && (
                          <Button size="sm" variant="outline" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "shortlisted" } }))}>
                            <ListChecks className="w-3.5 h-3.5 mr-1" /> Shortlist
                          </Button>
                        )}
                        {g.status === "shortlisted" && !g.ballot && (
                          <Button size="sm" disabled={openBallot.isPending}
                            onClick={() => run(async () => { await openBallot.mutateAsync({ id: g.id, data: {} }); setOkMsg("Senior-group ballot opened — eligible members can vote on the Voting page."); })}>
                            <Vote className="w-3.5 h-3.5 mr-1" /> Open senior-group ballot
                          </Button>
                        )}
                        {g.status === "shortlisted" && g.ballot && g.ballot.status === "closed" && (
                          <Button size="sm" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "ratified" } }))}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ratify
                          </Button>
                        )}
                        {g.status === "ratified" && (
                          <Button size="sm" variant="outline" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "completed" } }))}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark completed
                          </Button>
                        )}
                        {(g.status === "proposed" || g.status === "shortlisted") && (
                          <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => failGoal(g.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Fail
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the route in `App.tsx`**

Find where `/pta/initiatives` (or another `/pta/*` page) is routed in `artifacts/safeschool/src/App.tsx` and add an import + a `ProtectedRoute` route alongside it:
```tsx
import PtaGoals from "@/pages/pta-goals";
```
```tsx
<Route path="/pta/goals" component={() => <ProtectedRoute><PtaGoals /></ProtectedRoute>} />
```
(Match the EXACT wrapper pattern the sibling `/pta/*` routes use in this file — copy a neighbouring `/pta/initiatives` line and adapt.)

- [ ] **Step 3: Add the nav item**

In `artifacts/safeschool/src/components/layout/nav-config.tsx`, find the PTA section's "Initiatives" entry and add a sibling "Goals" entry pointing to `/pta/goals` (reuse the same shape — `label`, `href`/`to`, icon). Use the `Target` lucide icon to match the page. Place it near Initiatives/Voting.

- [ ] **Step 4: Build the front-end**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```
Expected: `vite build` + prerender complete, no type errors. (If `_worker.js` existed in `dist/public` and is now gone, note it — only the Pages demo needs it; don't fabricate one.)

- [ ] **Step 5: Commit (source only)**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/pages/pta-goals.tsx artifacts/safeschool/src/App.tsx artifacts/safeschool/src/components/layout/nav-config.tsx
git commit -m "feat(pta): annual goals page + route + nav (B3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Verification of the full vertical

**Files:** none (verification only).

- [ ] **Step 1: Full api-server suite green**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: all green (~166).

- [ ] **Step 2: Manual round-trip (optional but recommended)**

With the server running (`LOCAL_DEV.md`), as an admin (role pta) on a school with an active senior-group member:
- `POST /api/pta/goals` (as a member) → 201 proposed.
- `PATCH …/:id {status:"shortlisted"}` → 200.
- `POST …/:id/open-ballot` → 200, ballot `electorate:"senior_group"`.
- As a `general_membership` member: `POST /api/pta/ballots/:ballotId/vote` → **403**; as a senior/exec member → **201**.
- Close the ballot, `PATCH …/:id {status:"ratified"}` → 200 with `ratifiedAt`.
- In the UI: `/pta/goals` shows the lifecycle controls for an admin; the ballot links to `/pta/voting`.

- [ ] **Step 3: Report status**

Summarize: tests green, vertical verified. **Flag the prod gate clearly:** B3 needs the §4.3 DDL applied via the Railway Data box (the `electorate` column + `pta_goals` table) BEFORE the push auto-deploys, or the goals endpoints will error. Stop for Tom's go-ahead.

---

## Self-review notes

- **Spec coverage:** pta_goals table + electorate column (Task 1) ✓; senior-group electorate enforced in vote handler (Task 2) ✓; propose by any approved member (Task 3) ✓; list visible to all members with ballot tally (Task 3) ✓; shortlist transition (Task 4) ✓; open senior-group ballot + link (Task 4) ✓; manual ratify with closed+carried guard (Task 4) ✓; fail requires postmortem (Task 4) ✓; complete from ratified (Task 4) ✓; OpenAPI + codegen (Task 5) ✓; page + route + nav, voting via existing /pta/voting (Task 6) ✓; prod DDL gate called out (header, Task 1 §4.3, Task 7) ✓.
- **Placeholder scan:** none — all steps carry real code/commands.
- **Type consistency:** `ptaGoalsTable`/`PtaGoal`/`PTA_GOAL_STATUSES`/`PTA_BALLOT_ELECTORATES` defined in Task 1 and used consistently in Tasks 2–4; the goal response object (`status`, `proposedBy`, `ballot`) matches between the list endpoint (Task 3) and the page (Task 6); hook names (`useListPtaGoals`/`useProposePtaGoal`/`useOpenPtaGoalBallot`/`useUpdatePtaGoal`) match the OpenAPI operationIds (Task 5) and the page imports (Task 6); the electorate guard checks `senior_group`+`executive_board` consistently in Task 2 and the test seeds those tiers.
- **Note:** the `carried` rule (For > Against, quorum met) is duplicated between the list view (display, Task 3) and the ratify guard (enforcement, Task 4). This is intentional — display vs. authority — but kept identical so the UI never offers a Ratify the API will reject.

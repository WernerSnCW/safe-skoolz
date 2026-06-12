# Morna Vibes B1 — Officer Roles + Charter Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Goal 2" real — let the admin (caretaker, Chair-equivalent) adopt the three-tier operating-structure charter on behalf of the forming committee, marking the PTA *claimed/active* (`schools.ptaClaimedAt`), with officer seats (incl. new President/VP roles) acknowledging over time. Nothing asserts a title no one holds.

**Architecture:** Small additive extension of the existing PTA layer (spec `docs/superpowers/specs/2026-06-12-morna-vibes-B1-charter-claim-design.md`). Two enum values, one nullable column, a server-side charter-content constant, a new focused `ptaCharter` router (GET charter / POST adopt / POST acknowledge), and a charter page. Reuses `pta_policy_acknowledgements` for both adoption and officer acknowledgements; "admin" = the existing `role=pta`/MANAGE capability (no new role).

**Tech Stack:** Express + Drizzle + Postgres (api-server), vitest (`app.listen(0)` + raw `pool` seeding + `fetch` + `signToken`), React + wouter + orval react-query hooks (`@workspace/api-client-react`).

**Conventions (proven across M1/M2/A):** TDD backend; build vertical schema→(additive SQL)→router(register in `routes/index.ts`)→`openapi.yaml`→`pnpm --filter @workspace/api-spec codegen`→page+route in `App.tsx`; authed routes use `authMiddleware`+`requireRole`; source `.env` before backend tests (`cd artifacts/api-server && set -a; . ../../.env; set +a`); front-end build preserves `dist/public/_worker.js`; tests self-seed + mint JWTs with `signToken`. Apply prod schema via the Railway Postgres **Data SQL box** (push-force is interactive/unreliable).

## Verified integration facts (from recon — rely on these)

- `lib/db/src/schema/ptaGovernance.ts`: `export const PTA_OFFICER_ROLES = ["chair", "vice_chair", "secretary", "treasurer", "domain_lead"] as const;`. `ptaOfficersTable` cols: `id, schoolId, memberId (→pta_members), role varchar(50), domain varchar(120) nullable, termStartAt, termEndAt, active bool default true, createdAt`. `ptaMembersTable` cols incl. `id, schoolId, userId`. Both exported from `@workspace/db`.
- `lib/db/src/schema/pta.ts`: `ptaPolicyAcknowledgementsTable` cols: `id, schoolId (→schools), userId (→users), policyVersion varchar(50), actionType varchar(30), comment text nullable, createdAt`. Exported from `@workspace/db`.
- `lib/db/src/schema/schools.ts`: `schoolsTable` — id, name, slug, legalEntity, cif, address, country, region, createdAt, active. (Add `ptaClaimedAt`.)
- Routing/middleware (in `artifacts/api-server/src/routes/ptaGovernance.ts`): `const MANAGE = requireRole("pta"); const VIEW = requireRole("pta", "coordinator", "head_teacher");` and a `user(req)` helper returning the `JwtPayload`. `writeAudit({ schoolId, eventType, actor, targetType, targetId, details, req })` from `../lib/auditHelper`. Routers register via `router.use(...)` in `routes/index.ts`, mounted under `/api`.
- The existing acknowledge pattern (`POST /pta/policy/acknowledge`, `pta.ts`) inserts `ptaPolicyAcknowledgementsTable` with `{ schoolId, userId, policyVersion, actionType, comment }`.
- Officer appointment UI: `artifacts/safeschool/src/pages/pta-governance.tsx` has the role `<select>` (uses `useAppointPtaOfficer`); PTA nav in `artifacts/safeschool/src/components/layout/nav-config.tsx` (role === "pta" sees the PTA section).
- `useAuth().user` exposes `role` (and now `membershipStatus` from A). ProtectedRoute takes `{ component, allowedRoles }`.

---

### Task 1: Schema — officer roles + `schools.ptaClaimedAt`

**Files:**
- Modify: `lib/db/src/schema/ptaGovernance.ts`
- Modify: `lib/db/src/schema/schools.ts`

- [ ] **Step 1: Add the two officer roles**

In `lib/db/src/schema/ptaGovernance.ts`, change the `PTA_OFFICER_ROLES` const to:
```ts
export const PTA_OFFICER_ROLES = ["president", "vice_president", "chair", "vice_chair", "secretary", "treasurer", "domain_lead"] as const;
```
(The `role` column is `varchar(50)`, so no column change — this const is what the appoint endpoint validates against and what the UI lists.)

- [ ] **Step 2: Add `ptaClaimedAt` to schools**

In `lib/db/src/schema/schools.ts`, add to the `schoolsTable` columns (after `active`):
```ts
  // Set when the PTA adopts its operating-structure charter (B1). Null = forming/unclaimed.
  ptaClaimedAt: timestamp("pta_claimed_at", { withTimezone: true }),
```
Ensure `timestamp` is in the `drizzle-orm/pg-core` import on this file.

- [ ] **Step 3: Apply the column (additive)**

```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" -c "ALTER TABLE schools ADD COLUMN IF NOT EXISTS pta_claimed_at timestamptz;"
```
(Local DB. The same one-liner is the prod step, run later via the Railway Data SQL box.)

- [ ] **Step 4: Verify**

```bash
psql "$DATABASE_URL" -c "\d schools" | grep pta_claimed_at
```
Expected: `pta_claimed_at | timestamp with time zone`.

- [ ] **Step 5: Commit**

```bash
git add lib/db/src/schema/ptaGovernance.ts lib/db/src/schema/schools.ts
git commit -m "feat(pta): president/vice_president officer roles + schools.ptaClaimedAt"
```

---

### Task 2: Charter content module + `GET /api/pta/charter` (TDD)

**Files:**
- Create: `artifacts/api-server/src/lib/operatingStructure.ts`
- Create: `artifacts/api-server/src/routes/ptaCharter.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/__tests__/ptaCharter.test.ts`

- [ ] **Step 1: Write the charter content module**

Create `artifacts/api-server/src/lib/operatingStructure.ts`. Real draft copy (Tom signs off before it's presented to real officers); stored as data so wording edits never need a deploy beyond this constant.
```ts
// The Morna PTA operating-structure charter (B1). policyVersion is what
// pta_policy_acknowledgements rows reference when an officer adopts/acknowledges.
export const OPERATING_STRUCTURE_VERSION = "operating-structure-v1";

export interface CharterSection { heading: string; body: string }

export const OPERATING_STRUCTURE: { version: string; title: string; sections: CharterSection[] } = {
  version: OPERATING_STRUCTURE_VERSION,
  title: "Morna PTA — Operating Structure",
  sections: [
    { heading: "Purpose",
      body: "The PTA adopts this structure so that every parent has an equal voice and the same information — ending the situation where what shapes school life is visible only to a small committee." },
    { heading: "Three tiers — responsibility, not rank",
      body: "General membership: every approved parent. Senior group: members who take on coordinating work. Executive: the officers. A member's tier records the work they have taken on, never authority over others." },
    { heading: "Officer roles",
      body: "President — the school relationship. Vice President — wellbeing. Secretary — community. Chair — operational governance. Treasurer — finance. Seats are held by approved members; an acting admin carries the Chair's operational authority until a Chair is approved." },
    { heading: "How we govern",
      body: "Decisions and goals are visible to all members. Goals are proposed by any member or the wider community and ratified by a senior-group vote. Initiatives self-approve against a clear checklist and track the school's response — and a non-response is recorded as a non-response. Silence is not acceptance." },
  ],
};
```

- [ ] **Step 2: Write the failing test**

Create `artifacts/api-server/src/__tests__/ptaCharter.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let schoolId: string; let adminTok: string; let memberId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Charter Test', 'charter-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;
  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `charter-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });
  // an appointed officer (a member + officer row) for the roster
  const m = await pool.query<{ id: string }>(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'executive_board','active') RETURNING id`,
    [schoolId, admin.rows[0].id]);
  memberId = m.rows[0].id;
  await pool.query(`INSERT INTO pta_officers (school_id, member_id, role, active) VALUES ($1,$2,'president',true)`, [schoolId, memberId]);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_policy_acknowledgements WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_officers WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("GET /api/pta/charter", () => {
  it("requires auth", async () => {
    expect((await fetch(`${baseUrl}/api/pta/charter`)).status).toBe(401);
  });
  it("returns the charter content, claim status, officer seats, and acks", async () => {
    const r = await fetch(`${baseUrl}/api/pta/charter`, { headers: auth(adminTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.version).toBe("operating-structure-v1");
    expect(Array.isArray(b.sections)).toBe(true);
    expect(b.sections.length).toBeGreaterThanOrEqual(3);
    expect(b.claimed).toBe(false);
    expect(b.claimedAt).toBeNull();
    expect(b.officers.some((o: any) => o.role === "president")).toBe(true);
    expect(Array.isArray(b.acknowledgements)).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/ptaCharter.test.ts
```
Expected: FAIL (401/404 — route not registered).

- [ ] **Step 4: Implement the router (GET only this task)**

Create `artifacts/api-server/src/routes/ptaCharter.ts`:
```ts
import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db, schoolsTable, ptaOfficersTable, ptaMembersTable, usersTable, ptaPolicyAcknowledgementsTable,
} from "@workspace/db";
import { authMiddleware, type JwtPayload } from "../lib/auth";
import { OPERATING_STRUCTURE, OPERATING_STRUCTURE_VERSION } from "../lib/operatingStructure";

const router: IRouter = Router();

// GET /pta/charter — the operating-structure content + claim status + officer
// seats + acknowledgement roster. Authed; readable by members and exec.
router.get("/pta/charter", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;

  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));

  const officers = await db.select({
    role: ptaOfficersTable.role, domain: ptaOfficersTable.domain,
    firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(ptaOfficersTable)
    .innerJoin(ptaMembersTable, eq(ptaMembersTable.id, ptaOfficersTable.memberId))
    .innerJoin(usersTable, eq(usersTable.id, ptaMembersTable.userId))
    .where(and(eq(ptaOfficersTable.schoolId, u.schoolId), eq(ptaOfficersTable.active, true)));

  const acks = await db.select({
    firstName: usersTable.firstName, lastName: usersTable.lastName,
    actionType: ptaPolicyAcknowledgementsTable.actionType, createdAt: ptaPolicyAcknowledgementsTable.createdAt,
  }).from(ptaPolicyAcknowledgementsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaPolicyAcknowledgementsTable.userId))
    .where(and(
      eq(ptaPolicyAcknowledgementsTable.schoolId, u.schoolId),
      eq(ptaPolicyAcknowledgementsTable.policyVersion, OPERATING_STRUCTURE_VERSION),
    )).orderBy(desc(ptaPolicyAcknowledgementsTable.createdAt));

  res.json({
    version: OPERATING_STRUCTURE.version,
    title: OPERATING_STRUCTURE.title,
    sections: OPERATING_STRUCTURE.sections,
    claimed: school?.ptaClaimedAt != null,
    claimedAt: school?.ptaClaimedAt ?? null,
    officers: officers.map((o) => ({ role: o.role, domain: o.domain, name: `${o.firstName} ${o.lastName}`.trim() })),
    acknowledgements: acks.map((a) => ({ name: `${a.firstName} ${a.lastName}`.trim(), actionType: a.actionType, createdAt: a.createdAt })),
  });
});

export default router;
```
Register in `artifacts/api-server/src/routes/index.ts`: `import ptaCharterRouter from "./ptaCharter"; router.use(ptaCharterRouter);`

- [ ] **Step 5: Run to verify it passes**

```bash
pnpm exec vitest run src/__tests__/ptaCharter.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/operatingStructure.ts src/routes/ptaCharter.ts src/routes/index.ts src/__tests__/ptaCharter.test.ts
git commit -m "feat(pta): operating-structure charter content + GET /api/pta/charter"
```

---

### Task 3: `POST /pta/charter/adopt` + `POST /pta/charter/acknowledge` (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/ptaCharter.ts`
- Test: `artifacts/api-server/src/__tests__/ptaCharter.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `ptaCharter.test.ts` a parent (non-admin) token in `beforeAll` and new describe blocks. Add after the admin user is created in `beforeAll`:
```ts
  const parent = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Pa','Rent',$2,true) RETURNING id`,
    [schoolId, `charter-parent-${stamp}@example.com`]);
  // store on an outer-scope var: add `let parentTok: string;` at top with the others
  parentTok = signToken({ userId: parent.rows[0].id, schoolId, role: "parent" });
```
(Declare `let parentTok: string;` alongside the other `let` vars.) Then:
```ts
describe("POST /api/pta/charter/adopt", () => {
  it("403s for a non-admin (non-pta) caller", async () => {
    const r = await fetch(`${baseUrl}/api/pta/charter/adopt`, { method: "POST", headers: auth(parentTok) });
    expect(r.status).toBe(403);
  });
  it("admin adopts: sets ptaClaimedAt, records an 'adopted' ack, idempotent", async () => {
    const r1 = await fetch(`${baseUrl}/api/pta/charter/adopt`, { method: "POST", headers: auth(adminTok) });
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.claimedAt).toBeTruthy();

    const sch = await pool.query(`SELECT pta_claimed_at FROM schools WHERE id = $1`, [schoolId]);
    expect(sch.rows[0].pta_claimed_at).toBeTruthy();
    const ack = await pool.query(`SELECT * FROM pta_policy_acknowledgements WHERE school_id = $1 AND action_type = 'adopted'`, [schoolId]);
    expect(ack.rows).toHaveLength(1);

    const r2 = await fetch(`${baseUrl}/api/pta/charter/adopt`, { method: "POST", headers: auth(adminTok) });
    expect(r2.status).toBe(200); // idempotent
    const after = await pool.query(`SELECT count(*)::int AS c FROM pta_policy_acknowledgements WHERE school_id = $1 AND action_type = 'adopted'`, [schoolId]);
    expect(after.rows[0].c).toBe(1); // no duplicate
  });
  it("GET now reports claimed", async () => {
    const b = await (await fetch(`${baseUrl}/api/pta/charter`, { headers: auth(adminTok) })).json();
    expect(b.claimed).toBe(true);
  });
});

describe("POST /api/pta/charter/acknowledge", () => {
  it("records the caller's acknowledgement, idempotent", async () => {
    const r = await fetch(`${baseUrl}/api/pta/charter/acknowledge`, { method: "POST", headers: auth(parentTok) });
    expect(r.status).toBe(200);
    const a1 = await pool.query(`SELECT count(*)::int AS c FROM pta_policy_acknowledgements WHERE school_id = $1 AND action_type = 'acknowledged'`, [schoolId]);
    expect(a1.rows[0].c).toBe(1);
    await fetch(`${baseUrl}/api/pta/charter/acknowledge`, { method: "POST", headers: auth(parentTok) });
    const a2 = await pool.query(`SELECT count(*)::int AS c FROM pta_policy_acknowledgements WHERE school_id = $1 AND action_type = 'acknowledged'`, [schoolId]);
    expect(a2.rows[0].c).toBe(1); // idempotent per user
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

```bash
pnpm exec vitest run src/__tests__/ptaCharter.test.ts
```
Expected: GET tests pass; the adopt/acknowledge tests FAIL (404).

- [ ] **Step 3: Implement adopt + acknowledge**

In `ptaCharter.ts`, extend imports and add the handlers. Add to imports:
```ts
import { sql, isNull } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
```
Add `const MANAGE = requireRole("pta");` near the top. Then add before `export default router;`:
```ts
// POST /pta/charter/adopt — admin (caretaker-Chair) adopts the operating structure
// on behalf of the forming committee: sets ptaClaimedAt + records an 'adopted' ack.
// Idempotent — re-adopting returns the existing claim without a duplicate.
router.post("/pta/charter/adopt", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  if (school?.ptaClaimedAt != null) {
    res.json({ claimedAt: school.ptaClaimedAt });
    return;
  }
  const claimedAt = new Date();
  // Atomic compare-and-set so concurrent adopts don't double-claim/double-record.
  const claimed = await db.update(schoolsTable)
    .set({ ptaClaimedAt: claimedAt })
    .where(and(eq(schoolsTable.id, u.schoolId), isNull(schoolsTable.ptaClaimedAt)))
    .returning({ id: schoolsTable.id });
  if (claimed.length === 0) {
    const [fresh] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt }).from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
    res.json({ claimedAt: fresh?.ptaClaimedAt ?? claimedAt });
    return;
  }
  await db.insert(ptaPolicyAcknowledgementsTable).values({
    schoolId: u.schoolId, userId: u.userId, policyVersion: OPERATING_STRUCTURE_VERSION, actionType: "adopted",
  });
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_charter_adopted", actor: u, targetType: "school", targetId: u.schoolId, details: { version: OPERATING_STRUCTURE_VERSION }, req });
  res.json({ claimedAt });
});

// POST /pta/charter/acknowledge — an appointed officer records their own
// acknowledgement of the charter. Idempotent per (user, version). Does NOT
// change ptaClaimedAt.
router.post("/pta/charter/acknowledge", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const [existing] = await db.select({ id: ptaPolicyAcknowledgementsTable.id })
    .from(ptaPolicyAcknowledgementsTable)
    .where(and(
      eq(ptaPolicyAcknowledgementsTable.schoolId, u.schoolId),
      eq(ptaPolicyAcknowledgementsTable.userId, u.userId),
      eq(ptaPolicyAcknowledgementsTable.policyVersion, OPERATING_STRUCTURE_VERSION),
      eq(ptaPolicyAcknowledgementsTable.actionType, "acknowledged"),
    ));
  if (!existing) {
    await db.insert(ptaPolicyAcknowledgementsTable).values({
      schoolId: u.schoolId, userId: u.userId, policyVersion: OPERATING_STRUCTURE_VERSION, actionType: "acknowledged",
    });
    await writeAudit({ schoolId: u.schoolId, eventType: "pta_charter_acknowledged", actor: u, targetType: "school", targetId: u.schoolId, details: {}, req });
  }
  res.json({ ok: true });
});
```
(Consolidate the drizzle import line — `and, eq, desc, sql, isNull` — and the auth import — `authMiddleware, requireRole, type JwtPayload`.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/ptaCharter.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/ptaCharter.ts src/__tests__/ptaCharter.test.ts
git commit -m "feat(pta): charter adopt (admin, sets ptaClaimedAt) + officer acknowledge"
```

---

### Task 4: OpenAPI + hooks

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the paths**

Insert before `components:` (two-space indent), tag `pta`:
```yaml
  /pta/charter:
    get:
      operationId: getPtaCharter
      tags: [pta]
      summary: Operating-structure charter content + claim status (authed)
      responses:
        "200":
          description: Charter
          content:
            application/json:
              schema:
                type: object
                required: [version, title, sections, claimed, officers, acknowledgements]
                properties:
                  version: { type: string }
                  title: { type: string }
                  sections:
                    type: array
                    items:
                      type: object
                      required: [heading, body]
                      properties: { heading: { type: string }, body: { type: string } }
                  claimed: { type: boolean }
                  claimedAt: { type: string }
                  officers:
                    type: array
                    items:
                      type: object
                      properties: { role: { type: string }, domain: { type: string }, name: { type: string } }
                  acknowledgements:
                    type: array
                    items:
                      type: object
                      properties: { name: { type: string }, actionType: { type: string }, createdAt: { type: string } }
        "401": { description: Unauthorized }
  /pta/charter/adopt:
    post:
      operationId: adoptPtaCharter
      tags: [pta]
      summary: Admin adopts the operating structure, claiming the PTA
      responses:
        "200":
          description: Claimed
          content:
            application/json:
              schema: { type: object, properties: { claimedAt: { type: string } } }
        "403": { description: Forbidden }
  /pta/charter/acknowledge:
    post:
      operationId: acknowledgePtaCharter
      tags: [pta]
      summary: An officer acknowledges the charter
      responses:
        "200":
          description: Acknowledged
          content:
            application/json:
              schema: { type: object, properties: { ok: { type: boolean } } }
```
(The `pta` tag already exists — don't duplicate it.)

- [ ] **Step 2: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: generates `useGetPtaCharter`, `useAdoptPtaCharter`, `useAcknowledgePtaCharter`. Confirm + report their exact shapes:
```bash
grep -rn "useGetPtaCharter\|useAdoptPtaCharter\|useAcknowledgePtaCharter" lib/api-client-react/src/generated/api.ts | head
```

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec lib/api-client-react
git commit -m "feat(api-spec): pta charter endpoints + hooks"
```

---

### Task 5: Charter page + officer-role dropdown + nav

**Files:**
- Create: `artifacts/safeschool/src/pages/pta-charter.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`
- Modify: `artifacts/safeschool/src/pages/pta-governance.tsx`
- Modify: `artifacts/safeschool/src/components/layout/nav-config.tsx`

- [ ] **Step 1: Write the charter page**

Create `artifacts/safeschool/src/pages/pta-charter.tsx`. Renders the structure + status + acknowledgement roster; admin (role pta) sees "Adopt"; everyone authed sees "I acknowledge". Use the generated hooks with their real shapes (confirm from Task 4 — `useGetPtaCharter()` query, `useAdoptPtaCharter()` / `useAcknowledgePtaCharter()` mutations, likely called `mutateAsync()` with no args or `{}`):
```tsx
import { useGetPtaCharter, useAdoptPtaCharter, useAcknowledgePtaCharter } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PtaCharterPage() {
  const q = useGetPtaCharter();
  const adopt = useAdoptPtaCharter();
  const ack = useAcknowledgePtaCharter();
  const { user } = useAuth();
  const data = q.data as any;
  const isAdmin = user?.role === "pta";

  const onAdopt = async () => { await adopt.mutateAsync(); await q.refetch(); };
  const onAck = async () => { await ack.mutateAsync(); await q.refetch(); };

  if (q.isLoading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!data) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="font-display text-2xl font-bold">Charter unavailable</h1></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        eyebrow="Morna Vibes"
        title={data.title}
        subtitle={data.claimed ? `Adopted ${new Date(data.claimedAt).toLocaleDateString()}` : "Forming — not yet adopted"}
        action={
          isAdmin && !data.claimed
            ? <Button onClick={onAdopt} isLoading={adopt.isPending}>Adopt the operating structure</Button>
            : !data.claimed
              ? <Button variant="outline" onClick={onAck} isLoading={ack.isPending}>I acknowledge</Button>
              : undefined
        }
      />
      {data.sections.map((s: any) => (
        <Card key={s.heading}>
          <CardHeader><CardTitle className="text-base">{s.heading}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
        </Card>
      ))}
      {data.officers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Officers</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.officers.map((o: any, i: number) => (
              <div key={i} className="flex justify-between"><span className="text-foreground">{o.name}</span><span className="text-muted-foreground capitalize">{String(o.role).replace(/_/g, " ")}</span></div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.acknowledgements?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Adopted &amp; acknowledged by</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.acknowledgements.map((a: any, i: number) => (
              <div key={i} className="flex justify-between"><span className="text-foreground">{a.name}</span><span className="text-muted-foreground">{a.actionType}</span></div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```
VERIFY the generated hook call shapes (Task 4 output). If a mutation requires `mutateAsync({})` or an argument, adjust. Confirm `useAuth().user.role` exists (it does — used across the app).

- [ ] **Step 2: Route it** in `App.tsx` (authed; members + exec may view):
```tsx
import PtaCharterPage from "@/pages/pta-charter";
<Route path="/pta/charter">{() => <ProtectedRoute component={PtaCharterPage} allowedRoles={["parent", "pta", "coordinator", "head_teacher"]} />}</Route>
```

- [ ] **Step 3: Add the two officer roles to the appointment dropdown**

In `artifacts/safeschool/src/pages/pta-governance.tsx`, find the officer-role `<select>` (the options list for appointing an officer — it lists chair/vice_chair/secretary/treasurer/domain_lead). Add `president` and `vice_president` options at the top so they read first:
```tsx
<option value="president">President</option>
<option value="vice_president">Vice President</option>
```
(Match the existing option markup. If the options are generated from a constant/array in the page, add the two values there instead.)

- [ ] **Step 4: Add a PTA nav item**

In `artifacts/safeschool/src/components/layout/nav-config.tsx`, in the PTA section (role === "pta"), add a "Charter" entry pointing to `/pta/charter` (mirror an existing item's shape, pick a sensible icon already imported there, e.g. a document/scroll icon).

- [ ] **Step 5: Build (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
```
Expected: `✓ built`, no type errors. Fix to match real hook/component APIs and rebuild.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/pages/pta-charter.tsx artifacts/safeschool/src/App.tsx artifacts/safeschool/src/pages/pta-governance.tsx artifacts/safeschool/src/components/layout/nav-config.tsx
git commit -m "feat(pta): charter page + president/VP appointment options + nav"
```

---

### Task 6: Full sweep + commit/push decision

- [ ] **Step 1: Full api-server test sweep**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run
```
Expected: all suites PASS (M1/M2/A + the new ptaCharter tests).

- [ ] **Step 2: Production rollout (Tom-gated — DO NOT push without confirmation)**

B1 adds one column (`schools.pta_claimed_at`) to prod and deploys new routes. Rollout, in order:
1. Apply the column in the Railway Data SQL box: `ALTER TABLE schools ADD COLUMN IF NOT EXISTS pta_claimed_at timestamptz;`
2. Push `feat/unified-app` → Railway auto-deploys.
3. Smoke: `curl -s -o /dev/null -w "%{http_code}" https://safe-skoolz-production.up.railway.app/api/pta/charter` → expect `401` (authed route deployed). Tom signs off the charter wording before adopting; the admin "Adopt" happens in-app when ready.

Confirm with Tom before pushing (outward-facing deploy). Stop here for the human checkpoint.

---

## Self-review checklist (run after drafting — done)

- **Spec coverage (B1):** officer roles president/VP ✓ (T1, T5); `schools.ptaClaimedAt` ✓ (T1); reuse `pta_policy_acknowledgements` (operating-structure-v1) ✓ (T2/T3); `GET /pta/charter` (content + claim + officers + acks) ✓ (T2); admin-adopt sets claim, idempotent, audited ✓ (T3); officer acknowledge, idempotent ✓ (T3); charter page + adopt/acknowledge actions ✓ (T5); officer dropdown + nav ✓ (T5); charter content as a server constant for Tom's sign-off ✓ (T2). Admin = role pta/MANAGE, no new role ✓ (T3 adopt guard = MANAGE). Member-shell "claimed" line = deferred (spec §6 optional), not built.
- **Placeholders:** none — full code for every backend task + the charter page; charter copy is real draft flagged for Tom's review (content gate, not a code gap).
- **Type consistency:** `OPERATING_STRUCTURE_VERSION` ("operating-structure-v1") used identically across the content module, GET filter, adopt insert, and acknowledge insert (T2/T3); `actionType` values "adopted"/"acknowledged" match between the inserts and the test assertions (T3); `ptaClaimedAt`/`pta_claimed_at` naming consistent (Drizzle camel ↔ SQL snake) (T1/T2/T3); hook names `useGetPtaCharter`/`useAdoptPtaCharter`/`useAcknowledgePtaCharter` match operationIds (T4) and their use in the page (T5); adopt guard MANAGE (`requireRole("pta")`) matches the "admin" decision.
- **Atomicity:** adopt uses a compare-and-set `UPDATE ... WHERE pta_claimed_at IS NULL` so concurrent adopts can't double-claim/double-record (mirrors the A results-release fix).

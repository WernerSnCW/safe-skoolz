# Morna M2 — Membership, Anonymity & Results Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land milestone M2 of the Morna community diagnostic — an exec membership-approval queue with an anonymity choice, anonymity rendering wherever member names show to other parents, exec-controlled results release with participant notifications, and a privacy-safe results view (per-question distributions, year-group segmentation with n≥5 suppression, exec-only shuffled free-text), plus a community-mode home for parents with no linked pupils.

**Architecture:** Extends the existing app in place (spec `docs/superpowers/specs/2026-06-11-morna-ready-design.md`, milestone M2 = §3 stages 5–6, §4.1–4.2). M1 already shipped the public diagnostic, unlinkable answer storage, and the `membershipStatus`/`displayMode`/`releasedAt` columns — **so M2 adds NO new schema**, only API endpoints + UI. New exec/member endpoints reuse the established `authMiddleware` + `requireRole` guards, `writeAudit` audit trail, the `notifications` table, and `sendEmail`. Results are read only through an authenticated endpoint (seeing results requires signing up, per the funnel); free-text and pre-release access are exec-only. Answers stay unlinkable: aggregation reads `diagnostic_answers` + `diagnostic_response_meta` (joined on `responseId`), never the email-bearing submission row.

**Tech Stack:** Express + Drizzle + Postgres (existing monorepo), vitest (boot `app.listen(0)`, raw `pool` seeding, `fetch`, `signToken` for auth), React + wouter + orval-generated react-query hooks (`@workspace/api-client-react`), Resend for email.

**Conventions to follow (proven in this repo — same as the M0+M1 plan):**
- Build vertical for new endpoints: router (register in `routes/index.ts`) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page + route in `App.tsx`.
- Authed endpoints: `router.get("/path", authMiddleware, requireRole("pta", "coordinator", "head_teacher"), handler)`; read the caller via `const u = (req as any).user as JwtPayload` → `{ userId, schoolId, role, email? }`. There are **no `security:` blocks** in `openapi.yaml`; auth is enforced at the Express layer and the orval custom-fetch attaches the bearer token automatically — add authed paths without a `security` block (matches every existing authed endpoint).
- `pnpm typecheck` fails on PRE-EXISTING issues — verify per-layer with the package build and the test files, not repo-wide typecheck.
- Front-end build wipes `dist/public` → re-add `_worker.js` after every build (matters only for the demo Pages deploy, not prod).
- Tests are self-contained: they INSERT their own school/survey/user rows, mint their own JWTs with `signToken`, and clean up in `afterAll`. Clear the rate-limit bucket (`DELETE FROM rate_limit_buckets WHERE key LIKE 'cdiag:%'`) only if the test exercises the submit limiter.
- "Exec" at Morna = a user with `role` in `{pta, coordinator, head_teacher}` **at the survey's school**. `requireRole` checks only the role, so every endpoint that loads a record by global slug MUST additionally assert `u.schoolId === survey.schoolId`.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `artifacts/api-server/src/lib/memberDisplay.ts` | `isExecRole(role)` + `memberDisplayName(user, viewerIsExec)` — the single source of the anonymity rule | Create |
| `artifacts/api-server/src/routes/membership.ts` | Exec approval queue: list pending, approve (+ anonymity choice), reject | Create |
| `artifacts/api-server/src/routes/communityDiagnostic.ts` | Add exec results-release + authed results-aggregation endpoints | Modify |
| `artifacts/api-server/src/routes/voiceGroups.ts` | Apply anonymity to the names returned by `/voice/:id` and `/voice/:id/public` | Modify |
| `artifacts/api-server/src/routes/index.ts` | Register the membership router | Modify |
| `artifacts/api-server/src/__tests__/membership.test.ts` | Tests for the approval API | Create |
| `artifacts/api-server/src/__tests__/diagnosticResults.test.ts` | Tests for release + aggregation | Create |
| `artifacts/api-server/src/__tests__/voiceAnonymity.test.ts` | Tests for anonymity rendering | Create |
| `lib/api-spec/openapi.yaml` | 5 new endpoints → generated hooks | Modify |
| `artifacts/safeschool/src/pages/diagnostic-results.tsx` | Results view (participant + exec) | Create |
| `artifacts/safeschool/src/pages/membership-queue.tsx` | Exec approval queue UI + anonymity choice | Create |
| `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx` | Community-mode branch (no linked pupils) | Modify |
| `artifacts/safeschool/src/App.tsx` | Routes for the two new pages | Modify |

---

### Task 1: The anonymity rule — a shared display helper (TDD)

The single place that decides whether a member's real name or "A parent" is shown. Used by the VOICE endpoints (Task 3) and the exec/results checks (Tasks 2, 4).

**Files:**
- Create: `artifacts/api-server/src/lib/memberDisplay.ts`
- Test: `artifacts/api-server/src/__tests__/memberDisplay.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/memberDisplay.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";

describe("isExecRole", () => {
  it("is true for pta, coordinator, head_teacher and false otherwise", () => {
    expect(isExecRole("pta")).toBe(true);
    expect(isExecRole("coordinator")).toBe(true);
    expect(isExecRole("head_teacher")).toBe(true);
    expect(isExecRole("parent")).toBe(false);
    expect(isExecRole("pupil")).toBe(false);
  });
});

describe("memberDisplayName", () => {
  const named = { firstName: "Ada", lastName: "Lovelace", displayMode: "named" };
  const anon = { firstName: "Ada", lastName: "Lovelace", displayMode: "anonymous" };

  it("shows the real name to an exec viewer regardless of displayMode", () => {
    expect(memberDisplayName(anon, true)).toBe("Ada Lovelace");
    expect(memberDisplayName(named, true)).toBe("Ada Lovelace");
  });

  it("hides an anonymous member's name from a non-exec viewer", () => {
    expect(memberDisplayName(anon, false)).toBe("A parent");
  });

  it("shows a named member's name to a non-exec viewer", () => {
    expect(memberDisplayName(named, false)).toBe("Ada Lovelace");
  });

  it("falls back to 'A parent' when no name is present", () => {
    expect(memberDisplayName({ firstName: "", lastName: "", displayMode: "named" }, false)).toBe("A parent");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && pnpm exec vitest run src/__tests__/memberDisplay.test.ts
```
Expected: FAIL — "Cannot find module '../lib/memberDisplay'".

- [ ] **Step 3: Implement the helper**

Create `artifacts/api-server/src/lib/memberDisplay.ts`:

```ts
// The single source of the membership anonymity rule (spec §4.1).
// Anonymous members render as "A parent" to other parents; execs (and admins)
// always see the real name. One helper so the rule can never drift between
// the VOICE surfaces, the member lists, and any future member-facing list.

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

/** True when the role is an exec/admin role that always sees real names. */
export function isExecRole(role: string | null | undefined): boolean {
  return role != null && EXEC_ROLES.has(role);
}

/** Resolve the name to show for a member given who is looking. */
export function memberDisplayName(
  member: { firstName?: string | null; lastName?: string | null; displayMode?: string | null },
  viewerIsExec: boolean,
): string {
  if (!viewerIsExec && member.displayMode === "anonymous") return "A parent";
  const real = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return real || "A parent";
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/memberDisplay.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/memberDisplay.ts src/__tests__/memberDisplay.test.ts
git commit -m "feat(membership): shared anonymity display helper (isExecRole, memberDisplayName)"
```

---

### Task 2: Membership approval API (TDD)

Spec §3 stage 5 / §4.1. Diagnostic signups land as `role=parent`, `membershipStatus=pending` (M1 already creates them that way). An exec lists them, approves (choosing the member's anonymity mode) or rejects. Approval is audited and notifies the member (in-app + email).

**Files:**
- Create: `artifacts/api-server/src/routes/membership.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/__tests__/membership.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/membership.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let execToken: string;
let pendingUserId: string;

const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Mbr Test School', 'mbr-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'pta', 'Ex', 'Ec', $2, true, 'approved') RETURNING id`,
    [schoolId, `mbr-exec-${stamp}@example.com`],
  );
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta", email: `mbr-exec-${stamp}@example.com` });

  const pending = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'parent', 'Pat', 'Pending', $2, true, 'pending') RETURNING id`,
    [schoolId, `mbr-pending-${stamp}@example.com`],
  );
  pendingUserId = pending.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM notifications WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("GET /api/membership/pending", () => {
  it("requires auth", async () => {
    const r = await fetch(`${baseUrl}/api/membership/pending`);
    expect(r.status).toBe(401);
  });

  it("lists pending members for an exec", async () => {
    const r = await fetch(`${baseUrl}/api/membership/pending`, { headers: auth(execToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.members)).toBe(true);
    const ids = body.members.map((m: any) => m.id);
    expect(ids).toContain(pendingUserId);
    // never leak a password hash etc.
    expect(body.members[0].passwordHash).toBeUndefined();
  });
});

describe("POST /api/membership/:userId/approve", () => {
  it("approves and records the anonymity choice, notifies, and audits", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(execToken), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "anonymous" }),
    });
    expect(r.status).toBe(200);

    const u = await pool.query(`SELECT membership_status, display_mode FROM users WHERE id = $1`, [pendingUserId]);
    expect(u.rows[0].membership_status).toBe("approved");
    expect(u.rows[0].display_mode).toBe("anonymous");

    const n = await pool.query(`SELECT * FROM notifications WHERE recipient_id = $1 AND trigger = 'membership_approved'`, [pendingUserId]);
    expect(n.rows).toHaveLength(1);

    const a = await pool.query(`SELECT * FROM audit_log WHERE event_type = 'membership_approved' AND target_id = $1`, [pendingUserId]);
    expect(a.rows).toHaveLength(1);
  });

  it("404s for a user at another school", async () => {
    const other = signToken({ userId: pendingUserId, schoolId: "00000000-0000-0000-0000-000000000000", role: "pta" });
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(other), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(404);
  });

  it("403s for a non-exec caller", async () => {
    const parentTok = signToken({ userId: pendingUserId, schoolId, role: "parent" });
    const r = await fetch(`${baseUrl}/api/membership/${pendingUserId}/approve`, {
      method: "POST",
      headers: { ...auth(parentTok), "Content-Type": "application/json" },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(403);
  });
});

describe("POST /api/membership/:userId/reject", () => {
  it("marks the member rejected and audits", async () => {
    const rej = await pool.query<{ id: string }>(
      `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
       VALUES ($1, 'parent', 'Rex', 'Reject', $2, true, 'pending') RETURNING id`,
      [schoolId, `mbr-reject-${stamp}@example.com`],
    );
    const r = await fetch(`${baseUrl}/api/membership/${rej.rows[0].id}/reject`, {
      method: "POST",
      headers: auth(execToken),
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id = $1`, [rej.rows[0].id]);
    expect(u.rows[0].membership_status).toBe("rejected");
    const a = await pool.query(`SELECT * FROM audit_log WHERE event_type = 'membership_rejected' AND target_id = $1`, [rej.rows[0].id]);
    expect(a.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/membership.test.ts
```
Expected: FAIL — all 401/404 (route not registered).

- [ ] **Step 3: Implement the router**

Create `artifacts/api-server/src/routes/membership.ts`:

```ts
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { sendEmail } from "../lib/emailHelper";

const router: IRouter = Router();

// Exec roles that manage membership (spec §4.1). At Morna only `pta` exists,
// but coordinator/head_teacher are included so school staff can manage it later.
const EXEC = requireRole("pta", "coordinator", "head_teacher");

// GET /api/membership/pending — exec sees parents awaiting approval at their school.
router.get("/membership/pending", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const rows = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(eq(usersTable.schoolId, u.schoolId), eq(usersTable.membershipStatus, "pending")))
    .orderBy(usersTable.createdAt);
  res.json({ members: rows });
});

// POST /api/membership/:userId/approve — approve + record the anonymity choice.
router.post("/membership/:userId/approve", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;
  const displayMode = req.body?.displayMode === "anonymous" ? "anonymous" : "named";

  const [target] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ membershipStatus: "approved", displayMode })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id, membershipStatus: usersTable.membershipStatus, displayMode: usersTable.displayMode });

  await db.insert(notificationsTable).values({
    schoolId: u.schoolId,
    recipientId: userId,
    trigger: "membership_approved",
    channel: "in_app",
    subject: "Your community membership is approved",
    body: "You can now see results when they're released and back the parent community.",
  });

  // Fire-and-forget email — a failed email never fails the approval.
  void sendEmail({
    to: target.email!,
    toName: target.firstName ?? "there",
    subject: "Your community membership is approved",
    bodyText:
      `Hi ${target.firstName ?? "there"},\n\n` +
      `Your membership has been approved. When the results are released you'll be able to see them, ` +
      `and you can now back the parent community.\n\n` +
      `${process.env.APP_URL ?? "http://localhost:5000"}\n`,
    trigger: "membership_approved",
    recipientId: userId,
    schoolId: u.schoolId,
  }).catch(() => {});

  await writeAudit({
    schoolId: u.schoolId,
    eventType: "membership_approved",
    actor: u,
    targetType: "user",
    targetId: userId,
    details: { displayMode },
    req,
  });

  res.json({ member: updated });
});

// POST /api/membership/:userId/reject — decline a pending member.
router.post("/membership/:userId/reject", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;

  const [target] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await db.update(usersTable).set({ membershipStatus: "rejected" }).where(eq(usersTable.id, userId));

  await writeAudit({
    schoolId: u.schoolId,
    eventType: "membership_rejected",
    actor: u,
    targetType: "user",
    targetId: userId,
    details: {},
    req,
  });

  res.json({ ok: true });
});

export default router;
```

Register in `artifacts/api-server/src/routes/index.ts` next to the other routers (mirror how `communityDiagnosticRouter` is imported and `router.use(...)`-ed):

```ts
import membershipRouter from "./membership";
// ...alongside the other router.use(...) calls:
router.use(membershipRouter);
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/membership.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/membership.ts src/routes/index.ts src/__tests__/membership.test.ts
git commit -m "feat(membership): exec approval queue — list pending, approve with anonymity choice, reject"
```

---

### Task 3: Anonymity on the VOICE surfaces (TDD)

Spec §4.1: wherever member names render to other parents, an anonymous member shows as "A parent"; execs always see real names. The VOICE public page (`startedBy`) and the authed VOICE detail (`createdBy` + member list) are those surfaces today. This is a **backend-only** change — the resolved string is returned ready-to-render, so the existing front-end needs no edit.

**Files:**
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts`
- Test: `artifacts/api-server/src/__tests__/voiceAnonymity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/voiceAnonymity.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let voiceId: string;
let parentToken: string;
let execToken: string;

const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Anon Test School', 'anon-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;

  // Founder chose anonymous.
  const founder = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status, display_mode)
     VALUES ($1, 'parent', 'Fiona', 'Founder', $2, true, 'approved', 'anonymous') RETURNING id`,
    [schoolId, `anon-founder-${stamp}@example.com`],
  );
  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'pta', 'Eve', 'Exec', $2, true, 'approved') RETURNING id`,
    [schoolId, `anon-exec-${stamp}@example.com`],
  );
  const parent = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1, 'parent', 'Otto', 'Other', $2, true, 'approved') RETURNING id`,
    [schoolId, `anon-parent-${stamp}@example.com`],
  );
  parentToken = signToken({ userId: parent.rows[0].id, schoolId, role: "parent" });
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta" });

  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id)
     VALUES ($1, 'Test VOICE', 'A mission', 'advocating', $2) RETURNING id`,
    [schoolId, founder.rows[0].id],
  );
  voiceId = v.rows[0].id;
  await pool.query(
    `INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1, $2, 'founder')`,
    [voiceId, founder.rows[0].id],
  );

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

describe("VOICE anonymity", () => {
  it("public page hides an anonymous founder's name", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}/public`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.startedBy).toBe("A parent");
  });

  it("a non-exec parent sees the anonymous founder as 'A parent' in detail", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}`, { headers: { Authorization: `Bearer ${parentToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.voice.createdBy).toBe("A parent");
    expect(body.voice.members[0].name).toBe("A parent");
  });

  it("an exec sees the real founder name in detail", async () => {
    const r = await fetch(`${baseUrl}/api/voice/${voiceId}`, { headers: { Authorization: `Bearer ${execToken}` } });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.voice.createdBy).toBe("Fiona Founder");
    expect(body.voice.members[0].name).toBe("Fiona Founder");
  });
});
```

> Note: confirm the `voice_groups` / `voice_members` column names used in the INSERTs (`created_by_id`, `voice_id`, `role`) match the live schema — adjust the seed SQL if the live columns differ. The handler code references `voiceGroupsTable.createdById`, `voiceMembersTable.voiceId`, `voiceMembersTable.role`, so the snake_case forms above should match.

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/voiceAnonymity.test.ts
```
Expected: FAIL — `startedBy`/`createdBy` come back as "Fiona Founder" (no anonymity yet).

- [ ] **Step 3: Apply the helper in `voiceGroups.ts`**

Add the import at the top of the file (next to the other lib imports):

```ts
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";
```

In `GET /voice/:id` (the authed detail handler), add the creator's `displayMode` to the group select and the member's `displayMode` to the members select:

In the `.select({...})` for `groups` (currently ending with `createdByLast: usersTable.lastName,`), add:
```ts
      createdByDisplayMode: usersTable.displayMode,
```
In the `.select({...})` for `members` (currently ending with `lastName: usersTable.lastName,`), add:
```ts
      displayMode: usersTable.displayMode,
```
Then, inside the handler before building the response, compute the viewer's exec status and replace the two name expressions:
```ts
  const viewerIsExec = isExecRole(u.role);
```
Change `createdBy: \`${g.createdByFirst} ${g.createdByLast}\`.trim(),` to:
```ts
      createdBy: memberDisplayName(
        { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
        viewerIsExec,
      ),
```
Change the member map's `name: \`${m.firstName} ${m.lastName}\`.trim(),` to:
```ts
        name: memberDisplayName(
          { firstName: m.firstName, lastName: m.lastName, displayMode: m.displayMode },
          viewerIsExec,
        ),
```

In `GET /voice/:id/public` (no auth — viewer is always a non-exec outsider), add `createdByDisplayMode: usersTable.displayMode,` to the `.select({...})` (after `createdByLast`), then change `startedBy: \`${g.createdByFirst} ${g.createdByLast}\`.trim(),` to:
```ts
    startedBy: memberDisplayName(
      { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
      false,
    ),
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/voiceAnonymity.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Run the existing VOICE tests to confirm no regression**

```bash
pnpm exec vitest run src/__tests__/voiceGroups.test.ts
```
Expected: PASS (default `display_mode` is `named`, so existing assertions on real names are unaffected). If there is no such file, skip this step.

- [ ] **Step 6: Commit**

```bash
git add src/routes/voiceGroups.ts src/__tests__/voiceAnonymity.test.ts
git commit -m "feat(voice): render anonymous members as 'A parent' to non-execs"
```

---

### Task 4: Results release + aggregation API (TDD)

Spec §4.2 + §3 stages 5–6. Two authed endpoints added to `communityDiagnostic.ts`:
- `POST /api/d/:slug/release` — exec sets `releasedAt` (idempotent) and notifies every participant who has an account.
- `GET /api/d/:slug/results` — requires login (seeing results requires signing up). Non-execs get aggregates only after release; execs get aggregates any time **plus** the shuffled free-text. Year-group segments render only at n≥5; thinner slices still feed the overall distribution but are never shown alone.

**Files:**
- Modify: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Test: `artifacts/api-server/src/__tests__/diagnosticResults.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/diagnosticResults.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
let execToken: string;
let parentToken: string;

const stamp = Date.now();
const INSTRUMENT = [
  { key: "q_scale", section: "S1", text: "Scale?", type: "scale", options: ["No", "Sometimes", "Yes"] },
  { key: "q_open", section: "S2", text: "Open?", type: "text", optional: true },
];

// Seed N responses (answers + meta) directly, bypassing the submit route, so we
// control year-group sizes for the suppression test. Each response = one random
// responseId shared by its answer rows (mirrors production unlinkable storage).
async function seedResponse(answerIdx: number, yearGroup: string | null, freeText?: string) {
  const { rows } = await pool.query<{ rid: string }>(`SELECT gen_random_uuid() AS rid`);
  const rid = rows[0].rid;
  await pool.query(
    `INSERT INTO diagnostic_answers (survey_id, response_id, question_key, answer) VALUES ($1, $2, 'q_scale', $3)`,
    [surveyId, rid, answerIdx],
  );
  if (freeText) {
    await pool.query(
      `INSERT INTO diagnostic_answers (survey_id, response_id, question_key, free_text) VALUES ($1, $2, 'q_open', $3)`,
      [surveyId, rid, freeText],
    );
  }
  if (yearGroup) {
    await pool.query(
      `INSERT INTO diagnostic_response_meta (survey_id, response_id, year_group) VALUES ($1, $2, $3)`,
      [surveyId, rid, yearGroup],
    );
  }
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Res Test School', 'res-test-${stamp}') RETURNING id`,
  );
  schoolId = sch.rows[0].id;
  const exec = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'Res', 'Exec', $2, true) RETURNING id`,
    [schoolId, `res-exec-${stamp}@example.com`],
  );
  execToken = signToken({ userId: exec.rows[0].id, schoolId, role: "pta" });
  const parent = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'parent', 'Res', 'Parent', $2, true) RETURNING id`,
    [schoolId, `res-parent-${stamp}@example.com`],
  );
  parentToken = signToken({ userId: parent.rows[0].id, schoolId, role: "parent" });
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, created_by, public_slug, instrument)
     VALUES ($1, 'Res Survey', 'active', $2, 'res-test-${stamp}', $3) RETURNING id`,
    [schoolId, exec.rows[0].id, JSON.stringify(INSTRUMENT)],
  );
  surveyId = svy.rows[0].id;

  // Y4 gets 5 responses (>= threshold → shown as a segment). Y5 gets 2 (< threshold → suppressed).
  for (let i = 0; i < 5; i++) await seedResponse(2, "Y4", i === 0 ? "Y4 says hi" : undefined); // answer "Yes"
  for (let i = 0; i < 2; i++) await seedResponse(0, "Y5"); // answer "No"
  // One submission row so a participant exists for the release notification.
  await pool.query(
    `INSERT INTO diagnostic_submissions (survey_id, email, email_hash) VALUES ($1, $2, $3)`,
    [surveyId, `res-parent-${stamp}@example.com`, `hash-${stamp}`],
  );

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_response_meta WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM diagnostic_surveys WHERE id = $1`, [surveyId]); } catch {}
  try { await pool.query(`DELETE FROM notifications WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("GET /api/d/:slug/results", () => {
  it("requires auth", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`);
    expect(r.status).toBe(401);
  });

  it("locks results for a non-exec until released", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(parentToken) });
    expect(r.status).toBe(403);
  });

  it("lets an exec see results before release, with suppression and shuffled free-text", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(execToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.totalResponses).toBe(7);
    const q = body.questions.find((x: any) => x.key === "q_scale");
    expect(q.distribution).toEqual([2, 0, 5]); // 2× "No" (Y5), 5× "Yes" (Y4)
    const segYears = q.segments.map((s: any) => s.yearGroup);
    expect(segYears).toContain("Y4");      // n = 5, shown
    expect(segYears).not.toContain("Y5");  // n = 2, suppressed
    expect(Array.isArray(body.freeText)).toBe(true);
    expect(body.freeText.length).toBe(1);
  });
});

describe("POST /api/d/:slug/release", () => {
  it("403s for a non-exec", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(parentToken) });
    expect(r.status).toBe(403);
  });

  it("releases for an exec, notifies participants, and is idempotent", async () => {
    const r1 = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(execToken) });
    expect(r1.status).toBe(200);
    const b1 = await r1.json();
    expect(b1.released).toBe(true);
    expect(b1.releasedAt).toBeTruthy();

    const n = await pool.query(`SELECT * FROM notifications WHERE school_id = $1 AND trigger = 'results_released'`, [schoolId]);
    expect(n.rows.length).toBeGreaterThanOrEqual(1);

    const r2 = await fetch(`${baseUrl}/api/d/res-test-${stamp}/release`, { method: "POST", headers: auth(execToken) });
    expect(r2.status).toBe(200); // idempotent — second call still 200
  });

  it("now lets a non-exec participant see released results (no free-text)", async () => {
    const r = await fetch(`${baseUrl}/api/d/res-test-${stamp}/results`, { headers: auth(parentToken) });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.released).toBe(true);
    expect(body.freeText).toBeUndefined(); // free-text is exec-only
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/diagnosticResults.test.ts
```
Expected: FAIL — 401/404 (routes not registered yet).

- [ ] **Step 3: Implement the two endpoints**

In `communityDiagnostic.ts`, extend the imports. Change the drizzle import line to add `inArray` and `isNull`:
```ts
import { sql, eq, and, isNotNull, isNull, inArray } from "drizzle-orm";
```
Add to the `@workspace/db` import block (after `passwordResetTokensTable,`):
```ts
  notificationsTable,
```
Add these imports below the existing ones:
```ts
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { isExecRole } from "../lib/memberDisplay";
import { writeAudit } from "../lib/auditHelper";
```

Add the constant near the top (after `const EMAIL_RE = ...`):
```ts
// A year-group (or any) segment is shown only when it has at least this many
// responses, so no individual's answers can be inferred from a thin slice (spec §4.2).
const SEGMENT_MIN = 5;
const EXEC = requireRole("pta", "coordinator", "head_teacher");
```

Insert the following **before** `export default router;`:

```ts
// Helper: load a public survey by slug or null.
async function loadSurveyBySlug(slug: string) {
  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.publicSlug, slug), isNotNull(diagnosticSurveysTable.publicSlug)));
  return survey ?? null;
}

// POST /d/:slug/release — exec releases results; notifies every participant who
// has an account. Idempotent: a second call returns the existing release.
router.post("/d/:slug/release", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const survey = await loadSurveyBySlug(slug);
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  // requireRole only checks the role — scope to this survey's school.
  if (u.schoolId !== survey.schoolId) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  if (survey.releasedAt != null) {
    res.json({ released: true, releasedAt: survey.releasedAt });
    return;
  }

  const releasedAt = new Date();
  await db.update(diagnosticSurveysTable).set({ releasedAt }).where(eq(diagnosticSurveysTable.id, survey.id));

  // Notify every participant who has an account (submission email → user at the
  // survey's school). Answers stay unlinkable; the submission email is kept for
  // exactly this notification (spec §4.2).
  const emailRows = await db
    .select({ email: diagnosticSubmissionsTable.email })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id))
    .groupBy(diagnosticSubmissionsTable.email);
  const emails = emailRows.map((r) => r.email);
  if (emails.length) {
    const participants = await db
      .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName })
      .from(usersTable)
      .where(and(eq(usersTable.schoolId, survey.schoolId), inArray(usersTable.email, emails)));
    if (participants.length) {
      await db.insert(notificationsTable).values(
        participants.map((p) => ({
          schoolId: survey.schoolId,
          recipientId: p.id,
          trigger: "results_released" as const,
          channel: "in_app" as const,
          subject: "The community diagnostic results are out",
          body: "The results you took part in have been released. Log in to see them.",
        })),
      );
      const appUrl = process.env.APP_URL ?? "http://localhost:5000";
      for (const p of participants) {
        void sendEmail({
          to: p.email!,
          toName: p.firstName ?? "there",
          subject: "The community diagnostic results are out",
          bodyText:
            `Hi ${p.firstName ?? "there"},\n\n` +
            `The results of the community diagnostic you took part in have been released.\n\n` +
            `See them here: ${appUrl}/results/${slug}\n`,
          trigger: "results_released",
          recipientId: p.id,
          schoolId: survey.schoolId,
        }).catch(() => {});
      }
    }
  }

  await writeAudit({
    schoolId: survey.schoolId,
    eventType: "results_released",
    actor: u,
    targetType: "diagnostic_survey",
    targetId: survey.id,
    details: { participantsNotified: emails.length },
    req,
  });

  res.json({ released: true, releasedAt });
});

// GET /d/:slug/results — authed. Seeing results requires signing up. Non-execs
// only after release and without free-text; execs any time + shuffled free-text.
router.get("/d/:slug/results", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const survey = await loadSurveyBySlug(slug);
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (u.schoolId !== survey.schoolId) {
    res.status(403).json({ error: "Not your school's results" });
    return;
  }
  const isExec = isExecRole(u.role);
  if (!isExec && survey.releasedAt == null) {
    res.status(403).json({ error: "Results haven't been released yet.", released: false });
    return;
  }

  const instrument = (survey.instrument ?? []) as Array<{
    key: string; section: string; text: string; type: string; options?: string[];
  }>;
  const scaleQs = instrument.filter((q) => q.type === "scale");

  // Per-answer rows joined to each response's optional year group. answer is
  // NOT NULL filter keeps text rows out.
  const answerRows = await db
    .select({
      questionKey: diagnosticAnswersTable.questionKey,
      answer: diagnosticAnswersTable.answer,
      yearGroup: diagnosticResponseMetaTable.yearGroup,
    })
    .from(diagnosticAnswersTable)
    .leftJoin(
      diagnosticResponseMetaTable,
      and(
        eq(diagnosticResponseMetaTable.surveyId, diagnosticAnswersTable.surveyId),
        eq(diagnosticResponseMetaTable.responseId, diagnosticAnswersTable.responseId),
      ),
    )
    .where(and(eq(diagnosticAnswersTable.surveyId, survey.id), isNotNull(diagnosticAnswersTable.answer)));

  // Respondents per year group (one meta row per response → count = distinct respondents).
  const segCounts = await db
    .select({ yearGroup: diagnosticResponseMetaTable.yearGroup, n: sql<number>`count(*)::int` })
    .from(diagnosticResponseMetaTable)
    .where(and(eq(diagnosticResponseMetaTable.surveyId, survey.id), isNotNull(diagnosticResponseMetaTable.yearGroup)))
    .groupBy(diagnosticResponseMetaTable.yearGroup);
  const eligibleYears = new Map(
    segCounts.filter((s) => s.yearGroup != null && s.n >= SEGMENT_MIN).map((s) => [s.yearGroup as string, s.n]),
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct ${diagnosticAnswersTable.responseId})::int` })
    .from(diagnosticAnswersTable)
    .where(eq(diagnosticAnswersTable.surveyId, survey.id));

  const questions = scaleQs.map((q) => {
    const optCount = q.options?.length ?? 0;
    const overall = new Array(optCount).fill(0);
    const segDist = new Map<string, number[]>();
    for (const yg of eligibleYears.keys()) segDist.set(yg, new Array(optCount).fill(0));
    for (const row of answerRows) {
      if (row.questionKey !== q.key || row.answer == null || row.answer < 0 || row.answer >= optCount) continue;
      overall[row.answer]++;
      if (row.yearGroup && eligibleYears.has(row.yearGroup)) segDist.get(row.yearGroup)![row.answer]++;
    }
    return {
      key: q.key,
      section: q.section,
      text: q.text,
      type: "scale",
      options: q.options ?? [],
      distribution: overall,
      segments: [...segDist.entries()].map(([yearGroup, distribution]) => ({
        yearGroup,
        n: eligibleYears.get(yearGroup)!,
        distribution,
      })),
    };
  });

  let freeText: { questionKey: string; text: string }[] | undefined;
  if (isExec) {
    const textRows = await db
      .select({ questionKey: diagnosticAnswersTable.questionKey, freeText: diagnosticAnswersTable.freeText })
      .from(diagnosticAnswersTable)
      .where(and(eq(diagnosticAnswersTable.surveyId, survey.id), isNotNull(diagnosticAnswersTable.freeText)));
    const arr = textRows.map((r) => ({ questionKey: r.questionKey, text: r.freeText as string }));
    // Fisher–Yates shuffle so free-text order can't be correlated to submission order.
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    freeText = arr;
  }

  res.json({
    title: survey.title,
    released: survey.releasedAt != null,
    releasedAt: survey.releasedAt,
    isExec,
    totalResponses: total,
    questions,
    ...(freeText ? { freeText } : {}),
  });
});
```

(`isNull` is imported for symmetry with future use; it is fine to leave it imported. If your linter is strict about unused imports, drop `isNull` from the import line.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/diagnosticResults.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/__tests__/diagnosticResults.test.ts
git commit -m "feat(diagnostic): exec results release (notify participants) + privacy-safe aggregation endpoint"
```

---

### Task 5: OpenAPI + generated hooks

Add the five new endpoints so the front-end gets typed react-query hooks. Authed endpoints follow the repo convention of **no `security:` block** (auth enforced server-side, token attached by the custom fetch).

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the paths**

Insert the following **immediately before the `components:` line** (it currently sits right after the `/d/{slug}/submit` block, around line 1768). Keep two-space indentation so they nest under `paths:`:

```yaml
  /membership/pending:
    get:
      operationId: listPendingMembers
      tags: [membership]
      summary: List members awaiting approval (exec)
      responses:
        "200":
          description: Pending members
          content:
            application/json:
              schema:
                type: object
                required: [members]
                properties:
                  members:
                    type: array
                    items:
                      type: object
                      required: [id, firstName, lastName, email]
                      properties:
                        id: { type: string }
                        firstName: { type: string }
                        lastName: { type: string }
                        email: { type: string }
                        createdAt: { type: string }
        "401": { description: Unauthorized }
        "403": { description: Forbidden }
  /membership/{userId}/approve:
    post:
      operationId: approveMember
      tags: [membership]
      summary: Approve a pending member and set their anonymity mode (exec)
      parameters:
        - { name: userId, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                displayMode: { type: string, enum: [named, anonymous] }
      responses:
        "200":
          description: Approved
          content:
            application/json:
              schema:
                type: object
                properties:
                  member: { type: object }
        "403": { description: Forbidden }
        "404": { description: Not found }
  /membership/{userId}/reject:
    post:
      operationId: rejectMember
      tags: [membership]
      summary: Reject a pending member (exec)
      parameters:
        - { name: userId, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Rejected
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
        "403": { description: Forbidden }
        "404": { description: Not found }
  /d/{slug}/release:
    post:
      operationId: releaseDiagnosticResults
      tags: [diagnostic]
      summary: Release diagnostic results and notify participants (exec)
      parameters:
        - { name: slug, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Released
          content:
            application/json:
              schema:
                type: object
                required: [released]
                properties:
                  released: { type: boolean }
                  releasedAt: { type: string }
        "403": { description: Forbidden }
        "404": { description: Not found }
  /d/{slug}/results:
    get:
      operationId: getDiagnosticResults
      tags: [diagnostic]
      summary: Aggregated diagnostic results (authed; exec sees free-text)
      parameters:
        - { name: slug, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Aggregated results
          content:
            application/json:
              schema:
                type: object
                required: [title, released, totalResponses, questions]
                properties:
                  title: { type: string }
                  released: { type: boolean }
                  releasedAt: { type: string }
                  isExec: { type: boolean }
                  totalResponses: { type: integer }
                  questions:
                    type: array
                    items:
                      type: object
                      required: [key, section, text, options, distribution, segments]
                      properties:
                        key: { type: string }
                        section: { type: string }
                        text: { type: string }
                        type: { type: string }
                        options: { type: array, items: { type: string } }
                        distribution: { type: array, items: { type: integer } }
                        segments:
                          type: array
                          items:
                            type: object
                            required: [yearGroup, n, distribution]
                            properties:
                              yearGroup: { type: string }
                              n: { type: integer }
                              distribution: { type: array, items: { type: integer } }
                  freeText:
                    type: array
                    items:
                      type: object
                      properties:
                        questionKey: { type: string }
                        text: { type: string }
        "401": { description: Unauthorized }
        "403": { description: Not released / not your school }
        "404": { description: Not found }
```

Add a `membership` entry to the top-level `tags:` list (around lines 9–31, next to `- name: diagnostic`):
```yaml
  - name: membership
```

- [ ] **Step 2: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: generates `useListPendingMembers`, `useApproveMember`, `useRejectMember`, `useReleaseDiagnosticResults`, `useGetDiagnosticResults`; no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec lib/api-client-react
git commit -m "feat(api-spec): membership + results-release/results endpoints and hooks"
```

---

### Task 6: Results page (frontend)

Spec §3 stages 5–6. Authed page at `/results/:slug`. Renders per-question distributions as labelled bars, a year-group segment toggle (only the n≥5 segments returned by the API), and — for execs — the shuffled free-text plus a "Release results" button when not yet released. Modelled on the public diagnostic page's plain-elements style (no framer enter-animations — the prod-blank gotcha).

**Files:**
- Create: `artifacts/safeschool/src/pages/diagnostic-results.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`

- [ ] **Step 1: Write the page**

Create `artifacts/safeschool/src/pages/diagnostic-results.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useGetDiagnosticResults, useReleaseDiagnosticResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

// Authed results view for a community diagnostic (/results/:slug). Seeing results
// requires signing up; the API locks non-exec access until the exec releases.

function DistributionBars({ options, counts }: { options: string[]; counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const n = counts[i] ?? 0;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={opt} className="flex items-center gap-3 text-sm">
            <div className="w-40 shrink-0 text-muted-foreground">{opt}</div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 shrink-0 text-right tabular-nums">{n} · {pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DiagnosticResultsPage({ slug }: { slug: string }) {
  const q = useGetDiagnosticResults(slug);
  const release = useReleaseDiagnosticResults();
  const [segByQuestion, setSegByQuestion] = useState<Record<string, string>>({});

  const data = q.data as any;
  const yearGroups = useMemo(() => {
    const set = new Set<string>();
    for (const question of data?.questions ?? []) {
      for (const s of question.segments ?? []) set.add(s.yearGroup);
    }
    return [...set].sort();
  }, [data]);

  if (q.isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading results…</div>;
  }
  if (q.isError || !data) {
    // 403 before release is the common case for a non-exec.
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Results aren't available yet</h1>
        <p className="mt-3 text-muted-foreground">
          You'll be notified the moment they're released. Thank you for taking part.
        </p>
      </div>
    );
  }

  const onRelease = async () => {
    await release.mutateAsync({ slug });
    await q.refetch();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Community diagnostic"
        title={data.title}
        subtitle={`${data.totalResponses} ${data.totalResponses === 1 ? "family has" : "families have"} taken part`}
        action={
          data.isExec && !data.released ? (
            <Button onClick={onRelease} isLoading={release.isPending}>Release results</Button>
          ) : undefined
        }
      />

      {data.isExec && !data.released && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          You're seeing these results as an exec before release. Releasing notifies every participant with an account.
        </div>
      )}

      {data.questions.map((question: any) => {
        const seg = segByQuestion[question.key] ?? "all";
        const segData = question.segments?.find((s: any) => s.yearGroup === seg);
        const counts = seg === "all" ? question.distribution : segData?.distribution ?? question.distribution;
        return (
          <Card key={question.key}>
            <CardHeader>
              <CardTitle className="text-base">{question.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {yearGroups.length > 0 && question.segments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {["all", ...question.segments.map((s: any) => s.yearGroup)].map((yg: string) => (
                    <button
                      key={yg}
                      type="button"
                      onClick={() => setSegByQuestion((p) => ({ ...p, [question.key]: yg }))}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors " +
                        (seg === yg
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40")
                      }
                    >
                      {yg === "all" ? "Everyone" : yg}
                    </button>
                  ))}
                </div>
              )}
              <DistributionBars options={question.options} counts={counts} />
            </CardContent>
          </Card>
        );
      })}

      {data.isExec && data.freeText && data.freeText.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In families' own words (exec only · shuffled)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.freeText.map((f: any, i: number) => (
              <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-sm text-foreground">
                {f.text}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Route it**

In `artifacts/safeschool/src/App.tsx`, import the page (matching how the other pages are imported) and add a protected route allowing members and exec. Place it next to the other protected routes:

```tsx
import DiagnosticResultsPage from "@/pages/diagnostic-results";
// ...
<Route path="/results/:slug">
  {(params) => (
    <ProtectedRoute
      component={() => <DiagnosticResultsPage slug={params.slug} />}
      allowedRoles={["parent", "pta", "coordinator", "head_teacher"]}
    />
  )}
</Route>
```

> If `ProtectedRoute` does not accept a `component` that takes props, wrap it as shown (an inline component closing over `params.slug`). Confirm against the existing `/v/:id` and `/d/:slug` route declarations and mirror whichever wrapping they use.

- [ ] **Step 3: Build the front-end (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
```
Expected: `✓ built`; worker restored if it existed.

- [ ] **Step 4: Verify in the browser**

Against the local DB, reuse the `riverside-test` survey pattern from the M1 plan (seed a survey + a handful of answers with year groups, set `released_at`), then drive `/results/riverside-test` with the preview tooling: log in as the coordinator (exec) and confirm distributions, the year-group toggle, the free-text card, and the "Release results" button appear; log in as a parent before release and confirm the locked state. Use `preview_console_logs` to confirm no errors. Clean up the seeded rows afterward (same DELETE recipe as the M1 plan, keyed by the test slug).

- [ ] **Step 5: Commit**

```bash
git add artifacts/safeschool/src/pages/diagnostic-results.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(diagnostic): authed results page with year-group segments + exec free-text/release"
```

---

### Task 7: Membership approval queue page (frontend, exec)

Spec §3 stage 5. Exec page at `/membership` listing pending parents with Approve (choosing named/anonymous) and Reject actions.

**Files:**
- Create: `artifacts/safeschool/src/pages/membership-queue.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`

- [ ] **Step 1: Write the page**

Create `artifacts/safeschool/src/pages/membership-queue.tsx`:

```tsx
import { useState } from "react";
import {
  useListPendingMembers,
  useApproveMember,
  useRejectMember,
} from "@workspace/api-client-react";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

// Exec-only approval queue (/membership). Approving records the member's
// anonymity choice (spec §4.1); rejecting declines a pending signup.

export default function MembershipQueuePage() {
  const q = useListPendingMembers();
  const approve = useApproveMember();
  const reject = useRejectMember();
  const [mode, setMode] = useState<Record<string, "named" | "anonymous">>({});

  const members = (q.data as any)?.members ?? [];

  const onApprove = async (userId: string) => {
    await approve.mutateAsync({ userId, data: { displayMode: mode[userId] ?? "named" } });
    await q.refetch();
  };
  const onReject = async (userId: string) => {
    await reject.mutateAsync({ userId });
    await q.refetch();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Exec"
        title="Membership approvals"
        subtitle={`${members.length} ${members.length === 1 ? "person" : "people"} awaiting approval`}
      />

      {q.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No one is waiting for approval right now.</CardContent></Card>
      ) : (
        members.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-foreground">{`${m.firstName} ${m.lastName}`.trim() || m.email}</div>
                <div className="text-sm text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={mode[m.id] ?? "named"}
                  onChange={(e) => setMode((p) => ({ ...p, [m.id]: e.target.value as "named" | "anonymous" }))}
                >
                  <option value="named">Show their name to parents</option>
                  <option value="anonymous">Anonymous to parents</option>
                </select>
                <Button onClick={() => onApprove(m.id)} isLoading={approve.isPending}>Approve</Button>
                <Button variant="outline" onClick={() => onReject(m.id)} isLoading={reject.isPending}>Reject</Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
```

> The exact generated mutation call shape (`approve.mutateAsync({ userId, data: {...} })`) follows orval's react-query convention for a path param + body. After codegen (Task 5), open the generated hook signature in `lib/api-client-react/src/generated` and adjust the argument object to match (some orval configs use `{ userId, data }`, others flatten to `{ userId, displayMode }`). Use whatever the generated types require.

- [ ] **Step 2: Route it**

In `App.tsx`, import and add an exec-only route:

```tsx
import MembershipQueuePage from "@/pages/membership-queue";
// ...
<Route path="/membership">
  {() => <ProtectedRoute component={MembershipQueuePage} allowedRoles={["pta", "coordinator", "head_teacher"]} />}
</Route>
```

- [ ] **Step 3: Build + verify**

Rebuild the front-end (same worker-preserving build as Task 6, Step 3). Drive `/membership` as the coordinator with the preview tooling: confirm a seeded pending parent appears, Approve with "Anonymous" removes them from the list, and the DB shows `membership_status='approved'`, `display_mode='anonymous'`. Seed one pending parent against the local DB for the test and delete it afterward. Check `preview_console_logs` for errors.

- [ ] **Step 4: Commit**

```bash
git add artifacts/safeschool/src/pages/membership-queue.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(membership): exec approval queue page with anonymity choice"
```

---

### Task 8: Community-mode parent home (frontend)

Spec §4.1: the parent dashboard gets a community mode for parents with **no linked pupils** — no child KPIs; community content leads (see the results, back the VOICE, membership status). This is the funnel's stage-6 landing for diagnostic signups, who have no children linked.

**Files:**
- Modify: `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`

- [ ] **Step 1: Add the community-mode branch**

`ParentDashboard` fetches `/api/dashboard/parent`; `children` is `[]` for diagnostic signups (their `parentOf` is empty). Near the top of the render — after the data is loaded and `childrenList` is derived (the explorer found `const childrenList = parentData?.children || [];` around line 504) — add an early community-mode return **before** the child-KPI / behaviour-standing sections:

```tsx
  // Community mode (spec §4.1): a parent who signed up via the community
  // diagnostic has no linked pupils. Lead with community content, not child KPIs.
  if (childrenList.length === 0) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <PageHeader
          eyebrow="Community"
          title={`Welcome, ${user.firstName}`}
          subtitle="You're part of the parent community. Here's what you can do."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">The community diagnostic</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Results are shared with every participant when the exec releases them. You'll be notified.</p>
              <a className="inline-block font-semibold text-primary hover:underline" href="/results/morna">
                See the results →
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Your membership</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {user.membershipStatus === "pending"
                ? "Your membership is awaiting approval. You'll get full access once an exec approves you."
                : "Your membership is active. Thank you for being part of the community."}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
```

Ensure the imports at the top of `ParentDashboard.tsx` include the components used above (`PageHeader`, `Card`, `CardHeader`, `CardTitle`, `CardContent`) — most are already imported; add any that are missing:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";
```

> `user.membershipStatus` may not currently be present on the auth `user` object. If it isn't, render the simpler copy ("Welcome to the community") and drop the conditional, or extend the `/api/auth/me` payload to include `membershipStatus` — but that is optional polish, not required for M2. Keep the branch resilient to a missing field (the `=== "pending"` check is safe when the field is undefined → falls to the active-copy branch).

- [ ] **Step 2: Build the front-end (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
```
Expected: `✓ built`.

- [ ] **Step 3: Verify**

Drive the dashboard with the preview tooling logged in as a parent with no linked children (seed one against the local DB, or use an existing childless parent): confirm the community-mode cards render and the normal child-KPI dashboard still renders for a parent who has children. `preview_console_logs` clean.

- [ ] **Step 4: Commit**

```bash
git add artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx
git commit -m "feat(dashboard): community-mode parent home for parents with no linked pupils"
```

---

### Task 9: Full backend test sweep + push

- [ ] **Step 1: Run the whole api-server test suite**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run
```
Expected: all suites PASS, including the new `memberDisplay`, `membership`, `voiceAnonymity`, and `diagnosticResults` tests, and the pre-existing `communityDiagnostic` and `voiceGroups` tests (no regressions).

- [ ] **Step 2: Push**

```bash
cd ~/dev/safe-skoolz && git push
```
(Branch `feat/unified-app` auto-deploys to Railway. M2 endpoints go live; no migration runs because M2 added no schema.)

- [ ] **Step 3: Production smoke (read-only)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://safe-skoolz-production.up.railway.app/api/d/morna/results
```
Expected: `401` (results require auth — confirms the route deployed and is guarded). Tom's authenticated test pass at `/results/morna` and the `/membership` queue is the human checkpoint.

---

## Self-review checklist (run after drafting — done)

- **Spec coverage (M2 = §3 stages 5–6, §4.1–4.2):**
  - Admin approval → list/approve/reject, audit-logged ✓ (T2)
  - Anonymity choice at approval ✓ (T2) + anonymity rendering to other parents, exec sees real names ✓ (T1 helper, T3 VOICE surfaces)
  - Community-mode parent home (no linked pupils) ✓ (T8)
  - Results release switch (`releasedAt`) + participant notification (in-app + email) ✓ (T4 release endpoint)
  - Results aggregation: per-question distributions ✓, year-group segmentation with n≥5 suppression ✓, free-text shuffled + exec-only ✓, locked until released for non-exec ✓ (T4)
  - "Seeing results requires signing up" ✓ (T4 results endpoint is behind `authMiddleware`)
  - **Deferred to M3 (correctly out of scope):** the full member community hub aggregating PTA goals/initiatives/decision-log (those entities are built in M3); officer roles; charter claim; VOICE→PTA goal carryover. T8 lands the community home with results + membership status + VOICE link as the M2 surface.
- **No schema changes:** confirmed — `membershipStatus`, `displayMode` (users), `releasedAt` (diagnostic_surveys), and the answer/meta tables all shipped in M1. M2 is API + UI only.
- **Placeholders:** none — full code in every code step. The two "confirm the generated hook arg shape / ProtectedRoute wrapping" notes are explicit verification cues against generated/existing code, not gaps.
- **Type consistency:** `isExecRole`/`memberDisplayName` (T1) are imported and used identically in T3 and T4; `SEGMENT_MIN` threshold (5) matches the test's Y4=5 shown / Y5=2 suppressed assertions (T4); endpoint operationIds (`listPendingMembers`, `approveMember`, `rejectMember`, `releaseDiagnosticResults`, `getDiagnosticResults`) map to the hook names used in T6/T7; `trigger` strings (`membership_approved`, `results_released`) match between insert sites and test assertions; `displayMode` values (`named`/`anonymous`) consistent across T2 API, T3 helper, T7 UI.
- **Privacy invariants preserved:** aggregation never reads `diagnostic_submissions` for answer data; free-text is exec-gated and shuffled; segments below n=5 never render alone; the release notification uses the submission email (its sole retained purpose) without ever linking it to answers.

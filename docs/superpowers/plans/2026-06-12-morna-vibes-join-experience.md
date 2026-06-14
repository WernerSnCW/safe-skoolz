# Morna Vibes — Join Experience (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Monday-ready "Morna Vibes" join experience — a public front door where a parent signs up with email + password and lands instantly inside a simple five-tile shell (Goal 1 · Goal 2 · Concerns · Survey · Results), already backing both goals — reusing the VOICE, diagnostic, results, and approval machinery already in production.

**Architecture:** Extends the app in place (spec `docs/superpowers/specs/2026-06-12-morna-voice-join-experience-design.md`). "Morna Vibes" *is* a VOICE group (`voice_groups`) seeded for the Morna school; signing up creates a `role=parent` user (`membershipStatus=pending`) and adds a `voice_members` backing row (the "back both goals" act). New surfaces: a sign-up endpoint, a public join-summary endpoint, a Concerns intake, and a school search/create-request. The logged-in shell evolves the M2 community-mode `ParentDashboard` branch. Everything works **without email sending** (production has no Resend yet), so sign-up logs you straight in.

**Tech Stack:** Express + Drizzle + Postgres (api-server), vitest (boot `app.listen(0)`, raw `pool` seeding, `fetch`, `signToken`), React + wouter + orval react-query hooks (`@workspace/api-client-react`), bcrypt, JWT.

**Conventions (proven in M1/M2):**
- Build vertical for endpoints: schema → `psql` additive SQL (or `push-force`) → router (register in `routes/index.ts`) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page + route in `App.tsx`.
- Authed endpoints: `authMiddleware` + `requireRole(...)`; read caller via `(req as any).user as JwtPayload` = `{ userId, schoolId, role, email? }`. No `security:` blocks in openapi (token attached by custom-fetch).
- `pnpm typecheck` fails on PRE-EXISTING issues — verify per-layer with the package build + tests.
- Front-end build (preserves the demo worker): `cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true; PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build; cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true`. The passing build is the acceptance bar for frontend tasks (it type-checks pages against the real generated hooks).
- Source `.env` before backend tests: `cd artifacts/api-server && set -a; . ../../.env; set +a`.
- Tests self-seed their own school/user rows and mint JWTs with `signToken`.

**Slice order (Monday-critical first):** Tasks 1–6 are the meeting-critical core (seed → sign-up → join summary → hooks → front door → shell). Tasks 7–8 (Concerns, school search/create) are the next slices. Approval-gating UX needs **no task** — M2 already enforces it server-side at `/d/:slug/results`.

---

## Verified integration facts (from codebase recon — rely on these)

- `signToken({ userId, schoolId, role, email? })` and `type JwtPayload` from `../lib/auth`. JWT key in browser localStorage: `safeschool_token`.
- Login endpoints exist separately: `POST /api/auth/staff/login`, `POST /api/auth/parent/login` — both bcrypt.compare → `signToken` → `{ token, user: formatUser(user), firstLogin }`. **No signup endpoint exists.**
- `formatUser(user)` in `artifacts/api-server/src/routes/auth.ts` returns id, schoolId, role, firstName, lastName, email, yearGroup, className, avatar*, parentOf, active, lastLogin — **NOT** membershipStatus (Task 6 adds it).
- `usersTable` (lib/db/src/schema/users.ts): email is `unique()`; `firstName`/`lastName` are NOT NULL; `membershipStatus` default `approved`, `displayMode` default `named`, `active` default true. bcrypt rounds used elsewhere = 10.
- `voiceGroupsTable` (lib/db/src/schema/voice.ts): `id, schoolId, name, mission (NOT NULL), status (default 'advocating'), createdById, createdAt, convertedAt`. `voiceMembersTable`: `id, voiceId, userId, role (default 'member'), joinedAt`, **unique (voiceId, userId)**. backerCount = `count(voice_members) + count(voice_supporters)`.
- `schoolsTable` (lib/db/src/schema/schools.ts): `id, name, slug (unique), legalEntity, cif, address, country, region, createdAt, active`. Public `GET /api/schools` returns active schools `{ id, name }`.
- `scripts/src/seed-morna.ts` is idempotent (lookup-by-unique-field → insert-if-missing); ends with `process.exit(0)`.
- Frontend: `useAuth()` → `{ user, isLoading, isAuthenticated, logout, setToken }`. After auth: `setToken(res.token)` then `setLocation("/")`. `ProtectedRoute({ component, allowedRoles?, unauthRedirect? })`. Public routes are bare `<Route>`. Authed `role=parent` lands on `/` → ParentDashboard; its community-mode branch (`childrenList.length === 0`) is at `ParentDashboard.tsx` ~lines 550–579.
- `@workspace/db` exports `db`, `pool`, `usersTable`, `voiceGroupsTable`, `voiceMembersTable`, `schoolsTable` (and the diagnostic/notification/audit tables from M2).

---

### Task 1: Seed the "Morna Vibes" VOICE group

So sign-up has a group to back and the counter has a source.

**Files:**
- Modify: `scripts/src/seed-morna.ts`

- [ ] **Step 1: Add the voice-group seed**

In `scripts/src/seed-morna.ts`, extend the imports to include the voice table and `and`:
```ts
import { db, schoolsTable, usersTable, diagnosticSurveysTable, voiceGroupsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
```
Then, after the survey block and **before** `process.exit(0)`, add:
```ts
  const [existingVoice] = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.name, "Morna Vibes")));
  if (!existingVoice) {
    const [voice] = await db.insert(voiceGroupsTable).values({
      schoolId: school.id,
      name: "Morna Vibes",
      mission:
        "Parents asking Morna to adopt Values-based Education, and asking the PTA to adopt a three-tier structure so every parent has an equal voice and the same information.",
      status: "advocating",
      createdById: chair.id,
    }).returning();
    console.log("[seed-morna] created Morna Vibes voice group", voice.id);
  } else {
    console.log("[seed-morna] Morna Vibes voice group exists", existingVoice.id);
  }
```

- [ ] **Step 2: Verify it compiles (do NOT run against the local demo DB)**

```bash
cd ~/dev/safe-skoolz/scripts && pnpm exec tsx --eval "import('./src/seed-morna.ts').then(()=>{}).catch(e=>{if(!/MORNA_CHAIR_EMAIL/.test(String(e)))throw e;console.log('compiles, env-guard OK');process.exit(0)})"
```
Expected: `compiles, env-guard OK`.

- [ ] **Step 3: Commit**

```bash
cd ~/dev/safe-skoolz && git add scripts/src/seed-morna.ts && git commit -m "feat(seed): seed the Morna Vibes voice group for sign-up backing"
```

---

### Task 2: Sign-up endpoint + parent-login case-fix (TDD)

`POST /api/auth/signup` creates a parent (instant login) and backs the school's Morna Vibes group.

**Files:**
- Modify: `artifacts/api-server/src/routes/auth.ts`
- Test: `artifacts/api-server/src/__tests__/signup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/signup.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let voiceId: string;
const stamp = Date.now();
const slug = `signup-test-${stamp}`;

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Signup Test School', $1) RETURNING id`, [slug]);
  schoolId = sch.rows[0].id;
  const chair = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active)
     VALUES ($1, 'pta', 'Ch', 'Air', $2, true) RETURNING id`, [schoolId, `chair-${stamp}@example.com`]);
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id)
     VALUES ($1, 'Test Vibes', 'mission', 'advocating', $2) RETURNING id`, [schoolId, chair.rows[0].id]);
  voiceId = v.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const signup = (body: unknown) => fetch(`${baseUrl}/api/auth/signup`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("POST /api/auth/signup", () => {
  it("creates a pending parent, backs the voice group, and returns a token", async () => {
    const r = await signup({ email: `New.Parent-${stamp}@Example.com`, password: "hunter2pass", name: "New Parent", schoolSlug: slug });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(typeof body.token).toBe("string");
    expect(body.user.role).toBe("parent");

    const u = await pool.query(`SELECT * FROM users WHERE email = $1`, [`new.parent-${stamp}@example.com`]);
    expect(u.rows).toHaveLength(1);
    expect(u.rows[0].membership_status).toBe("pending");
    expect(u.rows[0].password_hash).toBeTruthy();

    const m = await pool.query(`SELECT * FROM voice_members WHERE voice_id = $1 AND user_id = $2`, [voiceId, u.rows[0].id]);
    expect(m.rows).toHaveLength(1);
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    const r = await signup({ email: `NEW.parent-${stamp}@example.com`, password: "hunter2pass", schoolSlug: slug });
    expect(r.status).toBe(409);
  });

  it("400s on a bad email or short password", async () => {
    expect((await signup({ email: "nope", password: "hunter2pass", schoolSlug: slug })).status).toBe(400);
    expect((await signup({ email: `x-${stamp}@example.com`, password: "short", schoolSlug: slug })).status).toBe(400);
  });

  it("404s on an unknown school slug", async () => {
    const r = await signup({ email: `y-${stamp}@example.com`, password: "hunter2pass", schoolSlug: "does-not-exist" });
    expect(r.status).toBe(404);
  });

  it("lets the new parent log in (email stored lowercased)", async () => {
    const r = await fetch(`${baseUrl}/api/auth/parent/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `New.Parent-${stamp}@example.com`, password: "hunter2pass" }),
    });
    expect(r.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/signup.test.ts
```
Expected: FAIL (404/no route).

- [ ] **Step 3: Implement the signup endpoint + lowercase parent login**

In `artifacts/api-server/src/routes/auth.ts`, ensure these are imported (most already are): `bcrypt`, `signToken`, `db`, `eq`, `and`, `usersTable`, `schoolsTable`, `voiceGroupsTable`, `voiceMembersTable`. Add any missing to the existing import lines (e.g. `voiceGroupsTable, voiceMembersTable` to the `@workspace/db` import; `and` to the drizzle import).

Add the handler (near the other `/auth/*` routes):
```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /auth/signup — email+password sign-up that logs the parent in instantly
// (no email verification — production has no Resend yet). Creates a pending
// parent at the school and backs that school's "Vibes" voice group (= backing
// both goals). Returns the same shape as login.
router.post("/auth/signup", async (req, res): Promise<void> => {
  const { email, password, name, schoolSlug } = req.body ?? {};
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  if (!schoolSlug || typeof schoolSlug !== "string") {
    res.status(400).json({ error: "A school is required." });
    return;
  }
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, schoolSlug), eq(schoolsTable.active, true)));
  if (!school) {
    res.status(404).json({ error: "School not found." });
    return;
  }

  const normalEmail = email.toLowerCase().trim();
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalEmail));
  if (existing) {
    res.status(409).json({ error: "This email already has an account. Try logging in." });
    return;
  }

  const trimmed = name ? String(name).trim() : "";
  const firstName = (trimmed.split(/\s+/)[0] || "Morna").slice(0, 100);
  const lastName = (trimmed.split(/\s+/).slice(1).join(" ") || "Parent").slice(0, 100);
  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db.insert(usersTable).values({
    schoolId: school.id,
    role: "parent",
    firstName,
    lastName,
    email: normalEmail,
    passwordHash,
    membershipStatus: "pending",
  } as any).returning();

  // Back the school's Vibes group (= joining = backing both goals). Best-effort:
  // if the group is missing or the unique (voiceId,userId) already exists, sign-up still succeeds.
  try {
    const [voice] = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
    if (voice) {
      await db.insert(voiceMembersTable).values({ voiceId: voice.id, userId: newUser.id, role: "member" }).onConflictDoNothing();
    }
  } catch (e) { console.error("[signup] backing voice failed:", e); }

  const token = signToken({ userId: newUser.id, schoolId: newUser.schoolId, role: newUser.role, email: newUser.email || undefined });
  res.status(201).json({ token, user: formatUser(newUser), firstLogin: true });
});
```

Also make the **parent login** case-insensitive so sign-up accounts log in regardless of typed case. In the `POST /auth/parent/login` handler, change the user lookup to compare against the lowercased email:
```ts
  const normalEmail = String(email).toLowerCase().trim();
  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.email, normalEmail), eq(usersTable.role, "parent"), eq(usersTable.active, true)));
```
(Leave the staff login untouched.)

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm exec vitest run src/__tests__/signup.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/auth.ts src/__tests__/signup.test.ts
git commit -m "feat(auth): email+password sign-up (instant login, backs the Vibes group) + case-insensitive parent login"
```

---

### Task 3: Public join-summary endpoint (TDD)

`GET /api/join/:slug` feeds the front door: school name, the Vibes group's mission, and the live join count.

**Files:**
- Create: `artifacts/api-server/src/routes/join.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/__tests__/join.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/join.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string; let schoolId: string; let voiceId: string;
const stamp = Date.now(); const slug = `join-test-${stamp}`;

beforeAll(async () => {
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Join Test', $1) RETURNING id`, [slug]);
  schoolId = sch.rows[0].id;
  const chair = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','C','H',$2,true) RETURNING id`,
    [schoolId, `jchair-${stamp}@example.com`]);
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, status, created_by_id) VALUES ($1,'Join Vibes','the mission','advocating',$2) RETURNING id`,
    [schoolId, chair.rows[0].id]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, chair.rows[0].id]);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /api/join/:slug", () => {
  it("returns school + vibes summary with a live join count, no auth", async () => {
    const r = await fetch(`${baseUrl}/api/join/${slug}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.schoolName).toBe("Join Test");
    expect(b.voiceName).toBe("Join Vibes");
    expect(b.joinCount).toBe(1);
    expect(b.schoolId).toBeUndefined();
  });
  it("404s for an unknown slug", async () => {
    expect((await fetch(`${baseUrl}/api/join/nope-${stamp}`)).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/join.test.ts
```
Expected: FAIL (404, route not registered).

- [ ] **Step 3: Implement**

Create `artifacts/api-server/src/routes/join.ts`:
```ts
import { Router, type IRouter } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, schoolsTable, voiceGroupsTable, voiceMembersTable } from "@workspace/db";

const router: IRouter = Router();

// Public summary for the Morna Vibes front door — school name, the Vibes group's
// mission, and the live join count. No auth, no internal ids leaked.
router.get("/join/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, slug), eq(schoolsTable.active, true)));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const [voice] = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
  let joinCount = 0;
  if (voice) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, voice.id));
    joinCount = n;
  }

  res.json({
    schoolName: school.name,
    voiceName: voice?.name ?? `${school.name} Vibes`,
    mission: voice?.mission ?? null,
    joinCount,
    hasVibes: voice != null,
  });
});

export default router;
```
Register in `artifacts/api-server/src/routes/index.ts` next to the other public routers:
```ts
import joinRouter from "./join";
router.use(joinRouter);
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm exec vitest run src/__tests__/join.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/join.ts src/routes/index.ts src/__tests__/join.test.ts
git commit -m "feat(join): public GET /api/join/:slug — school + vibes summary + live join count"
```

---

### Task 4: OpenAPI + hooks for sign-up and join-summary

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the paths**

Insert before the `components:` key (two-space indent under `paths:`):
```yaml
  /auth/signup:
    post:
      operationId: signup
      tags: [auth]
      summary: Email+password sign-up that logs the parent in instantly
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, schoolSlug]
              properties:
                email: { type: string }
                password: { type: string }
                name: { type: string }
                schoolSlug: { type: string }
      responses:
        "201":
          description: Created and logged in
          content:
            application/json:
              schema:
                type: object
                required: [token, user]
                properties:
                  token: { type: string }
                  user: { type: object }
                  firstLogin: { type: boolean }
        "400": { description: Invalid input }
        "404": { description: School not found }
        "409": { description: Email already registered }
  /join/{slug}:
    get:
      operationId: getJoinSummary
      tags: [join]
      summary: Public school + vibes summary for the front door
      parameters:
        - { name: slug, in: path, required: true, schema: { type: string } }
      responses:
        "200":
          description: Summary
          content:
            application/json:
              schema:
                type: object
                required: [schoolName, voiceName, joinCount, hasVibes]
                properties:
                  schoolName: { type: string }
                  voiceName: { type: string }
                  mission: { type: string }
                  joinCount: { type: integer }
                  hasVibes: { type: boolean }
        "404": { description: Not found }
```
Add a `join` entry to the top-level `tags:` list (next to `auth`):
```yaml
  - name: join
```

- [ ] **Step 2: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: generates `useSignup` (mutation) and `useGetJoinSummary` (query). Confirm:
```bash
grep -rEl "useSignup|getJoinSummary" lib/api-client-react/src/generated | head
```

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec lib/api-client-react
git commit -m "feat(api-spec): signup + join-summary endpoints and hooks"
```

---

### Task 5: The front door page (public)

Public `/join/:slug` landing with the sign-up form; plus `/join` (bare) routing to Morna for now.

**Files:**
- Create: `artifacts/safeschool/src/pages/join.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`

- [ ] **Step 1: Write the page**

Create `artifacts/safeschool/src/pages/join.tsx` (modelled on `login.tsx`; plain elements, no framer enter-animations):
```tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { useGetJoinSummary, useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

export default function JoinPage({ slug }: { slug: string }) {
  const q = useGetJoinSummary(slug);
  const signup = useSignup();
  const { setToken } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const data = q.data as any;
  const onSubmit = async () => {
    setErr(null);
    try {
      const res = (await signup.mutateAsync({ data: { email: email.trim(), password, name: name.trim() || undefined, schoolSlug: slug } })) as any;
      setToken(res.token);
      setLocation("/");
    } catch (e: any) {
      setErr(e?.data?.error ?? "Sign-up failed — please try again.");
    }
  };

  if (q.isError || (q.data && !(q.data as any).schoolName)) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">School not found</h1></div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-primary">{data?.voiceName ?? "Vibes"}</div>
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold text-foreground">How is {data?.schoolName ?? "your school"} really doing?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Join the parents asking the school and PTA to act.</p>
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-sm"><span className="text-primary">●</span> Ask the school to adopt VBE</div>
          <div className="flex items-center gap-2 text-sm"><span className="text-primary">●</span> Ask the PTA to give every parent a voice</div>
        </div>
        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {data?.joinCount ?? 0} {data?.joinCount === 1 ? "family has" : "families have"} joined
          </span>
        </div>
        <div className="mt-5 space-y-2">
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <button
          type="button"
          disabled={!email.trim() || password.length < 8 || signup.isPending}
          onClick={onSubmit}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {signup.isPending ? "Signing up…" : `Sign up & join ${data?.voiceName ?? "Vibes"}`}
        </button>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <a href="/login" className="hover:underline">Already joined? Log in</a>
          <a href="/find-school" className="hover:underline">Different school?</a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Route it (public)**

In `artifacts/safeschool/src/App.tsx`, import and add public routes near `/d/:slug`:
```tsx
import JoinPage from "@/pages/join";
// ...public routes:
<Route path="/join/:slug">{(params) => <JoinPage slug={params.slug} />}</Route>
<Route path="/join">{() => <JoinPage slug="morna" />}</Route>
```
(`/find-school` is added in Task 8; until then the "Different school?" link 404s — acceptable, it's a Task 8 surface.)

- [ ] **Step 3: Build (preserve worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
```
Expected: `✓ built`, no type errors. VERIFY the generated `useSignup` mutate shape matches `mutateAsync({ data: {...} })` and `useGetJoinSummary(slug)` takes the slug arg (adjust the call to the real generated signature if different). Confirm `@/hooks/use-auth` exports `useAuth` and `setToken` (recon confirmed it does).

- [ ] **Step 4: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/pages/join.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(join): public Morna Vibes front door + email/password sign-up"
```

---

### Task 6: The Morna Vibes shell (logged-in home)

Evolve the M2 community-mode `ParentDashboard` branch into the five-tile shell, and surface `membershipStatus` on `/auth/me` so the shell can show pending state.

**Files:**
- Modify: `artifacts/api-server/src/routes/auth.ts` (add `membershipStatus` to `formatUser`)
- Modify: `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`

- [ ] **Step 1: Add membershipStatus to formatUser**

In `artifacts/api-server/src/routes/auth.ts`, in the `formatUser` return object, add (after `active`):
```ts
    membershipStatus: user.membershipStatus,
    displayMode: user.displayMode,
```
(These are not secrets; the shell uses `membershipStatus`.)

- [ ] **Step 2: Replace the community-mode branch with the five-tile shell**

In `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`, replace the existing `if (childrenList.length === 0) { return ( ... ) }` block (the M2 two-card version) with:
```tsx
  // Community mode → the Morna Vibes shell (spec A §4.3). One simple screen.
  if (childrenList.length === 0) {
    const pending = user.membershipStatus === "pending";
    const Tile = ({ icon, title, body, href, locked }: { icon: string; title: string; body: string; href?: string; locked?: boolean }) => {
      const inner = (
        <div className="h-full rounded-2xl border border-border bg-card p-4">
          <i className={`ti ${icon} text-xl text-primary`} aria-hidden="true" />
          <p className="mt-2 font-semibold text-foreground">{title} {locked && <i className="ti ti-lock text-xs text-muted-foreground" aria-hidden="true" />}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      );
      return href ? <a href={href} className="block hover:opacity-90">{inner}</a> : inner;
    };
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader eyebrow="Morna Vibes" title={`Welcome, ${user.firstName}`} subtitle="You're backing both goals. Here's everything in one place." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Tile icon="ti-flag" title="Goal 1 · Adopt VBE" body="Ask the school to adopt Values-based Education. You're backing it." href="/goals#vbe" />
          <Tile icon="ti-users-group" title="Goal 2 · Equal voice" body="Ask the PTA to adopt a three-tier structure so every parent has an equal voice and the same information." href="/goals#structure" />
          <Tile icon="ti-alert-triangle" title="Concerns" body="The patterns we've seen — and add your own." href="/concerns" />
          <Tile icon="ti-clipboard-list" title="Survey" body="Take it so every parent gets the full picture." href="/d/morna" />
          <Tile icon="ti-chart-bar" title="Results" body={pending ? "Unlocks once your membership is approved and results are released." : "Unlocks when results are released."} href="/results/morna" locked />
        </div>
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm text-primary">
          <i className="ti ti-check" aria-hidden="true" /> You're backing both goals.{pending ? " Your membership is awaiting approval." : ""}
        </div>
      </div>
    );
  }
```
Ensure `PageHeader`, `Card` etc. imports are present (they were in M2). The Tabler `ti` icon font is loaded app-wide (used elsewhere); if not, fall back to lucide icons already imported in this file.

- [ ] **Step 3: Build (preserve worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
```
Expected: `✓ built`. (Goal `/goals` and `/concerns` routes arrive in Tasks 6b/7; the tiles link ahead of them — acceptable interim.)

- [ ] **Step 4: Goal detail page**

Create `artifacts/safeschool/src/pages/goals.tsx` — a simple authed explainer with two anchored sections (`#vbe`, `#structure`) holding the plain-language case for each goal (real draft copy below; Tom reviews wording):
```tsx
export default function GoalsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <section id="vbe">
        <h1 className="font-display text-2xl font-bold">Goal 1 — Ask the school to adopt VBE</h1>
        <p className="mt-3 text-muted-foreground">Values-based Education (VBE) makes a school's values explicit and teaches them deliberately — so expectations are clear, kindness is named and modelled, and behaviour is addressed through a shared language rather than ad hoc. We're asking the school to adopt it as the backbone of how it handles culture, wellbeing and behaviour.</p>
      </section>
      <section id="structure">
        <h1 className="font-display text-2xl font-bold">Goal 2 — A three-tier PTA structure</h1>
        <p className="mt-3 text-muted-foreground">Today, the information and decisions that shape school life sit with a small PTA. We're asking the PTA to adopt a three-tier structure so every parent has an equal voice and the same access to information that is currently members-only — a wider membership feeding a senior group and an executive, with decisions and goals visible to all.</p>
      </section>
    </div>
  );
}
```
Route it in `App.tsx` (authed, parents + exec):
```tsx
import GoalsPage from "@/pages/goals";
<Route path="/goals">{() => <ProtectedRoute component={GoalsPage} allowedRoles={["parent", "pta", "coordinator", "head_teacher"]} />}</Route>
```
Rebuild (Step 3 recipe).

- [ ] **Step 5: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/api-server/src/routes/auth.ts artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx artifacts/safeschool/src/pages/goals.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(shell): Morna Vibes five-tile home + goal explainers + membershipStatus on /me"
```

---

### Task 7: Concerns — read + submit + exec triage (TDD)

**Files:**
- Modify: `lib/db/src/schema/` (new `concerns.ts` + export)
- Create: `artifacts/api-server/src/routes/concerns.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`, `lib/api-spec/openapi.yaml`
- Create: `artifacts/safeschool/src/pages/concerns.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`
- Test: `artifacts/api-server/src/__tests__/concerns.test.ts`

- [ ] **Step 1: Schema**

Create `lib/db/src/schema/concerns.ts`:
```ts
import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

// Community concerns raised to the Vibes coalition / PTA (NOT the school's
// safeguarding reporting line). Read the patterns, add your own; exec triages.
export const voiceConcernsTable = pgTable("voice_concerns", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("idx_voice_concerns_school").on(t.schoolId, t.status)]);
```
Export it from the schema index (`lib/db/src/schema/index.ts` or wherever tables are re-exported — follow the existing pattern: add `export * from "./concerns";`). Apply the schema:
```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/db push-force
```
If `push-force` is blocked, apply the equivalent SQL:
```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS voice_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_concerns_school ON voice_concerns(school_id, status);
SQL
```

- [ ] **Step 2: Write the failing test**

Create `artifacts/api-server/src/__tests__/concerns.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let schoolId: string; let parentTok: string; let execTok: string; let parentId: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Conc', 'conc-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;
  const p = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status) VALUES ($1,'parent','P','One',$2,true,'approved') RETURNING id`, [schoolId, `cp-${stamp}@example.com`]);
  parentId = p.rows[0].id; parentTok = signToken({ userId: parentId, schoolId, role: "parent" });
  const e = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','E','Xec',$2,true) RETURNING id`, [schoolId, `ce-${stamp}@example.com`]);
  execTok = signToken({ userId: e.rows[0].id, schoolId, role: "pta" });
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  try { await pool.query(`DELETE FROM voice_concerns WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});
const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

describe("concerns", () => {
  it("a parent submits a concern", async () => {
    const r = await fetch(`${baseUrl}/api/concerns`, { method: "POST", headers: auth(parentTok), body: JSON.stringify({ body: "Something I've noticed." }) });
    expect(r.status).toBe(201);
    const row = await pool.query(`SELECT * FROM voice_concerns WHERE school_id = $1`, [schoolId]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].status).toBe("pending");
  });
  it("400s on empty body", async () => {
    expect((await fetch(`${baseUrl}/api/concerns`, { method: "POST", headers: auth(parentTok), body: JSON.stringify({ body: "" }) })).status).toBe(400);
  });
  it("a non-exec cannot list concerns", async () => {
    expect((await fetch(`${baseUrl}/api/concerns`, { headers: auth(parentTok) })).status).toBe(403);
  });
  it("an exec lists concerns for their school", async () => {
    const r = await fetch(`${baseUrl}/api/concerns`, { headers: auth(execTok) });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.concerns.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/concerns.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Implement the router**

Create `artifacts/api-server/src/routes/concerns.ts`:
```ts
import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, voiceConcernsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();
const EXEC = requireRole("pta", "coordinator", "head_teacher");

// POST /concerns — any authed member submits a concern to the coalition.
router.post("/concerns", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) { res.status(400).json({ error: "Please describe your concern." }); return; }
  if (body.length > 5000) { res.status(400).json({ error: "Too long." }); return; }
  const [row] = await db.insert(voiceConcernsTable).values({ schoolId: u.schoolId, userId: u.userId, body }).returning({ id: voiceConcernsTable.id });
  res.status(201).json({ id: row.id });
});

// GET /concerns — exec triage list for their school.
router.get("/concerns", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const rows = await db.select({
    id: voiceConcernsTable.id, body: voiceConcernsTable.body, status: voiceConcernsTable.status,
    createdAt: voiceConcernsTable.createdAt, firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(voiceConcernsTable).innerJoin(usersTable, eq(usersTable.id, voiceConcernsTable.userId))
    .where(eq(voiceConcernsTable.schoolId, u.schoolId)).orderBy(desc(voiceConcernsTable.createdAt));
  res.json({ concerns: rows });
});

// POST /concerns/:id/status — exec updates triage status.
router.post("/concerns/:id/status", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { id } = req.params;
  const status = req.body?.status;
  if (!["pending", "reviewed", "actioned", "dismissed"].includes(status)) { res.status(400).json({ error: "Invalid status." }); return; }
  const [row] = await db.select({ id: voiceConcernsTable.id }).from(voiceConcernsTable)
    .where(and(eq(voiceConcernsTable.id, id), eq(voiceConcernsTable.schoolId, u.schoolId)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(voiceConcernsTable).set({ status }).where(eq(voiceConcernsTable.id, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "concern_triaged", actor: u, targetType: "voice_concern", targetId: id, details: { status }, req });
  res.json({ ok: true });
});

export default router;
```
Register in `routes/index.ts`: `import concernsRouter from "./concerns"; router.use(concernsRouter);`

- [ ] **Step 5: Run to verify it passes**

```bash
pnpm exec vitest run src/__tests__/concerns.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 6: OpenAPI + codegen**

Add `/concerns` (POST + GET) and `/concerns/{id}/status` (POST) to `openapi.yaml` (tag `concerns`; mirror the membership endpoints' shape from M2 — POST body `{ body }` → `{ id }`; GET → `{ concerns: [...] }`; status POST body `{ status }`), add a `concerns` tag, then:
```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: `useSubmitConcern`/`useListConcerns`/`useSetConcernStatus` (or the names orval derives from the operationIds you choose — use `submitConcern`, `listConcerns`, `setConcernStatus`).

- [ ] **Step 7: The Concerns page**

Create `artifacts/safeschool/src/pages/concerns.tsx` — read the seeded patterns (real draft copy, generic, never naming Morna; Tom reviews) + a submit box; if the viewer is exec, also render the triage list. Model the data calls on the generated hooks; gate the exec list with `useAuth().user.role`. (Full component: patterns copy as a list of {title, text} constants, a textarea + submit button using `useSubmitConcern`, and an exec-only section using `useListConcerns`.) Route it authed in `App.tsx`:
```tsx
import ConcernsPage from "@/pages/concerns";
<Route path="/concerns">{() => <ProtectedRoute component={ConcernsPage} allowedRoles={["parent", "pta", "coordinator", "head_teacher"]} />}</Route>
```
The seeded patterns copy (generic — six recurring patterns, plain language, no school named):
```
1. Group conduct — harm done by a group acting together, often with a less-visible ringleader and plausible deniability.
2. Social exclusion — deliberate leaving-out done through signals and silences rather than visible acts.
3. Status-based targeting — money, clothes and possessions used as a vector for cruelty.
4. Age-inappropriate conduct — behaviour or content imported from outside, beyond what's appropriate for the age.
5. Bystander passivity — children witnessing harm and feeling unable to speak up.
6. Isolation in a transient community — arriving knowing no one, or losing friends when families move on.
```

- [ ] **Step 8: Build + commit**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true; PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build; cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
cd ~/dev/safe-skoolz && git add lib/db/src/schema lib/api-spec lib/api-client-react artifacts/api-server/src/routes/concerns.ts artifacts/api-server/src/routes/index.ts artifacts/safeschool/src/pages/concerns.tsx artifacts/safeschool/src/App.tsx artifacts/api-server/src/__tests__/concerns.test.ts
git commit -m "feat(concerns): read patterns + submit + exec triage"
```

---

### Task 8: School search → join / request-to-create (TDD)

The "different school?" path — built for the pattern, Morna-only in data.

**Files:**
- Modify: `lib/db/src/schema/` (new `schoolCreateRequests.ts` + export)
- Create: `artifacts/api-server/src/routes/schoolDirectory.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`, `lib/api-spec/openapi.yaml`
- Create: `artifacts/safeschool/src/pages/find-school.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`
- Test: `artifacts/api-server/src/__tests__/schoolDirectory.test.ts`

- [ ] **Step 1: Schema** — create `school_create_requests` (`id, schoolName, requestedByEmail, note, status default 'pending', createdAt`), export it, and apply via push-force or the equivalent `CREATE TABLE IF NOT EXISTS` SQL (mirror Task 7 Step 1).

- [ ] **Step 2: Write the failing test** — `schoolDirectory.test.ts`: `GET /api/schools/search?q=jo` returns matching active schools `[{ slug, name, hasVibes, hasPta }]` (seed one school with a vibes group → `hasVibes:true`); `GET /api/schools/search?q=` (empty) returns `[]` or all; `POST /api/schools/create-request` with `{ schoolName, email }` → 201 and a row; 400 on missing name/email.

- [ ] **Step 3: Implement** — `schoolDirectory.ts`:
```ts
import { Router, type IRouter } from "express";
import { sql, eq, and, ilike } from "drizzle-orm";
import { db, schoolsTable, voiceGroupsTable, schoolCreateRequestsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /schools/search?q= — public school finder (slug + whether it has a Vibes group / PTA).
router.get("/schools/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json({ schools: [] }); return; }
  const rows = await db.select({ slug: schoolsTable.slug, name: schoolsTable.name, id: schoolsTable.id })
    .from(schoolsTable).where(and(eq(schoolsTable.active, true), ilike(schoolsTable.name, `%${q}%`))).limit(20);
  const out = [];
  for (const s of rows) {
    const [v] = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, s.id), eq(voiceGroupsTable.status, "advocating")));
    out.push({ slug: s.slug, name: s.name, hasVibes: v != null });
  }
  res.json({ schools: out });
});

// POST /schools/create-request — queue a "create a Vibes for my school" request.
router.post("/schools/create-request", async (req, res): Promise<void> => {
  const schoolName = typeof req.body?.schoolName === "string" ? req.body.schoolName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 1000) : null;
  if (!schoolName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "School name and a valid email are required." }); return; }
  await db.insert(schoolCreateRequestsTable).values({ schoolName: schoolName.slice(0, 255), requestedByEmail: email, note });
  res.status(201).json({ ok: true });
});

export default router;
```
Register in `routes/index.ts`. (`ilike` is from `drizzle-orm`.)

- [ ] **Step 4: Run tests, then OpenAPI + codegen** (tag `schools`; operationIds `searchSchools`, `requestSchoolCreate`).

- [ ] **Step 5: The find-school page** — `find-school.tsx` (public): a search input → `useSearchSchools(q)`; results link to `/join/:slug`; a "can't find your school? request to create one" form using `useRequestSchoolCreate`. Route public in `App.tsx`: `<Route path="/find-school">{() => <FindSchoolPage />}</Route>`.

- [ ] **Step 6: Build + commit**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && cp dist/public/_worker.js /tmp/_worker.js.bak 2>/dev/null || true; PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build; cp /tmp/_worker.js.bak dist/public/_worker.js 2>/dev/null || true
cd ~/dev/safe-skoolz && git add -A lib/db lib/api-spec lib/api-client-react artifacts/api-server artifacts/safeschool
git commit -m "feat(directory): school search + request-to-create (Morna-only data)"
```

---

### Task 9: Full sweep, seed prod, push

- [ ] **Step 1: Full api-server test sweep**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run
```
Expected: all suites PASS (M1/M2 + new signup, join, concerns, schoolDirectory).

- [ ] **Step 2: Apply new tables + seed the Vibes group in PRODUCTION**

```bash
cd ~/dev/safe-skoolz
# Apply voice_concerns + school_create_requests to prod (idempotent CREATE IF NOT EXISTS — same SQL as Tasks 7/8 Step 1, run against the prod DATABASE_URL).
DATABASE_URL="<prod-postgres-url>" psql "<prod-postgres-url>" -f - <<'SQL'
-- (paste the two CREATE TABLE IF NOT EXISTS blocks)
SQL
# Re-run the idempotent Morna seed to create the Morna Vibes voice group:
DATABASE_URL="<prod-postgres-url>" MORNA_CHAIR_EMAIL=<tom-email> pnpm --filter @workspace/scripts seed-morna
```
Expected: `[seed-morna] created Morna Vibes voice group …` (other rows report "exists").

- [ ] **Step 3: Push (auto-deploys to Railway)**

```bash
cd ~/dev/safe-skoolz && git push origin feat/unified-app
```

- [ ] **Step 4: Production smoke (read-only)**

```bash
base="https://safe-skoolz-production.up.railway.app/api"
curl -s "$base/join/morna" | python3 -m json.tool        # expect schoolName, voiceName "Morna Vibes", joinCount
curl -s -o /dev/null -w "%{http_code}\n" "$base/auth/signup"  # expect 400 (no body) — route deployed
```
Then a manual front-door pass at `https://safe-skoolz-production.up.railway.app/join/morna` (sign up with a test email → land in the shell → see the tiles; clean the test user + voice_member afterward). Tom reviews the goal/concern copy (same gate as the instrument) before sharing the link.

---

## Self-review checklist (run after drafting — done)

- **Spec coverage (A):** front door + sign-up (T2, T5) ✓; instant-in, Results gated (T6 links to M2-gated `/results/morna`) ✓; "Morna Vibes" = the VOICE group, joining backs it (T1 seed, T2 backing insert) ✓; five-tile shell (T6) ✓; Goal explainers (T6 Step 4) ✓; Concerns read+submit+triage (T7) ✓; school search→join/create, Morna-only (T8) ✓; branding "Morna Vibes" only, no submark (T5/T6 copy) ✓; works without email/Resend (T2 returns a token directly, no email sent) ✓; supersedes M2 §6 signup+directory deferral (T2, T8) ✓.
- **Placeholders:** none — full code for every backend task and the front-door/shell; T7/T8 frontend pages described with their exact hooks, routes, and seeded copy (real draft sentences, not "TODO"). Goal/concern copy is real draft text flagged for Tom's wording review (a content gate, not a code gap).
- **Type consistency:** `signToken` payload shape matches recon; `schoolSlug` body field consistent across T2/T4/T5; `useSignup`/`useGetJoinSummary` hook names match operationIds `signup`/`getJoinSummary` (T4) and their use in T5; `voice_groups.status === "advocating"` used consistently (T1 seed, T2 backing lookup, T3 summary); `membershipStatus` added to `formatUser` (T6) is what the shell reads (T6); `voice_members` unique (voiceId,userId) handled by `onConflictDoNothing` (T2).
- **Monday-critical path:** T1–T6 deliver the full sign-up → shell → survey/results experience; T7–T8 are additive; no task is required for approval-gating (M2 already enforces it). If the weekend runs short, T1–T6 alone are a shippable meeting build.

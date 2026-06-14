# Platform Experience Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the platform a real per-tenant config object (display name, theme, capability flags), make one shell + one state-aware nav read from it, and cut the vibez/SchoolVBE/Morna naming knot so end users see only "{School} Vibes".

**Architecture:** Extend the existing `schools` table with `display_name`/`theme`/`capabilities` (JSONB). The **server** owns the capability defaults and resolves `{...DEFAULTS, ...school.capabilities}`, sending the fully-resolved map to clients — so the client never needs the defaults and there is no drift. A public `GET /api/tenant/:slug` and a `tenant` block on `/auth/me` feed a frontend `TenantProvider`; theme is applied by overriding the `--primary` CSS var on `<html>`. The role-only `getNavSections` becomes a state-aware `getNav({membershipState, role, capabilities})`; community-journey roles (parent/pta) get the four-state nav, staff/pupil roles keep their existing sections (Riverside regression-safe), and off-capabilities collapse into one "More of Vibes (soon)" block.

**Tech Stack:** Drizzle ORM + Postgres; Express 5 (api-server); React 19 + wouter + TanStack Query + orval-generated hooks (safeschool); Tailwind v4 design tokens (HSL-triple CSS vars); Vitest (api-server only — no frontend runner).

**Brand model (locked):** Option C — **VBE** = the free framework everyone learns; **Vibes** = the tiered software platform; **"{School} Vibes"** = a tenant instance; "SchoolVBE" retires as a spoken brand (domain kept). Endorsement string = "Vibes — software for VBE".

**Spec:** [`2026-06-13-platform-experience-redesign-phase1-design.md`](../specs/2026-06-13-platform-experience-redesign-phase1-design.md)

**Local dev reminders (from `LOCAL_DEV.md`):** api-server on :8080 (needs `PORT` + env exported, no dotenv), web on :5173 (proxies `/api`→8080), local Postgres db `safeskoolz`. Run api-server tests: `cd artifacts/api-server && pnpm test`. Login for in-browser: `pta.chair@safeschool.dev` / `password123` (pta=exec), a parent account for member states.

---

## File Structure

**Create:**
- `artifacts/api-server/src/lib/tenant.ts` — `CAPABILITY_KEYS`, `CAPABILITY_DEFAULTS`, `resolveCapabilities()`, `tenantPublicView()`. Single server-side source of truth.
- `artifacts/api-server/src/routes/tenant.ts` — `GET /api/tenant/:slug`.
- `artifacts/api-server/src/__tests__/tenant.test.ts` — endpoint + resolution tests.
- `artifacts/safeschool/src/providers/tenant.tsx` — `TenantProvider` + `useTenant()`.
- `artifacts/safeschool/src/lib/membership.ts` — client `isExecRole`, `getMembershipState`, `MembershipState` type.

**Modify:**
- `lib/db/src/schema/schools.ts` — add `displayName`/`theme`/`capabilities` columns.
- `scripts/src/seed.ts`, `scripts/src/seed-morna.ts` — write tenant config for Riverside/Morna.
- `artifacts/api-server/src/routes/auth.ts:662` — `formatUser` gains a `tenant` block; `/auth/me` resolves it.
- `artifacts/api-server/src/routes/index.ts` — register `tenantRouter`.
- `lib/api-spec/openapi.yaml` — add `/tenant/{slug}`; add `tenant` to the `me` response schema.
- `artifacts/safeschool/src/components/brand/BrandLockup.tsx` — tenant-driven wordmark.
- `artifacts/safeschool/src/components/layout/nav-config.tsx` — `getNav({...})` + `NavItem.state`.
- `artifacts/safeschool/src/components/layout/AppLayout.tsx` — consume `useTenant` + `getNav`; render locked/soon.
- `artifacts/safeschool/src/App.tsx` — `TenantProvider` mount; `/s/:slug`; kill `/join` morna default.
- `artifacts/safeschool/src/pages/login.tsx` + `src/locales/{en,es,nl,fr}/login.json` — endorsement string.
- `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`, `src/pages/pta-charter.tsx` — kill hardcoded "Morna".

---

## Task 1: Server-side capability model + resolution helper

**Files:**
- Create: `artifacts/api-server/src/lib/tenant.ts`
- Test: `artifacts/api-server/src/__tests__/tenant.test.ts` (resolution section)

- [ ] **Step 1: Write the helper**

`artifacts/api-server/src/lib/tenant.ts`:

```ts
// Single source of truth for tenant capability flags (spec §3.2). The SERVER
// resolves defaults and sends the complete map to clients, so the client never
// needs these defaults — no drift between client and server.
import type { School } from "@workspace/db";

export const CAPABILITY_KEYS = [
  "learn", "diagnostic", "voice", "membership", "results", "concerns", "pta",
  "safeguarding", "lessons", "behaviour",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
export type Capabilities = Record<CapabilityKey, boolean>;

// Default for an un-configured school: the community/PTA tier is on; the
// whole-school (deep app) capabilities are off until a school switches them on.
export const CAPABILITY_DEFAULTS: Capabilities = {
  learn: true, diagnostic: true, voice: true, membership: true,
  results: true, concerns: true, pta: true,
  safeguarding: false, lessons: false, behaviour: false,
};

/** Merge a school's stored capability overrides over the defaults. */
export function resolveCapabilities(stored: unknown): Capabilities {
  const out = { ...CAPABILITY_DEFAULTS };
  if (stored && typeof stored === "object") {
    for (const key of CAPABILITY_KEYS) {
      const v = (stored as Record<string, unknown>)[key];
      if (typeof v === "boolean") out[key] = v;
    }
  }
  return out;
}

/** The public, end-user-facing view of a tenant (no internal ids). */
export function tenantPublicView(school: School) {
  return {
    slug: school.slug,
    displayName: school.displayName ?? school.name,
    theme: (school.theme && typeof school.theme === "object" ? school.theme : {}) as Record<string, unknown>,
    capabilities: resolveCapabilities(school.capabilities),
  };
}
```

> Note: `School`, `school.displayName`, `school.theme`, `school.capabilities` are added in Task 2. If implementing strictly in order, this file will have a type error on those properties until Task 2 lands — that is expected; do Task 2 next before running typecheck.

- [ ] **Step 2: Write the failing resolution test**

Append to a new `artifacts/api-server/src/__tests__/tenant.test.ts` (the endpoint tests come in Task 4; start with the pure-function block):

```ts
import { describe, it, expect } from "vitest";
import { resolveCapabilities, CAPABILITY_DEFAULTS } from "../lib/tenant";

describe("resolveCapabilities", () => {
  it("returns the defaults for empty/missing config", () => {
    expect(resolveCapabilities({})).toEqual(CAPABILITY_DEFAULTS);
    expect(resolveCapabilities(null)).toEqual(CAPABILITY_DEFAULTS);
    expect(resolveCapabilities(undefined)).toEqual(CAPABILITY_DEFAULTS);
  });

  it("overrides only the keys present, ignoring junk", () => {
    const r = resolveCapabilities({ safeguarding: true, lessons: true, bogus: true, pta: "yes" });
    expect(r.safeguarding).toBe(true);
    expect(r.lessons).toBe(true);
    expect(r.pta).toBe(true);            // defaults true; non-boolean "yes" ignored
    expect(r.behaviour).toBe(false);     // still default
    expect((r as any).bogus).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails (compile error until Task 2), then pass after Task 2**

Run: `cd artifacts/api-server && pnpm test -- tenant`
Expected now: FAIL (type error on `School.displayName` etc.). This is resolved by Task 2; re-run at the end of Task 2.

- [ ] **Step 4: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/api-server/src/lib/tenant.ts artifacts/api-server/src/__tests__/tenant.test.ts
git commit -m "feat(tenant): capability model + resolveCapabilities helper"
```

---

## Task 2: Extend the `schools` schema

**Files:**
- Modify: `lib/db/src/schema/schools.ts:5-20`

- [ ] **Step 1: Add the columns to the Drizzle schema**

In `lib/db/src/schema/schools.ts`, import `jsonb` and add three columns inside `schoolsTable` (after `ptaClaimedAt`):

```ts
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
// ...
  ptaClaimedAt: timestamp("pta_claimed_at", { withTimezone: true }),
  // Phase-1 tenant config (spec §3.1). display_name drives "{School} Vibes";
  // theme overrides design tokens (v1: { primaryColor: "H S% L%" }); capabilities
  // is a key→bool map resolved server-side over CAPABILITY_DEFAULTS.
  displayName: varchar("display_name", { length: 255 }),
  theme: jsonb("theme").notNull().default({}),
  capabilities: jsonb("capabilities").notNull().default({}),
```

- [ ] **Step 2: Apply the columns to the local DB (additive, idempotent — matches the prod Railway pattern)**

Run:
```bash
psql safeskoolz -c "ALTER TABLE schools ADD COLUMN IF NOT EXISTS display_name varchar(255);"
psql safeskoolz -c "ALTER TABLE schools ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;"
psql safeskoolz -c "ALTER TABLE schools ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;"
psql safeskoolz -c "UPDATE schools SET display_name = name WHERE display_name IS NULL;"
```
Expected: each `ALTER`/`UPDATE` prints `ALTER TABLE` / `UPDATE n`. (Use additive SQL, **not** `push-force` — push-force is interactive and may misread new columns as renames per the program's known gotcha.)

- [ ] **Step 3: Verify columns + typecheck the db package**

Run:
```bash
psql safeskoolz -c "\d schools" | grep -E "display_name|theme|capabilities"
cd /Users/thomasking/dev/safe-skoolz && pnpm --filter @workspace/db build
```
Expected: three rows printed; db build clean.

- [ ] **Step 4: Re-run Task 1's tests (now that `School` has the fields)**

Run: `cd artifacts/api-server && pnpm test -- tenant`
Expected: PASS (resolveCapabilities block green).

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add lib/db/src/schema/schools.ts
git commit -m "feat(db): add display_name/theme/capabilities to schools"
```

---

## Task 3: Seed tenant config for Morna + Riverside

**Files:**
- Modify: `scripts/src/seed-morna.ts` (Morna), `scripts/src/seed.ts` (Riverside/base)

- [ ] **Step 1: Set Morna's config in `seed-morna.ts`**

Find where the Morna school row is created/ensured (the `INSERT INTO ... schools` / drizzle insert with `slug: "morna"`). Set `displayName: "Morna"`, leave `theme` default `{}` (default blue), and `capabilities` to PTA-tier-on / whole-school-off. If the script uses raw SQL, set via an `UPDATE` after ensure:

```ts
// Morna tenant config (Phase 1). PTA tier on; whole-school capabilities off.
await db.update(schoolsTable)
  .set({
    displayName: "Morna",
    capabilities: {
      learn: true, diagnostic: true, voice: true, membership: true,
      results: true, concerns: true, pta: true,
      safeguarding: false, lessons: false, behaviour: false,
    },
  })
  .where(eq(schoolsTable.slug, "morna"));
```

- [ ] **Step 2: Set Riverside's config in `seed.ts`**

Where the base/demo school ("Morna"→renamed Riverside in the demo per program memory) is seeded, set `displayName: "Riverside"` and **all capabilities on** (it is the full-stack demo):

```ts
await db.update(schoolsTable)
  .set({
    displayName: "Riverside",
    capabilities: {
      learn: true, diagnostic: true, voice: true, membership: true,
      results: true, concerns: true, pta: true,
      safeguarding: true, lessons: true, behaviour: true,
    },
  })
  .where(eq(schoolsTable.id, schoolId)); // use the id/slug the script already has
```

(Ensure `schoolsTable` and `eq` are imported in each script — they likely already are.)

- [ ] **Step 3: Apply to the local DB directly (so you can verify endpoints without a full reseed)**

Run:
```bash
psql safeskoolz -c "UPDATE schools SET display_name='Morna', capabilities='{\"learn\":true,\"diagnostic\":true,\"voice\":true,\"membership\":true,\"results\":true,\"concerns\":true,\"pta\":true,\"safeguarding\":false,\"lessons\":false,\"behaviour\":false}'::jsonb WHERE slug='morna';"
psql safeskoolz -c "SELECT slug, display_name, capabilities->'safeguarding' AS sg FROM schools;"
```
Expected: the local Riverside/Morna row shows `display_name` set; `safeguarding` false for Morna.

- [ ] **Step 4: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add scripts/src/seed-morna.ts scripts/src/seed.ts
git commit -m "feat(seed): tenant config for Morna (PTA tier) and Riverside (full)"
```

---

## Task 4: Public `GET /api/tenant/:slug`

**Files:**
- Create: `artifacts/api-server/src/routes/tenant.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Test: `artifacts/api-server/src/__tests__/tenant.test.ts` (endpoint block)

- [ ] **Step 1: Write the failing endpoint test**

Append to `artifacts/api-server/src/__tests__/tenant.test.ts` (mirror the harness in `concerns.test.ts`):

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server; let baseUrl: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  await pool.query(
    `INSERT INTO schools (name, slug, display_name, capabilities, active)
     VALUES ('Tenant Test', $1, 'Tenant Test', '{"safeguarding":true}'::jsonb, true)`,
    [`tn-${stamp}`]
  );
  await pool.query(
    `INSERT INTO schools (name, slug, display_name, active) VALUES ('Inactive', $1, 'Inactive', false)`,
    [`tn-inactive-${stamp}`]
  );
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  await pool.query(`DELETE FROM schools WHERE slug LIKE $1`, [`tn-%${stamp}`]);
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /api/tenant/:slug", () => {
  it("returns the resolved public view for a known active slug", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/tn-${stamp}`);
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.displayName).toBe("Tenant Test");
    expect(b.capabilities.safeguarding).toBe(true);   // stored override
    expect(b.capabilities.lessons).toBe(false);        // default
    expect(b.capabilities.pta).toBe(true);             // default
    expect(b.id).toBeUndefined();                      // no internal ids leaked
  });
  it("404s for an unknown slug", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/does-not-exist-${stamp}`);
    expect(r.status).toBe(404);
  });
  it("404s for an inactive school", async () => {
    const r = await fetch(`${baseUrl}/api/tenant/tn-inactive-${stamp}`);
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd artifacts/api-server && pnpm test -- tenant`
Expected: FAIL (404 on the known slug — route not registered yet).

- [ ] **Step 3: Write the route**

`artifacts/api-server/src/routes/tenant.ts`:

```ts
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, schoolsTable } from "@workspace/db";
import { tenantPublicView } from "../lib/tenant";

const router: IRouter = Router();

// Public tenant config for the unified shell (spec §4.1). No auth; no internal ids.
router.get("/tenant/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, slug), eq(schoolsTable.active, true)));
  if (!school) { res.status(404).json({ error: "Tenant not found" }); return; }
  res.json(tenantPublicView(school));
});

export default router;
```

- [ ] **Step 4: Register it**

In `artifacts/api-server/src/routes/index.ts`, import and mount alongside the other public routers (near `joinRouter`). Add the import:

```ts
import tenantRouter from "./tenant";
```

and register it where the other routers are `.use`d (match the existing mount style; tenant has no auth/PII middleware, mount it with the public group, e.g. next to `joinRouter`):

```ts
router.use(tenantRouter);
```

(Use the exact `.use(...)` form the file already uses for `joinRouter` — base path `/api` is applied upstream in `app.ts`.)

- [ ] **Step 5: Run to verify it passes**

Run: `cd artifacts/api-server && pnpm test -- tenant`
Expected: PASS (all blocks green).

- [ ] **Step 6: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/api-server/src/routes/tenant.ts artifacts/api-server/src/routes/index.ts artifacts/api-server/src/__tests__/tenant.test.ts
git commit -m "feat(api): public GET /api/tenant/:slug"
```

---

## Task 5: Add `tenant` to `/auth/me`

**Files:**
- Modify: `artifacts/api-server/src/routes/auth.ts:650-681`
- Test: `artifacts/api-server/src/__tests__/authMeTenant.test.ts`

- [ ] **Step 1: Write the failing test**

`artifacts/api-server/src/__tests__/authMeTenant.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string; let tok: string; let schoolId: string;
const stamp = Date.now();
beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const s = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug, display_name, capabilities, active)
     VALUES ('Me Test', $1, 'Me Test', '{"lessons":true}'::jsonb, true) RETURNING id`,
    [`me-${stamp}`]
  );
  schoolId = s.rows[0].id;
  const u = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active, membership_status)
     VALUES ($1,'parent','M','One',$2,true,'approved') RETURNING id`,
    [schoolId, `me-${stamp}@example.com`]
  );
  tok = signToken({ userId: u.rows[0].id, schoolId, role: "parent" });
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});
afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]);
  await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]);
  await new Promise<void>((r) => server.close(() => r()));
});

describe("/auth/me tenant block", () => {
  it("includes the resolved tenant config", async () => {
    const r = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${tok}` } });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.tenant).toBeDefined();
    expect(b.tenant.displayName).toBe("Me Test");
    expect(b.tenant.capabilities.lessons).toBe(true);   // stored override
    expect(b.tenant.capabilities.safeguarding).toBe(false); // default
    expect(b.membershipStatus).toBe("approved");        // existing field unchanged
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd artifacts/api-server && pnpm test -- authMeTenant`
Expected: FAIL (`b.tenant` is undefined).

- [ ] **Step 3: Resolve the tenant in `/auth/me` and add it to the payload**

In `artifacts/api-server/src/routes/auth.ts`:

1. Add the import at the top (alongside the existing `../lib/auth` import):
```ts
import { tenantPublicView } from "../lib/tenant";
```

2. Make `formatUser` accept an optional resolved tenant and include it:
```ts
function formatUser(user: typeof usersTable.$inferSelect, tenant?: ReturnType<typeof tenantPublicView>) {
  return {
    id: user.id,
    schoolId: user.schoolId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    yearGroup: user.yearGroup,
    className: user.className,
    avatarType: user.avatarType,
    avatarValue: user.avatarValue,
    avatarImageUrl: user.avatarImageUrl,
    parentOf: user.parentOf || [],
    active: user.active,
    membershipStatus: user.membershipStatus,
    displayMode: user.displayMode,
    lastLogin: user.lastLogin?.toISOString() || null,
    tenant: tenant ?? null,
  };
}
```

3. Resolve the school in the `/auth/me` handler and pass it:
```ts
router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  const jwtUser = (req as any).user as JwtPayload;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, jwtUser.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(formatUser(user, school ? tenantPublicView(school) : undefined));
});
```

(`schoolsTable` is already imported in `auth.ts:6`. The other `formatUser(user)` call sites stay as-is — they return `tenant: null`, which is correct: only `/auth/me` needs the tenant block for the shell.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd artifacts/api-server && pnpm test -- authMeTenant`
Expected: PASS.

- [ ] **Step 5: Run the full api-server suite (no regressions)**

Run: `cd artifacts/api-server && pnpm test`
Expected: all green (was 194; now +2 files of new tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/api-server/src/routes/auth.ts artifacts/api-server/src/__tests__/authMeTenant.test.ts
git commit -m "feat(api): include resolved tenant block on /auth/me"
```

---

## Task 6: OpenAPI + codegen for the tenant surfaces

**Files:**
- Modify: `lib/api-spec/openapi.yaml` (add `/tenant/{slug}`; add `tenant` to the `me` response)

- [ ] **Step 1: Add the `/tenant/{slug}` path + schemas**

In `lib/api-spec/openapi.yaml`, add a `Tenant` schema under `components.schemas` and a path. Use inline schemas consistent with the file's style:

```yaml
  /tenant/{slug}:
    get:
      operationId: getTenant
      summary: Public tenant config for the unified shell
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Resolved tenant config
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Tenant" }
        "404":
          description: Tenant not found
```

Add to `components.schemas`:

```yaml
    Capabilities:
      type: object
      additionalProperties: { type: boolean }
      properties:
        learn: { type: boolean }
        diagnostic: { type: boolean }
        voice: { type: boolean }
        membership: { type: boolean }
        results: { type: boolean }
        concerns: { type: boolean }
        pta: { type: boolean }
        safeguarding: { type: boolean }
        lessons: { type: boolean }
        behaviour: { type: boolean }
    Tenant:
      type: object
      properties:
        slug: { type: string, nullable: true }
        displayName: { type: string }
        theme: { type: object, additionalProperties: true }
        capabilities: { $ref: "#/components/schemas/Capabilities" }
```

- [ ] **Step 2: Add `tenant` to the `/auth/me` (200) response schema**

Find the `/auth/me` response schema (the `User`/`me` object near line 151). Add a `tenant` property referencing the `Tenant` schema, nullable:

```yaml
        tenant:
          allOf:
            - $ref: "#/components/schemas/Tenant"
          nullable: true
```

(Insert it into the same `properties` block that already lists `membershipStatus`, `displayMode`, etc. Match the existing indentation exactly.)

- [ ] **Step 3: Regenerate the client hooks**

Run:
```bash
cd /Users/thomasking/dev/safe-skoolz
pnpm --filter @workspace/api-spec codegen
```
Expected: orval regenerates without error; a `useGetTenant` hook now exists, and the `User` type gains an optional `tenant`.

- [ ] **Step 4: Typecheck the generated client + frontend boundary**

Run: `cd /Users/thomasking/dev/safe-skoolz && pnpm --filter @workspace/api-spec build`
Expected: clean. (Frontend typecheck is known to have pre-existing unrelated failures — only confirm no NEW errors about `Tenant`/`useGetTenant`.)

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add lib/api-spec/openapi.yaml
git add -A lib/api-spec  # include regenerated artifacts if tracked
git commit -m "feat(api-spec): tenant schema + getTenant hook + me.tenant"
```

---

## Task 7: Frontend `TenantProvider` + theme application

**Files:**
- Create: `artifacts/safeschool/src/providers/tenant.tsx`
- Modify: `artifacts/safeschool/src/App.tsx` (mount provider)

- [ ] **Step 1: Write the provider**

`artifacts/safeschool/src/providers/tenant.tsx`:

```tsx
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useGetTenant, type Tenant } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

type TenantContextValue = { tenant: Tenant | null; isLoading: boolean };
const TenantContext = createContext<TenantContextValue>({ tenant: null, isLoading: false });

export function useTenant() {
  return useContext(TenantContext);
}

// Resolve the active tenant: authed users carry it on /auth/me; anonymous
// visitors resolve it from the :slug in the path (spec §4.2). Applies the
// per-tenant theme by overriding the --primary CSS var on <html>.
export function TenantProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const { user } = useAuth();
  const authedTenant = (user as any)?.tenant as Tenant | null | undefined;

  // Only fetch by slug when anonymous (no authed tenant) and a slug is present.
  const enabled = !authedTenant && !!slug;
  const { data: fetched, isLoading } = useGetTenant(slug ?? "", {
    query: { enabled } as any,
  });

  const tenant: Tenant | null = authedTenant ?? (enabled ? (fetched ?? null) : null);

  useEffect(() => {
    const root = document.documentElement;
    const primary = (tenant?.theme as Record<string, unknown> | undefined)?.primaryColor;
    // theme.primaryColor is stored as an HSL triple ("H S% L%") to match the
    // token format in index.css (--primary: 217 90% 52%). Empty => default blue.
    if (typeof primary === "string" && primary.trim()) {
      root.style.setProperty("--primary", primary.trim());
    } else {
      root.style.removeProperty("--primary");
    }
    return () => { root.style.removeProperty("--primary"); };
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading: enabled ? isLoading : false }}>
      {children}
    </TenantContext.Provider>
  );
}
```

> Note: confirm the generated `useGetTenant` signature after Task 6 (orval may generate `useGetTenant(slug, options)` or `useGetTenant({ slug }, options)`). Adjust the call to match. `Tenant` is exported from the generated client.

- [ ] **Step 2: Mount the provider in `App.tsx`**

In `artifacts/safeschool/src/App.tsx`, wrap the app inside `AuthProvider` (so `useAuth` is available to it). The slug comes from the current route when anonymous — derive it from `useParams`/`wouter` at the router level, or pass `undefined` and rely on the authed path for Phase 1 (anon front door is Phase 2). Minimal Phase-1 mount:

```tsx
import { TenantProvider } from "@/providers/tenant";
// ... inside the provider stack, INSIDE AuthProvider, OUTSIDE the router switch:
<AuthProvider>
  <TenantProvider>
    <TooltipProvider>
      {/* existing DemoProvider + routes */}
    </TooltipProvider>
  </TenantProvider>
</AuthProvider>
```

(For Phase 1, `TenantProvider` with no `slug` resolves the authed tenant from `/auth/me`. Wiring the anon `:slug` resolution is part of Task 12's `/s/:slug` route and can pass the route slug down; keep the anon front-door content for Phase 2.)

- [ ] **Step 3: Verify in-browser (theme no-op + provider mounts)**

Start the app and confirm no console errors and the default blue is unchanged (Morna theme is `{}`):
```bash
# (Tom runs the server per LOCAL_DEV.md, or use the preview MCP `vibez` config)
```
Use the preview MCP: `preview_start name=vibez` → log in as `pta.chair@safeschool.dev` / `password123` → `preview_console_logs` (no errors) → `preview_snapshot` (app renders). The `--primary` var should be absent/inline-empty (Morna has no theme override).

- [ ] **Step 4: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/providers/tenant.tsx artifacts/safeschool/src/App.tsx
git commit -m "feat(web): TenantProvider + per-tenant theme application"
```

---

## Task 8: Naming cutover — BrandLockup + login + kill hardcoded "Morna"

**Files:**
- Modify: `artifacts/safeschool/src/components/brand/BrandLockup.tsx`
- Modify: `artifacts/safeschool/src/pages/login.tsx` + `src/locales/{en,es,nl,fr}/login.json`
- Modify: `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`, `src/pages/pta-charter.tsx`

- [ ] **Step 1: Make BrandLockup tenant-driven**

Replace `artifacts/safeschool/src/components/brand/BrandLockup.tsx` body so the wordmark is `{displayName} Vibes` and the endorsement is the Option-C string. Where no tenant resolves, fall back to "Vibes".

```tsx
import { cn } from "@/lib/utils";
import { useTenant } from "@/providers/tenant";

// End users see "{School} Vibes" (the per-tenant skin). The platform endorsement
// "Vibes — software for VBE" appears only where `endorse` is requested
// (login / ops), never the parent-facing sidebar. Brand model C.
export function BrandLockup({
  size = "md",
  endorse = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  endorse?: boolean;
  className?: string;
}) {
  const { tenant } = useTenant();
  const name = tenant?.displayName ? `${tenant.displayName} Vibes` : "Vibes";
  const wordmark = { sm: "text-lg", md: "text-2xl", lg: "text-5xl" }[size];
  const endorseSz = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" }[size];

  return (
    <span role="img" aria-label={name} className={cn("flex flex-col leading-none", className)}>
      <span
        aria-hidden="true"
        className={cn("font-brand tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary", wordmark)}
      >
        {name}
      </span>
      {endorse && (
        <span aria-hidden="true" className={cn("font-display font-medium uppercase tracking-wide text-muted-foreground", endorseSz)}>
          Vibes — software for VBE
        </span>
      )}
    </span>
  );
}
```

(The sidebar/mobile-header usages in `AppLayout` stay `<BrandLockup size=.../>` — no `endorse`, so they show just "{School} Vibes".)

- [ ] **Step 2: Use the endorsement on login + update locale string**

In `artifacts/safeschool/src/pages/login.tsx`, pass `endorse` to the BrandLockup used on the login panel (`<BrandLockup size="lg" endorse />`). Update the `protectedBy` line in all four locale files (`src/locales/{en,es,nl,fr}/login.json`) from "vibez by SchoolVBE — …" to the Option-C wording:

- en: `"protectedBy": "Vibes — software for VBE. Free for every school community."`
- es: `"protectedBy": "Vibes — software para VBE. Gratis para toda comunidad escolar."`
- nl: `"protectedBy": "Vibes — software voor VBE. Gratis voor elke schoolgemeenschap."`
- fr: `"protectedBy": "Vibes — un logiciel pour la VBE. Gratuit pour chaque communauté scolaire."`

(Also update the `whatSafeskoolzDoes`/`tagline` only if they contain "vibez"/"SchoolVBE" literally — re-point to "Vibes". Leave i18n **key names** unchanged.)

- [ ] **Step 3: Kill hardcoded "Morna" in ParentDashboard + pta-charter**

In `artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx`:
- Replace `eyebrow="Morna Vibes"` with the tenant name: read `const { tenant } = useTenant();` and use `eyebrow={`${tenant?.displayName ?? ""} Vibes`.trim()}`.
- Replace the hardcoded tile links `/d/morna` and `/results/morna` with the tenant slug: ``href={`/d/${tenant?.slug ?? ""}`}`` and ``href={`/results/${tenant?.slug ?? ""}`}``.

In `artifacts/safeschool/src/pages/pta-charter.tsx`:
- Replace `eyebrow="Morna Vibes"` the same way (`useTenant()` + `${tenant?.displayName} Vibes`).

- [ ] **Step 4: Verify in-browser**

Preview MCP (`vibez`): log in as the **pta** account → sidebar reads "**Morna Vibes**" (no "by SchoolVBE"); the charter eyebrow reads "Morna Vibes". Log in as a **parent** → dashboard eyebrow + survey/results tiles point to `/d/morna` `/results/morna` (slug-driven, not hardcoded). Login page shows "Vibes — software for VBE" endorsement. `preview_console_logs` clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/components/brand/BrandLockup.tsx artifacts/safeschool/src/pages/login.tsx artifacts/safeschool/src/locales artifacts/safeschool/src/pages/dashboard/ParentDashboard.tsx artifacts/safeschool/src/pages/pta-charter.tsx
git commit -m "feat(web): naming cutover to {School} Vibes; retire vibez/SchoolVBE wordmark"
```

---

## Task 9: Client membership-state + capability helpers

**Files:**
- Create: `artifacts/safeschool/src/lib/membership.ts`

- [ ] **Step 1: Write the helpers**

`artifacts/safeschool/src/lib/membership.ts`:

```ts
import type { User } from "@workspace/api-client-react";

export type MembershipState = "anon" | "pending" | "approved" | "exec";

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

/** Mirror of the server isExecRole (memberDisplay.ts). 3 lines — duplicated by
 *  design; the canonical capability *values* come resolved from the server. */
export function isExecRole(role: string | null | undefined): boolean {
  return role != null && EXEC_ROLES.has(role);
}

/** The membership state that drives the unified nav (spec §6.1).
 *  Precedence: no user => anon; exec role => exec; else membershipStatus. */
export function getMembershipState(user: User | null | undefined): MembershipState {
  if (!user) return "anon";
  if (isExecRole(user.role)) return "exec";
  return user.membershipStatus === "pending" ? "pending" : "approved";
}
```

- [ ] **Step 2: Typecheck (no frontend test runner — verify via tsc on the file's consumers in Task 10/11)**

There is no Vitest in `safeschool`. This pure module is exercised by Task 10's `getNav` and verified in-browser in Task 13. No standalone test step.

- [ ] **Step 3: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/lib/membership.ts
git commit -m "feat(web): client membership-state + isExecRole helpers"
```

---

## Task 10: State-aware nav — `getNav({membershipState, role, capabilities})`

**Files:**
- Modify: `artifacts/safeschool/src/components/layout/nav-config.tsx`

- [ ] **Step 1: Extend the types + preserve existing role sections**

At the top of `nav-config.tsx`, extend `NavItem` with an optional `state` and add the new imports/types:

```ts
import type { Capabilities } from "@workspace/api-client-react"; // generated from openapi
import type { MembershipState } from "@/lib/membership";

export type NavItemState = "live" | "locked" | "soon";
export type NavItem = { name: string; href: string; icon: any; badge?: number; state?: NavItemState };
export type NavSection = { label: string | null; items: NavItem[] };
```

Rename the **existing** `getNavSections` function to `getRoleNavSections` (keep its entire body verbatim — every role branch unchanged). It remains the source for staff/pupil roles.

- [ ] **Step 2: Add the off-capability "More of Vibes" block builder**

Add this helper (icons already imported at top: `ShieldCheck`, `BookOpen`, `Activity`):

```ts
// The whole-school capabilities a tenant hasn't switched on yet, shown honestly
// (spec §5/§6.2) as one "soon" group rather than hidden.
function moreOfVibesSection(capabilities: Capabilities, displayName: string): NavSection | null {
  const candidates: Array<{ key: keyof Capabilities; name: string; href: string; icon: any }> = [
    { key: "safeguarding", name: "Safeguarding", href: "/report", icon: ShieldCheck },
    { key: "lessons", name: "Lessons & PSHE", href: "/learn", icon: BookOpen },
    { key: "behaviour", name: "Behaviour", href: "/behaviour", icon: Activity },
  ];
  const off = candidates.filter(c => capabilities[c.key] === false);
  if (off.length === 0) return null;
  return {
    label: `More of Vibes — switched on as ${displayName} adopts`,
    items: off.map(c => ({ name: c.name, href: c.href, icon: c.icon, state: "soon" as const })),
  };
}
```

- [ ] **Step 3: Add the community (parent/pta) state-aware sections**

```ts
function communityNav(
  membershipState: MembershipState,
  capabilities: Capabilities,
  displayName: string,
  t: (k: string) => string,
  counts: { messageUnread: number; unreadCount: number },
): { sections: NavSection[]; footer: NavItem[] } {
  const isExec = membershipState === "exec";
  const isPending = membershipState === "pending";
  const lockIfPending = (item: NavItem): NavItem => isPending ? { ...item, state: "locked" } : { ...item, state: "live" };

  const sections: NavSection[] = [];
  sections.push({ label: null, items: [{ name: t("dashboard"), href: "/", icon: Home, state: "live" }] });

  if (capabilities.learn) {
    sections.push({ label: "Learn VBE", items: [
      { name: "What VBE is & why", href: "/learning", icon: BookOpen, state: "live" },
      { name: "Resources", href: "/resources-hub", icon: Library, state: "live" },
    ]});
  }

  const picture: NavItem[] = [];
  if (capabilities.diagnostic) picture.push({ name: "Diagnostic", href: "/diagnostics", icon: Gauge, state: "live" });
  if (capabilities.results) picture.push(lockIfPending({ name: "Results", href: "/results/morna", icon: Activity }));
  // NOTE: results href is slug-driven at the call site via tenant.slug — see Task 11 wiring.
  if (picture.length) sections.push({ label: "The picture", items: picture });

  const community: NavItem[] = [];
  if (capabilities.voice) community.push({ name: "The ask & backing", href: "/voice", icon: Vote, state: "live" });
  if (capabilities.concerns) community.push({ name: "Concerns", href: isExec ? "/concerns" : "/concerns", icon: MessageCircle, state: "live" });
  if (isExec && capabilities.membership) community.push({ name: "Members", href: "/membership", icon: Users, state: "live" });
  if (community.length) sections.push({ label: "Your community", items: community });

  if (capabilities.pta) {
    const pta: NavItem[] = [
      lockIfPending({ name: "Goals", href: "/pta/goals", icon: Target }),
      lockIfPending({ name: "Initiatives", href: "/pta/initiatives", icon: Rocket }),
      lockIfPending({ name: "Decisions", href: "/pta/decisions", icon: ClipboardList }),
      lockIfPending({ name: "Announcements", href: "/pta/announcements", icon: Megaphone }),
    ];
    if (isExec) {
      pta.push({ name: "Voting", href: "/pta/voting", icon: Vote, state: "live" });
      pta.push({ name: "Charter", href: "/pta/charter", icon: ScrollText, state: "live" });
    }
    sections.push({ label: "PTA", items: pta });
  }

  const more = moreOfVibesSection(capabilities, displayName);
  if (more) sections.push(more);

  const footer: NavItem[] = [
    { name: t("notifications"), href: "/notifications", icon: Bell, badge: counts.unreadCount },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];
  return { sections, footer };
}
```

- [ ] **Step 4: Add the dispatcher `getNav`**

```ts
export function getNav(args: {
  membershipState: MembershipState;
  role: string;
  capabilities: Capabilities;
  displayName: string;
  t: (k: string) => string;
  counts: { messageUnread: number; unreadCount: number };
}): { sections: NavSection[]; footer: NavItem[] } {
  const { membershipState, role, capabilities, displayName, t, counts } = args;
  // Community-journey roles get the four-state nav.
  if (role === "parent" || role === "pta") {
    return communityNav(membershipState, capabilities, displayName, t, counts);
  }
  // Staff/pupil roles keep their existing sections (Riverside regression-safe);
  // mark every item live, then append the off-capability "soon" block if any.
  const base = getRoleNavSections(role, t, counts);
  const sections = base.sections.map(s => ({ ...s, items: s.items.map(i => ({ ...i, state: "live" as const })) }));
  const more = moreOfVibesSection(capabilities, displayName);
  if (more) sections.push(more);
  return { sections, footer: base.footer };
}
```

> `flattenSections` is unchanged and still exported. The `Results` href literal `/results/morna` is replaced with the tenant slug in Task 11 (the call site passes `tenant.slug`); for a clean implementation, change the `communityNav` signature to also take `slug` and build ``/results/${slug}`` / ``/d/${slug}`` — do this in Task 11's wiring step to keep it tenant-driven.

- [ ] **Step 5: Typecheck the package boundary**

Run: `cd /Users/thomasking/dev/safe-skoolz && pnpm --filter @workspace/safeschool build 2>&1 | grep -i "nav-config\|membership\|getNav" || echo "no new nav-config errors"`
Expected: no new errors referencing these files. (Pre-existing unrelated typecheck failures are acceptable per program memory; the **build** must still succeed in Task 13.)

- [ ] **Step 6: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/components/layout/nav-config.tsx
git commit -m "feat(web): state-aware getNav with reveal-by-state + More of Vibes block"
```

---

## Task 11: Wire AppLayout to tenant + getNav, render locked/soon

**Files:**
- Modify: `artifacts/safeschool/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Swap the nav source**

In `AppLayout.tsx`:
- Add imports: `import { useTenant } from "@/providers/tenant";` and `import { getNav } from "@/components/layout/nav-config";` (replace the `getNavSections` import; keep `flattenSections`, `type NavItem`). Add `import { getMembershipState } from "@/lib/membership";`.
- Where it currently does `const { sections, footer } = getNavSections(role, t, { messageUnread, unreadCount });` (line ~93), replace with:

```tsx
const { tenant } = useTenant();
const capabilities = (tenant?.capabilities ?? {
  learn: true, diagnostic: true, voice: true, membership: true,
  results: true, concerns: true, pta: true,
  safeguarding: true, lessons: true, behaviour: true,
}) as any; // fallback: all-on so staff navs are unaffected if tenant not yet loaded
const displayName = tenant?.displayName ?? "";
const membershipState = getMembershipState(user);
const { sections, footer } = getNav({ membershipState, role, capabilities, displayName, t, counts: { messageUnread, unreadCount } });
```

- Update `communityNav` (Task 10) to take `slug` and build ``/d/${slug}``/``/results/${slug}``, and pass `slug: tenant?.slug ?? ""` here. (Adjust the `getNav` signature to thread `slug` through.)

- [ ] **Step 2: Render `locked`/`soon` items as muted, non-navigating**

In the sidebar section render loop, branch on `item.state`. Where items are currently rendered as `<Link href={item.href}>…`, render locked/soon as a muted `<span>` (no navigation) with a small affordance:

```tsx
{section.items.map((item) => {
  const Icon = item.icon;
  if (item.state === "soon" || item.state === "locked") {
    return (
      <div key={item.name} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground/60 cursor-default select-none" title={item.state === "soon" ? "Available — switched on as your school adopts VBE" : "Unlocks once you're an approved member"}>
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-sm">{item.name}</span>
        <span className="text-[9px] uppercase tracking-wide rounded-full border border-border px-1.5 py-0.5">{item.state === "soon" ? "soon" : "🔒"}</span>
      </div>
    );
  }
  // ... existing active <Link> render unchanged
})}
```

(Match the existing class names/markup for the live `<Link>` branch — only add the locked/soon branch above it.)

- [ ] **Step 3: Keep mobile bottom-nav working**

`getMobileNavItems(navItems, role)` consumes `flattenSections(sections)`. Filter out non-live items so the bottom bar only shows navigable items:

```tsx
const navItems = flattenSections(sections).filter(i => i.state !== "soon" && i.state !== "locked");
```

(Apply at the existing `flattenSections(...)` call site feeding the mobile bar.)

- [ ] **Step 4: Verify in-browser, all community states + Riverside regression**

Preview MCP (`vibez`):
- **pta (exec)** login → sidebar shows Home · Learn VBE · The picture (Results live) · Your community (incl. Members) · PTA (incl. Voting/Charter) · "More of Vibes — switched on as Morna adopts" with Safeguarding/Lessons/Behaviour greyed "soon". `preview_screenshot`.
- **parent, approved** → Results live, PTA read, no Members/Voting/Charter, "soon" block present.
- **parent, pending** (set a parent's `membership_status='pending'` via psql on a test parent) → Results + PTA items show 🔒 locked; Concerns + Learn live. Revert the status after.
- **Riverside staff** (a coordinator/teacher account on the Riverside/all-caps school) → existing staff sections intact, **no** "soon" block (all caps on). This is the regression gate.
- `preview_console_logs` clean throughout; `preview_resize` to mobile → bottom-nav shows only live items.

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/components/layout/AppLayout.tsx artifacts/safeschool/src/components/layout/nav-config.tsx
git commit -m "feat(web): AppLayout renders state-aware nav with locked/soon affordances"
```

---

## Task 12: Routing — `/s/:slug`, kill `/join` Morna default, bare-domain finder

**Files:**
- Modify: `artifacts/safeschool/src/App.tsx`

- [ ] **Step 1: Add the canonical tenant root `/s/:slug`**

In `App.tsx`, add a public route. For Phase 1 the anon front door is a placeholder — route `/s/:slug` to the existing `JoinPage` (the closest existing tenant-scoped public surface) so the slug resolves and `TenantProvider` can theme; Phase 2 replaces the content:

```tsx
<Route path="/s/:slug">{(params) => <JoinPage slug={params.slug} />}</Route>
```

- [ ] **Step 2: Remove the hardcoded Morna default on `/join`**

Replace:
```tsx
<Route path="/join">{() => <JoinPage slug="morna" />}</Route>
```
with a redirect to the finder (no tenant assumed):
```tsx
<Route path="/join">{() => { window.location.replace("/find-school"); return null; }}</Route>
```
(Keep `<Route path="/join/:slug">` as-is — it's a valid tenant deep link.)

- [ ] **Step 3: Thread the route slug into TenantProvider for anon theming (optional Phase-1 nicety)**

If `TenantProvider` is mounted above the router (Task 7), the anon `:slug` isn't visible to it. For Phase 1 this is acceptable (anon front door is Phase 2; authed theming works). If you want anon `/s/:slug` themed now, read the slug with wouter inside the provider subtree:

```tsx
// inside the routed area, wrap the tenant public pages:
<Route path="/s/:slug">{(params) => (
  <TenantProvider slug={params.slug}><JoinPage slug={params.slug} /></TenantProvider>
)}</Route>
```
(Leave the app-wide `TenantProvider` for the authed path; this nested one themes the anon tenant page. Do not double-apply — the nested provider wins for that subtree.)

- [ ] **Step 4: Verify in-browser**

- Visit `/s/morna` (logged out) → resolves Morna, page renders, no console error.
- Visit `/join` (logged out) → redirects to `/find-school`.
- Visit `/join/morna` → still works.
- Authed paths unaffected.

- [ ] **Step 5: Commit**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add artifacts/safeschool/src/App.tsx
git commit -m "feat(web): /s/:slug tenant root; drop hardcoded /join morna default"
```

---

## Task 13: Holistic build, full verification, regression sweep

**Files:** none (verification + any fixes surfaced)

- [ ] **Step 1: Full api-server test suite**

Run: `cd artifacts/api-server && pnpm test`
Expected: all green (≥196 — prior 194 + the new tenant/me tests).

- [ ] **Step 2: Production build (frontend + api-server)**

Run:
```bash
cd /Users/thomasking/dev/safe-skoolz
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build
cd artifacts/api-server && pnpm build
```
Expected: both build clean (prerender step included). If the frontend build fails on a NEW error from this work, fix it; pre-existing unrelated typecheck noise is acceptable but the **build** must pass.

- [ ] **Step 3: Run unified prod server + curl smoke**

Run (per LOCAL_DEV.md / program memory):
```bash
cd artifacts/api-server; set -a; . ../../.env; set +a; PORT=8080 NODE_ENV=production node dist/index.cjs &
sleep 2
/usr/bin/curl -s localhost:8080/api/tenant/morna | head -c 400; echo
/usr/bin/curl -s localhost:8080/api/healthz; echo
```
Expected: `/api/tenant/morna` returns JSON with `displayName:"Morna"`, `capabilities` with `safeguarding:false`; healthz 200.

- [ ] **Step 4: In-browser matrix (preview MCP `vibez`)**

Verify, capturing a screenshot per state:
- pta exec, parent approved, parent pending (temp psql flip), Riverside staff — per Task 11 Step 4.
- Brand reads "Morna Vibes" everywhere for end users; login shows "Vibes — software for VBE".
- No hardcoded "Morna" survives in the changed pages (slug-driven links).
- `preview_console_logs` clean on each.

- [ ] **Step 5: Final commit (if fixes were made)**

```bash
cd /Users/thomasking/dev/safe-skoolz
git add -A
git commit -m "chore(phase1): holistic fixes from verification sweep"
```

- [ ] **Step 6: Prod rollout note (do NOT run here — Tom runs)**

Record in the PR/handover: before `git push`, apply via the **Railway Data box** (one statement at a time):
```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS display_name varchar(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE schools SET display_name = name WHERE display_name IS NULL;
UPDATE schools SET capabilities='{"learn":true,"diagnostic":true,"voice":true,"membership":true,"results":true,"concerns":true,"pta":true,"safeguarding":false,"lessons":false,"behaviour":false}'::jsonb WHERE slug='morna';
```
Then `git push` (Railway auto-deploys). Without the columns, `/auth/me` and `/api/tenant/:slug` will 500.

---

## Self-review notes (author)

- **Spec coverage:** §3 schema/defaults → T1–T3; §4 reading mechanism → T4–T7; §5 naming → T8; §6 nav → T9–T11; routing → T12; testing/rollout → T13. All sections mapped.
- **Open items resolved:** §9.1 route shape = `/s/:slug` (T12); §9.2 helper homes = server `lib/tenant.ts` owns defaults + resolution, client `lib/membership.ts` only `isExecRole`/`getMembershipState` (server sends fully-resolved caps → no drift); §9.3 theme mechanism = inline `--primary` HSL-triple override on `<html>` (T7); §9.4 anon front door = placeholder reuse of `JoinPage` via `/s/:slug` (T12), real content Phase 2.
- **Type consistency:** `Capabilities`/`Tenant` generated from openapi (T6) and consumed in T7/T10/T11; `MembershipState` defined in T9, consumed in T10/T11; `getNav` signature identical across T10 definition and T11 call site (incl. the `slug` thread added in T11).
- **No frontend test runner:** server logic is TDD'd (T1,T4,T5); frontend is verified in-browser per the established workflow (T7,T8,T11,T13) — called out explicitly rather than faking unit tests.

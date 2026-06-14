# Phase 4b: Tenant Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chapter 1 of the onboarding spec (`docs/superpowers/specs/2026-06-14-phase4b-tenant-onboarding-design.md`): self-serve **create a school + its advocating VOICE** in one flat, no-admin flow; **open join + share** as the only growth mechanism; a **short multiple-choice intake** that produces the first aggregate; a **threshold-gated** deep-diagnostic release for community-tier tenants; **flag/remove** moderation (platform-operator) replacing the approval gate for community tenants; and a **platform-operator capability toggle** — all while keeping the Riverside whole-school demo's existing approve-then-display + manual-release behaviour intact (spec §6 regression guard).

**Architecture:** Extends the unified app on branch `feat/unified-app`. New public, rate-limited `POST /api/schools` modelled on the existing `POST /voice` handler + the `POST /d/:slug/submit` rate-limiter; creates the `schools` row + an advocating `voice_groups` row in one transaction, deriving a unique slug via a new `slugify` util. The intake is a **distinct "intake" survey** stored through the existing unlinkable `diagnostic_submissions`/`diagnostic_answers`/`diagnostic_response_meta` model (no FK from answers to identity); its aggregate honours the built-in `n>=5` suppression floor. Release becomes **threshold-driven** for community-tier tenants (gated on capability/community-mode) while whole-school tenants keep the manual `POST /d/:slug/release` exec button. Membership moderation inverts: community tenants admit members active-on-join and expose **flag/remove** to a platform-operator plus an in-app **report-this-member** affordance; whole-school tenants keep the `pending → approve/reject` queue. Capabilities stay server-resolved over `CAPABILITY_DEFAULTS`; a new platform-operator-guarded `PATCH /api/schools/:slug/capabilities` flips them without raw SQL. Frontend reuses `AppShell`, `useTenant`, `useAuth`/`useSignup`, and orval-generated hooks.

**Tech Stack:** Express 5 + Drizzle + Postgres (existing monorepo), vitest (existing harness: `app.listen(0)`, raw `pool` seeding, `fetch`), `express-rate-limit` + `PgRateLimitStore`, React + wouter + orval-generated react-query hooks, Tailwind + the `AppShell` / `ui-polished` components.

**Conventions to follow (proven in this repo):**
- Build vertical per slice: schema → apply DDL (additive `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`) → router (register in `routes/index.ts`, mind PII-middleware ordering) → `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec codegen` → page + route in `App.tsx`.
- Schema apply: `pnpm --filter @workspace/db push-force` is **interactive** (prompts on column/constraint changes) and has been permission-blocked in sessions before — prefer the equivalent additive SQL via `psql` (shown per task); it is exactly what push would generate (no drops).
- `pnpm typecheck` fails on PRE-EXISTING issues repo-wide — verify per-layer with the api-server build/tests and the safeschool build, not repo-wide typecheck.
- API tests load env first: `set -a; . ../../.env; set +a` from `artifacts/api-server`, then `pnpm exec vitest run <file>`. Tests INSERT their own school/survey rows via `pool.query` and never depend on seed scripts.
- Front-end build wipes `dist/public` → re-add `_worker.js` after every build (only matters for the demo Pages deploy, not prod). Build command: `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build`.
- Public, client-rendered routes (`/v/:id`, `/d/:slug`, `/find-school`, `/join/:slug`) are NOT prerendered and NOT behind `ProtectedRoute`.
- **No caretaker-Chair promotion, no parent→exec, no formal PTA adoption** in this plan (spec §4.5 — those are Chapter 3, elections-gated). The only privileged surface here is the platform-operator capability toggle and flag/remove.

---

## File Structure

| File | Create / Modify | Responsibility |
|---|---|---|
| `lib/db/src/schema/schools.ts` | Modify | Add `contactName`, `contactEmail`, `releaseThreshold` columns to `schoolsTable`. |
| `lib/db/src/schema/voice.ts` | Modify | Make `voice_groups.createdById` **nullable** — a school's advocating VOICE is created founder-less; the founder is assigned when the creator signs up at `/join/:slug`. |
| `lib/db/src/schema/diagnostics.ts` | Modify | Add `kind` column (`"deep"` \| `"intake"`) to `diagnosticSurveysTable` to distinguish the short intake from the deep instrument. |
| `lib/db/src/schema/memberReports.ts` | Create | New `member_reports` table — records an in-app "report this member" affordance (community moderation, spec §4.3). |
| `lib/db/src/schema/index.ts` | Modify | Export the new `memberReports` schema. |
| `lib/db/src/index.ts` | Modify | Re-export `memberReportsTable` + types from the barrel. |
| `artifacts/api-server/src/lib/slugify.ts` | Create | `slugify(name)` util + `uniqueSlug(base, exists)` collision-suffix helper. |
| `artifacts/api-server/src/lib/intakeInstrument.ts` | Create | The fixed short intake instrument: 3 domains × select-all-that-apply options (placeholder wording, Tom-owned). |
| `artifacts/api-server/src/routes/schools.ts` | Modify | Add `POST /api/schools` (public, rate-limited) and `PATCH /api/schools/:slug/capabilities` (platform-operator guard). |
| `artifacts/api-server/src/routes/communityDiagnostic.ts` | Modify | Add intake submit + intake aggregate endpoints; gate threshold-release vs manual-release on community-mode (spec §6). |
| `artifacts/api-server/src/routes/membership.ts` | Modify | Branch on community-mode: open-join (no pending gate) + flag/remove + report for community tenants; keep approve/reject for whole-school. |
| `artifacts/api-server/src/lib/tenant.ts` | Modify | Add `isCommunityMode(caps)` discriminator used by release + membership branching. |
| `artifacts/api-server/src/routes/index.ts` | Modify | Confirm router registration + PII-middleware ordering (schoolsRouter already public, no PII strip). |
| `artifacts/api-server/src/__tests__/schools-create.test.ts` | Create | TDD: create, slug collision suffix, dup handling, validation, capabilities default. |
| `artifacts/api-server/src/__tests__/intake.test.ts` | Create | TDD: intake submit (unlinkable) + aggregate with `n>=5` suppression. |
| `artifacts/api-server/src/__tests__/threshold-release.test.ts` | Create | TDD: community threshold-release branch + whole-school manual-release regression. |
| `artifacts/api-server/src/__tests__/membership-flag.test.ts` | Create | TDD: community open-join + flag/remove + report; whole-school approve/reject regression. |
| `artifacts/api-server/src/__tests__/capabilities-patch.test.ts` | Create | TDD: platform-operator PATCH success + 403 for a tenant member. |
| `lib/api-spec/openapi.yaml` | Modify | Add paths: `createSchool`, `patchSchoolCapabilities`, `submitIntake`, `getIntakeAggregate`, `reportMember`, `flagRemoveMember`. |
| `artifacts/safeschool/src/pages/find-school.tsx` | Modify | Add the find-or-start create-school form (editable slug + contact capture) wired to `useCreateSchool`. |
| `artifacts/safeschool/src/pages/intake.tsx` | Create | The multiple-choice intake UI (select-all-that-apply across 3 domains), submitted at/after signup. |
| `artifacts/safeschool/src/components/home/ShareSchoolCard.tsx` | Create | "Tell your school" share card (WhatsApp / copy / mailto) + in-app notification stub. |
| `artifacts/safeschool/src/components/home/FirstDataSection.tsx` | Create | Community-home section: intake first-data aggregate + threshold-progress messaging. |
| `artifacts/safeschool/src/pages/community-home.tsx` | Modify | Wire in `ShareSchoolCard` + `FirstDataSection`. |
| `artifacts/safeschool/src/App.tsx` | Modify | Add `/intake` route. |

---

### Task 1: Schema — school contact + release threshold, survey kind, member reports

**Files:**
- Modify: `lib/db/src/schema/schools.ts` (after line 19, the `ptaClaimedAt` column)
- Modify: `lib/db/src/schema/voice.ts` (the `createdById` column on `voiceGroupsTable`, line 32)
- Modify: `lib/db/src/schema/diagnostics.ts` (in the `diagnosticSurveysTable` columns block)
- Create: `lib/db/src/schema/memberReports.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/src/index.ts`

- [ ] **Step 1: Add `contactName`, `contactEmail`, `releaseThreshold` to `schoolsTable`**

In `lib/db/src/schema/schools.ts`, add after the `ptaClaimedAt` line (currently line 19), before the `displayName` line:

```ts
  // Phase 4b (spec §4.1): the school / PTA contact captured at create — one
  // contact per tenant (light columns, chosen over a new table for v1).
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  // Phase 4b (spec §4.4): community-tier release target. The deep diagnostic +
  // report unlock to members when the coalition's intake count reaches this
  // value. Null => use the n>=5 privacy floor. Ch2 replaces this with the
  // PTA-relative number. Ignored for whole-school tenants (manual exec release).
  releaseThreshold: integer("release_threshold"),
```

Add `integer` to the existing `drizzle-orm/pg-core` import on line 1:

```ts
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
```

- [ ] **Step 1b: Make `voice_groups.createdById` nullable**

The advocating VOICE is created founder-less at `POST /api/schools` (no user exists yet — the contact captured there is the SCHOOL/PTA contact for the verification loop, NOT the creator). The founder is assigned when the creator signs up at `/join/:slug` (first backer becomes founder — Task 7). So `createdById` must allow NULL.

In `lib/db/src/schema/voice.ts`, change the `createdById` column (currently line 32):

```ts
// before:
createdById: uuid("created_by_id").references(() => usersTable.id).notNull(),
// after:
// Phase 4b (spec §4.1): nullable — the VOICE is created founder-less when a
// school is started; the founder is set when the creator signs up at /join/:slug
// (first backer becomes founder). Pre-4b VOICEs always have a founder.
createdById: uuid("created_by_id").references(() => usersTable.id),
```

- [ ] **Step 2: Add `kind` to `diagnosticSurveysTable`**

In `lib/db/src/schema/diagnostics.ts`, add to the `diagnosticSurveysTable` columns object, immediately after the `title` column:

```ts
  // Phase 4b (spec §4.4): distinguishes the short multiple-choice INTAKE survey
  // (captured at signup; feeds the live first-data tally) from the DEEP 16-q
  // diagnostic (unlocked at the release threshold). One of each per school.
  kind: varchar("kind", { length: 10 }).notNull().default("deep"),
```

- [ ] **Step 3: Create the `member_reports` table**

Create `lib/db/src/schema/memberReports.ts`:

```ts
import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

// Phase 4b (spec §4.3): the in-app "report this member" affordance. Verification
// is a NEGATIVE/exception check — a member flags someone who isn't part of the
// real community. Recording a report does NOT remove the member; removal is a
// platform-operator action (flag/remove). One open report per (member, reporter).
export const memberReportsTable = pgTable("member_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  // The member being reported.
  reportedUserId: uuid("reported_user_id").references(() => usersTable.id).notNull(),
  // Who raised it (null when reported anonymously from a public surface).
  reporterUserId: uuid("reporter_user_id").references(() => usersTable.id),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | dismissed | actioned
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_member_reports_school").on(t.schoolId),
  index("idx_member_reports_reported").on(t.reportedUserId),
]);

export type MemberReport = typeof memberReportsTable.$inferSelect;
```

- [ ] **Step 4: Export the new schema from the barrels**

In `lib/db/src/schema/index.ts`, add (matching the existing export style):

```ts
export * from "./memberReports";
```

Confirm `lib/db/src/index.ts` re-exports the schema barrel (it already does via `export * from "./schema"` — verify; if it lists tables explicitly, add `memberReportsTable` and `MemberReport` to that list).

- [ ] **Step 5: Apply the schema (local + the DDL recorded for prod in Task 12)**

`push-force` is interactive — prefer the additive SQL. From the repo root:

```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" <<'SQL'
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS contact_name varchar(255),
  ADD COLUMN IF NOT EXISTS contact_email varchar(255),
  ADD COLUMN IF NOT EXISTS release_threshold integer;
-- Founder-less advocating VOICE: the founder is assigned at /join/:slug signup.
ALTER TABLE voice_groups ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE diagnostic_surveys
  ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'deep';
CREATE TABLE IF NOT EXISTS member_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  reported_user_id uuid NOT NULL REFERENCES users(id),
  reporter_user_id uuid REFERENCES users(id),
  reason text,
  status varchar(20) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_reports_school ON member_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_member_reports_reported ON member_reports(reported_user_id);
SQL
```

- [ ] **Step 6: Verify**

```bash
psql "$DATABASE_URL" -c "\d schools" | grep -E "contact_name|contact_email|release_threshold"
psql "$DATABASE_URL" -c "\d diagnostic_surveys" | grep kind
psql "$DATABASE_URL" -c "\d member_reports" | grep reported_user_id
# created_by_id must NOT be "not null" now:
psql "$DATABASE_URL" -c "SELECT is_nullable FROM information_schema.columns WHERE table_name='voice_groups' AND column_name='created_by_id';"
```
Expected: all three school columns present; `kind | varchar(10)` present; `reported_user_id` present; `voice_groups.created_by_id` `is_nullable = YES`.

- [ ] **Step 7: Commit**

```bash
git add lib/db/src/schema lib/db/src/index.ts
git commit -m "feat(db): school contact + release threshold, survey kind (intake|deep), member_reports, nullable voice founder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `slugify` util (TDD)

**Files:**
- Create: `artifacts/api-server/src/lib/slugify.ts`
- Test: `artifacts/api-server/src/__tests__/slugify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/slugify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "../lib/slugify";

describe("slugify", () => {
  it("lowercases, trims, and hyphenates", () => {
    expect(slugify("Morna International College")).toBe("morna-international-college");
  });
  it("strips punctuation and collapses separators", () => {
    expect(slugify("  St. Mary's   C of E!! ")).toBe("st-marys-c-of-e");
  });
  it("drops leading/trailing hyphens and accents", () => {
    expect(slugify("--Café Réal--")).toBe("cafe-real");
  });
  it("caps length at 60 chars without a trailing hyphen", () => {
    const s = slugify("a".repeat(80));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
  it("falls back to 'school' when nothing survives", () => {
    expect(slugify("!!!")).toBe("school");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free", async () => {
    expect(await uniqueSlug("morna", async () => false)).toBe("morna");
  });
  it("appends -2, -3 … until free", async () => {
    const taken = new Set(["morna", "morna-2"]);
    expect(await uniqueSlug("morna", async (s) => taken.has(s))).toBe("morna-3");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a; pnpm exec vitest run src/__tests__/slugify.test.ts
```
Expected: FAIL — module `../lib/slugify` does not exist.

- [ ] **Step 3: Implement the util**

Create `artifacts/api-server/src/lib/slugify.ts`:

```ts
// Phase 4b (spec §4.1): derive a URL-safe slug from a school name. Used by
// POST /api/schools; the result is surfaced to the creator and editable before
// commit. Mirrors the schools.slug column constraint (varchar 60, unique).

const MAX = 60;

/** lowercase, accent-fold, hyphenate, strip punctuation, cap at 60 chars. */
export function slugify(name: string): string {
  const s = String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, ""); // a mid-word cut could leave a trailing hyphen
  return s || "school";
}

/**
 * Resolve a collision-free slug. `exists(slug)` returns true if the slug is
 * already taken. Appends -2, -3 … (trimming the base so the suffix fits in 60).
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const trimmed = base.slice(0, MAX - suffix.length).replace(/-+$/g, "");
    const candidate = `${trimmed}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/slugify.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slugify.ts src/__tests__/slugify.test.ts
git commit -m "feat(api): slugify + uniqueSlug collision-suffix util

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `POST /api/schools` — create school + advocating VOICE (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/schools.ts`
- Test: `artifacts/api-server/src/__tests__/schools-create.test.ts`

`schoolsRouter` is already registered in `routes/index.ts` (line 59) **after** the PII-stripping `ptaRouter`? No — it is registered at line 59, well before `ptaRouter` (line 83) and outside any `/pta/*` prefix, so it never hits `ptaPiiMiddleware`. The new endpoint is `POST /schools` (collides with nothing — the existing `/schools` GET is a different verb). No ordering change needed; this note is the PII-middleware confirmation the spec asks for.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/schools-create.test.ts`:

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
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM voice_members WHERE voice_id IN (SELECT id FROM voice_groups WHERE name LIKE $1)`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM voice_groups WHERE name LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM diagnostic_surveys WHERE title LIKE $1`, [`%${TAG}%`]);
  await pool.query(`DELETE FROM schools WHERE name LIKE $1`, [`%${TAG}%`]);
});

const create = (body: unknown) =>
  fetch(`${baseUrl}/api/schools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/schools", () => {
  it("creates a school + a FOUNDER-LESS advocating VOICE in one transaction, NO user, seeds community caps", async () => {
    const name = `Greenfield ${TAG}`;
    const r = await create({ name, contactName: "Head Teacher", contactEmail: "head@greenfield.test" });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.school.slug).toBe(`greenfield-${TAG}`.toLowerCase());
    expect(body.school.contactName).toBe("Head Teacher"); // SCHOOL contact, not a user
    expect(body.voice.status).toBe("advocating");
    // No internal capabilities override stored: defaults resolve to community tier.
    expect(body.school.capabilities.voice).toBe(true);
    expect(body.school.capabilities.safeguarding).toBe(false);

    const sch = await pool.query(`SELECT id, capabilities, contact_email FROM schools WHERE slug = $1`, [body.school.slug]);
    expect(sch.rows[0].capabilities).toEqual({}); // stored {}, resolved server-side
    expect(sch.rows[0].contact_email).toBe("head@greenfield.test");
    const schoolId = sch.rows[0].id;

    // The advocating VOICE exists and is FOUNDER-LESS (created_by_id NULL).
    const v = await pool.query(`SELECT * FROM voice_groups WHERE school_id = $1`, [schoolId]);
    expect(v.rows).toHaveLength(1);
    expect(v.rows[0].created_by_id).toBeNull();

    // NO user was created for the school (the contact is not a user).
    const u = await pool.query(`SELECT count(*)::int AS n FROM users WHERE school_id = $1`, [schoolId]);
    expect(u.rows[0].n).toBe(0);
    // ...and consequently no voice_members row yet.
    const vm = await pool.query(`SELECT count(*)::int AS n FROM voice_members WHERE voice_id = $1`, [v.rows[0].id]);
    expect(vm.rows[0].n).toBe(0);
  });

  it("derives a collision suffix when the slug is taken", async () => {
    const name = `Riverside ${TAG}`; // same name twice -> -2
    const r1 = await create({ name });
    const r2 = await create({ name });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const s1 = (await r1.json()).school.slug;
    const s2 = (await r2.json()).school.slug;
    expect(s2).toBe(`${s1}-2`);
  });

  it("honours a creator-supplied editable slug", async () => {
    const r = await create({ name: `Hillcrest ${TAG}`, slug: `custom-${TAG}` });
    expect(r.status).toBe(201);
    expect((await r.json()).school.slug).toBe(`custom-${TAG}`);
  });

  it("rejects a blank name", async () => {
    const r = await create({ name: "   " });
    expect(r.status).toBe(400);
  });

  it("rejects a malformed contact email", async () => {
    const r = await create({ name: `BadEmail ${TAG}`, contactEmail: "not-an-email" });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/schools-create.test.ts
```
Expected: FAIL — `POST /api/schools` not defined (404 on every case).

- [ ] **Step 3: Implement `POST /api/schools`**

In `artifacts/api-server/src/routes/schools.ts`, extend the imports on lines 1–6 and add the handler. Replace the import block (lines 1–6) with:

```ts
import { Router, type IRouter } from "express";
import { eq, and, inArray, ilike, or, sql } from "drizzle-orm";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db, schoolsTable, voiceGroupsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { tenantPublicView } from "../lib/tenant";
import { slugify, uniqueSlug } from "../lib/slugify";
import { PgRateLimitStore } from "../lib/rateLimitStore";
```

(No `usersTable`/`voiceMembersTable`/`bcrypt` — create makes no user. Keep whatever the existing `schools.ts` already imported for its other handlers; only add `voiceGroupsTable`, `slugify`/`uniqueSlug`, the rate-limit + `tenantPublicView` imports if not already present.)

Then add, immediately after `const router: IRouter = Router();` (currently line 11) and before the existing `router.get("/schools", …)`:

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Public, abuse-bounded create (spec §4.1). Keyed by IP since there is no auth.
const createSchoolLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many schools created from this connection. Please try again later." },
  store: new PgRateLimitStore("schools-create"),
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "anon"),
});

// POST /api/schools — find-or-start (spec §4.1). Creates the schools row + an
// advocating voice_groups row in ONE transaction. NO user is created here. The
// advocating VOICE is created FOUNDER-LESS (createdById = null); the founder is
// assigned when the creator signs up at /join/:slug — the first person to back a
// founder-less advocating VOICE becomes its founder (see auth.ts signup, Task 7).
// The contactName/contactEmail captured here are the SCHOOL/PTA contact for the
// verification loop (spec §1.2 — could be the school office), NOT the creator.
// Slug is derived from the name (slugify) with a collision suffix, or a
// creator-supplied editable slug. Capabilities are left {} so they resolve to the
// free community tier over CAPABILITY_DEFAULTS.
router.post("/schools", createSchoolLimiter, async (req, res): Promise<void> => {
  const { name, slug: rawSlug, coalitionName, contactName, contactEmail, contactPhone } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "A school name is required." });
    return;
  }
  const cleanName = name.trim().slice(0, 255);

  if (rawSlug != null && (typeof rawSlug !== "string" || !SLUG_RE.test(rawSlug) || rawSlug.length > 60)) {
    res.status(400).json({ error: "Slug must be lowercase letters, numbers and single hyphens." });
    return;
  }
  if (contactEmail != null && contactEmail !== "" && (typeof contactEmail !== "string" || !EMAIL_RE.test(contactEmail))) {
    res.status(400).json({ error: "Please enter a valid contact email." });
    return;
  }

  const slugExists = async (s: string): Promise<boolean> => {
    const [hit] = await db.select({ id: schoolsTable.id }).from(schoolsTable).where(eq(schoolsTable.slug, s));
    return hit != null;
  };

  let slug: string;
  if (rawSlug) {
    if (await slugExists(rawSlug)) {
      res.status(409).json({ error: "That web address is already taken — try another." });
      return;
    }
    slug = rawSlug;
  } else {
    slug = await uniqueSlug(slugify(cleanName), slugExists);
  }

  const voiceName =
    typeof coalitionName === "string" && coalitionName.trim() ? coalitionName.trim().slice(0, 255) : `${cleanName} Vibes`;

  const schoolContactEmail = (typeof contactEmail === "string" && contactEmail) ? contactEmail.toLowerCase().trim() : null;

  // ONE transaction, NO user. The advocating VOICE is created founder-less
  // (createdById = null); the founder is assigned at /join/:slug signup (first
  // backer becomes founder — Task 7). The contact name/email are stored on the
  // school as the SCHOOL/PTA contact for the verification loop, not the creator.
  let result: { school: typeof schoolsTable.$inferSelect; voice: typeof voiceGroupsTable.$inferSelect };
  try {
    result = await db.transaction(async (tx) => {
      const [school] = await tx.insert(schoolsTable).values({
        name: cleanName,
        slug,
        displayName: cleanName,
        contactName: typeof contactName === "string" ? contactName.trim().slice(0, 255) || null : null,
        contactEmail: schoolContactEmail,
        // capabilities left {} -> resolves to the free community tier (spec §4.1).
      } as any).returning();

      const [voice] = await tx.insert(voiceGroupsTable).values({
        schoolId: school.id,
        name: voiceName,
        mission: `Parents of ${cleanName} asking the school and PTA to act.`,
        status: "advocating",
        createdById: null, // founder-less; set at /join/:slug signup (Task 7)
      }).returning();

      return { school, voice };
    });
  } catch (e: any) {
    const pgCode = e?.code ?? e?.cause?.code;
    if (pgCode === "23505") {
      // Slug uniqueness lost a race (the only unique constraint in play now that
      // no user is created) — surface a clean conflict.
      res.status(409).json({ error: "That school or web address already exists — try finding it instead." });
      return;
    }
    throw e;
  }

  await writeAudit({
    schoolId: result.school.id,
    eventType: "school_created",
    targetType: "school",
    targetId: result.school.id,
    details: { slug, voiceId: result.voice.id },
    req,
  }).catch(() => {});

  res.status(201).json({
    school: { ...tenantPublicView(result.school), id: result.school.id, contactName: result.school.contactName },
    voice: { id: result.voice.id, name: result.voice.name, status: result.voice.status },
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/schools-create.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/schools.ts src/__tests__/schools-create.test.ts
git commit -m "feat(api): POST /api/schools — create school + advocating VOICE, slug collision, contact capture

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: The intake instrument + community-mode discriminator

**Files:**
- Create: `artifacts/api-server/src/lib/intakeInstrument.ts`
- Modify: `artifacts/api-server/src/lib/tenant.ts`

- [ ] **Step 1: Write the intake instrument**

The intake is **multiple-choice, select-all-that-apply across the 3 fixed domains** (spec §4.4). Modelled on the deep instrument shape (`InstrumentQuestion` from `communityInstrument.ts`): each domain is one `type:"scale"` question whose `options` are the select-all choices. **⚠ Option wording is placeholder — Tom-owned (content audit). The format + the three domains are fixed by spec §4.4.** Stored on the intake survey's `instrument` jsonb; answers are stored as the **selected option indices** (one answer row per selected option).

Create `artifacts/api-server/src/lib/intakeInstrument.ts`:

```ts
// Phase 4b (spec §4.4): the SHORT sign-up intake — multiple-choice,
// select-all-that-apply across the three fixed domains. The format and the three
// domains are fixed here; the exact OPTION WORDING is PLACEHOLDER and Tom-owned
// (end-of-redesign content audit). Each domain mixes negative + positive options
// so the tally reads as a pulse, not a complaints box. The deep diagnostic
// expands within these same three domains.
//
// Shape matches communityInstrument.InstrumentQuestion. type "multi" => the
// frontend renders checkboxes; submit stores one answer row per selected index.

export interface IntakeQuestion {
  key: string;
  section: string;
  text: string;
  type: "multi";
  options: string[]; // selectable, in order; index is the stored answer value
}

export const INTAKE_INSTRUMENT: IntakeQuestion[] = [
  {
    key: "intake_pta_comms",
    section: "Communications from the PTA",
    type: "multi",
    text: "Thinking about how the PTA communicates with families, which of these match your experience? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "I rarely hear what the PTA is doing", // negative
      "I'm not sure how to raise something with the PTA", // negative
      "I don't feel my views reach the PTA", // negative
      "The PTA keeps families well informed", // positive
      "I know how to get involved if I want to", // positive
    ],
  },
  {
    key: "intake_pupil_issues",
    section: "Pupil issues at school",
    type: "multi",
    text: "Which of these has your child experienced or witnessed at school? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "Unkindness or exclusion from other children", // negative
      "Being targeted over money, clothes or possessions", // negative
      "Seeing something and not feeling able to speak up", // negative
      "My child generally feels they belong here", // positive
      "My child has good friendships at school", // positive
    ],
  },
  {
    key: "intake_school_response",
    section: "How the school handles situations",
    type: "multi",
    text: "When something goes wrong, which of these match how the school responds? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "Concerns I raised weren't resolved", // negative
      "I didn't hear back after raising something", // negative
      "It wasn't clear what the school did about it", // negative
      "The school responded clearly and in good time", // positive
      "The school kept me informed about what happened", // positive
    ],
  },
];
```

- [ ] **Step 2: Add `isCommunityMode` to `tenant.ts`**

In `artifacts/api-server/src/lib/tenant.ts`, append after `tenantPublicView` (the discriminator for spec §6 — community-tier behaviour applies where the whole-school caps are OFF):

```ts
/**
 * Community-mode discriminator (spec §6 regression guard). A tenant is in
 * community mode when the whole-school (paid) capabilities are all OFF — i.e.
 * the school hasn't adopted. Community mode => open-join + flag/remove +
 * threshold-release. Whole-school mode (e.g. Riverside) keeps the existing
 * approve-then-display + manual exec release. Pass a school row or resolved caps.
 */
export function isCommunityMode(school: { capabilities?: unknown } | Capabilities): boolean {
  const caps =
    "safeguarding" in (school as any) && typeof (school as any).safeguarding === "boolean"
      ? (school as Capabilities)
      : resolveCapabilities((school as { capabilities?: unknown }).capabilities);
  return !caps.safeguarding && !caps.lessons && !caps.behaviour;
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd ~/dev/safe-skoolz/artifacts/api-server && pnpm exec tsc -p tsconfig.json --noEmit 2>&1 | grep -E "intakeInstrument|tenant.ts" || echo "no new errors in changed files"
```
Expected: `no new errors in changed files` (repo-wide typecheck has pre-existing failures — only scan the two files we touched).

- [ ] **Step 4: Commit**

```bash
git add src/lib/intakeInstrument.ts src/lib/tenant.ts
git commit -m "feat(api): intake instrument (3 domains, select-all) + isCommunityMode discriminator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Intake submit + aggregate (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Test: `artifacts/api-server/src/__tests__/intake.test.ts`

The intake reuses the unlinkable submission/answers model. A school's intake survey is the `diagnostic_surveys` row with `kind='intake'`. Submit stores **one answer row per selected option index** (sharing one `responseId`), unlinkable from the email-bearing submission, exactly like `POST /d/:slug/submit`. The aggregate returns per-option counts and honours the `n>=5` floor (the whole intake is suppressed below 5 respondents, matching `SEGMENT_MIN`).

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/intake.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
let schoolId: string;
let surveyId: string;
const SLUG = `intake-${Date.now().toString(36)}`;

const INSTRUMENT = [
  { key: "d1", section: "PTA", text: "PTA?", type: "multi", options: ["a", "b", "c"] },
  { key: "d2", section: "Pupil", text: "Pupil?", type: "multi", options: ["x", "y"] },
];

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  const sch = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Intake Test', $1) RETURNING id`, [SLUG]);
  schoolId = sch.rows[0].id;
  const u = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','I','T',$2) RETURNING id`,
    [schoolId, `${SLUG}@t.example`]);
  const svy = await pool.query<{ id: string }>(
    `INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument)
     VALUES ($1, 'Intake ${SLUG}', 'active', 'intake', $2, $3, $4) RETURNING id`,
    [schoolId, u.rows[0].id, SLUG, JSON.stringify(INSTRUMENT)]);
  surveyId = svy.rows[0].id;
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id=$1`, [surveyId]);
  await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id=$1`, [surveyId]);
  await pool.query(`DELETE FROM diagnostic_surveys WHERE id=$1`, [surveyId]);
  await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]);
  await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]);
});

const submit = (email: string, selections: Record<string, number[]>) =>
  fetch(`${baseUrl}/api/intake/${SLUG}/submit`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, selections }),
  });

describe("POST /api/intake/:slug/submit", () => {
  it("stores one unlinkable answer row per selected option", async () => {
    const r = await submit("parent.a@t.example", { d1: [0, 2], d2: [1] });
    expect(r.status).toBe(201);
    const ans = await pool.query(`SELECT * FROM diagnostic_answers WHERE survey_id=$1`, [surveyId]);
    expect(ans.rows).toHaveLength(3);
    const ids = new Set(ans.rows.map((x: any) => x.response_id));
    expect(ids.size).toBe(1); // one respondent
    expect(Object.keys(ans.rows[0])).not.toContain("submission_id");
  });

  it("rejects a duplicate email (409)", async () => {
    const r = await submit("parent.a@t.example", { d1: [1] });
    expect(r.status).toBe(409);
  });

  it("rejects unknown keys / out-of-range option indices (400)", async () => {
    expect((await submit("z@t.example", { nope: [0] })).status).toBe(400);
    expect((await submit("z2@t.example", { d2: [9] })).status).toBe(400);
  });
});

describe("GET /api/intake/:slug/aggregate", () => {
  it("suppresses the COUNTS below n>=5 but always returns the domain/option shape, then reveals counts", async () => {
    // 1 respondent so far -> suppressed, but the shape (domains + options) is
    // ALWAYS present so the intake form can render its questions.
    let r = await fetch(`${baseUrl}/api/intake/${SLUG}/aggregate`);
    let body = await r.json();
    expect(body.suppressed).toBe(true);
    expect(body.n).toBe(1);
    // Shape present even while suppressed:
    expect(Array.isArray(body.domains)).toBe(true);
    expect(body.domains).toHaveLength(INSTRUMENT.length);
    const sd1 = body.domains.find((d: any) => d.key === "d1");
    expect(sd1.section).toBe("PTA");
    expect(sd1.options).toEqual(["a", "b", "c"]);
    // Counts are gated while suppressed:
    expect(sd1.counts == null).toBe(true);

    for (const e of ["b", "c", "d", "e"]) await submit(`p.${e}@t.example`, { d1: [0], d2: [0] });
    r = await fetch(`${baseUrl}/api/intake/${SLUG}/aggregate`);
    body = await r.json();
    expect(body.suppressed).toBe(false);
    expect(body.n).toBe(5);
    const d1 = body.domains.find((d: any) => d.key === "d1");
    expect(d1.options).toEqual(["a", "b", "c"]); // shape still present
    expect(d1.counts[0]).toBe(5); // option 0 chosen by all 5 — counts now revealed
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/intake.test.ts
```
Expected: FAIL — `/api/intake/:slug/submit` and `/aggregate` are 404.

- [ ] **Step 3: Implement the two endpoints**

In `artifacts/api-server/src/routes/communityDiagnostic.ts`, add after the `POST /d/:slug/submit` handler (and reuse the existing `submitLimiter`, `EMAIL_RE`, `SEGMENT_MIN`, `crypto`, `db`, table imports already in the file):

```ts
// ── Phase 4b intake (spec §4.4) ──────────────────────────────────────────────
// The short, multiple-choice (select-all) sign-up intake. Same unlinkable model
// as /d/:slug/submit: one answer row per SELECTED OPTION INDEX, all sharing one
// random responseId; the email-bearing submission row holds no answers.
// Loads the school's kind='intake' survey by slug.
async function loadIntakeBySlug(slug: string) {
  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.publicSlug, slug),
      eq(diagnosticSurveysTable.kind, "intake"),
      isNotNull(diagnosticSurveysTable.publicSlug),
    ));
  return survey ?? null;
}

router.post("/intake/:slug/submit", submitLimiter, async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const { email, selections } = req.body ?? {};
  const survey = await loadIntakeBySlug(slug);
  if (!survey || survey.status !== "active") { res.status(404).json({ error: "Intake not found" }); return; }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const instrument = (survey.instrument ?? []) as Array<{ key: string; options: string[] }>;
  const byKey = new Map(instrument.map((q) => [q.key, q]));
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    res.status(400).json({ error: "Selections are required." });
    return;
  }
  // Validate every key and option index; collect flat answer rows.
  const flat: { questionKey: string; answer: number }[] = [];
  for (const [key, idxs] of Object.entries(selections)) {
    const q = byKey.get(key);
    if (!q) { res.status(400).json({ error: `Unknown domain: ${key}` }); return; }
    if (!Array.isArray(idxs)) { res.status(400).json({ error: "Selections must be arrays." }); return; }
    for (const i of idxs) {
      if (!Number.isInteger(i) || i < 0 || i >= q.options.length) {
        res.status(400).json({ error: "Invalid option." });
        return;
      }
      flat.push({ questionKey: key, answer: i });
    }
  }

  const normalEmail = email.toLowerCase().trim();
  const emailHash = crypto.createHash("sha256").update(normalEmail).digest("hex");
  const [existing] = await db.select({ id: diagnosticSubmissionsTable.id }).from(diagnosticSubmissionsTable)
    .where(and(eq(diagnosticSubmissionsTable.surveyId, survey.id), eq(diagnosticSubmissionsTable.emailHash, emailHash)));
  if (existing) { res.status(409).json({ error: "This email has already taken the intake." }); return; }

  const responseId = crypto.randomUUID();
  const dayBucket = new Date(new Date().toISOString().slice(0, 10));
  try {
    await db.transaction(async (tx) => {
      await tx.insert(diagnosticSubmissionsTable).values({ surveyId: survey.id, email: normalEmail, emailHash });
      if (flat.length) {
        await tx.insert(diagnosticAnswersTable).values(
          flat.map((a) => ({ surveyId: survey.id, responseId, questionKey: a.questionKey, answer: a.answer, createdAt: dayBucket })),
        );
      } else {
        // Selected nothing: still record the response so n increments. Use a
        // sentinel answer=-1 row tagging participation without an option.
        await tx.insert(diagnosticAnswersTable).values({ surveyId: survey.id, responseId, questionKey: "__none__", answer: -1, createdAt: dayBucket });
      }
    });
  } catch (e: any) {
    const pgCode = e?.code ?? e?.cause?.code;
    if (pgCode === "23505") { res.status(409).json({ error: "This email has already taken the intake." }); return; }
    throw e;
  }

  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${diagnosticAnswersTable.responseId})::int` })
    .from(diagnosticAnswersTable).where(eq(diagnosticAnswersTable.surveyId, survey.id));
  res.status(201).json({ counted: true, n });
});

// GET /api/intake/:slug/aggregate — the FIRST DATA (spec §4.4). Public; honours
// the n>=5 floor (whole tally suppressed below 5 respondents).
router.get("/intake/:slug/aggregate", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const survey = await loadIntakeBySlug(slug);
  if (!survey) { res.status(404).json({ error: "Intake not found" }); return; }
  const instrument = (survey.instrument ?? []) as Array<{ key: string; section: string; options: string[] }>;

  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${diagnosticAnswersTable.responseId})::int` })
    .from(diagnosticAnswersTable).where(eq(diagnosticAnswersTable.surveyId, survey.id));

  const suppressed = n < SEGMENT_MIN;

  // ALWAYS return the domain/option SHAPE (read from the instrument), regardless
  // of suppression — the intake FORM (intake.tsx) reads `domains` to render its
  // questions, so the first <5 families must still get the shape. Only the
  // per-option COUNTS are gated: omitted while suppressed, included once revealed.
  if (suppressed) {
    const domains = instrument.map((q) => ({ key: q.key, section: q.section, options: q.options }));
    res.json({ suppressed: true, n, floor: SEGMENT_MIN, domains });
    return;
  }

  const rows = await db.select({ questionKey: diagnosticAnswersTable.questionKey, answer: diagnosticAnswersTable.answer })
    .from(diagnosticAnswersTable)
    .where(and(eq(diagnosticAnswersTable.surveyId, survey.id), isNotNull(diagnosticAnswersTable.answer)));

  const domains = instrument.map((q) => {
    const counts = new Array(q.options.length).fill(0);
    for (const r of rows) {
      if (r.questionKey === q.key && r.answer != null && r.answer >= 0 && r.answer < counts.length) counts[r.answer]++;
    }
    return { key: q.key, section: q.section, options: q.options, counts };
  });
  res.json({ suppressed: false, n, floor: SEGMENT_MIN, domains });
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/intake.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/__tests__/intake.test.ts
git commit -m "feat(api): intake submit (unlinkable, select-all) + n>=5-suppressed aggregate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Threshold-gated release for community tenants (TDD, regression guard)

**Files:**
- Modify: `artifacts/api-server/src/routes/communityDiagnostic.ts`
- Test: `artifacts/api-server/src/__tests__/threshold-release.test.ts`

Spec §4.4 + §6: for **community-mode** tenants the deep diagnostic + results become visible to approved members when the coalition's INTAKE count hits the release threshold (`schools.releaseThreshold`, default = the `n>=5` floor). For **whole-school** tenants (Riverside) the existing `POST /d/:slug/release` exec button stays the sole gate — the new auto-behaviour must NOT apply. Implement by computing `releasedAt` on read for community-mode surveys that have met the threshold, while leaving the manual `releasedAt` switch authoritative for whole-school.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/threshold-release.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);

// Two tenants: community (caps {}) and whole-school (caps with safeguarding on).
let commSchool: string, wsSchool: string, commSurvey: string, wsSurvey: string, commIntake: string;
let commMemberTok: string, wsMemberTok: string;

const DEEP = [{ key: "q1", section: "S", text: "Q?", type: "scale", options: ["lo", "hi"] }];
const INTAKE = [{ key: "d1", section: "PTA", text: "?", type: "multi", options: ["a", "b"] }];

function mint(userId: string, schoolId: string, role: string) {
  return jwt.sign({ userId, schoolId, role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // community tenant — release_threshold 5, capabilities {}
  const cs = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, release_threshold) VALUES ('Comm ${TAG}', 'comm-${TAG}', 5) RETURNING id`);
  commSchool = cs.rows[0].id;
  // whole-school tenant — safeguarding on
  const ws = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, capabilities) VALUES ('WS ${TAG}', 'ws-${TAG}', '{"safeguarding":true}') RETURNING id`);
  wsSchool = ws.rows[0].id;

  const cu = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','C','M',$2,'approved') RETURNING id`, [commSchool, `cm-${TAG}@t.example`]);
  const wu = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','W','M',$2,'approved') RETURNING id`, [wsSchool, `wm-${TAG}@t.example`]);
  commMemberTok = mint(cu.rows[0].id, commSchool, "parent");
  wsMemberTok = mint(wu.rows[0].id, wsSchool, "parent");

  const csv = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'Deep ${TAG}','active','deep',$2,'comm-${TAG}',$3) RETURNING id`, [commSchool, cu.rows[0].id, JSON.stringify(DEEP)]);
  commSurvey = csv.rows[0].id;
  const cintake = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'Intake ${TAG}','active','intake',$2,'comm-intake-${TAG}',$3) RETURNING id`, [commSchool, cu.rows[0].id, JSON.stringify(INTAKE)]);
  commIntake = cintake.rows[0].id;
  const wsv = await pool.query<{ id: string }>(`INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument) VALUES ($1,'WS Deep ${TAG}','active','deep',$2,'ws-${TAG}',$3) RETURNING id`, [wsSchool, wu.rows[0].id, JSON.stringify(DEEP)]);
  wsSurvey = wsv.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  for (const id of [commSchool, wsSchool]) {
    await pool.query(`DELETE FROM diagnostic_answers WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE school_id=$1)`, [id]);
    await pool.query(`DELETE FROM diagnostic_submissions WHERE survey_id IN (SELECT id FROM diagnostic_surveys WHERE school_id=$1)`, [id]);
    await pool.query(`DELETE FROM diagnostic_surveys WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM users WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM schools WHERE id=$1`, [id]);
  }
});

const intakeSubmit = (email: string) =>
  fetch(`${baseUrl}/api/intake/comm-intake-${TAG}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, selections: { d1: [0] } }) });

const results = (slug: string, tok: string) =>
  fetch(`${baseUrl}/api/d/${slug}/results`, { headers: { Authorization: `Bearer ${tok}` } });

describe("community-mode threshold release", () => {
  it("withholds the deep diagnostic below the threshold, then releases at it", async () => {
    // 0 intake submissions -> not released for the approved member
    let r = await results(`comm-${TAG}`, commMemberTok);
    expect(r.status).toBe(403);
    expect((await r.json()).released).toBe(false);
    // reach the threshold (5)
    for (const e of ["a", "b", "c", "d", "e"]) await intakeSubmit(`thr.${e}-${TAG}@t.example`);
    r = await results(`comm-${TAG}`, commMemberTok);
    expect(r.status).toBe(200);
    expect((await r.json()).released).toBe(true);
  });
});

describe("whole-school regression — manual release unchanged", () => {
  it("does NOT auto-release on threshold; member is still gated until exec releases", async () => {
    // whole-school survey has no intake-threshold behaviour and releasedAt is null
    const r = await results(`ws-${TAG}`, wsMemberTok);
    expect(r.status).toBe(403);
    expect((await r.json()).released).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/threshold-release.test.ts
```
Expected: FAIL — community case stays 403 after the threshold (auto-release not implemented yet); whole-school case already passes.

- [ ] **Step 3: Implement the threshold gate**

In `communityDiagnostic.ts`, add the `schoolsTable` + `isCommunityMode` imports (extend the existing import lines), then add a helper and call it inside the `GET /d/:slug/results` handler. Replace the released-check in `GET /d/:slug/results` (currently the `if (!isExec && survey.releasedAt == null)` block) with a threshold-aware check:

```ts
// Add to the @workspace/db import: schoolsTable
// Add a new import line:
import { isCommunityMode } from "../lib/tenant";

// Helper: has a community-mode tenant met its release threshold? Counts the
// distinct INTAKE respondents for the school against schools.releaseThreshold
// (default = the n>=5 floor). Whole-school tenants never auto-release here.
async function communityThresholdMet(school: typeof schoolsTable.$inferSelect): Promise<boolean> {
  if (!isCommunityMode(school)) return false;
  const target = school.releaseThreshold ?? SEGMENT_MIN;
  const [intake] = await db.select({ id: diagnosticSurveysTable.id }).from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.schoolId, school.id), eq(diagnosticSurveysTable.kind, "intake")));
  if (!intake) return false;
  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${diagnosticAnswersTable.responseId})::int` })
    .from(diagnosticAnswersTable).where(eq(diagnosticAnswersTable.surveyId, intake.id));
  return n >= Math.max(target, SEGMENT_MIN);
}
```

Then, inside `GET /d/:slug/results`, after loading `survey` and confirming `u.schoolId === survey.schoolId`, load the school and compute effective release:

```ts
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, survey.schoolId));
  // Effective release: the manual exec switch OR — for community-mode tenants —
  // the coalition reaching the intake threshold (spec §4.4). Whole-school tenants
  // (Riverside) ignore the threshold and keep the manual switch only (spec §6).
  const thresholdReleased = school ? await communityThresholdMet(school) : false;
  const effectivelyReleased = survey.releasedAt != null || thresholdReleased;
```

Replace the existing `if (!isExec && survey.releasedAt == null)` guard with:

```ts
  if (!isExec && !effectivelyReleased) {
    res.status(403).json({ error: "Results haven't been released yet.", released: false });
    return;
  }
```

And in the final `res.json({...})`, change `released: survey.releasedAt != null` to `released: effectivelyReleased` (leave `releasedAt: survey.releasedAt` as the manual timestamp).

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/threshold-release.test.ts
```
Expected: PASS (2 tests). Also re-run the existing diagnostic suite to confirm no regression:

```bash
pnpm exec vitest run src/__tests__/communityDiagnostic.test.ts
```
Expected: PASS (existing count unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/routes/communityDiagnostic.ts src/__tests__/threshold-release.test.ts
git commit -m "feat(api): community-tier threshold release for deep diagnostic (whole-school manual release preserved)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Invert moderation — open-join + flag/remove + report (TDD, regression guard)

**Files:**
- Modify: `artifacts/api-server/src/routes/membership.ts`
- Test: `artifacts/api-server/src/__tests__/membership-flag.test.ts`

Spec §4.3 + §6: for community tenants, members are active on open join (no pending gate), removal is a **platform-operator** action (flag/remove), and any member can **report** another. For whole-school tenants (Riverside), the existing `pending → approve/reject` queue is preserved. The platform-operator guard reuses the simplest existing mechanism: an env allowlist of operator emails (`PLATFORM_OPERATOR_EMAILS`, comma-separated) falling back to `role='admin'` — pick the env allowlist since no `admin` role exists in the JWT today (roles are pupil/parent/pta/coordinator/head_teacher/teacher/…). The JWT carries `email`, so the guard checks it.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/membership-flag.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);
const OP_EMAIL = `operator-${TAG}@cloudworkz.com`;

let commSchool: string, wsSchool: string;
let commMember: string, commReporter: string, wsPending: string;
let opTok: string, commReporterTok: string, wsExecTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  process.env.PLATFORM_OPERATOR_EMAILS = OP_EMAIL;
  const cs = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Comm ${TAG}','comm-m-${TAG}') RETURNING id`);
  commSchool = cs.rows[0].id;
  const ws = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug, capabilities) VALUES ('WS ${TAG}','ws-m-${TAG}','{"safeguarding":true}') RETURNING id`);
  wsSchool = ws.rows[0].id;

  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Mem','Ber',$2,'approved') RETURNING id`, [commSchool, `mem-${TAG}@t.example`]);
  commMember = m.rows[0].id;
  const rep = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Rep','Orter',$2,'approved') RETURNING id`, [commSchool, `rep-${TAG}@t.example`]);
  commReporter = rep.rows[0].id;
  const op = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','Op','Er',$2) RETURNING id`, [commSchool, OP_EMAIL]);
  const wp = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email, membership_status) VALUES ($1,'parent','Pend','Ing',$2,'pending') RETURNING id`, [wsSchool, `pend-${TAG}@t.example`]);
  wsPending = wp.rows[0].id;
  const wexec = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'pta','Ex','Ec',$2) RETURNING id`, [wsSchool, `exec-${TAG}@t.example`]);

  opTok = mint(op.rows[0].id, commSchool, "parent", OP_EMAIL);
  commReporterTok = mint(commReporter, commSchool, "parent", `rep-${TAG}@t.example`);
  wsExecTok = mint(wexec.rows[0].id, wsSchool, "pta", `exec-${TAG}@t.example`);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  for (const id of [commSchool, wsSchool]) {
    await pool.query(`DELETE FROM member_reports WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM users WHERE school_id=$1`, [id]);
    await pool.query(`DELETE FROM schools WHERE id=$1`, [id]);
  }
  delete process.env.PLATFORM_OPERATOR_EMAILS;
});

describe("first backer of a founder-less VOICE becomes its founder", () => {
  it("promotes the first community signup to founder (createdById set, role 'founder')", async () => {
    // Create a fresh school via the public endpoint — its advocating VOICE is
    // founder-less (created_by_id NULL, no user). The first signup must claim it.
    const cr = await fetch(`${baseUrl}/api/schools`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Founderless ${TAG}`, slug: `founderless-${TAG}` }),
    });
    expect(cr.status).toBe(201);
    const { voice } = await cr.json();
    expect(voice.id).toBeTruthy();

    // Sanity: VOICE starts founder-less.
    let v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBeNull();

    // First community signup.
    const su = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `founder-${TAG}@t.example`, password: "password123", name: "First Backer", schoolSlug: `founderless-${TAG}` }),
    });
    expect(su.status).toBe(201);
    const { user } = await su.json();

    // The VOICE now has this user as founder.
    v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBe(user.id);
    const vm = await pool.query(`SELECT role FROM voice_members WHERE voice_id=$1 AND user_id=$2`, [voice.id, user.id]);
    expect(vm.rows).toHaveLength(1);
    expect(vm.rows[0].role).toBe("founder");

    // A SECOND signup is a plain member, not a second founder.
    const su2 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `second-${TAG}@t.example`, password: "password123", name: "Second Backer", schoolSlug: `founderless-${TAG}` }),
    });
    expect(su2.status).toBe(201);
    const { user: user2 } = await su2.json();
    const vm2 = await pool.query(`SELECT role FROM voice_members WHERE voice_id=$1 AND user_id=$2`, [voice.id, user2.id]);
    expect(vm2.rows[0].role).toBe("member");
    // Founder unchanged.
    v = await pool.query(`SELECT created_by_id FROM voice_groups WHERE id=$1`, [voice.id]);
    expect(v.rows[0].created_by_id).toBe(user.id);

    // Cleanup this block's rows.
    await pool.query(`DELETE FROM voice_members WHERE voice_id=$1`, [voice.id]);
    await pool.query(`DELETE FROM voice_groups WHERE id=$1`, [voice.id]);
    await pool.query(`DELETE FROM users WHERE school_id=(SELECT id FROM schools WHERE slug=$1)`, [`founderless-${TAG}`]);
    await pool.query(`DELETE FROM schools WHERE slug=$1`, [`founderless-${TAG}`]);
  });
});

describe("community moderation — report + flag/remove", () => {
  it("any member can report another (records a report)", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commMember}/report`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${commReporterTok}` },
      body: JSON.stringify({ reason: "not a parent here" }),
    });
    expect(r.status).toBe(201);
    const rep = await pool.query(`SELECT * FROM member_reports WHERE reported_user_id=$1`, [commMember]);
    expect(rep.rows).toHaveLength(1);
    expect(rep.rows[0].status).toBe("open");
  });

  it("a platform operator can flag/remove a member", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commMember}/remove`, {
      method: "POST", headers: { Authorization: `Bearer ${opTok}` },
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id=$1`, [commMember]);
    expect(u.rows[0].membership_status).toBe("rejected");
  });

  it("a non-operator member cannot remove (403)", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${commReporter}/remove`, {
      method: "POST", headers: { Authorization: `Bearer ${commReporterTok}` },
    });
    expect(r.status).toBe(403);
  });
});

describe("whole-school regression — approve/reject queue preserved", () => {
  it("exec can still approve a pending member", async () => {
    const r = await fetch(`${baseUrl}/api/membership/${wsPending}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${wsExecTok}` },
      body: JSON.stringify({ displayMode: "named" }),
    });
    expect(r.status).toBe(200);
    const u = await pool.query(`SELECT membership_status FROM users WHERE id=$1`, [wsPending]);
    expect(u.rows[0].membership_status).toBe("approved");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/membership-flag.test.ts
```
Expected: FAIL — `/report` and `/remove` are 404; the first-backer-becomes-founder test fails (signup still inserts role `member` and leaves `created_by_id` NULL until the auth.ts edit below); the whole-school approve test already passes (existing handler unchanged).

- [ ] **Step 3: Implement report + flag/remove + the operator guard**

In `artifacts/api-server/src/routes/membership.ts`, extend imports and add the guard + two handlers. Replace the import block (lines 1–6) with:

```ts
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, notificationsTable, memberReportsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { sendEmail } from "../lib/emailHelper";
```

Add after the `EXEC` definition (line 12):

```ts
// Platform-operator guard (spec §4.6/§4.3): removal/flag is NOT a tenant power.
// Simplest mechanism available today — an env allowlist of operator emails
// (the JWT carries email). No `admin` role exists in the JWT, so email is the
// discriminator. Comma-separated PLATFORM_OPERATOR_EMAILS.
function isPlatformOperator(u: JwtPayload): boolean {
  const allow = (process.env.PLATFORM_OPERATOR_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!u.email && allow.includes(u.email.toLowerCase());
}
function platformOperatorGuard(req: any, res: any, next: any): void {
  if (!isPlatformOperator((req as any).user as JwtPayload)) {
    res.status(403).json({ error: "Platform-operator only." });
    return;
  }
  next();
}
```

Add the two handlers before `export default router;`:

```ts
// POST /api/membership/:userId/report — in-app "report this member" (spec §4.3).
// Any authed member may flag someone who isn't part of the real community. This
// RECORDS a report; it does not remove the member (removal is operator-only).
router.post("/membership/:userId/report", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : null;

  const [target] = await db.select({ id: usersTable.id })
    .from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }

  await db.insert(memberReportsTable).values({
    schoolId: u.schoolId, reportedUserId: userId, reporterUserId: u.userId, reason,
  });
  await writeAudit({ schoolId: u.schoolId, eventType: "member_reported", actor: u, targetType: "user", targetId: userId, details: { hasReason: reason != null }, req }).catch(() => {});
  res.status(201).json({ reported: true });
});

// POST /api/membership/:userId/remove — platform-operator flag/remove (spec §4.3).
// Replaces the exec approval gate for community tenants: members are active on
// join; an imposter is removed on the school's word. Sets membershipStatus
// 'rejected' (the only reachable path to rejected under open join).
router.post("/membership/:userId/remove", authMiddleware, platformOperatorGuard, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;

  const [target] = await db.select({ id: usersTable.id, schoolId: usersTable.schoolId })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ membershipStatus: "rejected" }).where(eq(usersTable.id, userId));
    await tx.update(memberReportsTable).set({ status: "actioned" })
      .where(and(eq(memberReportsTable.reportedUserId, userId), eq(memberReportsTable.status, "open")));
  });
  await writeAudit({ schoolId: target.schoolId, eventType: "member_removed", actor: u, targetType: "user", targetId: userId, details: {}, req }).catch(() => {});
  res.json({ removed: true });
});
```

Note the open-join behaviour itself (members active immediately, no pending gate) is already satisfied: signup at an open-join community tenant should create members as `approved`. For joiners, `/auth/signup` currently creates `membershipStatus: "pending"`. Adjust it so community-mode tenants admit active-on-join while whole-school tenants keep `pending`:

In `artifacts/api-server/src/routes/auth.ts`, in the `POST /auth/signup` handler, replace the user insert's `membershipStatus: "pending"` with a community-mode branch. Add `import { isCommunityMode } from "../lib/tenant";` to the imports (line 9 area), then before the insert:

```ts
  const initialMembership = isCommunityMode(school) ? "approved" : "pending";
```

and use `membershipStatus: initialMembership,` in the `.values({...})`.

**First backer becomes founder.** Replace the existing advocating-voice backing block (currently lines 500–506 in `auth.ts`) — which always inserts the new user as a `member` — with a branch that promotes the first backer of a founder-less VOICE to founder. The current block is:

```ts
  try {
    const [voice] = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
    if (voice) {
      await db.insert(voiceMembersTable).values({ voiceId: voice.id, userId: newUser.id, role: "member" }).onConflictDoNothing();
    }
  } catch (e) { console.error("[signup] backing voice failed:", e); }
```

Replace it with (select `createdById` too, and branch on founder-less):

```ts
  try {
    // Back the school's advocating VOICE. If it was created founder-less
    // (POST /api/schools, Phase 4b) and still has no founder, the FIRST backer
    // becomes the founder: set voice_groups.createdById and insert role 'founder'.
    // Otherwise the joiner is a flat member (existing behaviour).
    const [voice] = await db.select({ id: voiceGroupsTable.id, createdById: voiceGroupsTable.createdById })
      .from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
    if (voice) {
      // Claim founder only if the VOICE has no founder yet AND no founder member
      // exists (guards a race / a pre-4b VOICE that legitimately has createdById).
      let role: "founder" | "member" = "member";
      if (voice.createdById == null) {
        const [existingFounder] = await db.select({ id: voiceMembersTable.id }).from(voiceMembersTable)
          .where(and(eq(voiceMembersTable.voiceId, voice.id), eq(voiceMembersTable.role, "founder")));
        if (!existingFounder) {
          role = "founder";
          await db.update(voiceGroupsTable).set({ createdById: newUser.id }).where(eq(voiceGroupsTable.id, voice.id));
        }
      }
      await db.insert(voiceMembersTable).values({ voiceId: voice.id, userId: newUser.id, role }).onConflictDoNothing();
    }
  } catch (e) { console.error("[signup] backing voice failed:", e); }
```

(`voiceGroupsTable` and `voiceMembersTable` are already imported in `auth.ts` line 6.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run src/__tests__/membership-flag.test.ts
```
Expected: PASS (5 tests — first-backer founder, 3 community moderation, 1 whole-school regression). Re-run the existing membership/auth coverage:

```bash
pnpm exec vitest run src/__tests__/membership.test.ts 2>/dev/null || echo "(no standalone membership.test.ts — covered above)"
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/membership.ts src/routes/auth.ts src/__tests__/membership-flag.test.ts
git commit -m "feat(api): community open-join + report + platform-operator flag/remove (whole-school approve/reject preserved)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `PATCH /api/schools/:slug/capabilities` — platform-operator toggle (TDD)

**Files:**
- Modify: `artifacts/api-server/src/routes/schools.ts`
- Test: `artifacts/api-server/src/__tests__/capabilities-patch.test.ts`

Spec §4.6: a platform-operator-only switch to flip caps without raw SQL. Tenants stay read-only. Reuse the same `PLATFORM_OPERATOR_EMAILS` env-allowlist guard pattern (defined in Task 7; here re-declared locally in `schools.ts` to keep the route self-contained, or import a shared helper — define it once in `lib/auth.ts` and import in both routers).

- [ ] **Step 1: Extract the operator guard to `lib/auth.ts`**

In `artifacts/api-server/src/lib/auth.ts`, append after `requireRole`:

```ts
/** Platform-operator allowlist (spec §4.6) — env PLATFORM_OPERATOR_EMAILS. */
export function isPlatformOperator(payload: JwtPayload): boolean {
  const allow = (process.env.PLATFORM_OPERATOR_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!payload.email && allow.includes(payload.email.toLowerCase());
}

export function requirePlatformOperator(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as JwtPayload;
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  if (!isPlatformOperator(user)) { res.status(403).json({ error: "Platform-operator only." }); return; }
  next();
}
```

Then in `membership.ts` (Task 7) replace the local `isPlatformOperator`/`platformOperatorGuard` with `import { isPlatformOperator, requirePlatformOperator } from "../lib/auth";` and use `requirePlatformOperator` as the guard. (Do this refactor now; re-run Task 7's test to confirm green.)

- [ ] **Step 2: Write the failing test**

Create `artifacts/api-server/src/__tests__/capabilities-patch.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

let server: Server;
let baseUrl: string;
const TAG = Date.now().toString(36);
const OP_EMAIL = `op-cap-${TAG}@cloudworkz.com`;
let schoolId: string, opTok: string, memberTok: string;

function mint(userId: string, schoolId: string, role: string, email?: string) {
  return jwt.sign({ userId, schoolId, role, email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  process.env.PLATFORM_OPERATOR_EMAILS = OP_EMAIL;
  const s = await pool.query<{ id: string }>(`INSERT INTO schools (name, slug) VALUES ('Cap ${TAG}','cap-${TAG}') RETURNING id`);
  schoolId = s.rows[0].id;
  const op = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','Op','X',$2) RETURNING id`, [schoolId, OP_EMAIL]);
  const m = await pool.query<{ id: string }>(`INSERT INTO users (school_id, role, first_name, last_name, email) VALUES ($1,'parent','M','X',$2) RETURNING id`, [schoolId, `mem-cap-${TAG}@t.example`]);
  opTok = mint(op.rows[0].id, schoolId, "parent", OP_EMAIL);
  memberTok = mint(m.rows[0].id, schoolId, "parent", `mem-cap-${TAG}@t.example`);
  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM users WHERE school_id=$1`, [schoolId]);
  await pool.query(`DELETE FROM schools WHERE id=$1`, [schoolId]);
  delete process.env.PLATFORM_OPERATOR_EMAILS;
});

const patch = (tok: string, caps: unknown) =>
  fetch(`${baseUrl}/api/schools/cap-${TAG}/capabilities`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ capabilities: caps }),
  });

describe("PATCH /api/schools/:slug/capabilities", () => {
  it("lets a platform operator flip whole-school caps", async () => {
    const r = await patch(opTok, { safeguarding: true });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.capabilities.safeguarding).toBe(true);
    expect(body.capabilities.voice).toBe(true); // unchanged default
    const row = await pool.query(`SELECT capabilities FROM schools WHERE id=$1`, [schoolId]);
    expect(row.rows[0].capabilities.safeguarding).toBe(true);
  });

  it("403s a non-operator tenant member", async () => {
    expect((await patch(memberTok, { safeguarding: true })).status).toBe(403);
  });

  it("400s an unknown capability key", async () => {
    expect((await patch(opTok, { teleport: true })).status).toBe(400);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
pnpm exec vitest run src/__tests__/capabilities-patch.test.ts
```
Expected: FAIL — route not defined (404).

- [ ] **Step 4: Implement the PATCH handler**

In `artifacts/api-server/src/routes/schools.ts`, add `CAPABILITY_KEYS`, `resolveCapabilities` to the tenant import and `requirePlatformOperator` to the auth import:

```ts
import { tenantPublicView, resolveCapabilities } from "../lib/tenant";
import { CAPABILITY_KEYS } from "../lib/tenant";
import { authMiddleware, requireRole, requirePlatformOperator, type JwtPayload } from "../lib/auth";
```

Add the handler after `POST /schools`:

```ts
// PATCH /api/schools/:slug/capabilities (spec §4.6) — platform-operator only.
// Merges the provided overrides into schools.capabilities (stored as the sparse
// override map; defaults still resolve over CAPABILITY_DEFAULTS). Tenants are
// read-only and never reach this. Body: { capabilities: { <key>: boolean } }.
router.patch("/schools/:slug/capabilities", authMiddleware, requirePlatformOperator, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const incoming = req.body?.capabilities;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    res.status(400).json({ error: "capabilities object required." });
    return;
  }
  const valid = new Set<string>(CAPABILITY_KEYS as readonly string[]);
  const overrides: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!valid.has(k)) { res.status(400).json({ error: `Unknown capability: ${k}` }); return; }
    if (typeof v !== "boolean") { res.status(400).json({ error: `Capability ${k} must be boolean.` }); return; }
    overrides[k] = v;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.slug, slug));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const merged = { ...(school.capabilities && typeof school.capabilities === "object" ? school.capabilities as Record<string, boolean> : {}), ...overrides };
  const [updated] = await db.update(schoolsTable).set({ capabilities: merged }).where(eq(schoolsTable.id, school.id)).returning();

  await writeAudit({ schoolId: school.id, eventType: "capabilities_updated", actor: u, targetType: "school", targetId: school.id, details: { overrides }, req }).catch(() => {});
  res.json({ slug, capabilities: resolveCapabilities(updated.capabilities) });
});
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm exec vitest run src/__tests__/capabilities-patch.test.ts src/__tests__/membership-flag.test.ts
```
Expected: PASS (capabilities 3 tests + membership 4 tests, confirming the guard refactor didn't break Task 7).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/routes/schools.ts src/routes/membership.ts src/__tests__/capabilities-patch.test.ts
git commit -m "feat(api): PATCH /api/schools/:slug/capabilities behind platform-operator guard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: OpenAPI additions + codegen

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Add the paths** (place next to the existing `/d/{slug}` entries; inline schemas matching the repo convention)

```yaml
  /schools:
    post:
      operationId: createSchool
      tags: [schools]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
                slug: { type: string }
                coalitionName: { type: string }
                contactName: { type: string }
                contactEmail: { type: string }
                contactPhone: { type: string }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                type: object
                required: [school, voice]
                properties:
                  school:
                    type: object
                    required: [id, slug, displayName, capabilities]
                    properties:
                      id: { type: string }
                      slug: { type: string }
                      displayName: { type: string }
                      contactName: { type: string, nullable: true }
                      theme: { type: object, additionalProperties: true }
                      capabilities: { type: object, additionalProperties: { type: boolean } }
                  voice:
                    type: object
                    required: [id, name, status]
                    properties:
                      id: { type: string }
                      name: { type: string }
                      status: { type: string }
        "400": { description: Invalid }
        "409": { description: Slug or school already exists }
  /schools/{slug}/capabilities:
    patch:
      operationId: patchSchoolCapabilities
      tags: [schools]
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
              required: [capabilities]
              properties:
                capabilities: { type: object, additionalProperties: { type: boolean } }
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema:
                type: object
                required: [slug, capabilities]
                properties:
                  slug: { type: string }
                  capabilities: { type: object, additionalProperties: { type: boolean } }
        "400": { description: Invalid }
        "403": { description: Platform-operator only }
        "404": { description: Not found }
  /intake/{slug}/submit:
    post:
      operationId: submitIntake
      tags: [intake]
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
              required: [email, selections]
              properties:
                email: { type: string }
                selections:
                  type: object
                  additionalProperties:
                    type: array
                    items: { type: integer }
      responses:
        "201":
          description: Counted
          content:
            application/json:
              schema:
                type: object
                required: [counted, n]
                properties:
                  counted: { type: boolean }
                  n: { type: integer }
        "400": { description: Invalid }
        "404": { description: Not found }
        "409": { description: Already taken part }
  /intake/{slug}/aggregate:
    get:
      operationId: getIntakeAggregate
      tags: [intake]
      security: []
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Aggregate (suppressed below n>=5)
          content:
            application/json:
              schema:
                type: object
                required: [suppressed, n, floor, domains]
                properties:
                  suppressed: { type: boolean }
                  n: { type: integer }
                  floor: { type: integer }
                  domains:
                    type: array
                    items:
                      type: object
                      # The domain/option SHAPE is always present (the intake form
                      # reads it); `counts` is omitted/null while suppressed (n<5),
                      # so it is NOT required and is nullable.
                      required: [key, section, options]
                      properties:
                        key: { type: string }
                        section: { type: string }
                        options: { type: array, items: { type: string } }
                        counts: { type: array, items: { type: integer }, nullable: true }
        "404": { description: Not found }
  /membership/{userId}/report:
    post:
      operationId: reportMember
      tags: [membership]
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                reason: { type: string }
      responses:
        "201":
          description: Reported
          content:
            application/json:
              schema:
                type: object
                required: [reported]
                properties:
                  reported: { type: boolean }
        "404": { description: Not found }
  /membership/{userId}/remove:
    post:
      operationId: removeMember
      tags: [membership]
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Removed
          content:
            application/json:
              schema:
                type: object
                required: [removed]
                properties:
                  removed: { type: boolean }
        "403": { description: Platform-operator only }
        "404": { description: Not found }
```

- [ ] **Step 2: Codegen**

```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: no errors; generates the hooks `useCreateSchool`, `usePatchSchoolCapabilities`, `useSubmitIntake`, `useGetIntakeAggregate`, `useReportMember`, `useRemoveMember` into `lib/api-client-react/src/generated/` (exported via `lib/api-client-react/src/index.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/api-spec lib/api-client-react lib/api-zod
git commit -m "feat(api-spec): Phase 4b endpoints (createSchool, capabilities, intake, membership report/remove) + hooks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Frontend — find-or-start, intake UI, share card, first-data wiring

**Files:**
- Modify: `artifacts/safeschool/src/pages/find-school.tsx`
- Create: `artifacts/safeschool/src/pages/intake.tsx`
- Create: `artifacts/safeschool/src/components/home/ShareSchoolCard.tsx`
- Create: `artifacts/safeschool/src/components/home/FirstDataSection.tsx`
- Modify: `artifacts/safeschool/src/pages/community-home.tsx`
- Modify: `artifacts/safeschool/src/App.tsx`
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts` (null-safe founder in the public-VOICE serializer)
- Modify: `artifacts/safeschool/src/pages/voice-public.tsx` (null-safe "Started by …")

- [ ] **Step 1: Replace the "request to create" form with a real create-school flow in `find-school.tsx`**

Swap `useRequestSchoolCreate` for `useCreateSchool`, add an editable slug + contact fields, and on success route to `/join/:slug` so the creator signs up (flat parent) against the new school. Replace the import on line 2 and the create-request block (lines 12–31 state + lines 80–119 markup):

```tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { useSearchSchools, useCreateSchool } from "@workspace/api-client-react";
import { AppShell } from "@/components/layout/AppShell";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

// Naive client-side slug preview; the server derives the authoritative unique slug.
function previewSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
}

export default function FindSchoolPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const qStr = query.trim();
  const search = useSearchSchools({ q: qStr }, { query: { enabled: qStr.length > 0 } });

  const createSchool = useCreateSchool();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  const results = (search.data as any)?.schools as
    | Array<{ slug?: string | null; name: string; hasVibes: boolean }>
    | undefined;

  const effectiveSlug = slugTouched ? slug : previewSlug(name);

  const onCreate = async () => {
    setCreateErr(null);
    try {
      const res = (await createSchool.mutateAsync({
        data: {
          name: name.trim(),
          slug: effectiveSlug || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
        },
      })) as any;
      // Creator now signs up (flat role=parent) at the new school's join page.
      setLocation(`/join/${res.school.slug}`);
    } catch (e: any) {
      setCreateErr(e?.data?.error ?? "Couldn't start your school — please try again.");
    }
  };
```

Then in the JSX, keep the search card unchanged and replace the "Can't find your school?" card with:

```tsx
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Can't find your school? Start one</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You're not creating an admin account — you're starting the parent coalition for your school.
          Everyone who joins has the same right: to share and grow it.
        </p>
        <div className="mt-4 space-y-2">
          <input
            className={inputCls}
            placeholder="Your school's name"
            aria-label="Your school's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="block text-xs text-muted-foreground">
            Web address
            <div className="mt-1 flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/join/</span>
              <input
                className={inputCls}
                aria-label="Web address slug"
                value={effectiveSlug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
              />
            </div>
          </label>
          <input
            className={inputCls}
            placeholder="School / PTA contact name (optional)"
            aria-label="School or PTA contact name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <input
            className={inputCls}
            type="email"
            placeholder="School / PTA contact email (optional)"
            aria-label="School or PTA contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        {createErr && <p className="mt-3 text-sm text-destructive">{createErr}</p>}
        <button
          type="button"
          disabled={!name.trim() || createSchool.isPending}
          onClick={onCreate}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {createSchool.isPending ? "Starting…" : `Start the coalition for ${name.trim() || "your school"}`}
        </button>
      </div>
```

- [ ] **Step 2: Create the intake page**

Create `artifacts/safeschool/src/pages/intake.tsx`. Multiple-choice, select-all checkboxes per domain, submitted via `useSubmitIntake`. AppShell-wrapped, SSR-safe (no top-level browser globals; plain elements, no framer enter-animations). The intake survey shares the school slug; resolve it from `useTenant`:

```tsx
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useGetIntakeAggregate, useSubmitIntake } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { AppShell } from "@/components/layout/AppShell";

// Phase 4b (spec §4.4): the short multiple-choice sign-up intake. Select-all
// across the three fixed domains. The aggregate it feeds is the community's
// first data. We read the instrument shape from the aggregate's `domains`
// (server-authoritative); the aggregate ALWAYS returns the domain/option shape
// — even when suppressed (n<5) — so the form renders for the first families too.
// Only the per-option `counts` are gated by suppression.
export default function IntakePage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const slug = tenant?.slug ?? (user as any)?.tenant?.slug ?? "";

  // The aggregate doubles as the instrument source (domains + options are always
  // returned, even when suppressed=true).
  const agg = useGetIntakeAggregate(slug, { query: { enabled: !!slug } as any });
  const submit = useSubmitIntake();
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const domains = ((agg.data as any)?.domains ?? []) as Array<{ key: string; section: string; options: string[] }>;
  const email = user?.email ?? "";

  const toggle = (key: string, idx: number) =>
    setSelections((p) => {
      const cur = p[key] ?? [];
      return { ...p, [key]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });

  const onSubmit = async () => {
    setErr(null);
    try {
      await submit.mutateAsync({ slug, data: { email, selections } });
      setDone(true);
      setLocation("/");
    } catch (e: any) {
      setErr(e?.data?.error ?? (e?.response?.status === 409 ? "You've already completed the intake." : "Something went wrong — please try again."));
    }
  };

  if (!slug) {
    return <AppShell><div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-foreground">A quick pulse — 1 minute</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick anything that matches your experience. Your answers are anonymous and can't be traced
          back to you, even by us. They add to the community's first picture.
        </p>
        <div className="mt-8 space-y-8">
          {domains.map((d) => (
            <div key={d.key}>
              <h2 className="font-display text-lg font-bold text-foreground">{d.section}</h2>
              <div className="mt-3 space-y-2">
                {d.options.map((opt, i) => {
                  const checked = (selections[d.key] ?? []).includes(i);
                  return (
                    <button
                      key={`${d.key}-${i}`}
                      type="button"
                      onClick={() => toggle(d.key, i)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                        {checked ? "✓" : ""}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        <button
          type="button"
          disabled={!email || submit.isPending || done}
          onClick={onSubmit}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending ? "Submitting…" : "Add my pulse"}
        </button>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Create the share card**

Create `artifacts/safeschool/src/components/home/ShareSchoolCard.tsx`. "Tell your school" — a ready-to-send message + the `/v/:id` link, with WhatsApp / copy / mailto actions (mailto pre-addressed to the captured contact when available). The in-app notification stub is the server-side `notifications` row written on create-school in a future pass; here the card is the user-facing surface. SSR-safe (guard `navigator`/`window`):

```tsx
import { useState } from "react";
import { useTenant } from "@/providers/tenant";
import { useListVoice } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Share2, Copy, Check } from "lucide-react";

// Phase 4b (spec §4.2): "Tell your school" — share the /v/:id coalition link.
// Sharing-to-the-school IS the flat "build the coalition" action. WhatsApp / copy
// / mailto. Pre-addresses the captured school contact via mailto when present.
export function ShareSchoolCard() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListVoice({ query: { enabled: !!cap.voice } as any });
  const [copied, setCopied] = useState(false);
  if (!cap.voice) return null;

  const voices = (q.data as any)?.voices ?? [];
  const lead = voices.find((v: any) => v.status === "advocating") ?? voices[0];
  if (!lead) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/v/${lead.id}`;
  const name = tenant?.displayName ?? "our school";
  const msg = `A parent coalition is forming for ${name}. Join us — every family makes the picture clearer: ${link}`;

  const copy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const mail = `mailto:?subject=${encodeURIComponent(`A parent coalition for ${name}`)}&body=${encodeURIComponent(msg)}`;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Share2 size={20} className="text-primary" aria-hidden /> Tell your school
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{msg}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={wa} target="_blank" rel="noreferrer" className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">Share on WhatsApp</a>
            <a href={mail} className="rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-foreground">Email the school</a>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-foreground">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 4: Create the first-data section**

Create `artifacts/safeschool/src/components/home/FirstDataSection.tsx`. Shows the intake aggregate (or the n>=5 suppression message) + threshold-progress messaging. Gates on `cap.diagnostic`:

```tsx
import { useTenant } from "@/providers/tenant";
import { useGetIntakeAggregate } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { BarChart3 } from "lucide-react";

// Phase 4b (spec §4.4): the community's FIRST DATA — the intake aggregate, with
// the n>=5 suppression honoured, plus threshold-progress messaging toward the
// deep-diagnostic release. Copy is placeholder (end-of-redesign content audit).
export function FirstDataSection() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const slug = tenant?.slug ?? "";
  const q = useGetIntakeAggregate(slug, { query: { enabled: !!slug && !!cap.diagnostic } as any });
  if (!cap.diagnostic || !slug) return null;

  const data = q.data as any;
  if (!data) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <BarChart3 size={20} className="text-primary" aria-hidden /> The first picture
      </h2>
      <Card>
        <CardContent className="p-5">
          {data.suppressed ? (
            <p className="text-sm text-muted-foreground">
              {data.n} {data.n === 1 ? "family has" : "families have"} added their pulse. Once {data.floor}{" "}
              families have taken part, the community's first picture appears here — and the full
              diagnostic unlocks for everyone.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">{data.n} families have added their pulse.</p>
              {data.domains.map((d: any) => (
                <div key={d.key}>
                  <p className="text-sm font-semibold text-foreground">{d.section}</p>
                  <ul className="mt-1 space-y-1">
                    {d.options.map((opt: string, i: number) => (
                      <li key={`${d.key}-${i}`} className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{opt}</span>
                        <span className="font-semibold text-foreground">{d.counts[i]}</span>
                      </li>
                    ))}
                  </ul>
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

- [ ] **Step 5: Wire the new sections into `community-home.tsx`**

Add the imports and render `FirstDataSection` + `ShareSchoolCard` into the section list (after `VoiceSection`):

```tsx
import { ShareSchoolCard } from "@/components/home/ShareSchoolCard";
import { FirstDataSection } from "@/components/home/FirstDataSection";
```

In the returned section list, after `<VoiceSection />`:

```tsx
      <ShareSchoolCard />
      <FirstDataSection />
```

- [ ] **Step 6: Add the `/intake` route in `App.tsx`**

Add the import next to the other page imports (near line 80):

```tsx
import IntakePage from "@/pages/intake";
```

Add a protected route (the member is authed at this point) inside the authed `Router()` switch — place it next to the `/membership` route (line ~331). Intake resolves the tenant from the authed user, so it does not need a `:slug` param:

```tsx
      <Route path="/intake">{() => <ProtectedRoute component={IntakePage} />}</Route>
```

- [ ] **Step 6b: Null-safe founder display (founder-less VOICE)**

A Phase-4b VOICE is created founder-less (`createdById` NULL) until the first backer signs up (Task 7). Both the public-VOICE serializer and the "Started by …" UI must be null-safe or a freshly-started school's `/v/:id` page breaks.

**Backend — `artifacts/api-server/src/routes/voiceGroups.ts`** (the `GET /voice/:id` public handler, ~line 342). It currently `.innerJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))`, which returns ZERO rows when `createdById` is NULL → the page 404s. Change the inner join to a left join and make `startedBy` null-safe:

```ts
// change:
.innerJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))
// to:
.leftJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))
```

and the `startedBy` field in the response:

```ts
    startedBy: g.createdByFirst
      ? memberDisplayName(
          { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
          false,
        )
      : null, // founder-less VOICE (no creator yet) — UI renders "the community"
```

**Frontend — `artifacts/safeschool/src/pages/voice-public.tsx`** (line 63). Guard the display so a null founder reads as "the community" rather than "Started by null":

```tsx
// change:
              <span>Started by {v.startedBy}</span>
// to:
              <span>Started by {v.startedBy ?? "the community"}</span>
```

(Any other "Started by {founder}" surface that reads this field gets the same `?? "the community"` guard.)

- [ ] **Step 7: Build the front-end (preserve the demo worker)**

```bash
cd ~/dev/safe-skoolz/artifacts/safeschool
test -f dist/public/_worker.js && cp dist/public/_worker.js /tmp/_worker.js.bak || true
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/safeschool build
test -f /tmp/_worker.js.bak && cp /tmp/_worker.js.bak dist/public/_worker.js || true
```
Expected: `✓ built`, prerender lines print, worker restored.

- [ ] **Step 8: Verify in the browser (both tenants — spec §6)**

Start the server, then with the preview tooling:
- **Morna (community):** `/find-school` → "Start the coalition for {name}" with an editable slug → lands on `/join/:slug` → sign up → `/intake` renders 3 domains of checkboxes → submit → community home shows `ShareSchoolCard` + the suppressed/visible first-data section. Confirm WhatsApp/mailto/copy actions work and no console errors (`preview_console_logs`).
- **Riverside (whole-school):** confirm the existing membership-queue approve flow and manual results release still render and work (no flag/remove surface, no auto-release).

- [ ] **Step 9: Commit**

```bash
git add artifacts/safeschool/src artifacts/api-server/src/routes/voiceGroups.ts
git commit -m "feat(web): find-or-start create-school, intake UI, share card, first-data + threshold messaging; null-safe founder-less VOICE

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Riverside slug backfill

**Files:** none (data step; local + recorded for prod in Task 12).

Spec §4.1/§6: Riverside's slug is NULL, which breaks `/s/:slug` + results links. Backfill it to `riverside`. (Riverside is the local demo school; Morna is prod. This is the local equivalent; the prod-rollout section records the same UPDATE for completeness, though prod's Morna already has `slug='morna'`.)

- [ ] **Step 1: Backfill locally**

```bash
cd ~/dev/safe-skoolz && set -a; . ./.env; set +a
psql "$DATABASE_URL" -c "UPDATE schools SET slug='riverside' WHERE slug IS NULL AND name ILIKE '%riverside%';"
psql "$DATABASE_URL" -c "SELECT name, slug FROM schools WHERE name ILIKE '%riverside%';"
```
Expected: Riverside row now shows `slug = riverside`. If multiple NULL-slug schools exist, scope the WHERE to the exact name to avoid a unique-constraint clash.

- [ ] **Step 2: Verify the demo still resolves**

In the browser, confirm `/s/riverside` (or the results link guarded in `ResultsSection`) resolves now that the slug is set.

No commit (data change). Recorded as DDL in Task 12.

---

### Task 12: Prod rollout (gated on Tom)

**Files:** none (ops). Per Tom's rule, the deploy push is gated on Tom: apply the DDL via the Railway Data box **before** `git push` (Railway auto-deploys on push). Statements are additive (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`) plus one constraint-relaxing `ALTER COLUMN … DROP NOT NULL` (never tightening — safe, and a no-op if re-run) — all safe to run one at a time.

- [ ] **Step 1 [TOM]: Apply the schema DDL via the Railway Data box (prod Morna DB)**

Open the Railway project → the Morna Postgres service → **Data** → SQL editor. Run, one statement at a time (verify success after each):

```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_name varchar(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_email varchar(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS release_threshold integer;

-- Founder-less advocating VOICE: founder assigned at /join/:slug signup.
-- (Idempotent: re-running DROP NOT NULL on an already-nullable column is a no-op.)
ALTER TABLE voice_groups ALTER COLUMN created_by_id DROP NOT NULL;

ALTER TABLE diagnostic_surveys ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'deep';

CREATE TABLE IF NOT EXISTS member_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  reported_user_id uuid NOT NULL REFERENCES users(id),
  reporter_user_id uuid REFERENCES users(id),
  reason text,
  status varchar(20) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_reports_school ON member_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_member_reports_reported ON member_reports(reported_user_id);
```

- [ ] **Step 2 [TOM]: Riverside slug backfill (prod — only if a Riverside row exists in prod)**

Prod is Morna-only by design; Riverside lives on Tom's local demo DB. Run this **only** if a NULL-slug Riverside row exists in prod:

```sql
UPDATE schools SET slug = 'riverside' WHERE slug IS NULL AND name ILIKE '%riverside%';
```

(Local equivalent already applied in Task 11, Step 1.)

- [ ] **Step 3 [TOM]: Set the platform-operator env var**

In the Railway api-server service variables, add:

```
PLATFORM_OPERATOR_EMAILS=tom@cloudworkz.com
```

(Comma-separate to add more operators. Without it, no one can flag/remove or PATCH capabilities — by design.)

- [ ] **Step 4 [TOM]: Optionally seed Morna's intake survey + release threshold**

So the intake aggregate and threshold-release have a survey to read. Via the Data box (Morna's `school_id` + an existing `created_by` user id, e.g. the chair):

```sql
INSERT INTO diagnostic_surveys (school_id, title, status, kind, created_by, public_slug, instrument)
SELECT s.id, 'Morna intake', 'active', 'intake', u.id, 'morna-intake', '<INTAKE_INSTRUMENT_JSON>'::jsonb
FROM schools s, users u
WHERE s.slug = 'morna' AND u.school_id = s.id AND u.role = 'pta'
LIMIT 1
ON CONFLICT (public_slug) DO NOTHING;

UPDATE schools SET release_threshold = 5 WHERE slug = 'morna';
```

Where `<INTAKE_INSTRUMENT_JSON>` is the serialized `INTAKE_INSTRUMENT` array from `artifacts/api-server/src/lib/intakeInstrument.ts` (paste the JSON form). Tom signs off the placeholder option wording first (spec §8/§9 gate).

- [ ] **Step 5 [TOM]: Push to deploy**

After the DDL is applied and verified:

```bash
git push
```
Railway auto-deploys `feat/unified-app`. Smoke-test:

```bash
curl -s https://<prod-url>/api/intake/morna-intake/aggregate | python3 -m json.tool
```
Expected: `{ "suppressed": true, "n": 0, "floor": 5, "domains": [...] }` (3 domains returned).

---

## Self-review

**(a) Spec coverage — every spec section maps to a task:**
- §4.1 create tenant find-or-start, slug policy, contact capture → **Task 1** (columns + nullable `voice_groups.created_by_id`), **Task 2** (slugify), **Task 3** (POST /api/schools — school + founder-less advocating VOICE, NO user; contact = SCHOOL contact), **Task 10** (find-or-start UI).
- §4.1 Riverside slug backfill → **Task 11** (local) + **Task 12 Step 2** (prod).
- §4.2 join + share (= invite), "tell your school" card, in-app notification stub → **Task 10 Step 3** (ShareSchoolCard); signup auto-backs the VOICE (existing `auth.ts`, extended in Task 7 with the membership branch + first-backer-becomes-founder).
- §4.3 verification = flag, not gate; open-join; report affordance; platform-operator removal; regression-guarded → **Task 1** (member_reports), **Task 7** (open-join branch + report + flag/remove + whole-school regression).
- §4.4 short multiple-choice intake (3 domains), first-data aggregate (always returns the domain/option shape; per-option counts gated by n>=5 suppression), threshold-gated deep diagnostic, community vs whole-school release → **Task 1** (kind, release_threshold), **Task 4** (intake instrument), **Task 5** (intake submit + aggregate), **Task 6** (threshold release + regression), **Task 10** (intake UI + FirstDataSection).
- §4.5 NO caretaker-Chair / parent→exec / formal adoption → explicitly excluded; baked into the header constraints. The creator becomes the VOICE *founder* (the flat first-backer role, not an exec) at `/join/:slug` signup (Task 7); **no task implements parent→exec promotion.**
- §4.6 platform-operator capability toggle, tenants read-only → **Task 8** (PATCH + guard); read-only view is the existing `tenantPublicView` (unchanged).
- §4.7 "How it works" coalition explainer → an existing `/how-it-works` + `/how-vbe-works` page is already routed; spec §4.7 final teaching copy is Tom-owned (content audit) and explicitly deferred — **NOT mapped to a build task** (see open items below).
- §5 data flow (acceptance test) → exercised end-to-end by Tasks 3/5/6/10 + the §6 browser verification in Task 10 Step 8.
- §6 regression guard → **Task 6** (release branch) + **Task 7** (membership branch) each test BOTH community and whole-school paths; Task 10 Step 8 verifies both in-browser.
- §7 prod rollout (additive DDL via Railway before push) → **Task 12**.

**(b) No placeholders:** every code step contains real code. The only intentional placeholders are the intake OPTION WORDING (spec §4.4 mandates Tom-owned wording; clearly marked in `intakeInstrument.ts`) and teaching copy (spec defers it) — these are spec-mandated content gates, not implementation gaps.

**(c) Type/name consistency:** `contactName`/`contactEmail`/`releaseThreshold` (Task 1) match the POST handler (Task 3), threshold helper (Task 6), and OpenAPI (Task 9). `kind: "intake"|"deep"` consistent across Tasks 1/5/6. `isCommunityMode` (Task 4) used identically in Tasks 6 and 7. `PLATFORM_OPERATOR_EMAILS` + `requirePlatformOperator` defined once in `lib/auth.ts` (Task 8 Step 1) and used in both `membership.ts` (Task 7, refactored in Task 8) and `schools.ts` (Task 8). Hook names `useCreateSchool`/`usePatchSchoolCapabilities`/`useSubmitIntake`/`useGetIntakeAggregate`/`useReportMember`/`useRemoveMember` (Task 9 operationIds) match the frontend imports (Task 10). `member_reports` columns match the schema (Task 1), the handlers (Task 7), and the prod DDL (Task 12). Intake answer model (one row per selected index, sentinel `__none__`/`-1` for empty) is consistent between submit and aggregate (Task 5) and the threshold count (Task 6, which counts distinct `responseId` so the sentinel still counts the respondent).

**Founder model (FIX 1) consistency:** `voice_groups.createdById` is nullable in the schema (Task 1 Step 1b), the local + prod DDL (Task 1 Step 5 / Task 12 Step 1), and the verify step. `POST /api/schools` (Task 3) inserts the VOICE with `createdById: null` and creates NO user; its test asserts the founder-less VOICE + zero users. `/auth/signup` (Task 7) sets `createdById` and inserts a `founder` voice_member for the first backer of a founder-less VOICE (else `member`); its test (membership-flag) asserts first→founder, second→member. The public-VOICE serializer (`voiceGroups.ts`, Task 10 Step 6b) uses a `leftJoin` and returns `startedBy: null` for a founder-less VOICE; `voice-public.tsx` renders `?? "the community"`. `VOICE_MEMBER_ROLES` (`founder`/`member`) is unchanged and matches all role inserts.

**Aggregate shape (FIX 2) consistency:** `/intake/:slug/aggregate` (Task 5) ALWAYS returns `domains` with `{ key, section, options }`; `counts` is present only when `!suppressed` (omitted while suppressed). The Task 5 test asserts the shape is present in both states and `counts` is absent while suppressed. The OpenAPI domain object (Task 9) drops `counts` from `required` and marks it `nullable`. The intake form (Task 10 `intake.tsx`) reads `domains` for rendering (shape always present — corrected comment), and `FirstDataSection` (Task 10) reads `d.counts[i]` only in the `!data.suppressed` branch. The submit→aggregate→threshold count expressions still agree on `count(distinct responseId)`.

**Consistency fixes applied during review:** (1) the threshold helper counts distinct `responseId` (not answer rows), so a respondent who selected nothing (sentinel row) still counts toward the threshold and the aggregate `n` — matching the aggregate's `count(distinct responseId)`; identical expressions in Tasks 5 and 6. (2) The public-VOICE serializer's `innerJoin` on `createdById` would have 404'd a founder-less VOICE — changed to `leftJoin` + null-safe `startedBy` (Task 10 Step 6b) so a freshly-started school's `/v/:id` page renders before its first signup.

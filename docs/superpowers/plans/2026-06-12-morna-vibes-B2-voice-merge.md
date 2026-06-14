# Morna Vibes B2 — VOICE → PTA merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `POST /voice/:id/convert` so merging a VOICE into the PTA is gated on a claimed PTA, runs transactionally, and carries the VOICE's mission over as a `pta_initiative` linked via `originVoiceId` — then surface the merge result in the VOICE page.

**Architecture:** A single bounded change to one existing handler (`artifacts/api-server/src/routes/voiceGroups.ts`), wrapped in `db.transaction`. No new tables, no schema migration — `schools.ptaClaimedAt` (B1), `pta_members`, and `pta_initiatives.originVoiceId` already exist. The OpenAPI response gains an `initiative` object; orval regenerates the typed client. The frontend (`voice.tsx`) shows a success line and surfaces the new 409.

**Tech Stack:** Express + Drizzle ORM (Postgres), vitest (server on `app.listen(0)`, raw `pg` pool seeding, `fetch`, `signToken`), OpenAPI + orval codegen, React + wouter + generated react-query hooks.

**Spec:** `docs/superpowers/specs/2026-06-12-morna-vibes-B2-voice-merge-design.md`

**Before running backend tests** (every task that runs them):
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a
```
Local Postgres must be up (see `LOCAL_DEV.md`). The repo currently has **144 api-server tests green** — keep them green.

---

### Task 1: Backend — claim gate + transactional convert + mission→initiative

**Files:**
- Test: `artifacts/api-server/src/__tests__/voiceMerge.test.ts` (create)
- Modify: `artifacts/api-server/src/routes/voiceGroups.ts` (imports + the `POST /voice/:id/convert` handler, currently lines 240–282)

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/__tests__/voiceMerge.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { pool } from "@workspace/db";
import { signToken } from "../lib/auth";

let server: Server; let baseUrl: string;
let schoolId: string; let adminTok: string; let parentTok: string;
let voiceId: string;
let founderId: string; let memberId: string; let existingId: string;
const stamp = Date.now();

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";
  // School starts UNCLAIMED (pta_claimed_at null) so we can test the gate.
  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name, slug) VALUES ('Merge Test', 'merge-${stamp}') RETURNING id`);
  schoolId = sch.rows[0].id;

  const admin = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'pta','Ad','Min',$2,true) RETURNING id`,
    [schoolId, `merge-admin-${stamp}@example.com`]);
  adminTok = signToken({ userId: admin.rows[0].id, schoolId, role: "pta" });

  const founder = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Fa','Under',$2,true) RETURNING id`,
    [schoolId, `merge-founder-${stamp}@example.com`]);
  founderId = founder.rows[0].id;
  parentTok = signToken({ userId: founderId, schoolId, role: "parent" });

  const member = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Me','Mber',$2,true) RETURNING id`,
    [schoolId, `merge-member-${stamp}@example.com`]);
  memberId = member.rows[0].id;

  const existing = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, role, first_name, last_name, email, active) VALUES ($1,'parent','Ex','Isting',$2,true) RETURNING id`,
    [schoolId, `merge-existing-${stamp}@example.com`]);
  existingId = existing.rows[0].id;
  // This backer is ALREADY on the PTA roster — convert must skip them.
  await pool.query(
    `INSERT INTO pta_members (school_id, user_id, tier, status) VALUES ($1,$2,'general_membership','active')`,
    [schoolId, existingId]);

  // The "Morna Vibes Test" VOICE, advocating, with 3 backers.
  const v = await pool.query<{ id: string }>(
    `INSERT INTO voice_groups (school_id, name, mission, created_by_id, status) VALUES ($1,'Morna Vibes Test','Get the school to adopt VBE and the PTA to adopt the operating structure.',$2,'advocating') RETURNING id`,
    [schoolId, founderId]);
  voiceId = v.rows[0].id;
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'founder')`, [voiceId, founderId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, memberId]);
  await pool.query(`INSERT INTO voice_members (voice_id, user_id, role) VALUES ($1,$2,'member')`, [voiceId, existingId]);

  const { default: app } = await import("../app");
  await new Promise<void>((r) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as any).port}`; r(); }); });
});

afterAll(async () => {
  try { await pool.query(`DELETE FROM pta_initiatives WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM voice_members WHERE voice_id = $1`, [voiceId]); } catch {}
  try { await pool.query(`DELETE FROM voice_groups WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM pta_members WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM audit_log WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM users WHERE school_id = $1`, [schoolId]); } catch {}
  try { await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId]); } catch {}
  await new Promise<void>((r) => server.close(() => r()));
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const convert = (tok: string) =>
  fetch(`${baseUrl}/api/voice/${voiceId}/convert`, { method: "POST", headers: auth(tok) });

describe("POST /api/voice/:id/convert (B2 merge)", () => {
  it("403s for a non-exec parent caller", async () => {
    expect((await convert(parentTok)).status).toBe(403);
  });

  it("409s when the PTA is not yet claimed", async () => {
    const r = await convert(adminTok);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/operating structure/i);
  });

  it("merges once claimed: tiers, skip-existing, mission→initiative, response, audit", async () => {
    await pool.query(`UPDATE schools SET pta_claimed_at = now() WHERE id = $1`, [schoolId]);

    const r = await convert(adminTok);
    expect(r.status).toBe(200);
    const b = await r.json();

    // Response shape: counts + the new initiative object.
    expect(b.converted).toMatchObject({ backers: 3, added: 2, alreadyMembers: 1 });
    expect(b.initiative.id).toBeTruthy();
    expect(b.initiative.title).toBe("Morna Vibes Test");
    expect(b.voice.status).toBe("converted");

    // Tiers: founder → senior_group, member → general_membership; existing untouched.
    const founderRow = await pool.query(`SELECT tier FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, founderId]);
    expect(founderRow.rows[0].tier).toBe("senior_group");
    const memberRow = await pool.query(`SELECT tier FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, memberId]);
    expect(memberRow.rows[0].tier).toBe("general_membership");
    const existingRows = await pool.query(`SELECT count(*)::int c FROM pta_members WHERE school_id=$1 AND user_id=$2`, [schoolId, existingId]);
    expect(existingRows.rows[0].c).toBe(1); // not duplicated

    // Initiative carried the mission, linked to the VOICE, proposed, no owner.
    const init = await pool.query(
      `SELECT title, summary, status, owner_id, origin_voice_id FROM pta_initiatives WHERE origin_voice_id=$1`, [voiceId]);
    expect(init.rows).toHaveLength(1);
    expect(init.rows[0].title).toBe("Morna Vibes Test");
    expect(init.rows[0].summary).toMatch(/adopt VBE/);
    expect(init.rows[0].status).toBe("proposed");
    expect(init.rows[0].owner_id).toBeNull();

    // Audit row carries the initiativeId.
    const aud = await pool.query(
      `SELECT details FROM audit_log WHERE school_id=$1 AND event_type='voice_converted' ORDER BY created_at DESC LIMIT 1`, [schoolId]);
    expect(aud.rows[0].details.initiativeId).toBe(b.initiative.id);
  });

  it("409s on re-convert (already converted)", async () => {
    const r = await convert(adminTok);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/already been converted/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/voiceMerge.test.ts
```
Expected: FAIL — the claim-gate test gets 200 (no gate yet), the initiative assertions fail (no initiative created), `b.initiative` is undefined.

> **Audit column note:** the assertion reads `audit_log.event_type` / `.details` / `.created_at`. If the test errors on an unknown column (not an assertion failure), confirm the real column names with `\d audit_log` in psql and adjust the test's SQL — do NOT change the handler to match a guessed schema. (Other tests in this repo write audit rows via `writeAudit`; mirror their column usage if in doubt.)

- [ ] **Step 3: Add the new imports**

In `artifacts/api-server/src/routes/voiceGroups.ts`, extend the `@workspace/db` import (currently lines 3–10) to add `schoolsTable` and `ptaInitiativesTable`:

```ts
import {
  db,
  voiceGroupsTable,
  voiceMembersTable,
  voiceSupportersTable,
  ptaMembersTable,
  ptaInitiativesTable,
  schoolsTable,
  usersTable,
} from "@workspace/db";
```

- [ ] **Step 4: Replace the convert handler**

Replace the entire `router.post("/voice/:id/convert", ...)` handler (currently lines 244–282) with:

```ts
// POST /voice/:id/convert — fold this VOICE into the PTA (B2 merge). Gated on a
// claimed PTA (B1 adopt must have run). Each backer becomes a pta_member
// (founder → senior_group, members → general_membership); anyone already on the
// roster is left as-is. The VOICE's mission carries over as a pta_initiative
// linked via originVoiceId. Member inserts + initiative + status flip run in one
// transaction. PTA / leadership only. Audited voice_converted.
router.post("/voice/:id/convert", authMiddleware, CONVERT, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  const voiceRow = groups[0];

  // B2 claim gate: the PTA must be claimed (B1 adopt) before backers merge in.
  // This is the sole constitution path — convert never auto-claims.
  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  if (!school?.ptaClaimedAt) {
    res.status(409).json({ error: "Adopt the operating structure before merging Morna Vibes into the PTA." });
    return;
  }

  if (voiceRow.status !== "advocating") { res.status(409).json({ error: "This VOICE has already been converted" }); return; }

  const backers = await db.select({ userId: voiceMembersTable.userId, role: voiceMembersTable.role })
    .from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, id));

  // Who's already on the PTA roster — don't duplicate or downgrade them.
  const existing = await db.select({ userId: ptaMembersTable.userId }).from(ptaMembersTable)
    .where(eq(ptaMembersTable.schoolId, u.schoolId));
  const alreadyPta = new Set(existing.map((e) => e.userId));

  const toAdd = backers
    .filter((b) => !alreadyPta.has(b.userId))
    .map((b) => ({
      schoolId: u.schoolId,
      userId: b.userId,
      tier: TIER_FOR_ROLE[b.role] ?? "general_membership",
      status: "active",
    }));

  let added = 0;
  let initiative: { id: string; title: string } = { id: "", title: "" };
  let voice: typeof voiceRow = voiceRow;

  await db.transaction(async (tx) => {
    if (toAdd.length) {
      const inserted = await tx.insert(ptaMembersTable).values(toAdd).returning({ id: ptaMembersTable.id });
      added = inserted.length;
    }

    // Carry the mission over as the PTA's first initiative — idempotent on originVoiceId.
    const existingInit = await tx.select({ id: ptaInitiativesTable.id, title: ptaInitiativesTable.title })
      .from(ptaInitiativesTable).where(eq(ptaInitiativesTable.originVoiceId, id)).limit(1);
    if (existingInit.length) {
      initiative = existingInit[0];
    } else {
      const [created] = await tx.insert(ptaInitiativesTable).values({
        schoolId: u.schoolId,
        title: voiceRow.name.slice(0, 255),
        summary: voiceRow.mission,
        status: "proposed",
        originVoiceId: id,
        ownerId: null,
        createdById: u.userId,
      }).returning({ id: ptaInitiativesTable.id, title: ptaInitiativesTable.title });
      initiative = created;
    }

    const [updated] = await tx.update(voiceGroupsTable)
      .set({ status: "converted", convertedAt: sql`now()` })
      .where(eq(voiceGroupsTable.id, id)).returning();
    voice = updated;
  });

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_converted", actor: u, targetType: "voice_group", targetId: id, details: { backers: backers.length, added, alreadyMembers: backers.length - added, initiativeId: initiative.id }, req });
  res.json({ voice, converted: { backers: backers.length, added, alreadyMembers: backers.length - added }, initiative: { id: initiative.id, title: initiative.title } });
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run src/__tests__/voiceMerge.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full api-server suite (no regressions)**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: all green (was 144; now 148 with the 4 new tests).

- [ ] **Step 7: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/api-server/src/routes/voiceGroups.ts artifacts/api-server/src/__tests__/voiceMerge.test.ts
git commit -m "feat(voice): B2 — claim-gated transactional convert + mission→initiative

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: OpenAPI contract + client codegen

**Files:**
- Modify: `lib/api-spec/openapi.yaml` (the `/voice/{id}/convert` 200 response, lines ~1627–1640)
- Generated (do not hand-edit): `lib/api-client-react/**`, `lib/api-zod/**` (regenerated by codegen)

- [ ] **Step 1: Add `initiative` to the response and document the 409**

In `lib/api-spec/openapi.yaml`, in the `/voice/{id}/convert` → `post` → `responses` block, extend the `200` schema's `properties` (after the `converted` object) and add a `409`:

```yaml
        "200":
          description: Converted
          content:
            application/json:
              schema:
                type: object
                properties:
                  voice: { type: object }
                  converted:
                    type: object
                    properties:
                      backers: { type: integer }
                      added: { type: integer }
                      alreadyMembers: { type: integer }
                  initiative:
                    type: object
                    properties:
                      id: { type: string }
                      title: { type: string }
        "409":
          description: PTA not yet claimed, or the VOICE was already converted
```

(Keep the existing `parameters`/`operationId`/`tags`/`summary` lines unchanged.)

- [ ] **Step 2: Regenerate the client**

Run:
```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-spec codegen
```
Expected: orval regenerates without error; `convertVoice`/`useConvertVoice` types now include `initiative`.

- [ ] **Step 3: Verify the spec is valid (typecheck the generated output compiles)**

Run:
```bash
cd ~/dev/safe-skoolz && pnpm --filter @workspace/api-client-react build
```
Expected: builds clean. (If the package has no `build` script, skip — the front-end build in Task 3 will surface any breakage.)

- [ ] **Step 4: Commit**

```bash
cd ~/dev/safe-skoolz && git add lib/api-spec/openapi.yaml lib/api-client-react lib/api-zod
git commit -m "feat(api-spec): voice convert returns initiative + documents 409

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — surface the merge result + the claim-gate error

**Files:**
- Modify: `artifacts/safeschool/src/pages/voice.tsx`

The `err` banner already exists and the API client throws `ApiError` with `.message`, so the 409 ("Adopt the operating structure first…") surfaces automatically through `run`'s catch. This task adds a **success line** showing what the merge did.

- [ ] **Step 1: Add a success-message state and clear it in `run`**

In `voice.tsx`, add an `okMsg` state alongside `err` (after line 41) and clear it at the start of `run` (line 48):

```tsx
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
```

```tsx
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null); setOkMsg(null);
    try { await fn(); voicesQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };
```

- [ ] **Step 2: Render the success banner**

Immediately after the existing `err` banner block (currently lines 67–69), add:

```tsx
      {okMsg && (
        <div className="rounded-md border border-primary/30 bg-primary/10 text-primary text-sm px-3 py-2">{okMsg}</div>
      )}
```

- [ ] **Step 3: Capture the convert result and set the success message**

Replace the convert button's `onClick` (currently lines 168–172) with one that reads the response:

```tsx
                        onClick={() => {
                          if (window.confirm(`Convert "${v.name}" into the PTA? Its ${v.memberCount} backer(s) become PTA members (founder → senior group, the rest → general membership).`)) {
                            run(async () => {
                              const r: any = await convertVoice.mutateAsync({ id: v.id });
                              const added = r?.converted?.added ?? 0;
                              const title = r?.initiative?.title ?? v.name;
                              setOkMsg(`Merged into the PTA — ${added} new member${added === 1 ? "" : "s"} · initiative “${title}” created.`);
                            });
                          }
                        }}
```

- [ ] **Step 4: Build the front-end (verifies the generated hook types compile)**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/safeschool && PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build
```
Expected: `vite build` + prerender complete with no type errors.

- [ ] **Step 5: Restore `_worker.js` if the build wiped it**

The build wipes `dist/public`. If a `dist/public/_worker.js` is needed for the Pages demo, re-create it per the runbook. (For local/Railway serving it isn't required — note and move on.)

- [ ] **Step 6: Commit**

```bash
cd ~/dev/safe-skoolz && git add artifacts/safeschool/src/pages/voice.tsx
git commit -m "feat(voice): surface B2 merge result (members added + initiative)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Local verification of the full vertical

**Files:** none (verification only).

- [ ] **Step 1: Confirm the whole api-server suite is green**

Run:
```bash
cd ~/dev/safe-skoolz/artifacts/api-server && set -a; . ../../.env; set +a && pnpm vitest run
```
Expected: all tests pass (148).

- [ ] **Step 2: Manual round-trip against a running server (optional but recommended)**

Start the server (`LOCAL_DEV.md` runbook), then with an admin (role pta) token against a school that has at least one advocating VOICE and `pta_claimed_at` set:
```bash
# Unclaimed school → expect 409 mentioning the operating structure.
# Claimed school   → expect 200 with { converted, initiative } and the VOICE now 'converted'.
/usr/bin/curl -s -X POST "$BASE/api/voice/$VOICE_ID/convert" -H "Authorization: Bearer $TOK" | jq
```
Then confirm in the UI: as a PTA/coordinator user, open `/voice`, click **Convert to PTA** on an advocating VOICE on a claimed PTA → the green success line shows "N new members · initiative … created"; the VOICE moves to "Now part of the PTA"; and `/pta/initiatives` lists the new initiative with the "from {VOICE}" origin badge.

- [ ] **Step 3: Report status**

Summarize: tests green, vertical verified, and that **no prod schema change** is required (all columns already shipped). Stop for Tom's go-ahead before pushing (prod rollout is Tom-gated; push auto-deploys to Railway).

---

## Self-review notes

- **Spec coverage:** claim gate (§5.2 / Task 1 step 4) ✓; founder→senior_group no title (Task 1, `TIER_FOR_ROLE` unchanged — no officer insert) ✓; mission→initiative with VOICE name/mission/originVoiceId/owner-null (Task 1) ✓; transactional (Task 1) ✓; supporters excluded (only `voice_members` are read — Task 1) ✓; response `initiative` field (Tasks 1+2) ✓; surface result + 409 in UI (Task 3) ✓; no schema change (header + Task 4) ✓.
- **Idempotency:** convert is single-shot (status flip + re-convert 409); the `originVoiceId`-exists guard inside the tx is belt-and-braces and tested implicitly by the single-initiative assertion.
- **Type consistency:** `initiative` is `{ id, title }` in the handler, OpenAPI, and the page; `TIER_FOR_ROLE` and `CONVERT` are reused unchanged; `voice` re-assigned from the tx update keeps the existing response field.

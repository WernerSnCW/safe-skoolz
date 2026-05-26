---
name: Post-merge schema reconciliation
description: Two-front breakage that happens whenever a merged task adds a Drizzle schema change in lib/db; both fronts must be repaired together or symptoms look like unrelated bugs.
---

When a task merge adds a new column or table in `lib/db/src/schema/`, the
automated post-merge reconciliation script breaks two ways at once. The
symptoms look unrelated, but they share a root cause and must both be fixed
before any new work continues.

**Symptoms** (all show up together after the merge):

- `tsc --noEmit` in any consumer reports `Property 'X' does not exist on
  type {...users row...}` or `Module '@workspace/db' has no exported member
  'YTable'` even though the source under `lib/db/src/schema/` clearly has
  them.
- Vitest runs blow up with `DrizzleQueryError: select ... "new_column" ...`
  / `relation "new_table" does not exist`, in tests that have nothing to do
  with the new feature (because every select now mentions the new column).

**Why this happens:**

1. The post-merge script runs `pnpm --filter db push`, which is
   `drizzle-kit push`. Whenever a new table is added it prompts
   interactively ("Is this a create or a rename of X?"). In the non-TTY
   post-merge shell the prompt aborts and the DDL is silently skipped, so
   the live DB never gains the column/table.
2. Consumer packages (e.g. `artifacts/api-server`) declare TypeScript
   project references to `lib/db`. With `composite: true` + `outDir: dist`,
   `tsc` resolves `@workspace/db` types from `lib/db/dist/*.d.ts`, not from
   source — even though Node/vitest resolve at runtime via `package.json`
   `exports` pointing at `./src/index.ts`. The stale `.d.ts` from before the
   merge is what `tsc` sees, so it never knows about the new symbols.

**How to apply:**

When you see this combination of symptoms after any task merge, do both
repairs before touching feature code:

1. Apply the DDL by hand with raw SQL via the database tool (idempotent
   `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`,
   `CREATE INDEX IF NOT EXISTS`). Do **not** re-run `drizzle-kit push`
   non-interactively — it will stall again.
2. Rebuild `lib/db` declaration output: `cd lib/db && npx tsc`. This
   refreshes `lib/db/dist/*.d.ts` so consumer `tsc` resolution picks up the
   new exports and column properties.
3. Restart the API workflow so the running server picks up the new schema
   (Drizzle reads column lists at module load).

Only after both repairs should typecheck/test counts return to baseline.
Shipping new work on top of a half-applied merge masks your own bugs as the
merge's bugs and vice versa.

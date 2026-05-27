---
name: Drizzle push rename-detection trap
description: drizzle-kit push interactively prompts to rename when a new table superficially resembles an existing orphan; the prompt cannot be answered via stdin pipe.
---

# Drizzle push rename-detection trap

When adding a brand-new table via `drizzle-kit push`, drizzle compares the
proposed table against every existing table in the DB and, if it sees rough
structural similarity to one that isn't in any schema file, it pauses with an
interactive prompt:

```
Is <new_table> table created or renamed from another table?
❯ + <new_table>            create table
  ~ <orphan> › <new_table> rename table
```

**Why:** drizzle-kit's diff is heuristic, not name-based. An orphan table left
in the DB by an earlier abandoned task (with no matching schema file) is a
prime trigger — drizzle has no way to know it's orphaned because every table
in the live DB is a candidate.

**The prompt cannot be answered by piping `\n` to stdin** — drizzle-kit opens
a TTY for the prompt. Pipes hang the push.

**How to apply:**
1. If push hangs on a rename prompt for a *new* table, the live DB has an
   orphan table that's structurally similar. Inspect it:
   `psql "$DATABASE_URL" -c "\\d <orphan_name>"` and check row count.
2. If the orphan is empty and unreferenced (not in any `lib/db/src/schema/`
   file, no FKs pointing in), `DROP TABLE IF EXISTS <orphan>;` and re-run push.
   It will then apply non-interactively.
3. If the orphan has data or is referenced, do NOT drop — answer the prompt
   in a real TTY (locally) or migrate the data out first.

Concrete example from Phase 2 ticket 5 (PSHE lessons schema): an empty
`t09_scan_counter` table (KV shape `(key text, n int)` left by an earlier
abandoned task) caused drizzle to offer it as a rename source for the new
`lessons` table. Dropping `t09_scan_counter` made push apply cleanly.

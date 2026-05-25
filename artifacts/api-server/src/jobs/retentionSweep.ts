import { pool } from "@workspace/db";
import { RETENTION_DAYS, RETENTION_TABLES, type RetentionCategory } from "../lib/retentionPolicies";
import { writeAudit } from "../lib/auditHelper";

// T13: scheduled retention sweep. Mirrors the T09 pattern_scan structure:
// every tick we try to take a Postgres advisory lock so that only one
// replica does work; the lock is transactional and released on COMMIT/
// ROLLBACK, so we never have to remember to unlock.
//
// The lock key is distinct from T09 — T09 passes 'safeskoolz:pattern_scan'
// to hashtext, this passes 'safeskoolz:retention_sweep'. hashtext() of two
// different strings effectively never collides in the int32 space (and
// even if it did, the two jobs are safe to serialise anyway).
const LOCK_KEY_SQL = `hashtext('safeskoolz:retention_sweep')::bigint`;

// Defence-in-depth: even though RETENTION_TABLES is a hardcoded const today,
// we cannot use parameter binding for SQL identifiers, so we validate them
// against a strict allowlist regex at runtime. If anyone ever wires
// retention values through config, env, or a DB table, this assertion blocks
// SQL injection at the only place identifiers reach the query string.
const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/;
function assertSafeIdent(s: string, kind: "table" | "column"): void {
  if (!SAFE_IDENT.test(s)) {
    throw new Error(`retention sweep refused unsafe ${kind} identifier: ${JSON.stringify(s)}`);
  }
}

export interface SweepCategoryResult {
  category: RetentionCategory;
  deletedCount: number;
  thresholdAt: Date;
}

export interface TickResult {
  acquired: boolean;
  ranAt?: Date;
  results?: SweepCategoryResult[];
  error?: Error;
}

// Body extracted so tests can swap the timestamp helper if needed.
export async function runRetentionSweepOnce(): Promise<TickResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lockRes = await client.query<{ ok: boolean }>(
      `SELECT pg_try_advisory_xact_lock(${LOCK_KEY_SQL}) AS ok`,
    );
    if (!lockRes.rows[0]?.ok) {
      await client.query("ROLLBACK");
      console.log("[cron] retention_sweep skipped — lock held by another replica");
      return { acquired: false };
    }

    const results: SweepCategoryResult[] = [];
    try {
      for (const [cat, days] of Object.entries(RETENTION_DAYS) as [
        RetentionCategory,
        number,
      ][]) {
        const cfg = RETENTION_TABLES[cat];
        assertSafeIdent(cfg.table, "table");
        assertSafeIdent(cfg.column, "column");
        const thresholdAt = new Date(Date.now() - days * 86_400_000);
        // `days` is parameterised; identifiers are validated above.
        const del = await client.query(
          `DELETE FROM ${cfg.table}
             WHERE ${cfg.column} < NOW() - ($1 || ' days')::interval`,
          [String(days)],
        );
        results.push({
          category: cat,
          deletedCount: del.rowCount ?? 0,
          thresholdAt,
        });
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[cron] retention_sweep body failed:", e);
      return { acquired: true, error: e };
    }

    // Audit one row per category, AFTER COMMIT so we never claim a deletion
    // that was rolled back. If audit insert fails we log but don't throw —
    // a missing audit row is preferable to re-running the deletion.
    //
    // `audit_log.school_id` is NOT NULL in the schema, but a retention sweep
    // is system-wide and not owned by any one school. Rather than relax the
    // NOT NULL on a security-critical table for one job, we anchor the
    // audit row to the oldest school in the database as a sentinel. This
    // keeps the FK happy and a `WHERE event_type = 'retention_sweep_completed'`
    // query still returns the row.
    const anchor = await pool.query<{ id: string }>(
      `SELECT id FROM schools ORDER BY created_at ASC NULLS FIRST LIMIT 1`,
    );
    const anchorSchoolId = anchor.rows[0]?.id;
    if (!anchorSchoolId) {
      console.warn("[cron] retention_sweep skipping audit — no schools exist to anchor system audit row");
    } else {
      for (const r of results) {
        await writeAudit({
          schoolId: anchorSchoolId,
          eventType: "retention_sweep_completed",
          targetType: "system",
          details: {
            category: r.category,
            deleted_count: r.deletedCount,
            threshold_at: r.thresholdAt.toISOString(),
          },
        }).catch((e) => {
          console.error(`[cron] retention_sweep audit insert failed for ${r.category}:`, e);
        });
      }
    }

    const ranAt = new Date();
    console.log(
      `[cron] retention_sweep completed at ${ranAt.toISOString()} — ${
        results.map((r) => `${r.category}=${r.deletedCount}`).join(", ")
      }`,
    );
    return { acquired: true, ranAt, results };
  } finally {
    client.release();
  }
}

const RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startRetentionSweepScheduler(): NodeJS.Timeout | null {
  if (process.env.JOBS_ENABLED === "false") {
    console.log("[cron] JOBS_ENABLED=false — retention_sweep interval not started");
    return null;
  }
  const handle = setInterval(() => {
    runRetentionSweepOnce().catch((err) => {
      console.error("[cron] retention_sweep tick failed:", err);
    });
  }, RETENTION_SWEEP_INTERVAL_MS);
  console.log(
    `[cron] retention_sweep scheduled every ${RETENTION_SWEEP_INTERVAL_MS / 3_600_000}h`,
  );
  return handle;
}

import { pool } from "@workspace/db";
import { runScheduledPatternScan } from "../lib/patternDetection";

// T09: only one replica runs the scan per tick. We wrap the work in a transaction
// that tries to acquire a Postgres advisory lock keyed on a stable hash of the job
// name. `pg_try_advisory_xact_lock` is non-blocking and the lock is released
// automatically at COMMIT/ROLLBACK, so we don't need to remember to release it.
const LOCK_KEY_SQL = `hashtext('safeskoolz:pattern_scan')::bigint`;

export interface TickResult {
  acquired: boolean;
  ranAt?: Date;
  error?: Error;
}

// Body of the scan, extracted so tests can inject a stub. Defaults to the real
// pattern-detection routine.
export type ScanBody = () => Promise<void>;

export async function runPatternScanTickOnce(body: ScanBody = runScheduledPatternScan): Promise<TickResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lockRes = await client.query<{ ok: boolean }>(
      `SELECT pg_try_advisory_xact_lock(${LOCK_KEY_SQL}) AS ok`,
    );
    if (!lockRes.rows[0]?.ok) {
      await client.query("ROLLBACK");
      console.log("[cron] pattern_scan skipped — lock held by another replica");
      return { acquired: false };
    }
    try {
      await body();
      await client.query("COMMIT");
      const ranAt = new Date();
      console.log(`[cron] pattern_scan acquired+completed at ${ranAt.toISOString()}`);
      return { acquired: true, ranAt };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[cron] pattern_scan body failed:", e);
      return { acquired: true, error: e };
    }
  } finally {
    client.release();
  }
}

const PATTERN_SCAN_INTERVAL_MS = 60 * 60 * 1000;

export function startPatternScanScheduler(): NodeJS.Timeout | null {
  if (process.env.JOBS_ENABLED === "false") {
    console.log("[cron] JOBS_ENABLED=false — pattern_scan interval not started");
    return null;
  }
  const handle = setInterval(() => {
    runPatternScanTickOnce().catch((err) => {
      console.error("[cron] pattern_scan tick failed:", err);
    });
  }, PATTERN_SCAN_INTERVAL_MS);
  console.log(`[cron] pattern_scan scheduled every ${PATTERN_SCAN_INTERVAL_MS / 60000} minutes`);
  return handle;
}

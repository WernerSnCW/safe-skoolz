import { describe, it, expect } from "vitest";
import { pool } from "@workspace/db";

// T09 acceptance: two connections concurrently try to take the same advisory lock
// inside their own transactions; only one acquires it; the scan body runs once.
// We measure "body executed" by incrementing a tiny counter table.

const LOCK_KEY_SQL = `hashtext('safeskoolz:pattern_scan')::bigint`;
const COUNTER_KEY = `t09-${Date.now()}`;

describe("T09 — advisory-lock pattern scanner mutual exclusion", () => {
  it("two concurrent transactions: only one acquires lock and only one body runs", async () => {
    // Counter table, created idempotently. We use a regular pgtable rather than a
    // schema migration because this is a test-only scratchpad.
    await pool.query(
      `CREATE TABLE IF NOT EXISTS t09_scan_counter (key text primary key, n int not null default 0)`,
    );
    await pool.query(`DELETE FROM t09_scan_counter WHERE key = $1`, [COUNTER_KEY]);
    await pool.query(`INSERT INTO t09_scan_counter (key, n) VALUES ($1, 0)`, [COUNTER_KEY]);

    async function tryTick(): Promise<boolean> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await client.query<{ ok: boolean }>(
          `SELECT pg_try_advisory_xact_lock(${LOCK_KEY_SQL}) AS ok`,
        );
        if (!r.rows[0]?.ok) {
          await client.query("ROLLBACK");
          return false;
        }
        // Simulate scan body — bump the counter. Hold the tx open long enough that
        // the other connection definitely races us for the lock.
        await client.query(`UPDATE t09_scan_counter SET n = n + 1 WHERE key = $1`, [COUNTER_KEY]);
        await new Promise((r2) => setTimeout(r2, 250));
        await client.query("COMMIT");
        return true;
      } finally {
        client.release();
      }
    }

    const [a, b] = await Promise.all([tryTick(), tryTick()]);
    const acquiredCount = (a ? 1 : 0) + (b ? 1 : 0);
    expect(acquiredCount).toBe(1);

    const { rows } = await pool.query<{ n: number }>(
      `SELECT n FROM t09_scan_counter WHERE key = $1`,
      [COUNTER_KEY],
    );
    expect(rows[0].n).toBe(1);

    await pool.query(`DELETE FROM t09_scan_counter WHERE key = $1`, [COUNTER_KEY]);
  });
});

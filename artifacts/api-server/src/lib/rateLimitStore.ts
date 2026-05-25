import type { Store, Options, IncrementResponse, ClientRateLimitInfo } from "express-rate-limit";
import { pool } from "@workspace/db";

// Postgres-backed Store for express-rate-limit. Counters survive restarts and are
// shared across autoscale replicas. Lazy cleanup: each increment sweeps expired rows
// in the same transaction, so there is no separate cron/job to maintain.
//
// Schema contract (see lib/db/src/schema/rateLimitBuckets.ts):
//   key text PK, count int, expires_at timestamptz, INDEX(expires_at).
export class PgRateLimitStore implements Store {
  private windowMs = 60_000;
  // Prefix isolates buckets between limiter instances (otherwise auth + newsletter
  // limiters with the same IP would share a counter).
  constructor(private prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private k(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const fullKey = this.k(key);
    const ms = this.windowMs;
    // Single round-trip atomic upsert. If the existing row has expired we reset count
    // to 1 and start a fresh window; otherwise we bump count and keep the window.
    const res = await pool.query<{ count: number; expires_at: Date }>(
      `INSERT INTO rate_limit_buckets (key, count, expires_at)
       VALUES ($1, 1, NOW() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE
       SET count = CASE
             WHEN rate_limit_buckets.expires_at < NOW() THEN 1
             ELSE rate_limit_buckets.count + 1
           END,
           expires_at = CASE
             WHEN rate_limit_buckets.expires_at < NOW() THEN NOW() + ($2 || ' milliseconds')::interval
             ELSE rate_limit_buckets.expires_at
           END
       RETURNING count, expires_at`,
      [fullKey, String(ms)],
    );
    // Lazy sweep — bounded work per hit; safe to run unconditionally because the
    // expires_at index makes it cheap.
    await pool.query(`DELETE FROM rate_limit_buckets WHERE expires_at < NOW()`).catch(() => {});
    const row = res.rows[0];
    return { totalHits: row.count, resetTime: new Date(row.expires_at) };
  }

  async decrement(key: string): Promise<void> {
    await pool.query(
      `UPDATE rate_limit_buckets SET count = GREATEST(count - 1, 0) WHERE key = $1`,
      [this.k(key)],
    );
  }

  async resetKey(key: string): Promise<void> {
    await pool.query(`DELETE FROM rate_limit_buckets WHERE key = $1`, [this.k(key)]);
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const res = await pool.query<{ count: number; expires_at: Date }>(
      `SELECT count, expires_at FROM rate_limit_buckets WHERE key = $1 AND expires_at > NOW()`,
      [this.k(key)],
    );
    const row = res.rows[0];
    if (!row) return undefined;
    return { totalHits: row.count, resetTime: new Date(row.expires_at) };
  }
}

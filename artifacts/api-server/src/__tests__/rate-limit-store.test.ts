import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "@workspace/db";
import { PgRateLimitStore } from "../lib/rateLimitStore";

// Real-DB integration test: drives the same DATABASE_URL the dev workflow uses.
const TEST_KEY = `vitest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

beforeAll(async () => {
  // Make sure the table exists. If not, fail loudly so the dev knows to run
  // `pnpm --filter @workspace/db run push` before running this test.
  const exists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limit_buckets') AS exists`,
  );
  if (!exists.rows[0]?.exists) {
    throw new Error(
      "rate_limit_buckets table missing — run `pnpm --filter @workspace/db run push`.",
    );
  }
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'auth:vitest-%'`);
});

afterAll(async () => {
  await pool.query(`DELETE FROM rate_limit_buckets WHERE key LIKE 'auth:vitest-%'`);
});

describe("PgRateLimitStore — shared across instances", () => {
  it("31 increments split across two store instances pointed at the same DB show the 30-limit exceeded on call 31", async () => {
    const storeA = new PgRateLimitStore("auth");
    const storeB = new PgRateLimitStore("auth");
    storeA.init({ windowMs: 15 * 60 * 1000 } as any);
    storeB.init({ windowMs: 15 * 60 * 1000 } as any);

    const limit = 30;
    let lastTotal = 0;

    // Alternate between the two store instances to prove the counter is durable
    // and shared (not held in either process's memory).
    for (let i = 0; i < 31; i++) {
      const store = i % 2 === 0 ? storeA : storeB;
      const res = await store.increment(TEST_KEY);
      lastTotal = res.totalHits;
    }

    expect(lastTotal).toBe(31);
    expect(lastTotal).toBeGreaterThan(limit);
  });
});

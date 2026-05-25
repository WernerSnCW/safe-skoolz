import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// Single-row-per-key counter backing the express-rate-limit Store. `key` already
// encodes window scope (e.g. "auth:1.2.3.4"); we lean on `expires_at` rather than a
// separate windowMs column so the schema stays generic across limiter configs.
export const rateLimitBucketsTable = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limit_buckets_expires_at_idx").on(t.expiresAt)],
);

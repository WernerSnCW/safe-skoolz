// T13: retention windows for "old, expirable data". Per the Karpathy-style
// simplicity rule in the brief, this is a typed TS constant — NOT a
// `retention_policies` table — because (a) the values change roughly never,
// (b) a config table would need its own admin UI, audit, and migration story
// for what is effectively three numbers, and (c) keeping it in code means a
// review of the constants is part of the same PR review as any business
// change to retention.
//
// `audit_log` is deliberately EXCLUDED from this map. It is append-only
// (an UPDATE/DELETE trigger raises an exception in `index.ts`), and deleting
// audit history is a separate decision that must not be made silently by a
// background sweep. If we ever need an audit retention policy, it gets its
// own ticket, own approval, and own job.
export const RETENTION_DAYS = {
  pupil_diary: 365,
  messages: 730,
  notifications: 90,
} as const;

export type RetentionCategory = keyof typeof RETENTION_DAYS;

// Map category → (SQL table, timestamp column to compare). Kept next to the
// constant so the relationship is obvious at review time.
export const RETENTION_TABLES: Record<RetentionCategory, { table: string; column: string }> = {
  pupil_diary: { table: "pupil_diary", column: "created_at" },
  messages: { table: "messages", column: "created_at" },
  notifications: { table: "notifications", column: "sent_at" },
};

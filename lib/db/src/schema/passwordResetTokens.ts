import { pgTable, uuid, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// T10: bcrypt-hashed password reset tokens for staff and parents. Pupils are
// excluded at the route layer; the table itself is generic.
export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => usersTable.id).notNull(),
    tokenHash: text("token_hash").notNull(),
    // SHA-256 hex of the raw token for O(1) lookup. Nullable: legacy rows
    // predate it and fall back to the bcrypt scan. bcrypt hash remains the
    // verifier; this column only narrows the candidate set.
    tokenLookup: varchar("token_lookup", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("password_reset_tokens_user_id_idx").on(t.userId),
    index("password_reset_tokens_expires_at_idx").on(t.expiresAt),
    index("idx_password_reset_tokens_lookup").on(t.tokenLookup),
  ],
);

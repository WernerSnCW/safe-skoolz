import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// T10: bcrypt-hashed password reset tokens for staff and parents. Pupils are
// excluded at the route layer; the table itself is generic.
export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => usersTable.id).notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("password_reset_tokens_user_id_idx").on(t.userId),
    index("password_reset_tokens_expires_at_idx").on(t.expiresAt),
  ],
);

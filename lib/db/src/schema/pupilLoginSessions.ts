import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";

// Server-side pupil login handshake state. Replaces the previous stateless JWT
// session token so the row can be marked consumed (single-use) and revoked.
export const pupilLoginSessionsTable = pgTable(
  "pupil_login_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
    classCodeHash: text("class_code_hash").notNull(),
    pupilCandidates: jsonb("pupil_candidates").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pupil_login_sessions_expires_at_idx").on(t.expiresAt)],
);

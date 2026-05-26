import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { schoolsTable } from "./schools";

// T3: Pending admin-initiated MFA reset requests. A coordinator/head_teacher
// requests a reset for a target user; a *different* admin in the same school
// must confirm. Rows expire after `expiresAt` and are deleted on confirm or
// cancel.
export const mfaResetRequestsTable = pgTable(
  "mfa_reset_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
    targetUserId: uuid("target_user_id").notNull().references(() => usersTable.id),
    requestedBy: uuid("requested_by").notNull().references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    schoolIdx: index("mfa_reset_requests_school_idx").on(t.schoolId),
    targetIdx: index("mfa_reset_requests_target_idx").on(t.targetUserId),
  })
);

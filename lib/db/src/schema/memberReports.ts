import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

// Phase 4b (spec §4.3): the in-app "report this member" affordance. Verification
// is a NEGATIVE/exception check — a member flags someone who isn't part of the
// real community. Recording a report does NOT remove the member; removal is a
// platform-operator action (flag/remove). One open report per (member, reporter).
export const memberReportsTable = pgTable("member_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  // The member being reported.
  reportedUserId: uuid("reported_user_id").references(() => usersTable.id).notNull(),
  // Who raised it (null when reported anonymously from a public surface).
  reporterUserId: uuid("reporter_user_id").references(() => usersTable.id),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | dismissed | actioned
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_member_reports_school").on(t.schoolId),
  index("idx_member_reports_reported").on(t.reportedUserId),
]);

export type MemberReport = typeof memberReportsTable.$inferSelect;

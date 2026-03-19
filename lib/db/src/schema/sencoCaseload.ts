import { pgTable, uuid, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { schoolsTable } from "./schools";

export const sencoCaseloadTable = pgTable("senco_caseload", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  sencoId: uuid("senco_id").references(() => usersTable.id).notNull(),
  pupilId: uuid("pupil_id").references(() => usersTable.id).notNull(),
  reason: text("reason"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
});

export const sencoTrackingTable = pgTable("senco_tracking", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  caseloadId: uuid("caseload_id").references(() => sencoCaseloadTable.id).notNull(),
  pupilId: uuid("pupil_id").references(() => usersTable.id).notNull(),
  recordedBy: uuid("recorded_by").references(() => usersTable.id).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  progressRating: integer("progress_rating"),
  feelingsRating: integer("feelings_rating"),
  attitudeToLearning: integer("attitude_to_learning"),
  attitudeToOthers: integer("attitude_to_others"),
  notes: text("notes"),
});

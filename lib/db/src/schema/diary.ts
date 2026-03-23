import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const pupilDiaryTable = pgTable("pupil_diary", {
  id: uuid("id").defaultRandom().primaryKey(),
  pupilId: uuid("pupil_id").notNull().references(() => usersTable.id),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  mood: integer("mood"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pupil_diary_pupil").on(t.pupilId),
  index("idx_pupil_diary_school").on(t.schoolId),
  index("idx_pupil_diary_date").on(t.pupilId, t.createdAt),
]);

export type PupilDiaryEntry = typeof pupilDiaryTable.$inferSelect;

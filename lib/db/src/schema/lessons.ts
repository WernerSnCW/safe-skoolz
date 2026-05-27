import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";

// PSHE lessons (Phase 2 ticket 1).
// schoolId nullable: when null the lesson is a global lesson visible to every
// school; when set the lesson is school-specific (custom content uploaded by
// a school's coordinator in a future post-pilot ticket).
export const lessonsTable = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id),
  keyStage: varchar("key_stage", { length: 10 }).notNull(),
  strand: varchar("strand", { length: 40 }).notNull(),
  topic: varchar("topic", { length: 60 }).notNull(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  body: text("body").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_lessons_school_keystage").on(t.schoolId, t.keyStage),
  index("idx_lessons_keystage_active").on(t.keyStage, t.active),
  index("idx_lessons_strand").on(t.strand),
]);

export type Lesson = typeof lessonsTable.$inferSelect;

import { pgTable, uuid, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";
import { lessonsTable } from "./lessons";

// PSHE lesson progress (Phase 2 ticket 1).
//
// DESIGN DECISION — reflection_text is intentionally NOT a column on this
// table. Pupil reflections written during a lesson are private and ephemeral:
// only completion + quiz score are persisted. The reasoning:
//
//   - No new sensitive-data category, so no extra parent-consent friction.
//   - No risk of safeguarding disclosures sitting silently in a free-text
//     column that nobody monitors.
//   - Pupils who write a reflection that needs flagging use the existing
//     report/messages flow, which already has disclosure protocols built in.
//
// If we later decide pupils should be able to read back their own reflections,
// that's additive (pupil-only persistence) and requires no rewrite of this
// schema — just add a `reflection_text` column then.
//
// UNIQUE(user_id, lesson_id) enforces one progress row per pupil per lesson,
// so POST /api/lessons/:id/start can use ON CONFLICT DO NOTHING and remain
// idempotent under double-tap.
export const lessonProgressTable = pgTable("lesson_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  lessonId: uuid("lesson_id").notNull().references(() => lessonsTable.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  quizScore: integer("quiz_score"),
}, (t) => [
  index("idx_lesson_progress_user_lesson").on(t.userId, t.lessonId),
  index("idx_lesson_progress_completed").on(t.completedAt),
  index("idx_lesson_progress_school").on(t.schoolId),
  unique("uq_lesson_progress_user_lesson").on(t.userId, t.lessonId),
]);

export type LessonProgress = typeof lessonProgressTable.$inferSelect;

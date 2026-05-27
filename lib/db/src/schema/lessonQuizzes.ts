import { pgTable, uuid, text, char, integer, timestamp, index } from "drizzle-orm/pg-core";
import { lessonsTable } from "./lessons";

// PSHE lesson quizzes (Phase 2 ticket 1).
// One row per quiz question; a lesson typically has 2-5 questions.
// correctOption is one of "A" | "B" | "C" | "D" — never exposed to pupils
// via the API (the GET /api/lessons/:id endpoint in ticket 6 strips it).
export const lessonQuizzesTable = pgTable("lesson_quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonId: uuid("lesson_id").notNull().references(() => lessonsTable.id),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: char("correct_option", { length: 1 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_lesson_quizzes_lesson").on(t.lessonId),
]);

export type LessonQuiz = typeof lessonQuizzesTable.$inferSelect;

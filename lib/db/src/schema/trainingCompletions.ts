import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const trainingCompletionsTable = pgTable("training_completions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("training_completions_user_module_idx").on(table.userId, table.moduleId),
  index("training_completions_school_user_idx").on(table.schoolId, table.userId),
]);

export type TrainingCompletion = typeof trainingCompletionsTable.$inferSelect;

import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const teacherPostsTable = pgTable("teacher_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  authorId: uuid("author_id").notNull().references(() => usersTable.id),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 40 }).notNull().default("general"),
  audience: varchar("audience", { length: 40 }).notNull().default("everyone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_teacher_posts_school").on(t.schoolId),
  index("idx_teacher_posts_author").on(t.authorId),
  index("idx_teacher_posts_audience").on(t.schoolId, t.audience),
  index("idx_teacher_posts_date").on(t.schoolId, t.createdAt),
]);

export type TeacherPost = typeof teacherPostsTable.$inferSelect;

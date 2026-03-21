import { pgTable, uuid, varchar, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  pinHash: varchar("pin_hash", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  yearGroup: varchar("year_group", { length: 10 }),
  className: varchar("class_name", { length: 50 }),
  avatarType: varchar("avatar_type", { length: 10 }),
  avatarValue: text("avatar_value"),
  avatarImageUrl: text("avatar_image_url"),
  parentOf: uuid("parent_of").array(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
}, (table) => [
  index("idx_users_school_id").on(table.schoolId),
  index("idx_users_role").on(table.role),
  index("idx_users_school_role").on(table.schoolId, table.role),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRecord = typeof usersTable.$inferSelect;

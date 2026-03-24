import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const schoolLoginCodesTable = pgTable("school_login_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  codeType: varchar("code_type", { length: 30 }).default("pupil_login").notNull(),
  codeHash: varchar("code_hash", { length: 255 }).notNull(),
  yearGroup: varchar("year_group", { length: 10 }),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_school_login_codes_school").on(table.schoolId),
  index("idx_school_login_codes_school_type").on(table.schoolId, table.codeType),
]);

export const insertSchoolLoginCodeSchema = createInsertSchema(schoolLoginCodesTable).omit({ id: true, createdAt: true });
export type InsertSchoolLoginCode = z.infer<typeof insertSchoolLoginCodeSchema>;
export type SchoolLoginCode = typeof schoolLoginCodesTable.$inferSelect;

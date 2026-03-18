import { pgTable, uuid, varchar, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { protocolsTable } from "./protocols";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const interviewsTable = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocolId: uuid("protocol_id").references(() => protocolsTable.id).notNull(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  intervieweeId: uuid("interviewee_id").references(() => usersTable.id).notNull(),
  intervieweeRole: varchar("interviewee_role", { length: 20 }).notNull(),
  conductedBy: uuid("conducted_by").references(() => usersTable.id).notNull(),
  interviewDate: date("interview_date"),
  summary: text("summary"),
  annexReference: varchar("annex_reference", { length: 50 }),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({ id: true, createdAt: true });
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type InterviewRecord = typeof interviewsTable.$inferSelect;

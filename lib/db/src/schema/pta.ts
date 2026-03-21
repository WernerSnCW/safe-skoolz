import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const ptaMessagesTable = pgTable("pta_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  senderId: uuid("sender_id").references(() => usersTable.id).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ptaConcernsTable = pgTable("pta_concerns", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  submittedById: uuid("submitted_by_id").references(() => usersTable.id).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  coordinatorResponse: text("coordinator_response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  respondedById: uuid("responded_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ptaPolicyAcknowledgementsTable = pgTable("pta_policy_acknowledgements", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  policyVersion: varchar("policy_version", { length: 50 }).notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ptaCodesignResponsesTable = pgTable("pta_codesign_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  submittedById: uuid("submitted_by_id").references(() => usersTable.id).notNull(),
  questionKey: varchar("question_key", { length: 100 }).notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ptaAnnualReportsTable = pgTable("pta_annual_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  academicYear: varchar("academic_year", { length: 20 }).notNull(),
  reportData: jsonb("report_data").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  generatedById: uuid("generated_by_id").references(() => usersTable.id).notNull(),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  accessedByPtaAt: timestamp("accessed_by_pta_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

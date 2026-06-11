import { pgTable, uuid, varchar, text, integer, timestamp, index, jsonb, unique } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const diagnosticSurveysTable = pgTable("diagnostic_surveys", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  // Public community diagnostics (spec §4.2): when publicSlug is set the survey
  // is reachable without auth at /d/:slug. instrument holds the question set as
  // data; releasedAt is the exec's release switch (results invisible until set).
  publicSlug: varchar("public_slug", { length: 60 }).unique(),
  instrument: jsonb("instrument"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: uuid("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (t) => [
  index("idx_diagnostic_surveys_school").on(t.schoolId),
  index("idx_diagnostic_surveys_status").on(t.status),
]);

export const diagnosticResponsesTable = pgTable("diagnostic_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  questionKey: varchar("question_key", { length: 100 }).notNull(),
  answer: integer("answer").notNull(),
  comment: text("comment"),
  respondedAt: timestamp("responded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_diagnostic_responses_survey").on(t.surveyId),
  index("idx_diagnostic_responses_user").on(t.userId),
  index("idx_diagnostic_responses_question").on(t.surveyId, t.questionKey),
]);

export const diagnosticActionsTable = pgTable("diagnostic_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  action: text("action").notNull(),
  category: varchar("category", { length: 100 }),
  owner: varchar("owner", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => [
  index("idx_diagnostic_actions_survey").on(t.surveyId),
  index("idx_diagnostic_actions_school").on(t.schoolId),
]);

export type DiagnosticSurvey = typeof diagnosticSurveysTable.$inferSelect;
export type DiagnosticResponse = typeof diagnosticResponsesTable.$inferSelect;
export type DiagnosticAction = typeof diagnosticActionsTable.$inferSelect;

// Public diagnostic submissions — the email-bearing record. Holds NO answers.
// emailHash enforces one-submission-per-email; email is kept only to send the
// signup invite and the release notification.
export const diagnosticSubmissionsTable = pgTable("diagnostic_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  email: varchar("email", { length: 255 }).notNull(),
  emailHash: varchar("email_hash", { length: 64 }).notNull(),
  name: varchar("name", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_diag_submissions_survey").on(t.surveyId),
  unique("uq_diag_submissions_survey_email").on(t.surveyId, t.emailHash),
]);

// Answers — UNLINKABLE BY DESIGN (spec §4.2): no FK to the submission. The
// random responseId exists only here and on the meta row, grouping one
// respondent's answers for aggregation without ever touching their identity.
export const diagnosticAnswersTable = pgTable("diagnostic_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  responseId: uuid("response_id").notNull(),
  questionKey: varchar("question_key", { length: 100 }).notNull(),
  answer: integer("answer"),
  freeText: text("free_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_diag_answers_survey_q").on(t.surveyId, t.questionKey),
  index("idx_diag_answers_response").on(t.surveyId, t.responseId),
]);

// Optional demographics per anonymous response (year-group segmentation).
export const diagnosticResponseMetaTable = pgTable("diagnostic_response_meta", {
  id: uuid("id").defaultRandom().primaryKey(),
  surveyId: uuid("survey_id").notNull().references(() => diagnosticSurveysTable.id),
  responseId: uuid("response_id").notNull().unique(),
  yearGroup: varchar("year_group", { length: 20 }),
  classOrTeacher: varchar("class_or_teacher", { length: 80 }),
}, (t) => [
  index("idx_diag_meta_survey_year").on(t.surveyId, t.yearGroup),
]);

export type DiagnosticSubmission = typeof diagnosticSubmissionsTable.$inferSelect;
export type DiagnosticAnswer = typeof diagnosticAnswersTable.$inferSelect;
export type DiagnosticResponseMeta = typeof diagnosticResponseMetaTable.$inferSelect;

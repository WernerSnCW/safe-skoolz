import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const protocolsTable = pgTable("protocols", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceNumber: varchar("reference_number", { length: 20 }).notNull().unique(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  openedBy: uuid("opened_by").references(() => usersTable.id).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  protocolType: varchar("protocol_type", { length: 40 }).notNull(),
  protocolSource: varchar("protocol_source", { length: 30 }),
  genderBasedViolence: boolean("gender_based_violence").default(false).notNull(),
  context: varchar("context", { length: 30 }),
  linkedIncidentIds: uuid("linked_incident_ids").array(),
  victimId: uuid("victim_id").references(() => usersTable.id).notNull(),
  allegedPerpetratorIds: uuid("alleged_perpetrator_ids").array(),
  parentNotificationSent: boolean("parent_notification_sent").default(false).notNull(),
  parentNotificationAt: timestamp("parent_notification_at", { withTimezone: true }),
  interviewsRequired: boolean("interviews_required").default(true).notNull(),
  riskAssessment: text("risk_assessment"),
  protectiveMeasures: text("protective_measures").array(),
  externalReferralRequired: boolean("external_referral_required").default(false).notNull(),
  externalReferralBody: varchar("external_referral_body", { length: 100 }),
  externalReferralAt: timestamp("external_referral_at", { withTimezone: true }),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  resolutionNotes: text("resolution_notes"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProtocolSchema = createInsertSchema(protocolsTable).omit({ id: true, openedAt: true, referenceNumber: true, updatedAt: true });
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type ProtocolRecord = typeof protocolsTable.$inferSelect;

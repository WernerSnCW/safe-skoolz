import { pgTable, uuid, varchar, text, boolean, timestamp, date, time, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const incidentsTable = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceNumber: varchar("reference_number", { length: 20 }).notNull().unique(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  reporterId: uuid("reporter_id").references(() => usersTable.id),
  reporterRole: varchar("reporter_role", { length: 20 }).notNull(),
  anonymous: boolean("anonymous").default(false).notNull(),
  submissionDevice: varchar("submission_device", { length: 20 }).default("web"),
  category: varchar("category", { length: 30 }).notNull(),
  escalationTier: integer("escalation_tier").notNull(),
  safeguardingTrigger: boolean("safeguarding_trigger").default(false).notNull(),
  incidentDate: date("incident_date").notNull(),
  incidentTime: time("incident_time"),
  location: varchar("location", { length: 30 }),
  description: text("description"),
  victimIds: uuid("victim_ids").array(),
  perpetratorIds: uuid("perpetrator_ids").array(),
  witnessIds: uuid("witness_ids").array(),
  emotionalState: varchar("emotional_state", { length: 30 }),
  emotionalFreetext: text("emotional_freetext"),
  happeningToMe: boolean("happening_to_me").default(false).notNull(),
  happeningToSomeoneElse: boolean("happening_to_someone_else").default(false).notNull(),
  iSawIt: boolean("i_saw_it").default(false).notNull(),
  childrenSeparated: boolean("children_separated"),
  coordinatorNotified: boolean("coordinator_notified"),
  immediateActionTaken: text("immediate_action_taken"),
  partOfKnownPattern: boolean("part_of_known_pattern"),
  toldByChild: boolean("told_by_child"),
  childConsentToShare: boolean("child_consent_to_share"),
  formalResponseRequested: boolean("formal_response_requested").default(false).notNull(),
  requestExternalReferral: boolean("request_external_referral").default(false).notNull(),
  confidentialFlag: boolean("confidential_flag").default(false).notNull(),
  status: varchar("status", { length: 30 }).default("submitted").notNull(),
  protocolId: uuid("protocol_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, createdAt: true, referenceNumber: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type IncidentRecord = typeof incidentsTable.$inferSelect;

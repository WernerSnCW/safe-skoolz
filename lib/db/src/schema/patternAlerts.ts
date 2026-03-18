import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const patternAlertsTable = pgTable("pattern_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  ruleId: varchar("rule_id", { length: 60 }).notNull(),
  ruleLabel: varchar("rule_label", { length: 100 }),
  alertLevel: varchar("alert_level", { length: 10 }).notNull(),
  victimId: uuid("victim_id").references(() => usersTable.id),
  perpetratorIds: uuid("perpetrator_ids").array(),
  linkedIncidentIds: uuid("linked_incident_ids").array(),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => usersTable.id),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  notes: text("notes"),
});

export const insertPatternAlertSchema = createInsertSchema(patternAlertsTable).omit({ id: true, triggeredAt: true });
export type InsertPatternAlert = z.infer<typeof insertPatternAlertSchema>;
export type PatternAlertRecord = typeof patternAlertsTable.$inferSelect;

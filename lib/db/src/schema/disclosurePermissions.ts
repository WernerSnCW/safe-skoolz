import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const disclosurePermissionsTable = pgTable("incident_disclosure_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  incidentId: uuid("incident_id").notNull(),
  subjectPupilId: uuid("subject_pupil_id").references(() => usersTable.id).notNull(),
  requestedById: uuid("requested_by_id").references(() => usersTable.id).notNull(),
  requestedFromParentId: uuid("requested_from_parent_id").references(() => usersTable.id).notNull(),
  targetRoles: text("target_roles").array(),
  targetUserIds: uuid("target_user_ids").array(),
  scope: varchar("scope", { length: 40 }).default("summary_only").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  respondedById: uuid("responded_by_id").references(() => usersTable.id),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_disclosure_incident").on(table.incidentId),
  index("idx_disclosure_school").on(table.schoolId),
  index("idx_disclosure_parent").on(table.requestedFromParentId),
  index("idx_disclosure_subject").on(table.subjectPupilId),
]);

export const insertDisclosurePermissionSchema = createInsertSchema(disclosurePermissionsTable).omit({ id: true, createdAt: true });
export type InsertDisclosurePermission = z.infer<typeof insertDisclosurePermissionSchema>;
export type DisclosurePermission = typeof disclosurePermissionsTable.$inferSelect;

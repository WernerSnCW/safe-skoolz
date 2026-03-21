import { pgTable, uuid, varchar, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const behaviourPointsTable = pgTable("behaviour_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  pupilId: uuid("pupil_id").references(() => usersTable.id).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  incidentId: uuid("incident_id"),
  issuedBy: uuid("issued_by").references(() => usersTable.id).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
}, (table) => [
  index("idx_behaviour_points_school_id").on(table.schoolId),
  index("idx_behaviour_points_pupil_id").on(table.pupilId),
  index("idx_behaviour_points_issued_at").on(table.issuedAt),
]);

export const BEHAVIOUR_LEVELS = [
  { level: 1, name: "Good Standing", minPoints: 0, maxPoints: 3, color: "green", description: "No concerns — keep it up!" },
  { level: 2, name: "Warning", minPoints: 4, maxPoints: 6, color: "yellow", description: "Some concerns — let's work on this together." },
  { level: 3, name: "Formal Warning", minPoints: 7, maxPoints: 9, color: "orange", description: "Serious concerns — meeting with parents required." },
  { level: 4, name: "Suspension Risk", minPoints: 10, maxPoints: 14, color: "red", description: "At risk of suspension — urgent action needed." },
  { level: 5, name: "Suspended", minPoints: 15, maxPoints: 19, color: "darkred", description: "Suspended from school." },
  { level: 6, name: "Term Exclusion", minPoints: 20, maxPoints: 24, color: "purple", description: "Excluded for the remainder of this term." },
  { level: 7, name: "Full Exclusion", minPoints: 25, maxPoints: Infinity, color: "black", description: "Permanently excluded from school." },
] as const;

export const POINT_CATEGORIES = [
  { id: "disruption", label: "Disruption in class", defaultPoints: 1 },
  { id: "disrespect", label: "Disrespect to staff or pupils", defaultPoints: 2 },
  { id: "bullying", label: "Bullying", defaultPoints: 3 },
  { id: "physical", label: "Physical aggression", defaultPoints: 3 },
  { id: "verbal", label: "Verbal abuse", defaultPoints: 2 },
  { id: "property", label: "Damage to property", defaultPoints: 2 },
  { id: "defiance", label: "Refusal to follow instructions", defaultPoints: 1 },
  { id: "safety", label: "Endangering safety", defaultPoints: 3 },
  { id: "online", label: "Online misconduct", defaultPoints: 2 },
  { id: "other", label: "Other", defaultPoints: 1 },
] as const;

export function getLevelForPoints(totalPoints: number) {
  for (let i = BEHAVIOUR_LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= BEHAVIOUR_LEVELS[i].minPoints) return BEHAVIOUR_LEVELS[i];
  }
  return BEHAVIOUR_LEVELS[0];
}

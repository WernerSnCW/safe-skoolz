import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

// Community concerns raised to the Vibes coalition / PTA (NOT the school's
// safeguarding reporting line). Read the patterns, add your own; exec triages.
export const voiceConcernsTable = pgTable("voice_concerns", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schoolsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("idx_voice_concerns_school").on(t.schoolId, t.status)]);

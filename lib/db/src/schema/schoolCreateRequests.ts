import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

// A request to create a Vibes/PTA for a school that isn't in the directory yet.
// Queued for an admin to review (no second school is approved at launch).
export const schoolCreateRequestsTable = pgTable("school_create_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolName: varchar("school_name", { length: 255 }).notNull(),
  requestedByEmail: varchar("requested_by_email", { length: 255 }).notNull(),
  note: text("note"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

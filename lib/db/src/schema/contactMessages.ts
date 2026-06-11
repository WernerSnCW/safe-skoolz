import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

// Public contact-form submissions from the SchoolVBE site (/about#contact).
// No school scoping — these arrive before any relationship exists. Read via
// admin tooling; handledAt marks triage.
export const contactMessagesTable = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  handledAt: timestamp("handled_at", { withTimezone: true }),
});

export type ContactMessage = typeof contactMessagesTable.$inferSelect;

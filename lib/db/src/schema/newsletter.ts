import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationType: varchar("organisation_type", { length: 30 }).notNull(),
  organisationName: varchar("organisation_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 100 }),
  region: varchar("region", { length: 100 }),
  interests: text("interests"),
  consentGiven: boolean("consent_given").default(false).notNull(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

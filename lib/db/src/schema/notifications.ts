import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  recipientId: uuid("recipient_id").references(() => usersTable.id).notNull(),
  trigger: varchar("trigger", { length: 60 }).notNull(),
  channel: varchar("channel", { length: 20 }).default("in_app").notNull(),
  subject: text("subject"),
  body: text("body"),
  reference: varchar("reference", { length: 20 }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  delivered: boolean("delivered").default(false).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, sentAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationRecord = typeof notificationsTable.$inferSelect;

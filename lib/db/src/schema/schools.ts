import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolsTable = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // URL-safe identifier for public school pages (e.g. /d/morna). Nullable —
  // only schools with public surfaces need one.
  slug: varchar("slug", { length: 60 }).unique(),
  legalEntity: varchar("legal_entity", { length: 255 }),
  cif: varchar("cif", { length: 20 }),
  address: text("address"),
  country: varchar("country", { length: 10 }).default("ES").notNull(),
  region: varchar("region", { length: 50 }).default("Balearic Islands").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
  // Set when the PTA adopts its operating-structure charter (B1). Null = forming/unclaimed.
  ptaClaimedAt: timestamp("pta_claimed_at", { withTimezone: true }),
  // Phase-1 tenant config (spec §3.1). display_name drives "{School} Vibes";
  // theme overrides design tokens (v1: { primaryColor: "H S% L%" }); capabilities
  // is a key→bool map resolved server-side over CAPABILITY_DEFAULTS.
  displayName: varchar("display_name", { length: 255 }),
  theme: jsonb("theme").notNull().default({}),
  capabilities: jsonb("capabilities").notNull().default({}),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;

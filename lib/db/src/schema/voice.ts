import { pgTable, uuid, varchar, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

/**
 * VOICE — parent advocacy collectives.
 *
 * A VOICE is a parent collective formed around a mission: get the school (and
 * PTA) to adopt VBE. It is the on-ramp to PTA governance — scattered individual
 * concerns become one unified, visible ask. Lifecycle:
 *
 *   1. advocating — parents create/join/back the collective (Slice 1, here).
 *   2. converted  — once the school adopts VBE, members fold into the PTA at one
 *                   of the three tiers (Slice 2). Recorded by status=converted +
 *                   convertedAt; membership rows are mapped to pta_members.
 *
 * v1: membership IS backing (no separate endorsements table). Names are
 * legitimately visible — these are adult parents who opted into a public ask —
 * so, like ptaGovernance, this is NOT behind ptaPiiMiddleware.
 */

export const VOICE_STATUSES = ["advocating", "converted"] as const;
export const VOICE_MEMBER_ROLES = ["founder", "member"] as const;

export const voiceGroupsTable = pgTable("voice_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // The advocacy goal — what this collective is asking the school to do.
  mission: text("mission").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("advocating"),
  createdById: uuid("created_by_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Set when the VOICE converts into PTA membership (Slice 2).
  convertedAt: timestamp("converted_at", { withTimezone: true }),
}, (t) => [
  index("idx_voice_groups_school").on(t.schoolId),
  index("idx_voice_groups_status").on(t.schoolId, t.status),
]);

export const voiceMembersTable = pgTable("voice_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  // The creator is the founder; everyone who joins is a member. Both back the mission.
  role: varchar("role", { length: 20 }).notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_voice_members_voice").on(t.voiceId),
  // One membership per user per VOICE.
  unique("uq_voice_members_voice_user").on(t.voiceId, t.userId),
]);

// Public supporters — parents who back a VOICE from the shareable public page
// without (yet) having an account. Name + email only; lighter than a full
// voice_member. Counts toward the VOICE's backing. Can be upgraded to a real
// member/user later. Unique per (voice, email).
export const voiceSupportersTable = pgTable("voice_supporters", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_voice_supporters_voice").on(t.voiceId),
  unique("uq_voice_supporters_voice_email").on(t.voiceId, t.email),
]);

export type VoiceGroup = typeof voiceGroupsTable.$inferSelect;
export type VoiceMember = typeof voiceMembersTable.$inferSelect;
export type VoiceSupporter = typeof voiceSupportersTable.$inferSelect;

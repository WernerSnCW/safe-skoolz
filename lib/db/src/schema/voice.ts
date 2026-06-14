import { pgTable, uuid, varchar, text, timestamp, index, unique, boolean, jsonb, integer } from "drizzle-orm/pg-core";
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
  // Phase 4b (spec §4.1): nullable — the VOICE is created founder-less when a
  // school is started; the founder is set when the creator signs up at /join/:slug
  // (first backer becomes founder). Pre-4b VOICEs always have a founder.
  createdById: uuid("created_by_id").references(() => usersTable.id),
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
  // Chapter 2 (spec §4): self-declared at backing — is this parent a CURRENT PTA
  // member? Feeds the legitimacy metric (VOICE backers vs the non-VOICE PTA).
  // Captured at /auth/signup; null = not asked / unknown.
  wasPtaMember: boolean("was_pta_member"),
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
  // Chapter 2 (spec §4): self-declared at public backing (mirrors voice_members).
  wasPtaMember: boolean("was_pta_member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_voice_supporters_voice").on(t.voiceId),
  unique("uq_voice_supporters_voice_email").on(t.voiceId, t.email),
]);

export type VoiceGroup = typeof voiceGroupsTable.$inferSelect;
export type VoiceMember = typeof voiceMembersTable.$inferSelect;
export type VoiceSupporter = typeof voiceSupportersTable.$inferSelect;

// ── Chapter 2: the Legitimacy Pathway (spec §2/§5) ───────────────────────────

export const PATHWAY_STAGES = [
  "your_voice",
  "shared_voice",
  "collective_signal",
  "pta_motion",
  "school_recognition",
] as const;
export type PathwayStage = (typeof PATHWAY_STAGES)[number];

export const PTA_MOTION_OUTCOMES = ["vad_adopted", "vad_declined"] as const;
export type PtaMotionOutcome = (typeof PTA_MOTION_OUTCOMES)[number];

export const MANDATE_GOALS = ["G1", "G2"] as const;
export type MandateGoal = (typeof MANDATE_GOALS)[number];

export const coalitionPathwayTable = pgTable("coalition_pathway", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull().unique(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  stage: varchar("stage", { length: 24 }).notNull().default("your_voice"),
  incumbentPtaSize: integer("incumbent_pta_size"),
  incumbentConfirmedBySchoolAt: timestamp("incumbent_confirmed_by_school_at", { withTimezone: true }),
  signalFiredAt: timestamp("signal_fired_at", { withTimezone: true }),
  ptaMotionOutcome: varchar("pta_motion_outcome", { length: 16 }),
  ptaMotionRecordedAt: timestamp("pta_motion_recorded_at", { withTimezone: true }),
  ptaMotionRecordedBy: uuid("pta_motion_recorded_by").references(() => usersTable.id),
  schoolRecognisedAt: timestamp("school_recognised_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_coalition_pathway_school").on(t.schoolId),
]);

export const voiceMandatesTable = pgTable("voice_mandates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  goal: varchar("goal", { length: 2 }).notNull(),
  authorisedAt: timestamp("authorised_at", { withTimezone: true }).notNull().defaultNow(),
  confirmationEvent: text("confirmation_event"),
}, (t) => [
  index("idx_voice_mandates_school_goal").on(t.schoolId, t.goal),
  unique("uq_voice_mandates_user_school_goal").on(t.userId, t.schoolId, t.goal),
]);

export const collectiveSignalsTable = pgTable("collective_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  voiceId: uuid("voice_id").references(() => voiceGroupsTable.id).notNull(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
  firedById: uuid("fired_by_id").references(() => usersTable.id),
  topics: jsonb("topics").notNull().default(["G1", "G2"]),
  memberCountAtFire: integer("member_count_at_fire").notNull(),
  schoolResponseStatus: varchar("school_response_status", { length: 20 }),
  schoolResponseText: text("school_response_text"),
  schoolRespondedAt: timestamp("school_responded_at", { withTimezone: true }),
}, (t) => [
  index("idx_collective_signals_voice").on(t.voiceId),
]);

export type CoalitionPathway = typeof coalitionPathwayTable.$inferSelect;
export type VoiceMandate = typeof voiceMandatesTable.$inferSelect;
export type CollectiveSignal = typeof collectiveSignalsTable.$inferSelect;

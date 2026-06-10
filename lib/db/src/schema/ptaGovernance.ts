import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";

/**
 * PTA governance — membership roster and officer appointments.
 *
 * This is the foundation for the wider PTA-governance expansion (decisions,
 * voting, quorum, communications): voting and quorum need a member roster, and
 * "equal standing, responsibility not authority" is modelled as tiers (who has
 * taken on what) plus officer appointments (named responsibility/domains) —
 * never as differential voting power.
 *
 * Privacy note: these records describe adult PTA volunteers who have opted in,
 * so member names ARE visible to PTA officers managing the roster. This is
 * deliberately NOT behind ptaPiiMiddleware (which anonymises pupil/incident
 * data); it is a separate router with no PII stripping.
 */

// Three-tier model: responsibility, not rank. A member's tier records what
// work they have taken on, not authority over others.
export const PTA_TIERS = ["executive_board", "senior_group", "general_membership"] as const;
export const PTA_MEMBER_STATUSES = ["active", "invited", "lapsed"] as const;
export const PTA_OFFICER_ROLES = ["chair", "vice_chair", "secretary", "treasurer", "domain_lead"] as const;

// Decision log. A proposal must reach an explicit decision — "no proposal left
// without a decision". An open proposal past its decisionDueAt is surfaced as
// overdue ("silence is not acceptance"); the decision outcomes are the terminal
// statuses. decided/withdrawn are recorded with who + when.
export const PTA_PROPOSAL_STATUSES = ["open", "carried", "rejected", "deferred", "withdrawn"] as const;
export const PTA_DECISION_OUTCOMES = ["carried", "rejected", "deferred"] as const;
export const PTA_PROPOSAL_CATEGORIES = ["school_engagement", "internal", "spending", "event", "other"] as const;

// Voting. A ballot is a vote on a question (optionally tied to a proposal). One
// vote per member; quorum is measured against the active-member roster. Proxy
// voting: a member grants a standing proxy to another member, who may cast on
// their behalf (recorded with viaProxy + the actual castBy user).
export const PTA_BALLOT_STATUSES = ["open", "closed"] as const;
export const PTA_DEFAULT_BALLOT_OPTIONS = ["For", "Against", "Abstain"] as const;

// Communications. PTA announcements with audience targeting — segment by who
// they're for. Transparency publishing + targeted messaging (Part B §19).
export const PTA_ANNOUNCEMENT_AUDIENCES = [
  "all_parents",
  "all_members",
  "officers",
  "executive_board",
  "senior_group",
  "general_membership",
] as const;

export const ptaMembersTable = pgTable("pta_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  tier: varchar("tier", { length: 30 }).notNull().default("general_membership"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_members_school").on(t.schoolId),
  unique("uq_pta_members_school_user").on(t.schoolId, t.userId),
]);

export const ptaOfficersTable = pgTable("pta_officers", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  memberId: uuid("member_id").references(() => ptaMembersTable.id).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  // For domain_lead (and optionally others): the portfolio/domain of responsibility,
  // e.g. "Communications", "Events", "Safeguarding liaison".
  domain: varchar("domain", { length: 120 }),
  termStartAt: timestamp("term_start_at", { withTimezone: true }).notNull().defaultNow(),
  termEndAt: timestamp("term_end_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_officers_school").on(t.schoolId),
  index("idx_pta_officers_member").on(t.memberId),
]);

export const ptaProposalsTable = pgTable("pta_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  raisedById: uuid("raised_by_id").references(() => usersTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  detail: text("detail").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  // The date by which a decision is expected. An open proposal past this is overdue.
  decisionDueAt: timestamp("decision_due_at", { withTimezone: true }),
  // Recorded when a decision is taken.
  decisionRationale: text("decision_rationale"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedById: uuid("decided_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_proposals_school").on(t.schoolId),
  index("idx_pta_proposals_status").on(t.schoolId, t.status),
]);

export const ptaBallotsTable = pgTable("pta_ballots", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  proposalId: uuid("proposal_id").references(() => ptaProposalsTable.id),
  question: varchar("question", { length: 255 }).notNull(),
  description: text("description"),
  options: jsonb("options").$type<string[]>().notNull().default(["For", "Against", "Abstain"]),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  // Minimum votes required for the result to be valid. Null = no quorum requirement.
  quorum: integer("quorum"),
  // For async/email ballots: the close deadline.
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdById: uuid("created_by_id").references(() => usersTable.id).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_ballots_school").on(t.schoolId),
  index("idx_pta_ballots_status").on(t.schoolId, t.status),
]);

export const ptaVotesTable = pgTable("pta_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  ballotId: uuid("ballot_id").references(() => ptaBallotsTable.id).notNull(),
  // The member whose vote this is (may differ from castById when cast by proxy).
  memberId: uuid("member_id").references(() => ptaMembersTable.id).notNull(),
  choice: varchar("choice", { length: 100 }).notNull(),
  castById: uuid("cast_by_id").references(() => usersTable.id).notNull(),
  viaProxy: boolean("via_proxy").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_votes_ballot").on(t.ballotId),
  unique("uq_pta_votes_ballot_member").on(t.ballotId, t.memberId),
]);

export const ptaProxiesTable = pgTable("pta_proxies", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  grantorMemberId: uuid("grantor_member_id").references(() => ptaMembersTable.id).notNull(),
  holderMemberId: uuid("holder_member_id").references(() => ptaMembersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_proxies_school").on(t.schoolId),
  // One standing proxy per grantor.
  unique("uq_pta_proxies_grantor").on(t.schoolId, t.grantorMemberId),
]);

export type PtaMember = typeof ptaMembersTable.$inferSelect;
export type PtaOfficer = typeof ptaOfficersTable.$inferSelect;
export type PtaProposal = typeof ptaProposalsTable.$inferSelect;
export const ptaAnnouncementsTable = pgTable("pta_announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  audience: varchar("audience", { length: 30 }).notNull().default("all_members"),
  pinned: boolean("pinned").notNull().default(false),
  createdById: uuid("created_by_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_announcements_school").on(t.schoolId),
]);

export type PtaBallot = typeof ptaBallotsTable.$inferSelect;
export type PtaVote = typeof ptaVotesTable.$inferSelect;
export type PtaProxy = typeof ptaProxiesTable.$inferSelect;
export type PtaAnnouncement = typeof ptaAnnouncementsTable.$inferSelect;

import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { schoolsTable } from "./schools";
import { usersTable } from "./users";
import { voiceGroupsTable } from "./voice";

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
export const PTA_OFFICER_ROLES = ["president", "vice_president", "chair", "vice_chair", "secretary", "treasurer", "domain_lead"] as const;

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

// Initiatives — the "organise" primitive (post-adoption). Where proposals are
// decisions, ballots are votes, and announcements are comms, an initiative is a
// concrete thing the PTA RUNS: a project/campaign with a goal and a lifecycle.
// It often grows out of a converted VOICE's mission (optional originVoiceId),
// completing the arc: advocate → convert → organise.
export const PTA_INITIATIVE_STATUSES = ["proposed", "active", "completed", "cancelled"] as const;

// B4 — the five-stage school process (docx §8), as a granular state machine.
// 'none' is the off-ramp for internal / self-approved initiatives that never
// touch the school. The five named stages map: idea=1, presented=2,
// accepted/rejected=3, planning=4, delivering/delivered=5.
export const PTA_INITIATIVE_SCHOOL_STAGES = ["none", "idea", "presented", "accepted", "rejected", "planning", "delivering", "delivered"] as const;
// self = any single exec, all six checklist boxes ticked + backed (docx §6/§7);
// board = checklist failed, recorded as a board decision (record-only).
export const PTA_INITIATIVE_APPROVAL_TYPES = ["self", "board"] as const;
// Stage-history rows: an actual stage transition, or a logged follow-up chase
// against a non-response ("silence is not acceptance", docx §10).
export const PTA_INITIATIVE_STAGE_ENTRY_TYPES = ["transition", "follow_up"] as const;

// The six self-approval booleans (docx §7), stored as one jsonb object.
export type InitiativeChecklist = {
  alignsGoal: boolean;
  budgetOk: boolean;
  namedOwner: boolean;
  noConflict: boolean;
  successCriteria: boolean;
  noSchoolResource: boolean;
};
export const EMPTY_INITIATIVE_CHECKLIST: InitiativeChecklist = {
  alignsGoal: false, budgetOk: false, namedOwner: false, noConflict: false, successCriteria: false, noSchoolResource: false,
};

export const PTA_GOAL_STATUSES = ["proposed", "shortlisted", "ratified", "completed", "failed"] as const;
export const PTA_BALLOT_ELECTORATES = ["all_members", "senior_group"] as const;

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
  // Who may vote: 'all_members' (default, the whole active roster) or 'senior_group'
  // (senior_group + executive_board tiers — used for goal ratification, B3).
  electorate: varchar("electorate", { length: 20 }).notNull().default("all_members"),
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

export const ptaInitiativesTable = pgTable("pta_initiatives", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  // What the PTA is organising and the goal.
  summary: text("summary").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("proposed"),
  // Who is leading it (a school user — typically a PTA member/officer). Optional.
  ownerId: uuid("owner_id").references(() => usersTable.id),
  // The converted VOICE this initiative grew out of, if any — links the arc.
  originVoiceId: uuid("origin_voice_id").references(() => voiceGroupsTable.id),
  targetDate: timestamp("target_date", { withTimezone: true }),
  createdById: uuid("created_by_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // --- B4: one-page note (docx §7) ---
  goalId: uuid("goal_id").references(() => ptaGoalsTable.id),
  successCriteria: text("success_criteria"),
  resourcesNeeded: text("resources_needed"),
  conflicts: text("conflicts"),
  // --- B4: six-box self-approval checklist (docx §6/§7) ---
  checklist: jsonb("checklist").$type<InitiativeChecklist>().notNull().default(EMPTY_INITIATIVE_CHECKLIST),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalType: varchar("approval_type", { length: 10 }),
  // --- B4: five-stage school process (docx §8) ---
  schoolStage: varchar("school_stage", { length: 20 }).notNull().default("none"),
  // When a school response is expected, set on → presented. Past + still
  // 'presented' = a non-response (computed, not stored).
  responseDueAt: timestamp("response_due_at", { withTimezone: true }),
}, (t) => [
  index("idx_pta_initiatives_school").on(t.schoolId),
  index("idx_pta_initiatives_status").on(t.schoolId, t.status),
]);

export type PtaBallot = typeof ptaBallotsTable.$inferSelect;
export type PtaVote = typeof ptaVotesTable.$inferSelect;
export type PtaProxy = typeof ptaProxiesTable.$inferSelect;
export type PtaAnnouncement = typeof ptaAnnouncementsTable.$inferSelect;
export type PtaInitiative = typeof ptaInitiativesTable.$inferSelect;

// PTA annual goals (B3). Proposed by any member, shortlisted by admin, ratified
// by a senior-group ballot (ballotId → pta_ballots with electorate='senior_group'),
// then completed or failed (failed records a postmortem). Visible to all members.
export const ptaGoalsTable = pgTable("pta_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("proposed"),
  proposedById: uuid("proposed_by_id").references(() => usersTable.id).notNull(),
  ballotId: uuid("ballot_id").references(() => ptaBallotsTable.id),
  ratifiedAt: timestamp("ratified_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  postmortemNote: text("postmortem_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_goals_school").on(t.schoolId),
  index("idx_pta_goals_status").on(t.schoolId, t.status),
]);
export type PtaGoal = typeof ptaGoalsTable.$inferSelect;

// B4 — append-only history of an initiative's journey through the school's
// five-stage process. Each 'transition' row records a stage change (with the
// real-world occurredAt, a written outcome, and a reason on rejection); each
// 'follow_up' row records a chase against a non-response.
export const ptaInitiativeStageHistoryTable = pgTable("pta_initiative_stage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schoolsTable.id).notNull(),
  initiativeId: uuid("initiative_id").references(() => ptaInitiativesTable.id).notNull(),
  entryType: varchar("entry_type", { length: 20 }).notNull().default("transition"),
  fromStage: varchar("from_stage", { length: 20 }),
  toStage: varchar("to_stage", { length: 20 }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  outcomeNote: text("outcome_note"),
  reason: text("reason"),
  recordedById: uuid("recorded_by_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pta_init_stage_hist_initiative").on(t.initiativeId),
]);
export type PtaInitiativeStageHistory = typeof ptaInitiativeStageHistoryTable.$inferSelect;

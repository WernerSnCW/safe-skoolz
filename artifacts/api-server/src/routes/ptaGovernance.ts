import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  ptaMembersTable,
  ptaOfficersTable,
  ptaProposalsTable,
  ptaBallotsTable,
  ptaVotesTable,
  ptaProxiesTable,
  ptaAnnouncementsTable,
  ptaInitiativesTable,
  ptaGoalsTable,
  voiceGroupsTable,
  usersTable,
  PTA_TIERS,
  PTA_MEMBER_STATUSES,
  PTA_OFFICER_ROLES,
  PTA_DECISION_OUTCOMES,
  PTA_PROPOSAL_CATEGORIES,
  PTA_ANNOUNCEMENT_AUDIENCES,
  PTA_INITIATIVE_STATUSES,
  PTA_BALLOT_ELECTORATES,
  EMPTY_INITIATIVE_CHECKLIST,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

/**
 * PTA governance — membership roster + officer appointments.
 *
 * Separate router from pta.ts ON PURPOSE: the anonymising ptaPiiMiddleware is
 * NOT applied here. These records are adult PTA volunteers managing their own
 * body, so member names are legitimately visible to PTA officers and school
 * leadership. Pupil/incident PII remains protected on the pta.ts routes.
 *
 * v1 permissions: any `pta` user may manage the roster (the PTA self-governs);
 * coordinator + head_teacher may view for oversight. Officer-scoped permissions
 * (e.g. chair-only) come once the roster exists.
 */
const router: IRouter = Router();

const MANAGE = requireRole("pta");
const VIEW = requireRole("pta", "coordinator", "head_teacher");

function user(req: any): JwtPayload {
  return req.user as JwtPayload;
}

// --- Members ---------------------------------------------------------------

// GET /pta/members — roster with member names + their active officer roles.
router.get("/pta/members", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const members = await db
    .select({
      id: ptaMembersTable.id,
      userId: ptaMembersTable.userId,
      tier: ptaMembersTable.tier,
      status: ptaMembersTable.status,
      joinedAt: ptaMembersTable.joinedAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
    })
    .from(ptaMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaMembersTable.userId))
    .where(eq(ptaMembersTable.schoolId, u.schoolId))
    .orderBy(ptaMembersTable.tier, usersTable.lastName);

  const officers = await db
    .select()
    .from(ptaOfficersTable)
    .where(and(eq(ptaOfficersTable.schoolId, u.schoolId), eq(ptaOfficersTable.active, true)));

  const byMember: Record<string, { role: string; domain: string | null }[]> = {};
  for (const o of officers) {
    (byMember[o.memberId] ??= []).push({ role: o.role, domain: o.domain });
  }

  res.json({
    members: members.map((m) => ({
      ...m,
      name: `${m.firstName} ${m.lastName}`.trim(),
      offices: byMember[m.id] ?? [],
    })),
  });
});

// GET /pta/members/candidates — school users (parents / pta) not yet members.
router.get("/pta/members/candidates", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const existing = await db
    .select({ userId: ptaMembersTable.userId })
    .from(ptaMembersTable)
    .where(eq(ptaMembersTable.schoolId, u.schoolId));
  const existingIds = existing.map((e) => e.userId);

  const where = existingIds.length
    ? and(
        eq(usersTable.schoolId, u.schoolId),
        inArray(usersTable.role, ["parent", "pta"]),
        notInArray(usersTable.id, existingIds),
      )
    : and(eq(usersTable.schoolId, u.schoolId), inArray(usersTable.role, ["parent", "pta"]));

  const candidates = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(where)
    .orderBy(usersTable.lastName);

  res.json({ candidates: candidates.map((c) => ({ ...c, name: `${c.firstName} ${c.lastName}`.trim() })) });
});

// POST /pta/members — add a member. Body: { userId, tier?, status? }
router.post("/pta/members", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { userId, tier = "general_membership", status = "active" } = req.body ?? {};

  if (!userId || typeof userId !== "string") { res.status(400).json({ error: "userId is required" }); return; }
  if (!PTA_TIERS.includes(tier)) { res.status(400).json({ error: `tier must be one of: ${PTA_TIERS.join(", ")}` }); return; }
  if (!PTA_MEMBER_STATUSES.includes(status)) { res.status(400).json({ error: `status must be one of: ${PTA_MEMBER_STATUSES.join(", ")}` }); return; }

  // The user must belong to this school.
  const target = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId))).limit(1);
  if (!target.length) { res.status(404).json({ error: "User not found in this school" }); return; }

  // Idempotent on (school, user).
  const dupe = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, u.schoolId), eq(ptaMembersTable.userId, userId))).limit(1);
  if (dupe.length) { res.status(409).json({ error: "User is already a PTA member" }); return; }

  const [member] = await db.insert(ptaMembersTable)
    .values({ schoolId: u.schoolId, userId, tier, status }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_member_added", actor: u, targetType: "pta_member", targetId: member.id, details: { userId, tier, status }, req });
  res.status(201).json({ member });
});

// PATCH /pta/members/:id — update tier / status.
router.patch("/pta/members/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { tier, status } = req.body ?? {};

  if (tier !== undefined && !PTA_TIERS.includes(tier)) { res.status(400).json({ error: `tier must be one of: ${PTA_TIERS.join(", ")}` }); return; }
  if (status !== undefined && !PTA_MEMBER_STATUSES.includes(status)) { res.status(400).json({ error: `status must be one of: ${PTA_MEMBER_STATUSES.join(", ")}` }); return; }
  if (tier === undefined && status === undefined) { res.status(400).json({ error: "Nothing to update" }); return; }

  const existing = await db.select().from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.id, id), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Member not found" }); return; }

  const patch: Record<string, unknown> = {};
  if (tier !== undefined) patch.tier = tier;
  if (status !== undefined) patch.status = status;

  const [member] = await db.update(ptaMembersTable).set(patch)
    .where(eq(ptaMembersTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_member_updated", actor: u, targetType: "pta_member", targetId: id, details: patch, req });
  res.json({ member });
});

// DELETE /pta/members/:id — remove member (and end any officer appointments).
router.delete("/pta/members/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const existing = await db.select().from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.id, id), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Member not found" }); return; }

  await db.delete(ptaOfficersTable).where(and(eq(ptaOfficersTable.memberId, id), eq(ptaOfficersTable.schoolId, u.schoolId)));
  await db.delete(ptaMembersTable).where(eq(ptaMembersTable.id, id));

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_member_removed", actor: u, targetType: "pta_member", targetId: id, details: { userId: existing[0].userId }, req });
  res.json({ ok: true });
});

// --- Officers --------------------------------------------------------------

// GET /pta/officers — active officers with member name.
router.get("/pta/officers", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const officers = await db
    .select({
      id: ptaOfficersTable.id,
      memberId: ptaOfficersTable.memberId,
      role: ptaOfficersTable.role,
      domain: ptaOfficersTable.domain,
      termStartAt: ptaOfficersTable.termStartAt,
      active: ptaOfficersTable.active,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(ptaOfficersTable)
    .innerJoin(ptaMembersTable, eq(ptaMembersTable.id, ptaOfficersTable.memberId))
    .innerJoin(usersTable, eq(usersTable.id, ptaMembersTable.userId))
    .where(and(eq(ptaOfficersTable.schoolId, u.schoolId), eq(ptaOfficersTable.active, true)))
    .orderBy(desc(ptaOfficersTable.termStartAt));

  res.json({ officers: officers.map((o) => ({ ...o, name: `${o.firstName} ${o.lastName}`.trim() })) });
});

// POST /pta/officers — appoint. Body: { memberId, role, domain? }
router.post("/pta/officers", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { memberId, role, domain = null } = req.body ?? {};

  if (!memberId || typeof memberId !== "string") { res.status(400).json({ error: "memberId is required" }); return; }
  if (!PTA_OFFICER_ROLES.includes(role)) { res.status(400).json({ error: `role must be one of: ${PTA_OFFICER_ROLES.join(", ")}` }); return; }
  if (role === "domain_lead" && (!domain || typeof domain !== "string")) { res.status(400).json({ error: "domain is required for a domain_lead" }); return; }

  const member = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.id, memberId), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
  if (!member.length) { res.status(404).json({ error: "Member not found" }); return; }

  const [officer] = await db.insert(ptaOfficersTable)
    .values({ schoolId: u.schoolId, memberId, role, domain: domain || null }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_officer_appointed", actor: u, targetType: "pta_officer", targetId: officer.id, details: { memberId, role, domain }, req });
  res.status(201).json({ officer });
});

// POST /pta/officers/:id/end — end an appointment (sets active=false, termEndAt=now).
router.post("/pta/officers/:id/end", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const existing = await db.select().from(ptaOfficersTable)
    .where(and(eq(ptaOfficersTable.id, id), eq(ptaOfficersTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Officer appointment not found" }); return; }

  const [officer] = await db.update(ptaOfficersTable)
    .set({ active: false, termEndAt: sql`now()` })
    .where(eq(ptaOfficersTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_officer_ended", actor: u, targetType: "pta_officer", targetId: id, details: { role: existing[0].role }, req });
  res.json({ officer });
});

// --- Decision log (proposals) ----------------------------------------------

// GET /pta/proposals — the decision log. Open proposals past their due date are
// flagged `overdue` ("silence is not acceptance").
router.get("/pta/proposals", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const raiser = alias(usersTable, "raiser");
  const decider = alias(usersTable, "decider");
  const rows = await db
    .select({
      id: ptaProposalsTable.id,
      title: ptaProposalsTable.title,
      detail: ptaProposalsTable.detail,
      category: ptaProposalsTable.category,
      status: ptaProposalsTable.status,
      decisionDueAt: ptaProposalsTable.decisionDueAt,
      decisionRationale: ptaProposalsTable.decisionRationale,
      decidedAt: ptaProposalsTable.decidedAt,
      createdAt: ptaProposalsTable.createdAt,
      raisedByFirst: raiser.firstName,
      raisedByLast: raiser.lastName,
      decidedByFirst: decider.firstName,
      decidedByLast: decider.lastName,
    })
    .from(ptaProposalsTable)
    .innerJoin(raiser, eq(raiser.id, ptaProposalsTable.raisedById))
    .leftJoin(decider, eq(decider.id, ptaProposalsTable.decidedById))
    .where(eq(ptaProposalsTable.schoolId, u.schoolId))
    .orderBy(desc(ptaProposalsTable.createdAt));

  const now = Date.now();
  res.json({
    proposals: rows.map((p) => ({
      id: p.id,
      title: p.title,
      detail: p.detail,
      category: p.category,
      status: p.status,
      decisionDueAt: p.decisionDueAt,
      decisionRationale: p.decisionRationale,
      decidedAt: p.decidedAt,
      createdAt: p.createdAt,
      raisedBy: `${p.raisedByFirst} ${p.raisedByLast}`.trim(),
      decidedBy: p.decidedByFirst ? `${p.decidedByFirst} ${p.decidedByLast}`.trim() : null,
      overdue: p.status === "open" && !!p.decisionDueAt && new Date(p.decisionDueAt).getTime() < now,
    })),
  });
});

// POST /pta/proposals — raise a proposal. Body: { title, detail, category?, decisionDueAt? }
router.post("/pta/proposals", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, detail, category = "other", decisionDueAt } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }
  if (!detail || typeof detail !== "string" || !detail.trim()) { res.status(400).json({ error: "detail is required" }); return; }
  if (!PTA_PROPOSAL_CATEGORIES.includes(category)) { res.status(400).json({ error: `category must be one of: ${PTA_PROPOSAL_CATEGORIES.join(", ")}` }); return; }
  let dueDate: Date | null = null;
  if (decisionDueAt) {
    dueDate = new Date(decisionDueAt);
    if (isNaN(dueDate.getTime())) { res.status(400).json({ error: "decisionDueAt must be a valid date" }); return; }
  }

  const [proposal] = await db.insert(ptaProposalsTable)
    .values({ schoolId: u.schoolId, raisedById: u.userId, title: title.trim(), detail: detail.trim(), category, decisionDueAt: dueDate }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_proposal_raised", actor: u, targetType: "pta_proposal", targetId: proposal.id, details: { title: title.trim(), category }, req });
  res.status(201).json({ proposal });
});

// POST /pta/proposals/:id/decide — record an explicit decision. Body: { outcome, rationale? }
router.post("/pta/proposals/:id/decide", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { outcome, rationale = null } = req.body ?? {};

  if (!PTA_DECISION_OUTCOMES.includes(outcome)) { res.status(400).json({ error: `outcome must be one of: ${PTA_DECISION_OUTCOMES.join(", ")}` }); return; }

  const existing = await db.select().from(ptaProposalsTable)
    .where(and(eq(ptaProposalsTable.id, id), eq(ptaProposalsTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Proposal not found" }); return; }
  if (existing[0].status !== "open") { res.status(409).json({ error: "Proposal is not open" }); return; }

  const [proposal] = await db.update(ptaProposalsTable)
    .set({ status: outcome, decisionRationale: rationale || null, decidedAt: sql`now()`, decidedById: u.userId })
    .where(eq(ptaProposalsTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_proposal_decided", actor: u, targetType: "pta_proposal", targetId: id, details: { outcome, rationale }, req });
  res.json({ proposal });
});

// POST /pta/proposals/:id/withdraw — withdraw an open proposal.
router.post("/pta/proposals/:id/withdraw", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const existing = await db.select().from(ptaProposalsTable)
    .where(and(eq(ptaProposalsTable.id, id), eq(ptaProposalsTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Proposal not found" }); return; }
  if (existing[0].status !== "open") { res.status(409).json({ error: "Proposal is not open" }); return; }

  const [proposal] = await db.update(ptaProposalsTable)
    .set({ status: "withdrawn" }).where(eq(ptaProposalsTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_proposal_withdrawn", actor: u, targetType: "pta_proposal", targetId: id, details: {}, req });
  res.json({ proposal });
});

// --- Voting (ballots, votes, proxies) --------------------------------------

// Resolve the current user's PTA member row (voters must be on the roster).
async function myMember(schoolId: string, userId: string): Promise<{ id: string; tier: string } | null> {
  const r = await db.select({ id: ptaMembersTable.id, tier: ptaMembersTable.tier }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, schoolId), eq(ptaMembersTable.userId, userId))).limit(1);
  return r[0] ?? null;
}

// GET /pta/ballots — ballots with live tally, quorum status, and my own vote.
router.get("/pta/ballots", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const ballots = await db.select().from(ptaBallotsTable)
    .where(eq(ptaBallotsTable.schoolId, u.schoolId)).orderBy(desc(ptaBallotsTable.createdAt));

  const ids = ballots.map((b) => b.id);
  const votes = ids.length
    ? await db.select({ ballotId: ptaVotesTable.ballotId, choice: ptaVotesTable.choice, memberId: ptaVotesTable.memberId })
        .from(ptaVotesTable).where(inArray(ptaVotesTable.ballotId, ids))
    : [];
  const activeMembers = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, u.schoolId), eq(ptaMembersTable.status, "active")));
  const rosterActive = activeMembers.length;
  const mm = await myMember(u.schoolId, u.userId);
  const now = Date.now();

  res.json({
    rosterActive,
    isMember: !!mm,
    ballots: ballots.map((b) => {
      const bv = votes.filter((v) => v.ballotId === b.id);
      const tally: Record<string, number> = {};
      for (const opt of (b.options as string[])) tally[opt] = 0;
      for (const v of bv) tally[v.choice] = (tally[v.choice] ?? 0) + 1;
      const total = bv.length;
      const expired = !!b.closesAt && new Date(b.closesAt).getTime() < now;
      const effectiveStatus = b.status === "open" && expired ? "closed" : b.status;
      return {
        id: b.id,
        question: b.question,
        description: b.description,
        options: b.options,
        status: effectiveStatus,
        quorum: b.quorum,
        closesAt: b.closesAt,
        createdAt: b.createdAt,
        tally,
        totalVotes: total,
        quorumMet: b.quorum == null ? null : total >= b.quorum,
        myVote: mm ? (bv.find((v) => v.memberId === mm.id)?.choice ?? null) : null,
      };
    }),
  });
});

// POST /pta/ballots — open a ballot. Body: { question, description?, options?, quorum?, closesAt?, proposalId? }
router.post("/pta/ballots", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { question, description = null, options, quorum = null, closesAt, proposalId = null } = req.body ?? {};
  if (!question || typeof question !== "string" || !question.trim()) { res.status(400).json({ error: "question is required" }); return; }

  let opts: string[] = ["For", "Against", "Abstain"];
  if (options !== undefined) {
    if (!Array.isArray(options) || options.length < 2 || !options.every((o: unknown) => typeof o === "string" && o.trim())) {
      res.status(400).json({ error: "options must be an array of at least 2 non-empty strings" }); return;
    }
    opts = options.map((o: string) => o.trim());
  }
  if (quorum != null && (!Number.isInteger(quorum) || quorum < 0)) { res.status(400).json({ error: "quorum must be a non-negative integer" }); return; }
  let closes: Date | null = null;
  if (closesAt) { closes = new Date(closesAt); if (isNaN(closes.getTime())) { res.status(400).json({ error: "closesAt must be a valid date" }); return; } }

  if (proposalId) {
    const p = await db.select({ id: ptaProposalsTable.id }).from(ptaProposalsTable)
      .where(and(eq(ptaProposalsTable.id, proposalId), eq(ptaProposalsTable.schoolId, u.schoolId))).limit(1);
    if (!p.length) { res.status(404).json({ error: "Linked proposal not found" }); return; }
  }

  const [ballot] = await db.insert(ptaBallotsTable)
    .values({ schoolId: u.schoolId, question: question.trim(), description, options: opts, quorum, closesAt: closes, proposalId, createdById: u.userId }).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_ballot_opened", actor: u, targetType: "pta_ballot", targetId: ballot.id, details: { question: question.trim(), quorum }, req });
  res.status(201).json({ ballot });
});

// POST /pta/ballots/:id/close — close a ballot.
router.post("/pta/ballots/:id/close", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const existing = await db.select().from(ptaBallotsTable)
    .where(and(eq(ptaBallotsTable.id, id), eq(ptaBallotsTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Ballot not found" }); return; }
  if (existing[0].status === "closed") { res.status(409).json({ error: "Ballot already closed" }); return; }
  const [ballot] = await db.update(ptaBallotsTable).set({ status: "closed", closedAt: sql`now()` }).where(eq(ptaBallotsTable.id, id)).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_ballot_closed", actor: u, targetType: "pta_ballot", targetId: id, details: {}, req });
  res.json({ ballot });
});

// POST /pta/ballots/:id/vote — cast a vote. Body: { choice, memberId? }
// memberId omitted = vote as self; memberId set (and != self) = cast by proxy (must hold a proxy from that member).
router.post("/pta/ballots/:id/vote", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { choice, memberId } = req.body ?? {};

  const ballotRows = await db.select().from(ptaBallotsTable)
    .where(and(eq(ptaBallotsTable.id, id), eq(ptaBallotsTable.schoolId, u.schoolId))).limit(1);
  if (!ballotRows.length) { res.status(404).json({ error: "Ballot not found" }); return; }
  const ballot = ballotRows[0];
  const expired = !!ballot.closesAt && new Date(ballot.closesAt).getTime() < Date.now();
  if (ballot.status === "closed" || expired) { res.status(409).json({ error: "Ballot is closed" }); return; }
  if (!(ballot.options as string[]).includes(choice)) { res.status(400).json({ error: `choice must be one of: ${(ballot.options as string[]).join(", ")}` }); return; }

  const voter = await myMember(u.schoolId, u.userId);
  if (!voter) { res.status(403).json({ error: "Only PTA members can vote" }); return; }

  const targetMemberId: string = memberId || voter.id;
  let viaProxy = false;
  if (targetMemberId !== voter.id) {
    const proxy = await db.select({ id: ptaProxiesTable.id }).from(ptaProxiesTable)
      .where(and(eq(ptaProxiesTable.schoolId, u.schoolId), eq(ptaProxiesTable.grantorMemberId, targetMemberId), eq(ptaProxiesTable.holderMemberId, voter.id))).limit(1);
    if (!proxy.length) { res.status(403).json({ error: "You do not hold a proxy for that member" }); return; }
    viaProxy = true;
  }

  // Senior-group ballots (e.g. goal ratification, B3) are restricted to the
  // senior_group + executive_board tiers. The member whose vote is recorded
  // (the grantor, when by proxy) must be in the electorate.
  const SENIOR_ELECTORATE = PTA_BALLOT_ELECTORATES[1]; // "senior_group"
  if (ballot.electorate === SENIOR_ELECTORATE) {
    // The two leadership tiers (PTA_TIERS minus general_membership).
    const eligible = ["senior_group", "executive_board"];
    let targetTier = voter.tier;
    if (targetMemberId !== voter.id) {
      const tm = await db.select({ tier: ptaMembersTable.tier }).from(ptaMembersTable)
        .where(and(eq(ptaMembersTable.id, targetMemberId), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
      // Row is guaranteed to exist — proxy validation above confirmed the grantor is a member; "" is a defensive fallback that fails the eligibility check.
      targetTier = tm[0]?.tier ?? "";
    }
    if (!eligible.includes(targetTier)) {
      res.status(403).json({ error: "Only the senior group may vote on this ballot" });
      return;
    }
  }

  // One vote per member.
  const dupe = await db.select({ id: ptaVotesTable.id }).from(ptaVotesTable)
    .where(and(eq(ptaVotesTable.ballotId, id), eq(ptaVotesTable.memberId, targetMemberId))).limit(1);
  if (dupe.length) { res.status(409).json({ error: "This member has already voted" }); return; }

  const [vote] = await db.insert(ptaVotesTable)
    .values({ schoolId: u.schoolId, ballotId: id, memberId: targetMemberId, choice, castById: u.userId, viaProxy }).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_vote_cast", actor: u, targetType: "pta_ballot", targetId: id, details: { memberId: targetMemberId, choice, viaProxy }, req });
  res.status(201).json({ vote });
});

// --- Proxies ---
// GET /pta/proxies — standing proxies (grantor -> holder), with names.
router.get("/pta/proxies", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const grantorM = alias(ptaMembersTable, "grantor_m");
  const holderM = alias(ptaMembersTable, "holder_m");
  const grantorU = alias(usersTable, "grantor_u");
  const holderU = alias(usersTable, "holder_u");
  const rows = await db.select({
      id: ptaProxiesTable.id,
      grantorMemberId: ptaProxiesTable.grantorMemberId,
      holderMemberId: ptaProxiesTable.holderMemberId,
      grantorFirst: grantorU.firstName, grantorLast: grantorU.lastName,
      holderFirst: holderU.firstName, holderLast: holderU.lastName,
    })
    .from(ptaProxiesTable)
    .innerJoin(grantorM, eq(grantorM.id, ptaProxiesTable.grantorMemberId))
    .innerJoin(grantorU, eq(grantorU.id, grantorM.userId))
    .innerJoin(holderM, eq(holderM.id, ptaProxiesTable.holderMemberId))
    .innerJoin(holderU, eq(holderU.id, holderM.userId))
    .where(eq(ptaProxiesTable.schoolId, u.schoolId));
  const mm = await myMember(u.schoolId, u.userId);
  res.json({
    myMemberId: mm?.id ?? null,
    proxies: rows.map((p) => ({
      id: p.id, grantorMemberId: p.grantorMemberId, holderMemberId: p.holderMemberId,
      grantor: `${p.grantorFirst} ${p.grantorLast}`.trim(), holder: `${p.holderFirst} ${p.holderLast}`.trim(),
    })),
  });
});

// POST /pta/proxies — set MY standing proxy. Body: { holderMemberId }
router.post("/pta/proxies", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { holderMemberId } = req.body ?? {};
  const grantor = await myMember(u.schoolId, u.userId);
  if (!grantor) { res.status(403).json({ error: "Only PTA members can assign a proxy" }); return; }
  if (!holderMemberId || typeof holderMemberId !== "string") { res.status(400).json({ error: "holderMemberId is required" }); return; }
  if (holderMemberId === grantor.id) { res.status(400).json({ error: "You cannot proxy to yourself" }); return; }
  const holder = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.id, holderMemberId), eq(ptaMembersTable.schoolId, u.schoolId))).limit(1);
  if (!holder.length) { res.status(404).json({ error: "Holder member not found" }); return; }

  await db.delete(ptaProxiesTable).where(and(eq(ptaProxiesTable.schoolId, u.schoolId), eq(ptaProxiesTable.grantorMemberId, grantor.id)));
  const [proxy] = await db.insert(ptaProxiesTable)
    .values({ schoolId: u.schoolId, grantorMemberId: grantor.id, holderMemberId }).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_proxy_set", actor: u, targetType: "pta_proxy", targetId: proxy.id, details: { holderMemberId }, req });
  res.status(201).json({ proxy });
});

// DELETE /pta/proxies — revoke MY standing proxy.
router.delete("/pta/proxies", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const grantor = await myMember(u.schoolId, u.userId);
  if (!grantor) { res.status(403).json({ error: "Only PTA members can manage a proxy" }); return; }
  await db.delete(ptaProxiesTable).where(and(eq(ptaProxiesTable.schoolId, u.schoolId), eq(ptaProxiesTable.grantorMemberId, grantor.id)));
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_proxy_revoked", actor: u, targetType: "pta_proxy", targetId: grantor.id, details: {}, req });
  res.json({ ok: true });
});

// --- Communications (announcements) ----------------------------------------

// GET /pta/announcements — the published announcement log (pinned first, newest first).
router.get("/pta/announcements", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const rows = await db
    .select({
      id: ptaAnnouncementsTable.id,
      title: ptaAnnouncementsTable.title,
      body: ptaAnnouncementsTable.body,
      audience: ptaAnnouncementsTable.audience,
      pinned: ptaAnnouncementsTable.pinned,
      createdAt: ptaAnnouncementsTable.createdAt,
      authorFirst: usersTable.firstName,
      authorLast: usersTable.lastName,
    })
    .from(ptaAnnouncementsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaAnnouncementsTable.createdById))
    .where(eq(ptaAnnouncementsTable.schoolId, u.schoolId))
    .orderBy(desc(ptaAnnouncementsTable.pinned), desc(ptaAnnouncementsTable.createdAt));

  res.json({
    announcements: rows.map((a) => ({
      id: a.id, title: a.title, body: a.body, audience: a.audience, pinned: a.pinned,
      createdAt: a.createdAt, author: `${a.authorFirst} ${a.authorLast}`.trim(),
    })),
  });
});

// POST /pta/announcements — publish. Body: { title, body, audience?, pinned? }
router.post("/pta/announcements", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, body, audience = "all_members", pinned = false } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }
  if (!body || typeof body !== "string" || !body.trim()) { res.status(400).json({ error: "body is required" }); return; }
  if (!PTA_ANNOUNCEMENT_AUDIENCES.includes(audience)) { res.status(400).json({ error: `audience must be one of: ${PTA_ANNOUNCEMENT_AUDIENCES.join(", ")}` }); return; }

  const [announcement] = await db.insert(ptaAnnouncementsTable)
    .values({ schoolId: u.schoolId, title: title.trim(), body: body.trim(), audience, pinned: !!pinned, createdById: u.userId }).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_announcement_posted", actor: u, targetType: "pta_announcement", targetId: announcement.id, details: { title: title.trim(), audience }, req });
  res.status(201).json({ announcement });
});

// GET /pta/announcements/feed — read-only feed for the current user (parents
// included). Visibility: 'all_parents' always; plus 'all_members' + their tier
// (+ 'officers' if they hold an active office) when they're on the roster.
router.get("/pta/announcements/feed", authMiddleware, requireRole("parent", "pta", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const u = user(req);
  const audiences = new Set<string>(["all_parents"]);
  const mem = await db.select({ id: ptaMembersTable.id, tier: ptaMembersTable.tier }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, u.schoolId), eq(ptaMembersTable.userId, u.userId))).limit(1);
  if (mem.length) {
    audiences.add("all_members");
    audiences.add(mem[0].tier);
    const off = await db.select({ id: ptaOfficersTable.id }).from(ptaOfficersTable)
      .where(and(eq(ptaOfficersTable.schoolId, u.schoolId), eq(ptaOfficersTable.memberId, mem[0].id), eq(ptaOfficersTable.active, true))).limit(1);
    if (off.length) audiences.add("officers");
  }
  const rows = await db
    .select({
      id: ptaAnnouncementsTable.id, title: ptaAnnouncementsTable.title, body: ptaAnnouncementsTable.body,
      audience: ptaAnnouncementsTable.audience, pinned: ptaAnnouncementsTable.pinned, createdAt: ptaAnnouncementsTable.createdAt,
      authorFirst: usersTable.firstName, authorLast: usersTable.lastName,
    })
    .from(ptaAnnouncementsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaAnnouncementsTable.createdById))
    .where(and(eq(ptaAnnouncementsTable.schoolId, u.schoolId), inArray(ptaAnnouncementsTable.audience, [...audiences])))
    .orderBy(desc(ptaAnnouncementsTable.pinned), desc(ptaAnnouncementsTable.createdAt));
  res.json({
    announcements: rows.map((a) => ({
      id: a.id, title: a.title, body: a.body, audience: a.audience, pinned: a.pinned,
      createdAt: a.createdAt, author: `${a.authorFirst} ${a.authorLast}`.trim(),
    })),
  });
});

// DELETE /pta/announcements/:id — remove an announcement.
router.delete("/pta/announcements/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const existing = await db.select({ id: ptaAnnouncementsTable.id }).from(ptaAnnouncementsTable)
    .where(and(eq(ptaAnnouncementsTable.id, id), eq(ptaAnnouncementsTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Announcement not found" }); return; }
  await db.delete(ptaAnnouncementsTable).where(eq(ptaAnnouncementsTable.id, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_announcement_deleted", actor: u, targetType: "pta_announcement", targetId: id, details: {}, req });
  res.json({ ok: true });
});

// --- Initiatives (organise) -------------------------------------------------

// GET /pta/initiatives — what the PTA is running, with owner + origin VOICE names.
router.get("/pta/initiatives", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const owner = alias(usersTable, "owner_u");
  const rows = await db
    .select({
      id: ptaInitiativesTable.id,
      title: ptaInitiativesTable.title,
      summary: ptaInitiativesTable.summary,
      status: ptaInitiativesTable.status,
      ownerId: ptaInitiativesTable.ownerId,
      originVoiceId: ptaInitiativesTable.originVoiceId,
      targetDate: ptaInitiativesTable.targetDate,
      createdAt: ptaInitiativesTable.createdAt,
      completedAt: ptaInitiativesTable.completedAt,
      ownerFirst: owner.firstName,
      ownerLast: owner.lastName,
      originVoiceName: voiceGroupsTable.name,
    })
    .from(ptaInitiativesTable)
    .leftJoin(owner, eq(owner.id, ptaInitiativesTable.ownerId))
    .leftJoin(voiceGroupsTable, eq(voiceGroupsTable.id, ptaInitiativesTable.originVoiceId))
    .where(eq(ptaInitiativesTable.schoolId, u.schoolId))
    .orderBy(desc(ptaInitiativesTable.createdAt));

  res.json({
    initiatives: rows.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      status: i.status,
      ownerId: i.ownerId,
      owner: i.ownerFirst ? `${i.ownerFirst} ${i.ownerLast}`.trim() : null,
      originVoiceId: i.originVoiceId,
      originVoiceName: i.originVoiceName ?? null,
      targetDate: i.targetDate,
      createdAt: i.createdAt,
      completedAt: i.completedAt,
    })),
  });
});

// POST /pta/initiatives — start one. Body: { title, summary, ownerId?, originVoiceId?, targetDate?, goalId?, successCriteria?, resourcesNeeded?, conflicts? }
router.post("/pta/initiatives", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, summary, ownerId = null, originVoiceId = null, targetDate,
          goalId = null, successCriteria = null, resourcesNeeded = null, conflicts = null } = req.body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }
  if (!summary || typeof summary !== "string" || !summary.trim()) { res.status(400).json({ error: "summary is required" }); return; }

  if (ownerId) {
    const o = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.id, ownerId), eq(usersTable.schoolId, u.schoolId))).limit(1);
    if (!o.length) { res.status(404).json({ error: "Owner not found in this school" }); return; }
  }
  if (originVoiceId) {
    const v = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.id, originVoiceId), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
    if (!v.length) { res.status(404).json({ error: "Origin VOICE not found" }); return; }
  }
  // goalId is OPTIONAL at creation and need NOT be ratified yet (alignment is a
  // sign-off requirement, docx §5/§7); just verify it belongs to this school.
  if (goalId) {
    const g = await db.select({ id: ptaGoalsTable.id }).from(ptaGoalsTable)
      .where(and(eq(ptaGoalsTable.id, goalId), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
    if (!g.length) { res.status(404).json({ error: "Goal not found in this school" }); return; }
  }
  let target: Date | null = null;
  if (targetDate) { target = new Date(targetDate); if (isNaN(target.getTime())) { res.status(400).json({ error: "targetDate must be a valid date" }); return; } }

  const [initiative] = await db.insert(ptaInitiativesTable)
    .values({ schoolId: u.schoolId, title: title.trim(), summary: summary.trim(),
      ownerId: ownerId || null, originVoiceId: originVoiceId || null, targetDate: target, createdById: u.userId,
      goalId: goalId || null,
      successCriteria: (typeof successCriteria === "string" && successCriteria.trim()) ? successCriteria.trim() : null,
      resourcesNeeded: (typeof resourcesNeeded === "string" && resourcesNeeded.trim()) ? resourcesNeeded.trim() : null,
      conflicts: (typeof conflicts === "string" && conflicts.trim()) ? conflicts.trim() : null })
    .returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_created", actor: u, targetType: "pta_initiative", targetId: initiative.id, details: { title: title.trim(), originVoiceId }, req });
  res.status(201).json({ initiative });
});

// PATCH /pta/initiatives/:id — update fields / advance status. Body: { status?, title?, summary?, ownerId?, targetDate?, goalId?, successCriteria?, resourcesNeeded?, conflicts?, checklist? }
router.patch("/pta/initiatives/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { status, title, summary, ownerId, targetDate, goalId, successCriteria, resourcesNeeded, conflicts, checklist } = req.body ?? {};

  if (status !== undefined && !PTA_INITIATIVE_STATUSES.includes(status)) { res.status(400).json({ error: `status must be one of: ${PTA_INITIATIVE_STATUSES.join(", ")}` }); return; }

  const existing = await db.select().from(ptaInitiativesTable)
    .where(and(eq(ptaInitiativesTable.id, id), eq(ptaInitiativesTable.schoolId, u.schoolId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Initiative not found" }); return; }

  const patch: Record<string, unknown> = {};
  if (title !== undefined) { if (!title || !String(title).trim()) { res.status(400).json({ error: "title cannot be empty" }); return; } patch.title = String(title).trim(); }
  if (summary !== undefined) { if (!summary || !String(summary).trim()) { res.status(400).json({ error: "summary cannot be empty" }); return; } patch.summary = String(summary).trim(); }
  if (ownerId !== undefined) {
    if (ownerId) {
      const o = await db.select({ id: usersTable.id }).from(usersTable)
        .where(and(eq(usersTable.id, ownerId), eq(usersTable.schoolId, u.schoolId))).limit(1);
      if (!o.length) { res.status(404).json({ error: "Owner not found in this school" }); return; }
    }
    patch.ownerId = ownerId || null;
  }
  if (targetDate !== undefined) {
    if (targetDate) { const d = new Date(targetDate); if (isNaN(d.getTime())) { res.status(400).json({ error: "targetDate must be a valid date" }); return; } patch.targetDate = d; }
    else patch.targetDate = null;
  }
  if (goalId !== undefined) {
    if (goalId) {
      const g = await db.select({ id: ptaGoalsTable.id }).from(ptaGoalsTable)
        .where(and(eq(ptaGoalsTable.id, goalId), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
      if (!g.length) { res.status(404).json({ error: "Goal not found in this school" }); return; }
    }
    patch.goalId = goalId || null;
  }
  if (successCriteria !== undefined) patch.successCriteria = (typeof successCriteria === "string" && successCriteria.trim()) ? successCriteria.trim() : null;
  if (resourcesNeeded !== undefined) patch.resourcesNeeded = (typeof resourcesNeeded === "string" && resourcesNeeded.trim()) ? resourcesNeeded.trim() : null;
  if (conflicts !== undefined) patch.conflicts = (typeof conflicts === "string" && conflicts.trim()) ? conflicts.trim() : null;
  if (checklist !== undefined) {
    if (typeof checklist !== "object" || checklist === null || Array.isArray(checklist)) { res.status(400).json({ error: "checklist must be an object" }); return; }
    const KEYS = Object.keys(EMPTY_INITIATIVE_CHECKLIST);
    for (const k of Object.keys(checklist)) {
      if (!KEYS.includes(k)) { res.status(400).json({ error: `unknown checklist key: ${k}` }); return; }
      if (typeof (checklist as Record<string, unknown>)[k] !== "boolean") { res.status(400).json({ error: `checklist.${k} must be a boolean` }); return; }
    }
    // Shallow-merge onto the existing checklist so the UI can toggle one box at a time.
    patch.checklist = { ...(existing[0].checklist ?? {}), ...checklist };
  }
  if (status !== undefined) {
    patch.status = status;
    // Stamp / clear completion as the lifecycle crosses 'completed'.
    patch.completedAt = status === "completed" ? sql`now()` : null;
  }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [initiative] = await db.update(ptaInitiativesTable).set(patch)
    .where(eq(ptaInitiativesTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_initiative_updated", actor: u, targetType: "pta_initiative", targetId: id, details: patch.status ? { status } : { fields: Object.keys(patch) }, req });
  res.json({ initiative });
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  ptaGoalsTable,
  ptaMembersTable,
  ptaBallotsTable,
  ptaVotesTable,
  usersTable,
  PTA_GOAL_STATUSES,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";

/**
 * PTA annual goals (B3). Proposed by any approved member, shortlisted by admin,
 * ratified by a senior-group ballot, then completed/failed. Visible to all
 * members (transparency). Registered before ptaRouter so it bypasses the PII
 * middleware — these are adult PTA volunteers managing their own body.
 */
const router: IRouter = Router();

const MANAGE = requireRole("pta");
// Members must be able to read + propose, so this VIEW includes parent (unlike ptaGovernance's).
const VIEW = requireRole("parent", "pta", "coordinator", "head_teacher");

function user(req: any): JwtPayload { return req.user as JwtPayload; }

// The caller's ACTIVE membership row, or null.
async function activeMember(schoolId: string, userId: string): Promise<{ id: string } | null> {
  const r = await db.select({ id: ptaMembersTable.id }).from(ptaMembersTable)
    .where(and(eq(ptaMembersTable.schoolId, schoolId), eq(ptaMembersTable.userId, userId), eq(ptaMembersTable.status, "active"))).limit(1);
  return r[0] ?? null;
}

// POST /pta/goals — propose a goal. Any active roster member. Body { title, description?, year? }
router.post("/pta/goals", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { title, description = null, year } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const member = await activeMember(u.schoolId, u.userId);
  if (!member) { res.status(403).json({ error: "Only approved PTA members can propose goals" }); return; }

  const yr = Number.isInteger(year) ? year : new Date().getFullYear();
  const [goal] = await db.insert(ptaGoalsTable).values({
    schoolId: u.schoolId,
    title: title.trim().slice(0, 255),
    description: description && typeof description === "string" && description.trim() ? description.trim() : null,
    year: yr,
    status: "proposed",
    proposedById: u.userId,
  }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_proposed", actor: u, targetType: "pta_goal", targetId: goal.id, details: { title: goal.title, year: yr }, req });
  res.status(201).json({ goal });
});

// GET /pta/goals — all goals (every stage; transparency), newest first, each with
// proposer name + its linked ballot's tally/status when present.
router.get("/pta/goals", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const rows = await db.select({
      id: ptaGoalsTable.id,
      title: ptaGoalsTable.title,
      description: ptaGoalsTable.description,
      year: ptaGoalsTable.year,
      status: ptaGoalsTable.status,
      ballotId: ptaGoalsTable.ballotId,
      ratifiedAt: ptaGoalsTable.ratifiedAt,
      completedAt: ptaGoalsTable.completedAt,
      postmortemNote: ptaGoalsTable.postmortemNote,
      createdAt: ptaGoalsTable.createdAt,
      proposerFirst: usersTable.firstName,
      proposerLast: usersTable.lastName,
      proposerDisplayMode: usersTable.displayMode,
    })
    .from(ptaGoalsTable)
    .innerJoin(usersTable, eq(usersTable.id, ptaGoalsTable.proposedById))
    .where(eq(ptaGoalsTable.schoolId, u.schoolId))
    .orderBy(desc(ptaGoalsTable.createdAt));

  const ballotIds = rows.map((r) => r.ballotId).filter((x): x is string => !!x);
  const ballots = ballotIds.length
    ? await db.select().from(ptaBallotsTable).where(inArray(ptaBallotsTable.id, ballotIds))
    : [];
  const votes = ballotIds.length
    ? await db.select({ ballotId: ptaVotesTable.ballotId, choice: ptaVotesTable.choice }).from(ptaVotesTable).where(inArray(ptaVotesTable.ballotId, ballotIds))
    : [];

  const now = Date.now();
  function ballotView(id: string | null) {
    if (!id) return null;
    const b = ballots.find((x) => x.id === id);
    if (!b) return null;
    const bv = votes.filter((v) => v.ballotId === id);
    const tally: Record<string, number> = {};
    for (const opt of (b.options as string[])) tally[opt] = 0;
    for (const v of bv) tally[v.choice] = (tally[v.choice] ?? 0) + 1;
    const total = bv.length;
    const expired = !!b.closesAt && new Date(b.closesAt).getTime() < now;
    const status = b.status === "open" && expired ? "closed" : b.status;
    const carried = (tally["For"] ?? 0) > (tally["Against"] ?? 0) && (b.quorum == null || total >= b.quorum);
    return { id: b.id, status, tally, totalVotes: total, quorum: b.quorum, closesAt: b.closesAt, carried };
  }

  const viewerIsExec = isExecRole(u.role);
  res.json({
    goals: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      year: r.year,
      status: r.status,
      ratifiedAt: r.ratifiedAt,
      completedAt: r.completedAt,
      postmortemNote: r.postmortemNote,
      createdAt: r.createdAt,
      proposedBy: memberDisplayName({ firstName: r.proposerFirst, lastName: r.proposerLast, displayMode: r.proposerDisplayMode }, viewerIsExec),
      ballot: ballotView(r.ballotId),
    })),
  });
});

// POST /pta/goals/:id/open-ballot — open the senior-group ratifying ballot for a
// shortlisted goal and link it. MANAGE. Body { quorum?, closesAt? }.
router.post("/pta/goals/:id/open-ballot", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { quorum = null, closesAt } = req.body ?? {};

  const goals = await db.select().from(ptaGoalsTable)
    .where(and(eq(ptaGoalsTable.id, id), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
  if (!goals.length) { res.status(404).json({ error: "Goal not found" }); return; }
  const goal = goals[0];
  if (goal.status !== "shortlisted") { res.status(409).json({ error: "Only a shortlisted goal can go to a ballot" }); return; }
  if (goal.ballotId) { res.status(409).json({ error: "This goal already has a ballot" }); return; }

  if (quorum != null && (!Number.isInteger(quorum) || quorum < 0)) { res.status(400).json({ error: "quorum must be a non-negative integer" }); return; }
  let closes: Date | null = null;
  if (closesAt) { closes = new Date(closesAt); if (isNaN(closes.getTime())) { res.status(400).json({ error: "closesAt must be a valid date" }); return; } }

  let ballotId = "";
  await db.transaction(async (tx) => {
    const [ballot] = await tx.insert(ptaBallotsTable).values({
      schoolId: u.schoolId,
      question: `Ratify goal: ${goal.title}`.slice(0, 255),
      electorate: "senior_group",
      quorum,
      closesAt: closes,
      createdById: u.userId,
    }).returning({ id: ptaBallotsTable.id });
    ballotId = ballot.id;
    await tx.update(ptaGoalsTable).set({ ballotId }).where(eq(ptaGoalsTable.id, id));
  });

  const [updated] = await db.select().from(ptaGoalsTable).where(eq(ptaGoalsTable.id, id)).limit(1);
  const [ballot] = await db.select().from(ptaBallotsTable).where(eq(ptaBallotsTable.id, ballotId)).limit(1);
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_ballot_opened", actor: u, targetType: "pta_goal", targetId: id, details: { ballotId }, req });
  res.json({ goal: updated, ballot });
});

// PATCH /pta/goals/:id — MANAGE. Status transitions (+ title/description edits
// while still proposed). Body { status?, title?, description?, postmortemNote? }.
router.patch("/pta/goals/:id", authMiddleware, MANAGE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const { status, title, description, postmortemNote } = req.body ?? {};

  if (status !== undefined && !PTA_GOAL_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${PTA_GOAL_STATUSES.join(", ")}` }); return;
  }

  const goals = await db.select().from(ptaGoalsTable)
    .where(and(eq(ptaGoalsTable.id, id), eq(ptaGoalsTable.schoolId, u.schoolId))).limit(1);
  if (!goals.length) { res.status(404).json({ error: "Goal not found" }); return; }
  const goal = goals[0];

  const patch: Record<string, unknown> = {};

  if (title !== undefined || description !== undefined) {
    if (goal.status !== "proposed") { res.status(409).json({ error: "A goal can only be edited while it is proposed" }); return; }
    if (title !== undefined) {
      if (!title || !String(title).trim()) { res.status(400).json({ error: "title cannot be empty" }); return; }
      patch.title = String(title).trim().slice(0, 255);
    }
    if (description !== undefined) patch.description = description && String(description).trim() ? String(description).trim() : null;
  }

  if (status !== undefined && status !== goal.status) {
    const from = goal.status;
    if (status === "shortlisted") {
      if (from !== "proposed") { res.status(409).json({ error: "Only a proposed goal can be shortlisted" }); return; }
    } else if (status === "ratified") {
      if (!goal.ballotId) { res.status(409).json({ error: "Open a ballot before ratifying" }); return; }
      const [b] = await db.select().from(ptaBallotsTable).where(eq(ptaBallotsTable.id, goal.ballotId)).limit(1);
      const expired = !!b?.closesAt && new Date(b.closesAt).getTime() < Date.now();
      const closed = b?.status === "closed" || expired;
      if (!closed) { res.status(409).json({ error: "Close the ballot before ratifying" }); return; }
      const vs = await db.select({ choice: ptaVotesTable.choice }).from(ptaVotesTable).where(eq(ptaVotesTable.ballotId, goal.ballotId));
      const forN = vs.filter((v) => v.choice === "For").length;
      const againstN = vs.filter((v) => v.choice === "Against").length;
      const total = vs.length;
      // Abstain votes count toward quorum (total) but not the For/Against outcome.
      const carried = forN > againstN && (b!.quorum == null || total >= b!.quorum);
      if (!carried) { res.status(409).json({ error: "The ballot did not carry (need For > Against and quorum met)" }); return; }
      patch.ratifiedAt = sql`now()`;
    } else if (status === "completed") {
      if (from !== "ratified") { res.status(409).json({ error: "Only a ratified goal can be completed" }); return; }
      patch.completedAt = sql`now()`;
    } else if (status === "failed") {
      if (from !== "proposed" && from !== "shortlisted") {
        res.status(409).json({ error: "Only a proposed or shortlisted goal can be marked failed" }); return;
      }
      if (!postmortemNote || !String(postmortemNote).trim()) { res.status(400).json({ error: "A postmortem note is required to fail a goal" }); return; }
      patch.postmortemNote = String(postmortemNote).trim();
    } else {
      res.status(400).json({ error: `Cannot move a goal from ${from} to ${status}` }); return;
    }
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [updated] = await db.update(ptaGoalsTable).set(patch).where(eq(ptaGoalsTable.id, id)).returning();
  await writeAudit({ schoolId: u.schoolId, eventType: "pta_goal_updated", actor: u, targetType: "pta_goal", targetId: id, details: patch.status ? { status: patch.status } : { fields: Object.keys(patch) }, req });
  res.json({ goal: updated });
});

export default router;

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

export default router;

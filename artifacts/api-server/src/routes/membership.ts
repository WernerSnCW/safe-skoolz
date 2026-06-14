import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, notificationsTable, memberReportsTable, schoolsTable } from "@workspace/db";
import { authMiddleware, requireRole, requirePlatformOperator, type JwtPayload } from "../lib/auth";
import { isCommunityMode } from "../lib/tenant";
import { writeAudit } from "../lib/auditHelper";
import { sendEmail } from "../lib/emailHelper";

const router: IRouter = Router();

// Exec roles that manage membership (spec §4.1). At Morna only `pta` exists,
// but coordinator/head_teacher are included so school staff can manage it later.
const EXEC = requireRole("pta", "coordinator", "head_teacher");

// GET /api/membership/pending — exec sees parents awaiting approval at their school.
router.get("/membership/pending", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const rows = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(and(eq(usersTable.schoolId, u.schoolId), eq(usersTable.membershipStatus, "pending")))
    .orderBy(usersTable.createdAt);
  res.json({ members: rows });
});

// POST /api/membership/:userId/approve — approve + record the anonymity choice.
router.post("/membership/:userId/approve", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;

  // Validate displayMode early; we still need target email so 404 check comes first.
  const rawMode = req.body?.displayMode;

  const [target] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      membershipStatus: usersTable.membershipStatus,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  // Idempotency guard — must be pending to approve.
  if (target.membershipStatus !== "pending") {
    res.status(409).json({ error: "Member is not pending" });
    return;
  }

  // Validate displayMode.
  if (rawMode != null && rawMode !== "named" && rawMode !== "anonymous") {
    res.status(400).json({ error: "displayMode must be 'named' or 'anonymous'." });
    return;
  }
  const displayMode = rawMode === "anonymous" ? "anonymous" : "named";

  // Transactionally update status + insert notification so a member is never
  // left approved without an in-app notification.
  let updated: { id: string; membershipStatus: string; displayMode: string } | undefined;
  await db.transaction(async (tx) => {
    [updated] = await tx
      .update(usersTable)
      .set({ membershipStatus: "approved", displayMode })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, membershipStatus: usersTable.membershipStatus, displayMode: usersTable.displayMode });
    await tx.insert(notificationsTable).values({
      schoolId: u.schoolId,
      recipientId: userId,
      trigger: "membership_approved",
      channel: "in_app",
      subject: "Your community membership is approved",
      body: "You can now see results when they're released and back the parent community.",
    });
  });

  // Fire-and-forget email — a failed email never fails the approval.
  void sendEmail({
    to: target.email!,
    toName: target.firstName ?? "there",
    subject: "Your community membership is approved",
    bodyText:
      `Hi ${target.firstName ?? "there"},\n\n` +
      `Your membership has been approved. When the results are released you'll be able to see them, ` +
      `and you can now back the parent community.\n\n` +
      `${process.env.APP_URL ?? "http://localhost:5000"}\n`,
    trigger: "membership_approved",
    recipientId: userId,
    schoolId: u.schoolId,
  }).catch(() => {});

  await writeAudit({
    schoolId: u.schoolId,
    eventType: "membership_approved",
    actor: u,
    targetType: "user",
    targetId: userId,
    details: { displayMode },
    req,
  });

  res.json({ member: updated });
});

// POST /api/membership/:userId/reject — decline a pending member.
router.post("/membership/:userId/reject", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;

  const [target] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await db.update(usersTable).set({ membershipStatus: "rejected" }).where(eq(usersTable.id, userId));

  await writeAudit({
    schoolId: u.schoolId,
    eventType: "membership_rejected",
    actor: u,
    targetType: "user",
    targetId: userId,
    details: {},
    req,
  });

  res.json({ ok: true });
});

// POST /api/membership/:userId/report — in-app "report this member" (spec §4.3).
// Any authed member may flag someone who isn't part of the real community. This
// RECORDS a report; it does not remove the member (removal is operator-only).
router.post("/membership/:userId/report", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : null;

  const [target] = await db.select({ id: usersTable.id })
    .from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.schoolId, u.schoolId)));
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }

  await db.insert(memberReportsTable).values({
    schoolId: u.schoolId, reportedUserId: userId, reporterUserId: u.userId, reason,
  });
  await writeAudit({ schoolId: u.schoolId, eventType: "member_reported", actor: u, targetType: "user", targetId: userId, details: { hasReason: reason != null }, req }).catch(() => {});
  res.status(201).json({ reported: true });
});

// POST /api/membership/:userId/remove — platform-operator flag/remove (spec §4.3).
// Replaces the exec approval gate for community tenants: members are active on
// join; an imposter is removed on the school's word. Sets membershipStatus
// 'rejected' (the only reachable path to rejected under open join).
router.post("/membership/:userId/remove", authMiddleware, requirePlatformOperator, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { userId } = req.params;

  const [target] = await db.select({ id: usersTable.id, schoolId: usersTable.schoolId })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!target) { res.status(404).json({ error: "Member not found" }); return; }

  // I1 (spec §6): flag/remove is the COMMUNITY-mode moderation path only. Whole-school
  // tenants keep the approve/reject queue — removing there bypasses it. Reject 409.
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, target.schoolId));
  if (!school || !isCommunityMode(school)) {
    res.status(409).json({ error: "This school uses the membership approval queue; use approve/reject." });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set({ membershipStatus: "rejected" }).where(eq(usersTable.id, userId));
    await tx.update(memberReportsTable).set({ status: "actioned" })
      .where(and(eq(memberReportsTable.reportedUserId, userId), eq(memberReportsTable.status, "open")));
  });
  await writeAudit({ schoolId: target.schoolId, eventType: "member_removed", actor: u, targetType: "user", targetId: userId, details: {}, req }).catch(() => {});
  res.json({ removed: true });
});

export default router;

import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
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

export default router;

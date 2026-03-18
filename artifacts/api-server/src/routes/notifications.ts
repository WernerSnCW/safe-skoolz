import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { ListNotificationsQueryParams } from "@workspace/api-zod";
import { authMiddleware, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const query = ListNotificationsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(notificationsTable.recipientId, user.userId),
    eq(notificationsTable.schoolId, user.schoolId)
  );

  const [notifications, countResult] = await Promise.all([
    db.select().from(notificationsTable).where(whereClause).orderBy(desc(notificationsTable.sentAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(whereClause),
  ]);

  res.json({
    data: notifications.map((n) => ({
      id: n.id,
      schoolId: n.schoolId,
      recipientId: n.recipientId,
      trigger: n.trigger,
      channel: n.channel,
      subject: n.subject,
      body: n.body,
      reference: n.reference,
      sentAt: n.sentAt.toISOString(),
      acknowledgedAt: n.acknowledgedAt?.toISOString() || null,
      delivered: n.delivered,
    })),
    total: Number(countResult[0]?.count || 0),
    page,
    limit,
  });
});

router.patch("/notifications/:id/acknowledge", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [notification] = await db
    .update(notificationsTable)
    .set({ acknowledgedAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, user.userId)))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({
    id: notification.id,
    schoolId: notification.schoolId,
    recipientId: notification.recipientId,
    trigger: notification.trigger,
    channel: notification.channel,
    subject: notification.subject,
    body: notification.body,
    reference: notification.reference,
    sentAt: notification.sentAt.toISOString(),
    acknowledgedAt: notification.acknowledgedAt?.toISOString() || null,
    delivered: notification.delivered,
  });
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { ListNotificationsQueryParams } from "@workspace/api-zod";
import { authMiddleware, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

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

const BROADCAST_ROLES = ["coordinator", "head_teacher"];
const AUDIENCE_ROLES: Record<string, string[]> = {
  all_parents: ["parent"],
  all_staff: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
  all: ["pupil", "parent", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "pta"],
  parents_and_staff: ["parent", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
};

router.post("/notifications/broadcast", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  if (!BROADCAST_ROLES.includes(user.role)) {
    res.status(403).json({ error: "Only coordinators and head teachers can broadcast notifications" });
    return;
  }

  const { subject, body, audience, category } = req.body;
  if (!subject || !body || !audience) {
    res.status(400).json({ error: "subject, body, and audience are required" });
    return;
  }

  if (typeof subject !== "string" || subject.length > 200) {
    res.status(400).json({ error: "Subject must be a string of 200 characters or fewer" });
    return;
  }
  if (typeof body !== "string" || body.length > 2000) {
    res.status(400).json({ error: "Body must be a string of 2000 characters or fewer" });
    return;
  }

  const targetRoles = AUDIENCE_ROLES[audience];
  if (!targetRoles) {
    res.status(400).json({ error: `Invalid audience. Must be one of: ${Object.keys(AUDIENCE_ROLES).join(", ")}` });
    return;
  }

  const recipients = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(
      eq(usersTable.schoolId, user.schoolId),
      inArray(usersTable.role, targetRoles),
      eq(usersTable.active, true),
    ));

  if (recipients.length === 0) {
    res.status(200).json({ sent: 0, message: "No matching recipients found" });
    return;
  }

  const notifications = recipients.map(r => ({
    schoolId: user.schoolId,
    recipientId: r.id,
    trigger: "school_broadcast" as const,
    channel: "in_app" as const,
    subject: subject as string,
    body: body as string,
    reference: (category as string) || null,
    delivered: false,
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    await db.insert(notificationsTable).values(notifications.slice(i, i + BATCH_SIZE));
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "notification_broadcast",
    actor: user.userId,
    targetType: "notification",
    targetId: audience,
    details: { subject, audience, category, recipientCount: recipients.length },
    req,
  });

  res.json({ sent: recipients.length, audience, category: category || null });
});

export default router;

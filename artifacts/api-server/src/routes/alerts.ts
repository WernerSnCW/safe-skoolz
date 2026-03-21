import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, patternAlertsTable, usersTable } from "@workspace/db";
import { ListAlertsQueryParams, UpdateAlertBody } from "@workspace/api-zod";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

router.get("/alerts", authMiddleware, requireRole("coordinator", "head_teacher", "teacher", "head_of_year", "senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const query = ListAlertsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  let conditions: any[] = [eq(patternAlertsTable.schoolId, user.schoolId)];
  if (query.success && query.data.level) {
    conditions.push(eq(patternAlertsTable.alertLevel, query.data.level));
  }
  if (query.success && query.data.status) {
    conditions.push(eq(patternAlertsTable.status, query.data.status));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [alerts, countResult] = await Promise.all([
    db.select().from(patternAlertsTable).where(whereClause).orderBy(desc(patternAlertsTable.triggeredAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable).where(whereClause),
  ]);

  const victimIds = alerts.filter((a) => a.victimId).map((a) => a.victimId!);
  let victimMap: Record<string, string> = {};
  if (victimIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, victimIds));
    for (const u of users) victimMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  res.json({
    data: alerts.map((a) => ({
      id: a.id,
      schoolId: a.schoolId,
      ruleId: a.ruleId,
      ruleLabel: a.ruleLabel,
      alertLevel: a.alertLevel,
      victimId: a.victimId,
      perpetratorIds: a.perpetratorIds || [],
      linkedIncidentIds: a.linkedIncidentIds || [],
      triggeredAt: a.triggeredAt.toISOString(),
      reviewedAt: a.reviewedAt?.toISOString() || null,
      reviewedBy: a.reviewedBy,
      status: a.status,
      notes: a.notes,
      victimName: a.victimId ? (victimMap[a.victimId] || null) : null,
    })),
    total: Number(countResult[0]?.count || 0),
    page,
    limit,
  });
});

router.patch("/alerts/:id", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const parsed = UpdateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [alert] = await db
    .update(patternAlertsTable)
    .set({
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      reviewedAt: new Date(),
      reviewedBy: user.userId,
    })
    .where(and(eq(patternAlertsTable.id, id), eq(patternAlertsTable.schoolId, user.schoolId)))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "alert_reviewed",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "pattern_alert",
    targetId: alert.id,
    details: { status: parsed.data.status, notes: parsed.data.notes },
    req,
  });

  const victimName = alert.victimId
    ? await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(eq(usersTable.id, alert.victimId))
        .then((r) => r[0] ? `${r[0].firstName} ${r[0].lastName}` : null)
    : null;

  res.json({
    id: alert.id,
    schoolId: alert.schoolId,
    ruleId: alert.ruleId,
    ruleLabel: alert.ruleLabel,
    alertLevel: alert.alertLevel,
    victimId: alert.victimId,
    perpetratorIds: alert.perpetratorIds || [],
    linkedIncidentIds: alert.linkedIncidentIds || [],
    triggeredAt: alert.triggeredAt.toISOString(),
    reviewedAt: alert.reviewedAt?.toISOString() || null,
    reviewedBy: alert.reviewedBy,
    status: alert.status,
    notes: alert.notes,
    victimName,
  });
});

export default router;

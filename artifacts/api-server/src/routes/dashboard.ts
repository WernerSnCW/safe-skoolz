import { Router, type IRouter } from "express";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { db, incidentsTable, protocolsTable, patternAlertsTable, notificationsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/coordinator", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    openProtocolsResult,
    amberAlertsResult,
    redAlertsResult,
    reportsThisMonthResult,
    reportsByDayResult,
    emotionalAlertsResult,
    overdueResult,
    recentIncidents,
    recentAlerts,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(protocolsTable).where(
      and(eq(protocolsTable.schoolId, user.schoolId), inArray(protocolsTable.status, ["open", "under_investigation", "awaiting_review"]))
    ),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable).where(
      and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.alertLevel, "amber"), eq(patternAlertsTable.status, "open"))
    ),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable).where(
      and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.alertLevel, "red"), eq(patternAlertsTable.status, "open"))
    ),
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable).where(
      and(eq(incidentsTable.schoolId, user.schoolId), gte(incidentsTable.createdAt, startOfMonth))
    ),
    db.execute(sql`
      SELECT date_trunc('day', created_at)::date as date, count(*) as count 
      FROM incidents 
      WHERE school_id = ${user.schoolId} AND created_at >= ${sevenDaysAgo} 
      GROUP BY date_trunc('day', created_at)::date 
      ORDER BY date ASC
    `),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable).where(
      and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.ruleId, "emotional_distress_pattern"), eq(patternAlertsTable.status, "open"))
    ),
    db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(
      and(eq(notificationsTable.schoolId, user.schoolId), eq(notificationsTable.delivered, false))
    ),
    db.select().from(incidentsTable).where(eq(incidentsTable.schoolId, user.schoolId)).orderBy(desc(incidentsTable.createdAt)).limit(5),
    db.select().from(patternAlertsTable).where(and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.status, "open"))).orderBy(desc(patternAlertsTable.triggeredAt)).limit(5),
  ]);

  const victimIds = recentAlerts.filter((a) => a.victimId).map((a) => a.victimId!);
  const incidentUserIds = new Set<string>();
  for (const inc of recentIncidents) {
    if (inc.reporterId) incidentUserIds.add(inc.reporterId);
  }
  const allUserIds = [...new Set([...victimIds, ...incidentUserIds])];
  let userMap: Record<string, string> = {};
  if (allUserIds.length > 0) {
    const users = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(inArray(usersTable.id, allUserIds));
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const row = (reportsByDayResult.rows as any[]).find((r: any) => {
      const rd = new Date(r.date).toISOString().split("T")[0];
      return rd === dateStr;
    });
    days.push({ date: dateStr, count: Number(row?.count || 0) });
  }

  res.json({
    openProtocols: Number(openProtocolsResult[0]?.count || 0),
    patternAlerts: {
      amber: Number(amberAlertsResult[0]?.count || 0),
      red: Number(redAlertsResult[0]?.count || 0),
    },
    reportsThisMonth: Number(reportsThisMonthResult[0]?.count || 0),
    reportsByDay: days,
    emotionalWelfareAlerts: Number(emotionalAlertsResult[0]?.count || 0),
    overdueNotifications: Number(overdueResult[0]?.count || 0),
    recentIncidents: recentIncidents.map((inc) => ({
      id: inc.id,
      referenceNumber: inc.referenceNumber,
      schoolId: inc.schoolId,
      reporterId: inc.reporterId,
      reporterRole: inc.reporterRole,
      anonymous: inc.anonymous,
      category: inc.category,
      escalationTier: inc.escalationTier,
      safeguardingTrigger: inc.safeguardingTrigger,
      incidentDate: inc.incidentDate,
      incidentTime: inc.incidentTime,
      location: inc.location,
      description: inc.description,
      victimIds: inc.victimIds || [],
      perpetratorIds: inc.perpetratorIds || [],
      witnessIds: inc.witnessIds || [],
      emotionalState: inc.emotionalState,
      emotionalFreetext: inc.emotionalFreetext,
      happeningToMe: inc.happeningToMe,
      happeningToSomeoneElse: inc.happeningToSomeoneElse,
      iSawIt: inc.iSawIt,
      childrenSeparated: inc.childrenSeparated,
      coordinatorNotified: inc.coordinatorNotified,
      immediateActionTaken: inc.immediateActionTaken,
      partOfKnownPattern: inc.partOfKnownPattern,
      toldByChild: inc.toldByChild,
      childConsentToShare: inc.childConsentToShare,
      formalResponseRequested: inc.formalResponseRequested,
      requestExternalReferral: inc.requestExternalReferral,
      confidentialFlag: inc.confidentialFlag,
      status: inc.status,
      protocolId: inc.protocolId,
      createdAt: inc.createdAt.toISOString(),
      reporterName: inc.reporterId ? (userMap[inc.reporterId] || null) : null,
      victimNames: [],
      perpetratorNames: [],
    })),
    recentAlerts: recentAlerts.map((a) => ({
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
      victimName: a.victimId ? (userMap[a.victimId] || null) : null,
    })),
  });
});

router.get("/dashboard/child/:id", authMiddleware, requireRole("coordinator", "senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const childId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [child] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, childId), eq(usersTable.schoolId, user.schoolId)));

  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  const [incidents, protocols, alerts] = await Promise.all([
    db.select().from(incidentsTable).where(
      and(eq(incidentsTable.schoolId, user.schoolId), sql`${childId} = ANY(${incidentsTable.victimIds})`)
    ).orderBy(desc(incidentsTable.createdAt)),
    db.select().from(protocolsTable).where(
      and(eq(protocolsTable.schoolId, user.schoolId), eq(protocolsTable.victimId, childId), inArray(protocolsTable.status, ["open", "under_investigation", "awaiting_review"]))
    ),
    db.select().from(patternAlertsTable).where(
      and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.victimId, childId))
    ).orderBy(desc(patternAlertsTable.triggeredAt)),
  ]);

  const emotionalStateTrend = incidents
    .filter((inc) => inc.emotionalState)
    .map((inc) => ({ date: inc.incidentDate, state: inc.emotionalState! }))
    .reverse();

  res.json({
    child: {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      yearGroup: child.yearGroup,
      className: child.className,
      avatarType: child.avatarType,
      avatarValue: child.avatarValue,
    },
    incidentHistory: incidents.map((inc) => ({
      id: inc.id,
      referenceNumber: inc.referenceNumber,
      schoolId: inc.schoolId,
      reporterId: inc.reporterId,
      reporterRole: inc.reporterRole,
      anonymous: inc.anonymous,
      category: inc.category,
      escalationTier: inc.escalationTier,
      safeguardingTrigger: inc.safeguardingTrigger,
      incidentDate: inc.incidentDate,
      incidentTime: inc.incidentTime,
      location: inc.location,
      description: inc.description,
      victimIds: inc.victimIds || [],
      perpetratorIds: inc.perpetratorIds || [],
      witnessIds: inc.witnessIds || [],
      emotionalState: inc.emotionalState,
      emotionalFreetext: inc.emotionalFreetext,
      happeningToMe: inc.happeningToMe,
      happeningToSomeoneElse: inc.happeningToSomeoneElse,
      iSawIt: inc.iSawIt,
      childrenSeparated: inc.childrenSeparated,
      coordinatorNotified: inc.coordinatorNotified,
      immediateActionTaken: inc.immediateActionTaken,
      partOfKnownPattern: inc.partOfKnownPattern,
      toldByChild: inc.toldByChild,
      childConsentToShare: inc.childConsentToShare,
      formalResponseRequested: inc.formalResponseRequested,
      requestExternalReferral: inc.requestExternalReferral,
      confidentialFlag: inc.confidentialFlag,
      status: inc.status,
      protocolId: inc.protocolId,
      createdAt: inc.createdAt.toISOString(),
      reporterName: null,
      victimNames: [],
      perpetratorNames: [],
    })),
    emotionalStateTrend,
    openProtocols: protocols.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      schoolId: p.schoolId,
      openedBy: p.openedBy,
      openedAt: p.openedAt.toISOString(),
      protocolType: p.protocolType,
      protocolSource: p.protocolSource,
      genderBasedViolence: p.genderBasedViolence,
      context: p.context,
      linkedIncidentIds: p.linkedIncidentIds || [],
      victimId: p.victimId,
      allegedPerpetratorIds: p.allegedPerpetratorIds || [],
      parentNotificationSent: p.parentNotificationSent,
      interviewsRequired: p.interviewsRequired,
      riskAssessment: p.riskAssessment,
      protectiveMeasures: p.protectiveMeasures || [],
      externalReferralRequired: p.externalReferralRequired,
      externalReferralBody: p.externalReferralBody,
      status: p.status,
      resolutionNotes: p.resolutionNotes,
      closedAt: p.closedAt?.toISOString() || null,
      updatedAt: p.updatedAt.toISOString(),
      victimName: null,
      openedByName: null,
    })),
    patternAlerts: alerts.map((a) => ({
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
      victimName: `${child.firstName} ${child.lastName}`,
    })),
  });
});

export default router;

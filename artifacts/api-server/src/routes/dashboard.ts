import { Router, type IRouter } from "express";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { db, incidentsTable, protocolsTable, patternAlertsTable, notificationsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/coordinator", authMiddleware, requireRole("coordinator", "head_teacher", "senco"), async (req, res): Promise<void> => {
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

router.get("/dashboard/analytics", authMiddleware, requireRole("coordinator", "head_teacher", "senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const allIncidents = await db.select().from(incidentsTable).where(eq(incidentsTable.schoolId, user.schoolId));
  const allPupils = await db.select().from(usersTable).where(and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil")));

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byYearGroup: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byEscalationTier: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const victimCounts: Record<string, number> = {};
  const perpetratorCounts: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  const pupilMap: Record<string, { name: string; yearGroup: string; className: string }> = {};
  for (const p of allPupils) {
    pupilMap[p.id] = { name: `${p.firstName} ${p.lastName}`, yearGroup: p.yearGroup || "", className: p.className || "" };
  }

  for (const inc of allIncidents) {
    const cats = (inc.category || "").split(",").map(c => c.trim()).filter(Boolean);
    for (const cat of cats) {
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
    byEscalationTier[String(inc.escalationTier)] = (byEscalationTier[String(inc.escalationTier)] || 0) + 1;

    if (inc.location) {
      byLocation[inc.location] = (byLocation[inc.location] || 0) + 1;
    }

    for (const vid of (inc.victimIds || [])) {
      victimCounts[vid] = (victimCounts[vid] || 0) + 1;
      const pupil = pupilMap[vid];
      if (pupil) {
        const yg = pupil.yearGroup || "Unknown";
        byYearGroup[yg] = (byYearGroup[yg] || 0) + 1;
      }
    }

    for (const pid of (inc.perpetratorIds || [])) {
      perpetratorCounts[pid] = (perpetratorCounts[pid] || 0) + 1;
    }

    const month = inc.incidentDate ? inc.incidentDate.substring(0, 7) : "Unknown";
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  const topVictims = Object.entries(victimCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, name: pupilMap[id]?.name || "Unknown", yearGroup: pupilMap[id]?.yearGroup || "", className: pupilMap[id]?.className || "", count }));

  const topPerpetrators = Object.entries(perpetratorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, name: pupilMap[id]?.name || "Unknown", yearGroup: pupilMap[id]?.yearGroup || "", className: pupilMap[id]?.className || "", count }));

  const monthlyTrend = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  res.json({
    totalIncidents: allIncidents.length,
    totalPupils: allPupils.length,
    safeguardingCount: allIncidents.filter(i => i.safeguardingTrigger).length,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })),
    byYearGroup: Object.entries(byYearGroup).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count })),
    byLocation: Object.entries(byLocation).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    byEscalationTier: Object.entries(byEscalationTier).map(([tier, count]) => ({ name: `Tier ${tier}`, count })),
    topVictims,
    topPerpetrators,
    monthlyTrend,
  });
});

router.get("/dashboard/parent", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const [parentRecord] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  const childIds: string[] = parentRecord?.parentOf || [];

  if (childIds.length === 0) {
    res.json({ children: [], incidents: [], monthlyTrend: [], byCategoryTrend: [], totalReports: 0, openReports: 0, closedReports: 0 });
    return;
  }

  const children = await db.select().from(usersTable).where(
    and(eq(usersTable.schoolId, user.schoolId), inArray(usersTable.id, childIds))
  );

  const allIncidents = await db.select().from(incidentsTable).where(
    and(eq(incidentsTable.schoolId, user.schoolId), eq(incidentsTable.parentVisible, true))
  ).orderBy(desc(incidentsTable.createdAt));

  const childIncidents = allIncidents.filter((inc) => {
    const vids = inc.victimIds || [];
    return vids.some((vid: string) => childIds.includes(vid));
  });

  const byMonth: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const emotionalTimeline: { date: string; state: string; childName: string }[] = [];

  for (const inc of childIncidents) {
    const month = inc.incidentDate ? inc.incidentDate.substring(0, 7) : "Unknown";
    byMonth[month] = (byMonth[month] || 0) + 1;

    const cats = (inc.category || "").split(",").map(c => c.trim()).filter(Boolean);
    for (const cat of cats) {
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;

    if (inc.emotionalState) {
      const childMatch = children.find(c => (inc.victimIds || []).includes(c.id));
      emotionalTimeline.push({
        date: inc.incidentDate,
        state: inc.emotionalState,
        childName: childMatch ? childMatch.firstName : "Your child",
      });
    }
  }

  const monthlyTrend = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const byCategoryList = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const byStatusList = Object.entries(byStatus)
    .map(([name, count]) => ({ name, count }));

  const allUserIds = new Set<string>();
  for (const inc of childIncidents) {
    if (inc.assessedBy) allUserIds.add(inc.assessedBy);
    if (inc.reporterId) allUserIds.add(inc.reporterId);
  }
  let staffMap: Record<string, string> = {};
  const userIdArr = [...allUserIds];
  if (userIdArr.length > 0) {
    const staffRows = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, role: usersTable.role })
      .from(usersTable).where(inArray(usersTable.id, userIdArr));
    for (const s of staffRows) staffMap[s.id] = `${s.firstName} ${s.lastName}`;
  }

  const parentIncidents = childIncidents.map((inc) => {
    const childMatch = children.find(c => (inc.victimIds || []).includes(c.id));
    return {
      id: inc.id,
      referenceNumber: inc.referenceNumber,
      category: inc.category,
      incidentDate: inc.incidentDate,
      incidentTime: inc.incidentTime || null,
      location: inc.location,
      status: inc.status,
      escalationTier: inc.escalationTier,
      description: inc.parentSummary || null,
      emotionalState: inc.emotionalState || null,
      childName: childMatch ? `${childMatch.firstName} ${childMatch.lastName}` : "Your child",
      childYearGroup: childMatch?.yearGroup || null,
      childClassName: childMatch?.className || null,
      addedToFile: inc.addedToFile || false,
      assessedBy: inc.assessedBy ? staffMap[inc.assessedBy] || "Staff member" : null,
      assessedAt: inc.assessedAt ? inc.assessedAt.toISOString() : null,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt ? inc.updatedAt.toISOString() : null,
    };
  });

  res.json({
    children: children.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      yearGroup: c.yearGroup,
      className: c.className,
    })),
    incidents: parentIncidents,
    totalReports: childIncidents.length,
    openReports: childIncidents.filter(i => i.status === "open" || i.status === "submitted" || i.status === "investigating").length,
    closedReports: childIncidents.filter(i => i.status === "closed").length,
    monthlyTrend,
    byCategory: byCategoryList,
    byStatus: byStatusList,
    emotionalTimeline: emotionalTimeline.sort((a, b) => a.date.localeCompare(b.date)),
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

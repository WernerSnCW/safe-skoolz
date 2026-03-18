import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, protocolsTable, incidentsTable, interviewsTable, notificationsTable, usersTable } from "@workspace/db";
import { CreateProtocolBody, UpdateProtocolBody, ListProtocolsQueryParams } from "@workspace/api-zod";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { generateProtocolRef } from "../lib/referenceNumber";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

router.get("/protocols", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const query = ListProtocolsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  let conditions: any[] = [eq(protocolsTable.schoolId, user.schoolId)];
  if (query.success && query.data.status) {
    conditions.push(eq(protocolsTable.status, query.data.status));
  }
  if (query.success && query.data.type) {
    conditions.push(eq(protocolsTable.protocolType, query.data.type));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [protocols, countResult] = await Promise.all([
    db.select().from(protocolsTable).where(whereClause).orderBy(desc(protocolsTable.openedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(protocolsTable).where(whereClause),
  ]);

  const enriched = await enrichProtocols(protocols);

  res.json({
    data: enriched,
    total: Number(countResult[0]?.count || 0),
    page,
    limit,
  });
});

router.post("/protocols", authMiddleware, requireRole("coordinator"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const parsed = CreateProtocolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const referenceNumber = await generateProtocolRef();

  const [protocol] = await db
    .insert(protocolsTable)
    .values({
      referenceNumber,
      schoolId: user.schoolId,
      openedBy: user.userId,
      protocolType: data.protocolType,
      protocolSource: data.protocolSource || null,
      genderBasedViolence: data.genderBasedViolence ?? false,
      context: data.context || null,
      linkedIncidentIds: data.linkedIncidentIds || [],
      victimId: data.victimId,
      allegedPerpetratorIds: data.allegedPerpetratorIds || [],
      riskAssessment: data.riskAssessment || null,
      protectiveMeasures: data.protectiveMeasures || [],
      externalReferralRequired: data.externalReferralRequired ?? false,
      externalReferralBody: data.externalReferralBody || null,
      status: "open",
    })
    .returning();

  if (data.linkedIncidentIds && data.linkedIncidentIds.length > 0) {
    for (const incId of data.linkedIncidentIds) {
      await db
        .update(incidentsTable)
        .set({ status: "protocol_open", protocolId: protocol.id })
        .where(eq(incidentsTable.id, incId));
    }
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "protocol_created",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "protocol",
    targetId: protocol.id,
    details: { referenceNumber, protocolType: data.protocolType },
    req,
  });

  const enriched = await enrichProtocols([protocol]);
  res.status(201).json(enriched[0]);
});

router.get("/protocols/:id", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [protocol] = await db
    .select()
    .from(protocolsTable)
    .where(and(eq(protocolsTable.id, id), eq(protocolsTable.schoolId, user.schoolId)));

  if (!protocol) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  const linkedIncidents = protocol.linkedIncidentIds && protocol.linkedIncidentIds.length > 0
    ? await db.select().from(incidentsTable).where(inArray(incidentsTable.id, protocol.linkedIncidentIds))
    : [];

  const interviews = await db.select().from(interviewsTable).where(eq(interviewsTable.protocolId, protocol.id));

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.schoolId, user.schoolId), eq(notificationsTable.reference, protocol.referenceNumber)));

  const enrichedProtocol = (await enrichProtocols([protocol]))[0];

  const userIds = new Set<string>();
  for (const iv of interviews) {
    userIds.add(iv.intervieweeId);
    userIds.add(iv.conductedBy);
  }
  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  res.json({
    protocol: enrichedProtocol,
    linkedIncidents: linkedIncidents.map((inc) => ({
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
    interviews: interviews.map((iv) => ({
      id: iv.id,
      protocolId: iv.protocolId,
      intervieweeId: iv.intervieweeId,
      intervieweeRole: iv.intervieweeRole,
      conductedBy: iv.conductedBy,
      interviewDate: iv.interviewDate,
      summary: iv.summary,
      annexReference: iv.annexReference,
      createdAt: iv.createdAt.toISOString(),
      intervieweeName: userMap[iv.intervieweeId] || null,
      conductedByName: userMap[iv.conductedBy] || null,
    })),
    notifications: notifications.map((n) => ({
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
  });
});

router.patch("/protocols/:id", authMiddleware, requireRole("coordinator"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const parsed = UpdateProtocolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, any> = {};
  const data = parsed.data;
  if (data.status !== undefined && data.status !== null) updates.status = data.status;
  if (data.riskAssessment !== undefined) updates.riskAssessment = data.riskAssessment;
  if (data.protectiveMeasures) updates.protectiveMeasures = data.protectiveMeasures;
  if (data.resolutionNotes !== undefined) updates.resolutionNotes = data.resolutionNotes;
  if (data.parentNotificationSent !== undefined && data.parentNotificationSent !== null) updates.parentNotificationSent = data.parentNotificationSent;
  if (data.externalReferralRequired !== undefined && data.externalReferralRequired !== null) updates.externalReferralRequired = data.externalReferralRequired;
  if (data.externalReferralBody !== undefined) updates.externalReferralBody = data.externalReferralBody;
  if (data.status === "closed") updates.closedAt = new Date();

  const [protocol] = await db
    .update(protocolsTable)
    .set(updates)
    .where(and(eq(protocolsTable.id, id), eq(protocolsTable.schoolId, user.schoolId)))
    .returning();

  if (!protocol) {
    res.status(404).json({ error: "Protocol not found" });
    return;
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "protocol_updated",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "protocol",
    targetId: protocol.id,
    details: updates,
    req,
  });

  const enriched = await enrichProtocols([protocol]);
  res.json(enriched[0]);
});

async function enrichProtocols(protocols: (typeof protocolsTable.$inferSelect)[]) {
  if (protocols.length === 0) return [];

  const userIds = new Set<string>();
  for (const p of protocols) {
    userIds.add(p.victimId);
    userIds.add(p.openedBy);
  }

  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  return protocols.map((p) => ({
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
    victimName: userMap[p.victimId] || null,
    openedByName: userMap[p.openedBy] || null,
  }));
}

export default router;

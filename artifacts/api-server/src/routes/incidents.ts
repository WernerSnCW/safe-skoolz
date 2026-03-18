import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { db, incidentsTable, usersTable, notificationsTable } from "@workspace/db";
import {
  CreateIncidentBody,
  ListIncidentsQueryParams,
  UpdateIncidentStatusBody,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { determineEscalationTier, isSafeguardingTrigger } from "../lib/escalation";
import { generateIncidentRef } from "../lib/referenceNumber";
import { writeAudit } from "../lib/auditHelper";
import { runPatternDetection } from "../lib/patternDetection";

const router: IRouter = Router();

router.get("/incidents", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "head_of_year", "teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const query = ListIncidentsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  let conditions: any[] = [eq(incidentsTable.schoolId, user.schoolId)];

  if (query.success && query.data.status) {
    conditions.push(eq(incidentsTable.status, query.data.status));
  }
  if (query.success && query.data.category) {
    conditions.push(sql`${incidentsTable.category} ILIKE ${"%" + query.data.category + "%"}`);
  }
  if (query.success && query.data.from) {
    conditions.push(gte(incidentsTable.incidentDate, query.data.from));
  }
  if (query.success && query.data.to) {
    conditions.push(lte(incidentsTable.incidentDate, query.data.to));
  }

  const yearGroup = req.query.yearGroup as string | undefined;
  const className = req.query.className as string | undefined;
  const pupilId = req.query.pupilId as string | undefined;

  if (pupilId) {
    conditions.push(
      sql`(${incidentsTable.victimIds} @> ARRAY[${pupilId}]::uuid[] OR ${incidentsTable.perpetratorIds} @> ARRAY[${pupilId}]::uuid[] OR ${incidentsTable.reporterId} = ${pupilId})`
    );
  }

  if (yearGroup || className) {
    const pupilConditions: any[] = [
      eq(usersTable.schoolId, user.schoolId),
      eq(usersTable.role, "pupil"),
    ];
    if (yearGroup) pupilConditions.push(eq(usersTable.yearGroup, yearGroup));
    if (className) pupilConditions.push(eq(usersTable.className, className));

    const matchingPupils = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(...pupilConditions));

    if (matchingPupils.length > 0) {
      const pupilIds = matchingPupils.map((p) => p.id);
      conditions.push(
        sql`(${incidentsTable.victimIds} && ARRAY[${sql.join(pupilIds.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.perpetratorIds} && ARRAY[${sql.join(pupilIds.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.reporterId} = ANY(ARRAY[${sql.join(pupilIds.map(id => sql`${id}::uuid`), sql`, `)}]))`
      );
    } else {
      res.json({ data: [], total: 0, page, limit });
      return;
    }
  }

  if (user.role === "teacher") {
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    if (me?.className) {
      const classPupils = await db.select({ id: usersTable.id }).from(usersTable)
        .where(and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), eq(usersTable.className, me.className)));
      if (classPupils.length > 0) {
        const ids = classPupils.map(p => p.id);
        conditions.push(
          sql`(${incidentsTable.victimIds} && ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.perpetratorIds} && ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.reporterId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}]))`
        );
      }
    }
  } else if (user.role === "head_of_year") {
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    if (me?.yearGroup && !yearGroup && !className) {
      const yearPupils = await db.select({ id: usersTable.id }).from(usersTable)
        .where(and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), eq(usersTable.yearGroup, me.yearGroup)));
      if (yearPupils.length > 0) {
        const ids = yearPupils.map(p => p.id);
        conditions.push(
          sql`(${incidentsTable.victimIds} && ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.perpetratorIds} && ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.reporterId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}]))`
        );
      }
    }
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [incidents, countResult] = await Promise.all([
    db.select().from(incidentsTable).where(whereClause).orderBy(desc(incidentsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable).where(whereClause),
  ]);

  const enriched = await enrichIncidents(incidents);

  res.json({
    data: enriched,
    total: Number(countResult[0]?.count || 0),
    page,
    limit,
  });
});

router.post("/incidents", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const escalationTier = determineEscalationTier(data.category);
  const safeguardingTrigger = isSafeguardingTrigger(data.category);
  const referenceNumber = await generateIncidentRef();

  const [incident] = await db
    .insert(incidentsTable)
    .values({
      referenceNumber,
      schoolId: user.schoolId,
      reporterId: data.anonymous ? null : user.userId,
      reporterRole: user.role,
      anonymous: data.anonymous ?? false,
      category: data.category,
      escalationTier,
      safeguardingTrigger,
      incidentDate: data.incidentDate,
      incidentTime: data.incidentTime || null,
      location: data.location || null,
      description: data.description || null,
      victimIds: data.victimIds || [],
      perpetratorIds: data.perpetratorIds || [],
      personInvolvedText: data.personInvolvedText || null,
      witnessIds: data.witnessIds || [],
      witnessText: data.witnessText || null,
      emotionalState: data.emotionalState || null,
      emotionalFreetext: data.emotionalFreetext || null,
      happeningToMe: data.happeningToMe ?? false,
      happeningToSomeoneElse: data.happeningToSomeoneElse ?? false,
      iSawIt: data.iSawIt ?? false,
      childrenSeparated: data.childrenSeparated ?? null,
      coordinatorNotified: data.coordinatorNotified ?? null,
      immediateActionTaken: data.immediateActionTaken || null,
      partOfKnownPattern: data.partOfKnownPattern ?? null,
      toldByChild: data.toldByChild ?? null,
      childConsentToShare: data.childConsentToShare ?? null,
      formalResponseRequested: data.formalResponseRequested ?? false,
      requestExternalReferral: data.requestExternalReferral ?? false,
      confidentialFlag: data.confidentialFlag ?? false,
      status: "submitted",
    })
    .returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "incident_created",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: incident.id,
    details: { referenceNumber, category: data.category, escalationTier },
    req,
  });

  if (!data.anonymous) {
    await db.insert(notificationsTable).values({
      schoolId: user.schoolId,
      recipientId: user.userId,
      trigger: "incident_confirmation",
      channel: "in_app",
      subject: "Report Received",
      body: `Your report ${referenceNumber} has been received and will be reviewed.`,
      reference: referenceNumber,
      delivered: true,
    });
  }

  if (escalationTier >= 3 || safeguardingTrigger) {
    const coordinators = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.schoolId, user.schoolId),
          inArray(usersTable.role, ["coordinator", "head_teacher"]),
          eq(usersTable.active, true)
        )
      );

    for (const coord of coordinators) {
      await db.insert(notificationsTable).values({
        schoolId: user.schoolId,
        recipientId: coord.id,
        trigger: "tier3_incident",
        channel: "in_app",
        subject: `Urgent: Tier ${escalationTier} Incident`,
        body: `A tier ${escalationTier} ${data.category} incident (${referenceNumber}) requires immediate attention.`,
        reference: referenceNumber,
        delivered: true,
      });
    }
  }

  runPatternDetection(incident).catch(console.error);

  const enriched = await enrichIncidents([incident]);
  res.status(201).json(enriched[0]);
});

router.get("/incidents/:id", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  if (user.role === "pupil" || user.role === "parent") {
    if (incident.reporterId !== user.userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
  } else if (user.role === "teacher" || user.role === "head_of_year" || user.role === "support_staff") {
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    if (me) {
      let visiblePupilIds: string[] = [];
      if (me.role === "teacher" && me.className) {
        const classPupils = await db.select({ id: usersTable.id }).from(usersTable)
          .where(and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), eq(usersTable.className, me.className)));
        visiblePupilIds = classPupils.map(p => p.id);
      } else if (me.role === "head_of_year" && me.yearGroup) {
        const yearPupils = await db.select({ id: usersTable.id }).from(usersTable)
          .where(and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), eq(usersTable.yearGroup, me.yearGroup)));
        visiblePupilIds = yearPupils.map(p => p.id);
      }
      const isOwnReport = incident.reporterId === user.userId;
      const involvesVisiblePupil = visiblePupilIds.length > 0 && (
        (incident.victimIds || []).some(id => visiblePupilIds.includes(id)) ||
        (incident.perpetratorIds || []).some(id => visiblePupilIds.includes(id))
      );
      if (!isOwnReport && !involvesVisiblePupil && visiblePupilIds.length > 0) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
    }
  }

  const enriched = await enrichIncidents([incident]);
  res.json(enriched[0]);
});

router.patch("/incidents/:id/status", authMiddleware, requireRole("coordinator", "head_teacher", "senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const parsed = UpdateIncidentStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [incident] = await db
    .update(incidentsTable)
    .set({ status: parsed.data.status })
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)))
    .returning();

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "incident_status_updated",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: incident.id,
    details: { newStatus: parsed.data.status, note: parsed.data.note },
    req,
  });

  const enriched = await enrichIncidents([incident]);
  res.json(enriched[0]);
});

async function enrichIncidents(incidents: (typeof incidentsTable.$inferSelect)[]) {
  if (incidents.length === 0) return [];

  const userIds = new Set<string>();
  for (const inc of incidents) {
    if (inc.reporterId) userIds.add(inc.reporterId);
    if (inc.victimIds) inc.victimIds.forEach((id) => userIds.add(id));
    if (inc.perpetratorIds) inc.perpetratorIds.forEach((id) => userIds.add(id));
  }

  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) {
      userMap[u.id] = `${u.firstName} ${u.lastName}`;
    }
  }

  return incidents.map((inc) => ({
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
    personInvolvedText: inc.personInvolvedText,
    witnessIds: inc.witnessIds || [],
    witnessText: inc.witnessText,
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
    victimNames: (inc.victimIds || []).map((id) => userMap[id] || "Unknown"),
    perpetratorNames: (inc.perpetratorIds || []).map((id) => userMap[id] || "Unknown"),
  }));
}

export default router;

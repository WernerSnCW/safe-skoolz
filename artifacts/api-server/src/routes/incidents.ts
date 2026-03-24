import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { db, incidentsTable, usersTable, notificationsTable, patternAlertsTable, disclosurePermissionsTable } from "@workspace/db";
import {
  CreateIncidentBody,
  ListIncidentsQueryParams,
  UpdateIncidentStatusBody,
  AssessIncidentBody,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { determineEscalationTier, isSafeguardingTrigger } from "../lib/escalation";
import { generateIncidentRef } from "../lib/referenceNumber";
import { writeAudit } from "../lib/auditHelper";
import { runPatternDetection } from "../lib/patternDetection";

const router: IRouter = Router();

router.get("/incidents", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "head_of_year", "teacher", "parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const query = ListIncidentsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  if (user.role === "parent") {
    const [parentRecord] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    const childIds: string[] = parentRecord?.parentOf || [];
    if (childIds.length === 0) {
      res.json({ data: [], total: 0, page, limit });
      return;
    }
    const parentConditions: any[] = [
      eq(incidentsTable.schoolId, user.schoolId),
      eq(incidentsTable.parentVisible, true),
    ];
    if (query.success && query.data.status) {
      parentConditions.push(eq(incidentsTable.status, query.data.status));
    }
    parentConditions.push(
      sql`(${incidentsTable.victimIds} && ARRAY[${sql.join(childIds.map(id => sql`${id}::uuid`), sql`, `)}] OR ${incidentsTable.perpetratorIds} && ARRAY[${sql.join(childIds.map(id => sql`${id}::uuid`), sql`, `)}])`
    );
    const [{ count: totalCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(incidentsTable).where(and(...parentConditions));
    const incidents = await db.select().from(incidentsTable).where(and(...parentConditions))
      .orderBy(desc(incidentsTable.createdAt)).limit(limit).offset(offset);
    const enriched = await enrichIncidents(incidents, user.role, childIds, user.userId);
    res.json({ data: enriched, total: totalCount, page, limit });
    return;
  }

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

  const enriched = await enrichIncidents(incidents, user.role, undefined, user.userId);

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
      unknownPersonDescriptions: data.unknownPersonDescriptions || null,
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

  const enriched = await enrichIncidents([incident], user.role, undefined, user.userId);
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

  if (user.role === "pupil") {
    if (incident.reporterId !== user.userId) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
  } else if (user.role === "parent") {
    const [parentRecord] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    const childIds: string[] = parentRecord?.parentOf || [];
    const isOwnReport = incident.reporterId === user.userId;
    const involvesChild = childIds.length > 0 && (
      (incident.victimIds || []).some((vid: string) => childIds.includes(vid)) ||
      (incident.perpetratorIds || []).some((pid: string) => childIds.includes(pid))
    );
    if (!isOwnReport && (!involvesChild || !incident.parentVisible)) {
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
        const linkedAlert = await db.select({ id: patternAlertsTable.id }).from(patternAlertsTable)
          .where(and(
            eq(patternAlertsTable.schoolId, user.schoolId),
            sql`${patternAlertsTable.linkedIncidentIds} @> ARRAY[${incident.id}]::uuid[]`
          ))
          .limit(1);
        if (linkedAlert.length === 0) {
          res.status(403).json({ error: "Insufficient permissions" });
          return;
        }
      }
    }
  }

  let parentChildIds: string[] | undefined;
  if (user.role === "parent") {
    const [pr] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    parentChildIds = pr?.parentOf || [];
  }
  const enriched = await enrichIncidents([incident], user.role, parentChildIds, user.userId);
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

  const enriched = await enrichIncidents([incident], user.role, undefined, user.userId);
  res.json(enriched[0]);
});

router.patch("/incidents/:id/assess", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "teacher", "head_of_year"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const parsed = AssessIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(incidentsTable)
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)));

  if (!existing) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  if (user.role === "teacher" || user.role === "head_of_year") {
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
      const isOwnReport = existing.reporterId === user.userId;
      const involvesVisiblePupil = visiblePupilIds.length > 0 && (
        (existing.victimIds || []).some((vid: string) => visiblePupilIds.includes(vid)) ||
        (existing.perpetratorIds || []).some((vid: string) => visiblePupilIds.includes(vid))
      );
      if (!isOwnReport && !involvesVisiblePupil && visiblePupilIds.length > 0) {
        res.status(403).json({ error: "You can only assess incidents involving your pupils" });
        return;
      }
    }
  }

  const updates: any = {
    assessedBy: user.userId,
    assessedAt: new Date(),
  };
  if (parsed.data.addedToFile !== undefined) updates.addedToFile = parsed.data.addedToFile;
  if (parsed.data.parentVisible !== undefined) updates.parentVisible = parsed.data.parentVisible;
  if (parsed.data.staffNotes !== undefined) updates.staffNotes = parsed.data.staffNotes;
  if (parsed.data.witnessStatements !== undefined) updates.witnessStatements = parsed.data.witnessStatements;
  if (parsed.data.parentSummary !== undefined) updates.parentSummary = parsed.data.parentSummary;
  if (parsed.data.status) updates.status = parsed.data.status;

  const [incident] = await db
    .update(incidentsTable)
    .set(updates)
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)))
    .returning();

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "incident_assessed",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: incident.id,
    details: { addedToFile: incident.addedToFile, parentVisible: incident.parentVisible, status: incident.status },
    req,
  });

  if (parsed.data.parentVisible && parsed.data.parentSummary) {
    const victimIds = incident.victimIds || [];
    if (victimIds.length > 0) {
      const parents = await db
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.schoolId, user.schoolId),
            eq(usersTable.role, "parent"),
            eq(usersTable.active, true)
          )
        );

      for (const parent of parents) {
        const parentChildIds: string[] = parent.parentOf || [];
        const isLinked = victimIds.some((vid: string) => parentChildIds.includes(vid));
        if (isLinked) {
          await db.insert(notificationsTable).values({
            schoolId: user.schoolId,
            recipientId: parent.id,
            trigger: "incident_shared",
            channel: "in_app",
            subject: `Incident Report: ${incident.referenceNumber}`,
            body: `A report involving your child has been reviewed. Please check your dashboard for details.`,
            reference: incident.referenceNumber,
            delivered: true,
          });
        }
      }
    }
  }

  const enriched = await enrichIncidents([incident], user.role, undefined, user.userId);
  res.json(enriched[0]);
});

router.post("/incidents/:id/disclosure-request", authMiddleware, requireRole("coordinator", "head_teacher", "senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { subjectPupilId, requestedFromParentId, targetRoles, targetUserIds, scope, reason } = req.body;

  if (!subjectPupilId || !requestedFromParentId) {
    res.status(400).json({ error: "subjectPupilId and requestedFromParentId are required" });
    return;
  }

  const validScopes = ["behavioural_action_only", "summary_only", "named_staff_view", "full_incident_detail"];
  if (scope && !validScopes.includes(scope)) {
    res.status(400).json({ error: `scope must be one of: ${validScopes.join(", ")}` });
    return;
  }

  const [incident] = await db.select().from(incidentsTable)
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const [parentUser] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, requestedFromParentId), eq(usersTable.role, "parent"), eq(usersTable.schoolId, user.schoolId)));
  if (!parentUser) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }

  const parentChildIds = parentUser.parentOf || [];
  if (!parentChildIds.includes(subjectPupilId)) {
    res.status(400).json({ error: "The specified parent is not the guardian of the subject pupil" });
    return;
  }

  const victimIds = incident.victimIds || [];
  const perpetratorIds = incident.perpetratorIds || [];
  const involvedIds = [...victimIds, ...perpetratorIds];
  if (!involvedIds.includes(subjectPupilId)) {
    res.status(400).json({ error: "The subject pupil is not involved in this incident" });
    return;
  }

  const [permission] = await db.insert(disclosurePermissionsTable).values({
    schoolId: user.schoolId,
    incidentId: id,
    subjectPupilId,
    requestedById: user.userId,
    requestedFromParentId,
    targetRoles: targetRoles || ["teacher"],
    targetUserIds: targetUserIds || [],
    scope: scope || "summary_only",
    reason: reason || null,
    status: "pending",
  }).returning();

  await db.insert(notificationsTable).values({
    recipientId: requestedFromParentId,
    schoolId: user.schoolId,
    trigger: "disclosure_request",
    subject: "Staff disclosure permission request",
    body: `The safeguarding team has requested your permission to share information about your child with additional staff members. Please review.`,
    delivered: true,
  });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "disclosure_requested",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: id,
    details: { permissionId: permission.id, subjectPupilId, scope: permission.scope, referenceNumber: incident.referenceNumber },
    req,
  });

  res.json({ success: true, permission });
});

router.patch("/incidents/:id/disclosure-respond", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { permissionId, decision } = req.body;

  if (!permissionId || !decision || !["approved", "declined"].includes(decision)) {
    res.status(400).json({ error: "permissionId and decision (approved/declined) are required" });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [permission] = await db.select().from(disclosurePermissionsTable)
    .where(and(
      eq(disclosurePermissionsTable.id, permissionId),
      eq(disclosurePermissionsTable.incidentId, id),
      eq(disclosurePermissionsTable.requestedFromParentId, user.userId)
    ));

  if (!permission) {
    res.status(404).json({ error: "Disclosure permission request not found or not addressed to you" });
    return;
  }

  if (permission.status !== "pending") {
    res.status(400).json({ error: "This disclosure request has already been responded to" });
    return;
  }

  const [parent] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  const parentChildIds = parent?.parentOf || [];
  if (!parentChildIds.includes(permission.subjectPupilId)) {
    res.status(403).json({ error: "You are not the guardian of the child whose information is being disclosed" });
    return;
  }

  const [updated] = await db.update(disclosurePermissionsTable)
    .set({
      status: decision,
      respondedById: user.userId,
      respondedAt: new Date(),
    })
    .where(eq(disclosurePermissionsTable.id, permissionId))
    .returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "disclosure_responded",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: id,
    details: { permissionId, decision, subjectPupilId: permission.subjectPupilId },
    req,
  });

  const [incident] = await db.select().from(incidentsTable)
    .where(and(eq(incidentsTable.id, id), eq(incidentsTable.schoolId, user.schoolId)));
  if (incident) {
    const enriched = await enrichIncidents([incident], user.role, parentChildIds, user.userId);
    res.json(enriched[0]);
  } else {
    res.json({ success: true, permission: updated });
  }
});

router.get("/incidents/:id/disclosure-permissions", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  let conditions: any[] = [eq(disclosurePermissionsTable.incidentId, id), eq(disclosurePermissionsTable.schoolId, user.schoolId)];

  if (user.role === "parent") {
    conditions.push(eq(disclosurePermissionsTable.requestedFromParentId, user.userId));
  }

  const permissions = await db.select().from(disclosurePermissionsTable).where(and(...conditions));
  res.json(permissions);
});

async function enrichIncidents(incidents: (typeof incidentsTable.$inferSelect)[], viewerRole?: string, parentChildIds?: string[], viewerUserId?: string) {
  if (incidents.length === 0) return [];

  const userIds = new Set<string>();
  for (const inc of incidents) {
    if (inc.reporterId) userIds.add(inc.reporterId);
    if (inc.victimIds) inc.victimIds.forEach((id) => userIds.add(id));
    if (inc.perpetratorIds) inc.perpetratorIds.forEach((id) => userIds.add(id));
    if (inc.assessedBy) userIds.add(inc.assessedBy);
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

  const isParent = viewerRole === "parent";
  const isPupil = viewerRole === "pupil";
  const isFullAccess = ["coordinator", "head_teacher", "senco"].includes(viewerRole || "");
  const needsDisclosure = ["teacher", "head_of_year", "support_staff"].includes(viewerRole || "");

  const incidentIds = incidents.map((i) => i.id);
  let disclosureMap: Record<string, any[]> = {};
  if (incidentIds.length > 0) {
    const allPermissions = await db
      .select()
      .from(disclosurePermissionsTable)
      .where(inArray(disclosurePermissionsTable.incidentId, incidentIds));
    for (const perm of allPermissions) {
      if (!disclosureMap[perm.incidentId]) disclosureMap[perm.incidentId] = [];
      disclosureMap[perm.incidentId].push(perm);
    }
  }

  return Promise.all(incidents.map(async (inc) => {
    const permissions = disclosureMap[inc.id] || [];

    const base: any = {
      id: inc.id,
      referenceNumber: inc.referenceNumber,
      schoolId: inc.schoolId,
      category: inc.category,
      escalationTier: inc.escalationTier,
      safeguardingTrigger: inc.safeguardingTrigger,
      incidentDate: inc.incidentDate,
      location: inc.location,
      status: inc.status,
      protocolId: inc.protocolId,
      createdAt: inc.createdAt.toISOString(),
      addedToFile: inc.addedToFile,
      parentVisible: inc.parentVisible,
    };

    if (isParent) {
      base.description = inc.description || null;
      base.reporterRole = inc.reporterRole;
      base.anonymous = inc.anonymous;
      base.emotionalState = inc.emotionalState;
      base.emotionalFreetext = inc.emotionalFreetext;
      base.incidentTime = inc.incidentTime;
      base.happeningToMe = inc.happeningToMe;
      base.happeningToSomeoneElse = inc.happeningToSomeoneElse;
      base.iSawIt = inc.iSawIt;
      base.childrenSeparated = inc.childrenSeparated;
      base.immediateActionTaken = inc.immediateActionTaken;
      base.staffNotes = null;
      base.assessedBy = inc.assessedBy;
      base.assessedAt = inc.assessedAt ? inc.assessedAt.toISOString() : null;
      if (inc.assessedBy && userMap[inc.assessedBy]) {
        base.assessedByName = userMap[inc.assessedBy];
      }
      const childIdsSet = new Set(parentChildIds || []);
      base.victimNames = (inc.victimIds || []).map((id) =>
        childIdsSet.has(id) ? (userMap[id] || "Your child") : "Another pupil"
      );
      base.perpetratorNames = (inc.perpetratorIds || []).map((id) =>
        childIdsSet.has(id) ? (userMap[id] || "Your child") : "Another pupil"
      );
      base.victimIds = [];
      base.perpetratorIds = [];
      base.reporterName = null;
      base.parentSummary = inc.parentSummary || null;
      base.updatedAt = inc.updatedAt ? inc.updatedAt.toISOString() : null;

      const myPendingPermissions = permissions.filter(
        (p: any) => p.requestedFromParentId === viewerUserId && p.status === "pending"
      );
      const myRespondedPermissions = permissions.filter(
        (p: any) => p.requestedFromParentId === viewerUserId && p.status !== "pending"
      );
      base.disclosurePermissions = [...myPendingPermissions, ...myRespondedPermissions];
      base.disclosureStatus = myPendingPermissions.length > 0
        ? "pending"
        : myRespondedPermissions.length > 0
          ? myRespondedPermissions[myRespondedPermissions.length - 1].status
          : "not_requested";
    } else if (isPupil) {
      base.reporterId = inc.reporterId;
      base.reporterRole = inc.reporterRole;
      base.anonymous = inc.anonymous;
      base.description = inc.description;
      base.emotionalState = inc.emotionalState;
      base.reporterName = inc.reporterId ? (userMap[inc.reporterId] || null) : null;
      base.victimNames = (inc.victimIds || []).map((id) => userMap[id] || "Unknown");
      base.perpetratorNames = [];
      base.victimIds = inc.victimIds || [];
      base.perpetratorIds = [];
    } else {
      let disclosureGranted = false;
      let disclosureScope = "none";
      if (!needsDisclosure) {
        disclosureGranted = true;
        disclosureScope = "full_incident_detail";
      } else {
        const approvedPerms = permissions.filter((p: any) => {
          if (p.status !== "approved") return false;
          const targetRoles = p.targetRoles || [];
          const targetUserIds = p.targetUserIds || [];
          return targetRoles.includes(viewerRole) || (viewerUserId && targetUserIds.includes(viewerUserId));
        });
        if (approvedPerms.length > 0) {
          disclosureGranted = true;
          const scopeOrder = ["behavioural_action_only", "summary_only", "named_staff_view", "full_incident_detail"];
          disclosureScope = approvedPerms.reduce((best: string, p: any) => {
            return scopeOrder.indexOf(p.scope) > scopeOrder.indexOf(best) ? p.scope : best;
          }, "behavioural_action_only");
        }
      }

      const hasPendingDisclosure = permissions.some((p: any) => p.status === "pending");

      base.disclosureStatus = disclosureGranted ? "approved" : hasPendingDisclosure ? "pending" : permissions.length > 0 ? "declined" : "not_requested";
      base.disclosureScope = disclosureScope;

      const scopeAtLeast = (min: string) => {
        const order = ["none", "behavioural_action_only", "summary_only", "named_staff_view", "full_incident_detail"];
        return order.indexOf(disclosureScope) >= order.indexOf(min);
      };

      const showNames = scopeAtLeast("named_staff_view");
      const showFull = scopeAtLeast("full_incident_detail");
      const showSummary = scopeAtLeast("summary_only");

      base.reporterId = inc.reporterId;
      base.reporterRole = inc.reporterRole;
      base.anonymous = inc.anonymous;
      base.incidentTime = inc.incidentTime;
      base.description = showSummary ? inc.description : "[Disclosure required — parent has not yet approved staff access to this incident's details]";
      base.victimIds = showNames ? (inc.victimIds || []) : [];
      base.perpetratorIds = showNames ? (inc.perpetratorIds || []) : [];
      base.personInvolvedText = showNames ? inc.personInvolvedText : null;
      base.unknownPersonDescriptions = showFull ? (inc.unknownPersonDescriptions as any[] || []) : [];
      base.witnessIds = showFull ? (inc.witnessIds || []) : [];
      base.witnessText = showFull ? inc.witnessText : null;
      base.emotionalState = inc.emotionalState;
      base.emotionalFreetext = showSummary ? inc.emotionalFreetext : null;
      base.happeningToMe = inc.happeningToMe;
      base.happeningToSomeoneElse = inc.happeningToSomeoneElse;
      base.iSawIt = inc.iSawIt;
      base.childrenSeparated = inc.childrenSeparated;
      base.coordinatorNotified = inc.coordinatorNotified;
      base.immediateActionTaken = inc.immediateActionTaken;
      base.partOfKnownPattern = inc.partOfKnownPattern;
      base.toldByChild = inc.toldByChild;
      base.childConsentToShare = inc.childConsentToShare;
      base.formalResponseRequested = inc.formalResponseRequested;
      base.requestExternalReferral = inc.requestExternalReferral;
      base.confidentialFlag = inc.confidentialFlag;
      base.staffNotes = showFull ? inc.staffNotes : null;
      base.witnessStatements = showFull ? inc.witnessStatements : null;
      base.parentSummary = showSummary ? inc.parentSummary : null;
      base.assessedBy = inc.assessedBy;
      base.assessedAt = inc.assessedAt ? inc.assessedAt.toISOString() : null;
      base.reporterName = inc.reporterId ? (userMap[inc.reporterId] || null) : null;
      base.victimNames = showNames ? (inc.victimIds || []).map((id) => userMap[id] || "Unknown") : ["[Disclosure required]"];
      base.perpetratorNames = showNames ? (inc.perpetratorIds || []).map((id) => userMap[id] || "Unknown") : ["[Disclosure required]"];
      if (inc.assessedBy && userMap[inc.assessedBy]) {
        base.assessedByName = userMap[inc.assessedBy];
      }

      if (isFullAccess) {
        base.victimIds = inc.victimIds || [];
        base.perpetratorIds = inc.perpetratorIds || [];
        const allParents = await db.select({ id: usersTable.id, parentOf: usersTable.parentOf }).from(usersTable)
          .where(and(eq(usersTable.schoolId, inc.schoolId), eq(usersTable.role, "parent")));
        const subjectVictimId = (inc.victimIds || [])[0];
        if (subjectVictimId) {
          const victimParent = allParents.find(p => (p.parentOf || []).includes(subjectVictimId));
          if (victimParent) {
            base._parentId = victimParent.id;
          }
        }
        base.disclosurePermissions = permissions;
      }
    }

    return base;
  }));
}

export default router;

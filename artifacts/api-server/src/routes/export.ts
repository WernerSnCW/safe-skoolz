import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, incidentsTable, protocolsTable, usersTable, schoolsTable, caseTasksTable, patternAlertsTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { generateIncidentPdf, generateProtocolPdf } from "../lib/pdfExport";

const router: IRouter = Router();

router.get("/incidents/:id/export", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "teacher", "head_of_year"), async (req, res): Promise<void> => {
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
      const isOwnReport = incident.reporterId === user.userId;
      const involvesVisiblePupil = visiblePupilIds.length > 0 && (
        (incident.victimIds || []).some((vid: string) => visiblePupilIds.includes(vid)) ||
        (incident.perpetratorIds || []).some((pid: string) => visiblePupilIds.includes(pid))
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

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  const schoolName = school?.name || "School";

  const userIds = new Set<string>();
  if (incident.reporterId) userIds.add(incident.reporterId);
  if (incident.victimIds) incident.victimIds.forEach(id => userIds.add(id));
  if (incident.perpetratorIds) incident.perpetratorIds.forEach(id => userIds.add(id));
  if (incident.assessedBy) userIds.add(incident.assessedBy);
  userIds.add(user.userId);

  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  const enrichedIncident = {
    ...incident,
    reporterName: incident.reporterId ? (userMap[incident.reporterId] || null) : null,
    victimNames: (incident.victimIds || []).map(id => userMap[id] || "Unknown"),
    perpetratorNames: (incident.perpetratorIds || []).map(id => userMap[id] || "Unknown"),
    assessedByName: incident.assessedBy ? (userMap[incident.assessedBy] || null) : null,
    createdAt: incident.createdAt.toISOString(),
    assessedAt: incident.assessedAt?.toISOString() || null,
  };

  const generatedBy = userMap[user.userId] || "Staff Member";

  const pdfBuffer = await generateIncidentPdf({
    incident: enrichedIncident,
    schoolName,
    generatedBy,
  });

  const filename = `incident-${incident.referenceNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "incident_exported",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "incident",
    targetId: id,
    details: { referenceNumber: incident.referenceNumber },
    req,
  });
});

router.get("/protocols/:id/export", authMiddleware, requireRole("coordinator", "head_teacher", "senco"), async (req, res): Promise<void> => {
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

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  const schoolName = school?.name || "School";

  const userIds = new Set<string>();
  userIds.add(protocol.openedBy);
  if (protocol.victimId) userIds.add(protocol.victimId);
  if (protocol.allegedPerpetratorIds) protocol.allegedPerpetratorIds.forEach(id => userIds.add(id));
  userIds.add(user.userId);

  let userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const users = await db
      .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(inArray(usersTable.id, Array.from(userIds)));
    for (const u of users) userMap[u.id] = `${u.firstName} ${u.lastName}`;
  }

  const caseTasks = await db
    .select({
      id: caseTasksTable.id,
      title: caseTasksTable.title,
      status: caseTasksTable.status,
      dueAt: caseTasksTable.dueAt,
      assigneeFirstName: usersTable.firstName,
      assigneeLastName: usersTable.lastName,
    })
    .from(caseTasksTable)
    .leftJoin(usersTable, eq(caseTasksTable.assigneeId, usersTable.id))
    .where(and(eq(caseTasksTable.protocolId, id), eq(caseTasksTable.schoolId, user.schoolId)))
    .orderBy(desc(caseTasksTable.createdAt));

  const enrichedProtocol = {
    ...protocol,
    openedByName: userMap[protocol.openedBy] || null,
    victimName: protocol.victimId ? (userMap[protocol.victimId] || null) : null,
    allegedPerpetratorNames: (protocol.allegedPerpetratorIds || []).map((id: string) => userMap[id] || "Unknown"),
    openedAt: protocol.openedAt.toISOString(),
    closedAt: protocol.closedAt?.toISOString() || null,
    updatedAt: protocol.updatedAt.toISOString(),
  };

  const generatedBy = userMap[user.userId] || "Staff Member";

  const pdfBuffer = await generateProtocolPdf({
    protocol: enrichedProtocol,
    caseTasks,
    schoolName,
    generatedBy,
  });

  const filename = `protocol-${protocol.referenceNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  res.send(pdfBuffer);

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "protocol_exported",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "protocol",
    targetId: id,
    details: { referenceNumber: protocol.referenceNumber },
    req,
  });
});

export default router;

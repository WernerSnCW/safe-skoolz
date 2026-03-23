import { Router, type IRouter } from "express";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import {
  db, incidentsTable, protocolsTable, patternAlertsTable, usersTable,
  behaviourPointsTable, ptaMessagesTable, ptaConcernsTable,
  ptaPolicyAcknowledgementsTable, ptaCodesignResponsesTable, ptaAnnualReportsTable,
  pupilDiaryTable,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { ptaPiiMiddleware } from "../lib/ptaPiiMiddleware";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

router.use("/pta", authMiddleware, ptaPiiMiddleware);

router.get("/pta/dashboard", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const now = new Date();
  const startOfTerm = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startOfLastTerm = new Date(startOfTerm.getFullYear(), startOfTerm.getMonth() - 3, 1);

  const [
    incidentsThisTerm,
    incidentsLastTerm,
    categoryBreakdown,
    openProtocols,
    closedProtocolsThisTerm,
    amberAlerts,
    redAlerts,
    resolvedAlertsThisTerm,
    monthlyTrend,
    behaviourDistribution,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable)
      .where(and(eq(incidentsTable.schoolId, user.schoolId), gte(incidentsTable.createdAt, startOfTerm))),
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable)
      .where(and(eq(incidentsTable.schoolId, user.schoolId), gte(incidentsTable.createdAt, startOfLastTerm), sql`created_at < ${startOfTerm}`)),
    db.execute(sql`
      SELECT category, count(*) as count FROM incidents
      WHERE school_id = ${user.schoolId} AND created_at >= ${startOfTerm}
      GROUP BY category ORDER BY count DESC
    `),
    db.select({ count: sql<number>`count(*)` }).from(protocolsTable)
      .where(and(eq(protocolsTable.schoolId, user.schoolId), sql`status NOT IN ('closed', 'resolved')`)),
    db.select({ count: sql<number>`count(*)` }).from(protocolsTable)
      .where(and(eq(protocolsTable.schoolId, user.schoolId), sql`status IN ('closed', 'resolved')`, gte(protocolsTable.closedAt, startOfTerm))),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable)
      .where(and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.alertLevel, "amber"), eq(patternAlertsTable.status, "open"))),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable)
      .where(and(eq(patternAlertsTable.schoolId, user.schoolId), eq(patternAlertsTable.alertLevel, "red"), eq(patternAlertsTable.status, "open"))),
    db.select({ count: sql<number>`count(*)` }).from(patternAlertsTable)
      .where(and(eq(patternAlertsTable.schoolId, user.schoolId), sql`status IN ('resolved', 'acknowledged')`, gte(patternAlertsTable.reviewedAt, startOfTerm))),
    db.execute(sql`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as count
      FROM incidents WHERE school_id = ${user.schoolId}
        AND created_at >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
      GROUP BY date_trunc('month', created_at)
      ORDER BY month ASC
    `),
    db.execute(sql`
      SELECT level, count(*) as count FROM (
        SELECT
          CASE
            WHEN COALESCE(pt.total, 0) BETWEEN 0 AND 3 THEN 'Good Standing'
            WHEN COALESCE(pt.total, 0) BETWEEN 4 AND 6 THEN 'Warning'
            WHEN COALESCE(pt.total, 0) BETWEEN 7 AND 9 THEN 'Formal Warning'
            WHEN COALESCE(pt.total, 0) BETWEEN 10 AND 14 THEN 'Suspension Risk'
            WHEN COALESCE(pt.total, 0) BETWEEN 15 AND 19 THEN 'Suspended'
            WHEN COALESCE(pt.total, 0) BETWEEN 20 AND 24 THEN 'Term Exclusion'
            ELSE 'Full Exclusion'
          END as level,
          COALESCE(pt.total, 0) as sort_val
        FROM users u
        LEFT JOIN (
          SELECT pupil_id, SUM(points) as total FROM behaviour_points GROUP BY pupil_id
        ) pt ON pt.pupil_id = u.id
        WHERE u.school_id = ${user.schoolId} AND u.role = 'pupil' AND u.active = true
      ) classified
      GROUP BY level
      ORDER BY min(sort_val) ASC
    `),
  ]);

  res.json({
    incidentsThisTerm: Number(incidentsThisTerm[0]?.count || 0),
    incidentsLastTerm: Number(incidentsLastTerm[0]?.count || 0),
    categoryBreakdown: (categoryBreakdown.rows as any[]).map(r => ({
      category: r.category,
      count: Number(r.count),
    })),
    protocols: {
      open: Number(openProtocols[0]?.count || 0),
      closedThisTerm: Number(closedProtocolsThisTerm[0]?.count || 0),
    },
    alerts: {
      amber: Number(amberAlerts[0]?.count || 0),
      red: Number(redAlerts[0]?.count || 0),
      resolvedThisTerm: Number(resolvedAlertsThisTerm[0]?.count || 0),
    },
    monthlyTrend: (monthlyTrend.rows as any[]).map(r => ({
      month: r.month,
      count: Number(r.count),
    })),
    behaviourDistribution: (behaviourDistribution.rows as any[]).map(r => ({
      level: r.level,
      count: Number(r.count),
    })),
  });
});

router.get("/pta/messages", authMiddleware, requireRole("pta", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const messages = await db.select({
    id: ptaMessagesTable.id,
    senderId: ptaMessagesTable.senderId,
    body: ptaMessagesTable.body,
    readAt: ptaMessagesTable.readAt,
    createdAt: ptaMessagesTable.createdAt,
    senderFirstName: usersTable.firstName,
    senderLastName: usersTable.lastName,
    senderRole: usersTable.role,
  })
    .from(ptaMessagesTable)
    .innerJoin(usersTable, eq(ptaMessagesTable.senderId, usersTable.id))
    .where(eq(ptaMessagesTable.schoolId, user.schoolId))
    .orderBy(desc(ptaMessagesTable.createdAt))
    .limit(100);

  res.json({ data: messages });
});

router.post("/pta/messages", authMiddleware, requireRole("pta", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { body } = req.body;

  if (!body || typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: "Message body is required" });
    return;
  }

  const [msg] = await db.insert(ptaMessagesTable).values({
    schoolId: user.schoolId,
    senderId: user.userId,
    body: body.trim(),
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_message_sent",
    actor: user,
    targetType: "pta_message",
    targetId: msg.id,
    req,
  });

  res.status(201).json(msg);
});

router.get("/pta/concerns", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const concerns = await db.select({
    id: ptaConcernsTable.id,
    category: ptaConcernsTable.category,
    subject: ptaConcernsTable.subject,
    body: ptaConcernsTable.body,
    status: ptaConcernsTable.status,
    coordinatorResponse: ptaConcernsTable.coordinatorResponse,
    respondedAt: ptaConcernsTable.respondedAt,
    createdAt: ptaConcernsTable.createdAt,
    submitterFirstName: usersTable.firstName,
    submitterLastName: usersTable.lastName,
  })
    .from(ptaConcernsTable)
    .innerJoin(usersTable, eq(ptaConcernsTable.submittedById, usersTable.id))
    .where(eq(ptaConcernsTable.schoolId, user.schoolId))
    .orderBy(desc(ptaConcernsTable.createdAt));

  res.json({ data: concerns });
});

router.post("/pta/concerns", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { category, subject, body } = req.body;

  if (!category || !subject || !body) {
    res.status(400).json({ error: "Category, subject, and body are required" });
    return;
  }

  const validCategories = ["policy", "incident_pattern", "communication", "resources", "other"];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  const [concern] = await db.insert(ptaConcernsTable).values({
    schoolId: user.schoolId,
    submittedById: user.userId,
    category,
    subject,
    body,
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_concern_submitted",
    actor: user,
    targetType: "pta_concern",
    targetId: concern.id,
    req,
  });

  res.status(201).json(concern);
});

router.get("/pta/policy", authMiddleware, requireRole("pta", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const acknowledgements = await db.select({
    id: ptaPolicyAcknowledgementsTable.id,
    policyVersion: ptaPolicyAcknowledgementsTable.policyVersion,
    actionType: ptaPolicyAcknowledgementsTable.actionType,
    comment: ptaPolicyAcknowledgementsTable.comment,
    createdAt: ptaPolicyAcknowledgementsTable.createdAt,
    userFirstName: usersTable.firstName,
    userLastName: usersTable.lastName,
  })
    .from(ptaPolicyAcknowledgementsTable)
    .innerJoin(usersTable, eq(ptaPolicyAcknowledgementsTable.userId, usersTable.id))
    .where(eq(ptaPolicyAcknowledgementsTable.schoolId, user.schoolId))
    .orderBy(desc(ptaPolicyAcknowledgementsTable.createdAt));

  res.json({
    currentPolicy: {
      version: "2025-2026",
      title: "Safeguarding & Child Protection Policy",
      framework: "Zero Tolerance — LOPIVI, Convivèxit, Machista Violence Protocol",
      lastUpdated: "2025-09-01",
      sections: [
        "All pupils have the right to feel safe at school",
        "All incidents are logged, tracked, and escalated appropriately",
        "Parents are notified of incidents involving their child",
        "Formal protocols are opened for any confirmed bullying, child protection concern, or gender-based violence",
        "The school maintains a designated Safeguarding Coordinator as required by LOPIVI",
        "Annual safeguarding report is shared with the PTA in anonymised form",
      ],
    },
    acknowledgements,
  });
});

router.post("/pta/policy/acknowledge", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { policyVersion, comment } = req.body;

  if (!policyVersion) {
    res.status(400).json({ error: "Policy version is required" });
    return;
  }

  const [ack] = await db.insert(ptaPolicyAcknowledgementsTable).values({
    schoolId: user.schoolId,
    userId: user.userId,
    policyVersion,
    actionType: "acknowledge",
    comment: comment || null,
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_policy_acknowledged",
    actor: user,
    targetType: "pta_policy",
    targetId: ack.id,
    details: { policyVersion },
    req,
  });

  res.status(201).json(ack);
});

router.post("/pta/policy/flag", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { policyVersion, comment } = req.body;

  if (!policyVersion || !comment) {
    res.status(400).json({ error: "Policy version and comment are required" });
    return;
  }

  const [flag] = await db.insert(ptaPolicyAcknowledgementsTable).values({
    schoolId: user.schoolId,
    userId: user.userId,
    policyVersion,
    actionType: "flag",
    comment,
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_policy_flagged",
    actor: user,
    targetType: "pta_policy",
    targetId: flag.id,
    details: { policyVersion, comment },
    req,
  });

  res.status(201).json(flag);
});

router.get("/pta/report/latest", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const [report] = await db.select().from(ptaAnnualReportsTable)
    .where(and(eq(ptaAnnualReportsTable.schoolId, user.schoolId), eq(ptaAnnualReportsTable.status, "approved")))
    .orderBy(desc(ptaAnnualReportsTable.createdAt))
    .limit(1);

  if (!report) {
    res.json({ report: null });
    return;
  }

  if (!report.accessedByPtaAt) {
    await db.update(ptaAnnualReportsTable)
      .set({ accessedByPtaAt: new Date() })
      .where(eq(ptaAnnualReportsTable.id, report.id));
  }

  res.json({ report });
});

router.get("/pta/report/all", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const reports = await db.select().from(ptaAnnualReportsTable)
    .where(eq(ptaAnnualReportsTable.schoolId, user.schoolId))
    .orderBy(desc(ptaAnnualReportsTable.createdAt));

  res.json({ reports });
});

router.post("/pta/report/generate", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const now = new Date();
  const academicYearStart = now.getMonth() >= 8
    ? new Date(now.getFullYear(), 8, 1)
    : new Date(now.getFullYear() - 1, 8, 1);
  const academicYear = `${academicYearStart.getFullYear()}-${academicYearStart.getFullYear() + 1}`;

  const [
    totalIncidents,
    categoryData,
    protocolData,
    alertData,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable)
      .where(and(eq(incidentsTable.schoolId, user.schoolId), gte(incidentsTable.createdAt, academicYearStart))),
    db.execute(sql`
      SELECT category, count(*) as count FROM incidents
      WHERE school_id = ${user.schoolId} AND created_at >= ${academicYearStart}
      GROUP BY category
    `),
    db.execute(sql`
      SELECT status, count(*) as count FROM protocols
      WHERE school_id = ${user.schoolId} AND opened_at >= ${academicYearStart}
      GROUP BY status
    `),
    db.execute(sql`
      SELECT alert_level, status, count(*) as count FROM pattern_alerts
      WHERE school_id = ${user.schoolId} AND triggered_at >= ${academicYearStart}
      GROUP BY alert_level, status
    `),
  ]);

  const reportData = {
    academicYear,
    generatedAt: now.toISOString(),
    totalIncidents: Number(totalIncidents[0]?.count || 0),
    incidentsByCategory: (categoryData.rows as any[]).map(r => ({ category: r.category, count: Number(r.count) })),
    protocolsByStatus: (protocolData.rows as any[]).map(r => ({ status: r.status, count: Number(r.count) })),
    alertsSummary: (alertData.rows as any[]).map(r => ({
      level: r.alert_level,
      status: r.status,
      count: Number(r.count),
    })),
  };

  const [report] = await db.insert(ptaAnnualReportsTable).values({
    schoolId: user.schoolId,
    academicYear,
    reportData,
    status: "draft",
    generatedById: user.userId,
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_report_generated",
    actor: user,
    targetType: "pta_annual_report",
    targetId: report.id,
    req,
  });

  res.status(201).json({ report });
});

router.post("/pta/report/approve", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { reportId } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "Report ID is required" });
    return;
  }

  const [report] = await db.select().from(ptaAnnualReportsTable)
    .where(and(eq(ptaAnnualReportsTable.id, reportId), eq(ptaAnnualReportsTable.schoolId, user.schoolId)));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const [updated] = await db.update(ptaAnnualReportsTable)
    .set({ status: "approved", approvedById: user.userId, approvedAt: new Date() })
    .where(eq(ptaAnnualReportsTable.id, reportId))
    .returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_report_approved",
    actor: user,
    targetType: "pta_annual_report",
    targetId: reportId,
    req,
  });

  res.json({ report: updated });
});

router.get("/pta/codesign", authMiddleware, requireRole("pta", "coordinator"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const responses = await db.select({
    id: ptaCodesignResponsesTable.id,
    questionKey: ptaCodesignResponsesTable.questionKey,
    response: ptaCodesignResponsesTable.response,
    createdAt: ptaCodesignResponsesTable.createdAt,
    submitterFirstName: usersTable.firstName,
    submitterLastName: usersTable.lastName,
  })
    .from(ptaCodesignResponsesTable)
    .innerJoin(usersTable, eq(ptaCodesignResponsesTable.submittedById, usersTable.id))
    .where(eq(ptaCodesignResponsesTable.schoolId, user.schoolId))
    .orderBy(desc(ptaCodesignResponsesTable.createdAt));

  const questions = [
    { key: "notification_language", label: "Preferred language for parent notifications", type: "text" },
    { key: "dashboard_preferences", label: "Dashboard layout preferences", type: "text" },
    { key: "alert_categories", label: "Which incident categories should generate parent alerts?", type: "text" },
    { key: "info_evening_format", label: "Preferred parent information evening format", type: "text" },
    { key: "additional_feedback", label: "Any additional feedback or suggestions", type: "text" },
  ];

  res.json({ questions, responses });
});

router.post("/pta/codesign/response", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { questionKey, response } = req.body;

  if (!questionKey || !response) {
    res.status(400).json({ error: "Question key and response are required" });
    return;
  }

  const [entry] = await db.insert(ptaCodesignResponsesTable).values({
    schoolId: user.schoolId,
    submittedById: user.userId,
    questionKey,
    response,
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pta_codesign_response",
    actor: user,
    targetType: "pta_codesign",
    targetId: entry.id,
    req,
  });

  res.status(201).json(entry);
});

router.get("/pta/mood-trends", authMiddleware, requireRole("pta"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const weeklyMoods = await db.execute(sql`
    SELECT
      to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week_start,
      ROUND(AVG(mood)::numeric, 2) as avg_mood
    FROM pupil_diary
    WHERE school_id = ${user.schoolId}
      AND created_at >= ${twelveWeeksAgo}
    GROUP BY date_trunc('week', created_at)
    HAVING COUNT(DISTINCT pupil_id) >= 5
    ORDER BY week_start ASC
  `);

  res.json({
    weeks: (weeklyMoods.rows as any[]).map(r => ({
      weekStart: r.week_start,
      avgMood: Number(r.avg_mood),
    })),
  });
});

router.get("/pta/resources", authMiddleware, requireRole("pta"), async (_req, res): Promise<void> => {
  res.json({
    resources: [
      {
        id: "lopivi-guide",
        title: "LOPIVI Plain English Guide",
        description: "What the law requires — a parent-friendly summary of Spain's child protection framework (Ley Orgánica 8/2021).",
        category: "legal",
        type: "document",
      },
      {
        id: "convivexit-parent-guide",
        title: "Convivèxit Parent Guide",
        description: "What happens when an anti-bullying protocol is opened — the Balearic Islands procedure explained for parents.",
        category: "protocol",
        type: "document",
      },
      {
        id: "template-coordinator-id",
        title: "Template: Request Coordinator Identification",
        description: "Template letter for requesting the headteacher formally identify the school's Safeguarding Coordinator.",
        category: "template",
        type: "letter",
      },
      {
        id: "template-subject-access",
        title: "Template: Subject Access Request",
        description: "Template letter for requesting all information held about your child under data protection law.",
        category: "template",
        type: "letter",
      },
      {
        id: "template-safeguarding-response",
        title: "Template: Request Formal Safeguarding Response",
        description: "Template letter for requesting a formal written response from the school about a safeguarding concern.",
        category: "template",
        type: "letter",
      },
      {
        id: "pta-rights-checklist",
        title: "PTA Rights Checklist",
        description: "What the PTA is entitled to ask for — a summary of governance rights and information access.",
        category: "governance",
        type: "checklist",
      },
      {
        id: "annual-report-template",
        title: "Annual Report Template (Blank)",
        description: "A blank annual safeguarding report template for PTAs without SafeSkoolZ to use manually.",
        category: "template",
        type: "document",
      },
    ],
  });
});

router.get("/parent/pta-contacts", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const ptaMembers = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
  })
    .from(usersTable)
    .where(and(
      eq(usersTable.schoolId, user.schoolId),
      eq(usersTable.role, "pta"),
    ));

  res.json(ptaMembers.map(m => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName?.charAt(0) || ""}.`,
  })));
});

router.post("/parent/pta-message", authMiddleware, requireRole("parent"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { message, subject } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const [concern] = await db.insert(ptaConcernsTable).values({
    schoolId: user.schoolId,
    submittedById: user.userId,
    category: "parent_outreach",
    subject: subject || "Message from a parent",
    body: message.trim(),
    status: "open",
  }).returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "parent_pta_message_sent",
    actor: user,
    targetType: "pta_concern",
    targetId: concern.id,
    details: { subject: subject || "Message from a parent" },
    req,
  });

  res.status(201).json({ success: true, id: concern.id });
});

export default router;

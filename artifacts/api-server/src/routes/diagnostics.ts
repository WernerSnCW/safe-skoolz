import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { diagnosticSurveysTable, diagnosticResponsesTable, diagnosticActionsTable, usersTable } from "@workspace/db/schema";
import { eq, and, count, avg, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

type QuestionDef = {
  key: string;
  category: string;
  roles: string[];
  text: Record<string, string>;
  scale: { low: string; high: string };
};

const QUESTION_BANK: QuestionDef[] = [
  {
    key: "aware_bullying_exists",
    category: "Awareness & Prevalence",
    roles: ["pupil", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      pupil: "Do you think bullying happens at your school?",
      staff: "How prevalent do you believe bullying is in this school?",
      parent: "How much of a problem do you believe bullying is at your child's school?",
    },
    scale: { low: "Not at all", high: "A lot" },
  },
  {
    key: "aware_types",
    category: "Awareness & Prevalence",
    roles: ["pupil", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      pupil: "Do you know what counts as bullying? (e.g. name-calling, leaving people out, online meanness)",
      staff: "How well do staff understand the different forms bullying can take (verbal, physical, relational, online)?",
      parent: "How well do you understand the different types of bullying that can happen?",
    },
    scale: { low: "Not well", high: "Very well" },
  },
  {
    key: "aware_online",
    category: "Awareness & Prevalence",
    roles: ["pupil", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      pupil: "Do you know what cyberbullying is and how to stay safe online?",
      staff: "How confident is the school in addressing cyberbullying and online safety?",
      parent: "How aware are you of online bullying risks your child may face?",
    },
    scale: { low: "Not at all", high: "Very aware" },
  },

  {
    key: "trust_tell_adult",
    category: "Trust & Reporting",
    roles: ["pupil", "parent", "pta"],
    text: {
      pupil: "If something bad happened, would you feel safe telling a grown-up at school?",
      parent: "Do you believe your child would feel comfortable reporting an incident to school staff?",
    },
    scale: { low: "Definitely not", high: "Definitely yes" },
  },
  {
    key: "trust_taken_seriously",
    category: "Trust & Reporting",
    roles: ["pupil", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      pupil: "When someone tells a teacher about bullying, do they take it seriously?",
      staff: "How confident are you that reported incidents are taken seriously and followed up?",
      parent: "How confident are you that the school takes bullying reports seriously?",
    },
    scale: { low: "Not at all", high: "Very confident" },
  },
  {
    key: "trust_know_how_report",
    category: "Trust & Reporting",
    roles: ["pupil", "parent", "pta"],
    text: {
      pupil: "Do you know how to report bullying at your school?",
      parent: "Do you know how to report a concern about bullying to the school?",
    },
    scale: { low: "No idea", high: "I know exactly how" },
  },
  {
    key: "trust_staff_respond",
    category: "Trust & Reporting",
    roles: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
    text: {
      staff: "How confident are you in the school's process for handling bullying reports?",
    },
    scale: { low: "Not confident", high: "Very confident" },
  },

  {
    key: "culture_feel_safe",
    category: "Culture & Wellbeing",
    roles: ["pupil", "parent", "pta"],
    text: {
      pupil: "Do you feel safe and happy at school most of the time?",
      parent: "Do you believe your child feels safe and happy at school?",
    },
    scale: { low: "Not at all", high: "Very much" },
  },
  {
    key: "culture_kind_school",
    category: "Culture & Wellbeing",
    roles: ["pupil", "teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      pupil: "Are most people kind to each other at your school?",
      staff: "How would you rate the overall kindness and respect culture among pupils?",
      parent: "How would you describe the overall culture of kindness at the school?",
    },
    scale: { low: "Not kind", high: "Very kind" },
  },
  {
    key: "culture_included",
    category: "Culture & Wellbeing",
    roles: ["pupil", "parent", "pta"],
    text: {
      pupil: "Do you feel included and like you belong at school?",
      parent: "Do you believe your child feels included and a sense of belonging at school?",
    },
    scale: { low: "Not at all", high: "Very much" },
  },
  {
    key: "culture_staff_wellbeing",
    category: "Culture & Wellbeing",
    roles: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
    text: {
      staff: "How supported do you feel by the school in managing pupil wellbeing and safeguarding?",
    },
    scale: { low: "Not supported", high: "Very supported" },
  },

  {
    key: "safeguard_know_policy",
    category: "Safeguarding Knowledge",
    roles: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher", "parent", "pta"],
    text: {
      staff: "How familiar are you with the school's anti-bullying and safeguarding policies?",
      parent: "How familiar are you with the school's anti-bullying policy?",
    },
    scale: { low: "Not at all", high: "Very familiar" },
  },
  {
    key: "safeguard_training",
    category: "Safeguarding Knowledge",
    roles: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
    text: {
      staff: "How adequate is the safeguarding and anti-bullying training you receive?",
    },
    scale: { low: "Inadequate", high: "Excellent" },
  },
  {
    key: "safeguard_escalation",
    category: "Safeguarding Knowledge",
    roles: ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"],
    text: {
      staff: "How clear are you on when and how to escalate a safeguarding concern?",
    },
    scale: { low: "Not clear", high: "Very clear" },
  },
  {
    key: "safeguard_parent_informed",
    category: "Safeguarding Knowledge",
    roles: ["parent", "pta"],
    text: {
      parent: "How well does the school communicate about safeguarding measures and incidents (where appropriate)?",
    },
    scale: { low: "Poorly", high: "Very well" },
  },

  {
    key: "ready_dsl_appointed",
    category: "System Readiness",
    roles: ["coordinator", "head_teacher"],
    text: {
      staff: "Is there a Designated Safeguarding Lead (DSL) clearly appointed and known to all staff?",
    },
    scale: { low: "No", high: "Yes, fully" },
  },
  {
    key: "ready_policy_current",
    category: "System Readiness",
    roles: ["coordinator", "head_teacher"],
    text: {
      staff: "Is the school's anti-bullying/safeguarding policy up to date and compliant with current legislation?",
    },
    scale: { low: "Outdated", high: "Fully current" },
  },
  {
    key: "ready_reporting_system",
    category: "System Readiness",
    roles: ["coordinator", "head_teacher"],
    text: {
      staff: "Is there a clear, accessible reporting system in place for pupils, staff, and parents?",
    },
    scale: { low: "No system", high: "Fully operational" },
  },
  {
    key: "ready_staff_trained",
    category: "System Readiness",
    roles: ["coordinator", "head_teacher"],
    text: {
      staff: "Have all staff received up-to-date safeguarding training?",
    },
    scale: { low: "None trained", high: "All trained" },
  },
  {
    key: "ready_parent_channels",
    category: "System Readiness",
    roles: ["coordinator", "head_teacher"],
    text: {
      staff: "Are there clear channels for parents to raise safeguarding concerns?",
    },
    scale: { low: "No channels", high: "Fully established" },
  },
];

function getRoleGroup(role: string): string {
  if (role === "pupil") return "pupil";
  if (role === "parent" || role === "pta") return "parent";
  return "staff";
}

function getQuestionsForRole(role: string): Array<QuestionDef & { displayText: string }> {
  const group = getRoleGroup(role);
  return QUESTION_BANK
    .filter(q => q.roles.includes(role))
    .map(q => ({
      ...q,
      displayText: q.text[group] || q.text.staff || q.text.pupil || q.text.parent || "",
    }));
}

router.post("/diagnostics", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Only coordinators and head teachers can create diagnostics" });
    return;
  }

  const { title } = req.body;
  const [survey] = await db.insert(diagnosticSurveysTable).values({
    schoolId: user.schoolId,
    title: title || "School Onboarding Diagnostic",
    status: "active",
    createdBy: user.userId,
  }).returning();

  res.status(201).json(survey);
});

router.get("/diagnostics/active", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
      eq(diagnosticSurveysTable.status, "active"),
    ))
    .orderBy(sql`${diagnosticSurveysTable.createdAt} desc`)
    .limit(1);

  if (!survey) {
    res.json({ survey: null, questions: [], alreadyCompleted: false });
    return;
  }

  const existingResponses = await db.select({ questionKey: diagnosticResponsesTable.questionKey })
    .from(diagnosticResponsesTable)
    .where(and(
      eq(diagnosticResponsesTable.surveyId, survey.id),
      eq(diagnosticResponsesTable.userId, user.userId),
    ));

  const alreadyCompleted = existingResponses.length > 0;
  const questions = getQuestionsForRole(user.role);

  res.json({
    survey,
    questions: questions.map(q => ({
      key: q.key,
      category: q.category,
      text: q.displayText,
      scale: q.scale,
    })),
    alreadyCompleted,
    previousAnswers: alreadyCompleted ? existingResponses : undefined,
  });
});

router.get("/diagnostics", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const surveys = await db.select()
    .from(diagnosticSurveysTable)
    .where(eq(diagnosticSurveysTable.schoolId, user.schoolId))
    .orderBy(sql`${diagnosticSurveysTable.createdAt} desc`);

  res.json(surveys);
});

router.post("/diagnostics/:id/respond", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const surveyId = req.params.id;

  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.id, surveyId),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
      eq(diagnosticSurveysTable.status, "active"),
    ));

  if (!survey) {
    res.status(404).json({ error: "Survey not found or not active" });
    return;
  }

  const existing = await db.select({ id: diagnosticResponsesTable.id })
    .from(diagnosticResponsesTable)
    .where(and(
      eq(diagnosticResponsesTable.surveyId, surveyId),
      eq(diagnosticResponsesTable.userId, user.userId),
    ))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "You have already completed this diagnostic" });
    return;
  }

  const { answers } = req.body;
  if (!answers || !Array.isArray(answers)) {
    res.status(400).json({ error: "Answers array required" });
    return;
  }

  const validQuestions = getQuestionsForRole(user.role);
  const validKeys = new Set(validQuestions.map(q => q.key));

  const rows = answers
    .filter((a: any) => validKeys.has(a.key) && typeof a.answer === "number" && a.answer >= 1 && a.answer <= 5)
    .map((a: any) => ({
      surveyId,
      userId: user.userId,
      questionKey: a.key,
      answer: a.answer,
      comment: a.comment || null,
    }));

  if (rows.length === 0) {
    res.status(400).json({ error: "No valid answers provided" });
    return;
  }

  await db.insert(diagnosticResponsesTable).values(rows);

  res.json({ success: true, answersRecorded: rows.length });
});

router.get("/diagnostics/:id/results", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher", "senco"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const surveyId = req.params.id;

  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.id, surveyId),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
    ));

  if (!survey) {
    res.status(404).json({ error: "Survey not found" });
    return;
  }

  const responses = await db.select({
    questionKey: diagnosticResponsesTable.questionKey,
    answer: diagnosticResponsesTable.answer,
    userId: diagnosticResponsesTable.userId,
  })
    .from(diagnosticResponsesTable)
    .where(eq(diagnosticResponsesTable.surveyId, surveyId));

  const userIds = [...new Set(responses.map(r => r.userId))];
  const usersData = userIds.length > 0 ? await db.select({
    id: usersTable.id,
    role: usersTable.role,
  })
    .from(usersTable)
    .where(sql`${usersTable.id} IN ${userIds}`) : [];

  const userRoleMap = new Map(usersData.map(u => [u.id, u.role]));

  const participationByGroup: Record<string, Set<string>> = { pupil: new Set(), staff: new Set(), parent: new Set() };
  const categoryScores: Record<string, Record<string, { sum: number; count: number }>> = {};

  for (const r of responses) {
    const role = userRoleMap.get(r.userId) || "staff";
    const group = getRoleGroup(role);
    participationByGroup[group].add(r.userId);

    const qDef = QUESTION_BANK.find(q => q.key === r.questionKey);
    if (!qDef) continue;

    const cat = qDef.category;
    if (!categoryScores[cat]) categoryScores[cat] = {};
    if (!categoryScores[cat][group]) categoryScores[cat][group] = { sum: 0, count: 0 };
    categoryScores[cat][group].sum += r.answer;
    categoryScores[cat][group].count += 1;
  }

  const totalUsers = await db.select({ cnt: count() })
    .from(usersTable)
    .where(eq(usersTable.schoolId, user.schoolId));

  const usersByRole = await db.select({
    role: usersTable.role,
    cnt: count(),
  })
    .from(usersTable)
    .where(eq(usersTable.schoolId, user.schoolId))
    .groupBy(usersTable.role);

  const roleCounts: Record<string, number> = {};
  for (const r of usersByRole) {
    const group = getRoleGroup(r.role);
    roleCounts[group] = (roleCounts[group] || 0) + Number(r.cnt);
  }

  const participation = {
    pupil: { responded: participationByGroup.pupil.size, total: roleCounts.pupil || 0 },
    staff: { responded: participationByGroup.staff.size, total: roleCounts.staff || 0 },
    parent: { responded: participationByGroup.parent.size, total: roleCounts.parent || 0 },
  };

  const categories = Object.entries(categoryScores).map(([cat, groups]) => {
    const groupAverages: Record<string, number> = {};
    for (const [g, data] of Object.entries(groups)) {
      groupAverages[g] = Math.round((data.sum / data.count) * 10) / 10;
    }
    return { category: cat, averages: groupAverages };
  });

  const strengths: string[] = [];
  const growthAreas: string[] = [];
  const alignmentNotes: string[] = [];

  for (const c of categories) {
    const groups = Object.keys(c.averages);
    const allAvgs = Object.values(c.averages);
    const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;

    if (overallAvg >= 3.8) {
      strengths.push(`"${c.category}" is a clear strength across the school community (avg: ${overallAvg.toFixed(1)}/5).`);
    } else if (overallAvg <= 2.5) {
      growthAreas.push(`"${c.category}" is an area where focused development could make a real difference (avg: ${overallAvg.toFixed(1)}/5).`);
    }

    if (groups.includes("pupil") && groups.includes("staff")) {
      const gap = Math.abs(c.averages.pupil - c.averages.staff);
      if (gap >= 1.5) {
        const lower = c.averages.pupil < c.averages.staff ? "pupils" : "staff";
        const higher = c.averages.pupil < c.averages.staff ? "staff" : "pupils";
        alignmentNotes.push(`In "${c.category}", ${lower} and ${higher} see things differently (${gap.toFixed(1)} point gap). Exploring this together could strengthen shared understanding.`);
      }
    }
    if (groups.includes("parent") && groups.includes("staff")) {
      const gap = Math.abs(c.averages.parent - c.averages.staff);
      if (gap >= 1.5) {
        const lower = c.averages.parent < c.averages.staff ? "parents" : "staff";
        const higher = c.averages.parent < c.averages.staff ? "staff" : "parents";
        alignmentNotes.push(`In "${c.category}", ${lower} and ${higher} have different perspectives (${gap.toFixed(1)} point gap). This is an opportunity to strengthen communication.`);
      }
    }
  }

  if (participation.pupil.responded === 0) {
    alignmentNotes.push("Pupil voices haven't been heard yet — their perspective will complete the picture.");
  }
  if (participation.parent.responded === 0) {
    alignmentNotes.push("Parent perspectives are still needed — their input will help round out the school view.");
  }

  const KPI_MAP: Record<string, {
    kpis: Array<{ metric: string; baseline: string; target: string; timeframe: string }>;
    actions: string[];
  }> = {
    "Awareness & Prevalence": {
      kpis: [
        { metric: "% of pupils who can name 3+ forms of bullying", baseline: "Measure via follow-up survey", target: "85%+", timeframe: "6 months" },
        { metric: "Anti-bullying awareness sessions delivered per term", baseline: "0", target: "2 per year group", timeframe: "Next term" },
        { metric: "Staff confidence in identifying covert bullying", baseline: "Current diagnostic avg", target: "4.0+ avg", timeframe: "12 months" },
      ],
      actions: [
        "Run age-appropriate assemblies on recognising bullying (physical, verbal, relational, online)",
        "Add 'What counts as bullying?' quiz to pupil learning resources",
        "Include real-scenario case studies in staff CPD sessions",
      ],
    },
    "Trust & Reporting": {
      kpis: [
        { metric: "% of pupils who say they would tell an adult", baseline: "Current diagnostic avg", target: "4.0+ avg", timeframe: "12 months" },
        { metric: "Monthly incident reports submitted (trend)", baseline: "Current count", target: "Upward trend in first 6 months (means more trust, not more bullying)", timeframe: "6 months" },
        { metric: "Average time from report to first staff response", baseline: "Measure via system", target: "< 24 hours", timeframe: "3 months" },
      ],
      actions: [
        "Publicise reporting channels (SafeSchool, trusted adults list) in every classroom",
        "Run 'It's OK to tell' campaign — normalise reporting as caring, not snitching",
        "Introduce anonymous reporting option and communicate it to pupils and parents",
        "Share response-time data with staff to build accountability",
      ],
    },
    "Culture & Wellbeing": {
      kpis: [
        { metric: "Pupil wellbeing diary avg mood (school-wide)", baseline: "Current diary avg", target: "3.5+ sustained", timeframe: "Ongoing" },
        { metric: "% of pupils feeling 'safe and happy' (diagnostic Q)", baseline: "Current diagnostic avg", target: "4.0+", timeframe: "12 months" },
        { metric: "Positive behaviour recognitions per term", baseline: "0", target: "5+ per class per term", timeframe: "Next term" },
      ],
      actions: [
        "Launch daily wellbeing check-ins (diary feature) across all year groups",
        "Train staff on restorative conversations (not just sanctions)",
        "Create pupil wellbeing ambassadors programme",
        "Review break/lunch supervision and inclusion practices",
      ],
    },
    "Safeguarding Knowledge": {
      kpis: [
        { metric: "% of staff completing safeguarding refresher training", baseline: "Measure via HR", target: "100%", timeframe: "Next term" },
        { metric: "Parent familiarity with anti-bullying policy", baseline: "Current diagnostic avg", target: "3.5+ avg", timeframe: "12 months" },
        { metric: "% of staff confident in escalation procedures", baseline: "Current diagnostic avg", target: "4.0+", timeframe: "6 months" },
      ],
      actions: [
        "Schedule termly safeguarding refresher for all staff (including non-teaching)",
        "Send parent-friendly policy summary via school comms channel",
        "Run scenario-based training: 'What would you do if...?'",
        "Display escalation flowchart in staff room and on SafeSchool",
      ],
    },
    "System Readiness": {
      kpis: [
        { metric: "DSL formally appointed and known to all staff", baseline: "Yes/No", target: "Yes — verified annually", timeframe: "Immediate" },
        { metric: "Anti-bullying policy reviewed and current", baseline: "Last review date", target: "Reviewed annually", timeframe: "Before next term" },
        { metric: "Reporting system accessible to all groups", baseline: "Assess via diagnostic", target: "100% of groups can access", timeframe: "3 months" },
        { metric: "Parent communication channel established", baseline: "Assess", target: "Monthly safeguarding update to parents", timeframe: "Next term" },
      ],
      actions: [
        "Confirm DSL appointment is documented, communicated, and displayed",
        "Review and update anti-bullying policy against LOPIVI / Convivèxit requirements",
        "Audit reporting system accessibility for pupils, staff, and parents",
        "Set up termly parent safeguarding newsletter",
      ],
    },
  };

  const priorities: Array<{
    rank: number;
    category: string;
    overallAvg: number;
    urgency: string;
    rationale: string;
    kpis: Array<{ metric: string; baseline: string; target: string; timeframe: string }>;
    suggestedActions: string[];
    perceptionGap: number | null;
  }> = [];

  for (const c of categories) {
    const allAvgs = Object.values(c.averages);
    const overallAvg = allAvgs.reduce((a: number, b: number) => a + b, 0) / allAvgs.length;

    let perceptionGap: number | null = null;
    const groups = Object.keys(c.averages);
    if (groups.length >= 2) {
      const vals = Object.values(c.averages) as number[];
      perceptionGap = Math.round((Math.max(...vals) - Math.min(...vals)) * 10) / 10;
    }

    let urgency = "monitor";
    if (overallAvg <= 2.5) urgency = "critical";
    else if (overallAvg <= 3.2) urgency = "high";
    else if (overallAvg <= 3.8) urgency = "moderate";

    if (perceptionGap && perceptionGap >= 1.5 && urgency === "monitor") urgency = "moderate";
    if (perceptionGap && perceptionGap >= 1.5 && urgency === "moderate") urgency = "high";

    const kpiData = KPI_MAP[c.category] || { kpis: [], actions: [] };

    priorities.push({
      rank: 0,
      category: c.category,
      overallAvg: Math.round(overallAvg * 10) / 10,
      urgency,
      rationale: urgency === "critical"
        ? `Average score of ${overallAvg.toFixed(1)}/5 indicates significant gaps requiring immediate attention.`
        : urgency === "high"
          ? `Score of ${overallAvg.toFixed(1)}/5 ${perceptionGap && perceptionGap >= 1.5 ? `with a ${perceptionGap} point perception gap between groups` : ''} — this area would benefit from focused action this term.`
          : urgency === "moderate"
            ? `Score of ${overallAvg.toFixed(1)}/5 — solid foundation but room for improvement.`
            : `Score of ${overallAvg.toFixed(1)}/5 — a strength to maintain and celebrate.`,
      kpis: kpiData.kpis,
      suggestedActions: kpiData.actions,
      perceptionGap,
    });
  }

  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, monitor: 3 };
  priorities.sort((a, b) => {
    const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (diff !== 0) return diff;
    return a.overallAvg - b.overallAvg;
  });
  priorities.forEach((p, i) => { p.rank = i + 1; });

  const actions = await db.select()
    .from(diagnosticActionsTable)
    .where(eq(diagnosticActionsTable.surveyId, surveyId))
    .orderBy(diagnosticActionsTable.createdAt);

  res.json({
    survey,
    participation,
    categories,
    strengths,
    growthAreas,
    alignmentNotes,
    priorities,
    actions,
    totalResponses: responses.length,
    questionBank: QUESTION_BANK.map(q => ({ key: q.key, category: q.category })),
  });
});

router.patch("/diagnostics/:id", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { status } = req.body;
  if (!["active", "closed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db.update(diagnosticSurveysTable)
    .set({
      status,
      ...(status === "closed" ? { closedAt: new Date() } : {}),
    })
    .where(and(
      eq(diagnosticSurveysTable.id, req.params.id),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Survey not found" });
    return;
  }

  res.json(updated);
});

router.post("/diagnostics/:id/actions", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const surveyId = req.params.id;
  const { action, category, owner } = req.body;

  if (!action || typeof action !== "string" || action.trim().length === 0) {
    res.status(400).json({ error: "Action text is required" });
    return;
  }

  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.id, surveyId),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
    ));

  if (!survey) {
    res.status(404).json({ error: "Survey not found" });
    return;
  }

  const [newAction] = await db.insert(diagnosticActionsTable).values({
    surveyId,
    schoolId: user.schoolId,
    action: action.trim(),
    category: category || null,
    owner: owner || null,
    status: "planned",
  }).returning();

  res.status(201).json(newAction);
});

router.patch("/diagnostics/:id/actions/:actionId", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { action, category, owner, status } = req.body;
  const updates: any = {};
  if (action !== undefined) updates.action = action;
  if (category !== undefined) updates.category = category;
  if (owner !== undefined) updates.owner = owner;
  if (status !== undefined) updates.status = status;

  const [updated] = await db.update(diagnosticActionsTable)
    .set(updates)
    .where(and(
      eq(diagnosticActionsTable.id, req.params.actionId),
      eq(diagnosticActionsTable.surveyId, req.params.id),
      eq(diagnosticActionsTable.schoolId, user.schoolId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Action not found" });
    return;
  }

  res.json(updated);
});

router.delete("/diagnostics/:id/actions/:actionId", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const deleted = await db.delete(diagnosticActionsTable)
    .where(and(
      eq(diagnosticActionsTable.id, req.params.actionId),
      eq(diagnosticActionsTable.surveyId, req.params.id),
      eq(diagnosticActionsTable.schoolId, user.schoolId),
    ))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Action not found" });
    return;
  }

  res.json({ success: true });
});

router.post("/diagnostics/:id/actions/publish", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const surveyId = req.params.id;
  const now = new Date();

  const updated = await db.update(diagnosticActionsTable)
    .set({ publishedAt: now })
    .where(and(
      eq(diagnosticActionsTable.surveyId, surveyId),
      eq(diagnosticActionsTable.schoolId, user.schoolId),
    ))
    .returning();

  res.json({ published: updated.length });
});

router.post("/diagnostics/:id/seed-demo", authMiddleware, async (req: Request, res: Response) => {
  const IS_DEMO = process.env.NODE_ENV !== "production";
  if (!IS_DEMO) {
    res.status(403).json({ error: "Demo seeding is only available in development mode" });
    return;
  }

  const user = (req as any).user;
  if (!["coordinator", "head_teacher"].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const surveyId = req.params.id;
  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.id, surveyId),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
    ));

  if (!survey) {
    res.status(404).json({ error: "Survey not found" });
    return;
  }

  const schoolUsers = await db.select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.schoolId, user.schoolId));

  const profilesByGroup: Record<string, Record<string, { mean: number; spread: number }>> = {
    pupil: {
      "Awareness & Prevalence": { mean: 3.2, spread: 1.2 },
      "Trust & Reporting": { mean: 2.4, spread: 1.0 },
      "Culture & Wellbeing": { mean: 3.8, spread: 0.8 },
      "Safeguarding Knowledge": { mean: 2.8, spread: 1.1 },
      "System Readiness": { mean: 3.0, spread: 1.0 },
    },
    staff: {
      "Awareness & Prevalence": { mean: 4.1, spread: 0.6 },
      "Trust & Reporting": { mean: 3.9, spread: 0.7 },
      "Culture & Wellbeing": { mean: 3.5, spread: 0.9 },
      "Safeguarding Knowledge": { mean: 4.2, spread: 0.5 },
      "System Readiness": { mean: 3.3, spread: 1.0 },
    },
    parent: {
      "Awareness & Prevalence": { mean: 3.0, spread: 1.0 },
      "Trust & Reporting": { mean: 2.9, spread: 1.1 },
      "Culture & Wellbeing": { mean: 3.6, spread: 0.8 },
      "Safeguarding Knowledge": { mean: 2.3, spread: 0.9 },
      "System Readiness": { mean: 3.0, spread: 1.0 },
    },
  };

  function clampScore(mean: number, spread: number): number {
    const raw = mean + (Math.random() - 0.5) * 2 * spread;
    return Math.max(1, Math.min(5, Math.round(raw)));
  }

  const rows: Array<{
    surveyId: string;
    userId: string;
    questionKey: string;
    answer: number;
    comment: string | null;
  }> = [];

  for (const u of schoolUsers) {
    const group = getRoleGroup(u.role);
    const questions = getQuestionsForRole(u.role);
    const profile = profilesByGroup[group];
    if (!profile) continue;

    for (const q of questions) {
      const catProfile = profile[q.category] || { mean: 3.0, spread: 1.0 };
      rows.push({
        surveyId,
        userId: u.id,
        questionKey: q.key,
        answer: clampScore(catProfile.mean, catProfile.spread),
        comment: null,
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(diagnosticResponsesTable)
      .where(eq(diagnosticResponsesTable.surveyId, surveyId));

    if (rows.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await tx.insert(diagnosticResponsesTable).values(rows.slice(i, i + BATCH_SIZE));
      }
    }
  });

  res.json({ success: true, responsesSeeded: rows.length, usersIncluded: schoolUsers.length });
});

router.get("/diagnostics/:id/actions", authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const surveyId = req.params.id;

  const [survey] = await db.select()
    .from(diagnosticSurveysTable)
    .where(and(
      eq(diagnosticSurveysTable.id, surveyId),
      eq(diagnosticSurveysTable.schoolId, user.schoolId),
    ));

  if (!survey) {
    res.status(404).json({ error: "Survey not found" });
    return;
  }

  const allActions = await db.select()
    .from(diagnosticActionsTable)
    .where(eq(diagnosticActionsTable.surveyId, surveyId))
    .orderBy(diagnosticActionsTable.createdAt);

  const isLeadership = ["coordinator", "head_teacher"].includes(user.role);
  const publishedActions = allActions.filter(a => a.publishedAt !== null);

  res.json({
    actions: isLeadership ? allActions : publishedActions,
    isPublished: publishedActions.length > 0,
    surveyTitle: survey.title,
  });
});

export default router;

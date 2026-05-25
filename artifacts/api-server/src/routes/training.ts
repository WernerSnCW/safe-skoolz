import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, trainingCompletionsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const STAFF_ROLES = ["coordinator", "head_teacher", "teacher", "head_of_year", "senco", "support_staff"];
const TRAINING_ROLES = ["coordinator", "head_teacher", "teacher", "head_of_year", "senco", "support_staff", "parent"];

const MODULE_IDS = [
  "loggingIncident",
  "assessingIncident",
  "managingPupilPins",
  "behaviourPoints",
  "respondingToMessages",
  "understandingAlerts",
  "managingProtocols",
  "sencoCaseload",
  "dashboardOverview",
] as const;

export { MODULE_IDS };

const router: IRouter = Router();

router.get("/training/status", authMiddleware, requireRole(...TRAINING_ROLES), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const completions = await db
    .select({
      moduleId: trainingCompletionsTable.moduleId,
      completedAt: trainingCompletionsTable.completedAt,
    })
    .from(trainingCompletionsTable)
    .where(eq(trainingCompletionsTable.userId, user.userId));

  res.json(completions);
});

router.get("/training/staff-status", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const staffUsers = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(and(
      eq(usersTable.schoolId, user.schoolId),
      inArray(usersTable.role, STAFF_ROLES),
    ));

  const staffIds = staffUsers.map(u => u.id);

  let completions: { userId: string; moduleId: string; completedAt: Date }[] = [];
  if (staffIds.length > 0) {
    completions = await db
      .select({
        userId: trainingCompletionsTable.userId,
        moduleId: trainingCompletionsTable.moduleId,
        completedAt: trainingCompletionsTable.completedAt,
      })
      .from(trainingCompletionsTable)
      .where(and(
        eq(trainingCompletionsTable.schoolId, user.schoolId),
        inArray(trainingCompletionsTable.userId, staffIds),
      ));
  }

  const completionsByUser: Record<string, { moduleId: string; completedAt: string }[]> = {};
  for (const c of completions) {
    if (!completionsByUser[c.userId]) completionsByUser[c.userId] = [];
    completionsByUser[c.userId].push({ moduleId: c.moduleId, completedAt: c.completedAt.toISOString() });
  }

  const result = staffUsers.map(u => ({
    userId: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    completions: completionsByUser[u.id] || [],
  }));

  res.json(result);
});

router.post("/training/complete/:moduleId", authMiddleware, requireRole(...TRAINING_ROLES), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const moduleId = String(req.params.moduleId);

  if (!MODULE_IDS.includes(moduleId as any)) {
    res.status(400).json({ error: `Unknown module ID: ${moduleId}` });
    return;
  }

  const [existing] = await db
    .select()
    .from(trainingCompletionsTable)
    .where(and(
      eq(trainingCompletionsTable.userId, user.userId),
      eq(trainingCompletionsTable.moduleId, moduleId),
    ));

  if (existing) {
    res.json({ moduleId, completedAt: existing.completedAt.toISOString(), alreadyCompleted: true });
    return;
  }

  const [record] = await db
    .insert(trainingCompletionsTable)
    .values({
      schoolId: user.schoolId,
      userId: user.userId,
      moduleId,
    })
    .onConflictDoNothing()
    .returning();

  if (record) {
    await writeAudit({
      schoolId: user.schoolId,
      eventType: "training_module_completed",
      actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
      targetType: "training",
      targetId: record.id,
      details: { moduleId },
      req,
    });

    res.json({ moduleId, completedAt: record.completedAt.toISOString(), alreadyCompleted: false });
  } else {
    const [fallback] = await db
      .select()
      .from(trainingCompletionsTable)
      .where(and(
        eq(trainingCompletionsTable.userId, user.userId),
        eq(trainingCompletionsTable.moduleId, moduleId),
      ));
    res.json({ moduleId, completedAt: fallback?.completedAt?.toISOString() || new Date().toISOString(), alreadyCompleted: true });
  }
});

export default router;

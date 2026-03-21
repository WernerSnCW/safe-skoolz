import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, behaviourPointsTable, usersTable, BEHAVIOUR_LEVELS, POINT_CATEGORIES, getLevelForPoints } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

const STAFF_ROLES = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff"];

router.get("/behaviour/levels", (_req, res): void => {
  const levels = BEHAVIOUR_LEVELS.map(l => ({
    ...l,
    maxPoints: l.maxPoints === Infinity ? null : l.maxPoints,
  }));
  res.json({ levels, categories: POINT_CATEGORIES });
});

router.get("/behaviour/pupil/:pupilId", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { pupilId } = req.params;

  if (user.role === "pupil" && user.userId !== pupilId) {
    res.status(403).json({ error: "You can only view your own behaviour record" });
    return;
  }

  if (user.role === "parent") {
    const [parentUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
    if (!parentUser?.parentOf?.includes(pupilId)) {
      res.status(403).json({ error: "You can only view your child's behaviour record" });
      return;
    }
  }

  if (!["pupil", "parent", ...STAFF_ROLES].includes(user.role)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [pupil] = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    yearGroup: usersTable.yearGroup, className: usersTable.className,
  }).from(usersTable).where(and(eq(usersTable.id, pupilId), eq(usersTable.schoolId, user.schoolId)));

  if (!pupil) { res.status(404).json({ error: "Pupil not found" }); return; }

  const points = await db.select().from(behaviourPointsTable)
    .where(and(eq(behaviourPointsTable.pupilId, pupilId), eq(behaviourPointsTable.schoolId, user.schoolId)))
    .orderBy(desc(behaviourPointsTable.issuedAt));

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
  const level = getLevelForPoints(totalPoints);

  const staffIds = [...new Set(points.map(p => p.issuedBy))];
  let staffNames: Record<string, string> = {};
  if (staffIds.length > 0) {
    const staffRows = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(inArray(usersTable.id, staffIds));
    for (const s of staffRows) staffNames[s.id] = `${s.firstName} ${s.lastName}`;
  }

  const history = points.map(p => ({
    id: p.id,
    points: p.points,
    reason: p.reason,
    category: p.category,
    note: p.note,
    issuedBy: staffNames[p.issuedBy] || "Staff",
    issuedAt: p.issuedAt.toISOString(),
  }));

  res.json({
    pupil,
    totalPoints,
    level: { level: level.level, name: level.name, color: level.color, description: level.description },
    nextLevel: level.level < BEHAVIOUR_LEVELS.length ? { ...BEHAVIOUR_LEVELS[level.level], maxPoints: BEHAVIOUR_LEVELS[level.level].maxPoints === Infinity ? null : BEHAVIOUR_LEVELS[level.level].maxPoints } : null,
    pointsToNextLevel: level.maxPoints === Infinity ? null : level.maxPoints - totalPoints + 1,
    history,
  });
});

router.get("/behaviour/summary", authMiddleware, requireRole(...STAFF_ROLES), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const rows = await db.select({
    pupilId: behaviourPointsTable.pupilId,
    total: sql<number>`cast(sum(${behaviourPointsTable.points}) as int)`,
  }).from(behaviourPointsTable)
    .where(eq(behaviourPointsTable.schoolId, user.schoolId))
    .groupBy(behaviourPointsTable.pupilId);

  const pupilIds = rows.map(r => r.pupilId);
  let pupils: Record<string, any> = {};
  if (pupilIds.length > 0) {
    const pupilRows = await db.select({
      id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
      yearGroup: usersTable.yearGroup, className: usersTable.className,
    }).from(usersTable).where(inArray(usersTable.id, pupilIds));
    for (const p of pupilRows) pupils[p.id] = p;
  }

  const summary = rows
    .map(r => ({
      pupilId: r.pupilId,
      pupil: pupils[r.pupilId] || null,
      totalPoints: r.total,
      level: getLevelForPoints(r.total),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  res.json(summary);
});

router.post("/behaviour/points", authMiddleware, requireRole(...STAFF_ROLES), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { pupilId, points, reason, category, incidentId, note } = req.body;

  if (!pupilId || !points || !reason || !category) {
    res.status(400).json({ error: "pupilId, points, reason, and category are required" });
    return;
  }

  if (typeof points !== "number" || points < 1 || points > 10) {
    res.status(400).json({ error: "Points must be between 1 and 10" });
    return;
  }

  const [pupil] = await db.select().from(usersTable).where(
    and(eq(usersTable.id, pupilId), eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"))
  );
  if (!pupil) { res.status(404).json({ error: "Pupil not found" }); return; }

  const [entry] = await db.insert(behaviourPointsTable).values({
    schoolId: user.schoolId,
    pupilId,
    points,
    reason,
    category,
    incidentId: incidentId || null,
    issuedBy: user.userId,
    note: note || null,
  }).returning();

  const allPoints = await db.select({
    total: sql<number>`cast(sum(${behaviourPointsTable.points}) as int)`,
  }).from(behaviourPointsTable)
    .where(and(eq(behaviourPointsTable.pupilId, pupilId), eq(behaviourPointsTable.schoolId, user.schoolId)));

  const totalPoints = allPoints[0]?.total || 0;
  const level = getLevelForPoints(totalPoints);

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "behaviour_points_issued",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "behaviour_points",
    targetId: entry.id,
    details: { pupilId, points, category, totalPoints, level: level.level },
    req,
  });

  res.status(201).json({
    entry,
    totalPoints,
    level: { level: level.level, name: level.name, color: level.color, description: level.description },
  });
});

router.get("/behaviour/my-record", authMiddleware, requireRole("pupil"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const points = await db.select().from(behaviourPointsTable)
    .where(and(eq(behaviourPointsTable.pupilId, user.userId), eq(behaviourPointsTable.schoolId, user.schoolId)))
    .orderBy(desc(behaviourPointsTable.issuedAt));

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
  const level = getLevelForPoints(totalPoints);

  res.json({
    totalPoints,
    level: { level: level.level, name: level.name, color: level.color, description: level.description },
    nextLevel: level.level < BEHAVIOUR_LEVELS.length ? { ...BEHAVIOUR_LEVELS[level.level], maxPoints: BEHAVIOUR_LEVELS[level.level].maxPoints === Infinity ? null : BEHAVIOUR_LEVELS[level.level].maxPoints } : null,
    pointsToNextLevel: level.maxPoints === Infinity ? null : level.maxPoints - totalPoints + 1,
    recentHistory: points.slice(0, 10).map(p => ({
      id: p.id,
      points: p.points,
      reason: p.reason,
      category: p.category,
      issuedAt: p.issuedAt.toISOString(),
    })),
  });
});

export default router;

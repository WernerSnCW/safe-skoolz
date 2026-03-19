import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, sencoCaseloadTable, sencoTrackingTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/senco/caseload", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const entries = await db.select().from(sencoCaseloadTable)
    .where(and(eq(sencoCaseloadTable.schoolId, user.schoolId), eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.active, true)))
    .orderBy(desc(sencoCaseloadTable.addedAt));

  const pupilIds = entries.map(e => e.pupilId);
  let pupils: Record<string, any> = {};
  if (pupilIds.length > 0) {
    const pupilRows = await db.select({
      id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
      yearGroup: usersTable.yearGroup, className: usersTable.className,
    }).from(usersTable).where(inArray(usersTable.id, pupilIds));
    for (const p of pupilRows) pupils[p.id] = p;
  }

  const caseloadIds = entries.map(e => e.id);
  let latestTracking: Record<string, any> = {};
  if (caseloadIds.length > 0) {
    const allTracking = await db.select().from(sencoTrackingTable)
      .where(inArray(sencoTrackingTable.caseloadId, caseloadIds))
      .orderBy(desc(sencoTrackingTable.recordedAt));

    for (const t of allTracking) {
      if (!latestTracking[t.caseloadId]) latestTracking[t.caseloadId] = t;
    }
  }

  const result = entries.map(e => ({
    id: e.id,
    pupilId: e.pupilId,
    reason: e.reason,
    addedAt: e.addedAt.toISOString(),
    pupil: pupils[e.pupilId] || null,
    latestTracking: latestTracking[e.id] ? {
      recordedAt: latestTracking[e.id].recordedAt.toISOString(),
      progressRating: latestTracking[e.id].progressRating,
      feelingsRating: latestTracking[e.id].feelingsRating,
      attitudeToLearning: latestTracking[e.id].attitudeToLearning,
      attitudeToOthers: latestTracking[e.id].attitudeToOthers,
      notes: latestTracking[e.id].notes,
    } : null,
  }));

  res.json(result);
});

router.post("/senco/caseload", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { pupilId, reason } = req.body;

  if (!pupilId) { res.status(400).json({ error: "pupilId is required" }); return; }

  const [pupil] = await db.select().from(usersTable).where(
    and(eq(usersTable.id, pupilId), eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"))
  );
  if (!pupil) { res.status(404).json({ error: "Pupil not found" }); return; }

  const existing = await db.select().from(sencoCaseloadTable).where(
    and(eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.pupilId, pupilId), eq(sencoCaseloadTable.active, true))
  );
  if (existing.length > 0) { res.status(409).json({ error: "Pupil already on your caseload" }); return; }

  const [entry] = await db.insert(sencoCaseloadTable).values({
    schoolId: user.schoolId,
    sencoId: user.userId,
    pupilId,
    reason: reason || null,
  }).returning();

  res.status(201).json(entry);
});

router.delete("/senco/caseload/:id", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;

  await db.update(sencoCaseloadTable)
    .set({ active: false })
    .where(and(eq(sencoCaseloadTable.id, id), eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.schoolId, user.schoolId)));

  res.json({ success: true });
});

router.get("/senco/caseload/:id/tracking", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;

  const [entry] = await db.select().from(sencoCaseloadTable).where(
    and(eq(sencoCaseloadTable.id, id), eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.schoolId, user.schoolId), eq(sencoCaseloadTable.active, true))
  );
  if (!entry) { res.status(404).json({ error: "Caseload entry not found" }); return; }

  const tracking = await db.select().from(sencoTrackingTable)
    .where(eq(sencoTrackingTable.caseloadId, id))
    .orderBy(desc(sencoTrackingTable.recordedAt));

  res.json(tracking.map(t => ({
    ...t,
    recordedAt: t.recordedAt.toISOString(),
  })));
});

router.post("/senco/caseload/:id/tracking", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { id } = req.params;
  const { progressRating, feelingsRating, attitudeToLearning, attitudeToOthers, notes } = req.body;

  const [entry] = await db.select().from(sencoCaseloadTable).where(
    and(eq(sencoCaseloadTable.id, id), eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.schoolId, user.schoolId), eq(sencoCaseloadTable.active, true))
  );
  if (!entry) { res.status(404).json({ error: "Caseload entry not found" }); return; }

  const [record] = await db.insert(sencoTrackingTable).values({
    schoolId: user.schoolId,
    caseloadId: id,
    pupilId: entry.pupilId,
    recordedBy: user.userId,
    progressRating: progressRating ?? null,
    feelingsRating: feelingsRating ?? null,
    attitudeToLearning: attitudeToLearning ?? null,
    attitudeToOthers: attitudeToOthers ?? null,
    notes: notes || null,
  }).returning();

  res.status(201).json({ ...record, recordedAt: record.recordedAt.toISOString() });
});

router.get("/senco/pupils-available", authMiddleware, requireRole("senco"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const existing = await db.select({ pupilId: sencoCaseloadTable.pupilId }).from(sencoCaseloadTable)
    .where(and(eq(sencoCaseloadTable.sencoId, user.userId), eq(sencoCaseloadTable.active, true)));
  const existingIds = existing.map(e => e.pupilId);

  const allPupils = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    yearGroup: usersTable.yearGroup, className: usersTable.className,
  }).from(usersTable).where(
    and(eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"), eq(usersTable.active, true))
  );

  const available = allPupils.filter(p => !existingIds.includes(p.id));
  res.json(available);
});

export default router;

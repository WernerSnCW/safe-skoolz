import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, voiceConcernsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();
const EXEC = requireRole("pta", "coordinator", "head_teacher");

router.post("/concerns", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) { res.status(400).json({ error: "Please describe your concern." }); return; }
  if (body.length > 5000) { res.status(400).json({ error: "Too long." }); return; }
  const [row] = await db.insert(voiceConcernsTable).values({ schoolId: u.schoolId, userId: u.userId, body }).returning({ id: voiceConcernsTable.id });
  res.status(201).json({ id: row.id });
});

router.get("/concerns", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const rows = await db.select({
    id: voiceConcernsTable.id, body: voiceConcernsTable.body, status: voiceConcernsTable.status,
    createdAt: voiceConcernsTable.createdAt, firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(voiceConcernsTable).innerJoin(usersTable, eq(usersTable.id, voiceConcernsTable.userId))
    .where(eq(voiceConcernsTable.schoolId, u.schoolId)).orderBy(desc(voiceConcernsTable.createdAt));
  res.json({ concerns: rows });
});

router.post("/concerns/:id/status", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const { id } = req.params;
  const status = req.body?.status;
  if (!["pending", "reviewed", "actioned", "dismissed"].includes(status)) { res.status(400).json({ error: "Invalid status." }); return; }
  const [row] = await db.select({ id: voiceConcernsTable.id }).from(voiceConcernsTable)
    .where(and(eq(voiceConcernsTable.id, id), eq(voiceConcernsTable.schoolId, u.schoolId)));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(voiceConcernsTable).set({ status }).where(eq(voiceConcernsTable.id, id));
  await writeAudit({ schoolId: u.schoolId, eventType: "concern_triaged", actor: u, targetType: "voice_concern", targetId: id, details: { status }, req });
  res.json({ ok: true });
});

export default router;

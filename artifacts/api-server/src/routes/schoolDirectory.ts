import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, schoolsTable, voiceGroupsTable, schoolCreateRequestsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /schools/search?q= — public school finder (slug + whether it has a Vibes group).
router.get("/schools/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json({ schools: [] }); return; }
  const rows = await db.select({ slug: schoolsTable.slug, name: schoolsTable.name, id: schoolsTable.id })
    .from(schoolsTable).where(and(eq(schoolsTable.active, true), ilike(schoolsTable.name, `%${q}%`))).limit(20);
  const out: Array<{ slug: string | null; name: string; hasVibes: boolean }> = [];
  for (const s of rows) {
    const [v] = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, s.id), eq(voiceGroupsTable.status, "advocating")));
    out.push({ slug: s.slug, name: s.name, hasVibes: v != null });
  }
  res.json({ schools: out });
});

// POST /schools/create-request — queue a "create a Vibes for my school" request.
router.post("/schools/create-request", async (req, res): Promise<void> => {
  const schoolName = typeof req.body?.schoolName === "string" ? req.body.schoolName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 1000) : null;
  if (!schoolName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "School name and a valid email are required." }); return; }
  await db.insert(schoolCreateRequestsTable).values({ schoolName: schoolName.slice(0, 255), requestedByEmail: email, note });
  res.status(201).json({ ok: true });
});

export default router;

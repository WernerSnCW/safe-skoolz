import { Router, type IRouter } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, schoolsTable, voiceGroupsTable, voiceMembersTable } from "@workspace/db";

const router: IRouter = Router();

// Public summary for the tenant's Vibes front door — school name, the Vibes group's
// mission, and the live join count. No auth, no internal ids leaked.
router.get("/join/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, slug), eq(schoolsTable.active, true)));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const [voice] = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
  let joinCount = 0;
  if (voice) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` })
      .from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, voice.id));
    joinCount = n;
  }

  res.json({
    schoolName: school.name,
    voiceName: voice?.name ?? `${school.name} Vibes`,
    mission: voice?.mission ?? null,
    joinCount,
    hasVibes: voice != null,
  });
});

export default router;

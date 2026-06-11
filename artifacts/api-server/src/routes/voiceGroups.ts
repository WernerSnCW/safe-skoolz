import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  voiceGroupsTable,
  voiceMembersTable,
  ptaMembersTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

/**
 * VOICE — parent advocacy collectives (Slice 1: create / list / join / leave).
 *
 * A VOICE is the on-ramp to the PTA: parents form a collective around a mission
 * (get the school to adopt VBE), and membership is backing. Conversion into PTA
 * membership is Slice 2 (POST /voice/:id/convert), not built here.
 *
 * Like ptaGovernance, this is NOT behind ptaPiiMiddleware — these are adult
 * parents who opted into a public, visible ask, so names ARE shown. Permissions:
 * parents (and pta members, who are also parents) may create/join/leave; school
 * leadership may view for oversight.
 */
const router: IRouter = Router();

// Create / join / leave: parents drive advocacy. pta users are parents too.
const ADVOCATE = requireRole("parent", "pta");
// View the collectives: advocates + leadership oversight.
const VIEW = requireRole("parent", "pta", "coordinator", "head_teacher");
// Convert a VOICE into PTA membership: the PTA itself + school leadership.
const CONVERT = requireRole("pta", "coordinator", "head_teacher");

// On conversion, the founder takes on more responsibility (senior_group); the
// rest fold in as general_membership. (Spec: founders → senior_group.)
const TIER_FOR_ROLE: Record<string, string> = {
  founder: "senior_group",
  member: "general_membership",
};

function user(req: any): JwtPayload {
  return req.user as JwtPayload;
}

// Shared: member counts per voice for a set of voice ids.
async function memberCounts(voiceIds: string[]): Promise<Record<string, number>> {
  if (!voiceIds.length) return {};
  const rows = await db
    .select({ voiceId: voiceMembersTable.voiceId, count: sql<number>`count(*)::int` })
    .from(voiceMembersTable)
    .where(inArray(voiceMembersTable.voiceId, voiceIds))
    .groupBy(voiceMembersTable.voiceId);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.voiceId] = r.count;
  return out;
}

// GET /voice — list the school's VOICEs with member counts, status, and whether
// the current user is a member.
router.get("/voice", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const groups = await db
    .select({
      id: voiceGroupsTable.id,
      name: voiceGroupsTable.name,
      mission: voiceGroupsTable.mission,
      status: voiceGroupsTable.status,
      createdAt: voiceGroupsTable.createdAt,
      convertedAt: voiceGroupsTable.convertedAt,
      createdByFirst: usersTable.firstName,
      createdByLast: usersTable.lastName,
    })
    .from(voiceGroupsTable)
    .innerJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))
    .where(eq(voiceGroupsTable.schoolId, u.schoolId))
    .orderBy(desc(voiceGroupsTable.createdAt));

  const ids = groups.map((g) => g.id);
  const counts = await memberCounts(ids);
  const mine = ids.length
    ? await db
        .select({ voiceId: voiceMembersTable.voiceId, role: voiceMembersTable.role })
        .from(voiceMembersTable)
        .where(and(inArray(voiceMembersTable.voiceId, ids), eq(voiceMembersTable.userId, u.userId)))
    : [];
  const myRoleByVoice: Record<string, string> = {};
  for (const m of mine) myRoleByVoice[m.voiceId] = m.role;

  res.json({
    voices: groups.map((g) => ({
      id: g.id,
      name: g.name,
      mission: g.mission,
      status: g.status,
      createdAt: g.createdAt,
      convertedAt: g.convertedAt,
      createdBy: `${g.createdByFirst} ${g.createdByLast}`.trim(),
      memberCount: counts[g.id] ?? 0,
      myRole: myRoleByVoice[g.id] ?? null,
    })),
  });
});

// POST /voice — create a VOICE. Body: { name, mission }. Creator becomes founder + first member.
router.post("/voice", authMiddleware, ADVOCATE, async (req, res): Promise<void> => {
  const u = user(req);
  const { name, mission } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (!mission || typeof mission !== "string" || !mission.trim()) { res.status(400).json({ error: "mission is required" }); return; }

  const [voice] = await db.insert(voiceGroupsTable)
    .values({ schoolId: u.schoolId, name: name.trim(), mission: mission.trim(), createdById: u.userId })
    .returning();

  // Creator is the founder and the first backer.
  await db.insert(voiceMembersTable)
    .values({ voiceId: voice.id, userId: u.userId, role: "founder" });

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_created", actor: u, targetType: "voice_group", targetId: voice.id, details: { name: name.trim() }, req });
  res.status(201).json({ voice });
});

// GET /voice/:id — detail with members (names + roles) and count.
router.get("/voice/:id", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db
    .select({
      id: voiceGroupsTable.id,
      name: voiceGroupsTable.name,
      mission: voiceGroupsTable.mission,
      status: voiceGroupsTable.status,
      createdAt: voiceGroupsTable.createdAt,
      convertedAt: voiceGroupsTable.convertedAt,
      createdByFirst: usersTable.firstName,
      createdByLast: usersTable.lastName,
    })
    .from(voiceGroupsTable)
    .innerJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId)))
    .limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  const g = groups[0];

  const members = await db
    .select({
      id: voiceMembersTable.id,
      userId: voiceMembersTable.userId,
      role: voiceMembersTable.role,
      joinedAt: voiceMembersTable.joinedAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(voiceMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, voiceMembersTable.userId))
    .where(eq(voiceMembersTable.voiceId, id))
    .orderBy(desc(voiceMembersTable.role), voiceMembersTable.joinedAt);

  res.json({
    voice: {
      id: g.id,
      name: g.name,
      mission: g.mission,
      status: g.status,
      createdAt: g.createdAt,
      convertedAt: g.convertedAt,
      createdBy: `${g.createdByFirst} ${g.createdByLast}`.trim(),
      memberCount: members.length,
      myRole: members.find((m) => m.userId === u.userId)?.role ?? null,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        name: `${m.firstName} ${m.lastName}`.trim(),
      })),
    },
  });
});

// POST /voice/:id/join — back this VOICE (creates a voice_member). Idempotent.
router.post("/voice/:id/join", authMiddleware, ADVOCATE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db.select({ id: voiceGroupsTable.id, status: voiceGroupsTable.status }).from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  if (groups[0].status !== "advocating") { res.status(409).json({ error: "This VOICE is no longer advocating" }); return; }

  const dupe = await db.select({ id: voiceMembersTable.id }).from(voiceMembersTable)
    .where(and(eq(voiceMembersTable.voiceId, id), eq(voiceMembersTable.userId, u.userId))).limit(1);
  if (dupe.length) { res.status(409).json({ error: "You are already backing this VOICE" }); return; }

  const [member] = await db.insert(voiceMembersTable)
    .values({ voiceId: id, userId: u.userId, role: "member" }).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_joined", actor: u, targetType: "voice_group", targetId: id, details: {}, req });
  res.status(201).json({ member });
});

// POST /voice/:id/leave — withdraw backing. A founder cannot leave their own VOICE.
router.post("/voice/:id/leave", authMiddleware, ADVOCATE, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }

  const existing = await db.select({ id: voiceMembersTable.id, role: voiceMembersTable.role }).from(voiceMembersTable)
    .where(and(eq(voiceMembersTable.voiceId, id), eq(voiceMembersTable.userId, u.userId))).limit(1);
  if (!existing.length) { res.status(404).json({ error: "You are not backing this VOICE" }); return; }
  if (existing[0].role === "founder") { res.status(409).json({ error: "The founder cannot leave their own VOICE" }); return; }

  await db.delete(voiceMembersTable).where(eq(voiceMembersTable.id, existing[0].id));

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_left", actor: u, targetType: "voice_group", targetId: id, details: {}, req });
  res.json({ ok: true });
});

// POST /voice/:id/convert — the school has adopted VBE: fold this VOICE into the
// PTA. Each backer becomes a pta_member (founder → senior_group, members →
// general_membership); anyone already on the PTA roster is left as-is. The VOICE
// is marked converted. PTA / leadership only. Audited voice_converted.
router.post("/voice/:id/convert", authMiddleware, CONVERT, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  if (groups[0].status !== "advocating") { res.status(409).json({ error: "This VOICE has already been converted" }); return; }

  const backers = await db.select({ userId: voiceMembersTable.userId, role: voiceMembersTable.role })
    .from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, id));

  // Who's already on the PTA roster — don't duplicate or downgrade them.
  const existing = await db.select({ userId: ptaMembersTable.userId }).from(ptaMembersTable)
    .where(eq(ptaMembersTable.schoolId, u.schoolId));
  const alreadyPta = new Set(existing.map((e) => e.userId));

  const toAdd = backers
    .filter((b) => !alreadyPta.has(b.userId))
    .map((b) => ({
      schoolId: u.schoolId,
      userId: b.userId,
      tier: TIER_FOR_ROLE[b.role] ?? "general_membership",
      status: "active",
    }));

  let added = 0;
  if (toAdd.length) {
    const inserted = await db.insert(ptaMembersTable).values(toAdd).returning({ id: ptaMembersTable.id });
    added = inserted.length;
  }

  const [voice] = await db.update(voiceGroupsTable)
    .set({ status: "converted", convertedAt: sql`now()` })
    .where(eq(voiceGroupsTable.id, id)).returning();

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_converted", actor: u, targetType: "voice_group", targetId: id, details: { backers: backers.length, added, alreadyMembers: backers.length - added }, req });
  res.json({ voice, converted: { backers: backers.length, added, alreadyMembers: backers.length - added } });
});

export default router;

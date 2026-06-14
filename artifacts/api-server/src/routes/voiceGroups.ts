import { Router, type IRouter } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  voiceGroupsTable,
  voiceMembersTable,
  voiceSupportersTable,
  coalitionPathwayTable,
  collectiveSignalsTable,
  ptaMembersTable,
  ptaInitiativesTable,
  schoolsTable,
  usersTable,
} from "@workspace/db";
import { authMiddleware, requireRole, isExecOrOperator, type JwtPayload } from "../lib/auth";
import { effectiveStage, thresholdMet, legitimacyMetric, isPathwayComplete } from "../lib/pathway";
import { writeAudit } from "../lib/auditHelper";
import { isExecRole, memberDisplayName } from "../lib/memberDisplay";

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

// Chapter 2: load the pathway row for a VOICE scoped to the caller's school.
async function loadPathway(voiceId: string, schoolId: string) {
  const [row] = await db.select().from(coalitionPathwayTable)
    .where(and(eq(coalitionPathwayTable.voiceId, voiceId), eq(coalitionPathwayTable.schoolId, schoolId)));
  return row ?? null;
}

// Backer count + PTA-members-in-VOICE across BOTH backing tables.
async function backingStats(voiceId: string): Promise<{ backerCount: number; ptaMembersInVoice: number }> {
  const [m] = await db.select({
    n: sql<number>`count(*)::int`,
    pta: sql<number>`count(*) filter (where ${voiceMembersTable.wasPtaMember} = true)::int`,
  }).from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, voiceId));
  const [s] = await db.select({
    n: sql<number>`count(*)::int`,
    pta: sql<number>`count(*) filter (where ${voiceSupportersTable.wasPtaMember} = true)::int`,
  }).from(voiceSupportersTable).where(eq(voiceSupportersTable.voiceId, voiceId));
  return {
    backerCount: (m?.n ?? 0) + (s?.n ?? 0),
    ptaMembersInVoice: (m?.pta ?? 0) + (s?.pta ?? 0),
  };
}

// Assemble the full pathway view (shared by GET pathway + the action endpoints).
async function pathwayView(voiceRow: { id: string; status: string }, schoolId: string) {
  const [school] = await db.select({ signalThreshold: schoolsTable.signalThreshold }).from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  const pathway = await loadPathway(voiceRow.id, schoolId);
  if (!pathway) return null;
  const stats = await backingStats(voiceRow.id);
  const signalThreshold = school?.signalThreshold ?? 10;
  const signals = await db.select().from(collectiveSignalsTable)
    .where(eq(collectiveSignalsTable.voiceId, voiceRow.id)).orderBy(desc(collectiveSignalsTable.firedAt));

  const stage = effectiveStage({
    recordedStage: pathway.stage as any,
    backerCount: stats.backerCount,
    signalThreshold,
    signalFiredAt: pathway.signalFiredAt,
    ptaMotionOutcome: pathway.ptaMotionOutcome,
    schoolRecognisedAt: pathway.schoolRecognisedAt,
    voiceStatus: voiceRow.status,
  });
  const legitimacy = legitimacyMetric({
    backerCount: stats.backerCount,
    declaredIncumbent: pathway.incumbentPtaSize,
    ptaMembersInVoice: stats.ptaMembersInVoice,
  });
  return {
    voiceId: voiceRow.id,
    stage,
    backerCount: stats.backerCount,
    signalThreshold,
    thresholdMet: thresholdMet(stats.backerCount, signalThreshold),
    legitimacy: { ...legitimacy, incumbentConfirmedBySchoolAt: pathway.incumbentConfirmedBySchoolAt },
    signalFiredAt: pathway.signalFiredAt,
    ptaMotionOutcome: pathway.ptaMotionOutcome,
    schoolRecognisedAt: pathway.schoolRecognisedAt,
    complete: isPathwayComplete({ ptaMotionOutcome: pathway.ptaMotionOutcome, schoolRecognisedAt: pathway.schoolRecognisedAt, voiceStatus: voiceRow.status }),
    signals: signals.map((sg) => ({
      id: sg.id, firedAt: sg.firedAt, topics: sg.topics, memberCountAtFire: sg.memberCountAtFire,
      schoolResponseStatus: sg.schoolResponseStatus, schoolResponseText: sg.schoolResponseText, schoolRespondedAt: sg.schoolRespondedAt,
    })),
  };
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
      createdByDisplayMode: usersTable.displayMode,
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

  const viewerIsExec = isExecRole(u.role);
  res.json({
    voices: groups.map((g) => ({
      id: g.id,
      name: g.name,
      mission: g.mission,
      status: g.status,
      createdAt: g.createdAt,
      convertedAt: g.convertedAt,
      createdBy: memberDisplayName(
        { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
        viewerIsExec,
      ),
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
      createdByDisplayMode: usersTable.displayMode,
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
      displayMode: usersTable.displayMode,
    })
    .from(voiceMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, voiceMembersTable.userId))
    .where(eq(voiceMembersTable.voiceId, id))
    .orderBy(desc(voiceMembersTable.role), voiceMembersTable.joinedAt);

  const viewerIsExec = isExecRole(u.role);
  res.json({
    voice: {
      id: g.id,
      name: g.name,
      mission: g.mission,
      status: g.status,
      createdAt: g.createdAt,
      convertedAt: g.convertedAt,
      createdBy: memberDisplayName(
        { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
        viewerIsExec,
      ),
      memberCount: members.length,
      myRole: members.find((m) => m.userId === u.userId)?.role ?? null,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        name: memberDisplayName(
          { firstName: m.firstName, lastName: m.lastName, displayMode: m.displayMode },
          viewerIsExec,
        ),
      })),
    },
  });
});

// GET /voice/:id/pathway (spec §7) — the journey state for any VOICE member.
router.get("/voice/:id/pathway", authMiddleware, VIEW, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;
  const [voiceRow] = await db.select({ id: voiceGroupsTable.id, status: voiceGroupsTable.status })
    .from(voiceGroupsTable).where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId)));
  if (!voiceRow) { res.status(404).json({ error: "VOICE not found" }); return; }
  const view = await pathwayView(voiceRow, u.schoolId);
  if (!view) { res.status(404).json({ error: "Pathway not found" }); return; }
  res.json(view);
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

// POST /voice/:id/convert — fold this VOICE into the PTA (B2 merge). Gated on a
// claimed PTA (B1 adopt must have run). Each backer becomes a pta_member
// (founder → senior_group, members → general_membership); anyone already on the
// roster is left as-is. The VOICE's mission carries over as a pta_initiative
// linked via originVoiceId. Member inserts + initiative + status flip run in one
// transaction. PTA / leadership only. Audited voice_converted.
router.post("/voice/:id/convert", authMiddleware, CONVERT, async (req, res): Promise<void> => {
  const u = user(req);
  const { id } = req.params;

  const groups = await db.select().from(voiceGroupsTable)
    .where(and(eq(voiceGroupsTable.id, id), eq(voiceGroupsTable.schoolId, u.schoolId))).limit(1);
  if (!groups.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  const voiceRow = groups[0];

  // B2 claim gate: the PTA must be claimed (B1 adopt) before backers merge in.
  // This is the sole constitution path — convert never auto-claims.
  const [school] = await db.select({ ptaClaimedAt: schoolsTable.ptaClaimedAt })
    .from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  if (!school?.ptaClaimedAt) {
    res.status(409).json({ error: "Adopt the operating structure before merging the VOICE into the PTA." });
    return;
  }

  if (voiceRow.status !== "advocating") { res.status(409).json({ error: "This VOICE has already been converted" }); return; }

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
  let initiative: { id: string; title: string } = { id: "", title: "" };
  let voice: typeof voiceRow = voiceRow;

  await db.transaction(async (tx) => {
    if (toAdd.length) {
      const inserted = await tx.insert(ptaMembersTable).values(toAdd).returning({ id: ptaMembersTable.id });
      added = inserted.length;
    }

    // Carry the mission over as the PTA's first initiative — idempotent on originVoiceId.
    const existingInit = await tx.select({ id: ptaInitiativesTable.id, title: ptaInitiativesTable.title })
      .from(ptaInitiativesTable).where(eq(ptaInitiativesTable.originVoiceId, id)).limit(1);
    if (existingInit.length) {
      initiative = existingInit[0];
    } else {
      const [created] = await tx.insert(ptaInitiativesTable).values({
        schoolId: u.schoolId,
        title: voiceRow.name.slice(0, 255),
        summary: voiceRow.mission,
        status: "proposed",
        originVoiceId: id,
        ownerId: null,
        createdById: u.userId,
      }).returning({ id: ptaInitiativesTable.id, title: ptaInitiativesTable.title });
      initiative = created;
    }

    const [updated] = await tx.update(voiceGroupsTable)
      .set({ status: "converted", convertedAt: sql`now()` })
      .where(eq(voiceGroupsTable.id, id)).returning();
    voice = updated;
  });

  await writeAudit({ schoolId: u.schoolId, eventType: "voice_converted", actor: u, targetType: "voice_group", targetId: id, details: { backers: backers.length, added, alreadyMembers: backers.length - added, initiativeId: initiative.id }, req });
  res.json({ voice, converted: { backers: backers.length, added, alreadyMembers: backers.length - added }, initiative: { id: initiative.id, title: initiative.title } });
});

// --- Public (no auth) — the shareable VOICE page ---------------------------
// The VOICE id is the capability (unguessable uuid); these endpoints are how a
// VOICE link forwarded into a WhatsApp group works without a login wall.

// GET /voice/:id/public — what a cold visitor sees. Name, mission, who started
// it, status, and total backing (members + supporters). No auth, no school scope.
router.get("/voice/:id/public", async (req, res): Promise<void> => {
  const { id } = req.params;
  const rows = await db
    .select({
      id: voiceGroupsTable.id,
      name: voiceGroupsTable.name,
      mission: voiceGroupsTable.mission,
      status: voiceGroupsTable.status,
      createdByFirst: usersTable.firstName,
      createdByLast: usersTable.lastName,
      createdByDisplayMode: usersTable.displayMode,
    })
    .from(voiceGroupsTable)
    .leftJoin(usersTable, eq(usersTable.id, voiceGroupsTable.createdById))
    .where(eq(voiceGroupsTable.id, id))
    .limit(1);
  if (!rows.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  const g = rows[0];

  const [memberCount] = await db.select({ n: sql<number>`count(*)::int` })
    .from(voiceMembersTable).where(eq(voiceMembersTable.voiceId, id));
  const [supporterCount] = await db.select({ n: sql<number>`count(*)::int` })
    .from(voiceSupportersTable).where(eq(voiceSupportersTable.voiceId, id));

  res.json({
    id: g.id,
    name: g.name,
    mission: g.mission,
    status: g.status,
    startedBy: g.createdByFirst
      ? memberDisplayName(
          { firstName: g.createdByFirst, lastName: g.createdByLast, displayMode: g.createdByDisplayMode },
          false,
        )
      : null, // founder-less VOICE (no creator yet) — UI renders "the community"
    backerCount: (memberCount?.n ?? 0) + (supporterCount?.n ?? 0),
  });
});

// POST /voice/:id/support — "Add my voice" from the public page. Body: { name, email }.
// Records an anonymous supporter (no account). Idempotent per (voice, email).
router.post("/voice/:id/support", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { name, email } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Please add your name" }); return; }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { res.status(400).json({ error: "Please add a valid email" }); return; }

  const voice = await db.select({ id: voiceGroupsTable.id, schoolId: voiceGroupsTable.schoolId, status: voiceGroupsTable.status })
    .from(voiceGroupsTable).where(eq(voiceGroupsTable.id, id)).limit(1);
  if (!voice.length) { res.status(404).json({ error: "VOICE not found" }); return; }
  if (voice[0].status !== "advocating") { res.status(409).json({ error: "This VOICE is no longer gathering support" }); return; }

  const cleanEmail = email.trim().toLowerCase();
  const dupe = await db.select({ id: voiceSupportersTable.id }).from(voiceSupportersTable)
    .where(and(eq(voiceSupportersTable.voiceId, id), eq(voiceSupportersTable.email, cleanEmail))).limit(1);
  if (dupe.length) { res.json({ ok: true, alreadyBacking: true }); return; }

  await db.insert(voiceSupportersTable).values({ voiceId: id, name: name.trim(), email: cleanEmail });

  // School-scoped audit (the VOICE belongs to a school even though the backer is anon).
  await writeAudit({ schoolId: voice[0].schoolId, eventType: "voice_supported", targetType: "voice_group", targetId: id, details: { via: "public" }, req });
  res.status(201).json({ ok: true });
});

export default router;

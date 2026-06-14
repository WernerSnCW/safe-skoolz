import { Router, type IRouter } from "express";
import { eq, and, inArray, ilike, or, sql } from "drizzle-orm";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db, schoolsTable, voiceGroupsTable, usersTable, coalitionPathwayTable } from "@workspace/db";
import { authMiddleware, requireRole, requirePlatformOperator, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { tenantPublicView, resolveCapabilities, CAPABILITY_KEYS } from "../lib/tenant";
import { slugify, uniqueSlug } from "../lib/slugify";
import { PgRateLimitStore } from "../lib/rateLimitStore";
import bcrypt from "bcrypt";

const TEACHING_ROLES = ["teacher", "head_of_year"];
const ALL_STAFF_ROLES = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff"];

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Public, abuse-bounded create (spec §4.1). Keyed by IP since there is no auth.
const createSchoolLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many schools created from this connection. Please try again later." },
  store: new PgRateLimitStore("schools-create"),
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "anon"),
});

// POST /api/schools — find-or-start (spec §4.1). Creates the schools row + an
// advocating voice_groups row in ONE transaction. NO user is created here. The
// advocating VOICE is created FOUNDER-LESS (createdById = null); the founder is
// assigned when the creator signs up at /join/:slug — the first person to back a
// founder-less advocating VOICE becomes its founder (see auth.ts signup, Task 7).
// The contactName/contactEmail captured here are the SCHOOL/PTA contact for the
// verification loop (spec §1.2 — could be the school office), NOT the creator.
// Slug is derived from the name (slugify) with a collision suffix, or a
// creator-supplied editable slug. Capabilities are left {} so they resolve to the
// free community tier over CAPABILITY_DEFAULTS.
router.post("/schools", createSchoolLimiter, async (req, res): Promise<void> => {
  const { name, slug: rawSlug, coalitionName, contactName, contactEmail } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "A school name is required." });
    return;
  }
  const cleanName = name.trim().slice(0, 255);

  if (rawSlug != null && (typeof rawSlug !== "string" || !SLUG_RE.test(rawSlug) || rawSlug.length > 60)) {
    res.status(400).json({ error: "Slug must be lowercase letters, numbers and single hyphens." });
    return;
  }
  if (contactEmail != null && contactEmail !== "" && (typeof contactEmail !== "string" || !EMAIL_RE.test(contactEmail))) {
    res.status(400).json({ error: "Please enter a valid contact email." });
    return;
  }

  const slugExists = async (s: string): Promise<boolean> => {
    const [hit] = await db.select({ id: schoolsTable.id }).from(schoolsTable).where(eq(schoolsTable.slug, s));
    return hit != null;
  };

  let slug: string;
  if (rawSlug) {
    if (await slugExists(rawSlug)) {
      res.status(409).json({ error: "That web address is already taken — try another." });
      return;
    }
    slug = rawSlug;
  } else {
    slug = await uniqueSlug(slugify(cleanName), slugExists);
  }

  const voiceName =
    typeof coalitionName === "string" && coalitionName.trim() ? coalitionName.trim().slice(0, 255) : `${cleanName} Vibes`;

  const schoolContactEmail = (typeof contactEmail === "string" && contactEmail) ? contactEmail.toLowerCase().trim() : null;

  let result: { school: typeof schoolsTable.$inferSelect; voice: typeof voiceGroupsTable.$inferSelect };
  try {
    result = await db.transaction(async (tx) => {
      const [school] = await tx.insert(schoolsTable).values({
        name: cleanName,
        slug,
        displayName: cleanName,
        contactName: typeof contactName === "string" ? contactName.trim().slice(0, 255) || null : null,
        contactEmail: schoolContactEmail,
        // capabilities left {} -> resolves to the free community tier (spec §4.1).
      }).returning();

      const [voice] = await tx.insert(voiceGroupsTable).values({
        schoolId: school.id,
        name: voiceName,
        mission: `Parents of ${cleanName} asking the school and PTA to act.`,
        status: "advocating",
        createdById: null, // founder-less; set at /join/:slug signup (Task 7)
      }).returning();

      // Chapter 2 (spec §5): the coalition_pathway is created WITH the VOICE
      // (keys off voiceId/schoolId, no user needed). Starts at your_voice.
      await tx.insert(coalitionPathwayTable).values({
        voiceId: voice.id,
        schoolId: school.id,
        stage: "your_voice",
      });

      return { school, voice };
    });
  } catch (e: any) {
    const pgCode = e?.code ?? e?.cause?.code;
    if (pgCode === "23505") {
      // Slug uniqueness lost a race (the only unique constraint in play now that
      // no user is created) — surface a clean conflict.
      res.status(409).json({ error: "That school or web address already exists — try finding it instead." });
      return;
    }
    throw e;
  }

  await writeAudit({
    schoolId: result.school.id,
    eventType: "school_created",
    targetType: "school",
    targetId: result.school.id,
    details: { slug, voiceId: result.voice.id },
    req,
  }).catch(() => {});

  res.status(201).json({
    school: { ...tenantPublicView(result.school), id: result.school.id, contactName: result.school.contactName },
    voice: { id: result.voice.id, name: result.voice.name, status: result.voice.status },
  });
});

// PATCH /api/schools/:slug/capabilities (spec §4.6) — platform-operator only.
// Merges the provided overrides into schools.capabilities (stored as the sparse
// override map; defaults still resolve over CAPABILITY_DEFAULTS). Tenants are
// read-only and never reach this. Body: { capabilities: { <key>: boolean } }.
router.patch("/schools/:slug/capabilities", authMiddleware, requirePlatformOperator, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const incoming = req.body?.capabilities;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    res.status(400).json({ error: "capabilities object required." });
    return;
  }
  const valid = new Set<string>(CAPABILITY_KEYS as readonly string[]);
  const overrides: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!valid.has(k)) { res.status(400).json({ error: `Unknown capability: ${k}` }); return; }
    if (typeof v !== "boolean") { res.status(400).json({ error: `Capability ${k} must be boolean.` }); return; }
    overrides[k] = v;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.slug, slug));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const merged = { ...(school.capabilities && typeof school.capabilities === "object" ? school.capabilities as Record<string, boolean> : {}), ...overrides };
  const [updated] = await db.update(schoolsTable).set({ capabilities: merged }).where(eq(schoolsTable.id, school.id)).returning();

  await writeAudit({ schoolId: school.id, eventType: "capabilities_updated", actor: u, targetType: "school", targetId: school.id, details: { overrides }, req }).catch(() => {});
  res.json({ slug, capabilities: resolveCapabilities(updated.capabilities) });
});

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).where(eq(schoolsTable.active, true));
  res.json(
    schools.map((s) => ({
      id: s.id,
      name: s.name,
    }))
  );
});

router.get("/my-pupils", authMiddleware, requireRole("teacher", "head_of_year", "head_teacher", "coordinator", "senco", "support_staff"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let conditions: any[] = [
    eq(usersTable.schoolId, me.schoolId),
    eq(usersTable.role, "pupil"),
    eq(usersTable.active, true),
  ];

  if (me.role === "teacher") {
    if (!me.className) {
      res.json({ scope: "class", scopeLabel: "No class assigned", classes: {} });
      return;
    }
    conditions.push(eq(usersTable.className, me.className));
  } else if (me.role === "head_of_year") {
    if (!me.yearGroup) {
      res.json({ scope: "year", scopeLabel: "No year group assigned", classes: {} });
      return;
    }
    conditions.push(eq(usersTable.yearGroup, me.yearGroup));
  } else if (me.role === "support_staff") {
    if (me.className) {
      conditions.push(eq(usersTable.className, me.className));
    } else if (me.yearGroup) {
      conditions.push(eq(usersTable.yearGroup, me.yearGroup));
    }
  }

  const pupils = await db.select().from(usersTable).where(and(...conditions));

  let scope = "school";
  let scopeLabel = me.schoolId;
  if (me.role === "teacher") {
    scope = "class";
    scopeLabel = `Class ${me.className}`;
  } else if (me.role === "head_of_year") {
    scope = "year";
    scopeLabel = `Year ${me.yearGroup}`;
  } else if (me.role === "support_staff") {
    scope = me.className ? "class" : me.yearGroup ? "year" : "school";
    scopeLabel = me.className ? `Class ${me.className}` : me.yearGroup ? `Year ${me.yearGroup}` : "Whole School";
  } else {
    scope = "school";
    scopeLabel = "Whole School";
  }

  const grouped: Record<string, any[]> = {};
  for (const p of pupils) {
    const key = p.className || "Unassigned";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      yearGroup: p.yearGroup,
      className: p.className,
      avatarType: p.avatarType,
      avatarValue: p.avatarValue,
    });
  }

  res.json({ scope, scopeLabel, classes: grouped });
});

router.get("/schools/:schoolId/staff", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const schoolId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;

  if (user.schoolId !== schoolId) {
    res.status(403).json({ error: "Access denied: you can only view staff at your own school" });
    return;
  }

  const staff = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        inArray(usersTable.role, ALL_STAFF_ROLES),
        eq(usersTable.active, true)
      )
    );

  res.json(
    staff.map((u) => ({
      id: u.id,
      schoolId: u.schoolId,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      yearGroup: u.yearGroup,
      className: u.className,
      avatarType: u.avatarType,
      avatarValue: u.avatarValue,
      avatarImageUrl: u.avatarImageUrl,
      parentOf: u.parentOf || [],
      active: u.active,
      lastLogin: u.lastLogin?.toISOString() || null,
    }))
  );
});

router.post("/users/:id/avatar", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (user.userId !== id && user.role !== "coordinator") {
    res.status(403).json({ error: "Can only update your own avatar" });
    return;
  }

  const { avatarType, avatarValue } = req.body;
  if (!avatarType || !avatarValue) {
    res.status(400).json({ error: "avatarType and avatarValue required" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ avatarType, avatarValue })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    avatarType: updated.avatarType,
    avatarValue: updated.avatarValue,
    avatarImageUrl: updated.avatarImageUrl,
  });
});

router.get("/pupils/search", authMiddleware, requireRole(...ALL_STAFF_ROLES, "pupil"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const q = (req.query.q as string || "").trim();

  const conditions = [
    eq(usersTable.schoolId, user.schoolId),
    eq(usersTable.role, "pupil"),
  ];

  if (q.length >= 1) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        ilike(usersTable.firstName, searchPattern),
        ilike(usersTable.lastName, searchPattern),
        sql`concat(${usersTable.firstName}, ' ', ${usersTable.lastName}) ILIKE ${searchPattern}`
      )! 
    );
  }

  const baseQuery = db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      yearGroup: usersTable.yearGroup,
      className: usersTable.className,
    })
    .from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.firstName);

  const pupils = q.length >= 1 ? await baseQuery.limit(50) : await baseQuery;

  res.json(pupils);
});

const BCRYPT_ROUNDS = 12;

function generateRandomPin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  return pin;
}

router.post("/pupils/reset-pin/:pupilId", authMiddleware, requireRole("teacher", "head_of_year", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const pupilId = Array.isArray(req.params.pupilId) ? req.params.pupilId[0] : req.params.pupilId;

  const [pupil] = await db.select().from(usersTable).where(
    and(eq(usersTable.id, pupilId), eq(usersTable.schoolId, user.schoolId), eq(usersTable.role, "pupil"))
  );

  if (!pupil) {
    res.status(404).json({ error: "Pupil not found" });
    return;
  }

  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  if (me && (me.role === "teacher" || me.role === "head_of_year")) {
    if (me.role === "teacher" && me.className !== pupil.className) {
      res.status(403).json({ error: "You can only reset PINs for pupils in your class" });
      return;
    }
    if (me.role === "head_of_year" && me.yearGroup !== pupil.yearGroup) {
      res.status(403).json({ error: "You can only reset PINs for pupils in your year group" });
      return;
    }
  }

  const newPin = generateRandomPin();
  const pinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

  await db.update(usersTable).set({ pinHash, failedLoginAttempts: 0, lockedUntil: null }).where(eq(usersTable.id, pupilId));

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pin_reset",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    targetId: pupilId,
    details: { pupilName: `${pupil.firstName} ${pupil.lastName}` },
    req,
  });

  res.json({
    pupilId: pupil.id,
    firstName: pupil.firstName,
    lastName: pupil.lastName,
    newPin,
  });
});

router.post("/pupils/bulk-reset-pins", authMiddleware, requireRole("teacher", "head_of_year", "coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const { className, yearGroup } = req.body as { className?: string; yearGroup?: string };

  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let conditions: any[] = [
    eq(usersTable.schoolId, user.schoolId),
    eq(usersTable.role, "pupil"),
    eq(usersTable.active, true),
  ];

  if (me.role === "teacher") {
    if (!me.className) { res.status(400).json({ error: "No class assigned" }); return; }
    conditions.push(eq(usersTable.className, me.className));
  } else if (me.role === "head_of_year") {
    const targetClass = className;
    const targetYear = yearGroup || me.yearGroup;
    if (targetClass) {
      conditions.push(eq(usersTable.className, targetClass));
    } else if (targetYear) {
      conditions.push(eq(usersTable.yearGroup, targetYear));
    }
  } else {
    if (className) {
      conditions.push(eq(usersTable.className, className));
    } else if (yearGroup) {
      conditions.push(eq(usersTable.yearGroup, yearGroup));
    } else {
      res.status(400).json({ error: "Specify className or yearGroup" });
      return;
    }
  }

  const pupils = await db.select().from(usersTable).where(and(...conditions));

  const results = [];
  for (const pupil of pupils) {
    const newPin = generateRandomPin();
    const pinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    await db.update(usersTable).set({ pinHash, failedLoginAttempts: 0, lockedUntil: null }).where(eq(usersTable.id, pupil.id));
    results.push({
      pupilId: pupil.id,
      firstName: pupil.firstName,
      lastName: pupil.lastName,
      className: pupil.className,
      yearGroup: pupil.yearGroup,
      newPin,
    });
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "bulk_pin_reset",
    actor: { userId: user.userId, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    details: { count: results.length, className, yearGroup },
    req,
  });

  res.json({ count: results.length, pupils: results });
});

export default router;

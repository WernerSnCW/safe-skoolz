import { Router, type IRouter } from "express";
import { eq, and, inArray, ilike, or, sql } from "drizzle-orm";
import { db, schoolsTable, usersTable } from "@workspace/db";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import bcrypt from "bcrypt";

const TEACHING_ROLES = ["teacher", "head_of_year"];
const ALL_STAFF_ROLES = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff"];

const router: IRouter = Router();

router.get("/schools", authMiddleware, async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).where(eq(schoolsTable.active, true));
  res.json(
    schools.map((s) => ({
      id: s.id,
      name: s.name,
      legalEntity: s.legalEntity,
      cif: s.cif,
      address: s.address,
      country: s.country,
      region: s.region,
      active: s.active,
    }))
  );
});

router.get("/schools/:schoolId/pupils", authMiddleware, async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;
  const schoolId = Array.isArray(req.params.schoolId) ? req.params.schoolId[0] : req.params.schoolId;

  if (user.schoolId !== schoolId) {
    res.status(403).json({ error: "Access denied: cross-school access not permitted" });
    return;
  }

  const className = req.query.className as string | undefined;

  let conditions: any[] = [eq(usersTable.schoolId, schoolId), eq(usersTable.role, "pupil"), eq(usersTable.active, true)];
  if (className) {
    conditions.push(eq(usersTable.className, className));
  }

  const pupils = await db.select().from(usersTable).where(and(...conditions));

  res.json(
    pupils.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName ? p.lastName.charAt(0) + "." : "",
      yearGroup: p.yearGroup,
      className: p.className,
      avatarType: p.avatarType,
      avatarValue: p.avatarValue,
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

  const pupils = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      yearGroup: usersTable.yearGroup,
      className: usersTable.className,
    })
    .from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.firstName)
    .limit(15);

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

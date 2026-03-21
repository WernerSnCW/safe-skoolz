import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { PupilLoginBody, StaffLoginBody } from "@workspace/api-zod";
import { signToken, authMiddleware, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

const MAX_LOGIN_ATTEMPTS = 3;

router.post("/auth/pupil/login", async (req, res): Promise<void> => {
  const parsed = PupilLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { schoolId, pupilId, pin } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, pupilId), eq(usersTable.schoolId, schoolId), eq(usersTable.role, "pupil"), eq(usersTable.active, true)));

  if (!user || !user.pinHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    res.status(423).json({
      error: "Account locked",
      message: "Too many wrong attempts. Ask your teacher to reset your PIN.",
      locked: true,
    });
    return;
  }

  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: any = { failedLoginAttempts: newAttempts };
    const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date("2099-12-31");
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      res.status(423).json({
        error: "Account locked",
        message: "Too many wrong attempts. Ask your teacher to reset your PIN.",
        locked: true,
      });
    } else {
      res.status(401).json({
        error: "Wrong PIN",
        message: `That PIN wasn't right. You have ${remaining} ${remaining === 1 ? "try" : "tries"} left.`,
        attemptsRemaining: remaining,
      });
    }
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null }).where(eq(usersTable.id, user.id));

  const firstLogin = !user.lastLogin;
  const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "pupil_login",
    actor: { userId: user.id, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    targetId: user.id,
    req,
  });

  res.json({
    token,
    user: formatUser(user),
    firstLogin,
  });
});

router.post("/auth/staff/login", async (req, res): Promise<void> => {
  const parsed = StaffLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.active, true)));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff", "pta"].includes(user.role)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const firstLogin = !user.lastLogin;
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email || undefined });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "staff_login",
    actor: { userId: user.id, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    targetId: user.id,
    req,
  });

  res.json({
    token,
    user: formatUser(user),
    firstLogin,
  });
});

router.post("/auth/parent/login", async (req, res): Promise<void> => {
  const parsed = StaffLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.role, "parent"), eq(usersTable.active, true)));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const firstLogin = !user.lastLogin;
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email || undefined });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "parent_login",
    actor: { userId: user.id, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    targetId: user.id,
    req,
  });

  res.json({
    token,
    user: formatUser(user),
    firstLogin,
  });
});

router.patch("/auth/profile", authMiddleware, async (req, res): Promise<void> => {
  const jwtUser = (req as any).user as JwtPayload;
  const { firstName, lastName, email, avatarType, avatarValue } = req.body;

  const updates: Record<string, any> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (email !== undefined) updates.email = email;
  if (avatarType !== undefined) updates.avatarType = avatarType;
  if (avatarValue !== undefined) updates.avatarValue = avatarValue;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, jwtUser.userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await writeAudit({
    schoolId: jwtUser.schoolId,
    eventType: "profile_updated",
    actor: jwtUser,
    targetType: "user",
    targetId: jwtUser.userId,
    details: updates,
    req,
  });

  res.json(formatUser(updated));
});

router.post("/auth/demo-login", async (req, res): Promise<void> => {
  if (process.env.DEMO_MODE !== "true") {
    res.status(403).json({ error: "Demo login is disabled in this environment." });
    return;
  }

  const { role } = req.body;
  if (!role || !["pupil", "staff", "parent", "pta"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be pupil, staff, parent, or pta." });
    return;
  }

  let user;
  if (role === "pupil") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "pupil"), eq(usersTable.active, true)));
  } else if (role === "parent") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "parent"), eq(usersTable.active, true)));
  } else if (role === "pta") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "pta"), eq(usersTable.active, true)));
  } else {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "teacher"), eq(usersTable.active, true)));
  }

  if (!user) {
    res.status(404).json({ error: "No demo account available for this role." });
    return;
  }

  const token = signToken({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    email: user.email || undefined,
  });

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "demo_login",
    actor: { userId: user.id, schoolId: user.schoolId, role: user.role },
    targetType: "user",
    targetId: user.id,
    details: { demoRole: role },
    req,
  });

  res.json({ token, user: formatUser(user) });
});

router.get("/auth/me", authMiddleware, async (req, res): Promise<void> => {
  const jwtUser = (req as any).user as JwtPayload;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, jwtUser.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    schoolId: user.schoolId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    yearGroup: user.yearGroup,
    className: user.className,
    avatarType: user.avatarType,
    avatarValue: user.avatarValue,
    avatarImageUrl: user.avatarImageUrl,
    parentOf: user.parentOf || [],
    active: user.active,
    lastLogin: user.lastLogin?.toISOString() || null,
  };
}

export default router;

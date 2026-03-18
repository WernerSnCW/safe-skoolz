import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { PupilLoginBody, StaffLoginBody } from "@workspace/api-zod";
import { signToken, authMiddleware, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

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

  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const firstLogin = !user.lastLogin;
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

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

  if (!["teacher", "coordinator", "head_teacher", "senco"].includes(user.role)) {
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

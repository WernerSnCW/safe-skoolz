import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db, usersTable, schoolLoginCodesTable } from "@workspace/db";
import { StaffLoginBody } from "@workspace/api-zod";
import { signToken, authMiddleware, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

const PUPIL_LOCK_MINUTES = 15;
const PUPIL_LOCK_THRESHOLD = 3;
const PUPIL_ADMIN_RESET_THRESHOLD = 5;

const loginSessions = new Map<string, { schoolId: string; profiles: { loginKey: string; pupilId: string }[]; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, session] of loginSessions) {
    if (session.expiresAt < now) loginSessions.delete(key);
  }
}, 60_000);

router.post("/auth/pupil/start", async (req, res): Promise<void> => {
  const { schoolId, accessCode } = req.body;

  if (!schoolId || !accessCode) {
    res.status(400).json({ error: "schoolId and accessCode are required" });
    return;
  }

  const codes = await db
    .select()
    .from(schoolLoginCodesTable)
    .where(
      and(
        eq(schoolLoginCodesTable.schoolId, schoolId),
        eq(schoolLoginCodesTable.codeType, "pupil_login"),
        eq(schoolLoginCodesTable.active, true)
      )
    );

  let codeValid = false;
  for (const code of codes) {
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) continue;
    const match = await bcrypt.compare(accessCode.toUpperCase().trim(), code.codeHash);
    if (match) {
      codeValid = true;
      break;
    }
  }

  if (!codeValid) {
    res.status(401).json({ error: "Invalid school access code" });
    return;
  }

  const pupils = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        eq(usersTable.role, "pupil"),
        eq(usersTable.active, true)
      )
    );

  const loginSessionToken = crypto.randomBytes(32).toString("hex");
  const profileEntries: { loginKey: string; pupilId: string }[] = [];

  const profiles = pupils.map((p) => {
    const loginKey = crypto.randomBytes(16).toString("hex");
    profileEntries.push({ loginKey, pupilId: p.id });
    return {
      loginKey,
      displayName: `${p.firstName} ${p.lastName ? p.lastName.charAt(0) + "." : ""}`,
      avatarType: p.avatarType || "animal",
      avatarValue: p.avatarValue || "",
      yearGroup: p.yearGroup || "",
      className: p.className || "",
    };
  });

  loginSessions.set(loginSessionToken, {
    schoolId,
    profiles: profileEntries,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  res.json({ loginSessionToken, profiles });
});

router.post("/auth/pupil/login", async (req, res): Promise<void> => {
  const { loginSessionToken, loginKey, pin } = req.body;

  if (!loginSessionToken || !loginKey || !pin) {
    res.status(400).json({ error: "loginSessionToken, loginKey, and pin are required" });
    return;
  }

  const session = loginSessions.get(loginSessionToken);
  if (!session || session.expiresAt < Date.now()) {
    loginSessions.delete(loginSessionToken);
    res.status(401).json({ error: "Login session expired. Please start again." });
    return;
  }

  const profileEntry = session.profiles.find((p) => p.loginKey === loginKey);
  if (!profileEntry) {
    res.status(401).json({ error: "Invalid profile selection" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, profileEntry.pupilId),
        eq(usersTable.schoolId, session.schoolId),
        eq(usersTable.role, "pupil"),
        eq(usersTable.active, true)
      )
    );

  if (!user || !user.pinHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const lockedUntilTime = new Date(user.lockedUntil).getTime();
    const isAdminLocked = lockedUntilTime > Date.now() + 24 * 60 * 60 * 1000;

    if (isAdminLocked) {
      res.status(423).json({
        error: "Account locked",
        message: "Your account is locked. Ask your teacher to reset your PIN.",
        locked: true,
        adminResetRequired: true,
      });
    } else {
      const minutesLeft = Math.ceil((lockedUntilTime - Date.now()) / 60000);
      res.status(423).json({
        error: "Account locked",
        message: `Too many wrong attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        locked: true,
        minutesRemaining: minutesLeft,
      });
    }
    return;
  }

  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updates: any = { failedLoginAttempts: newAttempts };

    if (newAttempts >= PUPIL_ADMIN_RESET_THRESHOLD) {
      updates.lockedUntil = new Date("2099-12-31");
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      res.status(423).json({
        error: "Account locked",
        message: "Your account is locked. Ask your teacher to reset your PIN.",
        locked: true,
        adminResetRequired: true,
      });
    } else if (newAttempts >= PUPIL_LOCK_THRESHOLD) {
      updates.lockedUntil = new Date(Date.now() + PUPIL_LOCK_MINUTES * 60 * 1000);
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      res.status(423).json({
        error: "Account locked",
        message: `Too many wrong attempts. Try again in ${PUPIL_LOCK_MINUTES} minutes.`,
        locked: true,
        minutesRemaining: PUPIL_LOCK_MINUTES,
      });
    } else {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      const remaining = PUPIL_LOCK_THRESHOLD - newAttempts;
      res.status(401).json({
        error: "Wrong PIN",
        message: `That PIN wasn't right. You have ${remaining} ${remaining === 1 ? "try" : "tries"} left.`,
        attemptsRemaining: remaining,
      });
    }
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersTable.id, user.id));

  loginSessions.delete(loginSessionToken);

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

import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq, and, isNull, gt, inArray } from "drizzle-orm";
import { db, usersTable, schoolLoginCodesTable } from "@workspace/db";
import { StaffLoginBody } from "@workspace/api-zod";
import { signToken, authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";

const JWT_SECRET = process.env.JWT_SECRET!;
const PUPIL_LOGIN_SESSION_TTL_SECONDS = 10 * 60;

interface PupilLoginSessionPayload {
  kind: "pupil_login_session";
  schoolId: string;
  profiles: { loginKey: string; pupilId: string }[];
}

function signPupilLoginSession(schoolId: string, profiles: { loginKey: string; pupilId: string }[]): string {
  const payload: PupilLoginSessionPayload = { kind: "pupil_login_session", schoolId, profiles };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: PUPIL_LOGIN_SESSION_TTL_SECONDS });
}

function verifyPupilLoginSession(token: string): PupilLoginSessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as PupilLoginSessionPayload;
    if (decoded.kind !== "pupil_login_session" || !decoded.schoolId || !Array.isArray(decoded.profiles)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

const ROLE_LABELS: Record<string, string> = {
  coordinator: "Safeguarding Coordinator",
  head_teacher: "Head Teacher",
  teacher: "Teacher",
  head_of_year: "Head of Year",
  senco: "SENCO",
  support_staff: "Support Staff",
  parent: "Parent",
  pta: "PTA",
};

const STAFF_ROLES = ["coordinator", "head_teacher", "teacher", "head_of_year", "senco", "support_staff"];

router.get("/auth/login-accounts", async (req, res): Promise<void> => {
  const { schoolId, type } = req.query;
  if (!schoolId || typeof schoolId !== "string") {
    res.status(400).json({ error: "schoolId is required" });
    return;
  }
  const validTypes = ["staff", "parent", "pta"];
  const accountType = typeof type === "string" && validTypes.includes(type) ? type : "staff";

  let roles: string[];
  if (accountType === "parent") {
    roles = ["parent"];
  } else if (accountType === "pta") {
    roles = ["pta"];
  } else {
    roles = STAFF_ROLES;
  }

  const users = await db
    .select({
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      role: usersTable.role,
      className: usersTable.className,
      yearGroup: usersTable.yearGroup,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, schoolId),
        eq(usersTable.active, true),
        inArray(usersTable.role, roles)
      )
    );

  const accounts = users
    .filter(u => u.email)
    .map(u => {
      const name = `${u.firstName} ${u.lastName || ""}`.trim();
      let subtitle = ROLE_LABELS[u.role] || u.role;
      if (u.className) subtitle += ` · ${u.className}`;
      else if (u.yearGroup) subtitle += ` · ${u.yearGroup}`;
      return { label: name, subtitle, email: u.email };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  res.json(accounts);
});

export const PUPIL_LOCK_MINUTES = 15;
export const PUPIL_LOCK_THRESHOLD = 3;
export const PUPIL_ADMIN_RESET_THRESHOLD = 5;

/** @internal */
export function computeLockoutAction(failedAttempts: number): { action: "none" | "timed_lock" | "admin_lock"; lockedUntil: Date | null; attemptsRemaining: number } {
  const newAttempts = failedAttempts + 1;
  if (newAttempts >= PUPIL_ADMIN_RESET_THRESHOLD) {
    return { action: "admin_lock", lockedUntil: new Date("2099-12-31"), attemptsRemaining: 0 };
  }
  if (newAttempts >= PUPIL_LOCK_THRESHOLD) {
    return { action: "timed_lock", lockedUntil: new Date(Date.now() + PUPIL_LOCK_MINUTES * 60 * 1000), attemptsRemaining: 0 };
  }
  return { action: "none", lockedUntil: null, attemptsRemaining: PUPIL_LOCK_THRESHOLD - newAttempts };
}

router.get("/auth/locked-pupils", authMiddleware, requireRole("coordinator", "head_teacher"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const lockedPupils = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      className: usersTable.className,
      yearGroup: usersTable.yearGroup,
      lockedUntil: usersTable.lockedUntil,
      failedLoginAttempts: usersTable.failedLoginAttempts,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.schoolId, user.schoolId),
        eq(usersTable.role, "pupil"),
        gt(usersTable.lockedUntil, new Date())
      )
    )
    .orderBy(usersTable.lockedUntil);

  res.json(lockedPupils.reverse());
});

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

  let matchedCode: (typeof codes)[number] | null = null;
  for (const code of codes) {
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) continue;
    const match = await bcrypt.compare(accessCode.toUpperCase().trim(), code.codeHash);
    if (match) {
      matchedCode = code;
      break;
    }
  }

  if (!matchedCode) {
    res.status(401).json({ error: "Invalid access code" });
    return;
  }

  // Build pupil query — filter by class if the code is class-specific
  const pupilFilters = [
    eq(usersTable.schoolId, schoolId),
    eq(usersTable.role, "pupil"),
    eq(usersTable.active, true),
  ];
  if (matchedCode.className) {
    pupilFilters.push(eq(usersTable.className, matchedCode.className));
  }

  const pupils = await db
    .select()
    .from(usersTable)
    .where(and(...pupilFilters));

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

  const loginSessionToken = signPupilLoginSession(schoolId, profileEntries);

  res.json({ loginSessionToken, profiles });
});

router.post("/auth/pupil/login", async (req, res): Promise<void> => {
  const { loginSessionToken, loginKey, pin } = req.body;

  if (!loginSessionToken || !loginKey || !pin) {
    res.status(400).json({ error: "loginSessionToken, loginKey, and pin are required" });
    return;
  }

  const session = verifyPupilLoginSession(loginSessionToken);
  if (!session) {
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
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "pupil"), eq(usersTable.active, true), eq(usersTable.firstName, "Bob")));
    if (!user) {
      [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "pupil"), eq(usersTable.active, true))).limit(1);
    }
  } else if (role === "parent") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "parent"), eq(usersTable.active, true))).limit(1);
  } else if (role === "pta") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "pta"), eq(usersTable.active, true))).limit(1);
  } else {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "teacher"), eq(usersTable.active, true))).limit(1);
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

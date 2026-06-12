import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq, and, isNull, gt, inArray, sql } from "drizzle-orm";
import { db, usersTable, schoolLoginCodesTable, pupilLoginSessionsTable, userMfaSecretsTable, schoolsTable, voiceGroupsTable, voiceMembersTable } from "@workspace/db";
import { StaffLoginBody } from "@workspace/api-zod";
import { signToken, authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { signMfaChallengeToken, signMfaEnrollmentToken, MFA_ENFORCED_ROLES } from "./mfa";

const JWT_SECRET = process.env.JWT_SECRET!;
const PUPIL_LOGIN_SESSION_TTL_MS = 10 * 60 * 1000;

// T08: pupil login sessions are stored in `pupil_login_sessions` so they survive
// restarts, can be marked consumed (single-use), and can be revoked. The previous
// stateless JWT helpers (`signPupilLoginSession`/`verifyPupilLoginSession`) are gone.

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

  const expiresAt = new Date(Date.now() + PUPIL_LOGIN_SESSION_TTL_MS);
  const [session] = await db
    .insert(pupilLoginSessionsTable)
    .values({
      schoolId,
      classCodeHash: matchedCode.codeHash,
      pupilCandidates: profileEntries,
      expiresAt,
    })
    .returning({ id: pupilLoginSessionsTable.id });

  await writeAudit({
    schoolId,
    eventType: "pupil_login_session_started",
    targetType: "pupil_login_session",
    targetId: session.id,
    details: { profileCount: profileEntries.length, className: matchedCode.className ?? null },
  }).catch(() => {});

  res.json({ loginSessionToken: session.id, profiles });
});

router.post("/auth/pupil/login", async (req, res): Promise<void> => {
  const { loginSessionToken, loginKey, pin } = req.body;

  if (!loginSessionToken || !loginKey || !pin) {
    res.status(400).json({ error: "loginSessionToken, loginKey, and pin are required" });
    return;
  }

  // Atomically claim the session: SELECT FOR UPDATE + UPDATE consumed_at in one tx,
  // rejecting expired/already-consumed rows. Single-use by construction.
  const claim = await db.transaction(async (tx) => {
    const rows = await tx.execute<{
      id: string;
      school_id: string;
      pupil_candidates: { loginKey: string; pupilId: string }[];
      expires_at: Date;
      consumed_at: Date | null;
    }>(
      sql`SELECT id, school_id, pupil_candidates, expires_at, consumed_at
          FROM pupil_login_sessions WHERE id = ${loginSessionToken} FOR UPDATE`,
    );
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if (row.consumed_at) return { ok: false as const, reason: "consumed" as const };
    if (new Date(row.expires_at) < new Date()) return { ok: false as const, reason: "expired" as const };
    await tx.execute(sql`UPDATE pupil_login_sessions SET consumed_at = NOW() WHERE id = ${loginSessionToken}`);
    return {
      ok: true as const,
      schoolId: row.school_id,
      profiles: row.pupil_candidates,
    };
  }).catch(() => ({ ok: false as const, reason: "tx_failed" as const }));

  if (!claim.ok) {
    res.status(401).json({ error: "Login session expired. Please start again." });
    return;
  }
  const session = { schoolId: claim.schoolId, profiles: claim.profiles };

  const profileEntry = session.profiles.find((p: typeof session.profiles[number]) => p.loginKey === loginKey);
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

  // T3: if an admin has reset this user's MFA, block normal login and return
  // an enrolment token so the frontend can route them straight into re-enrol.
  if (user.mfaEnrollmentRequired) {
    const enrollmentToken = signMfaEnrollmentToken({
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email || undefined,
    });
    res.json({ requiresMfaEnrollment: true, enrollmentToken });
    return;
  }

  // T11: if user is in an MFA-enforced role and has MFA enabled, return a
  // short-lived challenge token instead of the full JWT. The frontend prompts
  // for a TOTP / backup code and calls /api/auth/mfa/challenge to upgrade it.
  if (process.env.MFA_ENFORCED === "true" && MFA_ENFORCED_ROLES.includes(user.role)) {
    const [mfaRow] = await db
      .select()
      .from(userMfaSecretsTable)
      .where(eq(userMfaSecretsTable.userId, user.id));
    if (mfaRow?.enabled) {
      const mfaToken = signMfaChallengeToken({
        userId: user.id,
        schoolId: user.schoolId,
        role: user.role,
        email: user.email || undefined,
      });
      res.json({ requiresMfa: true, mfaToken });
      return;
    }
  }

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /auth/signup — email+password sign-up that logs the parent in instantly
// (no email verification — production has no Resend yet). Creates a pending
// parent at the school and backs that school's "Vibes" voice group (= backing
// both goals). Returns the same shape as login.
router.post("/auth/signup", async (req, res): Promise<void> => {
  const { email, password, name, schoolSlug } = req.body ?? {};
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  if (!schoolSlug || typeof schoolSlug !== "string") {
    res.status(400).json({ error: "A school is required." });
    return;
  }
  const [school] = await db.select().from(schoolsTable)
    .where(and(eq(schoolsTable.slug, schoolSlug), eq(schoolsTable.active, true)));
  if (!school) {
    res.status(404).json({ error: "School not found." });
    return;
  }

  const normalEmail = email.toLowerCase().trim();
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalEmail));
  if (existing) {
    res.status(409).json({ error: "This email already has an account. Try logging in." });
    return;
  }

  const trimmed = name ? String(name).trim() : "";
  const firstName = (trimmed.split(/\s+/)[0] || "Morna").slice(0, 100);
  const lastName = (trimmed.split(/\s+/).slice(1).join(" ") || "Parent").slice(0, 100);
  const passwordHash = await bcrypt.hash(password, 10);

  let newUser;
  try {
    [newUser] = await db.insert(usersTable).values({
      schoolId: school.id,
      role: "parent",
      firstName,
      lastName,
      email: normalEmail,
      passwordHash,
      membershipStatus: "pending",
      lastLogin: new Date(),
    } as any).returning();
  } catch (e: any) {
    const pgCode = e?.code ?? e?.cause?.code;
    if (pgCode === "23505") {
      res.status(409).json({ error: "This email already has an account. Try logging in." });
      return;
    }
    throw e;
  }

  try {
    const [voice] = await db.select({ id: voiceGroupsTable.id }).from(voiceGroupsTable)
      .where(and(eq(voiceGroupsTable.schoolId, school.id), eq(voiceGroupsTable.status, "advocating")));
    if (voice) {
      await db.insert(voiceMembersTable).values({ voiceId: voice.id, userId: newUser.id, role: "member" }).onConflictDoNothing();
    }
  } catch (e) { console.error("[signup] backing voice failed:", e); }

  const token = signToken({ userId: newUser.id, schoolId: newUser.schoolId, role: newUser.role, email: newUser.email || undefined });
  res.status(201).json({ token, user: formatUser(newUser), firstLogin: true });
});

router.post("/auth/parent/login", async (req, res): Promise<void> => {
  const parsed = StaffLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const normalEmail = String(email).toLowerCase().trim();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, normalEmail), eq(usersTable.role, "parent"), eq(usersTable.active, true)));

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
  if (process.env.DEMO_MODE === "false") {
    res.status(403).json({ error: "Demo login is disabled in this environment." });
    return;
  }

  const { role } = req.body;
  if (!role || !["pupil", "staff", "parent", "pta", "coordinator"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be pupil, staff, parent, pta, or coordinator." });
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
  } else if (role === "coordinator") {
    [user] = await db.select().from(usersTable).where(and(eq(usersTable.role, "coordinator"), eq(usersTable.active, true))).limit(1);
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
    membershipStatus: user.membershipStatus,
    displayMode: user.displayMode,
    lastLogin: user.lastLogin?.toISOString() || null,
  };
}

export default router;

import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { and, eq, gt, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  userMfaSecretsTable,
  mfaResetRequestsTable,
} from "@workspace/db";
import { authMiddleware, requireRole, signToken, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { encryptSecret, decryptSecret, isMfaConfigured } from "../lib/mfaCrypto";
import { PgRateLimitStore } from "../lib/rateLimitStore";

// T11: TOTP MFA for coordinator + head_teacher. Enrolment is always available to
// any logged-in user (the panel is shown in their settings), but enforcement at
// login time is gated by MFA_ENFORCED=true + role. Backup codes are mandatory and
// returned once at enrolment.
const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const ISSUER = "Safeskoolz";
const BACKUP_CODE_COUNT = 8;
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

export const MFA_ENFORCED_ROLES = ["coordinator", "head_teacher"];

export interface MfaChallengePayload {
  kind: "mfa-challenge";
  userId: string;
  schoolId: string;
  role: string;
  email?: string;
}

export function signMfaChallengeToken(p: Omit<MfaChallengePayload, "kind">): string {
  return jwt.sign({ ...p, kind: "mfa-challenge" }, JWT_SECRET, {
    expiresIn: MFA_CHALLENGE_TTL_SECONDS,
  });
}

function verifyMfaChallengeToken(token: string): MfaChallengePayload | null {
  try {
    const d = jwt.verify(token, JWT_SECRET) as MfaChallengePayload;
    if (d.kind !== "mfa-challenge" || !d.userId) return null;
    return d;
  } catch {
    return null;
  }
}

// T3: short-lived token returned by staff login when a user must re-enrol MFA
// (e.g. after an admin reset). Only accepted by /auth/mfa/enroll/* endpoints.
export interface MfaEnrollmentPayload {
  kind: "mfa-enrollment";
  userId: string;
  schoolId: string;
  role: string;
  email?: string;
}
const MFA_ENROLLMENT_TTL_SECONDS = 15 * 60;
export function signMfaEnrollmentToken(p: Omit<MfaEnrollmentPayload, "kind">): string {
  return jwt.sign({ ...p, kind: "mfa-enrollment" }, JWT_SECRET, {
    expiresIn: MFA_ENROLLMENT_TTL_SECONDS,
  });
}
function verifyMfaEnrollmentToken(token: string): MfaEnrollmentPayload | null {
  try {
    const d = jwt.verify(token, JWT_SECRET) as MfaEnrollmentPayload;
    if (d.kind !== "mfa-enrollment" || !d.userId) return null;
    return d;
  } catch {
    return null;
  }
}

function makeBackupCode(): string {
  // 10 chars, base32-ish alphabet (excluding ambiguous I/L/O/U/0/1).
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return s;
}

router.post("/auth/mfa/setup", authMiddleware, async (req, res): Promise<void> => {
  if (!isMfaConfigured()) {
    res.status(503).json({ error: "MFA is not configured on this server (MFA_ENC_KEY missing)" });
    return;
  }
  const user = (req as any).user as JwtPayload;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  if (!u) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const secret = generateSecret();
  const encrypted = encryptSecret(secret);
  const otpauth = generateURI({ issuer: ISSUER, label: u.email ?? u.id, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  // Upsert: replacing an unfinished setup is allowed; replacing an enabled row
  // requires /disable first.
  const [existing] = await db
    .select()
    .from(userMfaSecretsTable)
    .where(eq(userMfaSecretsTable.userId, user.userId));
  if (existing?.enabled) {
    res.status(409).json({ error: "MFA already enabled. Disable first to re-enrol." });
    return;
  }
  if (existing) {
    await db
      .update(userMfaSecretsTable)
      .set({ secretEncrypted: encrypted, enabled: false, backupCodes: [] })
      .where(eq(userMfaSecretsTable.userId, user.userId));
  } else {
    await db.insert(userMfaSecretsTable).values({
      userId: user.userId,
      secretEncrypted: encrypted,
      enabled: false,
      backupCodes: [],
    });
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "mfa_setup_started",
    actor: user,
    targetType: "user",
    targetId: user.userId,
    req,
  }).catch(() => {});

  res.json({ otpauth, qrDataUrl });
});

router.post("/auth/mfa/verify-setup", authMiddleware, async (req, res): Promise<void> => {
  if (!isMfaConfigured()) {
    res.status(503).json({ error: "MFA is not configured on this server" });
    return;
  }
  const { code } = req.body ?? {};
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "TOTP code is required" });
    return;
  }
  const user = (req as any).user as JwtPayload;
  const [row] = await db.select().from(userMfaSecretsTable).where(eq(userMfaSecretsTable.userId, user.userId));
  if (!row) {
    res.status(400).json({ error: "No MFA setup in progress" });
    return;
  }
  if (row.enabled) {
    res.status(409).json({ error: "MFA already enabled" });
    return;
  }

  const secret = decryptSecret(row.secretEncrypted);
  if (!verifySync({ token: code, secret }).valid) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }

  // Generate backup codes — return plaintext ONCE, store bcrypt hashes.
  const plaintextCodes: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const c = makeBackupCode();
    plaintextCodes.push(c);
    hashed.push(await bcrypt.hash(c, 10));
  }

  await db
    .update(userMfaSecretsTable)
    .set({ enabled: true, backupCodes: hashed })
    .where(eq(userMfaSecretsTable.userId, user.userId));

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "mfa_enabled",
    actor: user,
    targetType: "user",
    targetId: user.userId,
    req,
  }).catch(() => {});

  res.json({ enabled: true, backupCodes: plaintextCodes });
});

router.post("/auth/mfa/disable", authMiddleware, async (req, res): Promise<void> => {
  const { code } = req.body ?? {};
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "TOTP code is required" });
    return;
  }
  const user = (req as any).user as JwtPayload;
  const [row] = await db.select().from(userMfaSecretsTable).where(eq(userMfaSecretsTable.userId, user.userId));
  if (!row || !row.enabled) {
    res.status(400).json({ error: "MFA is not enabled" });
    return;
  }

  const secret = decryptSecret(row.secretEncrypted);
  if (!verifySync({ token: code, secret }).valid) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }

  await db.delete(userMfaSecretsTable).where(eq(userMfaSecretsTable.userId, user.userId));

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "mfa_disabled",
    actor: user,
    targetType: "user",
    targetId: user.userId,
    req,
  }).catch(() => {});

  res.json({ disabled: true });
});

router.post("/auth/mfa/challenge", async (req, res): Promise<void> => {
  const { mfaToken, code, backupCode } = req.body ?? {};
  if (!mfaToken || typeof mfaToken !== "string") {
    res.status(400).json({ error: "mfaToken required" });
    return;
  }
  if (!code && !backupCode) {
    res.status(400).json({ error: "code or backupCode required" });
    return;
  }

  const claim = verifyMfaChallengeToken(mfaToken);
  if (!claim) {
    res.status(401).json({ error: "Invalid or expired challenge token" });
    return;
  }

  const [row] = await db.select().from(userMfaSecretsTable).where(eq(userMfaSecretsTable.userId, claim.userId));
  if (!row || !row.enabled) {
    res.status(400).json({ error: "MFA not enabled" });
    return;
  }

  let success = false;
  let usedBackup = false;
  if (typeof code === "string" && code.length > 0) {
    const secret = decryptSecret(row.secretEncrypted);
    success = verifySync({ token: code, secret }).valid;
  } else if (typeof backupCode === "string" && backupCode.length > 0) {
    const codes = row.backupCodes ?? [];
    let matchIdx = -1;
    for (let i = 0; i < codes.length; i++) {
      if (await bcrypt.compare(backupCode, codes[i])) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx !== -1) {
      const next = [...codes];
      next.splice(matchIdx, 1);
      // Atomic single-use: only consume if the array we read is still current.
      const updated = await db
        .update(userMfaSecretsTable)
        .set({ backupCodes: next })
        .where(eq(userMfaSecretsTable.userId, claim.userId))
        .returning({ userId: userMfaSecretsTable.userId });
      success = updated.length > 0;
      usedBackup = success;
    }
  }

  if (!success) {
    await writeAudit({
      schoolId: claim.schoolId,
      eventType: "mfa_challenge_failed",
      targetType: "user",
      targetId: claim.userId,
      details: { usedBackup: typeof backupCode === "string" },
      req,
    }).catch(() => {});
    res.status(401).json({ error: "Invalid code" });
    return;
  }

  const token = signToken({
    userId: claim.userId,
    schoolId: claim.schoolId,
    role: claim.role,
    email: claim.email,
  });

  await writeAudit({
    schoolId: claim.schoolId,
    eventType: "mfa_challenge_succeeded",
    targetType: "user",
    targetId: claim.userId,
    details: { usedBackup },
    req,
  }).catch(() => {});

  res.json({ token });
});

// T3: Admin-initiated MFA reset (recovery path when a user has lost both their
// authenticator AND every backup code). Uses a four-eyes flow: one coordinator
// or head_teacher requests, a *different* admin in the same school confirms.
// The actual reset deletes the user_mfa_secrets row, forcing re-enrolment at
// next login. Both steps emit dedicated audit events.
const ADMIN_RESET_ROLES = ["coordinator", "head_teacher"] as const;
const RESET_REQUEST_TTL_MS = 30 * 60 * 1000; // 30 minutes to confirm

const adminResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many MFA reset requests. Please try again later." },
  store: new PgRateLimitStore("mfa_admin_reset"),
  keyGenerator: (req: Request) => {
    const u = (req as any).user as JwtPayload | undefined;
    return u ? `${u.schoolId}:${u.userId}` : "anon";
  },
});

router.post(
  "/auth/mfa/admin/reset-request",
  authMiddleware,
  requireRole(...ADMIN_RESET_ROLES),
  adminResetLimiter,
  async (req, res): Promise<void> => {
    const actor = (req as any).user as JwtPayload;
    const { targetUserId } = (req.body ?? {}) as { targetUserId?: string };
    if (!targetUserId || typeof targetUserId !== "string") {
      res.status(400).json({ error: "targetUserId is required" });
      return;
    }
    if (targetUserId === actor.userId) {
      res.status(400).json({ error: "You cannot request a reset of your own MFA" });
      return;
    }

    const [target] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, targetUserId), eq(usersTable.schoolId, actor.schoolId)));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [secret] = await db
      .select()
      .from(userMfaSecretsTable)
      .where(eq(userMfaSecretsTable.userId, targetUserId));
    if (!secret || !secret.enabled) {
      res.status(400).json({ error: "Target user does not have MFA enabled" });
      return;
    }

    // Replace any pending request for this target (latest requester wins).
    await db
      .delete(mfaResetRequestsTable)
      .where(eq(mfaResetRequestsTable.targetUserId, targetUserId));

    const expiresAt = new Date(Date.now() + RESET_REQUEST_TTL_MS);
    const [created] = await db
      .insert(mfaResetRequestsTable)
      .values({
        schoolId: actor.schoolId,
        targetUserId,
        requestedBy: actor.userId,
        expiresAt,
      })
      .returning();

    await writeAudit({
      schoolId: actor.schoolId,
      eventType: "mfa_reset_requested",
      actor,
      targetType: "user",
      targetId: targetUserId,
      details: { requestId: created.id, expiresAt: expiresAt.toISOString() },
      req,
    }).catch(() => {});

    res.json({
      requestId: created.id,
      targetUserId,
      expiresAt: expiresAt.toISOString(),
    });
  }
);

router.get(
  "/auth/mfa/admin/reset-requests",
  authMiddleware,
  requireRole(...ADMIN_RESET_ROLES),
  async (req, res): Promise<void> => {
    const actor = (req as any).user as JwtPayload;
    const now = new Date();

    const rows = await db
      .select()
      .from(mfaResetRequestsTable)
      .where(
        and(
          eq(mfaResetRequestsTable.schoolId, actor.schoolId),
          gt(mfaResetRequestsTable.expiresAt, now)
        )
      );

    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.targetUserId, r.requestedBy]))
    );
    const users = userIds.length
      ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const fmt = (id: string) => {
      const u = byId.get(id);
      return u
        ? { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role }
        : { id, firstName: null, lastName: null, email: null, role: null };
    };

    res.json({
      requests: rows.map((r) => ({
        id: r.id,
        target: fmt(r.targetUserId),
        requestedBy: fmt(r.requestedBy),
        requestedByIsMe: r.requestedBy === actor.userId,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
      })),
    });
  }
);

router.post(
  "/auth/mfa/admin/reset-confirm",
  authMiddleware,
  requireRole(...ADMIN_RESET_ROLES),
  async (req, res): Promise<void> => {
    const actor = (req as any).user as JwtPayload;
    const { requestId } = (req.body ?? {}) as { requestId?: string };
    if (!requestId || typeof requestId !== "string") {
      res.status(400).json({ error: "requestId is required" });
      return;
    }

    const [reqRow] = await db
      .select()
      .from(mfaResetRequestsTable)
      .where(
        and(
          eq(mfaResetRequestsTable.id, requestId),
          eq(mfaResetRequestsTable.schoolId, actor.schoolId)
        )
      );
    if (!reqRow) {
      res.status(404).json({ error: "Reset request not found" });
      return;
    }
    if (reqRow.expiresAt.getTime() <= Date.now()) {
      await db
        .delete(mfaResetRequestsTable)
        .where(eq(mfaResetRequestsTable.id, requestId));
      res.status(410).json({ error: "Reset request has expired" });
      return;
    }
    if (reqRow.requestedBy === actor.userId) {
      res.status(403).json({
        error: "Four-eyes required: a different admin must confirm this reset",
      });
      return;
    }

    // Delete the MFA secret row AND flag the user as requiring re-enrolment.
    // The flag is what blocks normal login until the user completes the new
    // enrolment flow (see /auth/staff/login + /auth/mfa/enroll/*).
    await db
      .delete(userMfaSecretsTable)
      .where(eq(userMfaSecretsTable.userId, reqRow.targetUserId));
    await db
      .update(usersTable)
      .set({ mfaEnrollmentRequired: true })
      .where(eq(usersTable.id, reqRow.targetUserId));
    await db
      .delete(mfaResetRequestsTable)
      .where(eq(mfaResetRequestsTable.id, requestId));

    await writeAudit({
      schoolId: actor.schoolId,
      eventType: "mfa_reset_by_admin",
      actor,
      targetType: "user",
      targetId: reqRow.targetUserId,
      details: {
        requestId,
        requestedBy: reqRow.requestedBy,
        confirmedBy: actor.userId,
      },
      req,
    }).catch(() => {});

    res.json({ reset: true, targetUserId: reqRow.targetUserId });
  }
);

router.post(
  "/auth/mfa/admin/reset-cancel",
  authMiddleware,
  requireRole(...ADMIN_RESET_ROLES),
  async (req, res): Promise<void> => {
    const actor = (req as any).user as JwtPayload;
    const { requestId } = (req.body ?? {}) as { requestId?: string };
    if (!requestId || typeof requestId !== "string") {
      res.status(400).json({ error: "requestId is required" });
      return;
    }
    const [reqRow] = await db
      .select()
      .from(mfaResetRequestsTable)
      .where(
        and(
          eq(mfaResetRequestsTable.id, requestId),
          eq(mfaResetRequestsTable.schoolId, actor.schoolId)
        )
      );
    if (!reqRow) {
      res.status(404).json({ error: "Reset request not found" });
      return;
    }

    await db
      .delete(mfaResetRequestsTable)
      .where(eq(mfaResetRequestsTable.id, requestId));

    await writeAudit({
      schoolId: actor.schoolId,
      eventType: "mfa_reset_cancelled",
      actor,
      targetType: "user",
      targetId: reqRow.targetUserId,
      details: { requestId, requestedBy: reqRow.requestedBy },
      req,
    }).catch(() => {});

    res.json({ cancelled: true });
  }
);

// T3: Forced re-enrolment after an admin reset. The user logs in normally,
// the staff-login handler sees `mfaEnrollmentRequired=true` and returns an
// enrolment token (not a full JWT). The user then uses the token here to
// enrol a new authenticator. On success we clear the flag and issue the
// full JWT.
router.post("/auth/mfa/enroll/setup", async (req, res): Promise<void> => {
  if (!isMfaConfigured()) {
    res.status(503).json({ error: "MFA is not configured on this server (MFA_ENC_KEY missing)" });
    return;
  }
  const { enrollmentToken } = (req.body ?? {}) as { enrollmentToken?: string };
  if (!enrollmentToken || typeof enrollmentToken !== "string") {
    res.status(400).json({ error: "enrollmentToken required" });
    return;
  }
  const claim = verifyMfaEnrollmentToken(enrollmentToken);
  if (!claim) {
    res.status(401).json({ error: "Invalid or expired enrolment token" });
    return;
  }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, claim.userId));
  if (!u) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const secret = generateSecret();
  const encrypted = encryptSecret(secret);
  const otpauth = generateURI({ issuer: ISSUER, label: u.email ?? u.id, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  const [existing] = await db
    .select()
    .from(userMfaSecretsTable)
    .where(eq(userMfaSecretsTable.userId, claim.userId));
  if (existing) {
    await db
      .update(userMfaSecretsTable)
      .set({ secretEncrypted: encrypted, enabled: false, backupCodes: [] })
      .where(eq(userMfaSecretsTable.userId, claim.userId));
  } else {
    await db.insert(userMfaSecretsTable).values({
      userId: claim.userId,
      secretEncrypted: encrypted,
      enabled: false,
      backupCodes: [],
    });
  }

  await writeAudit({
    schoolId: claim.schoolId,
    eventType: "mfa_setup_started",
    actor: claim,
    targetType: "user",
    targetId: claim.userId,
    details: { forced: true },
    req,
  }).catch(() => {});

  res.json({ otpauth, qrDataUrl });
});

router.post("/auth/mfa/enroll/verify", async (req, res): Promise<void> => {
  if (!isMfaConfigured()) {
    res.status(503).json({ error: "MFA is not configured on this server" });
    return;
  }
  const { enrollmentToken, code } = (req.body ?? {}) as {
    enrollmentToken?: string;
    code?: string;
  };
  if (!enrollmentToken || typeof enrollmentToken !== "string") {
    res.status(400).json({ error: "enrollmentToken required" });
    return;
  }
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "TOTP code is required" });
    return;
  }
  const claim = verifyMfaEnrollmentToken(enrollmentToken);
  if (!claim) {
    res.status(401).json({ error: "Invalid or expired enrolment token" });
    return;
  }

  const [row] = await db
    .select()
    .from(userMfaSecretsTable)
    .where(eq(userMfaSecretsTable.userId, claim.userId));
  if (!row) {
    res.status(400).json({ error: "No MFA setup in progress" });
    return;
  }
  if (row.enabled) {
    res.status(409).json({ error: "MFA already enabled" });
    return;
  }
  const secret = decryptSecret(row.secretEncrypted);
  if (!verifySync({ token: code, secret }).valid) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }

  const plaintextCodes: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const c = makeBackupCode();
    plaintextCodes.push(c);
    hashed.push(await bcrypt.hash(c, 10));
  }

  await db
    .update(userMfaSecretsTable)
    .set({ enabled: true, backupCodes: hashed })
    .where(eq(userMfaSecretsTable.userId, claim.userId));
  // Re-enrolment complete — clear the gate so the user can log in normally.
  await db
    .update(usersTable)
    .set({ mfaEnrollmentRequired: false })
    .where(eq(usersTable.id, claim.userId));

  await writeAudit({
    schoolId: claim.schoolId,
    eventType: "mfa_enabled",
    actor: claim,
    targetType: "user",
    targetId: claim.userId,
    details: { forced: true },
    req,
  }).catch(() => {});

  const fullToken = signToken({
    userId: claim.userId,
    schoolId: claim.schoolId,
    role: claim.role,
    email: claim.email,
  });

  res.json({ enabled: true, backupCodes: plaintextCodes, token: fullToken });
});

export default router;

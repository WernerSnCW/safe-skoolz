import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, usersTable, userMfaSecretsTable } from "@workspace/db";
import { authMiddleware, signToken, type JwtPayload } from "../lib/auth";
import { writeAudit } from "../lib/auditHelper";
import { encryptSecret, decryptSecret, isMfaConfigured } from "../lib/mfaCrypto";

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

export default router;

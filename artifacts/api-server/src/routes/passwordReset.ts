import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, isNull, gt, inArray } from "drizzle-orm";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { sendEmail } from "../lib/emailHelper";
import { writeAudit } from "../lib/auditHelper";

// T10: self-service password reset for staff + parents (pupils are PIN-only, reset
// by a coordinator). Token strategy: 32-byte random hex, bcrypt-hashed at rest, 30
// minute expiry, single-use. /request never reveals whether the email exists — it
// always returns 200 to defeat enumeration.
const router: IRouter = Router();

const ELIGIBLE_ROLES = ["teacher", "head_teacher", "coordinator", "head_of_year", "senco", "parent", "pta", "admin"];
const TOKEN_TTL_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

function isValidNewPassword(pw: unknown): pw is string {
  if (typeof pw !== "string" || pw.length < 12) return false;
  return /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

router.post("/auth/password-reset/request", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  // Always 200 regardless of outcome (no enumeration).
  if (!email || typeof email !== "string") {
    res.status(200).json({ ok: true });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.email, email.trim().toLowerCase()),
        eq(usersTable.active, true),
        inArray(usersTable.role, ELIGIBLE_ROLES),
      ),
    );

  if (!user) {
    res.status(200).json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:5000";
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  // Dev convenience: surface the link in logs when no Resend key is configured.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[password-reset] DEV reset link for ${user.email}: ${resetLink}`);
  }

  if (user.email) {
    await sendEmail({
      to: user.email,
      toName: `${user.firstName} ${user.lastName}`,
      subject: "Reset your Safeskoolz password",
      bodyText:
        `Hello ${user.firstName},\n\n` +
        `Use the link below to reset your Safeskoolz password. It expires in 30 minutes and can only be used once.\n\n` +
        `${resetLink}\n\n` +
        `If you didn't request this, you can ignore this email.`,
      trigger: "password_reset",
      recipientId: user.id,
      schoolId: user.schoolId,
    }).catch(() => {});
  }

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "password_reset_requested",
    targetType: "user",
    targetId: user.id,
    details: { email: user.email },
    req,
  }).catch(() => {});

  res.status(200).json({ ok: true });
});

router.post("/auth/password-reset/complete", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body ?? {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (!isValidNewPassword(newPassword)) {
    res.status(400).json({
      error: "Password must be at least 12 characters and contain a letter and a digit",
    });
    return;
  }

  // Scan unexpired, unconsumed tokens and bcrypt.compare each. The token table is
  // tiny in steady state thanks to TTL + consumption; lookup remains constant-time
  // per row regardless of total user count.
  const candidates = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        isNull(passwordResetTokensTable.consumedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  let matchedRow: (typeof candidates)[number] | null = null;
  for (const row of candidates) {
    if (await bcrypt.compare(token, row.tokenHash)) {
      matchedRow = row;
      break;
    }
  }
  if (!matchedRow) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  // Atomically claim: only update if still unconsumed. Concurrent completes are
  // rejected naturally because the second attempt sees consumedAt is set.
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const claimed = await db
    .update(passwordResetTokensTable)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokensTable.id, matchedRow.id),
        isNull(passwordResetTokensTable.consumedAt),
      ),
    )
    .returning({ id: passwordResetTokensTable.id });
  if (claimed.length === 0) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(usersTable.id, matchedRow.userId))
    .returning();

  await writeAudit({
    schoolId: user.schoolId,
    eventType: "password_reset_completed",
    targetType: "user",
    targetId: user.id,
    details: {},
    req,
  }).catch(() => {});

  res.status(200).json({ ok: true });
});

export default router;

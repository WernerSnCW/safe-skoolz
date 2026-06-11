import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { sql, eq, and, isNotNull } from "drizzle-orm";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import bcrypt from "bcrypt";
import {
  db,
  diagnosticSurveysTable,
  diagnosticSubmissionsTable,
  diagnosticAnswersTable,
  diagnosticResponseMetaTable,
  usersTable,
  passwordResetTokensTable,
} from "@workspace/db";
import { PgRateLimitStore } from "../lib/rateLimitStore";
import { sendEmail } from "../lib/emailHelper";

const router: IRouter = Router();

// Public community diagnostic (spec §4.2) — the Classlist link. No auth.
// GET returns the instrument + live submission counter; never answers.
router.get("/d/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.publicSlug, slug), isNotNull(diagnosticSurveysTable.publicSlug)));
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id));

  res.json({
    title: survey.title,
    questions: survey.instrument ?? [],
    submissionCount: count,
    released: survey.releasedAt != null,
  });
});

// POST /d/:slug/submit — email-gated, rate-limited, stores answers unlinkably (spec §4.2).
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this connection. Please try again later." },
  store: new PgRateLimitStore("cdiag"),
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "anon"),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/d/:slug/submit", submitLimiter, async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const { email, name, yearGroup, classOrTeacher, answers } = req.body ?? {};

  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.publicSlug, slug), isNotNull(diagnosticSurveysTable.publicSlug)));
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const instrument = (survey.instrument ?? []) as Array<{ key: string; type: string; options?: string[]; optional?: boolean }>;
  const validKeys = new Set(instrument.map((q) => q.key));
  if (!Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: "Answers are required." });
    return;
  }
  // F3: reject duplicate questionKeys across the submitted answers array.
  const seenKeys = new Set<string>();
  for (const a of answers) {
    if (!a || !validKeys.has(a.questionKey)) {
      res.status(400).json({ error: `Unknown question: ${a?.questionKey ?? "?"}` });
      return;
    }
    if (seenKeys.has(a.questionKey)) {
      res.status(400).json({ error: `Duplicate answer for question: ${a.questionKey}` });
      return;
    }
    seenKeys.add(a.questionKey);
    if (a.answer != null && (!Number.isInteger(a.answer) || a.answer < 0 || a.answer > 10)) {
      res.status(400).json({ error: "Invalid answer value." });
      return;
    }
    // F3: clamp scale answers to the question's actual option count.
    if (a.answer != null) {
      const q = instrument.find((iq) => iq.key === a.questionKey);
      if (q?.type === "scale" && q.options != null && a.answer >= q.options.length) {
        res.status(400).json({ error: "Invalid answer value." });
        return;
      }
    }
    if (a.freeText != null && String(a.freeText).length > 4000) {
      res.status(400).json({ error: "Answer too long." });
      return;
    }
  }

  // Fix 4: every non-optional question must be answered.
  // scale questions need answer != null; text questions need non-empty freeText.
  const answerMap = new Map(answers.map((a: any) => [a.questionKey, a]));
  for (const q of instrument) {
    if (q.optional) continue;
    const a = answerMap.get(q.key);
    if (q.type === "scale") {
      if (!a || a.answer == null) {
        res.status(400).json({ error: "Please answer every question (the open question is optional)." });
        return;
      }
    } else {
      if (!a || !a.freeText || String(a.freeText).trim() === "") {
        res.status(400).json({ error: "Please answer every question (the open question is optional)." });
        return;
      }
    }
  }

  const normalEmail = email.toLowerCase().trim();
  const emailHash = crypto.createHash("sha256").update(normalEmail).digest("hex");

  const [existing] = await db
    .select({ id: diagnosticSubmissionsTable.id })
    .from(diagnosticSubmissionsTable)
    .where(and(
      eq(diagnosticSubmissionsTable.surveyId, survey.id),
      eq(diagnosticSubmissionsTable.emailHash, emailHash),
    ));
  if (existing) {
    res.status(409).json({ error: "This email address has already taken part." });
    return;
  }

  // One transaction; the responseId never touches the submission row —
  // answers are unlinkable from the email by construction (spec §4.2).
  const responseId = crypto.randomUUID();
  // Day-truncated on purpose: a precise timestamp would let answers be joined
  // back to the email-bearing submission row by time correlation, breaking the
  // "cannot be traced, even by us" promise. Day resolution keeps trend analytics.
  const dayBucket = new Date(new Date().toISOString().slice(0, 10));
  try {
    await db.transaction(async (tx) => {
      await tx.insert(diagnosticSubmissionsTable).values({
        surveyId: survey.id,
        email: normalEmail,
        emailHash,
        name: name ? String(name).trim().slice(0, 150) : null,
      });
      await tx.insert(diagnosticAnswersTable).values(
        answers.map((a: any) => ({
          surveyId: survey.id,
          responseId,
          questionKey: String(a.questionKey),
          answer: a.answer ?? null,
          freeText: a.freeText ? String(a.freeText).trim() : null,
          createdAt: dayBucket,
        })),
      );
      if (yearGroup || classOrTeacher) {
        await tx.insert(diagnosticResponseMetaTable).values({
          surveyId: survey.id,
          responseId,
          yearGroup: yearGroup ? String(yearGroup).slice(0, 20) : null,
          classOrTeacher: classOrTeacher ? String(classOrTeacher).slice(0, 80) : null,
          createdAt: dayBucket,
        });
      }
    });
  } catch (e: any) {
    // Fix 1: concurrent duplicate submissions hit the unique constraint instead of
    // the pre-check; surface a clean 409 rather than an unhandled 500.
    const pgCode = e?.code ?? e?.cause?.code;
    if (pgCode === "23505") {
      res.status(409).json({ error: "This email address has already taken part." });
      return;
    }
    throw e;
  }

  // Task 5: Conversion (spec funnel stage 4): invite the participant to create an
  // account so they can see the results when the exec releases them.
  // Fire-and-forget — a failed email never fails the submission.
  void (async () => {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalEmail));
    if (!user) {
      const first = (name ? String(name).trim().split(/\s+/)[0] : "") || "Morna";
      const last = (name ? String(name).trim().split(/\s+/).slice(1).join(" ") : "") || "Parent";
      // Fix 2: use onConflictDoNothing to handle a creation race; if another
      // request inserted this email between our SELECT and INSERT, re-select.
      const inserted = await db.insert(usersTable).values({
        schoolId: survey.schoolId,
        role: "parent",
        firstName: first,
        lastName: last,
        email: normalEmail,
        membershipStatus: "pending",
      } as any).onConflictDoNothing().returning();
      if (inserted.length > 0) {
        user = inserted[0];
      } else {
        [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalEmail));
      }
    }
    // Fix 3: only send a password-reset token + invite email to users who have NO
    // password yet (i.e. never created an account). Users who already have a password
    // have an active account — they will be notified via the results-release flow in
    // M2. Sending a reset token to them would be a reset-token spam vector.
    if (!user.passwordHash) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = await bcrypt.hash(token, 12);
      const tokenLookup = crypto.createHash("sha256").update(token).digest("hex");
      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash,
        tokenLookup,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days — campaign pace, not security reset
      });
      const appUrl = process.env.APP_URL ?? "http://localhost:5000";
      const link = `${appUrl}/reset-password?token=${token}`;
      if (!process.env.RESEND_API_KEY) {
        console.log(`[community-diagnostic] DEV signup link for ${normalEmail}: ${link}`);
      }
      // Fix 7: bound toName to prevent oversized headers.
      await sendEmail({
        to: normalEmail,
        toName: String(name ? String(name) : "Morna parent").slice(0, 150),
        subject: "You're counted — create your account to see the results",
        bodyText:
          `Thank you for taking part in the community diagnostic.\n\n` +
          `Your answers are anonymous and cannot be traced back to this email — not even by us.\n\n` +
          `When the results are released, every participant will see them. Create your account now so you're ready:\n\n` +
          `${link}\n\n` +
          `This link is valid for 7 days. If you didn't take the diagnostic, you can ignore this email.`,
        trigger: "community_diagnostic_signup",
        recipientId: user.id,
        schoolId: survey.schoolId,
      }).catch(() => {});
    }
  })().catch((e) => console.error("[community-diagnostic] invite failed:", e));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id));

  res.status(201).json({ counted: true, count });
});

export default router;

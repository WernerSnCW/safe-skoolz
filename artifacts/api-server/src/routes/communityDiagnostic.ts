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
  max: 20,
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
    .where(eq(diagnosticSurveysTable.publicSlug, slug));
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }
  const instrument = (survey.instrument ?? []) as Array<{ key: string; type: string; optional?: boolean }>;
  const validKeys = new Set(instrument.map((q) => q.key));
  if (!Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ error: "Answers are required." });
    return;
  }
  for (const a of answers) {
    if (!a || !validKeys.has(a.questionKey)) {
      res.status(400).json({ error: `Unknown question: ${a?.questionKey ?? "?"}` });
      return;
    }
    if (a.answer != null && (!Number.isInteger(a.answer) || a.answer < 0 || a.answer > 10)) {
      res.status(400).json({ error: "Invalid answer value." });
      return;
    }
    if (a.freeText != null && String(a.freeText).length > 4000) {
      res.status(400).json({ error: "Answer too long." });
      return;
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
      })),
    );
    if (yearGroup || classOrTeacher) {
      await tx.insert(diagnosticResponseMetaTable).values({
        surveyId: survey.id,
        responseId,
        yearGroup: yearGroup ? String(yearGroup).slice(0, 20) : null,
        classOrTeacher: classOrTeacher ? String(classOrTeacher).slice(0, 80) : null,
      });
    }
  });

  // Conversion (spec funnel stage 4): invite the participant to create an
  // account so they can see the results when the exec releases them.
  // Fire-and-forget — a failed email never fails the submission.
  void (async () => {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalEmail));
    if (!user) {
      const first = (name ? String(name).trim().split(/\s+/)[0] : "") || "Morna";
      const last = (name ? String(name).trim().split(/\s+/).slice(1).join(" ") : "") || "Parent";
      [user] = await db.insert(usersTable).values({
        schoolId: survey.schoolId,
        role: "parent",
        firstName: first,
        lastName: last,
        email: normalEmail,
        membershipStatus: "pending",
      } as any).returning();
    }
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(token, 12);
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days — campaign pace, not security reset
    });
    const appUrl = process.env.APP_URL ?? "http://localhost:5000";
    const link = `${appUrl}/reset-password?token=${token}`;
    if (!process.env.RESEND_API_KEY) {
      console.log(`[community-diagnostic] DEV signup link for ${normalEmail}: ${link}`);
    }
    await sendEmail({
      to: normalEmail,
      toName: name ? String(name) : "Morna parent",
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
  })().catch((e) => console.error("[community-diagnostic] invite failed:", e));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id));

  res.status(201).json({ counted: true, count });
});

export default router;

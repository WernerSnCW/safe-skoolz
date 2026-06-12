import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { sql, eq, and, isNotNull, inArray } from "drizzle-orm";
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
  notificationsTable,
} from "@workspace/db";
import { PgRateLimitStore } from "../lib/rateLimitStore";
import { sendEmail } from "../lib/emailHelper";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import { isExecRole } from "../lib/memberDisplay";
import { writeAudit } from "../lib/auditHelper";

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

// A year-group (or any) segment is shown only when it has at least this many
// responses, so no individual's answers can be inferred from a thin slice (spec §4.2).
const SEGMENT_MIN = 5;
const EXEC = requireRole("pta", "coordinator", "head_teacher");

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

// Helper: load a public survey by slug or null.
async function loadSurveyBySlug(slug: string) {
  const [survey] = await db
    .select()
    .from(diagnosticSurveysTable)
    .where(and(eq(diagnosticSurveysTable.publicSlug, slug), isNotNull(diagnosticSurveysTable.publicSlug)));
  return survey ?? null;
}

// POST /d/:slug/release — exec releases results; notifies every participant who
// has an account. Idempotent: a second call returns the existing release.
router.post("/d/:slug/release", authMiddleware, EXEC, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const survey = await loadSurveyBySlug(slug);
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (u.schoolId !== survey.schoolId) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  if (survey.releasedAt != null) {
    res.json({ released: true, releasedAt: survey.releasedAt });
    return;
  }

  const releasedAt = new Date();
  await db.update(diagnosticSurveysTable).set({ releasedAt }).where(eq(diagnosticSurveysTable.id, survey.id));

  const emailRows = await db
    .select({ email: diagnosticSubmissionsTable.email })
    .from(diagnosticSubmissionsTable)
    .where(eq(diagnosticSubmissionsTable.surveyId, survey.id))
    .groupBy(diagnosticSubmissionsTable.email);
  const emails = emailRows.map((r) => r.email);
  if (emails.length) {
    const participants = await db
      .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName })
      .from(usersTable)
      .where(and(eq(usersTable.schoolId, survey.schoolId), inArray(usersTable.email, emails)));
    if (participants.length) {
      await db.insert(notificationsTable).values(
        participants.map((p) => ({
          schoolId: survey.schoolId,
          recipientId: p.id,
          trigger: "results_released",
          channel: "in_app",
          subject: "The community diagnostic results are out",
          body: "The results you took part in have been released. Log in to see them.",
        })),
      );
      const appUrl = process.env.APP_URL ?? "http://localhost:5000";
      for (const p of participants) {
        void sendEmail({
          to: p.email!,
          toName: p.firstName ?? "there",
          subject: "The community diagnostic results are out",
          bodyText:
            `Hi ${p.firstName ?? "there"},\n\n` +
            `The results of the community diagnostic you took part in have been released.\n\n` +
            `See them here: ${appUrl}/results/${slug}\n`,
          trigger: "results_released",
          recipientId: p.id,
          schoolId: survey.schoolId,
        }).catch(() => {});
      }
    }
  }

  await writeAudit({
    schoolId: survey.schoolId,
    eventType: "results_released",
    actor: u,
    targetType: "diagnostic_survey",
    targetId: survey.id,
    details: { participantsNotified: emails.length },
    req,
  });

  res.json({ released: true, releasedAt });
});

// GET /d/:slug/results — authed. Seeing results requires signing up. Non-execs
// only after release and without free-text; execs any time + shuffled free-text.
router.get("/d/:slug/results", authMiddleware, async (req, res): Promise<void> => {
  const u = (req as any).user as JwtPayload;
  const slug = String(req.params.slug).toLowerCase();
  const survey = await loadSurveyBySlug(slug);
  if (!survey || survey.status !== "active") {
    res.status(404).json({ error: "Survey not found" });
    return;
  }
  if (u.schoolId !== survey.schoolId) {
    res.status(403).json({ error: "Not your school's results" });
    return;
  }
  const isExec = isExecRole(u.role);
  if (!isExec && survey.releasedAt == null) {
    res.status(403).json({ error: "Results haven't been released yet.", released: false });
    return;
  }

  const instrument = (survey.instrument ?? []) as Array<{
    key: string; section: string; text: string; type: string; options?: string[];
  }>;
  const scaleQs = instrument.filter((q) => q.type === "scale");

  const answerRows = await db
    .select({
      questionKey: diagnosticAnswersTable.questionKey,
      answer: diagnosticAnswersTable.answer,
      yearGroup: diagnosticResponseMetaTable.yearGroup,
    })
    .from(diagnosticAnswersTable)
    .leftJoin(
      diagnosticResponseMetaTable,
      and(
        eq(diagnosticResponseMetaTable.surveyId, diagnosticAnswersTable.surveyId),
        eq(diagnosticResponseMetaTable.responseId, diagnosticAnswersTable.responseId),
      ),
    )
    .where(and(eq(diagnosticAnswersTable.surveyId, survey.id), isNotNull(diagnosticAnswersTable.answer)));

  const segCounts = await db
    .select({ yearGroup: diagnosticResponseMetaTable.yearGroup, n: sql<number>`count(*)::int` })
    .from(diagnosticResponseMetaTable)
    .where(and(eq(diagnosticResponseMetaTable.surveyId, survey.id), isNotNull(diagnosticResponseMetaTable.yearGroup)))
    .groupBy(diagnosticResponseMetaTable.yearGroup);
  const eligibleYears = new Map(
    segCounts.filter((s) => s.yearGroup != null && s.n >= SEGMENT_MIN).map((s) => [s.yearGroup as string, s.n]),
  );

  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct ${diagnosticAnswersTable.responseId})::int` })
    .from(diagnosticAnswersTable)
    .where(eq(diagnosticAnswersTable.surveyId, survey.id));

  const questions = scaleQs.map((q) => {
    const optCount = q.options?.length ?? 0;
    const overall = new Array(optCount).fill(0);
    const segDist = new Map<string, number[]>();
    for (const yg of eligibleYears.keys()) segDist.set(yg, new Array(optCount).fill(0));
    for (const row of answerRows) {
      if (row.questionKey !== q.key || row.answer == null || row.answer < 0 || row.answer >= optCount) continue;
      overall[row.answer]++;
      if (row.yearGroup && eligibleYears.has(row.yearGroup)) segDist.get(row.yearGroup)![row.answer]++;
    }
    return {
      key: q.key,
      section: q.section,
      text: q.text,
      type: "scale",
      options: q.options ?? [],
      distribution: overall,
      segments: [...segDist.entries()].map(([yearGroup, distribution]) => ({
        yearGroup,
        n: eligibleYears.get(yearGroup)!,
        distribution,
      })),
    };
  });

  let freeText: { questionKey: string; text: string }[] | undefined;
  if (isExec) {
    const textRows = await db
      .select({ questionKey: diagnosticAnswersTable.questionKey, freeText: diagnosticAnswersTable.freeText })
      .from(diagnosticAnswersTable)
      .where(and(eq(diagnosticAnswersTable.surveyId, survey.id), isNotNull(diagnosticAnswersTable.freeText)));
    const arr = textRows.map((r) => ({ questionKey: r.questionKey, text: r.freeText as string }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    freeText = arr;
  }

  res.json({
    title: survey.title,
    released: survey.releasedAt != null,
    releasedAt: survey.releasedAt,
    isExec,
    totalResponses: total,
    questions,
    ...(freeText ? { freeText } : {}),
  });
});

export default router;

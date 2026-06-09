import { Router, type IRouter, type Request, type Response } from "express";
import { authMiddleware, requireRole, type JwtPayload } from "../lib/auth";
import {
  db,
  lessonsTable,
  lessonQuizzesTable,
  lessonProgressTable,
  usersTable,
} from "@workspace/db";
import { eq, and, or, isNull, asc, sql } from "drizzle-orm";
import { writeAudit } from "../lib/auditHelper";

const router: IRouter = Router();

// Standard England year-group → key-stage mapping.
// EYFS (Reception/Nursery), Y12+, or any unrecognised year returns null →
// the lessons endpoints treat that as "no lessons available" rather than
// surfacing wrong-stage content.
export function yearGroupToKeyStage(yearGroup: string | null | undefined): string | null {
  if (!yearGroup) return null;
  const yg = yearGroup.toUpperCase().trim();
  const m = yg.match(/^Y(\d{1,2})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n === 1 || n === 2) return "KS1";
  if (n >= 3 && n <= 6) return "KS2";
  if (n >= 7 && n <= 9) return "KS3";
  if (n === 10 || n === 11) return "KS4";
  return null;
}

// Staff roles that may browse and present lessons. Staff have no year group,
// so they browse the whole catalogue by key stage and are trusted with the
// quiz answer key (the reveal control in Present mode). Pupils are NEVER in
// this list — their endpoints stay role-locked to "pupil" and answer-stripped.
const STAFF_ROLES = [
  "teacher",
  "head_of_year",
  "support_staff",
  "senco",
  "coordinator",
  "head_teacher",
] as const;

async function getUserKeyStage(userId: string): Promise<{ keyStage: string | null; yearGroup: string | null }> {
  const [row] = await db
    .select({ yearGroup: usersTable.yearGroup })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const yg = row?.yearGroup ?? null;
  return { keyStage: yearGroupToKeyStage(yg), yearGroup: yg };
}

// GET /api/lessons/progress
// IMPORTANT: must be registered BEFORE GET /api/lessons/:id so Express does
// not treat "progress" as an id parameter.
router.get(
  "/lessons/progress",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const rows = await db
      .select({
        id: lessonProgressTable.id,
        lessonId: lessonProgressTable.lessonId,
        startedAt: lessonProgressTable.startedAt,
        completedAt: lessonProgressTable.completedAt,
        quizScore: lessonProgressTable.quizScore,
      })
      .from(lessonProgressTable)
      .where(
        and(
          eq(lessonProgressTable.userId, user.userId),
          eq(lessonProgressTable.schoolId, user.schoolId)
        )
      );

    res.json(rows);
  }
);

// GET /api/lessons/staff
// Staff catalogue browse. Staff have no year group, so this returns the whole
// active catalogue (global lessons + this school's own lessons) across every
// key stage; the frontend groups by key stage / strand. No progress join —
// staff don't have pupil progress. Registered BEFORE /lessons/:id so "staff"
// is not captured as an id.
router.get(
  "/lessons/staff",
  authMiddleware,
  requireRole(...STAFF_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;

    const lessons = await db
      .select({
        id: lessonsTable.id,
        schoolId: lessonsTable.schoolId,
        keyStage: lessonsTable.keyStage,
        strand: lessonsTable.strand,
        topic: lessonsTable.topic,
        title: lessonsTable.title,
        hook: lessonsTable.hook,
        durationMinutes: lessonsTable.durationMinutes,
        sortOrder: lessonsTable.sortOrder,
      })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      )
      .orderBy(asc(lessonsTable.keyStage), asc(lessonsTable.sortOrder), asc(lessonsTable.title));

    res.json(lessons);
  }
);

// GET /api/lessons/staff/:id
// Staff lesson detail for Present mode. Unlike the pupil endpoint this is NOT
// key-stage gated (staff browse the whole catalogue) and the quiz rows KEEP
// correct_option so the teacher's "reveal answer" control works. Pupils can
// never reach this — it is locked to STAFF_ROLES.
router.get(
  "/lessons/staff/:id",
  authMiddleware,
  requireRole(...STAFF_ROLES),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);

    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const quiz = await db
      .select({
        id: lessonQuizzesTable.id,
        question: lessonQuizzesTable.question,
        optionA: lessonQuizzesTable.optionA,
        optionB: lessonQuizzesTable.optionB,
        optionC: lessonQuizzesTable.optionC,
        optionD: lessonQuizzesTable.optionD,
        correctOption: lessonQuizzesTable.correctOption,
        sortOrder: lessonQuizzesTable.sortOrder,
      })
      .from(lessonQuizzesTable)
      .where(eq(lessonQuizzesTable.lessonId, lessonId))
      .orderBy(asc(lessonQuizzesTable.sortOrder));

    res.json({ ...lesson, quiz });
  }
);

// GET /api/lessons
// Returns lessons matching the pupil's mapped key_stage, scoped to global
// (school_id IS NULL) plus the pupil's own school. Each lesson is enriched
// with the pupil's own progress row (or null).
router.get(
  "/lessons",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const { keyStage } = await getUserKeyStage(user.userId);

    if (!keyStage) {
      res.json([]);
      return;
    }

    const lessons = await db
      .select({
        id: lessonsTable.id,
        schoolId: lessonsTable.schoolId,
        keyStage: lessonsTable.keyStage,
        strand: lessonsTable.strand,
        topic: lessonsTable.topic,
        title: lessonsTable.title,
        hook: lessonsTable.hook,
        durationMinutes: lessonsTable.durationMinutes,
        sortOrder: lessonsTable.sortOrder,
      })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.keyStage, keyStage),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      )
      .orderBy(asc(lessonsTable.sortOrder), asc(lessonsTable.title));

    const progressRows = await db
      .select({
        lessonId: lessonProgressTable.lessonId,
        startedAt: lessonProgressTable.startedAt,
        completedAt: lessonProgressTable.completedAt,
        quizScore: lessonProgressTable.quizScore,
      })
      .from(lessonProgressTable)
      .where(
        and(
          eq(lessonProgressTable.userId, user.userId),
          eq(lessonProgressTable.schoolId, user.schoolId)
        )
      );

    const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

    res.json(
      lessons.map((l) => ({
        ...l,
        progress: progressByLesson.get(l.id) ?? null,
      }))
    );
  }
);

// GET /api/lessons/:id
// Returns the lesson + its quiz questions. correct_option is stripped before
// the response — pupils must never see the answer key.
router.get(
  "/lessons/:id",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);
    const { keyStage } = await getUserKeyStage(user.userId);

    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Fail closed: a pupil with no mapped key stage (null/unknown year group)
    // or one whose stage doesn't match the lesson cannot read it by guessing
    // the id. Null keyStage must 404, not pass.
    if (!keyStage || lesson.keyStage !== keyStage) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const quizRows = await db
      .select()
      .from(lessonQuizzesTable)
      .where(eq(lessonQuizzesTable.lessonId, lessonId))
      .orderBy(asc(lessonQuizzesTable.sortOrder));

    // Strip correct_option from each quiz row before returning.
    const quiz = quizRows.map((q) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      sortOrder: q.sortOrder,
    }));

    res.json({ ...lesson, quiz });
  }
);

// POST /api/lessons/:id/start
// Idempotent: ON CONFLICT DO NOTHING on the UNIQUE(user_id, lesson_id)
// constraint. Always returns 200 with the progress row (existing or newly
// created). Audit event fires once per call regardless.
router.post(
  "/lessons/:id/start",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);
    const { keyStage } = await getUserKeyStage(user.userId);

    const [lesson] = await db
      .select({ id: lessonsTable.id, keyStage: lessonsTable.keyStage })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Fail closed: pupil's mapped key stage must match the lesson's, so a
    // pupil cannot write progress against an out-of-stage lesson.
    if (!keyStage || lesson.keyStage !== keyStage) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    await db
      .insert(lessonProgressTable)
      .values({
        schoolId: user.schoolId,
        userId: user.userId,
        lessonId,
      })
      .onConflictDoNothing({ target: [lessonProgressTable.userId, lessonProgressTable.lessonId] });

    const [progress] = await db
      .select()
      .from(lessonProgressTable)
      .where(
        and(
          eq(lessonProgressTable.userId, user.userId),
          eq(lessonProgressTable.lessonId, lessonId),
          eq(lessonProgressTable.schoolId, user.schoolId)
        )
      );

    await writeAudit({
      schoolId: user.schoolId,
      eventType: "lesson_started",
      actor: user,
      targetType: "lesson",
      targetId: lessonId,
      req,
    });

    res.status(200).json(progress);
  }
);

// POST /api/lessons/:id/quiz
// Body: { answers: { [quizId]: "A" | "B" | "C" | "D" } }
// Returns: { score (0-100 int), correct, total, perQuestion: [{ quizId, correct }] }
router.post(
  "/lessons/:id/quiz",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);
    const answers = (req.body?.answers ?? {}) as Record<string, string>;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ error: "answers must be an object of { quizId: 'A'|'B'|'C'|'D' }" });
      return;
    }

    const { keyStage } = await getUserKeyStage(user.userId);

    const [lesson] = await db
      .select({ id: lessonsTable.id, keyStage: lessonsTable.keyStage })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Fail closed: pupil's key stage must match the lesson's.
    if (!keyStage || lesson.keyStage !== keyStage) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const quizRows = await db
      .select({
        id: lessonQuizzesTable.id,
        correctOption: lessonQuizzesTable.correctOption,
      })
      .from(lessonQuizzesTable)
      .where(eq(lessonQuizzesTable.lessonId, lessonId));

    const total = quizRows.length;
    if (total === 0) {
      res.status(400).json({ error: "This lesson has no quiz" });
      return;
    }

    const perQuestion = quizRows.map((q) => {
      const submitted = answers[q.id];
      const isCorrect = typeof submitted === "string" && submitted.toUpperCase() === q.correctOption.toUpperCase();
      return { quizId: q.id, correct: isCorrect };
    });
    const correct = perQuestion.filter((p) => p.correct).length;
    const score = Math.round((correct / total) * 100);

    // Ensure a progress row exists, then update its quiz_score.
    await db
      .insert(lessonProgressTable)
      .values({
        schoolId: user.schoolId,
        userId: user.userId,
        lessonId,
        quizScore: score,
      })
      .onConflictDoUpdate({
        target: [lessonProgressTable.userId, lessonProgressTable.lessonId],
        set: { quizScore: score },
      });

    await writeAudit({
      schoolId: user.schoolId,
      eventType: "lesson_quiz_submitted",
      actor: user,
      targetType: "lesson",
      targetId: lessonId,
      details: { score, correct, total },
      req,
    });

    res.status(200).json({ score, correct, total, perQuestion });
  }
);

// POST /api/lessons/:id/quiz/check
// Body: { quizId, answer: "A"|"B"|"C"|"D" }
// Returns: { correct, correctOption } for ONE question. Used by the pupil
// step-through to give immediate retrieval-practice feedback as they go,
// WITHOUT persisting a score or writing audit — the authoritative score is
// still computed and saved by the final POST /quiz submission. Because the
// pupil has already committed an answer to get here, returning correctOption
// (to highlight the right choice) does not leak the key ahead of an attempt.
router.post(
  "/lessons/:id/quiz/check",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);
    const quizId = String(req.body?.quizId ?? "");
    const answer = String(req.body?.answer ?? "");

    if (!quizId || !answer) {
      res.status(400).json({ error: "quizId and answer are required" });
      return;
    }

    const { keyStage } = await getUserKeyStage(user.userId);

    const [lesson] = await db
      .select({ id: lessonsTable.id, keyStage: lessonsTable.keyStage })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Fail closed: pupil's key stage must match the lesson's.
    if (!keyStage || lesson.keyStage !== keyStage) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const [q] = await db
      .select({ id: lessonQuizzesTable.id, correctOption: lessonQuizzesTable.correctOption })
      .from(lessonQuizzesTable)
      .where(and(eq(lessonQuizzesTable.id, quizId), eq(lessonQuizzesTable.lessonId, lessonId)));

    if (!q) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const correct = answer.toUpperCase() === q.correctOption.toUpperCase();
    res.status(200).json({ correct, correctOption: q.correctOption });
  }
);

// POST /api/lessons/:id/complete
// Marks completed_at = now() on the pupil's progress row (creating one if
// the pupil hits /complete without ever hitting /start — defensive).
router.post(
  "/lessons/:id/complete",
  authMiddleware,
  requireRole("pupil"),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user as JwtPayload;
    const lessonId = String(req.params.id);
    const { keyStage } = await getUserKeyStage(user.userId);

    const [lesson] = await db
      .select({ id: lessonsTable.id, keyStage: lessonsTable.keyStage })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.id, lessonId),
          eq(lessonsTable.active, true),
          or(isNull(lessonsTable.schoolId), eq(lessonsTable.schoolId, user.schoolId))
        )
      );

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Fail closed: pupil's key stage must match the lesson's.
    if (!keyStage || lesson.keyStage !== keyStage) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    await db
      .insert(lessonProgressTable)
      .values({
        schoolId: user.schoolId,
        userId: user.userId,
        lessonId,
        completedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [lessonProgressTable.userId, lessonProgressTable.lessonId],
        set: { completedAt: sql`now()` },
      });

    const [progress] = await db
      .select()
      .from(lessonProgressTable)
      .where(
        and(
          eq(lessonProgressTable.userId, user.userId),
          eq(lessonProgressTable.lessonId, lessonId),
          eq(lessonProgressTable.schoolId, user.schoolId)
        )
      );

    await writeAudit({
      schoolId: user.schoolId,
      eventType: "lesson_completed",
      actor: user,
      targetType: "lesson",
      targetId: lessonId,
      req,
    });

    res.status(200).json(progress);
  }
);

export default router;

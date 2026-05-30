import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

// Phase 2 ticket 6 — PSHE lessons API integration tests.
//
// Style matches pupil-login.test.ts / password-reset.test.ts / mfa.test.ts:
// real express app on a random port, real Postgres fixtures, talk to it
// with fetch. No mocks. The school row is intentionally left in place in
// afterAll because audit_log has an FK to schools and is append-only.
//
// Six tests covering the acceptance criteria:
//   1. GET /api/lessons returns only lessons matching the pupil's mapped
//      key_stage (KS3 pupil sees KS3 + global, never KS2).
//   2. GET /api/lessons/:id strips correct_option from every quiz row.
//   3. POST /api/lessons/:id/quiz computes integer percentage and persists
//      it to lesson_progress.quiz_score.
//   4. GET /api/lessons/progress is per-pupil — pupil A's rows are never
//      visible to pupil B.
//   5. POST start/quiz/complete each fire the matching writeAudit event.
//   6. POST /complete sets lesson_progress.completed_at to a real timestamp.

const TS = Date.now().toString(36);
const SCHOOL_NAME = `T12 Lessons Test ${TS}`;

let schoolId: string;
let pupilA: string;  // Y7 (KS3)
let pupilB: string;  // Y7 (KS3) — used to prove pupil-isolation
let pupilC: string;  // Y4 (KS2) — used to prove key_stage filter
let pupilD: string;  // null year_group — used to prove fail-closed behaviour
let globalLessonId: string;
let ks3LessonId: string;
let ks2LessonId: string;
let quizId1: string;
let quizId2: string;
let quizId3: string;
let server: Server;
let baseUrl: string;

function tokenFor(userId: string): string {
  return jwt.sign(
    { userId, schoolId, role: "pupil" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
}

function tokenForRole(userId: string, role: string): string {
  return jwt.sign(
    { userId, schoolId, role },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
}

beforeAll(async () => {
  process.env.JWT_SECRET ||= "test-secret";

  const sch = await pool.query<{ id: string }>(
    `INSERT INTO schools (name) VALUES ($1) RETURNING id`,
    [SCHOOL_NAME]
  );
  schoolId = sch.rows[0].id;

  const mkPupil = async (yg: string | null) => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO users (school_id, role, first_name, last_name, year_group, active)
       VALUES ($1, 'pupil', 'T12', $2, $3, true) RETURNING id`,
      [schoolId, `Pupil-${yg ?? "null"}`, yg]
    );
    return r.rows[0].id;
  };
  pupilA = await mkPupil("Y7");
  pupilB = await mkPupil("Y7");
  pupilC = await mkPupil("Y4");
  pupilD = await mkPupil(null);

  // Three lessons:
  //  - global KS3 (school_id NULL)        → visible to KS3 pupils everywhere
  //  - school-specific KS3                → visible to KS3 pupils in this school
  //  - school-specific KS2                → visible only to KS2 pupils
  const g = await pool.query<{ id: string }>(
    `INSERT INTO lessons (school_id, key_stage, strand, topic, title, hook, body, duration_minutes, active, sort_order)
     VALUES (NULL, 'KS3', 'wellbeing', 'sleep', $1, 'hook-g', 'body-g', 20, true, 1) RETURNING id`,
    [`T12 Global KS3 ${TS}`]
  );
  globalLessonId = g.rows[0].id;

  const k3 = await pool.query<{ id: string }>(
    `INSERT INTO lessons (school_id, key_stage, strand, topic, title, hook, body, duration_minutes, active, sort_order)
     VALUES ($1, 'KS3', 'wellbeing', 'stress', $2, 'hook-k3', 'body-k3', 25, true, 2) RETURNING id`,
    [schoolId, `T12 School KS3 ${TS}`]
  );
  ks3LessonId = k3.rows[0].id;

  const k2 = await pool.query<{ id: string }>(
    `INSERT INTO lessons (school_id, key_stage, strand, topic, title, hook, body, duration_minutes, active, sort_order)
     VALUES ($1, 'KS2', 'wellbeing', 'feelings', $2, 'hook-k2', 'body-k2', 15, true, 3) RETURNING id`,
    [schoolId, `T12 School KS2 ${TS}`]
  );
  ks2LessonId = k2.rows[0].id;

  // Three quiz questions on the school KS3 lesson, correct answers A, B, C.
  const q1 = await pool.query<{ id: string }>(
    `INSERT INTO lesson_quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
     VALUES ($1, 'Q1?', 'a', 'b', 'c', 'd', 'A', 1) RETURNING id`,
    [ks3LessonId]
  );
  quizId1 = q1.rows[0].id;
  const q2 = await pool.query<{ id: string }>(
    `INSERT INTO lesson_quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
     VALUES ($1, 'Q2?', 'a', 'b', 'c', 'd', 'B', 2) RETURNING id`,
    [ks3LessonId]
  );
  quizId2 = q2.rows[0].id;
  const q3 = await pool.query<{ id: string }>(
    `INSERT INTO lesson_quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
     VALUES ($1, 'Q3?', 'a', 'b', 'c', 'd', 'C', 3) RETURNING id`,
    [ks3LessonId]
  );
  quizId3 = q3.rows[0].id;

  const { default: app } = await import("../app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${(addr as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await pool.query(`DELETE FROM lesson_progress WHERE school_id = $1`, [schoolId]);
  await pool.query(`DELETE FROM lesson_quizzes WHERE lesson_id IN ($1, $2, $3)`, [
    globalLessonId,
    ks3LessonId,
    ks2LessonId,
  ]);
  await pool.query(`DELETE FROM lessons WHERE id IN ($1, $2, $3)`, [
    globalLessonId,
    ks3LessonId,
    ks2LessonId,
  ]);
  await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4)`, [pupilA, pupilB, pupilC, pupilD]);
  // school row left in place — audit_log rows from this test reference it
  // via FK and audit_log is append-only.
});

describe("PSHE lessons API", () => {
  it("GET /api/lessons returns only lessons matching the pupil's mapped key_stage (and global)", async () => {
    // Y7 pupil → KS3 → should see global KS3 + school KS3, NOT school KS2.
    const resKs3 = await fetch(`${baseUrl}/api/lessons`, {
      headers: { authorization: `Bearer ${tokenFor(pupilA)}` },
    });
    expect(resKs3.status).toBe(200);
    const ks3List = (await resKs3.json()) as Array<{ id: string; keyStage: string }>;
    const ks3Ids = new Set(ks3List.map((l) => l.id));
    expect(ks3Ids.has(globalLessonId)).toBe(true);
    expect(ks3Ids.has(ks3LessonId)).toBe(true);
    expect(ks3Ids.has(ks2LessonId)).toBe(false);
    expect(ks3List.every((l) => l.keyStage === "KS3")).toBe(true);

    // Y4 pupil → KS2 → should see school KS2, NOT KS3 lessons.
    const resKs2 = await fetch(`${baseUrl}/api/lessons`, {
      headers: { authorization: `Bearer ${tokenFor(pupilC)}` },
    });
    expect(resKs2.status).toBe(200);
    const ks2List = (await resKs2.json()) as Array<{ id: string; keyStage: string }>;
    const ks2Ids = new Set(ks2List.map((l) => l.id));
    expect(ks2Ids.has(ks2LessonId)).toBe(true);
    expect(ks2Ids.has(ks3LessonId)).toBe(false);
    expect(ks2Ids.has(globalLessonId)).toBe(false);
  });

  it("GET /api/lessons/:id strips correct_option from every quiz row", async () => {
    const res = await fetch(`${baseUrl}/api/lessons/${ks3LessonId}`, {
      headers: { authorization: `Bearer ${tokenFor(pupilA)}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { quiz: Array<Record<string, unknown>> };
    expect(body.quiz.length).toBe(3);
    for (const q of body.quiz) {
      expect(q).not.toHaveProperty("correctOption");
      expect(q).not.toHaveProperty("correct_option");
      expect(q).toHaveProperty("question");
      expect(q).toHaveProperty("optionA");
      expect(q).toHaveProperty("optionD");
    }
  });

  it("POST /api/lessons/:id/quiz computes integer percentage and writes to lesson_progress.quiz_score", async () => {
    // Pupil A answers Q1=A (correct), Q2=A (wrong), Q3=C (correct) → 2/3 = 67%.
    const res = await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/quiz`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenFor(pupilA)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        answers: { [quizId1]: "A", [quizId2]: "A", [quizId3]: "C" },
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      score: number;
      correct: number;
      total: number;
      perQuestion: Array<{ quizId: string; correct: boolean }>;
    };
    expect(body.score).toBe(67);
    expect(body.correct).toBe(2);
    expect(body.total).toBe(3);
    expect(Number.isInteger(body.score)).toBe(true);
    const perById = new Map(body.perQuestion.map((p) => [p.quizId, p.correct]));
    expect(perById.get(quizId1)).toBe(true);
    expect(perById.get(quizId2)).toBe(false);
    expect(perById.get(quizId3)).toBe(true);

    const row = await pool.query<{ quiz_score: number }>(
      `SELECT quiz_score FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2`,
      [pupilA, ks3LessonId]
    );
    expect(row.rows[0]?.quiz_score).toBe(67);
  });

  it("GET /api/lessons/progress is per-pupil — pupil A's row is invisible to pupil B", async () => {
    // The previous test created a progress row for pupil A on ks3LessonId.
    // Pupil B has done nothing → must see an empty array.
    const resB = await fetch(`${baseUrl}/api/lessons/progress`, {
      headers: { authorization: `Bearer ${tokenFor(pupilB)}` },
    });
    expect(resB.status).toBe(200);
    const bRows = (await resB.json()) as Array<{ lessonId: string }>;
    expect(bRows.length).toBe(0);

    // Pupil A still sees their own row.
    const resA = await fetch(`${baseUrl}/api/lessons/progress`, {
      headers: { authorization: `Bearer ${tokenFor(pupilA)}` },
    });
    expect(resA.status).toBe(200);
    const aRows = (await resA.json()) as Array<{ lessonId: string }>;
    expect(aRows.some((r) => r.lessonId === ks3LessonId)).toBe(true);
  });

  it("POST start / quiz / complete each fire the matching writeAudit event", async () => {
    // Use the global lesson (no quiz) for start + complete, and the KS3 lesson
    // for quiz, so the start/complete events have a distinct targetId we can
    // query without collision with audit rows from the quiz-scoring test.
    const startRes = await fetch(`${baseUrl}/api/lessons/${globalLessonId}/start`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokenFor(pupilA)}` },
    });
    expect(startRes.status).toBe(200);

    const completeRes = await fetch(`${baseUrl}/api/lessons/${globalLessonId}/complete`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokenFor(pupilA)}` },
    });
    expect(completeRes.status).toBe(200);

    const audits = await pool.query<{ event_type: string; target_id: string; actor_id: string }>(
      `SELECT event_type, target_id, actor_id FROM audit_log
       WHERE school_id = $1 AND actor_id = $2
         AND event_type IN ('lesson_started', 'lesson_quiz_submitted', 'lesson_completed')`,
      [schoolId, pupilA]
    );
    const eventTypes = new Set(audits.rows.map((r) => r.event_type));
    expect(eventTypes.has("lesson_started")).toBe(true);
    expect(eventTypes.has("lesson_quiz_submitted")).toBe(true);
    expect(eventTypes.has("lesson_completed")).toBe(true);

    // The start + complete events for the global lesson must reference its id.
    const startedFor = audits.rows.filter(
      (r) => r.event_type === "lesson_started" && r.target_id === globalLessonId
    );
    const completedFor = audits.rows.filter(
      (r) => r.event_type === "lesson_completed" && r.target_id === globalLessonId
    );
    expect(startedFor.length).toBeGreaterThan(0);
    expect(completedFor.length).toBeGreaterThan(0);
  });

  it("POST /api/lessons/:id/complete sets lesson_progress.completed_at to a real timestamp", async () => {
    // The previous test completed globalLessonId for pupil A.
    const row = await pool.query<{ completed_at: Date | null }>(
      `SELECT completed_at FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2`,
      [pupilA, globalLessonId]
    );
    expect(row.rows[0]?.completed_at).not.toBeNull();
    expect(row.rows[0]?.completed_at instanceof Date).toBe(true);
  });

  // Ticket 6.5 — auth gaps surfaced by architect review of ticket 7.

  it("non-pupil roles are rejected with 403 on every lessons endpoint", async () => {
    // requireRole rejects on the JWT role before any DB lookup, so reusing
    // pupilA's id with a coordinator role is enough to prove the guard.
    const h = { authorization: `Bearer ${tokenForRole(pupilA, "coordinator")}` };
    const jsonH = { ...h, "content-type": "application/json" };

    expect((await fetch(`${baseUrl}/api/lessons`, { headers: h })).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/lessons/progress`, { headers: h })).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/lessons/${ks3LessonId}`, { headers: h })).status).toBe(403);
    expect(
      (await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/start`, { method: "POST", headers: h })).status
    ).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/quiz`, {
          method: "POST",
          headers: jsonH,
          body: JSON.stringify({ answers: {} }),
        })
      ).status
    ).toBe(403);
    expect(
      (await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/complete`, { method: "POST", headers: h })).status
    ).toBe(403);
  });

  it("a pupil outside the lesson's key stage gets 404 on read and on every write", async () => {
    // pupilC is Y4 (KS2); ks3LessonId is KS3 → all five lesson-id endpoints 404.
    const h = { authorization: `Bearer ${tokenFor(pupilC)}` };

    expect((await fetch(`${baseUrl}/api/lessons/${ks3LessonId}`, { headers: h })).status).toBe(404);
    expect(
      (await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/start`, { method: "POST", headers: h })).status
    ).toBe(404);
    expect(
      (
        await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/quiz`, {
          method: "POST",
          headers: { ...h, "content-type": "application/json" },
          body: JSON.stringify({ answers: { [quizId1]: "A" } }),
        })
      ).status
    ).toBe(404);
    expect(
      (await fetch(`${baseUrl}/api/lessons/${ks3LessonId}/complete`, { method: "POST", headers: h })).status
    ).toBe(404);

    // No progress row may have leaked through for pupil C on the KS3 lesson.
    const row = await pool.query(
      `SELECT 1 FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2`,
      [pupilC, ks3LessonId]
    );
    expect(row.rowCount).toBe(0);
  });

  it("a pupil with an unmapped year group fails closed (empty list, 404 on detail/writes)", async () => {
    // pupilD has a null year_group → keyStage is null → must never see content.
    const h = { authorization: `Bearer ${tokenFor(pupilD)}` };

    const listRes = await fetch(`${baseUrl}/api/lessons`, { headers: h });
    expect(listRes.status).toBe(200);
    expect(((await listRes.json()) as unknown[]).length).toBe(0);

    expect((await fetch(`${baseUrl}/api/lessons/${globalLessonId}`, { headers: h })).status).toBe(404);
    expect(
      (await fetch(`${baseUrl}/api/lessons/${globalLessonId}/start`, { method: "POST", headers: h })).status
    ).toBe(404);
  });
});

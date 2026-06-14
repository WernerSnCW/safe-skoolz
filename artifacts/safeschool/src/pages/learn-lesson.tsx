import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { parseLessonSlides } from "@/lib/lessonSlides";
import { LessonSlideView } from "@/components/lessons/LessonSlideView";

type QuizQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  sortOrder: number;
};

type LessonDetail = {
  id: string;
  schoolId: string | null;
  keyStage: string;
  strand: string;
  topic: string;
  title: string;
  hook: string;
  body: string;
  durationMinutes: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  quiz: QuizQuestion[];
};

type QuizResult = {
  score: number;
  correct: number;
  total: number;
  perQuestion: { quizId: string; correct: boolean }[];
};

type Progress = {
  id: string;
  startedAt: string | null;
  completedAt: string | null;
  quizScore: number | null;
};

type OptionKey = "A" | "B" | "C" | "D";
type Answers = Record<string, OptionKey>;
type CheckResult = { correct: boolean; correctOption: OptionKey };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("safeschool_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchLesson(id: string): Promise<LessonDetail> {
  const res = await fetch(`/api/lessons/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load lesson (${res.status})`);
  return res.json();
}

export default function LearnLessonPage() {
  const { t } = useTranslation("learn");
  const { user } = useAuth();
  const [, params] = useRoute("/learn/:id");
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);

  const isPupil = user?.role === "pupil";

  const { data: lesson, isLoading, isError } = useQuery<LessonDetail>({
    queryKey: ["/api/lessons", id],
    queryFn: () => fetchLesson(id),
    enabled: !!id && isPupil,
  });

  const slides = useMemo(() => (lesson ? parseLessonSlides(lesson.body) : []), [lesson]);
  const quiz = lesson?.quiz ?? [];

  // Linear step model: [slides...] → [quiz questions...] → results.
  // step in [0, slides.length)                      → a slide
  // step in [slides.length, slides.length+quiz)     → a quiz question
  // step === slides.length + quiz.length            → results / completion
  const totalSteps = slides.length + quiz.length + 1;
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState<Record<string, CheckResult>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  // Fire /start once on mount (idempotent server-side).
  useEffect(() => {
    if (!isPupil || !id || startedRef.current) return;
    startedRef.current = true;
    fetch(`/api/lessons/${id}/start`, { method: "POST", headers: authHeaders() })
      .then((res) => {
        if (!res.ok) {
          startedRef.current = false;
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      })
      .catch(() => {
        startedRef.current = false;
      });
  }, [id, isPupil, queryClient]);

  const checkMutation = useMutation({
    mutationFn: async (vars: { quizId: string; answer: OptionKey }): Promise<CheckResult> => {
      const res = await fetch(`/api/lessons/${id}/quiz/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error(`Check failed (${res.status})`);
      return res.json();
    },
    onSuccess: (r, vars) => {
      setChecked((c) => ({ ...c, [vars.quizId]: r }));
    },
  });

  const quizMutation = useMutation({
    mutationFn: async (a: Answers): Promise<QuizResult> => {
      const res = await fetch(`/api/lessons/${id}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ answers: a }),
      });
      if (!res.ok) throw new Error(`Quiz submit failed (${res.status})`);
      return res.json();
    },
    onSuccess: (r) => {
      setResult(r);
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (): Promise<Progress> => {
      const res = await fetch(`/api/lessons/${id}/complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Complete failed (${res.status})`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      setLocation("/learn");
    },
  });

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goNext = useCallback(() => setStep((s) => Math.min(totalSteps - 1, s + 1)), [totalSteps]);

  // When entering the results step, submit all answers once to persist the
  // authoritative score (existing endpoint + audit). Per-question feedback was
  // already shown live via /quiz/check.
  const onResults = step === slides.length + quiz.length;
  useEffect(() => {
    if (!lesson) return;
    if (onResults && quiz.length > 0 && !result && !quizMutation.isPending) {
      quizMutation.mutate(answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResults, lesson]);

  // Keyboard navigation for slides (left/right). Disabled on quiz/results steps
  // so arrow keys don't skip an unanswered question.
  const onSlide = step < slides.length;
  useEffect(() => {
    if (!onSlide) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSlide, goNext, goBack]);

  if (!isPupil) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-2">{t("detail.accessDeniedTitle")}</h1>
        <p className="text-muted-foreground">{t("detail.accessDeniedBody")}</p>
        <Link
          href="/learn"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLearn")}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center">
        <p className="text-muted-foreground">{t("detail.loadError")}</p>
        <Link
          href="/learn"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLearn")}
        </Link>
      </div>
    );
  }

  const slide = onSlide ? slides[step] : null;
  const quizIndex = step - slides.length;
  const onQuiz = quizIndex >= 0 && quizIndex < quiz.length;
  const currentQ = onQuiz ? quiz[quizIndex] : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          data-testid="back-to-learn"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLearn")}
        </Link>
        <span
          className="text-sm font-semibold text-muted-foreground tabular-nums"
          data-testid="step-counter"
        >
          {Math.min(step + 1, totalSteps)} / {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{lesson.title}</h1>
      </header>

      {/* SLIDE STEP */}
      {slide && (
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 min-h-[14rem]" data-testid="lesson-slide">
          <LessonSlideView slide={slide} />
        </section>
      )}

      {/* QUIZ STEP — one question at a time with immediate feedback */}
      {currentQ && (
        <QuizStep
          key={currentQ.id}
          q={currentQ}
          index={quizIndex}
          total={quiz.length}
          selected={answers[currentQ.id] ?? null}
          check={checked[currentQ.id] ?? null}
          pending={checkMutation.isPending}
          onSelect={(k) =>
            setAnswers((a) => ({ ...a, [currentQ.id]: k }))
          }
          onCheck={() => {
            const a = answers[currentQ.id];
            if (a) checkMutation.mutate({ quizId: currentQ.id, answer: a });
          }}
          t={t}
        />
      )}

      {/* RESULTS / COMPLETION STEP */}
      {onResults && (
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 text-center" data-testid="lesson-results">
          <PartyPopper className="mx-auto h-10 w-10 text-violet-500" />
          <h2 className="text-2xl font-bold tracking-tight">{t("detail.plenaryTitle")}</h2>
          {quiz.length > 0 ? (
            quizMutation.isPending || !result ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div
                className="rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-400/10 border border-border p-5"
                data-testid="quiz-result"
              >
                <p className="text-sm text-muted-foreground">{t("detail.yourScore")}</p>
                <p className="text-4xl font-bold">
                  {result.score}%{" "}
                  <span className="text-base font-medium text-muted-foreground">
                    {t("detail.outOf", { correct: result.correct, total: result.total })}
                  </span>
                </p>
              </div>
            )
          ) : (
            <p className="text-muted-foreground">{t("detail.noQuizDone")}</p>
          )}
          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || (quiz.length > 0 && !result)}
            data-testid="lesson-complete"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50"
          >
            {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("detail.markComplete")}
          </button>
        </section>
      )}

      {/* NAV CONTROLS */}
      {!onResults && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goBack}
            disabled={step === 0}
            data-testid="step-back"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold transition disabled:opacity-40 hover:border-foreground/40"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("detail.back")}
          </button>

          {onSlide ? (
            <button
              onClick={goNext}
              data-testid="step-next"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
            >
              {t("detail.next")}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            // On a quiz step: advancing is only allowed once the question is
            // checked (immediate-feedback gate).
            <button
              onClick={goNext}
              disabled={!currentQ || !checked[currentQ.id]}
              data-testid="quiz-next"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-40"
            >
              {quizIndex === quiz.length - 1 ? t("detail.seeResults") : t("detail.nextQuestion")}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuizStep({
  q,
  index,
  total,
  selected,
  check,
  pending,
  onSelect,
  onCheck,
  t,
}: {
  q: QuizQuestion;
  index: number;
  total: number;
  selected: OptionKey | null;
  check: CheckResult | null;
  pending: boolean;
  onSelect: (k: OptionKey) => void;
  onCheck: () => void;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const opts: { key: OptionKey; label: string }[] = [
    { key: "A", label: q.optionA },
    { key: "B", label: q.optionB },
    { key: "C", label: q.optionC },
    { key: "D", label: q.optionD },
  ];
  const locked = !!check;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5" data-testid="lesson-quiz">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
          {t("detail.quizProgress", { current: index + 1, total })}
        </span>
      </div>
      <h2 className="text-xl font-bold leading-snug">{q.question}</h2>

      <div className="grid gap-2.5">
        {opts.map((o) => {
          const isSelected = selected === o.key;
          const isCorrect = check?.correctOption === o.key;
          const isWrongPick = locked && isSelected && !check?.correct;
          let cls = "border-border hover:border-foreground/40";
          if (locked) {
            if (isCorrect) cls = "border-success/30 bg-success/10";
            else if (isWrongPick) cls = "border-rose-400 bg-rose-50 dark:bg-rose-950/30";
            else cls = "border-border opacity-60";
          } else if (isSelected) {
            cls = "border-violet-400 bg-violet-50 dark:bg-violet-950/30";
          }
          return (
            <button
              key={o.key}
              type="button"
              disabled={locked}
              onClick={() => onSelect(o.key)}
              data-testid={`quiz-option-${o.key}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${cls} ${
                locked ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                {o.key}
              </span>
              <span className="text-sm flex-1">{o.label}</span>
              {locked && isCorrect && <CheckCircle2 className="h-5 w-5 text-success" />}
              {locked && isWrongPick && <XCircle className="h-5 w-5 text-rose-600" />}
            </button>
          );
        })}
      </div>

      {!locked ? (
        <button
          onClick={onCheck}
          disabled={!selected || pending}
          data-testid="quiz-check"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("detail.checkAnswer")}
        </button>
      ) : (
        <div
          data-testid="quiz-feedback"
          className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl ${
            check?.correct
              ? "bg-success/10 text-success"
              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
          }`}
        >
          {check?.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {check?.correct ? t("detail.correct") : t("detail.incorrect")}
        </div>
      )}
    </section>
  );
}

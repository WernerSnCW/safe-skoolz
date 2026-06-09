import { useEffect, useMemo, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { parseLessonSlides, type LessonSlide } from "@/lib/lessonSlides";
import { LessonSlideView } from "@/components/lessons/LessonSlideView";

type OptionKey = "A" | "B" | "C" | "D";

type QuizQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionKey;
  sortOrder: number;
};

type StaffLessonDetail = {
  id: string;
  keyStage: string;
  strand: string;
  topic: string;
  title: string;
  hook: string;
  body: string;
  durationMinutes: number;
  quiz: QuizQuestion[];
};

const STAFF_ROLES = new Set([
  "teacher",
  "head_of_year",
  "support_staff",
  "senco",
  "coordinator",
  "head_teacher",
]);

type Step =
  | { type: "cover" }
  | { type: "slide"; slide: LessonSlide }
  | { type: "quiz"; q: QuizQuestion }
  | { type: "end" };

async function fetchStaffLesson(id: string): Promise<StaffLessonDetail> {
  const token = localStorage.getItem("safeschool_token");
  const res = await fetch(`/api/lessons/staff/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load lesson (${res.status})`);
  return res.json();
}

export default function LearnPresentPage() {
  const { t } = useTranslation("learn");
  const { user } = useAuth();
  const [, params] = useRoute("/lessons/present/:id");
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const isStaff = !!user && STAFF_ROLES.has(user.role);

  const { data: lesson, isLoading, isError } = useQuery<StaffLessonDetail>({
    queryKey: ["/api/lessons/staff", id],
    queryFn: () => fetchStaffLesson(id),
    enabled: !!id && isStaff,
  });

  const steps = useMemo<Step[]>(() => {
    if (!lesson) return [];
    const slides = parseLessonSlides(lesson.body);
    return [
      { type: "cover" },
      ...slides.map((slide) => ({ type: "slide", slide }) as Step),
      ...lesson.quiz.map((q) => ({ type: "quiz", q }) as Step),
      { type: "end" } as Step,
    ];
  }, [lesson]);

  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const total = steps.length;

  const exit = useCallback(() => setLocation("/lessons"), [setLocation]);
  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goNext = useCallback(
    () => setStep((s) => Math.min(total - 1, s + 1)),
    [total]
  );

  useEffect(() => {
    if (total === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        exit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [total, goNext, goBack, exit]);

  if (!isStaff) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-2">{t("staff.accessDeniedTitle")}</h1>
        <p className="text-muted-foreground">{t("staff.accessDeniedBody")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !lesson || total === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">{t("detail.loadError")}</p>
        <button
          onClick={exit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("staff.exitPresent")}
        </button>
      </div>
    );
  }

  const current = steps[step];
  const quizCount = lesson.quiz.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-border">
        <button
          onClick={exit}
          data-testid="present-exit"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-5 w-5" />
          {t("staff.exitPresent")}
        </button>
        <div className="text-sm font-medium text-muted-foreground truncate hidden sm:block">
          {lesson.title}
        </div>
        <span
          className="text-sm font-bold text-muted-foreground tabular-nums"
          data-testid="present-counter"
        >
          {step + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-sky-500 transition-all"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      {/* Slide stage */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 sm:px-10 py-10 sm:py-16 min-h-full flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
            >
              {current.type === "cover" && (
                <div className="space-y-5 text-center" data-testid="present-cover">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    {lesson.keyStage}
                  </span>
                  <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
                    {lesson.title}
                  </h1>
                  <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                    {lesson.hook}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t("pupil.minutes", { count: lesson.durationMinutes })}
                  </div>
                </div>
              )}

              {current.type === "slide" && (
                <div data-testid="present-slide">
                  <LessonSlideView slide={current.slide} size="large" />
                </div>
              )}

              {current.type === "quiz" && (
                <PresentQuiz
                  q={current.q}
                  index={lesson.quiz.findIndex((x) => x.id === current.q.id)}
                  total={quizCount}
                  revealed={!!revealed[current.q.id]}
                  onReveal={() => setRevealed((r) => ({ ...r, [current.q.id]: true }))}
                  t={t}
                />
              )}

              {current.type === "end" && (
                <div className="space-y-5 text-center" data-testid="present-end">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                    {t("staff.endTitle")}
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {t("staff.endBody")}
                  </p>
                  <button
                    onClick={exit}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold transition"
                  >
                    {t("staff.exitPresent")}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-border">
        <button
          onClick={goBack}
          disabled={step === 0}
          data-testid="present-back"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold transition disabled:opacity-40 hover:border-foreground/40"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.back")}
        </button>
        <button
          onClick={goNext}
          disabled={step === total - 1}
          data-testid="present-next"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition disabled:opacity-40"
        >
          {t("detail.next")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PresentQuiz({
  q,
  index,
  total,
  revealed,
  onReveal,
  t,
}: {
  q: QuizQuestion;
  index: number;
  total: number;
  revealed: boolean;
  onReveal: () => void;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const opts: { key: OptionKey; label: string }[] = [
    { key: "A", label: q.optionA },
    { key: "B", label: q.optionB },
    { key: "C", label: q.optionC },
    { key: "D", label: q.optionD },
  ];
  return (
    <div className="space-y-6" data-testid="present-quiz">
      <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300">
        {t("detail.quizProgress", { current: index + 1, total })}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold leading-tight">{q.question}</h2>
      <div className="grid gap-3">
        {opts.map((o) => {
          const isCorrect = revealed && q.correctOption === o.key;
          return (
            <div
              key={o.key}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-lg transition ${
                isCorrect
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-border"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold">
                {o.key}
              </span>
              <span className="flex-1">{o.label}</span>
              {isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            </div>
          );
        })}
      </div>
      {!revealed ? (
        <button
          onClick={onReveal}
          data-testid="present-reveal"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition"
        >
          <Eye className="h-5 w-5" />
          {t("staff.revealAnswer")}
        </button>
      ) : (
        <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
          {t("staff.answerIs", { option: q.correctOption })}
        </p>
      )}
    </div>
  );
}

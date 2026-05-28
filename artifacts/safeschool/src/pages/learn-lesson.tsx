import { useEffect, useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

type Answers = Record<string, "A" | "B" | "C" | "D">;

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

  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const isPupil = user?.role === "pupil";

  const { data: lesson, isLoading, isError } = useQuery<LessonDetail>({
    queryKey: ["/api/lessons", id],
    queryFn: () => fetchLesson(id),
    enabled: !!id && isPupil,
  });

  // Fire /start once on mount (idempotent server-side).
  useEffect(() => {
    if (!isPupil || !id || startedRef.current) return;
    startedRef.current = true;
    fetch(`/api/lessons/${id}/start`, { method: "POST", headers: authHeaders() })
      .then((res) => {
        if (!res.ok) {
          // fetch resolves on HTTP 4xx/5xx — re-allow retry on next mount.
          startedRef.current = false;
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
      })
      .catch(() => {
        startedRef.current = false;
      });
  }, [id, isPupil, queryClient]);

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

  if (!isPupil) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-2">{t("detail.accessDeniedTitle")}</h1>
        <p className="text-muted-foreground">{t("detail.accessDeniedBody")}</p>
        <Link href="/learn" className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold">
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
        <Link href="/learn" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLearn")}
        </Link>
      </div>
    );
  }

  const allAnswered = lesson.quiz.length > 0 && lesson.quiz.every((q) => answers[q.id]);
  const hasQuiz = lesson.quiz.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          data-testid="back-to-learn"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detail.backToLearn")}
        </Link>
      </div>

      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{lesson.hook}</p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {t("pupil.minutes", { count: lesson.durationMinutes })}
        </div>
      </header>

      <article className="prose prose-stone dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body}</ReactMarkdown>
      </article>

      {hasQuiz && (
        <section className="rounded-2xl border border-border bg-card p-6 space-y-6" data-testid="lesson-quiz">
          <h2 className="text-2xl font-bold tracking-tight">{t("detail.quizTitle")}</h2>

          {lesson.quiz.map((q, qi) => {
            const perQ = result?.perQuestion.find((p) => p.quizId === q.id);
            const opts: { key: "A" | "B" | "C" | "D"; label: string }[] = [
              { key: "A", label: q.optionA },
              { key: "B", label: q.optionB },
              { key: "C", label: q.optionC },
              { key: "D", label: q.optionD },
            ];
            return (
              <fieldset key={q.id} className="space-y-3 border-0 p-0 m-0">
                <legend className="font-semibold leading-snug">
                  <span className="text-muted-foreground mr-2">{qi + 1}.</span>
                  {q.question}
                </legend>
                <div className="grid gap-2">
                  {opts.map((o) => {
                    const selected = answers[q.id] === o.key;
                    const disabled = !!result;
                    return (
                      <label
                        key={o.key}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                          selected
                            ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
                            : "border-border hover:border-foreground/40"
                        } ${disabled ? "cursor-default" : ""}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={o.key}
                          checked={selected}
                          disabled={disabled}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                          className="h-4 w-4"
                          data-testid={`quiz-${q.id}-${o.key}`}
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
                {perQ && (
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${
                      perQ.correct
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {perQ.correct ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {perQ.correct ? t("detail.correct") : t("detail.incorrect")}
                  </div>
                )}
              </fieldset>
            );
          })}

          {!result ? (
            <button
              onClick={() => quizMutation.mutate(answers)}
              disabled={!allAnswered || quizMutation.isPending}
              data-testid="quiz-submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quizMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("detail.submitQuiz")}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-400/10 border border-border p-5" data-testid="quiz-result">
                <p className="text-sm text-muted-foreground">{t("detail.yourScore")}</p>
                <p className="text-3xl font-bold">
                  {result.score}%{" "}
                  <span className="text-base font-medium text-muted-foreground">
                    {t("detail.outOf", { correct: result.correct, total: result.total })}
                  </span>
                </p>
              </div>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="lesson-complete"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50"
              >
                {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("detail.markComplete")}
              </button>
            </div>
          )}
        </section>
      )}

      {!hasQuiz && (
        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          data-testid="lesson-complete"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50"
        >
          {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("detail.markComplete")}
        </button>
      )}
    </div>
  );
}

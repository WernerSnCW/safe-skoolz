import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Clock, CheckCircle2, CircleDot, Circle, BookOpenText } from "lucide-react";
import { motion } from "framer-motion";

type Progress = {
  id: string;
  startedAt: string | null;
  completedAt: string | null;
  quizScore: number | null;
};

type LessonListItem = {
  id: string;
  schoolId: string | null;
  keyStage: string;
  strand: string;
  topic: string;
  title: string;
  hook: string;
  durationMinutes: number;
  sortOrder: number;
  progress: Progress | null;
};

const STRAND_KEYS = ["me_and_my_wellbeing", "me_and_others", "me_and_the_world"] as const;
type StrandKey = (typeof STRAND_KEYS)[number];
type StrandTab = "all" | StrandKey;

const STRAND_ACCENT: Record<StrandKey, { tab: string; card: string; chip: string }> = {
  me_and_my_wellbeing: {
    tab: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    card: "from-emerald-400/15 to-teal-400/5",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  me_and_others: {
    tab: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    card: "from-indigo-400/15 to-sky-400/5",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  me_and_the_world: {
    tab: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    card: "from-amber-400/15 to-orange-400/5",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
};

function statusOf(p: Progress | null): "notStarted" | "inProgress" | "completed" {
  if (!p) return "notStarted";
  if (p.completedAt) return "completed";
  return "inProgress";
}

const STATUS_STYLE: Record<"notStarted" | "inProgress" | "completed", { chip: string; Icon: typeof Circle }> = {
  notStarted: {
    chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    Icon: Circle,
  },
  inProgress: {
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    Icon: CircleDot,
  },
  completed: {
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
};

async function fetchLessons(): Promise<LessonListItem[]> {
  const token = localStorage.getItem("safeschool_token");
  const res = await fetch("/api/lessons", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load lessons (${res.status})`);
  return res.json();
}

export default function PupilLearn() {
  const { t } = useTranslation("learn");
  const [activeStrand, setActiveStrand] = useState<StrandTab>("all");

  const { data: lessons, isLoading, isError } = useQuery<LessonListItem[]>({
    queryKey: ["/api/lessons"],
    queryFn: fetchLessons,
  });

  const visible = (lessons ?? []).filter((l) => activeStrand === "all" || l.strand === activeStrand);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 via-fuchsia-400/10 to-pink-400/10 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-pink-500/10 p-6 sm:p-8 border border-border">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow-sm">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("pupil.heroTitle")}</h1>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("pupil.heroSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Strand tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveStrand("all")}
          data-testid="strand-tab-all"
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
            activeStrand === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-foreground border-border hover:border-foreground/40"
          }`}
        >
          {t("pupil.strandAll")}
        </button>
        {STRAND_KEYS.map((k) => {
          const active = activeStrand === k;
          const accent = STRAND_ACCENT[k];
          return (
            <button
              key={k}
              onClick={() => setActiveStrand(k)}
              data-testid={`strand-tab-${k}`}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                active ? accent.tab : "bg-background text-foreground border-border hover:border-foreground/40"
              }`}
            >
              {t(`pupil.strands.${k}`)}
            </button>
          );
        })}
      </div>

      {/* Lesson grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">{t("pupil.loadError")}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
          <h2 className="text-lg font-semibold">{t("pupil.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("pupil.emptyBody")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((lesson, idx) => {
            const strandKey = STRAND_KEYS.includes(lesson.strand as StrandKey)
              ? (lesson.strand as StrandKey)
              : null;
            const accent = strandKey ? STRAND_ACCENT[strandKey] : null;
            const status = statusOf(lesson.progress);
            const StatusIcon = STATUS_STYLE[status].Icon;
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <Link href={`/learn/${lesson.id}`} data-testid={`lesson-card-${lesson.id}`}>
                  <div className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:shadow-md transition cursor-pointer h-full flex flex-col">
                    {accent && (
                      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${accent.card} pointer-events-none`} />
                    )}
                    <div className="relative p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {strandKey && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${accent!.chip}`}>
                            {t(`pupil.strands.${strandKey}`)}
                          </span>
                        )}
                        <span
                          className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[status].chip}`}
                          data-testid={`lesson-status-${lesson.id}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {t(`pupil.status.${status}`)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold leading-snug">{lesson.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                        {lesson.hook}
                      </p>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {t("pupil.minutes", { count: lesson.durationMinutes })}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Presentation, Clock, BookOpenText, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

type StaffLesson = {
  id: string;
  schoolId: string | null;
  keyStage: string;
  strand: string;
  topic: string;
  title: string;
  hook: string;
  durationMinutes: number;
  sortOrder: number;
};

const STAFF_ROLES = new Set([
  "teacher",
  "head_of_year",
  "support_staff",
  "senco",
  "coordinator",
  "head_teacher",
]);

const STRAND_LABELS: Record<string, string> = {
  me_and_my_wellbeing: "Me & My Wellbeing",
  me_and_others: "Me & Others",
  me_and_the_world: "Me & The World",
};

async function fetchStaffLessons(): Promise<StaffLesson[]> {
  const token = localStorage.getItem("safeschool_token");
  const res = await fetch("/api/lessons/staff", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load lessons (${res.status})`);
  return res.json();
}

export default function StaffLessons() {
  const { t } = useTranslation("learn");
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.has(user.role);

  const { data: lessons, isLoading, isError } = useQuery<StaffLesson[]>({
    queryKey: ["/api/lessons/staff"],
    queryFn: fetchStaffLessons,
    enabled: isStaff,
  });

  if (!isStaff) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-2">{t("staff.accessDeniedTitle")}</h1>
        <p className="text-muted-foreground">{t("staff.accessDeniedBody")}</p>
      </div>
    );
  }

  // Group by key stage (already ordered by keyStage, sortOrder, title).
  const byKeyStage = new Map<string, StaffLesson[]>();
  for (const l of lessons ?? []) {
    const arr = byKeyStage.get(l.keyStage) ?? [];
    arr.push(l);
    byKeyStage.set(l.keyStage, arr);
  }
  const keyStages = [...byKeyStage.keys()];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-500/15 via-indigo-400/10 to-violet-400/10 dark:from-sky-500/20 dark:via-indigo-500/10 dark:to-violet-500/10 p-6 sm:p-8 border border-border">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow-sm">
            <GraduationCap className="h-6 w-6 text-sky-600 dark:text-sky-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("staff.heroTitle")}</h1>
            <p className="mt-2 text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("staff.heroSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">{t("staff.loadError")}</p>
        </div>
      ) : (lessons ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
          <h2 className="text-lg font-semibold">{t("staff.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("staff.emptyBody")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {keyStages.map((ks) => (
            <section key={ks} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">{ks}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t("staff.lessonCount", { count: byKeyStage.get(ks)!.length })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {byKeyStage.get(ks)!.map((lesson, idx) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:shadow-md transition h-full flex flex-col p-5">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground w-fit">
                        {STRAND_LABELS[lesson.strand] ?? lesson.strand}
                      </span>
                      <h3 className="mt-3 text-lg font-bold leading-snug">{lesson.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                        {lesson.hook}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {t("pupil.minutes", { count: lesson.durationMinutes })}
                      </div>
                      <Link
                        href={`/lessons/present/${lesson.id}`}
                        data-testid={`present-lesson-${lesson.id}`}
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition"
                      >
                        <Presentation className="h-4 w-4" />
                        {t("staff.present")}
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

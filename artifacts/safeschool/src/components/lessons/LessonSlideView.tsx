import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Target, Users, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LessonSlide } from "@/lib/lessonSlides";

// Renders a single parsed lesson slide. Shared by the teacher Present mode and
// the pupil step-through so both experiences look identical for the same
// content. Content slides render their markdown plain (the slide counter shows
// position); objectives / activity / reflection get a distinct labelled banner
// so "talk & do" and plenary moments read as clearly marked steps.
export function LessonSlideView({
  slide,
  size = "normal",
}: {
  slide: LessonSlide;
  size?: "normal" | "large";
}) {
  const { t } = useTranslation("learn");
  const prose =
    size === "large"
      ? "prose prose-stone dark:prose-invert max-w-none prose-lg sm:prose-xl prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed"
      : "prose prose-stone dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed";

  const banner =
    slide.kind === "objectives"
      ? {
          Icon: Target,
          label: t("slide.objectivesLabel"),
          detail: null as string | null,
          cls: "bg-cat-8/15 text-cat-8",
        }
      : slide.kind === "activity"
      ? {
          Icon: Users,
          label: t("slide.activityLabel"),
          // The authored heading carries the instruction, e.g.
          // "Activity (60 seconds, silent, private)" — surface it as a subtitle.
          detail: slide.heading.replace(/^Activity\s*/i, "").trim() || null,
          cls: "bg-cat-5/15 text-cat-5",
        }
      : slide.kind === "reflection"
      ? {
          Icon: Sparkles,
          label: t("slide.reflectionLabel"),
          detail: null,
          cls: "bg-cat-4/15 text-cat-4",
        }
      : null;

  return (
    <div className="space-y-4">
      {banner && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${banner.cls}`}
          >
            <banner.Icon className="h-4 w-4" />
            {banner.label}
          </span>
          {banner.detail && (
            <span className="text-sm text-muted-foreground font-medium">{banner.detail}</span>
          )}
        </div>
      )}
      <article className={prose}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide.body}</ReactMarkdown>
      </article>
    </div>
  );
}

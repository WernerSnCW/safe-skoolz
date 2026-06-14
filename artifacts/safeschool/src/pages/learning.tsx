import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  Presentation,
  LineChart,
  Users,
  Lightbulb,
} from "lucide-react";

// SchoolVBE "Learning centre" public taster (logged-out preview). The learning
// tools themselves live behind login in vibez; this page is their free public
// home — what teachers and pupils get — so the "see the learning tools" CTAs
// have somewhere to point. Presentational + SSR-safe so it prerenders; no auth,
// no data fetching, no browser APIs. Internal links use wouter <Link>.

const INSIDE: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}[] = [
  {
    icon: BookOpen,
    title: "Values-based lessons & PSHE",
    body: "Sequenced units that turn agreed values into actionable beliefs — mapped to PSHE and ready to drop into the timetable.",
  },
  {
    icon: Sparkles,
    title: "Pupil-facing activities",
    body: "Discussion prompts, reflections, and challenges pupils work through themselves — so values are practised, not just posted on a wall.",
  },
  {
    icon: Presentation,
    title: "Ready-to-teach slides",
    body: "Every lesson comes with a complete slide deck and a teacher script. Open it and teach — no prep night required.",
  },
  {
    icon: LineChart,
    title: "Progress for teachers",
    body: "See which values a class has covered, where conversations went, and what to revisit — a quiet record of culture taking root.",
  },
  {
    icon: Users,
    title: "Built for the whole community",
    body: "The same language reaches teachers, pupils, and parents, so the value a child meets in class is the one they hear at home.",
  },
  {
    icon: Lightbulb,
    title: "Case studies in practice",
    body: "Representative walk-throughs of how a lesson lands and how behaviour shifts — so you can picture it in your own setting.",
  },
];

const STEPS: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Open the value",
    body: "Start with one actionable value — \"We stand up for each other\" — framed for the age group in front of you.",
  },
  {
    step: "02",
    title: "Teach the slides",
    body: "Walk the ready-made deck and script. The story, the questions, and the timings are already there.",
  },
  {
    step: "03",
    title: "Pupils put it to work",
    body: "Pupils take on the activities — discussing, reflecting, deciding how the value shows up in their day.",
  },
  {
    step: "04",
    title: "Notice it land",
    body: "Capture what came up and what to return to, so the value carries from the lesson into the corridor.",
  },
];

export default function LearningPage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            The learning centre
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The learning that brings values to life.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            vibez gives teachers and pupils a complete learning centre built around values-based
            education — sequenced lessons, pupil activities, and ready-to-teach slides that turn
            agreed values into everyday behaviour. Here's a free look at what's inside.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Try vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/resources"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Get the VBE Adoption Pack
            </Link>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          What's inside the learning centre
        </h2>
        <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
          Everything a school needs to teach values well — and everything a pupil needs to live
          them — in one place, with the prep already done.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INSIDE.map((item) => (
            <div
              key={item.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How a lesson works */}
      <section className="border-y border-border/60 bg-accent/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-foreground">How a lesson works</h2>
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
            Four simple steps, from opening a value to watching it take hold.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
              >
                <span className="font-mono text-sm font-semibold uppercase tracking-wide text-primary">
                  {s.step}
                </span>
                <h3 className="mt-3 font-display text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key statement */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          A value is an actionable belief, not a word. The learning centre is where that belief
          gets practised — lesson by lesson, until it becomes how a school behaves.
        </blockquote>
      </section>

      {/* CTA row */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Ready when you are
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
            See the learning tools for yourself.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Log in to vibez to open the full learning centre, or take the VBE Adoption Pack to your
            school. Everything you need to start is free.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Try vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/resources"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Get the VBE Adoption Pack
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Compass,
  Heart,
  GraduationCap,
  Users,
  MessageCircle,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

// SchoolVBE PUBLIC "VBE Readiness Diagnostic" — the logged-out funnel on-ramp.
// 100% client-side: no auth, no API, no DB. Answers live in React state and the
// score is computed in the browser. SSR-safe — the intro + first question render
// with no window/document/localStorage access, so the prerender step can
// renderToString it. Distinct from the authed in-app /diagnostics. Wrapped in
// PublicLayout; routing is wired centrally (do not touch App.tsx / nav here).

type Option = { label: string; points: number };

type Question = {
  icon: typeof Compass;
  eyebrow: string;
  prompt: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    icon: Compass,
    eyebrow: "Leadership",
    prompt:
      "Is your senior leadership team actively committed to leading on values, not just endorsing them?",
    options: [
      { label: "Not yet", points: 0 },
      { label: "Starting to", points: 1 },
      { label: "Embedded", points: 2 },
    ],
  },
  {
    icon: Heart,
    eyebrow: "Shared values",
    prompt:
      "Has your community defined a small set of values as actionable behaviours — not single words on a wall?",
    options: [
      { label: "Not yet", points: 0 },
      { label: "We have words, not behaviours", points: 1 },
      { label: "Clear, agreed behaviours", points: 2 },
    ],
  },
  {
    icon: GraduationCap,
    eyebrow: "In the classroom",
    prompt:
      "Do your values show up in everyday teaching, language, and the way lessons are framed?",
    options: [
      { label: "Rarely", points: 0 },
      { label: "In some classes", points: 1 },
      { label: "Across the school", points: 2 },
    ],
  },
  {
    icon: Users,
    eyebrow: "Community",
    prompt:
      "Are parents and the wider community genuinely engaged in shaping and reinforcing your values?",
    options: [
      { label: "Not really", points: 0 },
      { label: "A keen few", points: 1 },
      { label: "Broadly involved", points: 2 },
    ],
  },
  {
    icon: MessageCircle,
    eyebrow: "Pupil voice",
    prompt:
      "Do pupils help shape the values and feel heard when they raise something that matters to them?",
    options: [
      { label: "Not yet", points: 0 },
      { label: "Occasionally", points: 1 },
      { label: "It's how we work", points: 2 },
    ],
  },
  {
    icon: ShieldCheck,
    eyebrow: "Wellbeing culture",
    prompt:
      "Is wellbeing and safeguarding part of a positive, values-led culture rather than a separate policy?",
    options: [
      { label: "Mostly policy-driven", points: 0 },
      { label: "Getting there", points: 1 },
      { label: "Woven into culture", points: 2 },
    ],
  },
  {
    icon: BarChart3,
    eyebrow: "Measuring impact",
    prompt:
      "Do you have a simple, honest way to see whether your values are actually changing behaviour?",
    options: [
      { label: "No way to tell", points: 0 },
      { label: "Informal sense of it", points: 1 },
      { label: "We track it", points: 2 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.length * 2; // 14

type Band = {
  name: string;
  blurb: string;
};

function getBand(score: number): Band {
  const pct = score / MAX_SCORE;
  if (pct < 0.4) {
    return {
      name: "Exploring",
      blurb:
        "You're at the very start of the journey — and that's a genuinely good place to be. The biggest wins in values-based education come early, when leadership names a clear intention and the community gets to help shape what matters. Nothing here needs to be perfect first; it needs to be shared. A guided first step will give you quick momentum.",
    };
  }
  if (pct < 0.75) {
    return {
      name: "Building",
      blurb:
        "You've already laid real foundations — there's commitment and some good practice to build on. The opportunity now is consistency: turning values into agreed behaviours everyone recognises, and making them visible in classrooms, with parents, and in pupil voice. A structured rollout will help you join the dots into one coherent culture.",
    };
  }
  return {
    name: "Ready to adopt",
    blurb:
      "You're in a strong position. Values are understood, leadership is behind them, and your community is involved. Adopting VBE formally will give you the shared language, the embedding rhythm, and the simple way of measuring impact that turns strong culture into lasting culture. This is the moment to make it official.",
  };
}

export default function DiagnosticPage() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);

  const totalScore = QUESTIONS.reduce(
    (sum, _q, i) => sum + (answers[i] ?? 0),
    0,
  );
  const band = getBand(totalScore);

  function selectAnswer(qIndex: number, points: number) {
    setAnswers((prev) => ({ ...prev, [qIndex]: points }));
  }

  function startOver() {
    setAnswers({});
    setShowResult(false);
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-mono text-sm font-semibold uppercase tracking-wide text-primary">
            Free Diagnostic
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How ready is your school for values-based education?
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Seven short questions, two minutes, no sign-up. This quick self-assessment shows you
            where your community already shines and where a little focus would go a long way. There
            are no wrong answers — just an honest snapshot to start the conversation.
          </p>
        </div>
      </section>

      {/* Diagnostic body */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {!showResult ? (
          <>
            {/* Progress */}
            <div className="mb-10">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono uppercase tracking-wide text-muted-foreground">
                  Your progress
                </span>
                <span className="font-semibold text-foreground">
                  {answeredCount} / {QUESTIONS.length}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {QUESTIONS.map((q, i) => {
                const selected = answers[i];
                return (
                  <div
                    key={q.prompt}
                    className="rounded-2xl border border-border bg-card p-7 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <q.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">
                          {q.eyebrow}
                        </p>
                        <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                          {q.prompt}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {q.options.map((opt) => {
                        const isActive = selected === opt.points;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => selectAnswer(i, opt.points)}
                            aria-pressed={isActive}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {isActive && <CheckCircle2 className="h-4 w-4" />}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* See result */}
            <div className="mt-10 flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={() => setShowResult(true)}
                disabled={!allAnswered}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                See my result
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              {!allAnswered && (
                <p className="text-sm text-muted-foreground">
                  Answer all {QUESTIONS.length} questions to see where your school stands.
                </p>
              )}
            </div>
          </>
        ) : (
          /* Result */
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-wide text-primary">
              Your result
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
              {band.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Score {totalScore} of {MAX_SCORE}
            </p>
            <p className="mt-6 text-lg text-muted-foreground">{band.blurb}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/resources" className={cn(buttonVariants({ size: "lg" }))}>
                Get the VBE Adoption Pack
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Try vibez
              </Link>
            </div>

            <button
              type="button"
              onClick={startOver}
              className="mt-6 inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Start over
            </button>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}

import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck, Flag, BookOpen, HeartHandshake, ArrowRight, ShieldCheck,
} from "lucide-react";

// The primary "How it works" — the VBE journey, end to end. This is what
// "See how it works" should mean now: values-based education, not safeguarding.
// The existing safeguarding walkthrough lives on as one chapter, linked from
// step 4. Public + SSR-safe (prerender-friendly), no heavy animation.

const STEPS: {
  n: number;
  icon: typeof ClipboardCheck;
  title: string;
  lead: string;
  body: string;
  does: string;
  cta: { label: string; href: string };
}[] = [
  {
    n: 1,
    icon: ClipboardCheck,
    title: "Diagnose",
    lead: "See where your community stands.",
    body: "Before you commit to anything, run the free readiness diagnostic. Pupils, staff and parents each answer role-appropriate questions, and you get a clear report on how ready your community is for values-based education.",
    does: "vibez runs the survey, protects anonymity, and turns the responses into a readiness picture you can act on.",
    cta: { label: "Run the diagnostic", href: "/diagnostic" },
  },
  {
    n: 2,
    icon: Flag,
    title: "Adopt",
    lead: "Choose your values — in 10 working days.",
    body: "The VBE Adoption Pack walks your SLT, teachers, parents and pupils through choosing five values and, crucially, the observable behaviours that make each one real — something a child can do and be held to on any given day.",
    does: "vibez gives you the pack, the process, and a place to record the values and behaviours your community agrees on.",
    cta: { label: "Get the VBE Adoption Pack", href: "/schools" },
  },
  {
    n: 3,
    icon: BookOpen,
    title: "Embed",
    lead: "Values lived every day — not a poster on the wall.",
    body: "Your values run through PSHE and lessons, through how behaviour is recognised and addressed, and through the everyday life of the school. The framework becomes the shared language pupils, staff and parents actually use.",
    does: "vibez carries your values into ready-to-teach lessons, behaviour tracking, and the tools staff use day to day.",
    cta: { label: "See the learning tools", href: "/learning" },
  },
  {
    n: 4,
    icon: HeartHandshake,
    title: "Sustain",
    lead: "Everyone pulling in the same direction.",
    body: "VBE only lasts when the whole community owns it: schools rolling it out, parents advocating for it, and PTAs operating well behind it — the three missions vibez is built around. Safeguarding sits underneath as one supporting pillar: when something does go wrong, vibez connects the dots no single person could see alone.",
    does: "vibez keeps schools, parents and PTAs working together — and quietly watches for the patterns that matter.",
    cta: { label: "See the safeguarding side in action", href: "/how-it-works/safeguarding" },
  },
];

export default function HowVbeWorks() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          From “we should have values” to values lived every day.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Values-based education in four steps — and how <span className="font-brand text-xl">vibez</span> supports
          your whole community through every one of them.
        </p>
      </section>

      {/* Journey steps */}
      <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <div className="space-y-6">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
              <div className="flex items-start gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">0{s.n}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl font-bold text-foreground">{s.title}</h2>
                  <p className="mt-1 text-lg font-semibold text-foreground/90">{s.lead}</p>
                  <p className="mt-3 text-muted-foreground">{s.body}</p>
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground">
                    <span className="font-brand text-base leading-none text-primary">vibez</span>
                    <span className="text-muted-foreground">{s.does}</span>
                  </p>
                  <Link href={s.cta.href} className="mt-4 inline-flex items-center font-semibold text-primary hover:underline">
                    {s.cta.label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="font-display text-3xl font-bold">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-primary-foreground/90">
            Begin with a free diagnostic, or pick up the VBE Adoption Pack. Everything on SchoolVBE is free —
            vibez is the software that carries it through.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/schools"
              className="inline-flex items-center rounded-xl bg-primary-foreground px-7 py-3 text-base font-semibold text-primary shadow-sm transition-colors hover:bg-primary-foreground/90"
            >
              Get the VBE Adoption Pack
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border-2 border-primary-foreground/40 px-7 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Log in to vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

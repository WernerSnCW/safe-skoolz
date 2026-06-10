import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Megaphone,
  HeartPulse,
  Scale,
  Clock,
  UserPlus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// SchoolVBE "For Parents" marketing page (Phase 3 content migration). Copy
// reused verbatim from the live site (/parents/). Presentational + SSR-safe so
// it prerenders; registered in PUBLIC_ROUTES. Card links point to deeper
// /parents/* routes that are not yet built (404 until ported later — same as
// the /schools track).

const TRACK: {
  icon: typeof Megaphone;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    icon: Megaphone,
    title: "Your Voice Matters",
    body: "Why parental engagement shapes school culture — and the filter that makes your voice land.",
    href: "/parents/your-voice",
  },
  {
    icon: HeartPulse,
    title: "What a Healthy PTA Looks Like",
    body: "Functioning vs dysfunctional, without the judgement — and the signs to watch for.",
    href: "/parents/healthy-pta",
  },
  {
    icon: Scale,
    title: "Your Rights and Reasonable Expectations",
    body: "What you can reasonably expect from a school and a PTA — and how to ask without conflict.",
    href: "/parents/your-rights",
  },
  {
    icon: Clock,
    title: "How Modern PTAs Work for Busy Parents",
    body: "Async voting, proxy voting, hybrid AGMs, and 30-minutes-a-term roles.",
    href: "/parents/busy-parents",
  },
  {
    icon: UserPlus,
    title: "How to Join Your PTA",
    body: "A step-by-step guide, what to expect in your first term, and who to contact.",
    href: "/parents/join-pta",
  },
  {
    icon: ShieldCheck,
    title: "Holding Your PTA and School to Account",
    body: "The escalation pathway, and why silence is not acceptance.",
    href: "/parents/pta-accountability",
  },
  {
    icon: Sparkles,
    title: "What Good School Wellbeing Looks Like",
    body: "The safeguarding and PSHE standards you can reasonably expect — and the questions to ask.",
    href: "/parents/wellbeing-expectations",
  },
];

export default function ParentsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">For Parents</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Your voice matters. Here's how to use it.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            You don't need hours to spare or a seat on a committee to shape your child's school.
            Understand what a good PTA looks like, how to participate even with limited time, and
            what you can reasonably expect from your school.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/parents/join-pta" className={cn(buttonVariants({ size: "lg" }))}>
              Find out how to join your PTA
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/resources"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Download the Parent Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Participation statement */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Participation that fits a real life
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          A school's culture is shaped by who shows up. That doesn't mean showing up to everything —
          it means knowing where your voice counts and using it there. Thirty minutes a term, used
          well, changes outcomes.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          This track is the practical guide: how PTAs work, how to join, what you can ask for, and
          how to raise a concern so it actually lands.
        </p>
      </section>

      {/* Explore the parents track */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TRACK.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{t.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{t.body}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                Read more
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}

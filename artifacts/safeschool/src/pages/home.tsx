import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { School, Users, Vote, HeartHandshake, ArrowRight, Heart } from "lucide-react";

// SchoolVBE marketing homepage — the Phase 2 proof page. Copy is reused
// verbatim from the live static site (main.schoolvbe.pages.dev). Presentational
// and SSR-safe so it prerenders to static HTML for crawlers; the SPA takes over
// on mount for anon visitors (smart "/" route in App.tsx).

const AUDIENCES: {
  icon: typeof School;
  heading: string;
  body: string;
  cta: string;
  href: string;
}[] = [
  {
    icon: School,
    heading: "Give your school a values foundation it can build on.",
    body: "Adopt VBE in 10 working days. Everything your SLT, teachers, parents, and pupils need — in one pack. Not ready to commit? Run a diagnostic first.",
    cta: "Get the VBE Adoption Pack",
    href: "/schools",
  },
  {
    icon: Users,
    heading: "Your voice matters. Here's how to use it.",
    body: "Understand what a good PTA looks like, how to participate even with limited time, and what you can reasonably expect from your school.",
    cta: "Download the Parent Guide",
    href: "/parents",
  },
  {
    icon: Vote,
    heading: "You don't need a constitution to start operating well. Start here.",
    body: "The complete PTA Operating Pack — governance, transparency, voting, safeguarding, and school engagement tools, immediately deployable.",
    cta: "Get the PTA Operating Pack",
    href: "/ptas",
  },
  {
    icon: HeartHandshake,
    heading: "Concerned parents are stronger together.",
    body: "Form a private group, build a single voice, and give your school and PTA a constructive path to VBE adoption — with the tools to make it happen.",
    cta: "Start or join a group",
    href: "/coalitions",
  },
];

const GOALS: { heading: string; body: string }[] = [
  {
    heading: "More parents, more engaged",
    body: "Participation that fits real lives — voting, contributing, attending, raising concerns through the right channels, and joining or forming a PTA.",
  },
  {
    heading: "PTAs that operate well",
    body: "Real operational capability — governance, transparency, communication — that earns credibility with schools and trust from parents.",
  },
  {
    heading: "Schools that build on values",
    body: "Two equal doors: adopt VBE when you're ready, or run a diagnostic first to see if it's right for your community. No pressure, always equipped.",
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            New School Vibez, Old School Values
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Better schools start with better communities.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            SchoolVBE equips schools, parents, and PTAs with everything they need to build a
            values-led school community.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Try vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/schools"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Get the VBE Adoption Pack
            </Link>
            <Link
              href="/how-it-works"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Audience cards */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <div
              key={a.href}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <a.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-foreground">{a.heading}</h2>
              <p className="mt-3 flex-1 text-muted-foreground">{a.body}</p>
              <Link
                href={a.href}
                className="mt-6 inline-flex items-center font-semibold text-primary hover:underline"
              >
                {a.cta}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pupils — not a buyer door; the reason for all of it. Full-width band. */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-accent/40 p-8 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-foreground">
              And at the heart of all of it: your pupils.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Values only matter if they reach the children living them. In vibez, pupils get a
              wellbeing-first space of their own — check in on how they feel, a private diary,
              values brought to life, and a safe way to speak up.
            </p>
          </div>
          <Link
            href="/pupils"
            className="inline-flex shrink-0 items-center font-semibold text-primary hover:underline"
          >
            See what pupils experience
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* vibez software band — the option to see the software or log in */}
      <section id="vibez" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
            The software
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Meet <span className="font-brand text-4xl sm:text-5xl">vibez</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-primary-foreground/90">
            vibez is the free software that puts VBE into practice — one platform for{" "}
            <strong>schools</strong> rolling out values-based education,{" "}
            <strong>parents</strong> advocating for it, and <strong>PTAs</strong> operating well.
            Everything on SchoolVBE stays free.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-primary-foreground px-7 py-3 text-base font-semibold text-primary shadow-sm transition-colors hover:bg-primary-foreground/90"
            >
              Log in to vibez
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center rounded-xl border-2 border-primary-foreground/40 px-7 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              See how it works
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-foreground">
          Built deliberately, not by default
        </h2>
        <div className="mt-6 space-y-5 text-lg text-muted-foreground">
          <p>
            Every school has a culture — whether it chose one or not. SchoolVBE exists to help
            school communities choose theirs, on purpose, with everyone involved: school leaders,
            teachers, parents, and pupils.
          </p>
          <p>
            A value is not a word on a wall. It is an actionable belief — something you can do,
            something you can be held to, something a child can understand and apply on any given
            day. That distinction is where this work begins.
          </p>
        </div>
      </section>

      {/* Three goals */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {GOALS.map((g, i) => (
            <div key={g.heading}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
                {i + 1}
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">{g.heading}</h3>
              <p className="mt-2 text-muted-foreground">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case study CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              See what it looks like in practice
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              An illustrative walk-through of how a parent community builds a values framework from
              the ground up — the diagnosis, the five values and behaviours, and the documents that
              come out of it.
            </p>
          </div>
          <Link
            href="/schools/case-study"
            className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
          >
            View the illustrative example
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

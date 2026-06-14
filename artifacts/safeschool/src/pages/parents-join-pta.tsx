import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Mail,
  ClipboardList,
  Hand,
  CalendarCheck,
} from "lucide-react";

// SchoolVBE "How to Join Your PTA" marketing page (Phase 3 content migration).
// Copy reused from the live site (/parents/join-pta.html), reframed to the
// app's Values-Based Education (VBE) voice. Presentational + SSR-safe so it
// prerenders; reached at /parents/join-pta. Routing/nav wired centrally.

const STEPS: {
  icon: typeof Search;
  title: string;
  body: string;
}[] = [
  {
    icon: Search,
    title: "Find your PTA's contact",
    body: "Usually the chair or secretary — via the school office, the newsletter, or the school website.",
  },
  {
    icon: Mail,
    title: "Say you'd like to join",
    body: "A single email is enough. You don't need to commit to a role.",
  },
  {
    icon: ClipboardList,
    title: "Ask for the basics",
    body: "Request the onboarding pack (or the meeting schedule and current priorities) so you know what's going on.",
  },
  {
    icon: Hand,
    title: "Pick one small thing",
    body: "Choose a 30-minutes-a-term role to start — review a document, help at one event, welcome a new family.",
  },
  {
    icon: CalendarCheck,
    title: "Turn up to one thing",
    body: "One meeting, in person or online, to put faces to names.",
  },
];

const FIRST_TERM: string[] = [
  "No pressure to take on a big role — good PTAs welcome small, reliable contributions.",
  "A bit of jargon at first (AGM, quorum, proxy) — ask; it's all straightforward.",
  "A sense of who does what, and where you might add the most with the time you have.",
  "At least one moment where your outside perspective is genuinely useful.",
];

export default function ParentsJoinPta() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-mono text-sm font-semibold uppercase tracking-wide text-primary">
            Parents · Getting Started
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How to Join Your PTA
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Joining is simpler than it looks, and you can start small. Here's the path, what your
            first term will feel like, and who to ask.
          </p>
        </div>
      </section>

      {/* Step by step */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Step by step</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm font-semibold uppercase tracking-wide text-primary">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What to expect in your first term */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">
            What to expect in your first term
          </h2>
          <ul className="mt-6 space-y-4">
            {FIRST_TERM.map((item) => (
              <li key={item} className="flex gap-3 text-muted-foreground">
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who to contact */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Who to contact</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          If you can't find your PTA's details, ask the school office to pass your interest to the
          PTA chair. If your school has no active PTA — or it isn't functioning — you may want to
          look at{" "}
          <Link href="/parents" className="font-semibold text-primary hover:underline">
            starting a parent group
          </Link>{" "}
          instead, and point existing volunteers to the{" "}
          <Link href="/ptas/operating-pack" className="font-semibold text-primary hover:underline">
            PTA Operating Pack
          </Link>
          .
        </p>
      </section>

      {/* Values callout */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          Your voice shapes the values your school lives by.{" "}
          <span className="font-semibold">
            A community is shaped by who shows up — and that can be thirty minutes a term, by you.
          </span>
        </blockquote>
      </section>

      {/* CTAs */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/resources" className={cn(buttonVariants({ size: "lg" }))}>
            Download the New Member Onboarding Pack
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/parents"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            See low-time ways to help
          </Link>
        </div>
        <div className="mt-10">
          <Link
            href="/parents"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to For Parents
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

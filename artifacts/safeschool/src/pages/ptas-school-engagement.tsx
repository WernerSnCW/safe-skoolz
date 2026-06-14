import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  MessagesSquare,
  Gavel,
  RefreshCw,
} from "lucide-react";

// SchoolVBE "How to Engage Your School Constructively" marketing page (Phase 3
// content migration). Copy reused verbatim from the live site
// (/pta/school-engagement.html — routed at /ptas/school-engagement in the
// unified app). Presentational + SSR-safe so it prerenders: pure static JSX,
// no hooks, no data fetching, no browser APIs.

const STAGES: {
  icon: typeof Send;
  title: string;
  what: string;
  output: string;
}[] = [
  {
    icon: Send,
    title: "1. Propose",
    what: "The PTA submits a written proposal: the ask, the rationale, the evidence, and what the PTA will do.",
    output: "A dated proposal in the decision log.",
  },
  {
    icon: CheckCircle2,
    title: "2. Acknowledge",
    what: "The school confirms receipt and names who will consider it.",
    output: "Acknowledgement recorded (or its absence noted).",
  },
  {
    icon: MessagesSquare,
    title: "3. Discuss",
    what: "PTA and school meet to refine the proposal and surface concerns.",
    output: "Agreed actions and open questions, minuted.",
  },
  {
    icon: Gavel,
    title: "4. Decide",
    what: "The school gives a decision: yes, no, or yes-with-conditions — with reasons.",
    output: "A recorded decision. No proposal is left without one.",
  },
  {
    icon: RefreshCw,
    title: "5. Review",
    what: "If actioned, the PTA reviews outcomes at an agreed point and reports back.",
    output: "An outcome record that strengthens the next proposal.",
  },
];

const WRITING_TIPS: { lead: string; body: string }[] = [
  {
    lead: "Lead with the shared goal.",
    body: "Name the outcome the school also wants.",
  },
  {
    lead: "Bring a proposal, not a complaint.",
    body: "Say what you'd like to happen and what the PTA will contribute.",
  },
  {
    lead: "Show the evidence.",
    body: "Attach the record — the consultation, the vote, the data.",
  },
  {
    lead: "Make it easy to say yes.",
    body: "Reduce the school's effort and risk wherever you can.",
  },
  {
    lead: "Keep the tone partner-to-partner.",
    body: "Every line should read as working with, not against.",
  },
];

export default function PtasSchoolEngagement() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <Link
            href="/ptas"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to For PTAs
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            PTA · Working With School
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How to Engage Your School Constructively
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            A PTA earns influence by being predictable, evidenced, and constructive. This is the
            process that does it: a five-stage path where every proposal reaches a decision, and
            every silence is recorded.
          </p>
        </div>
      </section>

      {/* Partners-not-petitioners callout */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <div className="rounded-2xl border-l-4 border-primary bg-card p-8 text-lg text-foreground">
          <span className="font-semibold">Approach the school as partners, not petitioners.</span>{" "}
          Every communication should read as "the PTA is working with the school" — never against
          it. This posture is not optional; it is the thing that makes the process work.
        </div>
      </section>

      {/* The five-stage initiative process */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          The five-stage initiative process
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <div
              key={s.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.what}</p>
              <p className="mt-4 text-xs font-mono uppercase tracking-wide text-primary">Output</p>
              <p className="mt-1 text-sm text-foreground">{s.output}</p>
            </div>
          ))}
        </div>
      </section>

      {/* No proposal left without a decision */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">
            No proposal is left without a decision
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The process is designed so that a proposal cannot quietly disappear. Each stage has an
            expected response and a timeframe. When the school responds, the decision is recorded.
            When it doesn't, that too is recorded.
          </p>
          <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
            <span className="font-semibold">
              Silence is not acceptance — and it is not ignored.
            </span>{" "}
            A non-response is logged with a date and a courteous follow-up. The record is factual,
            never accusatory. Over time it forms an honest picture of how proposals were handled —
            which protects both sides.
          </div>
        </div>
      </section>

      {/* How to write to the school */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          How to write to the school
        </h2>
        <ul className="mt-8 space-y-4">
          {WRITING_TIPS.map((t) => (
            <li
              key={t.lead}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-baseline sm:gap-3"
            >
              <span className="font-semibold text-foreground">{t.lead}</span>
              <span className="mt-1 text-muted-foreground sm:mt-0">{t.body}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/resources" className={cn(buttonVariants({ size: "lg" }))}>
            <Download className="mr-2 h-4 w-4" />
            Download the School Engagement Protocol
          </Link>
          <Link
            href="/ptas"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Back to For PTAs
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

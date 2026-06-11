import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Download,
  Users,
  GraduationCap,
  Home,
  Baby,
  ShieldCheck,
} from "lucide-react";

// SchoolVBE "The 10-Day VBE Rollout" marketing page (Phase 3 content migration).
// Copy reused verbatim from the live site (/schools/10-day-rollout.html).
// Presentational + SSR-safe so it prerenders; reached at /schools/10-day-rollout
// and registered centrally in PUBLIC_ROUTES. No browser hooks, no data fetching.

const DAYS: {
  day: number;
  phase: string;
  audience: string;
  activity: string;
  output: string;
}[] = [
  {
    day: 1,
    phase: "Foundation",
    audience: "SLT",
    activity:
      "Workshop: the case for VBE, the actionable-belief distinction, the sequence.",
    output: "Leadership alignment; mandate to proceed.",
  },
  {
    day: 2,
    phase: "Foundation",
    audience: "SLT",
    activity: "Define purpose and candidate values; agree the rollout plan.",
    output: "Draft values set; rollout calendar.",
  },
  {
    day: 3,
    phase: "Staff buy-in",
    audience: "All staff",
    activity: "Staff workshop: what VBE asks of them; surfacing concerns.",
    output: "Staff input folded into the values.",
  },
  {
    day: 4,
    phase: "Capability",
    audience: "Teachers",
    activity:
      "Training: modelling values, behaviour conversations, restorative basics.",
    output: "Teachers ready to deliver.",
  },
  {
    day: 5,
    phase: "Community",
    audience: "Parents",
    activity: "Parent communication: what VBE is, what it asks of families.",
    output: "Parents informed and invited in.",
  },
  {
    day: 6,
    phase: "Community",
    audience: "Parents",
    activity: "Parent input session (in person + async) on the values.",
    output: "Community ownership of the values.",
  },
  {
    day: 7,
    phase: "Pupils",
    audience: "Pupils",
    activity: "Pupil rollout: age-appropriate introduction by key stage.",
    output: "Pupils understand the values.",
  },
  {
    day: 8,
    phase: "Pupils",
    audience: "Pupils",
    activity: "Behaviours workshop: what each value looks like day to day.",
    output: "Shared behavioural language.",
  },
  {
    day: 9,
    phase: "Embed",
    audience: "Whole school",
    activity: "Align rules and consequences to the values; publish.",
    output: "Coherent conduct framework.",
  },
  {
    day: 10,
    phase: "Embed",
    audience: "SLT + governors",
    activity: "Launch, governor briefing, and 90-day review plan set.",
    output: "Live framework; review scheduled.",
  },
];

const RECEIVES: {
  icon: typeof Users;
  party: string;
  body: string;
}[] = [
  {
    icon: Users,
    party: "SLT",
    body: "The workshop guide, the values-definition framework, and the rollout calendar — everything needed to lead the process with confidence and brief governors.",
  },
  {
    icon: GraduationCap,
    party: "Teachers",
    body: "A training pack covering how to model the values, hold behaviour conversations grounded in them, and run restorative basics — so the framework is lived in classrooms, not just announced.",
  },
  {
    icon: Home,
    party: "Parents",
    body: "A communication pack explaining what VBE is and what it asks of families, plus structured ways to contribute to the values — in person and asynchronously.",
  },
  {
    icon: Baby,
    party: "Pupils",
    body: "An age-appropriate rollout by key stage that introduces the values and, crucially, what each one looks like in everyday behaviour.",
  },
  {
    icon: ShieldCheck,
    party: "Governors",
    body: "A briefing on the framework, the evidence base, and the 90-day review plan — so oversight is informed from day one.",
  },
];

export default function Schools10DayRollout() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Schools · The Rollout
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The 10-Day VBE Rollout
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            From decision to embedded framework in ten working days. The rollout
            is sequenced so each group is brought in at the right moment —
            leadership first, then staff, then families and pupils — with a clear
            output at every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/resources" className={cn(buttonVariants({ size: "lg" }))}>
              <Download className="mr-2 h-4 w-4" />
              Download the VBE Adoption Pack
            </Link>
            <Link
              href="/schools/adopt-vbe"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              See the adoption process
            </Link>
          </div>
        </div>
      </section>

      {/* Day by day timeline */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Day by day
        </h2>
        <ol className="mt-8 space-y-4">
          {DAYS.map((d) => (
            <li
              key={d.day}
              className="flex gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-accent-foreground">
                {d.day}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    {d.phase}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                    {d.audience}
                  </span>
                </div>
                <p className="mt-2 text-base text-foreground">{d.activity}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Output:</span>{" "}
                  {d.output}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* What every party receives */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          What every party receives
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {RECEIVES.map((r) => (
            <div
              key={r.party}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {r.party}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Actionable-belief callout */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          <span className="font-semibold">
            A value is an actionable belief, not a word.
          </span>{" "}
          Every day of this rollout works to translate agreed values into
          behaviours a child can recognise and an adult can model — that is what
          makes the framework hold after day ten.
        </blockquote>
      </section>

      {/* CTAs + back link */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/resources" className={cn(buttonVariants({ size: "lg" }))}>
            <Download className="mr-2 h-4 w-4" />
            Download the VBE Adoption Pack
          </Link>
          <Link
            href="/schools/adopt-vbe"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            See the adoption process
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <Link
          href="/schools"
          className="mt-8 inline-flex items-center text-sm font-semibold text-primary"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to For Schools
        </Link>
      </section>
    </PublicLayout>
  );
}

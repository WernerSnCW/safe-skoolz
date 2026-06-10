import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, UserPlus, Workflow, Package, BarChart3, Target } from "lucide-react";

// SchoolVBE "For Parent Groups" marketing page (Phase 3 content migration).
// Copy reused verbatim from the live site (/coalitions/). Presentational +
// SSR-safe so it prerenders; deeper /coalitions/* links are not yet built
// (404 until ported later — same as the /schools track).

const ACTIONS: {
  icon: typeof Users;
  title: string;
  body: string;
  cta: string;
  href: string;
}[] = [
  {
    icon: Users,
    title: "Start a group at my school",
    body: "Bring together a few parents who share a constructive goal, privately, and build a single voice with the tools to make the case.",
    cta: "Start a group",
    href: "/coalitions/start-group",
  },
  {
    icon: UserPlus,
    title: "Join an existing group",
    body: "Register your interest. If a group in your area is active, the organiser can choose to invite you in.",
    cta: "Join a group",
    href: "/coalitions/join-group",
  },
];

const RESOURCES: {
  icon: typeof Workflow;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    icon: Workflow,
    eyebrow: "The Model",
    title: "How Parent Coalitions Work",
    body: "The three-phase model — Form, Prepare, Present — and what success looks like.",
    href: "/coalitions/how-it-works",
  },
  {
    icon: Package,
    eyebrow: "Free Pack",
    title: "The Coalition Toolkit",
    body: "Advocacy brief, presentation template, survey, talking points, and letter templates.",
    href: "/coalitions/toolkit",
  },
  {
    icon: BarChart3,
    eyebrow: "Evidence",
    title: "Running a Parent Survey",
    body: "How informal prevalence data strengthens your case — and how to present it constructively.",
    href: "/coalitions/survey",
  },
  {
    icon: Target,
    eyebrow: "Destination",
    title: "Where this leads",
    body: "When your school adopts VBE, the systems you've been asking for are already built.",
    href: "/coalitions/how-it-works#destination",
  },
];

export default function CoalitionsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            For Parent Groups
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Concerned parents are more powerful together.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            A single parent raising concerns is one voice. A coalition of parents, aligned and
            organised, with the right tools and a constructive ask, is how schools change.
          </p>
        </div>
      </section>

      {/* Action cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {ACTIONS.map((a) => (
            <div
              key={a.href}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <a.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-foreground">{a.title}</h2>
              <p className="mt-2 flex-1 text-muted-foreground">{a.body}</p>
              <Link href={a.href} className={cn(buttonVariants({ size: "lg" }), "mt-6 self-start")}>
                {a.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* What a coalition is — and isn't */}
      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          What a coalition is — and isn't
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          A coalition is not a campaign against the school. It is a coordinated, constructive
          advocacy group: a handful of parents at the same school, aligned on a specific ask — that
          the school adopt values-based education — speaking with one evidenced voice through the
          right channels.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          Isolated concerned parents have limited leverage. An organised group, with a clear
          proposal and the tools to back it, is a different proposition entirely.
        </p>
        <blockquote className="mt-8 rounded-2xl border-l-4 border-primary bg-card p-8 text-lg text-foreground">
          <span className="font-semibold">
            "Approach the school as partners, not petitioners."
          </span>{" "}
          The strongest coalitions arrive with a proposal and a record, not a list of grievances.
          This track gives you both.
        </blockquote>
      </section>

      {/* Resource cards */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {RESOURCES.map((r) => (
            <Link
              key={r.title}
              href={r.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <r.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                {r.eyebrow}
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-foreground">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.body}</p>
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

import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Layers,
  FileClock,
  ShieldCheck,
  Package,
  Handshake,
  HeartHandshake,
} from "lucide-react";

// SchoolVBE "For PTAs" marketing page (Phase 3 content migration). Copy reused
// verbatim from the live site (/pta/ — the unified app routes it at /ptas to
// match PublicLayout nav). Presentational + SSR-safe so it prerenders; card
// links point to deeper /ptas/* routes not yet built (404 until ported later).

const TRACK: {
  icon: typeof Layers;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    icon: Layers,
    title: "The Two-Layer PTA Model",
    body: "A strategy hub and an evidence hub — why the architecture works and how to deploy both layers.",
    href: "/ptas/two-layer-model",
  },
  {
    icon: FileClock,
    title: "Operating Before Your Constitution Exists",
    body: "The three-tier structure, the equal-standing principle, and the self-approval checklist that lets you act now.",
    href: "/ptas/pre-constitutional",
  },
  {
    icon: ShieldCheck,
    title: "Why Your PTA Needs Proper Governance",
    body: "What governance failure looks like, what it costs, and why governance is the foundation of credibility with the school.",
    href: "/ptas/why-governance",
  },
  {
    icon: Package,
    title: "The PTA Operating Pack",
    body: "All 17 documents — governance, transparency, voting, safeguarding, and engagement. Free, gated by email.",
    href: "/ptas/operating-pack",
  },
  {
    icon: Handshake,
    title: "How to Engage Your School Constructively",
    body: "The five-stage initiative process. No proposal left without a decision. Silence is not acceptance.",
    href: "/ptas/school-engagement",
  },
  {
    icon: HeartHandshake,
    title: "Free Support",
    body: "Want a hand setting up your PTA, tightening governance, or running a survey? Our help is free — just get in touch.",
    href: "/about#contact",
  },
];

export default function PtasPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">For PTAs</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            You don't need a constitution to start operating well. Start here.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Every other PTA toolkit starts with constitution work. SchoolVBE starts with getting
            things done — with the governance, transparency, and school-engagement tools you can
            deploy this term.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ptas/operating-pack" className={cn(buttonVariants({ size: "lg" }))}>
              Get the PTA Operating Pack
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/ptas/school-engagement"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              See how to engage your school
            </Link>
          </div>
        </div>
      </section>

      {/* Operate first statement */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Operate first. Formalise later.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Most PTAs stall before they start, waiting on a constitution, an AGM, or a quorum. The
          truth is you can run a credible, transparent, well-governed PTA without any of that in
          place yet. The constitution catches up with the operating reality — not the other way
          round.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          This track gives you the operating model, the decision-making structure, and the tools to
          engage your school as a partner. Adopt what you need by a simple membership vote. No
          constitutional amendment required.
        </p>
      </section>

      {/* Explore the PTA track */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Explore the PTA track</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Equal standing callout */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          Equal standing, responsibility not authority.{" "}
          <span className="font-semibold">
            A well-run PTA distributes work, not hierarchy.
          </span>
        </blockquote>
      </section>
    </PublicLayout>
  );
}

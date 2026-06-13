import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Megaphone,
  Handshake,
} from "lucide-react";

// SchoolVBE "The PTA Operating Pack" marketing page (Phase 3 content migration).
// Copy reused verbatim from the live static site (/pta/operating-pack.html),
// reached in the unified app at /ptas/operating-pack. Presentational + SSR-safe
// so it prerenders: pure static JSX, no hooks/window/data fetching. Old download
// links (data-download anchors wired by main.js on the static site) are rendered
// as plain "Download" labels here; the email-gated download flow is wired
// centrally later.

const CLUSTERS: {
  icon: typeof ShieldCheck;
  label: string;
  docs: { ref: string; title: string; body: React.ReactNode; badge: string; soon?: boolean }[];
}[] = [
  {
    icon: ShieldCheck,
    label: "Cluster 1 — Operating structure & governance",
    docs: [
      {
        ref: "Doc 1A",
        title: "Pre-Constitutional Operating Structure",
        body: "Three-tier model, decision authority, self-approval checklist. Operate now; formalise later.",
        badge: "PDF",
      },
      {
        ref: "Doc 1B",
        title: "Draft Constitution",
        body: "A ready-to-adapt constitution that codifies the operating model once it’s working.",
        badge: "PDF",
      },
      {
        ref: "Doc 2",
        title: "AGM & Meeting Framework",
        body: "Hybrid AGM, notice periods, quorum, agenda templates, and minute discipline.",
        badge: "PDF",
      },
      {
        ref: "Doc 7",
        title: "Governance Health Check",
        body: "A self-assessment that surfaces where your PTA is exposed — and what to fix first.",
        badge: "PDF",
      },
      {
        ref: "Doc 8",
        title: "New Member Onboarding Pack",
        body: "Everything a new member needs in their first term — roles, norms, and how to contribute.",
        badge: "PDF",
      },
      {
        ref: "Doc 9",
        title: "Digital Participation & Voting Framework",
        body: "Async voting, proxy voting, digital comment periods — participation that fits real lives.",
        badge: "PDF",
      },
      {
        ref: "Doc 16",
        title: "Officer Roles & Domains Template",
        body: "Named domains, clear responsibility, and a model for distributing work without hierarchy.",
        badge: "PDF",
      },
    ],
  },
  {
    icon: Megaphone,
    label: "Cluster 2 — Transparency & communication",
    docs: [
      {
        ref: "Doc 3",
        title: "Transparency Charter",
        body: "What the PTA commits to publish, to whom, and how often. The trust foundation.",
        badge: "PDF",
      },
      {
        ref: "Doc 4",
        title: "Parent Expectations Charter",
        body: "What parents can reasonably expect of the PTA — and what the PTA expects in return.",
        badge: "PDF",
      },
      {
        ref: "Doc 5",
        title: "Communications Toolkit (5a–5c)",
        body: "Templates for newsletters, announcements, and difficult messages. Three components.",
        badge: "PDF · 3 parts",
      },
      {
        ref: "Doc 12",
        title: "Permissions & Access Transparency Template",
        body: "Who can see what, who consented to what, and how it’s recorded. Privacy by design.",
        badge: "PDF",
      },
    ],
  },
  {
    icon: Handshake,
    label: "Cluster 3 — School engagement & evidence",
    docs: [
      {
        ref: "Doc 6",
        title: "School Engagement Protocol",
        body: "The five-stage initiative process that ensures no proposal is left without a decision.",
        badge: "PDF",
      },
      {
        ref: "Doc 14",
        title: "Prevalence Survey Framework",
        body: (
          <>
            Four research instruments plus methodology and citations.{" "}
            <Link href="/resources" className="font-semibold text-primary hover:underline">
              Pair with the calculator.
            </Link>
          </>
        ),
        badge: "PDF",
      },
      {
        ref: "Doc 15",
        title: "Community Survey Hub Site Template",
        body: "A zipped, ready-to-deploy survey site for running a community prevalence survey.",
        badge: "COMING SOON",
        soon: true,
      },
    ],
  },
];

export default function PtasOperatingPack() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <Link
            href="/ptas"
            className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to For PTAs
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            PTA · The Pack
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The PTA Operating Pack
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Seventeen documents that take a PTA from informal to credible — governance,
            transparency, voting, safeguarding, and school engagement. Adopt what you need; leave
            the rest. Everything is free, gated only by an email so we can send you the files.
          </p>
        </div>
      </section>

      {/* Transparency callout */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-lg text-foreground">
          <span className="font-semibold">Transparency with parents, not against the school.</span>{" "}
          Every document in this pack is designed to make the PTA more trustworthy to its members
          and a more credible partner to the school — never to build a case against school
          leadership.
        </blockquote>
      </section>

      {/* Clusters */}
      {CLUSTERS.map((cluster) => (
        <section key={cluster.label} className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <cluster.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">{cluster.label}</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cluster.docs.map((doc) => (
              <div
                key={doc.ref}
                className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
              >
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {doc.ref}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold text-foreground">{doc.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{doc.body}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      doc.soon
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {doc.badge}
                  </span>
                  {!doc.soon && (
                    <span className="inline-flex items-center text-sm font-semibold text-primary">
                      Download
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Solutions-oriented callout */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-lg text-foreground">
          <span className="font-semibold">The solutions-oriented filter.</span> Raise issues
          constructively, with a proposal, through the right channel. Every template in this pack
          assumes the PTA is working <em>with</em> the school, not against it.
        </blockquote>
      </section>

      {/* CTA row */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <span className={cn(buttonVariants({ size: "lg" }))}>
            Get the whole pack
            <ArrowRight className="ml-2 h-4 w-4" />
          </span>
          <Link
            href="/about#contact"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Need help deploying it? (free)
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

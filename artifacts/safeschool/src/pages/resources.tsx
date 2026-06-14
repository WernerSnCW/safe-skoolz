import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

// SchoolVBE "Resources" library (Phase 3 content migration). Copy reused
// verbatim from the live site (/resources/). Presentational + SSR-safe so it
// prerenders. Notes:
//  - Document downloads are email-gated on the live site; links render as "#"
//    here until the download/email seam is wired (Phase 4).
//  - The interactive Sample-Size Calculator and Community Survey tool are
//    separate tools (/resources/calculator, /resources/survey) — rendered here
//    as descriptive copy + links, not re-implemented inline (SSR-safe).

type Status = "download" | "soon" | { label: string };

type Doc = {
  title: string;
  body: string;
  status: Status;
  href?: string;
};

type Cluster = {
  num: string;
  title: string;
  blurb: string;
  docs: Doc[];
};

const CLUSTERS: Cluster[] = [
  {
    num: "1",
    title: "VBE Adoption Pack",
    blurb: "For schools adopting VBE — thirteen documents covering the full 10-day rollout.",
    docs: [
      {
        title: "Values Working Paper",
        body: "The foundational document: the actionable-belief distinction, value archetypes, and the Purpose→Consequences sequence.",
        status: "download",
      },
      {
        title: "Code of Conduct (Staff)",
        body: "Staff-facing conduct expectations grounded in the agreed values.",
        status: "soon",
      },
      {
        title: "Code of Conduct (Pupil)",
        body: "Pupil-facing conduct, written for four key stages.",
        status: "soon",
      },
      {
        title: "Parental Code of Conduct",
        body: "Contractual framework, values table, conduct expectations, and waiver structure.",
        status: "download",
      },
      {
        title: "CoC Enforceability Note",
        body: "Legal basis for the Code of Conduct. Scoped to schools operating under Spanish private education law.",
        status: { label: "SPAIN · LEGAL REVIEW" },
      },
      {
        title: "Disciplinary Framework",
        body: "Definitions (bullying, harassment, stalking), illustrative examples, and graduated disciplinary steps.",
        status: "download",
      },
      {
        title: "SLT Workshop Guide",
        body: "Facilitator guide for Days 1–2: the case, the values, and the rollout plan.",
        status: "soon",
      },
      {
        title: "Staff Workshop Guide",
        body: "Facilitator guide for Day 3: bringing all staff into the framework.",
        status: "soon",
      },
      {
        title: "Teacher Training Pack",
        body: "Day 4: modelling values, behaviour conversations, restorative basics.",
        status: "soon",
      },
      {
        title: "Parent Communication Pack",
        body: "Days 5–6: what VBE is, what it asks of families, how to take part.",
        status: "soon",
      },
      {
        title: "Pupil Rollout Guide",
        body: "Days 7–8: age-appropriate introduction of the values by key stage.",
        status: "soon",
      },
      {
        title: "90-Day Review Framework",
        body: "How to check what's working and keep the framework alive after launch.",
        status: "soon",
      },
      {
        title: "10-Day Rollout Calendar",
        body: "The whole rollout on one page — phase, audience, activity, output.",
        status: "soon",
      },
    ],
  },
  {
    num: "2",
    title: "Operating Structure & Governance",
    blurb:
      "For PTAs — constitutional and operational documents that take you from informal to credible.",
    docs: [
      {
        title: "Pre-Constitutional Operating Structure",
        body: "Three-tier model, decision authority, self-approval checklist.",
        status: "download",
      },
      {
        title: "Draft Constitution",
        body: "Codifies the operating model once it's working.",
        status: "download",
      },
      {
        title: "AGM & Meeting Framework",
        body: "Hybrid AGM, notice, quorum, agendas, minute discipline.",
        status: "download",
      },
      {
        title: "School Engagement Protocol",
        body: "The five-stage initiative process. No proposal left without a decision.",
        status: "download",
      },
      {
        title: "Governance Health Check",
        body: "Self-assessment that surfaces where your PTA is exposed.",
        status: "download",
      },
      {
        title: "New Member Onboarding Pack",
        body: "Everything a new member needs in their first term.",
        status: "download",
      },
      {
        title: "Digital Participation & Voting",
        body: "Async voting, proxy voting, digital comment periods.",
        status: "download",
      },
      {
        title: "Officer Roles & Domains",
        body: "Named domains and a model for distributing work without hierarchy.",
        status: "download",
      },
    ],
  },
  {
    num: "3",
    title: "Transparency & Communication",
    blurb:
      "For PTAs — the tools that build trust with parents and credibility with the school.",
    docs: [
      {
        title: "Transparency Charter",
        body: "What the PTA commits to publish, to whom, and how often.",
        status: "download",
      },
      {
        title: "Parent Expectations Charter",
        body: "What parents can expect of the PTA — and the PTA of parents.",
        status: "download",
      },
      {
        title: "Communications Toolkit",
        body: "Templates for newsletters, announcements, and difficult messages.",
        status: { label: "PDF · 3 parts" },
      },
      {
        title: "Permissions & Access Transparency",
        body: "Who can see what, who consented, and how it's recorded.",
        status: "download",
      },
    ],
  },
  {
    num: "4",
    title: "Wellbeing & PSHE",
    blurb: "For parents — wellbeing standards and a PSHE starter grounded in real practice.",
    docs: [
      {
        title: "Parent Wellbeing & Safeguarding Expectations",
        body: "The standards parents can reasonably expect — and the questions to ask.",
        status: "download",
      },
      {
        title: "KS3: PSHE Curriculum Starter",
        body: "14 KS3 lessons — Identity & Belonging, Healthy Relationships, Consent, Online Safety, Mental Health, Peer Pressure, Substance Awareness, Economic Wellbeing.",
        status: { label: "PDF · 14 lessons" },
      },
      {
        title: "Reference: PSHE Programme of Study (KS1–5)",
        body: "How the starter maps to the national PSHE programme of study across key stages.",
        status: { label: "REFERENCE" },
      },
    ],
  },
  {
    num: "5",
    title: "Evidence & Research",
    blurb:
      "Research instruments and methodology — pre-adoption tools for building a picture of community needs. Once your school deploys vibez, these instruments are replaced by the platform's built-in diagnostics and climate surveys.",
    docs: [
      {
        title: "The Community Prevalence Survey",
        body: "The four instruments and behavioural-itemisation methodology as a live, free tool. Run it before you have a structured wellbeing system.",
        status: "soon",
      },
      {
        title: "Prevalence Survey Framework",
        body: "Four research instruments, a methodology guide, and citations. Pair with the calculator.",
        status: "download",
      },
      {
        title: "Community Survey Hub Site Template",
        body: "A zipped, ready-to-deploy survey site for running a community prevalence survey.",
        status: "soon",
      },
    ],
  },
  {
    num: "6",
    title: "Regulatory Alignment",
    blurb:
      "Framework briefings for PTAs and schools engaging on compliance. Each is scoped to a specific jurisdiction — they are not interchangeable.",
    docs: [
      {
        title: "Spain / Balearics: Regulatory Briefing — LOPIVI + Convivèxit",
        body: "For international schools operating under Spanish jurisdiction, specifically the Balearic Islands coexistence protocol (Decree 121/2010). School obligations, incident classification, mandatory referral timelines, statutory annex requirements.",
        status: { label: "SPAIN ONLY" },
      },
      {
        title: "UK: Regulatory Briefing — KCSiE",
        body: "For international schools using the UK framework as their safeguarding standard. DSL obligations, safer recruitment, online safety, and Part 1 staff guidance (current edition).",
        status: { label: "UK ONLY" },
      },
      {
        title: "Universal: GDPR + UNCRC + Research Instruments",
        body: "Applicable across all jurisdictions: data protection, children's rights, and six supporting evidence papers.",
        status: { label: "ALL CONTEXTS" },
      },
    ],
  },
  {
    num: "7",
    title: "Coalition Toolkit",
    blurb:
      "For parent groups — everything needed to build a credible, constructive case for VBE adoption. The parent-coalition toolkit.",
    docs: [
      {
        title: "VBE Advocacy Brief",
        body: "What VBE is and why it works — one page.",
        status: "download",
      },
      {
        title: "The Case for VBE template",
        body: "5-slide fill-in deck with [SCHOOL] placeholders.",
        status: "download",
      },
      {
        title: "Parent Prevalence Survey (short form)",
        body: "10 questions, suitable for informal use.",
        status: "download",
      },
      {
        title: "Talking Points Sheet",
        body: "Top five questions, with constructive answers.",
        status: "download",
      },
      {
        title: "Request to the PTA Chair",
        body: "Formal request to consider VBE adoption.",
        status: "download",
      },
      {
        title: "Request to the Headteacher",
        body: "Formal request to consider VBE adoption.",
        status: "download",
      },
    ],
  },
];

function DocBadge({ status }: { status: Status }) {
  if (status === "download") {
    return (
      <span className="inline-flex items-center text-sm font-semibold text-primary">
        <Download className="mr-1.5 h-4 w-4" />
        Download
      </span>
    );
  }
  if (status === "soon") {
    return (
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Coming soon
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {status.label}
    </span>
  );
}

export default function ResourcesPage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Resources</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Everything, in one library.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            The full vibez resource set, organised by what you're trying to do. Every document
            is free; an email unlocks the downloads and lets us send you the files. The document is
            on its way the moment you submit — the email is a bonus, not a paywall.
          </p>
        </div>
      </section>

      {/* Clusters */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {CLUSTERS.map((c) => (
          <section key={c.num} className="mb-16">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Cluster {c.num}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{c.title}</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">{c.blurb}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {c.docs.map((d) => {
                const inner = (
                  <>
                    <h3 className="font-display text-base font-bold text-foreground">{d.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{d.body}</p>
                    <div className="mt-4">
                      <DocBadge status={d.status} />
                    </div>
                  </>
                );
                return d.href ? (
                  <Link
                    key={d.title}
                    href={d.href}
                    className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={d.title}
                    className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Sample size calculator (interactive tool linked, not inlined) */}
        <section className="mb-16 rounded-2xl border border-border bg-card p-8">
          <h2 className="font-display text-xl font-bold text-foreground">Sample Size Calculator</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Before your school has a structured survey system, this tells you whether your informal
            survey responses are statistically meaningful. For schools that have adopted VBE and
            deployed vibez, the platform's diagnostics module handles this automatically.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            For a school of 500 pupils/parents, you need at least 218 responses to achieve 95%
            confidence with a 5% margin of error.
          </p>
          <span className="mt-4 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
        </section>
      </div>

      {/* Closing note */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          These tools help you make the case.{" "}
          <span className="font-semibold">vibez delivers the reality.</span>
        </blockquote>
      </section>
    </AppShell>
  );
}

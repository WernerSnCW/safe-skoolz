import { useState } from "react";
import { Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  School, Users, Vote, ClipboardCheck, BookMarked, Presentation,
  HeartHandshake, FileText, ArrowRight, Download,
} from "lucide-react";

// The in-app Resource Centre — the marketing-site resources/packs/guides/tools,
// integrated so they don't disappear once you log in. Filterable by mission.
// "Get everywhere from anywhere": every resource and tool reachable here, and
// surfaced contextually in each mission hub.

type Audience = "schools" | "parents" | "ptas" | "tools";

type Resource = {
  title: string;
  desc: string;
  audience: Audience;
  icon: any;
  href: string;
  cta: string;
  external?: boolean;
};

const RESOURCES: Resource[] = [
  { title: "VBE Adoption Pack", desc: "Everything your SLT, teachers, parents and pupils need to adopt VBE in 10 working days.", audience: "schools", icon: School, href: "/schools", cta: "Open the pack" },
  { title: "Readiness Diagnostic", desc: "See if your community is ready for VBE — run the free diagnostic and get a report.", audience: "tools", icon: ClipboardCheck, href: "/diagnostics", cta: "Start a diagnostic" },
  { title: "Lessons & PSHE", desc: "Ready-to-teach values lessons and PSHE material aligned to the VBE framework.", audience: "schools", icon: Presentation, href: "/lessons", cta: "Browse lessons" },
  { title: "Illustrative Case Study", desc: "A walk-through of how a community builds its values framework from the ground up.", audience: "schools", icon: BookMarked, href: "/case-studies", cta: "Read the case study" },
  { title: "Parent Guide to VBE", desc: "Understand VBE, how to participate with limited time, and what to expect from your school.", audience: "parents", icon: Users, href: "/parents", cta: "Open the guide", external: true },
  { title: "Start or Join a Group", desc: "Form a private parent group, build a single voice, and give your school a constructive path to VBE.", audience: "parents", icon: HeartHandshake, href: "/coalitions", cta: "Start or join", external: true },
  { title: "PTA Operating Pack", desc: "Governance, transparency, voting, safeguarding and engagement — immediately deployable.", audience: "ptas", icon: Vote, href: "/ptas", cta: "Get the pack", external: true },
  { title: "Community Survey", desc: "Gather your community's voice with a ready-made survey, then act on the results.", audience: "tools", icon: FileText, href: "/resources", cta: "Run a survey", external: true },
];

const FILTERS: { key: Audience | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "schools", label: "Schools" },
  { key: "parents", label: "Parents" },
  { key: "ptas", label: "PTAs" },
  { key: "tools", label: "Tools" },
];

const AUDIENCE_TINT: Record<Audience, string> = {
  schools: "bg-role-staff/10 text-role-staff",
  parents: "bg-role-parent/10 text-role-parent",
  ptas: "bg-role-pta/10 text-role-pta",
  tools: "bg-primary/10 text-primary",
};

export default function ResourceCentre() {
  const [filter, setFilter] = useState<Audience | "all">("all");
  const shown = filter === "all" ? RESOURCES : RESOURCES.filter((r) => r.audience === filter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resource Centre"
        title="Everything you need — free"
        subtitle="The VBE packs, guides and tools for schools, parents and PTAs. Open any of them right here."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {shown.map((r) => {
          const Wrapper: any = r.external ? "a" : Link;
          const wrapperProps = r.external
            ? { href: r.href, target: "_blank", rel: "noopener" }
            : { href: r.href };
          return (
            <Wrapper key={r.title} {...wrapperProps} className="block">
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", AUDIENCE_TINT[r.audience])}>
                  <r.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-foreground">{r.title}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.desc}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
                  {r.external ? <Download className="mr-1.5 h-4 w-4" /> : null}
                  {r.cta}
                  {!r.external ? <ArrowRight className="ml-1.5 h-4 w-4" /> : null}
                </span>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

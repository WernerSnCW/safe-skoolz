import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  EyeOff,
  Gem,
  AlertTriangle,
  Ear,
  HandHeart,
  Heart,
  Sparkles,
  ShieldCheck,
  Compass,
  FileText,
  BookOpen,
} from "lucide-react";

// SchoolVBE "Illustrative Example — VBE in Practice" page (Phase 3 content
// migration). Copy reused verbatim from the live site (/schools/case-study).
// Presentational + SSR-safe so it prerenders; reached at /schools/case-study.
// CTAs point to /diagnostics and /schools/10-day-rollout.

const STATS: { n: string; label: string }[] = [
  { n: "5", label: "Values in the set" },
  { n: "5", label: "Patterns addressed" },
  { n: "9", label: "Documents in the set" },
  { n: "12", label: "Research citations" },
];

const PATTERNS: {
  n: string;
  icon: typeof Users;
  name: string;
  body: string;
}[] = [
  {
    n: "01",
    icon: Users,
    name: "Coordinated group conduct",
    body: "Harm carried out through groups, with a less-visible lead. Group structure provides cover and makes attribution difficult for staff.",
  },
  {
    n: "02",
    icon: EyeOff,
    name: "Sophisticated social exclusion",
    body: "Deliberate and targeted, but hard to identify without specific training. Operates through signals, silences, and social micro-behaviours rather than visible acts.",
  },
  {
    n: "03",
    icon: Gem,
    name: "Status-based targeting",
    body: "Material wealth and possessions used as tools for social cruelty. In a community where advantage is visible, this becomes a primary vector for harm.",
  },
  {
    n: "04",
    icon: AlertTriangle,
    name: "Age-inappropriate conduct",
    body: "Behaviours and language from outside school entering the school environment. Without a shared framework, there is no agreed basis for drawing the line.",
  },
  {
    n: "05",
    icon: Ear,
    name: "Bystander passivity",
    body: "Children who witness harm and say nothing — not a character failure, but the result of a community that had never named standing up as an expectation. Passivity sustains every other pattern.",
  },
];

const CHAIN: { label: string; name: string; desc: string }[] = [
  { label: "Start here", name: "Purpose", desc: "Why we exist" },
  { label: "Then", name: "Vision", desc: "What we are becoming" },
  { label: "Then", name: "Values", desc: "What we stand for and how we behave" },
  { label: "Only then", name: "Policy", desc: "The rules that express all of this" },
];

const VALUES: {
  num: string;
  icon: typeof HandHeart;
  name: string;
  means: string;
  matters: string;
  looks: string;
}[] = [
  {
    num: "Value 1",
    icon: HandHeart,
    name: "We stand up for each other",
    means:
      "Watching is a choice. If you see someone targeted and say nothing, you have chosen not to stand up for them. Bystander passivity is not neutrality — it is participation in the harm. This applies to adults as much as children.",
    matters:
      "The most damaging patterns here are coordinated and social. They depend on bystanders staying silent. This value directly addresses the mechanism by which harm is sustained and spread.",
    looks:
      "A child who says something when a peer is excluded. A child who doesn't laugh when someone is mocked. A child who tells an adult even when it is socially costly to do so.",
  },
  {
    num: "Value 2",
    icon: Heart,
    name: "It's what's inside that counts",
    means:
      "Money, clothes, possessions — none of these is how we measure people. Status based on wealth, possessions, or appearance is not what we recognise or reward.",
    matters:
      "Children who target others over wealth or possessions are often acting from something they themselves lack — security, identity, belonging. The behaviour is a signal, not just a problem to manage.",
    looks:
      "Staff modelling the value. Explicit conversations in PSHE and bystander education about why we do not rate people by what they own.",
  },
  {
    num: "Value 3",
    icon: HandHeart,
    name: "We don't leave anyone behind",
    means:
      "Every child in this community belongs. That commitment doesn't waver — not for the child who is struggling, not for the child who has caused harm.",
    matters:
      "Without a framework, this instinct can look like a commitment at the expense of others. Reframing makes clear it applies equally — consequence is part of support, not its opposite.",
    looks:
      "A child involved in bullying who goes through a structured process — restorative conversation, parental involvement, support assessment — not a warning that disappears.",
  },
  {
    num: "Value 4",
    icon: ShieldCheck,
    name: "We keep it real",
    means:
      "Honesty is protected here — including honesty about who you are. A child who reports what they saw will not be punished. A child who is simply being themselves will not be mocked for it. A parent who raises a concern will get a real answer.",
    matters:
      "Where status and performance dominate, children need explicit permission to be themselves — or they perform a version of themselves to fit in, rather than developing the self-knowledge the mission demands.",
    looks:
      "A school where being different — quiet or loud, creative or analytical — is equally valid. A reporting pathway children trust because they have seen it work.",
  },
  {
    num: "Value 5",
    icon: Sparkles,
    name: "We grow together",
    means:
      "Nobody here is finished. Every child is on a journey. Growth means curiosity, openness to being wrong, and believing that what you do here matters beyond these walls. We grow individually, and as a community.",
    matters:
      "This community is transient — people arrive not knowing anyone. The mission demands young people who can navigate a fast-moving world; that cannot happen if the culture rewards only performance and conformity.",
    looks:
      "A child who tries something new without fear of being laughed at. A community that celebrates progress, not just achievement. Asking for help treated as a strength.",
  },
];

const PRACTICE: { value: string; requires: string; rulesOut: string }[] = [
  {
    value: "We stand up for each other",
    requires:
      "Active bystander intervention; reporting even when socially costly; peer accountability",
    rulesOut:
      "Watching and saying nothing; laughing along; group silence when someone is targeted",
  },
  {
    value: "It's what's inside that counts",
    requires:
      "No status-based mockery; inclusive norms regardless of wealth; neutral language about possessions",
    rulesOut:
      "Targeting based on money, appearance, or family situation; exclusion as social currency",
  },
  {
    value: "We don't leave anyone behind",
    requires:
      "Support for all children, including those who breached the rules; structured, followed-through consequences",
    rulesOut:
      "Consequences applied differently depending on who applies pressure; support for one child at the expense of others",
  },
  {
    value: "We keep it real",
    requires:
      "Honest communication; protected reporting pathways; respect for individual difference",
    rulesOut:
      "Managed or deflecting communication; children afraid to speak; mockery of difference",
  },
  {
    value: "We grow together",
    requires:
      "Curiosity; learning from mistakes; celebrating others' progress; offering and asking for help",
    rulesOut:
      "Mocking failure or effort; treating learning as a competition; celebrating others' setbacks",
  },
];

const DOCS: { eyebrow: string; title: string; body: string }[] = [
  {
    eyebrow: "Foundation",
    title: "Values Working Paper",
    body: "Vision, mission, community diagnosis, the five values with behaviours, and a workshop proposal. The foundational document.",
  },
  {
    eyebrow: "Pupil-facing",
    title: "What We Stand For",
    body: "The five values in plain language, written to be understood by a child, with a pupil-leader rollout guide.",
  },
  {
    eyebrow: "Process",
    title: "VBE Adoption Pathway",
    body: "A five-stage plan from proposal to formal adoption and ongoing embedding.",
  },
  {
    eyebrow: "Policy",
    title: "Anti-Bullying Policy",
    body: "Child and family-facing: values, definitions, expected conduct, and a five-step graduated framework.",
  },
  {
    eyebrow: "Governance",
    title: "Accountability Framework",
    body: "School-facing, aligned to local safeguarding obligations: definitions, a five-step ladder, and behaviour categories.",
  },
  {
    eyebrow: "Conduct",
    title: "Parental Code of Conduct",
    body: "A binding enrolment annex covering parties, legal basis, values, conduct, and the disciplinary framework.",
  },
];

const EVIDENCE: { theme: string; finding: string }[] = [
  {
    theme: "Bystander intervention",
    finding:
      "A meta-analysis of 49 studies found teaching explicit bystander skills increases responsibility for intervening and reduces violence perpetration. Passivity can be directly addressed through shared values and skills.",
  },
  {
    theme: "Affluence & wellbeing",
    finding:
      "Foundational research (Luthar et al.) shows children in affluent communities face elevated anxiety and depression, with high peer status linked to sophisticated social aggression rather than physical violence.",
  },
  {
    theme: "Restorative practice",
    finding:
      "Systematic reviews find structured restorative processes improve school climate and wellbeing — and that consistency of consequence matters as much as the practice itself.",
  },
  {
    theme: "Values-based education",
    finding:
      "Global reviews show VBE improves engagement, behaviour, and relational trust — but only when it involves the whole community, parents especially. Parents who help define the values become the school's strongest advocates.",
  },
];

export default function SchoolsCaseStudy() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <Link
            href="/schools"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to For Schools
          </Link>
          <p className="mt-6 font-mono text-sm uppercase tracking-wide text-primary">
            Illustrative Example · VBE in Practice
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            What building a values framework actually looks like.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            An illustrative walk-through of how a parent community, working alongside its school,
            might build a values framework from the ground up — the diagnosis, the values, the
            behaviours, and the documents. It is a representative example to show what the work
            involves in practice, not an account of any specific school.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
            >
              <div className="font-display text-4xl font-bold text-primary">{s.n}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The starting point */}
      <section className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
        <div className="rounded-2xl border-l-4 border-primary bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">The starting point</h2>
          <p className="mt-4 text-muted-foreground">
            A school has a culture whether by design or by default. Picture a community with
            persistent, documented concerns about conduct — but no shared foundation underneath its
            policies. It is operating backwards: programmes and rules first, with no agreed values to
            make them coherent.
          </p>
          <p className="mt-4 text-muted-foreground">
            The result is familiar: one set of values in primary and a different set in secondary,
            additional behaviour initiatives layered on top, and no single reference point a child,
            parent, or staff member can point to. Incidents recur and responses feel inconsistent —
            not because people don't care, but because there is nothing deeper to anchor them.
          </p>
        </div>
      </section>

      {/* The challenge — five patterns */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          The challenge — five patterns of concern
        </h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          A structured diagnosis typically surfaces patterns like these five. Each is directly
          addressed by one or more of the values a community then defines.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {PATTERNS.map((p) => (
            <div
              key={p.n}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{p.n}</span>
                  <h3 className="font-display text-lg font-bold text-foreground">{p.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
          These are the signature dynamics of an affluent, internationally mobile school community:
          coordinated social aggression rather than physical violence, and harm sustained by silence.
        </div>
      </section>

      {/* The foundation that was missing */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">
            The foundation that was missing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Schools that work build from the inside out. Purpose comes first; policy comes last. This
            community was doing it in reverse.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {CHAIN.map((c) => (
              <div
                key={c.name}
                className="rounded-xl border border-border bg-background p-5"
              >
                <div className="font-mono text-xs uppercase tracking-wide text-primary">
                  {c.label}
                </div>
                <div className="mt-2 font-display text-lg font-bold text-foreground">{c.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
            <span className="font-semibold">A value is an actionable belief, not a word.</span>{" "}
            "We stand up for each other" is a value. "Respect" is not. A value only exists if it
            changes behaviour.
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Vision &amp; Mission</h2>
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="font-mono text-xs uppercase tracking-wide text-primary">Vision</div>
            <p className="mt-3 text-lg text-foreground">
              A school community that is a genuine anchor — a stable, safe, and human place where
              children can learn who they are, what they believe, and how to treat others — so that
              when the world asks everything of them, they are ready.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="font-mono text-xs uppercase tracking-wide text-primary">Mission</div>
            <p className="mt-3 text-lg text-foreground">
              To develop grounded, confident young people with the values, resilience, and
              self-knowledge to navigate a fast-moving world on their own terms — and to contribute
              meaningfully to it.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
          The world these children will enter is already fundamentally different from the one their
          parents grew up in. What can be predicted is the need for people who are grounded, honest,
          empathetic, and resilient — people who know what they stand for.
        </div>
      </section>

      {/* The five values */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          The five values — and the behaviours behind them
        </h2>
        <div className="mt-8 space-y-6">
          {VALUES.map((v) => (
            <div
              key={v.num}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <v.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-wide text-primary">
                    {v.num}
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">{v.name}</h3>
                </div>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    What it means
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{v.means}</p>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Why it matters
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{v.matters}</p>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    What it looks like
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{v.looks}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values in practice table */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Values in practice</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 font-semibold text-foreground">Value</th>
                <th className="p-4 font-semibold text-foreground">What it requires</th>
                <th className="p-4 font-semibold text-foreground">What it rules out</th>
              </tr>
            </thead>
            <tbody>
              {PRACTICE.map((row) => (
                <tr key={row.value} className="border-b border-border/60 last:border-0">
                  <td className="p-4 font-semibold text-foreground">{row.value}</td>
                  <td className="p-4 text-muted-foreground">{row.requires}</td>
                  <td className="p-4 text-muted-foreground">{row.rulesOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What the community produced */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          What the community produced
        </h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Working from the values outward, a community produces a full, internally cross-referenced
          document set — offered to the school as starting points to review, adapt, and adopt.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DOCS.map((d) => (
            <div
              key={d.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div className="mt-4 font-mono text-xs uppercase tracking-wide text-primary">
                {d.eyebrow}
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-foreground">{d.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{d.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
          <span className="font-semibold">Values first, documents second.</span> Each document only
          makes sense because the community first agreed what it stands for. Without the values
          underneath, they would just be rules.
        </div>
      </section>

      {/* The evidence base */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">The evidence base</h2>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          The approach was grounded in established research — more than two decades of it. A
          selection of the studies behind the values:
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 font-semibold text-foreground">Theme</th>
                <th className="p-4 font-semibold text-foreground">Finding</th>
              </tr>
            </thead>
            <tbody>
              {EVIDENCE.map((row) => (
                <tr key={row.theme} className="border-b border-border/60 last:border-0">
                  <td className="p-4 font-semibold text-foreground">{row.theme}</td>
                  <td className="p-4 text-muted-foreground">{row.finding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-2xl border-l-4 border-primary bg-accent/40 p-6 text-foreground">
          The recurring finding across the literature: values-based education works — and it works
          because parents who helped define what the school stands for relate to its rules in a
          fundamentally different way to those who were handed a rulebook.
        </div>
      </section>

      {/* What this shows */}
      <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
        <div className="rounded-2xl border-l-4 border-primary bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground">What this shows</h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            A motivated parent community, working constructively with its school, can diagnose what's
            really happening, define values that change behaviour, and produce a complete,
            evidence-backed framework — quickly. That is exactly the path SchoolVBE equips any
            community to take.
          </p>
        </div>
      </section>

      {/* CTAs */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/diagnostics" className={cn(buttonVariants({ size: "lg" }))}>
            Run the diagnostic for your school
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/schools/10-day-rollout"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            See the 10-day rollout
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

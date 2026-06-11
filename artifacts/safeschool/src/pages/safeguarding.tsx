import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  MessageCircle,
  Users,
  GraduationCap,
  Bell,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";

// SchoolVBE "Safeguarding & concern reporting" public marketing page. Tells the
// story of vibez's most distinctive feature — letting pupils, parents, and staff
// raise a concern safely, and showing how the school handles it with proper
// safeguarding rigour. Framed as a tool WITHIN a values culture, not a fear-led
// front door. Presentational + SSR-safe (no state/effects/window/data fetching)
// so it prerenders; registered centrally in PUBLIC_ROUTES.

const VOICES: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
}[] = [
  {
    icon: GraduationCap,
    title: "Pupils",
    body: "Whether it's about themselves or a friend, pupils can speak up in their own words — quietly, without making a scene, and without needing to know who to ask.",
  },
  {
    icon: Users,
    title: "Parents",
    body: "Parents can flag a worry about wellbeing, friendships, or something they've noticed at home, knowing it reaches the right person at school rather than getting lost.",
  },
  {
    icon: GraduationCap,
    title: "Staff",
    body: "Teachers and staff log what they observe in a single, consistent place — so small signals build into a clear picture instead of sitting in separate inboxes.",
  },
];

const STEPS: {
  icon: typeof Bell;
  step: string;
  title: string;
  body: string;
}[] = [
  {
    icon: MessageCircle,
    step: "01",
    title: "A concern is raised",
    body: "Anyone in the community can start it in a few sentences — calmly, in their own time, with as much or as little detail as they have.",
  },
  {
    icon: Bell,
    step: "02",
    title: "It reaches the right trusted adult",
    body: "The concern is routed to the designated safeguarding lead and the right named people — not broadcast, not left to chance.",
  },
  {
    icon: FileText,
    step: "03",
    title: "It's tracked and handled",
    body: "Each concern has an owner and a clear status, so nothing slips through the cracks and everyone involved knows it's being looked after.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "It's resolved and recorded",
    body: "Actions and outcomes are captured against the case, closing the loop and building the picture that keeps the whole community well.",
  },
];

export default function SafeguardingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Safeguarding & concern reporting
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            When something's wrong, every voice has a safe way to be heard.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            A values-led school is one where pupils, parents, and staff know exactly how to raise a
            worry — and trust that it will be handled by the right people, with care. vibez gives
            that quiet confidence a clear, simple home.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Try vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              See how VBE works
            </Link>
          </div>
        </div>
      </section>

      {/* Framing statement */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Part of a healthy culture, not a panic button
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Speaking up shouldn't feel like sounding an alarm. In a community built on shared values,
          raising a concern is simply what looking out for each other looks like — for the small
          worries as much as the serious ones.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          vibez makes that everyday and undramatic: an easy way to say "something doesn't feel
          right" and know it lands with someone who can help.
        </p>
      </section>

      {/* Who can raise a concern */}
      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Who can raise a concern
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-foreground">
          Everyone in the community has a way in
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {VOICES.map((v) => (
            <div
              key={v.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{v.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What happens next */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          What happens next
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold text-foreground">
          From "something's wrong" to resolved
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm font-semibold uppercase text-muted-foreground">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Safeguarding rigour */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-foreground">
            Handled with proper safeguarding rigour
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Behind the calm, simple surface sits the discipline safeguarding demands. Concerns are
            seen only by the right named people, every action is recorded against the case, and a
            clear audit trail means the school can show what happened, when, and who acted.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-start gap-3 text-muted-foreground">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>Routed to the designated safeguarding lead and only the people who need to see it.</span>
            </li>
            <li className="flex items-start gap-3 text-muted-foreground">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>Every concern, action, and outcome recorded as a timestamped, auditable case.</span>
            </li>
            <li className="flex items-start gap-3 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>Nothing closed until it's owned, followed up, and resolved.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA row */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Give every voice a safe way to be heard.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Reporting is just one part of building a values-led community — but it's the part that
            tells everyone they're looked after. See it in vibez.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Try vibez
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              See how VBE works
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

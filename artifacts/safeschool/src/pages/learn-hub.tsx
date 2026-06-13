import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Route as RouteIcon, Activity, Users, ClipboardCheck, BookOpen, ShieldCheck, FolderOpen, ArrowRight,
} from "lucide-react";

// Phase 2c: the public "Learn VBE" hub — the teach half of teach-then-ask.
// Organises the VBE-education spine and routes out to the canonical deep pages;
// it duplicates no page bodies. Presentational / SSR-safe (prerenders for SEO).
// Anon visitors land here at /learn; authed users get the in-app dispatcher via
// LearnRoute (App.tsx). Copy is honest placeholder — final wording lands in the
// end-of-phase content audit (spec §1).

const SPINE: {
  icon: typeof RouteIcon;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
}[] = [
  {
    icon: RouteIcon,
    eyebrow: "The framework",
    title: "How a school adopts VBE",
    body: "Diagnose, Adopt, Embed, Sustain — the end-to-end journey, and what Vibes does at each step.",
    cta: { label: "See the framework", href: "/how-it-works" },
  },
  {
    icon: Activity,
    eyebrow: "What it improves",
    title: "The behaviours VBE works on",
    body: "VBE focuses on how children treat each other and how the school responds when they fall short. The readiness diagnostic measures exactly those patterns.",
    cta: { label: "Run the diagnostic", href: "/diagnostic" },
  },
  {
    icon: Users,
    eyebrow: "For your role",
    title: "What VBE means for you",
    body: "Schools, parents, PTAs and pupils each have a part to play. See how values-based education works for your role.",
    cta: { label: "Explore by who you are", href: "/schools" },
  },
];

const TOOLS: { icon: typeof RouteIcon; title: string; body: string; href: string }[] = [
  { icon: ClipboardCheck, title: "Readiness diagnostic", body: "A free, no-login self-assessment of where your community stands.", href: "/diagnostic" },
  { icon: BookOpen, title: "Lessons & PSHE", body: "The values-based lessons and ready-to-teach materials.", href: "/learning" },
  { icon: ShieldCheck, title: "Safeguarding & reporting", body: "How every voice gets a safe, structured way to be heard.", href: "/safeguarding" },
  { icon: FolderOpen, title: "Free resources", body: "The VBE Adoption Pack, operating structure, and more.", href: "/resources" },
];

export default function LearnHub() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Learn VBE</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Understand values-based education
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          What VBE is, how a school adopts it, and what it changes — so you can decide for your community. Free, no sign-in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/how-it-works" className={cn(buttonVariants({ size: "lg" }))}>
            See how it works
          </Link>
          <Link href="/diagnostic" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Run the diagnostic
          </Link>
        </div>
      </section>

      {/* What VBE is — inline framing */}
      <section className="mx-auto max-w-3xl px-4 pb-4 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <p className="text-lg text-foreground">
            Values-based education makes a school&apos;s values something children live every day — not a poster on the wall.
            It works on how children treat each other, and how the adults respond. Vibes is the software that makes it run.
          </p>
        </div>
      </section>

      {/* The spine */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {SPINE.map((s) => (
            <div key={s.title} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{s.eyebrow}</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{s.title}</h2>
              <p className="mt-2 flex-1 text-muted-foreground">{s.body}</p>
              <Link href={s.cta.href} className="mt-4 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                {s.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Supporting tools */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Supporting tools</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Everything, in one place</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <tool.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{tool.title}</h3>
              <p className="mt-2 text-muted-foreground">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

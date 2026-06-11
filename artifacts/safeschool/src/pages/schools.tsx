import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Globe,
  ClipboardCheck,
  CalendarDays,
  Route as RouteIcon,
  HeartHandshake,
  FileText,
} from "lucide-react";

// SchoolVBE "For Schools" marketing page (Phase 3 content migration). Copy
// reused verbatim from the live site (/schools/). Presentational + SSR-safe so
// it prerenders; registered in PUBLIC_ROUTES. Card/CTA links point to deeper
// /schools/* routes that later Phase 3 pages will fill in.

const TRACK: {
  icon: typeof BookOpen;
  title: string;
  body: string;
  href: string;
}[] = [
  {
    icon: BookOpen,
    title: "Why Values-Based Education",
    body: "What VBE is, the evidence base, and the distinction that changes behaviour.",
    href: "/schools/why-vbe",
  },
  {
    icon: Globe,
    title: "VBE in International Schools",
    body: "The dynamics that shape internationally mobile communities — and why shared values give third-culture children an anchor.",
    href: "/schools/vbe-international",
  },
  {
    icon: ClipboardCheck,
    title: "Is VBE Right for Your School?",
    body: "A short, structured diagnostic that maps your community against VBE readiness indicators.",
    href: "/schools/diagnose",
  },
  {
    icon: CalendarDays,
    title: "The 10-Day VBE Rollout",
    body: "Day-by-day, with what every party receives — SLT, teachers, parents, pupils, governors.",
    href: "/schools/10-day-rollout",
  },
  {
    icon: RouteIcon,
    title: "How to Adopt VBE",
    body: "Five stages from proposal to embedding — self-directed or with our advisory team.",
    href: "/schools/adopt-vbe",
  },
  {
    icon: HeartHandshake,
    title: "Free Support",
    body: "Free help with the guided rollout, community engagement, or running a survey — whenever you want it.",
    href: "/about#contact",
  },
  {
    icon: FileText,
    title: "Illustrative Example — VBE in Practice",
    body: "A representative walk-through: the diagnosis, the five values and behaviours, and the documents a community develops.",
    href: "/schools/case-study",
  },
];

export default function SchoolsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">For Schools</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Our mission is to support schools in adopting values-based education.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            VBE is not a curriculum change — it is a cultural framework that builds your school's
            conduct, wellbeing, and community around explicitly agreed, actionable values. We give
            your SLT, teachers, parents, and pupils everything they need to make it real.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/schools/10-day-rollout"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start the 10-day rollout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/schools/diagnose"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Run the diagnostic first
            </Link>
          </div>
        </div>
      </section>

      {/* Explore the schools track */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Explore the schools track</h2>
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

      {/* Key definition statement */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <blockquote className="rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          A value is an actionable belief, not a word.{" "}
          <span className="font-semibold">"We stand up for each other"</span> is a value.{" "}
          <span className="font-semibold">"Respect"</span> is not. That distinction is where VBE
          begins — and why it changes conduct in ways a poster never will.
        </blockquote>
      </section>
    </PublicLayout>
  );
}

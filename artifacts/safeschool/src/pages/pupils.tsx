import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Smile,
  BookHeart,
  Sparkles,
  ShieldCheck,
  Megaphone,
  Heart,
} from "lucide-react";

// SchoolVBE "For pupils" page. Pupils aren't the buyer, so this is written for
// the adults evaluating vibez — a warm, wellbeing-first picture of what pupils
// actually experience, reassuring parents and schools that pupils are at the
// centre of VBE, not an afterthought. Presentational + SSR-safe so it
// prerenders; app design tokens; no framer enter-animations.

const EXPERIENCE: { icon: typeof Smile; title: string; body: string }[] = [
  {
    icon: Smile,
    title: "Check in on how they feel",
    body: "A quick, friendly feelings check-in gives every pupil a moment to notice how they're doing — and gives the adults around them a gentle signal when something's off.",
  },
  {
    icon: BookHeart,
    title: "A private space of their own",
    body: "A personal diary that belongs to the pupil — somewhere to put thoughts into words, build the habit of reflection, and feel ownership over their own wellbeing.",
  },
  {
    icon: Sparkles,
    title: "Values brought to life",
    body: "Lessons and activities that turn the school's values from words on a wall into something a child can understand, talk about, and apply on any given day.",
  },
  {
    icon: ShieldCheck,
    title: "A safe way to speak up",
    body: "When something's wrong, pupils can reach a trusted adult through a clear, calm channel — so worries are heard early and handled with care.",
  },
  {
    icon: Megaphone,
    title: "A place to belong",
    body: "A shared noticeboard celebrates the everyday moments — kindness, effort, contribution — that make a values culture feel real to the people living it.",
  },
];

export default function PupilsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            At the heart of VBE
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Where values become something pupils can feel.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Values-based education only matters if it reaches the pupils living it. Here's what your
            children experience in vibez — calm, wellbeing-first, and built around them.
          </p>
        </div>
      </section>

      {/* What pupils experience */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <p className="mb-6 font-mono text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
          What pupils experience
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {EXPERIENCE.map((e) => (
            <div
              key={e.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <e.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-foreground">{e.title}</h2>
              <p className="mt-3 text-muted-foreground">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reassurance */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Safe by design</h2>
            <p className="mt-2 text-muted-foreground">
              A pupil's diary and feelings are private to them. Anything that signals a child may need
              help reaches the right trusted adult — and nothing else does. Pupils get a space that's
              theirs; schools get the safeguarding rigour they're accountable for.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Pupils are the reason — everyone else is the support.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            See how schools put VBE in place, and how parents help it land at home.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/schools" className={cn(buttonVariants({ variant: "secondary" }), "font-semibold")}>
              How schools adopt VBE
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            <Link
              href="/parents"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-primary-foreground/30 bg-transparent font-semibold text-primary-foreground hover:bg-primary-foreground/10",
              )}
            >
              How parents can help
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

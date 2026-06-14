import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Megaphone, Users, Vote, HeartHandshake, Eye, CheckCircle2 } from "lucide-react";

// The canonical "What is a VOICE" explainer. A VOICE is a parent collective with
// one mission: get the school to adopt VBE (and the PTA to operate openly). This
// page is where a curious visitor — or someone who got a VOICE link forwarded on
// WhatsApp — understands what it is and why it works. Unified on the term VOICE.
// Presentational + SSR-safe (prerendered); app tokens; no framer enter-animation.

// The live VOICE to feature ("See a live VOICE" → its public sign-up page).
// Set per environment via VITE_FEATURED_VOICE_ID (12-factor config — no hardcoded
// id, no stale demo link). When unset, the "See a live VOICE" CTAs hide gracefully.
const FEATURED_VOICE_ID = import.meta.env.VITE_FEATURED_VOICE_ID as string | undefined;
const LIVE_VOICE = FEATURED_VOICE_ID ? `/v/${FEATURED_VOICE_ID}` : null;

const JOURNEY: { icon: typeof Users; step: string; title: string; body: string }[] = [
  {
    icon: Users,
    step: "1",
    title: "Gather",
    body: "A few parents rally others behind one shared mission — privately, respectfully. Each parent who backs it adds weight. Scattered concern becomes one clear voice.",
  },
  {
    icon: Megaphone,
    step: "2",
    title: "Ask",
    body: "The VOICE makes one evidenced, constructive ask of the school and PTA — backed by numbers and a survey, not a list of grievances. Partners, not petitioners.",
  },
  {
    icon: Vote,
    step: "3",
    title: "Adopt & become the PTA",
    body: "When the school adopts VBE, your VOICE converts — its members fold into the PTA and start organising. The thing you asked for is already built.",
  },
];

const WHY: { icon: typeof HeartHandshake; title: string; body: string }[] = [
  { icon: Users, title: "One voice, not many", body: "A single concerned parent is easy to set aside. A coordinated group with one ask is how schools actually change." },
  { icon: HeartHandshake, title: "Partners, not petitioners", body: "You arrive with a proposal and a record, through the right channels — constructive, never a campaign against the school." },
  { icon: CheckCircle2, title: "A real say", body: "Updates on progress, a visible response from the school, and — on adoption — a place in how the PTA runs." },
];

export default function CoalitionsPage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-primary">
            <Megaphone className="h-4 w-4" /> Parents · VOICE
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Be a voice for values at your school.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            A <strong>VOICE</strong> is a group of parents with one mission: to get the school to adopt
            Values-Based Education — and the PTA to run in a way every family can take part in. You back
            it, it builds weight, and the school hears one clear, respectful ask instead of scattered concern.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Start a VOICE
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            {LIVE_VOICE && (
              <Link href={LIVE_VOICE} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                <Eye className="mr-2 h-4 w-4" /> See a live VOICE
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* The journey */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="mb-6 font-mono text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
          How a VOICE works
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {JOURNEY.map((j) => (
            <div key={j.step} className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <j.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm font-bold text-muted-foreground/60">{j.step}</span>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-foreground">{j.title}</h2>
              <p className="mt-2 text-muted-foreground">{j.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What a VOICE is — and isn't */}
      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">What a VOICE is — and isn't</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          A VOICE is not a campaign against the school. It's a coordinated, constructive advocacy group:
          parents at the same school, aligned on a specific ask — that the school adopt values-based
          education — speaking with one evidenced voice through the right channels.
        </p>
        <blockquote className="mt-8 rounded-2xl border-l-4 border-primary bg-card p-8 text-lg text-foreground">
          <span className="font-semibold">"Approach the school as partners, not petitioners."</span>{" "}
          The strongest VOICEs arrive with a proposal and a record, not a list of grievances.
        </blockquote>
      </section>

      {/* Why it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">{w.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to start, or back one?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Start a VOICE at your school, or see a live one and add your name.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }), "font-semibold")}>
              Start a VOICE
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            {LIVE_VOICE && (
              <Link
                href={LIVE_VOICE}
                className={cn(buttonVariants({ variant: "outline" }), "border-primary-foreground/30 bg-transparent font-semibold text-primary-foreground hover:bg-primary-foreground/10")}
              >
                See a live VOICE
              </Link>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

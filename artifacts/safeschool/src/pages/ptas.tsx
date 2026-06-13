import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crown, Users, Settings, FileText, Wallet, ArrowRight } from "lucide-react";

// Phase 2b: the public "Get your PTA VIBING" page — the PTA VIBES model + the
// why-structure argument + what VIBES facilitates + the engagement principles.
// Presentational / SSR-safe (prerenders for SEO). Source: PTA VIBES brief.

const SEATS: { icon: typeof Crown; seat: string; remit: string }[] = [
  { icon: Crown, seat: "President", remit: "The primary channel to the school." },
  { icon: Users, seat: "Vice President", remit: "Growing membership and community engagement." },
  { icon: Settings, seat: "Chair", remit: "Runs the platform — the operational, caretaker-admin seat." },
  { icon: FileText, seat: "Secretary", remit: "Records, agendas, and the paper trail." },
  { icon: Wallet, seat: "Treasurer", remit: "Funds and financial transparency." },
];

const FACILITATES: string[] = [
  "Structured meetings with rolling agendas",
  "Reviewing the data from survey results",
  "Formal questions and responses to the school",
  "Clear, agreed goals",
  "Initiatives that are tracked end to end",
];

const PRINCIPLES: string[] = [
  "We support the school, the PTA, and each other — we don't criticise any of them.",
  "Partners, not petitioners: every message reads as working with the school.",
  "Every proposal reaches a decision; silence is recorded, not accepted.",
];

export default function PtasPage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">For PTAs</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Get your PTA VIBING
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          A PTA with VIBES runs on structure, not personalities — transparent by default,
          equal access to information, and participation from anywhere in the world.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/find-school" className={cn(buttonVariants({ size: "lg" }))}>
            Find your school
          </Link>
        </div>
      </section>

      {/* Why structure matters */}
      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <h2 className="font-display text-2xl font-bold">Why structure matters</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Without structure you get second- and third-class citizens. Parents outside the
            PTA have no information. Parents inside it, but outside the inner circle, know less
            than the executive. VIBES levels that: transparent by default, equal access to
            information, async participation from anywhere — no meeting attendance required.
          </p>
        </div>
      </section>

      {/* The 5-seat model */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">The model</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Five seats — equal responsibility, not rank
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SEATS.map((s) => (
            <div key={s.seat} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <s.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{s.seat}</h3>
              <p className="mt-2 text-muted-foreground">{s.remit}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold">Active Members</h3>
            <p className="mt-2 text-muted-foreground">
              Take part in meetings and run initiatives — with sign-off from any one exec member.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold">Voting Members</h3>
            <p className="mt-2 text-muted-foreground">
              Vote, raise issues, and get equal access to information. A voice without a time commitment.
            </p>
          </div>
        </div>
      </section>

      {/* What VIBES facilitates */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What VIBES facilitates</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          The software that does the operating
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {FACILITATES.map((item) => (
            <li key={item} className="rounded-2xl border border-border bg-card p-5 text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Engagement principles */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight">How we work together</h2>
          <ul className="mt-6 space-y-4">
            {PRINCIPLES.map((p) => (
              <li key={p} className="text-lg text-primary-foreground/90">{p}</li>
            ))}
          </ul>
          <Link
            href="/find-school"
            className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "mt-8 inline-flex items-center gap-1")}
          >
            Find your school <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

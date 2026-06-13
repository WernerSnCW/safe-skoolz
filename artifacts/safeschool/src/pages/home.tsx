import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";
import { useAudience } from "@/providers/audience";
import { AUDIENCE_CONTENT } from "@/components/marketing/audienceContent";
import { AudienceSwitcher } from "@/components/marketing/AudienceSwitcher";
import { CompleteSolution } from "@/components/marketing/CompleteSolution";

// Phase 2b: the teach-then-ask front door. BROAD blocks are audience-agnostic
// and prerender as-is for SEO; RESHAPE blocks (Why it matters / What you get /
// Go deeper / the ask CTA label) read useAudience and swap in place after
// hydration. With no AudienceProvider (the prerender path) useAudience returns
// "all", so the broad state is what crawlers and first paint see.
//
// HEADS UP: the H1 below is Tom-owned draft copy (spec §8) — replace on sign-off.
export default function HomePage() {
  const { audience } = useAudience();
  const content = AUDIENCE_CONTENT[audience];

  return (
    <AppShell>
      {/* 1 · Hero — the VBE value (BROAD) */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Values-Based Education
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          VBE improves how children treat each other — and how the school responds when they don't.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Vibes is the software that makes Values-Based Education work for your whole
          community — children, parents, the PTA, and the school.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/find-school" className={cn(buttonVariants({ size: "lg" }))}>
            Find your school
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Log in
          </Link>
        </div>
        <AudienceSwitcher className="mt-10 justify-center" />
      </section>

      {/* 2 · Why this exists (BROAD) */}
      <section className="mx-auto max-w-3xl px-4 pb-4 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-accent/40 p-8">
          <p className="text-lg text-foreground">
            Vibes helps your school adopt VBE — working <em>with</em> the school, not against it.
            For a school to commit, it needs its parents behind it. That's what this is for.
          </p>
        </div>
      </section>

      {/* 3 · Why it matters (RESHAPE) */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {content.whyItMatters.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {content.whyItMatters.title}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{content.whyItMatters.body}</p>
        <ul className="mt-6 space-y-3">
          {content.whyItMatters.points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="text-foreground">{point}</span>
            </li>
          ))}
        </ul>
        <Link href="/diagnostic" className="mt-6 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          See where your school stands <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {/* 4 · The complete solution (BROAD) */}
      <CompleteSolution />

      {/* 5 · What you get (RESHAPE) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {content.whatYouGet.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {content.whatYouGet.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {content.whatYouGet.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · Go deeper (RESHAPE) */}
      <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <Link
          href={content.goDeeper.href}
          className="inline-flex items-center gap-1 text-lg font-semibold text-primary hover:underline"
        >
          {content.goDeeper.label} <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </section>

      {/* 7 · The ask (BROAD frame, RESHAPE CTA label) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Find your school's community and join in — it takes a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/find-school"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
            >
              {content.askLabel}
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

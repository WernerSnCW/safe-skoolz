import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

// SchoolVBE "About" marketing page (Phase 3 content migration). Presentational
// + SSR-safe so it prerenders: the contact form's initial render is plain
// markup; its onSubmit only runs client-side after hydration. Submissions POST
// to /api/contact (stored in contact_messages). The #contact anchor is linked
// from across the site (e.g. PTA/parent "Free Support" cards).

const PRINCIPLES: { lead: string; body: string }[] = [
  {
    lead: "Equip, don't pressure.",
    body: "Schools get two equal doors — adopt VBE, or run a diagnostic first. We never hard-sell.",
  },
  {
    lead: "Partners, not petitioners.",
    body: "Everything we build assumes parents and PTAs working with schools, never against them.",
  },
  {
    lead: "Free and open.",
    body: "Everything on Vibes is free — the resource library, the diagnostic, the surveys, and the software. Access is never the product.",
  },
  {
    lead: "Evidence-led.",
    body: "VBE rests on more than two decades of research. We treat the people we work with as capable professionals who want frameworks, not slogans.",
  },
];

const ROLES = ["School leader / SLT", "Governor", "PTA officer", "Parent", "Other"];

export default function AboutPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          role: form.get("role") || undefined,
          message: form.get("message"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong — please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">About</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Build deliberately, not by default.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
            Every school community has a culture — whether it chose one or not. Vibes exists to
            help school communities choose theirs, on purpose, with everyone involved.
          </p>
        </div>
      </section>

      {/* Our mission */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Our mission</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          To equip school communities — schools, parents, and PTAs — to build deliberately rather
          by default. We provide the frameworks, the tools, and the support to make values-based
          education real, PTAs credible, and parent participation meaningful.
        </p>
      </section>

      {/* Who we serve */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Who we serve</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          We support schools, parents, and PTAs adopting values-based education — including the
          international-school world, which carries its own distinct pressures: internationally
          mobile families, affluence-related disengagement, overlapping regulatory frameworks,
          third-culture children seeking belonging, and the reputation fragility of small expat
          communities.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          These dynamics are why a deliberate, shared, actionable set of values matters so much
          here. They are the anchor this world needs.
        </p>
      </section>

      {/* How we work */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">How we work</h2>
        <ul className="mt-6 space-y-5">
          {PRINCIPLES.map((p) => (
            <li
              key={p.lead}
              className="rounded-2xl border border-border bg-card p-6 text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{p.lead}</span> {p.body}
            </li>
          ))}
        </ul>
        <blockquote className="mt-8 rounded-2xl border-l-4 border-primary bg-card p-8 text-xl text-foreground sm:text-2xl">
          A value is an actionable belief, not a word.{" "}
          <span className="font-semibold">
            That single distinction shapes everything we make.
          </span>
        </blockquote>
      </section>

      {/* Vibes */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Vibes</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          This site is the front door: the adoption and advocacy resource. Vibes is the destination —
          the school platform where Values-Based Education becomes daily practice: values-led
          learning and PSHE, pupil wellbeing and voice, parent and PTA participation, with
          safeguarding tools built in for when they're needed. The free resources here stand on
          their own; Vibes is where the framework becomes day-to-day operational reality.
        </p>
      </section>

      {/* Get in touch */}
      <section id="contact" className="border-t border-border/60 bg-accent/40 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Get in touch</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything on Vibes is free — the resources, the diagnostic, and the surveys. If
            you'd like help putting any of it to work, or want to talk about VBE adoption, just ask.
            There's no charge and no catch.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-2xl border border-primary bg-card p-8 text-foreground">
              <p className="font-display text-lg font-bold">Thank you — your message is on its way.</p>
              <p className="mt-2 text-muted-foreground">
                We'll be in touch shortly. In the meantime, everything you need is free to explore.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className="text-sm font-semibold text-foreground">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="role" className="text-sm font-semibold text-foreground">
                  Your role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue=""
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-semibold text-foreground">
                  How can we help?
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button type="submit" disabled={sending} className={cn(buttonVariants({ size: "lg" }), "disabled:opacity-60")}>
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}

          <div className="mt-10 flex flex-wrap gap-6 border-t border-border/60 pt-8 text-sm">
            <Link href="/schools/case-study" className="inline-flex items-center font-semibold text-primary">
              See an illustrative example
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            <Link href="/resources" className="inline-flex items-center font-semibold text-primary">
              Explore the resources
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

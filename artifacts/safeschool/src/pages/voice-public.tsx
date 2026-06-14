import { useState } from "react";
import { Link } from "wouter";
import { useGetVoicePublic, useSupportVoice } from "@workspace/api-client-react";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Megaphone, Users, Check, ArrowRight, Share2 } from "lucide-react";

// Public, no-login VOICE landing page (route /v/:id). This is what a parent
// receives when a VOICE link is forwarded into a WhatsApp group: it explains the
// VOICE and lets them "Add my voice" with just name + email — no login wall.
// Client-rendered (dynamic :id), so NOT prerendered. Plain elements.

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function VoicePublicPage({ id }: { id: string }) {
  const q = useGetVoicePublic(id);
  const support = useSupportVoice();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const v = q.data as any;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareMsg = v
    ? `I've added my voice to "${v.name}" — parents asking our school to adopt Values-Based Education. Will you back it too?`
    : "";
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareMsg} ${shareUrl}`)}`;

  const submit = async () => {
    setErr(null);
    try {
      await support.mutateAsync({ id, data: { name: name.trim(), email: email.trim() } });
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong — please try again.");
    }
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {q.isLoading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : !v || q.isError ? (
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">This VOICE isn't available</h1>
            <p className="mt-2 text-muted-foreground">The link may be wrong or the VOICE has closed.</p>
            <Link href="/parents" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>About VOICE for parents</Link>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-primary">
              <Megaphone className="h-4 w-4" /> A parent VOICE
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">{v.name}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{v.mission}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {v.backerCount} {v.backerCount === 1 ? "parent backing" : "parents backing"}</span>
              <span>·</span>
              <span>Started by {v.startedBy ?? "the community"}</span>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-foreground">What you're adding your name to</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> One respectful, shared ask to the school — not a petition or a complaint.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> You'll get updates on progress and a real say.</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> If the school adopts VBE, this becomes part of how the PTA runs.</li>
              </ul>

              {v.status !== "advocating" ? (
                <p className="mt-5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  This VOICE has converted — it's now part of the PTA. 🎉
                </p>
              ) : done ? (
                <div className="mt-5">
                  <p className="flex items-center gap-2 font-semibold text-foreground"><Check className="h-5 w-5 text-primary" /> You're in — thank you for adding your voice.</p>
                  <p className="mt-1 text-sm text-muted-foreground">The more parents who back it, the stronger the ask. Forward it to two other parents:</p>
                  <a href={whatsappHref} target="_blank" rel="noopener" className={cn(buttonVariants(), "mt-4")}>
                    <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
                  </a>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
                  <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className={inputCls} type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button
                    type="button"
                    disabled={!name.trim() || !email.trim() || support.isPending}
                    onClick={submit}
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                  >
                    Add my voice
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                  <p className="text-center text-xs text-muted-foreground">Name + email only. No account needed.</p>
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here? <Link href="/coalitions" className="font-semibold text-primary hover:underline">What is a VOICE?</Link>
            </p>
          </>
        )}
      </section>
    </AppShell>
  );
}

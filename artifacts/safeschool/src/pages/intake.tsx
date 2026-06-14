import { useState } from "react";
import { useLocation } from "wouter";
import { useGetIntakeAggregate, useSubmitIntake } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { AppShell } from "@/components/layout/AppShell";

// Phase 4b (spec §4.4): the short multiple-choice sign-up intake. Select-all
// across the three fixed domains. The aggregate it feeds is the community's
// first data. We read the instrument shape from the aggregate's `domains`
// (server-authoritative); the aggregate ALWAYS returns the domain/option shape
// — even when suppressed (n<5) — so the form renders for the first families too.
// Only the per-option `counts` are gated by suppression.
export default function IntakePage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const slug = tenant?.slug ?? (user as any)?.tenant?.slug ?? "";

  // The aggregate doubles as the instrument source (domains + options are always
  // returned, even when suppressed=true).
  const agg = useGetIntakeAggregate(slug, { query: { enabled: !!slug } as any });
  const submit = useSubmitIntake();
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const domains = ((agg.data as any)?.domains ?? []) as Array<{ key: string; section: string; options: string[] }>;
  const email = (user as any)?.email ?? "";

  const toggle = (key: string, idx: number) =>
    setSelections((p) => {
      const cur = p[key] ?? [];
      return { ...p, [key]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });

  const onSubmit = async () => {
    setErr(null);
    try {
      await submit.mutateAsync({ slug, data: { email, selections } });
      setDone(true);
      setLocation("/");
    } catch (e: any) {
      setErr(e?.data?.error ?? (e?.response?.status === 409 ? "You've already completed the intake." : "Something went wrong — please try again."));
    }
  };

  if (!slug) {
    return <AppShell><div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-foreground">A quick pulse — 1 minute</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick anything that matches your experience. Your answers are anonymous and can't be traced
          back to you, even by us. They add to the community's first picture.
        </p>
        <div className="mt-8 space-y-8">
          {domains.map((d) => (
            <div key={d.key}>
              <h2 className="font-display text-lg font-bold text-foreground">{d.section}</h2>
              <div className="mt-3 space-y-2">
                {d.options.map((opt, i) => {
                  const checked = (selections[d.key] ?? []).includes(i);
                  return (
                    <button
                      key={`${d.key}-${i}`}
                      type="button"
                      onClick={() => toggle(d.key, i)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${checked ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                        {checked ? "✓" : ""}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        <button
          type="button"
          disabled={!email || submit.isPending || done}
          onClick={onSubmit}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending ? "Submitting…" : "Add my pulse"}
        </button>
      </div>
    </AppShell>
  );
}

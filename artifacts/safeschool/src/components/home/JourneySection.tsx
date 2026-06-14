import { useState } from "react";
import { useTenant } from "@/providers/tenant";
import { useListVoice, useGetVoicePathway, useFireCollectiveSignal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Flag } from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  your_voice: "Your voice",
  shared_voice: "A shared voice",
  collective_signal: "Ready to speak together",
  pta_motion: "Working with the PTA",
  school_recognition: "Working with the school",
};

export function JourneySection() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const voices = useListVoice({ query: { enabled: !!cap.voice } as any });
  const list = (voices.data as any)?.voices ?? [];
  const lead = list.find((v: any) => v.status === "advocating") ?? list[0];
  // useGetVoicePathway(id, options) — two-arg form confirmed from generated signature
  const pathway = useGetVoicePathway(lead?.id ?? "", { query: { enabled: !!lead?.id } as any });
  const fire = useFireCollectiveSignal();
  const [artefact, setArtefact] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!cap.voice || !lead) return null;
  const p = pathway.data as any;
  if (!p) return null;

  const onFire = async () => {
    setErr(null);
    try {
      // mutateAsync takes { id: string } — confirmed from generated hook
      const res = (await fire.mutateAsync({ id: lead.id })) as any;
      setArtefact(res.artefact);
      pathway.refetch?.();
    } catch (e: any) {
      setErr(e?.data?.error ?? "Not ready to send yet.");
    }
  };

  const pct = Math.min(100, Math.round((p.backerCount / Math.max(1, p.signalThreshold)) * 100));

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Flag size={20} className="text-primary" aria-hidden /> The journey
      </h2>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">{STAGE_LABELS[p.stage] ?? p.stage}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.backerCount} {p.backerCount === 1 ? "family has" : "families have"} joined and authorised the two asks.
            </p>
          </div>
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.thresholdMet
                ? "These families are ready to speak to the school together, with one message."
                : `${p.backerCount} of ${p.signalThreshold} families needed before speaking to the school together.`}
            </p>
          </div>
          {p.legitimacy?.met != null && (
            <p className="text-sm text-muted-foreground">
              {p.legitimacy.met
                ? `${p.backerCount} families now share this hope for the school — enough to speak as a genuinely representative voice.`
                : "Every family who joins makes this a more representative voice for the school."}
            </p>
          )}
          {p.thresholdMet && !p.complete && (
            <div>
              <button type="button" onClick={onFire} disabled={fire.isPending} className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {fire.isPending ? "Preparing…" : "Speak to the school together"}
              </button>
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            </div>
          )}
          {artefact && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground">Ready to share with your school</p>
              <p className="mt-1 text-sm text-muted-foreground">{artefact.message}</p>
            </div>
          )}
          {Array.isArray(p.signals) && p.signals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">School responses</p>
              {p.signals.map((s: any) => (
                <div key={s.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-muted-foreground">
                    {s.schoolResponseStatus === "responded"
                      ? (s.schoolResponseText || "The school responded.")
                      : s.schoolResponseStatus === "none"
                        ? "No response recorded yet."
                        : "Awaiting the school's response."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

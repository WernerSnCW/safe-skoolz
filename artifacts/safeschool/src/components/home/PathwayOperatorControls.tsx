import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useListVoice, useRecordPtaMotion, useRecordSchoolRecognition, useSetIncumbentPtaSize } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";

const EXEC_ROLES = new Set(["pta", "coordinator", "head_teacher"]);

export function PathwayOperatorControls() {
  const { user } = useAuth();
  // Only exec roles render this panel — gate the list query so parents on /journey
  // don't fire an unused request (mirrors the JourneySection enabled-guard pattern).
  const isExec = !!user && EXEC_ROLES.has(user.role);
  const voices = useListVoice({ query: { enabled: isExec } as any });
  const list = (voices.data as any)?.voices ?? [];
  const lead = list.find((v: any) => v.status === "advocating") ?? list[0];
  // Mutation variable shapes confirmed from generated hooks:
  // useRecordPtaMotion: mutate({ id, data }) — { id: string; data: RecordPtaMotionBody }
  // useRecordSchoolRecognition: mutate({ id }) — { id: string }
  // useSetIncumbentPtaSize: mutate({ id, data }) — { id: string; data: SetIncumbentPtaSizeBody }
  const motion = useRecordPtaMotion();
  const recognition = useRecordSchoolRecognition();
  const incumbent = useSetIncumbentPtaSize();
  const [size, setSize] = useState("");

  // user.role is a plain string on the User type — confirmed from use-auth
  if (!user || !EXEC_ROLES.has(user.role) || !lead) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Record an outcome</h2>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">For school leadership / the PTA to record what happened in the real world.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => motion.mutate({ id: lead.id, data: { outcome: "vad_adopted" } })} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">PTA adopted the structure</button>
            <button type="button" onClick={() => motion.mutate({ id: lead.id, data: { outcome: "vad_declined" } })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground">PTA declined</button>
            <button type="button" onClick={() => recognition.mutate({ id: lead.id })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground">School recognised the coalition</button>
          </div>
          <div className="flex items-center gap-2">
            <input className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm" type="number" min={0} placeholder="Current PTA size" aria-label="Current PTA size" value={size} onChange={(e) => setSize(e.target.value)} />
            <button type="button" disabled={!size} onClick={() => incumbent.mutate({ id: lead.id, data: { incumbentPtaSize: Number(size), confirm: true } })} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60">Confirm size</button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

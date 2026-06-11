import { useState } from "react";
import {
  useListPtaInitiatives,
  useCreatePtaInitiative,
  useUpdatePtaInitiative,
  useListPtaMembers,
  useListVoice,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Rocket, Plus, Megaphone, Flag, CheckCircle2, CircleDot, Clock } from "lucide-react";

// PTA Initiatives — the "organise" primitive. Where the Decision Log records
// decisions, Voting records ballots, and Announcements are comms, an initiative
// is a concrete thing the PTA RUNS. It often grows out of a converted VOICE's
// mission (advocate → convert → organise). Plain elements, no framer enter-anim.

const STATUSES = [
  { value: "proposed", label: "Proposed", icon: CircleDot },
  { value: "active", label: "Active", icon: Flag },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: Clock },
];

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const selectCls =
  "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PtaInitiatives() {
  const initiativesQ = useListPtaInitiatives();
  const membersQ = useListPtaMembers();
  const voicesQ = useListVoice();
  const create = useCreatePtaInitiative();
  const update = useUpdatePtaInitiative();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [originVoiceId, setOriginVoiceId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initiatives = (initiativesQ.data as any)?.initiatives ?? [];
  const members = (membersQ.data as any)?.members ?? [];
  const convertedVoices = ((voicesQ.data as any)?.voices ?? []).filter((v: any) => v.status === "converted");

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); initiativesQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5" /> PTA · Organise
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Initiatives</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          The concrete things the PTA runs — projects and campaigns that turn decisions into action.
          Many grow out of a VOICE that converted once the school adopted VBE.
        </p>
      </header>

      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {/* Start an initiative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Start an initiative</span>
            {!showForm && (
              <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setErr(null); }}>New initiative</Button>
            )}
          </CardTitle>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Title</span>
                <input className={inputCls + " mt-1"} placeholder="e.g. Digital Wellbeing Week" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">What &amp; why</span>
                <textarea className={inputCls + " mt-1 min-h-[72px]"} placeholder="What is the PTA organising, and what's the goal?" value={summary} onChange={(e) => setSummary(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Lead (optional)</span>
                  <select className={selectCls} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {members.map((m: any) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">From a VOICE (optional)</span>
                  <select className={selectCls} value={originVoiceId} onChange={(e) => setOriginVoiceId(e.target.value)}>
                    <option value="">None</option>
                    {convertedVoices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!title.trim() || !summary.trim() || create.isPending}
                  onClick={() => run(async () => {
                    await create.mutateAsync({ data: { title: title.trim(), summary: summary.trim(), ownerId: ownerId || null, originVoiceId: originVoiceId || null } });
                    setTitle(""); setSummary(""); setOwnerId(""); setOriginVoiceId(""); setShowForm(false);
                  })}
                >
                  Start initiative
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setSummary(""); setOwnerId(""); setOriginVoiceId(""); setErr(null); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* List */}
      {initiativesQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : initiatives.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No initiatives yet. Start one above to begin organising.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {initiatives.map((i: any) => (
            <Card key={i.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground">{i.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {i.owner && <span>Led by {i.owner}</span>}
                      {i.owner && i.originVoiceName && <span>·</span>}
                      {i.originVoiceName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                          <Megaphone className="w-3 h-3" /> from “{i.originVoiceName}”
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      className={selectCls}
                      value={i.status}
                      onChange={(e) => run(() => update.mutateAsync({ id: i.id, data: { status: e.target.value } }))}
                    >
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

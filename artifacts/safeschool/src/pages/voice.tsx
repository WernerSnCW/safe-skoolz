import { useState } from "react";
import {
  useListVoice,
  useCreateVoice,
  useJoinVoice,
  useLeaveVoice,
  useConvertVoice,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Megaphone, Users, Plus, Check, Crown, CheckCircle2, ArrowRightLeft } from "lucide-react";

// Roles that can fold a VOICE into the PTA once the school adopts VBE.
const CONVERT_ROLES = ["pta", "coordinator", "head_teacher"];
// Roles that can create / join / leave a VOICE (advocacy). Mirrors the API.
const ADVOCATE_ROLES = ["parent", "pta"];

// VOICE — parent advocacy collectives. A VOICE is a parent collective with a
// mission to get the school to adopt VBE; backing it (joining) builds one
// unified ask. When the school adopts, the VOICE converts into PTA membership.
// Plain elements / no framer enter-animation (prod-blank bug).

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function VoicePage() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "";
  const canConvert = CONVERT_ROLES.includes(role);
  const canAdvocate = ADVOCATE_ROLES.includes(role);

  const voicesQ = useListVoice();
  const createVoice = useCreateVoice();
  const joinVoice = useJoinVoice();
  const leaveVoice = useLeaveVoice();
  const convertVoice = useConvertVoice();

  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const voices = (voicesQ.data as any)?.voices ?? [];
  const advocating = voices.filter((v: any) => v.status === "advocating");
  const converted = voices.filter((v: any) => v.status === "converted");

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); voicesQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5" /> Parents · VOICE
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Be a voice for values</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          A VOICE is a parent collective with one mission: get the school to adopt VBE. Back one to
          turn scattered concerns into a single, visible ask — and when the school adopts, your VOICE
          becomes part of the PTA.
        </p>
      </header>

      {err && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {/* Start a VOICE — only advocacy roles (parents/PTA) can create. */}
      {canAdvocate && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Start a VOICE</span>
            {!showForm && (
              <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setErr(null); }}>New VOICE</Button>
            )}
          </CardTitle>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Name</span>
                <input className={inputCls + " mt-1"} placeholder="e.g. Parents for Values-Based Education" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Mission</span>
                <textarea className={inputCls + " mt-1 min-h-[80px]"} placeholder="What is this collective asking the school to do?" value={mission} onChange={(e) => setMission(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!name.trim() || !mission.trim() || createVoice.isPending}
                  onClick={() => run(async () => {
                    await createVoice.mutateAsync({ data: { name: name.trim(), mission: mission.trim() } });
                    setName(""); setMission(""); setShowForm(false);
                  })}
                >
                  Start VOICE
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setName(""); setMission(""); setErr(null); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* Active collectives */}
      <section className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground">Active collectives</h2>
        {voicesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : advocating.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
            No VOICEs yet. Start the first one above and rally other parents behind it.
          </CardContent></Card>
        ) : (
          advocating.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground">{v.name}</h3>
                      {v.myRole === "founder" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                          <Crown className="w-3 h-3" /> Founder
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{v.mission}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {v.memberCount} backing</span>
                      <span>·</span>
                      <span>Started by {v.createdBy}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {v.myRole === "founder" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Check className="w-4 h-4 text-primary" /> Yours</span>
                    ) : v.myRole ? (
                      <Button size="sm" variant="outline" disabled={leaveVoice.isPending} onClick={() => run(() => leaveVoice.mutateAsync({ id: v.id }))}>
                        Backing — Leave
                      </Button>
                    ) : canAdvocate ? (
                      <Button size="sm" disabled={joinVoice.isPending} onClick={() => run(() => joinVoice.mutateAsync({ id: v.id }))}>
                        Join this VOICE
                      </Button>
                    ) : null}
                    {canConvert && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={convertVoice.isPending}
                        title="The school has adopted VBE — fold this VOICE's backers into the PTA."
                        onClick={() => {
                          if (window.confirm(`Convert "${v.name}" into the PTA? Its ${v.memberCount} backer(s) become PTA members (founder → senior group, the rest → general membership).`)) {
                            run(() => convertVoice.mutateAsync({ id: v.id }));
                          }
                        }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Convert to PTA
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Converted collectives */}
      {converted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground">Now part of the PTA</h2>
          {converted.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-bold text-foreground">{v.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.mission}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      The school adopted VBE — this collective’s {v.memberCount} members are now part of the PTA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

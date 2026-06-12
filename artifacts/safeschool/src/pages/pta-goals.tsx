import { useState } from "react";
import { Link } from "wouter";
import {
  useListPtaGoals,
  useProposePtaGoal,
  useOpenPtaGoalBallot,
  useUpdatePtaGoal,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Target, Plus, CheckCircle2, CircleDot, ListChecks, Vote, XCircle } from "lucide-react";

// PTA annual goals (B3). Members propose; admin shortlists; the senior group
// ratifies via a ballot; then the goal is completed or failed. Plain elements,
// no framer enter-anim (prod-blank gotcha).

const STAGE = {
  proposed: { label: "Proposed", icon: CircleDot },
  shortlisted: { label: "Shortlisted", icon: ListChecks },
  ratified: { label: "Ratified", icon: CheckCircle2 },
  completed: { label: "Completed", icon: CheckCircle2 },
  failed: { label: "Failed", icon: XCircle },
} as const;

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PtaGoals() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "";
  const canManage = role === "pta";

  const goalsQ = useListPtaGoals();
  const propose = useProposePtaGoal();
  const openBallot = useOpenPtaGoalBallot();
  const update = useUpdatePtaGoal();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const goals = (goalsQ.data as any)?.goals ?? [];

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null); setOkMsg(null);
    try { await fn(); goalsQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  const failGoal = (id: string) => {
    const note = window.prompt("Why did this goal fail? (a short postmortem note)");
    if (note && note.trim()) run(() => update.mutateAsync({ id, data: { status: "failed", postmortemNote: note.trim() } }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> PTA · Goals
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Annual goals</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Any member can propose a goal. The committee shortlists candidates, the senior group ratifies
          by vote, and ratified goals guide the year's work — visible to every member.
        </p>
      </header>

      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
      {okMsg && <div className="rounded-md border border-primary/30 bg-primary/10 text-primary text-sm px-3 py-2">{okMsg}</div>}

      {/* Propose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Propose a goal</span>
            {!showForm && <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setErr(null); }}>New goal</Button>}
          </CardTitle>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Title</span>
                <input className={inputCls + " mt-1"} placeholder="e.g. Calmer, kinder mornings" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Description (optional)</span>
                <textarea className={inputCls + " mt-1 min-h-[72px]"} placeholder="What is the goal, and why does it matter?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="block max-w-[140px]">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Year</span>
                <input className={inputCls + " mt-1"} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!title.trim() || propose.isPending}
                  onClick={() => run(async () => {
                    await propose.mutateAsync({ data: { title: title.trim(), description: description.trim() || null, year: Number(year) || new Date().getFullYear() } });
                    setTitle(""); setDescription(""); setShowForm(false);
                  })}
                >
                  Propose goal
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setTitle(""); setDescription(""); setErr(null); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* List */}
      {goalsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No goals yet. Propose the first one above.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g: any) => {
            const stage = (STAGE as any)[g.status] ?? STAGE.proposed;
            const StageIcon = stage.icon;
            return (
              <Card key={g.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{g.title}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">{g.year}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                          <StageIcon className="w-3 h-3" /> {stage.label}
                        </span>
                      </div>
                      {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                      <div className="mt-2 text-xs text-muted-foreground">Proposed by {g.proposedBy}</div>
                      {g.ballot && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Senior-group ballot · {g.ballot.status} · For {g.ballot.tally?.For ?? 0} / Against {g.ballot.tally?.Against ?? 0}
                          {g.ballot.status === "open" && <> · <Link href="/pta/voting" className="text-primary hover:underline">Cast your vote</Link></>}
                        </div>
                      )}
                      {g.status === "failed" && g.postmortemNote && (
                        <p className="mt-2 text-xs text-muted-foreground italic">Postmortem: {g.postmortemNote}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {g.status === "proposed" && (
                          <Button size="sm" variant="outline" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "shortlisted" } }))}>
                            <ListChecks className="w-3.5 h-3.5 mr-1" /> Shortlist
                          </Button>
                        )}
                        {g.status === "shortlisted" && !g.ballot && (
                          <Button size="sm" disabled={openBallot.isPending}
                            onClick={() => run(async () => { await openBallot.mutateAsync({ id: g.id, data: {} }); setOkMsg("Senior-group ballot opened — eligible members can vote on the Voting page."); })}>
                            <Vote className="w-3.5 h-3.5 mr-1" /> Open senior-group ballot
                          </Button>
                        )}
                        {g.status === "shortlisted" && g.ballot && g.ballot.status === "open" && (
                          <span className="text-xs text-muted-foreground">Ballot open — awaiting votes</span>
                        )}
                        {g.status === "shortlisted" && g.ballot && g.ballot.status === "closed" && g.ballot.carried && (
                          <Button size="sm" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "ratified" } }))}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ratify
                          </Button>
                        )}
                        {g.status === "shortlisted" && g.ballot && g.ballot.status === "closed" && !g.ballot.carried && (
                          <span className="text-xs text-muted-foreground">Ballot closed — did not carry</span>
                        )}
                        {g.status === "ratified" && (
                          <Button size="sm" variant="outline" disabled={update.isPending}
                            onClick={() => run(() => update.mutateAsync({ id: g.id, data: { status: "completed" } }))}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark completed
                          </Button>
                        )}
                        {(g.status === "proposed" || g.status === "shortlisted") && (
                          <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => failGoal(g.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Fail
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

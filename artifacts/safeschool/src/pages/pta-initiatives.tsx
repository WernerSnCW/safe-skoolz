import { useState } from "react";
import {
  useListPtaInitiatives,
  useCreatePtaInitiative,
  useUpdatePtaInitiative,
  useListPtaMembers,
  useListVoice,
  useListPtaGoals,
  useApprovePtaInitiative,
  useAdvancePtaInitiativeStage,
  useFollowUpPtaInitiative,
  useGetPtaInitiative,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import {
  Rocket,
  Plus,
  Megaphone,
  Flag,
  CheckCircle2,
  CircleDot,
  Clock,
  ChevronRight,
  AlertTriangle,
  History,
} from "lucide-react";

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

// Step 4: StageHistory sub-component — defined at module scope so the hook call
// is not conditional within the parent loop.
function StageHistory({ id }: { id: string }) {
  const q = useGetPtaInitiative(id);
  const hist = (q.data as any)?.stageHistory ?? [];
  if (q.isLoading) return <p className="text-xs text-muted-foreground mt-2">Loading history…</p>;
  if (!hist.length) return <p className="text-xs text-muted-foreground mt-2">No history yet.</p>;
  return (
    <ul className="mt-2 space-y-1 border-l border-border pl-3">
      {hist.map((h: any) => (
        <li key={h.id} className="text-xs text-muted-foreground">
          <span className="font-mono">{new Date(h.occurredAt).toLocaleDateString()}</span>{" "}
          {h.entryType === "follow_up" ? <b>Follow-up:</b> : <b>{h.fromStage} → {h.toStage}</b>}{" "}
          {h.outcomeNote}{h.reason ? ` — reason: ${h.reason}` : ""}{h.recordedBy ? ` (${h.recordedBy})` : ""}
        </li>
      ))}
    </ul>
  );
}

export default function PtaInitiatives() {
  const initiativesQ = useListPtaInitiatives();
  const membersQ = useListPtaMembers();
  const voicesQ = useListVoice();
  const goalsQ = useListPtaGoals();
  const create = useCreatePtaInitiative();
  const update = useUpdatePtaInitiative();
  const approve = useApprovePtaInitiative();
  const advance = useAdvancePtaInitiativeStage();
  const followUp = useFollowUpPtaInitiative();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [originVoiceId, setOriginVoiceId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [resourcesNeeded, setResourcesNeeded] = useState("");
  const [conflicts, setConflicts] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const initiatives = (initiativesQ.data as any)?.initiatives ?? [];
  const members = (membersQ.data as any)?.members ?? [];
  const convertedVoices = ((voicesQ.data as any)?.voices ?? []).filter((v: any) => v.status === "converted");
  const ratifiedGoals = ((goalsQ.data as any)?.goals ?? []).filter((g: any) => g.status === "ratified");

  const CHECK_ITEMS: { key: string; label: string }[] = [
    { key: "alignsGoal", label: "Aligns with a ratified annual goal" },
    { key: "budgetOk", label: "No budget (or within the small-spend threshold)" },
    { key: "namedOwner", label: "Has a named, accountable owner" },
    { key: "noConflict", label: "Does not conflict with existing work" },
    { key: "successCriteria", label: "Has defined success criteria" },
    { key: "noSchoolResource", label: "Needs no formal school resource or approval" },
  ];

  const STAGES = ["idea", "presented", "accepted", "planning", "delivering", "delivered"];
  const NEXT: Record<string, string[]> = {
    none: ["idea"],
    idea: ["presented"],
    presented: ["accepted", "rejected"],
    accepted: ["planning"],
    planning: ["delivering"],
    delivering: ["delivered"],
    rejected: [],
    delivered: [],
  };

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); initiativesQ.refetch(); }
    catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  const resetForm = () => {
    setTitle(""); setSummary(""); setOwnerId(""); setOriginVoiceId("");
    setGoalId(""); setSuccessCriteria(""); setResourcesNeeded(""); setConflicts("");
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

              {/* New one-page-note fields */}
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Align to goal (optional)</span>
                <select className={selectCls + " mt-1 w-full"} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">No goal yet</option>
                  {ratifiedGoals.map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Success criteria</span>
                <textarea className={inputCls + " mt-1 min-h-[56px]"} placeholder="How will you know it worked?" value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Resources needed</span>
                <input className={inputCls + " mt-1"} placeholder="Budget, venue, volunteers…" value={resourcesNeeded} onChange={(e) => setResourcesNeeded(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Possible conflicts</span>
                <input className={inputCls + " mt-1"} placeholder="Any overlap with other initiatives?" value={conflicts} onChange={(e) => setConflicts(e.target.value)} />
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
                    await create.mutateAsync({
                      data: {
                        title: title.trim(),
                        summary: summary.trim(),
                        ownerId: ownerId || null,
                        originVoiceId: originVoiceId || null,
                        goalId: goalId || null,
                        successCriteria: successCriteria || null,
                        resourcesNeeded: resourcesNeeded || null,
                        conflicts: conflicts || null,
                      },
                    });
                    resetForm();
                    setShowForm(false);
                  })}
                >
                  Start initiative
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); setErr(null); }}>Cancel</Button>
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
          {initiatives.map((i: any) => {
            const currentStage: string = i.schoolStage ?? "none";
            const nextStages: string[] = NEXT[currentStage] ?? [];
            const allChecked = CHECK_ITEMS.every((c) => i.checklist?.[c.key]);

            return (
              <Card key={i.id}>
                <CardContent className="py-5 space-y-4">
                  {/* Title row + status select */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-foreground">{i.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>

                      {/* Origin voice + owner */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {i.owner && <span>Led by {i.owner}</span>}
                        {i.owner && i.originVoiceName && <span>·</span>}
                        {i.originVoiceName && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                            <Megaphone className="w-3 h-3" /> from "{i.originVoiceName}"
                          </span>
                        )}
                      </div>

                      {/* Goal alignment badge */}
                      {i.goalTitle && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                            <Flag className="w-3 h-3" />
                            {i.goalTitle}{i.goalStatus !== "ratified" ? " (not ratified)" : ""}
                          </span>
                        </div>
                      )}

                      {/* One-page note lines */}
                      {(i.successCriteria || i.resourcesNeeded || i.conflicts) && (
                        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                          {i.successCriteria && <p>Success: {i.successCriteria}</p>}
                          {i.resourcesNeeded && <p>Needs: {i.resourcesNeeded}</p>}
                          {i.conflicts && <p>Conflicts: {i.conflicts}</p>}
                        </div>
                      )}
                    </div>

                    {/* Status select */}
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

                  {/* Approval block */}
                  <div>
                    {i.approvalType ? (
                      <p className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {i.approvalType === "self" ? "Self-approved" : "Board-approved"}
                        {i.approvedBy ? ` by ${i.approvedBy}` : ""}
                        {i.approvedAt ? ` on ${new Date(i.approvedAt).toLocaleDateString()}` : ""}
                      </p>
                    ) : (
                      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">Approval checklist</p>
                        {CHECK_ITEMS.map((c) => (
                          <label key={c.key} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!i.checklist?.[c.key]}
                              onChange={(e) =>
                                run(() => update.mutateAsync({ id: i.id, data: { checklist: { [c.key]: e.target.checked } } }))
                              }
                              className="accent-primary"
                            />
                            {c.label}
                          </label>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={!allChecked}
                            onClick={() => run(() => approve.mutateAsync({ id: i.id, data: { approvalType: "self" } }))}
                          >
                            Self-approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => run(() => approve.mutateAsync({ id: i.id, data: { approvalType: "board" } }))}
                          >
                            Board-approve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Five-stage block */}
                  <div className="space-y-2">
                    {/* Stage chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.map((s) => (
                        <span
                          key={s}
                          className={
                            s === currentStage
                              ? "rounded-full px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground"
                              : "rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                          }
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Awaiting response banner */}
                    {i.awaitingResponse && (
                      <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Awaiting school response — overdue. Silence is not acceptance.
                          {i.followUpCount > 0 && <span className="ml-1">{i.followUpCount} follow-up(s) logged.</span>}
                        </span>
                      </div>
                    )}

                    {/* Stage-advance buttons */}
                    {nextStages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {nextStages.map((to) => (
                          <Button
                            key={to}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              const body: { toStage: string; reason?: string; responseDueAt?: string } = { toStage: to };
                              if (to === "rejected") {
                                const reason = window.prompt("Reason for rejection?");
                                if (!reason) return;
                                body.reason = reason;
                              }
                              if (to === "presented") {
                                const dueDateStr = window.prompt("Optional: response due date (YYYY-MM-DD)?");
                                if (dueDateStr) {
                                  const d = new Date(dueDateStr);
                                  if (!isNaN(d.getTime())) body.responseDueAt = d.toISOString();
                                }
                              }
                              run(() => advance.mutateAsync({ id: i.id, data: body }));
                            }}
                          >
                            <ChevronRight className="w-3 h-3" /> {to}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Log follow-up (only when presented) */}
                    {currentStage === "presented" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          const note = window.prompt("Follow-up note:");
                          if (!note) return;
                          run(() => followUp.mutateAsync({ id: i.id, data: { note } }));
                        }}
                      >
                        Log follow-up
                      </Button>
                    )}

                    {/* Mark completed prompt when delivered */}
                    {currentStage === "delivered" && i.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => run(() => update.mutateAsync({ id: i.id, data: { status: "completed" } }))}
                      >
                        Mark initiative completed
                      </Button>
                    )}
                  </div>

                  {/* Stage history toggle */}
                  <div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      onClick={() => setOpenId(openId === i.id ? null : i.id)}
                    >
                      <History className="w-3 h-3" />
                      {openId === i.id ? "Hide history" : "Show history"}
                    </button>
                    {openId === i.id && <StageHistory id={i.id} />}
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

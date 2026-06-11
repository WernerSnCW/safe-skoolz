import { useState } from "react";
import {
  useListPtaBallots,
  useOpenPtaBallot,
  useClosePtaBallot,
  useCastPtaVote,
  useListPtaProxies,
  useListPtaMembers,
  useSetPtaProxy,
  useRevokePtaProxy,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui-polished";
import { Vote, Plus, CheckCircle2, Users2, ShieldQuestion } from "lucide-react";

const selectCls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : null);

export default function PtaVoting() {
  const ballotsQ = useListPtaBallots();
  const membersQ = useListPtaMembers();
  const proxiesQ = useListPtaProxies();
  const openBallot = useOpenPtaBallot();
  const closeBallot = useClosePtaBallot();
  const castVote = useCastPtaVote();
  const setProxy = useSetPtaProxy();
  const revokeProxy = useRevokePtaProxy();

  const [q, setQ] = useState("");
  const [quorum, setQuorum] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const data = (ballotsQ.data as any) || {};
  const ballots = data.ballots ?? [];
  const rosterActive = data.rosterActive ?? 0;
  const isMember = data.isMember ?? false;
  const members = (membersQ.data as any)?.members ?? [];
  const pdata = (proxiesQ.data as any) || {};
  const proxies = pdata.proxies ?? [];
  const myMemberId = pdata.myMemberId ?? null;
  const myProxy = proxies.find((p: any) => p.grantorMemberId === myMemberId);
  const held = proxies.filter((p: any) => p.holderMemberId === myMemberId); // members I can vote for
  const otherMembers = members.filter((m: any) => m.id !== myMemberId);

  const refresh = () => { ballotsQ.refetch(); proxiesQ.refetch(); };
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); refresh(); } catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Vote className="w-3.5 h-3.5" /> PTA · Voting
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Ballots</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          One vote per member. Quorum is measured against the active roster ({rosterActive} active). Can&rsquo;t attend?
          Assign a proxy and another member can vote on your behalf.
        </p>
      </header>

      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}

      {/* My proxy */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldQuestion className="w-4 h-4 text-primary" /> My proxy</CardTitle></CardHeader>
        <CardContent>
          {!isMember ? (
            <p className="text-sm text-muted-foreground">You&rsquo;re not on the member roster, so you can&rsquo;t vote or assign a proxy yet.</p>
          ) : myProxy ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-foreground">Your vote is delegated to <span className="font-medium">{myProxy.holder}</span> when you can&rsquo;t attend.</p>
              <Button size="sm" variant="ghost" onClick={() => run(() => revokeProxy.mutateAsync())}>Revoke</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Delegate my vote to</span>
                <select className={selectCls} id="proxySel" defaultValue="">
                  <option value="">Choose a member…</option>
                  {otherMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <Button size="sm" onClick={() => {
                const v = (document.getElementById("proxySel") as HTMLSelectElement)?.value;
                if (v) run(() => setProxy.mutateAsync({ data: { holderMemberId: v } }));
              }}>Assign proxy</Button>
            </div>
          )}
          {held.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5" /> You hold a proxy for: {held.map((p: any) => p.grantor).join(", ")} — you can cast their vote on open ballots below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Open ballot */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Open a ballot</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input placeholder="The question to vote on" value={q} onChange={(e: any) => setQ(e.target.value)} />
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Quorum (optional)</span>
                <input type="number" min="0" className={selectCls + " w-28"} placeholder="e.g. 5" value={quorum} onChange={(e) => setQuorum(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Closes (optional)</span>
                <input type="datetime-local" className={selectCls} value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              </label>
              <Button disabled={!q.trim() || openBallot.isPending} onClick={() => run(async () => {
                await openBallot.mutateAsync({ data: { question: q.trim(), ...(quorum ? { quorum: parseInt(quorum, 10) } : {}), ...(closesAt ? { closesAt: new Date(closesAt).toISOString() } : {}) } });
                setQ(""); setQuorum(""); setClosesAt("");
              })}>Open ballot</Button>
            </div>
            <p className="text-xs text-muted-foreground">Options default to For / Against / Abstain.</p>
          </div>
        </CardContent>
      </Card>

      {/* Ballots */}
      <div className="space-y-3">
        {ballots.length === 0 && <p className="text-sm text-muted-foreground">No ballots yet.</p>}
        {ballots.map((b: any) => {
          const open = b.status === "open";
          const canVoteSelf = open && isMember && !b.myVote;
          return (
            <Card key={b.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${open ? "bg-warning/15 text-warning" : "bg-slate-200 text-slate-600"}`}>{b.status}</span>
                      {b.quorum != null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.quorumMet ? "bg-success/15 text-success" : "bg-slate-100 text-slate-500"}`}>
                          Quorum {b.totalVotes}/{b.quorum} {b.quorumMet ? "✓" : ""}
                        </span>
                      )}
                      {b.closesAt && open && <span className="text-xs text-muted-foreground">closes {fmt(b.closesAt)}</span>}
                    </div>
                    <h3 className="font-semibold text-foreground mt-1.5">{b.question}</h3>
                  </div>
                  {open && <Button size="sm" variant="ghost" onClick={() => run(() => closeBallot.mutateAsync({ id: b.id }))}>Close</Button>}
                </div>

                {/* tally bars */}
                <div className="mt-3 space-y-1.5">
                  {b.options.map((opt: string) => {
                    const n = b.tally?.[opt] ?? 0;
                    const pct = b.totalVotes ? Math.round((n / b.totalVotes) * 100) : 0;
                    return (
                      <div key={opt} className="flex items-center gap-2 text-sm">
                        <span className="w-20 shrink-0 text-muted-foreground">{opt}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground pt-0.5">{b.totalVotes} vote{b.totalVotes === 1 ? "" : "s"} of {rosterActive} active members</p>
                </div>

                {/* voting controls */}
                {open && isMember && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2">
                    {b.myVote ? (
                      <p className="text-sm text-success flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> You voted: <span className="font-medium">{b.myVote}</span></p>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Cast your vote:</span>
                        {b.options.map((opt: string) => (
                          <Button key={opt} size="sm" variant="outline" onClick={() => run(() => castVote.mutateAsync({ id: b.id, data: { choice: opt } }))}>{opt}</Button>
                        ))}
                      </div>
                    )}
                    {canVoteSelf === false && b.myVote && null}
                    {held.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Vote by proxy for:</span>
                        {held.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-1">
                            <span className="text-xs text-foreground">{p.grantor}</span>
                            {b.options.map((opt: string) => (
                              <Button key={opt} size="sm" variant="ghost" className="px-2"
                                onClick={() => run(() => castVote.mutateAsync({ id: b.id, data: { choice: opt, memberId: p.grantorMemberId } }))}>{opt}</Button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

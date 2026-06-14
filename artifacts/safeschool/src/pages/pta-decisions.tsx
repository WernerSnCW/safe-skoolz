import { useState } from "react";
import {
  useListPtaProposals,
  useRaisePtaProposal,
  useDecidePtaProposal,
  useWithdrawPtaProposal,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui-polished";
import { Gavel, Plus, AlertTriangle, Clock } from "lucide-react";

const CATEGORIES = [
  { value: "school_engagement", label: "School engagement" },
  { value: "internal", label: "Internal" },
  { value: "spending", label: "Spending" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];
const OUTCOMES = [
  { value: "carried", label: "Carried" },
  { value: "rejected", label: "Rejected" },
  { value: "deferred", label: "Deferred" },
];
const STATUS_STYLE: Record<string, string> = {
  open: "bg-warning/15 text-warning",
  carried: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  deferred: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};
const labelOf = (l: { value: string; label: string }[], v: string) => l.find((x) => x.value === v)?.label ?? v;
const selectCls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default function PtaDecisions() {
  const listQ = useListPtaProposals();
  const raise = useRaisePtaProposal();
  const decide = useDecidePtaProposal();
  const withdraw = useWithdrawPtaProposal();

  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState("school_engagement");
  const [due, setDue] = useState("");
  const [decideFor, setDecideFor] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("carried");
  const [rationale, setRationale] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const proposals = (listQ.data as any)?.proposals ?? [];
  const refresh = () => listQ.refetch();
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); refresh(); } catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5" /> PTA · Decision Log
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Decisions</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Every proposal reaches an explicit decision. Proposals past their decision date are flagged —
          silence is not acceptance.
        </p>
      </header>

      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}

      {/* Raise */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Raise a proposal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title — the ask in one line" value={title} onChange={(e: any) => setTitle(e.target.value)} />
          <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Detail — what is being proposed, and why" value={detail} onChange={(e) => setDetail(e.target.value)} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Category</span>
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Decision due (optional)</span>
              <input type="date" className={selectCls} value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <Button disabled={!title.trim() || !detail.trim() || raise.isPending}
              onClick={() => run(async () => {
                await raise.mutateAsync({ data: { title: title.trim(), detail: detail.trim(), category, ...(due ? { decisionDueAt: new Date(due).toISOString() } : {}) } });
                setTitle(""); setDetail(""); setCategory("school_engagement"); setDue("");
              })}>Raise proposal</Button>
          </div>
        </CardContent>
      </Card>

      {/* Log */}
      <div className="space-y-3">
        {proposals.length === 0 && <p className="text-sm text-muted-foreground">No proposals yet.</p>}
        {proposals.map((p: any) => (
          <Card key={p.id} className={p.overdue ? "border-destructive/40" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] || "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    {p.overdue && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</span>}
                    <span className="text-xs text-muted-foreground">{labelOf(CATEGORIES, p.category)}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mt-1.5">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{p.detail}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Raised by {p.raisedBy} · {fmt(p.createdAt)}
                    {p.decisionDueAt && <> · decision due {fmt(p.decisionDueAt)}</>}
                  </p>
                  {p.status !== "open" && p.status !== "withdrawn" && (
                    <div className="mt-2 text-sm rounded-md bg-muted/40 border border-border px-3 py-2">
                      <span className="font-medium text-foreground">Decision: {p.status}</span>
                      {p.decidedBy && <span className="text-muted-foreground"> — {p.decidedBy}, {fmt(p.decidedAt)}</span>}
                      {p.decisionRationale && <p className="text-muted-foreground mt-1">{p.decisionRationale}</p>}
                    </div>
                  )}
                </div>
                {p.status === "open" && decideFor !== p.id && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => { setDecideFor(p.id); setOutcome("carried"); setRationale(""); setErr(null); }}>Record decision</Button>
                    <Button size="sm" variant="ghost" onClick={() => run(() => withdraw.mutateAsync({ id: p.id }))}>Withdraw</Button>
                  </div>
                )}
              </div>

              {decideFor === p.id && (
                <div className="mt-3 border-t border-border pt-3 flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Outcome</span>
                    <select className={selectCls} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                      {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <input className={selectCls + " flex-1 min-w-[200px]"} placeholder="Rationale (recorded)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
                  <Button size="sm" onClick={() => run(async () => { await decide.mutateAsync({ id: p.id, data: { outcome, rationale: rationale.trim() || undefined } }); setDecideFor(null); })}>Confirm</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDecideFor(null)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Every action here is recorded in the school's immutable audit log.</p>
    </div>
  );
}

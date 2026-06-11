import { useState } from "react";
import {
  useListPtaAnnouncements,
  usePostPtaAnnouncement,
  useDeletePtaAnnouncement,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui-polished";
import { Megaphone, Send, Pin, Trash2 } from "lucide-react";

const AUDIENCES = [
  { value: "all_parents", label: "All parents" },
  { value: "all_members", label: "All members" },
  { value: "officers", label: "Officers" },
  { value: "executive_board", label: "Executive Board" },
  { value: "senior_group", label: "Senior Group" },
  { value: "general_membership", label: "General Membership" },
];
const labelOf = (v: string) => AUDIENCES.find((a) => a.value === v)?.label ?? v;
const selectCls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "");

export default function PtaAnnouncements() {
  const listQ = useListPtaAnnouncements();
  const post = usePostPtaAnnouncement();
  const del = useDeletePtaAnnouncement();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all_members");
  const [pinned, setPinned] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const announcements = (listQ.data as any)?.announcements ?? [];
  const refresh = () => listQ.refetch();
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); refresh(); } catch (e: any) { setErr(e?.message || "Something went wrong"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5" /> PTA · Communications
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Publish to the whole community or a specific segment. A transparent, dated record of what the PTA has communicated.
        </p>
      </header>

      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}

      {/* Compose */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> New announcement</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e: any) => setTitle(e.target.value)} />
          <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="What do you want to tell the community?" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Audience</span>
              <select className={selectCls} value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground h-9">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
            </label>
            <Button disabled={!title.trim() || !body.trim() || post.isPending} onClick={() => run(async () => {
              await post.mutateAsync({ data: { title: title.trim(), body: body.trim(), audience, pinned } });
              setTitle(""); setBody(""); setAudience("all_members"); setPinned(false);
            })}>Publish</Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {announcements.map((a: any) => (
          <Card key={a.id} className={a.pinned ? "border-primary/40" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{labelOf(a.audience)}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mt-1.5">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{a.author} · {fmt(a.createdAt)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => run(() => del.mutateAsync({ id: a.id }))}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

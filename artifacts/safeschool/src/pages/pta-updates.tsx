import { useGetPtaAnnouncementFeed } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Megaphone, Pin } from "lucide-react";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "");

export default function PtaUpdates() {
  const { data, isLoading } = useGetPtaAnnouncementFeed();
  const announcements = (data as any)?.announcements ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5" /> From the PTA
        </p>
        <h1 className="text-2xl font-bold text-foreground mt-1">PTA Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">Announcements from your school&rsquo;s PTA.</p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && announcements.length === 0 && (
        <p className="text-sm text-muted-foreground">No updates from the PTA yet.</p>
      )}

      <div className="space-y-3">
        {announcements.map((a: any) => (
          <Card key={a.id} className={a.pinned ? "border-primary/40" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                {a.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                <h3 className="font-semibold text-foreground">{a.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-muted-foreground mt-2">{a.author} · {fmt(a.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

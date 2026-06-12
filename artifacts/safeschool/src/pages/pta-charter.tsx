import { useGetPtaCharter, useAdoptPtaCharter, useAcknowledgePtaCharter } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PtaCharterPage() {
  const q = useGetPtaCharter();
  const adopt = useAdoptPtaCharter();
  const ack = useAcknowledgePtaCharter();
  const { user } = useAuth();
  const data = q.data as any;
  const isAdmin = (user as any)?.role === "pta";

  const onAdopt = async () => { await adopt.mutateAsync(); await q.refetch(); };
  const onAck = async () => { await ack.mutateAsync(); await q.refetch(); };

  if (q.isLoading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!data) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="font-display text-2xl font-bold">Charter unavailable</h1></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        eyebrow="Morna Vibes"
        title={data.title}
        subtitle={data.claimed ? `Adopted ${new Date(data.claimedAt).toLocaleDateString()}` : "Forming — not yet adopted"}
        action={
          isAdmin && !data.claimed
            ? <Button onClick={onAdopt} isLoading={adopt.isPending}>Adopt the operating structure</Button>
            : !data.claimed
              ? <Button variant="outline" onClick={onAck} isLoading={ack.isPending}>I acknowledge</Button>
              : undefined
        }
      />
      {data.sections.map((s: any) => (
        <Card key={s.heading}>
          <CardHeader><CardTitle className="text-base">{s.heading}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
        </Card>
      ))}
      {data.officers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Officers</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.officers.map((o: any, i: number) => (
              <div key={i} className="flex justify-between"><span className="text-foreground">{o.name}</span><span className="text-muted-foreground capitalize">{String(o.role).replace(/_/g, " ")}</span></div>
            ))}
          </CardContent>
        </Card>
      )}
      {data.acknowledgements?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Adopted &amp; acknowledged by</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.acknowledgements.map((a: any, i: number) => (
              <div key={i} className="flex justify-between"><span className="text-foreground">{a.name}</span><span className="text-muted-foreground">{a.actionType}</span></div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

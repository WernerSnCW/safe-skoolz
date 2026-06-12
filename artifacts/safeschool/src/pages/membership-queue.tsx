import { useState } from "react";
import {
  useListPendingMembers,
  useApproveMember,
  useRejectMember,
} from "@workspace/api-client-react";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

// Exec-only approval queue (/membership). Approving records the member's
// anonymity choice (spec §4.1); rejecting declines a pending signup.

export default function MembershipQueuePage() {
  const q = useListPendingMembers();
  const approve = useApproveMember();
  const reject = useRejectMember();
  const [mode, setMode] = useState<Record<string, "named" | "anonymous">>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = (q.data as any)?.members ?? [];

  const run = async (userId: string, action: () => Promise<unknown>) => {
    setError(null);
    setPendingId(userId);
    try {
      await action();
      await q.refetch();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const onApprove = (userId: string) =>
    run(userId, () => approve.mutateAsync({ userId, data: { displayMode: mode[userId] ?? "named" } }));
  const onReject = (userId: string) => run(userId, () => reject.mutateAsync({ userId }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Exec"
        title="Membership approvals"
        subtitle={`${members.length} ${members.length === 1 ? "person" : "people"} awaiting approval`}
      />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {q.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No one is waiting for approval right now.</CardContent></Card>
      ) : (
        members.map((m: any) => {
          const busy = pendingId === m.id;
          return (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-foreground">{`${m.firstName} ${m.lastName}`.trim() || m.email}</div>
                  <div className="text-sm text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={mode[m.id] ?? "named"}
                    disabled={busy}
                    onChange={(e) => setMode((p) => ({ ...p, [m.id]: e.target.value as "named" | "anonymous" }))}
                  >
                    <option value="named">Show their name to parents</option>
                    <option value="anonymous">Anonymous to parents</option>
                  </select>
                  <Button onClick={() => onApprove(m.id)} isLoading={busy} disabled={busy}>Approve</Button>
                  <Button variant="outline" onClick={() => onReject(m.id)} disabled={busy}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

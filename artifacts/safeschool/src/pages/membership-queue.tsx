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

  const members = (q.data as any)?.members ?? [];

  const onApprove = async (userId: string) => {
    await approve.mutateAsync({ userId, data: { displayMode: mode[userId] ?? "named" } });
    await q.refetch();
  };
  const onReject = async (userId: string) => {
    await reject.mutateAsync({ userId });
    await q.refetch();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Exec"
        title="Membership approvals"
        subtitle={`${members.length} ${members.length === 1 ? "person" : "people"} awaiting approval`}
      />

      {q.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No one is waiting for approval right now.
          </CardContent>
        </Card>
      ) : (
        members.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-foreground">
                  {`${m.firstName} ${m.lastName}`.trim() || m.email}
                </div>
                <div className="text-sm text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  value={mode[m.id] ?? "named"}
                  onChange={(e) =>
                    setMode((p) => ({
                      ...p,
                      [m.id]: e.target.value as "named" | "anonymous",
                    }))
                  }
                >
                  <option value="named">Show their name to parents</option>
                  <option value="anonymous">Anonymous to parents</option>
                </select>
                <Button
                  onClick={() => onApprove(m.id)}
                  isLoading={approve.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onReject(m.id)}
                  isLoading={reject.isPending}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

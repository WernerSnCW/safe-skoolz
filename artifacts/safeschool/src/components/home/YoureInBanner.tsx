import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";
import { useGetJoinSummary } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Users } from "lucide-react";

// Phase 3: the always-on "you're in" banner — standing + live join counter.
// Copy is placeholder (end-of-redesign content audit).
export function YoureInBanner() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const slug = tenant?.slug ?? "";
  const joinQ = useGetJoinSummary(slug, { query: { enabled: !!slug } });
  const summary = joinQ.data as any;
  const state = getMembershipState(user);
  const firstName = user?.firstName && user.firstName !== "Morna" ? user.firstName : "";
  const eyebrow = `${tenant?.displayName ?? ""} Vibes`.trim();
  const subtitle =
    state === "pending"
      ? "You're in — your membership is awaiting approval. You'll be notified when results are released."
      : "You're backing the cause. Here's everything in one place.";

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={eyebrow} title={firstName ? `Welcome, ${firstName}` : "Welcome"} subtitle={subtitle} />
      {summary?.joinCount != null && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          {summary.joinCount} families have joined{summary.voiceName ? ` ${summary.voiceName}` : ""}
        </div>
      )}
    </div>
  );
}

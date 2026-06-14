import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";
import {
  useListPtaMembers, useGetPtaCharter, useListPtaGoals,
  useListPtaInitiatives, useGetPtaAnnouncementFeed,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Users, Flag, ListChecks, Megaphone, Sparkles, ArrowRight, Lock } from "lucide-react";

// Phase 3: the PTA. Gate: pta capability + a PTA exists (members >= 1).
// Shows the "bring VIBES to your PTA" pitch when no charter is claimed, the
// read-only operating content (locked for pending members), and a running
// join-to-advocate CTA. Copy is placeholder (end-of-redesign content audit).
export function PtaSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const { user } = useAuth();
  const state = getMembershipState(user);

  const membersQ = useListPtaMembers({ query: { enabled: !!cap.pta } as any });
  const charterQ = useGetPtaCharter({ query: { enabled: !!cap.pta } as any });
  const goalsQ = useListPtaGoals({ query: { enabled: !!cap.pta } as any });
  const initiativesQ = useListPtaInitiatives({ query: { enabled: !!cap.pta } as any });
  const feedQ = useGetPtaAnnouncementFeed({ query: { enabled: !!cap.pta } as any });

  const members = (membersQ.data as any)?.members ?? [];
  if (isLoading || !cap.pta || members.length === 0) return null;

  const adopted = !!(charterQ.data as any)?.claimed;
  const goals = ((goalsQ.data as any)?.goals ?? []).slice(0, 3);
  const initiatives = ((initiativesQ.data as any)?.initiatives ?? []).slice(0, 3);
  const announcements = ((feedQ.data as any)?.announcements ?? []).slice(0, 2);
  const locked = state === "pending";

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Users size={20} className="text-primary" aria-hidden /> The PTA
      </h2>

      {!adopted && !locked && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Bring VIBES to your PTA
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adopt the VIBES operating principles — transparent by default, equal access to information, participation from anywhere.
            </p>
            <Link href="/pta/charter" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Get your PTA VIBING <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      {locked ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden /> PTA goals, initiatives and decisions unlock once your membership is approved.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold flex items-center gap-2"><Flag className="h-4 w-4 text-primary" aria-hidden /> Goals</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {goals.length ? goals.map((g: any) => <li key={g.id}>{g.title}</li>) : <li>No goals yet.</li>}
              </ul>
              <Link href="/pta/goals" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All goals <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" aria-hidden /> Initiatives</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {initiatives.length ? initiatives.map((i: any) => <li key={i.id}>{i.title}</li>) : <li>No initiatives yet.</li>}
              </ul>
              <Link href="/pta/initiatives" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All initiatives <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {!locked && announcements.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" aria-hidden /> Latest from the PTA</p>
            <ul className="mt-2 space-y-2">
              {announcements.map((a: any) => (
                <li key={a.id} className="text-sm font-medium text-foreground">{a.title}</li>
              ))}
            </ul>
            <Link href="/pta-updates" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              All updates <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border-role-pta/30 bg-role-pta/5">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Add your voice</p>
            <p className="text-sm text-muted-foreground">More members, more advocacy weight.</p>
          </div>
          <Link href="/voice" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Join <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

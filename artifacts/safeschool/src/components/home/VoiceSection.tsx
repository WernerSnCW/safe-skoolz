import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useListVoice } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Vote, ArrowRight } from "lucide-react";

// Phase 3: the cause / VOICE. Gate: voice capability + a VOICE exists.
export function VoiceSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListVoice({ query: { enabled: !!cap.voice } as any });
  const voices = (q.data as any)?.voices ?? [];
  if (isLoading || !cap.voice || voices.length === 0) return null;

  const lead = voices.find((v: any) => v.status === "advocating") ?? voices[0];
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Vote size={20} className="text-primary" aria-hidden /> The cause
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="font-semibold text-foreground">{lead.name}</p>
          {lead.mission && <p className="mt-1 text-sm text-muted-foreground">{lead.mission}</p>}
          <p className="mt-2 text-sm text-muted-foreground">{lead.memberCount ?? 0} backing this</p>
          <Link href="/voice" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Back it &amp; share <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

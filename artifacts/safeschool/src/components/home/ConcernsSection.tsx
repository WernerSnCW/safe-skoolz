import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useListConcerns } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { AlertTriangle, ArrowRight } from "lucide-react";

// Phase 3: concerns. Gate: concerns capability.
export function ConcernsSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListConcerns({ query: { enabled: !!cap.concerns } as any });
  if (isLoading || !cap.concerns) return null;

  const concerns = (q.data as any)?.concerns ?? [];
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <AlertTriangle size={20} className="text-primary" aria-hidden /> Concerns
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">The patterns we&apos;ve seen — and add your own.</p>
          {concerns.length > 0 && <p className="mt-2 text-sm font-medium text-foreground">{concerns.length} raised by the community</p>}
          <Link href="/concerns" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Raise or review concerns <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

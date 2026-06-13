import { Link } from "wouter";
import { useTenant } from "@/providers/tenant";
import { useGetDiagnosticResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { BarChart3, Lock, ArrowRight } from "lucide-react";

// Phase 3: the real picture = the diagnostic report. Gate: results capability.
// The hook 403s (-> isError) for pending/unreleased non-exec; treat as locked.
export function ResultsSection() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const slug = tenant?.slug ?? "";
  const q = useGetDiagnosticResults(slug, { query: { enabled: !!cap.results && !!slug } as any });
  if (isLoading || !cap.results) return null;

  const data = q.data as any;
  const available = !q.isError && !!data && data.released;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" aria-hidden /> The real picture
      </h2>
      {available ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">The community diagnostic report is ready — the honest read on where your community stands.</p>
            <Link href={`/results/${slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View the report <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden /> The diagnostic report unlocks once your membership is approved and results are released. You'll be notified.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

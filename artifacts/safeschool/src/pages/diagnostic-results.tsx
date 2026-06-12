import { useMemo, useState } from "react";
import { useGetDiagnosticResults, useReleaseDiagnosticResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";

// Authed results view for a community diagnostic (/results/:slug). Seeing results
// requires signing up; the API locks non-exec access until the exec releases.

function DistributionBars({ options, counts }: { options: string[]; counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const n = counts[i] ?? 0;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={opt} className="flex items-center gap-3 text-sm">
            <div className="w-40 shrink-0 text-muted-foreground">{opt}</div>
            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
              <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 shrink-0 text-right tabular-nums">{n} · {pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DiagnosticResultsPage({ slug }: { slug: string }) {
  const q = useGetDiagnosticResults(slug);
  const release = useReleaseDiagnosticResults();
  const [segByQuestion, setSegByQuestion] = useState<Record<string, string>>({});

  const data = q.data as any;
  const yearGroups = useMemo(() => {
    const set = new Set<string>();
    for (const question of data?.questions ?? []) {
      for (const s of question.segments ?? []) set.add(s.yearGroup);
    }
    return [...set].sort();
  }, [data]);

  if (q.isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading results…</div>;
  }
  if (q.isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Results aren't available yet</h1>
        <p className="mt-3 text-muted-foreground">
          You'll be notified the moment they're released. Thank you for taking part.
        </p>
      </div>
    );
  }

  const onRelease = async () => {
    await release.mutateAsync({ slug });
    await q.refetch();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Community diagnostic"
        title={data.title}
        subtitle={`${data.totalResponses} ${data.totalResponses === 1 ? "family has" : "families have"} taken part`}
        action={
          data.isExec && !data.released ? (
            <Button onClick={onRelease} isLoading={release.isPending}>Release results</Button>
          ) : undefined
        }
      />

      {data.isExec && !data.released && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          You're seeing these results as an exec before release. Releasing notifies every participant with an account.
        </div>
      )}

      {data.questions.map((question: any) => {
        const seg = segByQuestion[question.key] ?? "all";
        const segData = question.segments?.find((s: any) => s.yearGroup === seg);
        const counts = seg === "all" ? question.distribution : segData?.distribution ?? question.distribution;
        return (
          <Card key={question.key}>
            <CardHeader>
              <CardTitle className="text-base">{question.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {yearGroups.length > 0 && question.segments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {["all", ...question.segments.map((s: any) => s.yearGroup)].map((yg: string) => (
                    <button
                      key={yg}
                      type="button"
                      onClick={() => setSegByQuestion((p) => ({ ...p, [question.key]: yg }))}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors " +
                        (seg === yg
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40")
                      }
                    >
                      {yg === "all" ? "Everyone" : yg}
                    </button>
                  ))}
                </div>
              )}
              <DistributionBars options={question.options} counts={counts} />
            </CardContent>
          </Card>
        );
      })}

      {data.isExec && data.freeText && data.freeText.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In families' own words (exec only · shuffled)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.freeText.map((f: any, i: number) => (
              <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-sm text-foreground">
                {f.text}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

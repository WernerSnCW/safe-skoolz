import { useTenant } from "@/providers/tenant";
import { useGetIntakeAggregate } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { BarChart3 } from "lucide-react";

// Phase 4b (spec §4.4): the community's FIRST DATA — the intake aggregate, with
// the n>=5 suppression honoured, plus threshold-progress messaging toward the
// deep-diagnostic release. Copy is placeholder (end-of-redesign content audit).
export function FirstDataSection() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const slug = tenant?.slug ?? "";
  const q = useGetIntakeAggregate(slug, { query: { enabled: !!slug && !!cap.diagnostic } as any });
  if (!cap.diagnostic || !slug) return null;

  const data = q.data as any;
  if (!data) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <BarChart3 size={20} className="text-primary" aria-hidden /> The first picture
      </h2>
      <Card>
        <CardContent className="p-5">
          {data.suppressed ? (
            <p className="text-sm text-muted-foreground">
              {data.n} {data.n === 1 ? "family has" : "families have"} added their pulse. Once {data.floor}{" "}
              families have taken part, the community's first picture appears here — and the full
              diagnostic unlocks for everyone.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">{data.n} families have added their pulse.</p>
              {data.domains.map((d: any) => (
                <div key={d.key}>
                  <p className="text-sm font-semibold text-foreground">{d.section}</p>
                  <ul className="mt-1 space-y-1">
                    {d.options.map((opt: string, i: number) => (
                      <li key={`${d.key}-${i}`} className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{opt}</span>
                        <span className="font-semibold text-foreground">{d.counts[i]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

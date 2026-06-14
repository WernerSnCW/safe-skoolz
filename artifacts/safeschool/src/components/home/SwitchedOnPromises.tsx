import { useTenant } from "@/providers/tenant";
import { Card, CardContent } from "@/components/ui-polished";
import { Shield, BookOpen, Sparkles } from "lucide-react";

// Phase 3: honest "switched on as your school adopts VBE" cards for the
// whole-school capabilities a tenant hasn't turned on yet. Copy is placeholder.
const PROMISES: { cap: string; icon: typeof Shield; title: string; body: string }[] = [
  { cap: "safeguarding", icon: Shield, title: "Safeguarding & reporting", body: "Confidential reporting and incident handling — switched on when your school adopts VBE." },
  { cap: "lessons", icon: BookOpen, title: "Lessons & PSHE", body: "Values-based lessons for every class — switched on when your school adopts VBE." },
];

export function SwitchedOnPromises() {
  const { tenant, isLoading } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  if (isLoading) return null;

  const off = PROMISES.filter((p) => !cap[p.cap]);
  if (off.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <Sparkles size={20} className="text-primary" aria-hidden /> More of vibez
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {off.map((p) => (
          <Card key={p.cap} className="border-dashed">
            <CardContent className="p-5 opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <p.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-3 font-semibold text-foreground">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type MissionAction = {
  label: string;
  sub: string;
  icon: any;
  href: string;
  external?: boolean;
};

// The mission's power tools, led front-and-centre on each role's home — the
// "what you can do here" row that makes the app feel like a distinct, capable
// product rather than an incident dashboard. Presentational, no animation.
export function MissionActions({
  heading = "Do",
  actions,
}: {
  heading?: string;
  actions: MissionAction[];
}) {
  return (
    <div>
      <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
        {heading}
      </p>
      <div className={cn("grid gap-4", actions.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
        {actions.map((a) => {
          const Wrapper: any = a.external ? "a" : Link;
          const props = a.external ? { href: a.href, target: "_blank", rel: "noopener" } : { href: a.href };
          return (
            <Wrapper key={a.label} {...props} className="block">
              <div className="group h-full cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <a.icon size={20} />
                </div>
                <p className="font-bold text-foreground">{a.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.sub}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

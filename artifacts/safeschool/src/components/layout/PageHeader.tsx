import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One header pattern for every authed page: a mono eyebrow, a display-font
// title, an optional subtitle, and an optional right-aligned action slot.
// Mirrors the marketing-site language (mono eyebrow + Quicksand display).
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            — {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

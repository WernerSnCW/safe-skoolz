import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type DigestTone = "info" | "primary" | "warning" | "destructive" | "pta";

export type DigestItem = {
  id: string;
  icon: any;          // lucide icon component
  tone: DigestTone;
  title: string;
  detail?: string;
  when?: string;
  href: string;       // deep-link target
  unread?: boolean;
};

const TONE: Record<DigestTone, string> = {
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  pta: "bg-role-pta/10 text-role-pta",
};

// Calm "what's changed since you were last here" digest that opens each role
// dashboard, tying together cross-cutting updates (messages, incidents, etc.).
// Presentational + SSR-safe; callers map their already-loaded data into items.
export function WhatsNewBand({
  items,
  heading = "Since you were last here",
  emptyLabel = "You're all caught up.",
}: {
  items: DigestItem[];
  heading?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-1.5">
      <p className="px-3 pt-2.5 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
        {heading}
      </p>
      {items.length === 0 ? (
        <p className="px-3 pb-3 pt-1 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        items.map((it) => (
          <Link key={it.id} href={it.href} className="block">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE[it.tone])}>
                <it.icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{it.title}</p>
                {it.detail && <p className="truncate text-xs text-muted-foreground">{it.detail}</p>}
              </div>
              {it.when && <span className="shrink-0 text-[10px] text-muted-foreground">{it.when}</span>}
              {it.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

// The vibez wordmark with a quiet "by SchoolVBE" endorsement, so the app
// always reads as part of the SchoolVBE family (two-names, one-system brand
// model). Used in the sidebar, mobile header, and login. Text-only — no asset.
export function BrandLockup({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const wordmark = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl",
  }[size];
  const endorse = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  }[size];

  return (
    <span role="img" aria-label="vibez by SchoolVBE" className={cn("flex flex-col leading-none", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "font-brand tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary",
          wordmark,
        )}
      >
        vibez
      </span>
      <span aria-hidden="true" className={cn("font-display font-medium uppercase tracking-wide text-muted-foreground", endorse)}>
        by SchoolVBE
      </span>
    </span>
  );
}

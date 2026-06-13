import { cn } from "@/lib/utils";
import { useTenant } from "@/providers/tenant";

// End users see "{School} Vibes" (the per-tenant skin). The platform endorsement
// "Vibes — software for VBE" appears only where `endorse` is requested
// (login / ops), never the parent-facing sidebar. Brand model C.
export function BrandLockup({
  size = "md",
  endorse = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  endorse?: boolean;
  className?: string;
}) {
  const { tenant } = useTenant();
  const name = tenant?.displayName ? `${tenant.displayName} Vibes` : "Vibes";
  const wordmark = { sm: "text-lg", md: "text-2xl", lg: "text-5xl" }[size];
  const endorseSz = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" }[size];

  return (
    <span role="img" aria-label={name} className={cn("flex flex-col leading-none", className)}>
      <span
        aria-hidden="true"
        className={cn("font-brand tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary", wordmark)}
      >
        {name}
      </span>
      {endorse && (
        <span aria-hidden="true" className={cn("font-display font-medium uppercase tracking-wide text-muted-foreground", endorseSz)}>
          Vibes — software for VBE
        </span>
      )}
    </span>
  );
}

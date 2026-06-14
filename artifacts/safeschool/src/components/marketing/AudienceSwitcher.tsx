import { useAudience, type Audience } from "@/providers/audience";
import { cn } from "@/lib/utils";

const TRACKS: { value: Audience; label: string }[] = [
  { value: "schools", label: "School" },
  { value: "parents", label: "Parent" },
  { value: "ptas", label: "PTA" },
];

// Self-select chips. Clicking a chip reshapes the homepage in place (no nav);
// clicking the active chip again clears back to the broad "all" state.
export function AudienceSwitcher({ className }: { className?: string }) {
  const { audience, setAudience } = useAudience();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">I'm a…</span>
      {TRACKS.map((track) => {
        const active = audience === track.value;
        return (
          <button
            key={track.value}
            type="button"
            aria-pressed={active}
            onClick={() => setAudience(active ? "all" : track.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {track.label}
          </button>
        );
      })}
    </div>
  );
}

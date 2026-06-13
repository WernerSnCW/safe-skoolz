import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// The three self-select tracks plus the broad default. "all" = no selection;
// the homepage renders its broad state (and prerenders in this state).
export type Audience = "all" | "schools" | "parents" | "ptas";

const STORAGE_KEY = "vibes_audience";

function isAudience(value: unknown): value is Audience {
  return value === "all" || value === "schools" || value === "parents" || value === "ptas";
}

// Precedence on first load: URL param (?audience=) → localStorage → "all".
// SSR-safe: returns "all" when there is no window (prerender path).
function readInitialAudience(): Audience {
  if (typeof window === "undefined") return "all";
  const fromUrl = new URLSearchParams(window.location.search).get("audience");
  if (isAudience(fromUrl)) return fromUrl;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isAudience(stored)) return stored;
  return "all";
}

type AudienceContextValue = { audience: Audience; setAudience: (a: Audience) => void };

// Default value lets components read the hook with NO provider mounted (the
// prerender path renders pages bare) — they get the broad "all" state.
const AudienceContext = createContext<AudienceContextValue>({
  audience: "all",
  setAudience: () => {},
});

export function useAudience() {
  return useContext(AudienceContext);
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>(readInitialAudience);

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    // Reflect to the URL without navigating (shareable / pre-personalized link).
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("audience");
    else url.searchParams.set("audience", next);
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <AudienceContext.Provider value={{ audience, setAudience }}>
      {children}
    </AudienceContext.Provider>
  );
}

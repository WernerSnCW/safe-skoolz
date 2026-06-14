import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useGetTenant, type Tenant } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

type TenantContextValue = { tenant: Tenant | null; isLoading: boolean };
const TenantContext = createContext<TenantContextValue>({ tenant: null, isLoading: false });

export function useTenant() {
  return useContext(TenantContext);
}

// Resolve the active tenant: authed users carry it on /auth/me; anonymous
// visitors resolve it from the :slug in the path (spec §4.2). Applies the
// per-tenant theme by overriding the --primary CSS var on <html>.
export function TenantProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const { user } = useAuth();
  const authedTenant = (user as any)?.tenant as Tenant | null | undefined;

  // Only fetch by slug when anonymous (no authed tenant) and a slug is present.
  const enabled = !authedTenant && !!slug;
  const { data: fetched, isLoading } = useGetTenant(slug ?? "", {
    query: { enabled } as any,
  });

  const tenant: Tenant | null = authedTenant ?? (enabled ? (fetched ?? null) : null);

  useEffect(() => {
    const root = document.documentElement;
    const primary = (tenant?.theme as Record<string, unknown> | undefined)?.primaryColor;
    // HSL triple ("H S% L%") to match index.css (--primary: 217 90% 52%). Empty => default.
    if (typeof primary === "string" && primary.trim()) {
      root.style.setProperty("--primary", primary.trim());
    } else {
      root.style.removeProperty("--primary");
    }
    return () => { root.style.removeProperty("--primary"); };
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading: enabled ? isLoading : false }}>
      {children}
    </TenantContext.Provider>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminOverview {
  protocols: { total: number; by_status: Record<string, number> };
  annex_templates?: { by_framework: Record<string, number> };
  delegated_roles?: { by_role_type: Record<string, number> };
}

const apiBase = (() => {
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  return baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
})();

const authHeaders = () => {
  const token = localStorage.getItem("safeschool_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const DSL_ROLE_TYPE = "lopivi_delegate";

function humanise(roleType: string): string {
  return roleType
    .split("_")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function DataControllerTab() {
  const { t } = useTranslation("admin");
  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/admin/overview`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const counts = data?.delegated_roles?.by_role_type ?? {};
  const dslCount = counts[DSL_ROLE_TYPE] ?? 0;
  const dslAppointed = dslCount > 0;

  const otherRoles = Object.entries(counts)
    .filter(([roleType]) => roleType !== DSL_ROLE_TYPE)
    .sort(([a], [b]) => a.localeCompare(b));

  const roleLabel = (roleType: string): string => {
    const key = `dataController.roleNames.${roleType}`;
    const translated = t(key);
    return translated === key ? humanise(roleType) : translated;
  };

  return (
    <section
      className="bg-card border border-border rounded-2xl shadow-sm p-6"
      aria-labelledby="datacontroller-card-title"
    >
      <h2 id="datacontroller-card-title" className="text-lg font-semibold mb-2">
        {t("dataController.cardTitle")}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {t("dataController.intro")}
      </p>

      {isLoading && (
        <div className="text-sm text-muted-foreground" role="status">
          {t("loading")}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive" role="alert">
          {t("loadError")}
        </div>
      )}

      {data && (
        <TooltipProvider delayDuration={150}>
          <div className="space-y-5">
            {/* DSL status card */}
            <div
              className={
                dslAppointed
                  ? "border border-teal-200 bg-teal-50/60 rounded-xl p-5"
                  : "border border-amber-200 bg-amber-50/60 rounded-xl p-5"
              }
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    Delegado de Bienestar y Protección (LOPIVI)
                  </h3>
                  <p
                    className={
                      dslAppointed
                        ? "text-sm font-medium text-teal-900 mt-1"
                        : "text-sm font-medium text-amber-900 mt-1"
                    }
                  >
                    {dslAppointed
                      ? t("dataController.dslAppointed", { count: dslCount })
                      : t("dataController.dslNotAppointed")}
                  </p>
                  {!dslAppointed && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic">
                      {t("dataController.comingSoonHint")}
                    </p>
                  )}
                </div>
                <span
                  className={
                    dslAppointed
                      ? "shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800"
                      : "shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800"
                  }
                >
                  {dslAppointed
                    ? t("dataController.statusAppointed")
                    : t("dataController.statusNotAppointed")}
                </span>
              </div>
            </div>

            {/* Other delegated roles grid */}
            {otherRoles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {t("dataController.otherRolesHeading")}
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherRoles.map(([roleType, count]) => (
                    <li
                      key={roleType}
                      className="border border-border rounded-xl p-4 bg-muted/20 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {roleLabel(roleType)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("dataController.activeCount", { count })}
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-block">
                            <Button size="sm" variant="outline" disabled aria-disabled="true">
                              {t("dataController.manage")}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("dataController.comingSoonHint")}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Static footer */}
            <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
              {t("dataController.footer")}
            </p>
          </div>
        </TooltipProvider>
      )}
    </section>
  );
}

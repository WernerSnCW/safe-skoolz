import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface AdminOverview {
  protocols: { total: number; by_status: Record<string, number> };
  annex_templates?: { by_framework: Record<string, number> };
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

interface FrameworkCard {
  name: string;
  explainerKey: "explainer1" | "explainer2" | "explainer3" | "explainer4";
  dbKey: string | null;
}

const FRAMEWORKS: FrameworkCard[] = [
  { name: "LOPIVI", explainerKey: "explainer1", dbKey: "lopivi" },
  { name: "Convivèxit", explainerKey: "explainer2", dbKey: "convivexit" },
  { name: "Keeping Children Safe in Education", explainerKey: "explainer3", dbKey: null },
  { name: "Pacto contra la Violencia de Género", explainerKey: "explainer4", dbKey: "machista_violence" },
];

export default function FrameworksTab() {
  const { t } = useTranslation("admin");
  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/admin/overview`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const counts = data?.annex_templates?.by_framework ?? {};

  return (
    <section
      className="bg-card border border-border rounded-2xl shadow-sm p-6"
      aria-labelledby="frameworks-card-title"
    >
      <h2 id="frameworks-card-title" className="text-lg font-semibold mb-2">
        {t("frameworks.cardTitle")}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {t("frameworks.intro")}
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
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FRAMEWORKS.map((fw) => {
              const count = fw.dbKey ? counts[fw.dbKey] ?? 0 : 0;
              const isActive = count > 0;
              return (
                <li
                  key={fw.name}
                  className="border border-border rounded-xl p-5 bg-muted/20 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-foreground leading-tight">
                      {fw.name}
                    </h3>
                    <span
                      className={
                        isActive
                          ? "shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                          : "shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                      }
                    >
                      {isActive
                        ? t("frameworks.chipActive")
                        : t("frameworks.chipComingSoon")}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`frameworks.${fw.explainerKey}`)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {t("frameworks.templatesCount", { count })}
                  </p>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted-foreground mt-5 italic">
            {t("frameworks.footer")}
          </p>
        </>
      )}
    </section>
  );
}

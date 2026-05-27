import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

interface AdminOverview {
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

export default function DslBanner() {
  const { t } = useTranslation("admin");
  const { data } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/admin/overview`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const dslCount = data?.delegated_roles?.by_role_type?.[DSL_ROLE_TYPE] ?? 0;
  const dslAppointed = dslCount > 0;

  return (
    <section
      className={
        dslAppointed
          ? "mb-6 rounded-2xl border-2 border-teal-300 bg-teal-50/70 dark:bg-teal-950/30 p-5 sm:p-6"
          : "mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-5 sm:p-6"
      }
      aria-label="Designated Safeguarding Lead status"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div
          className={
            dslAppointed
              ? "shrink-0 p-3 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
              : "shrink-0 p-3 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
          }
        >
          <ShieldCheck size={28} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
            Delegado de Bienestar y Protección (LOPIVI)
          </h2>
          <p
            className={
              dslAppointed
                ? "text-sm sm:text-base font-semibold text-teal-900 dark:text-teal-100 mt-1"
                : "text-sm sm:text-base font-semibold text-amber-900 dark:text-amber-100 mt-1"
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
              ? "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-600 text-white"
              : "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-600 text-white"
          }
        >
          {dslAppointed
            ? t("dataController.statusAppointed")
            : t("dataController.statusNotAppointed")}
        </span>
      </div>
    </section>
  );
}

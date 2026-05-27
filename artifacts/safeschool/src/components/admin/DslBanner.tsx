import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

interface AdminOverview {
  delegated_roles?: {
    by_role_type: Record<string, number>;
    dsl_holders?: string[];
  };
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
  const holders = data?.delegated_roles?.dsl_holders ?? [];
  const holderLabel = holders.length > 0 ? holders.join(", ") : "John Doe";

  return (
    <section
      className={
        dslAppointed
          ? "mb-6 rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 sm:p-6"
          : "mb-6 rounded-2xl border-2 border-border bg-muted/40 p-5 sm:p-6"
      }
      aria-label="Designated Safeguarding Lead status"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div
          className={
            dslAppointed
              ? "shrink-0 p-3 rounded-xl bg-primary/10 text-primary"
              : "shrink-0 p-3 rounded-xl bg-muted text-muted-foreground"
          }
        >
          <ShieldCheck size={28} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
            Delegado de Bienestar y Protección (LOPIVI){" "}
            <span
              className={
                dslAppointed
                  ? "font-semibold text-primary"
                  : "font-semibold text-muted-foreground"
              }
            >
              ({holderLabel})
            </span>
          </h2>
          {!dslAppointed && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">
              {t("dataController.comingSoonHint")}
            </p>
          )}
        </div>
        <span
          className={
            dslAppointed
              ? "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
              : "shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border"
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

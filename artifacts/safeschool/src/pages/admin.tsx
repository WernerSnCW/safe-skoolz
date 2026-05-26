import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

interface AdminOverview {
  protocols: {
    total: number;
    by_status: Record<string, number>;
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

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/admin/overview`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 text-primary p-3 rounded-xl">
          <ShieldCheck size={28} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <section
        className="bg-card border border-border rounded-2xl shadow-sm p-6"
        aria-labelledby="protocols-card-title"
      >
        <h2 id="protocols-card-title" className="text-lg font-semibold mb-1">
          {t("protocolsCardTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {t("protocolsCardDescription")}
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
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-primary">
                {data.protocols.total}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("totalProtocols")}
              </span>
            </div>

            {Object.keys(data.protocols.by_status).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProtocols")}</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(data.protocols.by_status)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([status, count]) => (
                    <li
                      key={status}
                      className="border border-border rounded-xl px-4 py-3 flex items-center justify-between bg-muted/30"
                    >
                      <span className="text-sm font-medium capitalize">
                        {formatStatus(status)}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {count}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

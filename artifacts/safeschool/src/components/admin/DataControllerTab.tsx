import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const POLICY_SLOTS: { key: string; statutory: boolean }[] = [
  { key: "safeguarding", statutory: true },
  { key: "antiBullying", statutory: true },
  { key: "behaviour", statutory: true },
  { key: "onlineSafety", statutory: false },
  { key: "send", statutory: false },
  { key: "complaints", statutory: false },
  { key: "whistleblowing", statutory: false },
  { key: "dataProtection", statutory: true },
  { key: "convivencia", statutory: false },
  { key: "lopivi", statutory: true },
];

function humanise(roleType: string): string {
  return roleType
    .split("_")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function DataControllerTab() {
  const { t } = useTranslation("admin");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}api/admin/overview`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const counts = data?.delegated_roles?.by_role_type ?? {};
  const otherRoles = Object.entries(counts)
    .filter(([roleType]) => roleType !== DSL_ROLE_TYPE)
    .sort(([a], [b]) => a.localeCompare(b));

  const roleLabel = (roleType: string): string => {
    const key = `dataController.roleNames.${roleType}`;
    const translated = t(key);
    return translated === key ? humanise(roleType) : translated;
  };

  const triggerUpload = (slot: string) => {
    setActiveSlot(slot);
    fileInputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSlot) {
      setUploads((prev) => ({ ...prev, [activeSlot]: file.name }));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveSlot(null);
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      <section
        className="bg-card border border-border rounded-2xl shadow-sm p-6"
        aria-labelledby="policies-card-title"
      >
        <h2 id="policies-card-title" className="text-lg font-semibold">
          {t("policies.heading")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          {t("policies.intro")}
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-live="polite">
          {POLICY_SLOTS.map((slot) => {
            const uploaded = uploads[slot.key];
            const policyTitle = t(`policies.items.${slot.key}.title`);
            return (
              <li
                key={slot.key}
                className="border border-border rounded-xl p-4 bg-muted/10 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground leading-tight">
                        {policyTitle}
                      </h3>
                      {slot.statutory && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                          {t("policies.statutoryBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t(`policies.items.${slot.key}.helper`)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pl-11">
                  {uploaded ? (
                    <p className="text-xs text-primary flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span className="truncate">{uploaded}</span>
                      <span className="text-muted-foreground shrink-0">
                        · {t("policies.uploadedLabel")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t("policies.notUploaded")}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant={uploaded ? "outline" : "default"}
                    onClick={() => triggerUpload(slot.key)}
                    aria-label={`${
                      uploaded
                        ? t("policies.replaceButton")
                        : t("policies.uploadButton")
                    } — ${policyTitle}`}
                  >
                    <Upload size={14} className="mr-1.5" aria-hidden="true" />
                    {uploaded
                      ? t("policies.replaceButton")
                      : t("policies.uploadButton")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="bg-card border border-border rounded-2xl shadow-sm p-6"
        aria-labelledby="datacontroller-card-title"
      >
        <h2
          id="datacontroller-card-title"
          className="text-base font-semibold mb-1"
        >
          {t("dataController.otherRolesHeading")}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
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

        {data && otherRoles.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherRoles.map(([roleType, count]) => (
              <li
                key={roleType}
                className="border border-border rounded-xl p-3 bg-muted/20"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {roleLabel(roleType)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("dataController.activeCount", { count })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

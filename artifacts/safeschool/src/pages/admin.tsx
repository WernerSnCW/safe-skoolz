import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import PermissionsTab from "@/components/admin/PermissionsTab";
import FrameworksTab from "@/components/admin/FrameworksTab";
import DataControllerTab from "@/components/admin/DataControllerTab";
import DslBanner from "@/components/admin/DslBanner";

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const { setToken } = useAuth();
  const [, setLocation] = useLocation();
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [viewAsLoading, setViewAsLoading] = useState(false);
  const [viewAsError, setViewAsError] = useState("");

  const apiBase = (() => {
    const b = (import.meta as any).env?.BASE_URL || "/";
    return b.endsWith("/") ? b : b + "/";
  })();

  useEffect(() => {
    fetch(`${apiBase}api/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.demoEnabled) setDemoEnabled(true);
      })
      .catch(() => {});
  }, []);

  const handleViewAsPupil = async () => {
    setViewAsError("");
    setViewAsLoading(true);
    try {
      const r = await fetch(`${apiBase}api/auth/demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "pupil" }),
      });
      const data = await r.json();
      if (!r.ok) {
        setViewAsError(data?.error || "Could not switch to pupil view.");
        setViewAsLoading(false);
        return;
      }
      setToken(data.token);
      setLocation("/");
    } catch {
      setViewAsError("Could not switch to pupil view.");
      setViewAsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-xl">
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {demoEnabled && (
          <button
            type="button"
            onClick={handleViewAsPupil}
            disabled={viewAsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
            aria-label="View vibez as a pupil"
          >
            {viewAsLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Opening pupil view…
              </>
            ) : (
              <>
                <UserIcon size={14} aria-hidden="true" />
                View as pupil
              </>
            )}
          </button>
        )}
      </div>

      {viewAsError && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {viewAsError}
        </p>
      )}

      <p className="text-sm text-muted-foreground italic mb-6 leading-relaxed">
        {t("appointedAdminParagraph")}
      </p>

      <DslBanner />

      <Tabs defaultValue="frameworks" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="frameworks">{t("tabs.frameworks")}</TabsTrigger>
          <TabsTrigger value="dataController">{t("tabs.dataController")}</TabsTrigger>
          <TabsTrigger value="permissions">{t("tabs.permissions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="mt-0">
          <FrameworksTab />
        </TabsContent>

        <TabsContent value="dataController" className="mt-0">
          <DataControllerTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-0">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

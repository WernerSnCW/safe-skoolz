import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PermissionsTab from "@/components/admin/PermissionsTab";
import FrameworksTab from "@/components/admin/FrameworksTab";
import DataControllerTab from "@/components/admin/DataControllerTab";
import DslBanner from "@/components/admin/DslBanner";

export default function AdminPage() {
  const { t } = useTranslation("admin");

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary/10 text-primary p-3 rounded-xl">
          <ShieldCheck size={28} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

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

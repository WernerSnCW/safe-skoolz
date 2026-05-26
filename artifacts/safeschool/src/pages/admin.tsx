import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PoliciesTab from "@/components/admin/PoliciesTab";
import PermissionsTab from "@/components/admin/PermissionsTab";
import FrameworksTab from "@/components/admin/FrameworksTab";

export default function AdminPage() {
  const { t } = useTranslation("admin");

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

      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="policies">{t("tabs.policies")}</TabsTrigger>
          <TabsTrigger value="permissions">{t("tabs.permissions")}</TabsTrigger>
          <TabsTrigger value="frameworks">{t("tabs.frameworks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-0">
          <PoliciesTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-0">
          <PermissionsTab />
        </TabsContent>

        <TabsContent value="frameworks" className="mt-0">
          <FrameworksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

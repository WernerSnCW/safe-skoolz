import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { ArrowLeft, GraduationCap, Download, CheckCircle2, Minus, Users } from "lucide-react";

const MODULE_IDS = [
  "loggingIncident",
  "assessingIncident",
  "managingPupilPins",
  "behaviourPoints",
  "respondingToMessages",
  "understandingAlerts",
  "managingProtocols",
  "sencoCaseload",
  "dashboardOverview",
];

const MODULE_LABEL_KEYS: Record<string, string> = {
  loggingIncident: "loggingAnIncident",
  assessingIncident: "assessingAnIncident",
  managingPupilPins: "managingPupilPins",
  behaviourPoints: "behaviourPoints",
  respondingToMessages: "respondingToMessages",
  understandingAlerts: "understandingAlerts",
  managingProtocols: "managingProtocols",
  sencoCaseload: "sencoCaseload",
  dashboardOverview: "dashboardOverview",
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  coordinator: "coordinator",
  head_teacher: "headTeacher",
  teacher: "teacher",
  head_of_year: "headOfYear",
  senco: "senco",
  support_staff: "supportStaff",
};

type StaffMember = {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  completions: { moduleId: string; completedAt: string }[];
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function TrainingStatusPage() {
  const { user } = useAuth();
  const { t } = useTranslation("training");
  const userRole = user?.role || "";

  const { data: staffData, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/training/staff-status"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
      const res = await fetch(`${apiBase}api/training/staff-status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch training status");
      return res.json();
    },
    enabled: ["coordinator", "head_teacher"].includes(userRole),
  });

  if (!["coordinator", "head_teacher"].includes(userRole)) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-bold">{t("accessDenied")}</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">{t("returnToDashboard")}</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8" />;
  }

  const staff = staffData || [];

  const moduleCompletionCounts: Record<string, number> = {};
  for (const m of MODULE_IDS) {
    moduleCompletionCounts[m] = staff.filter(s =>
      s.completions.some(c => c.moduleId === m)
    ).length;
  }

  const allCompleteCount = staff.filter(s =>
    MODULE_IDS.every(m => s.completions.some(c => c.moduleId === m))
  ).length;

  const handleExportCsv = () => {
    const headers = ["Name", "Role", ...MODULE_IDS.map(m => t(MODULE_LABEL_KEYS[m] || m))];
    const rows = staff.map(s => {
      const completionMap: Record<string, string> = {};
      for (const c of s.completions) completionMap[c.moduleId] = c.completedAt;
      return [
        `${s.firstName} ${s.lastName}`,
        t(ROLE_LABEL_KEYS[s.role] || s.role),
        ...MODULE_IDS.map(m => completionMap[m] ? new Date(completionMap[m]).toLocaleDateString("en-GB") : ""),
      ];
    });

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff-training-completion.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <GraduationCap size={28} className="text-primary" />
            {t("staffTrainingCompletion")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("completedAllModules", { completed: allCompleteCount, total: staff.length })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download size={14} className="mr-1.5" />
          {t("exportCsv")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MODULE_IDS.map(m => {
          const count = moduleCompletionCounts[m];
          const pct = staff.length > 0 ? Math.round((count / staff.length) * 100) : 0;
          return (
            <Card key={m} className="text-center">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-primary">{pct}%</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t(MODULE_LABEL_KEYS[m])}</p>
                <p className="text-xs text-muted-foreground">{count}/{staff.length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users size={18} className="text-primary" />
            {t("staffCompletionMatrix")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider sticky left-0 bg-muted/30 min-w-[180px]">{t("staffMember")}</th>
                  <th className="text-left px-3 py-3 font-bold text-xs uppercase tracking-wider min-w-[80px]">{t("role")}</th>
                  {MODULE_IDS.map(m => (
                    <th key={m} className="text-center px-2 py-3 font-bold text-xs uppercase tracking-wider min-w-[90px]">
                      <span className="block leading-tight">{t(MODULE_LABEL_KEYS[m])}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const completionMap: Record<string, string> = {};
                  for (const c of s.completions) completionMap[c.moduleId] = c.completedAt;
                  return (
                    <tr key={s.userId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold sticky left-0 bg-background">{s.firstName} {s.lastName}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{t(ROLE_LABEL_KEYS[s.role] || s.role)}</td>
                      {MODULE_IDS.map(m => (
                        <td key={m} className="text-center px-2 py-3">
                          {completionMap[m] ? (
                            <span className="inline-flex flex-col items-center">
                              <CheckCircle2 size={16} className="text-success" />
                              <span className="text-xs text-muted-foreground mt-0.5">{formatDate(completionMap[m])}</span>
                            </span>
                          ) : (
                            <Minus size={16} className="text-muted-foreground/40 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={MODULE_IDS.length + 2} className="text-center py-8 text-muted-foreground">{t("noStaffFound")}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="px-4 py-3 font-bold text-xs uppercase sticky left-0 bg-muted/20" colSpan={2}>{t("completionRate")}</td>
                  {MODULE_IDS.map(m => {
                    const pct = staff.length > 0 ? Math.round((moduleCompletionCounts[m] / staff.length) * 100) : 0;
                    return (
                      <td key={m} className="text-center px-2 py-3 font-bold text-sm">
                        {pct}%
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

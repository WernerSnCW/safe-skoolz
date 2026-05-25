import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetProtocol } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { formatDateTime, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Shield, FileText, AlertTriangle, Users, Calendar, CheckCircle, Download, Loader2 } from "lucide-react";

export default function ProtocolDetail() {
  const { t } = useTranslation("protocols");
  const [, params] = useRoute("/protocols/:id");
  const id = params?.id || "";
  const { user } = useAuth();
  const userRole = user?.role || "";
  const canExport = ["coordinator", "head_teacher", "senco"].includes(userRole);
  const [isExporting, setIsExporting] = useState(false);

  const { data: detail, isLoading } = useGetProtocol(id);

  const handleExportPdf = async () => {
    if (!detail) return;
    const prot = detail.protocol || detail;
    setIsExporting(true);
    try {
      const token = localStorage.getItem("safeschool_token");
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
      const res = await fetch(`${apiBase}api/protocols/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `protocol-${prot.referenceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8"></div>;

  if (!detail) return (
    <div className="p-8 text-center">
      <p className="text-destructive text-lg font-bold">{t("protocolNotFound")}</p>
      <Link href="/protocols">
        <Button variant="outline" className="mt-4">{t("backToProtocols")}</Button>
      </Link>
    </div>
  );

  // Local extended type: the API response wrapper hides full Protocol fields, and the spec lacks risk* fields (drift — see OVERNIGHT_LOG.md T02).
  type ProtocolFull = {
    [key: string]: any;
    riskLevel?: string | null;
    riskFactors?: string[] | null;
    protectiveFactors?: string[] | null;
  };
  const prot = ((detail as any).protocol || detail) as ProtocolFull;
  const rlStyle = prot.riskLevel ? {
    bg: prot.riskLevel === "low" ? "bg-green-100 dark:bg-green-950/30" :
        prot.riskLevel === "medium" ? "bg-amber-100 dark:bg-amber-950/30" :
        prot.riskLevel === "high" ? "bg-orange-100 dark:bg-orange-950/30" :
        prot.riskLevel === "critical" ? "bg-red-100 dark:bg-red-950/30" : "",
    text: prot.riskLevel === "low" ? "text-green-700 dark:text-green-400" :
          prot.riskLevel === "medium" ? "text-amber-700 dark:text-amber-400" :
          prot.riskLevel === "high" ? "text-orange-700 dark:text-orange-400" :
          prot.riskLevel === "critical" ? "text-red-700 dark:text-red-400" : "",
    label: t(prot.riskLevel),
  } : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/protocols">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold">{t("protocolRef", { ref: prot.referenceNumber })}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              prot.status === "open" ? "bg-primary text-white" :
              prot.status === "closed" ? "bg-muted text-muted-foreground" :
              "bg-warning text-warning-foreground"
            }`}>
              {prot.status?.replace("_", " ")}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t("openedOn", { date: formatDateTime(prot.openedAt) })}
          </p>
        </div>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="ml-auto shrink-0"
          >
            {isExporting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
            {isExporting ? t("common:exporting") : t("common:exportPdf")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">{t("protocolDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("common:type")}</p>
                <p className="font-semibold capitalize">{prot.protocolType?.replace(/_/g, " ")}</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("source")}</p>
                <p className="font-semibold capitalize">{prot.protocolSource?.replace(/_/g, " ") || t("common:notSpecified")}</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("common:victims")}</p>
                <p className="font-semibold">{prot.victimName || t("common:unknown")}</p>
              </div>
              <div className="bg-background border border-border p-4 rounded-xl">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("parentNotified")}</p>
                <p className="font-semibold">{prot.parentNotificationSent ? t("common:yes", "Yes") : t("common:notYet", "Not yet")}</p>
              </div>
            </div>

            {prot.genderBasedViolence && (
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <p className="font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {t("gbvProtocolActive")}
                </p>
              </div>
            )}

            {prot.context && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("context")}</h4>
                <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
                  {prot.context}
                </p>
              </div>
            )}

            {prot.resolutionNotes && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("resolutionNotes")}</h4>
                <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
                  {prot.resolutionNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">{t("common:status")}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {prot.externalReferralRequired && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t("externalReferralRequired")}</p>
                  {prot.externalReferralBody && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{prot.externalReferralBody}</p>
                  )}
                </div>
              )}
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("interviewsRequired")}</span>
                  <span className="font-bold">{prot.interviewsRequired ? t("common:yes", "Yes") : t("common:no", "No")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("parentNotified")}</span>
                  <span className="font-bold">{prot.parentNotificationSent ? t("common:yes", "Yes") : t("common:notYet", "Not yet")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {detail.linkedIncidents && detail.linkedIncidents.length > 0 && (
            <Card>
              <CardHeader className="border-b border-border/50 bg-muted/10">
                <CardTitle className="text-lg">{t("linkedIncidents")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {detail.linkedIncidents.map((inc: any) => (
                  <Link key={inc.id} href={`/incidents/${inc.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                      <FileText size={16} className="text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-bold">{inc.referenceNumber}</p>
                        <p className="text-xs text-muted-foreground capitalize">{inc.category}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {(rlStyle || (prot.riskFactors && prot.riskFactors.length > 0) || (prot.protectiveFactors && prot.protectiveFactors.length > 0) || prot.riskAssessment) && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">{t("riskAssessment")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {rlStyle && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${rlStyle.bg} ${rlStyle.text}`}>
                <Shield size={16} />
                {t("riskLevel", { level: rlStyle.label })}
              </div>
            )}

            {prot.riskFactors && prot.riskFactors.length > 0 && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">{t("riskFactors")}</h4>
                <div className="flex flex-wrap gap-2">
                  {prot.riskFactors.map((rf: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400">
                      <AlertTriangle size={12} />
                      {rf}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {prot.protectiveFactors && prot.protectiveFactors.length > 0 && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">{t("protectiveFactors")}</h4>
                <div className="flex flex-wrap gap-2">
                  {prot.protectiveFactors.map((pf: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                      <CheckCircle size={12} />
                      {pf}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {prot.riskAssessment && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("additionalRiskNotes")}</h4>
                <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
                  {prot.riskAssessment}
                </p>
              </div>
            )}

            {prot.protectiveMeasures && prot.protectiveMeasures.length > 0 && (
              <div>
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("protectiveMeasures")}</h4>
                <ul className="space-y-2">
                  {prot.protectiveMeasures.map((m: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-primary shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

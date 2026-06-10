import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetIncident, useUpdateIncidentStatus, useAssessIncident } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { formatDateTime, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, MapPin, Calendar, User, ShieldAlert, CheckCircle, Clock, AlertTriangle, Users, FileText, Eye, EyeOff, Save, ClipboardList, Plus, Trash2, Heart, Shield, Info, Download, Loader2 } from "lucide-react";

const STAFF_ROLES = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco", "support_staff"];

const EMOTIONAL_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  happy: { label: "Happy", emoji: "😊", color: "text-success" },
  okay: { label: "Okay", emoji: "🙂", color: "text-info" },
  sad: { label: "Sad", emoji: "😢", color: "text-info" },
  scared: { label: "Scared", emoji: "😨", color: "text-warning" },
  angry: { label: "Angry", emoji: "😠", color: "text-destructive" },
  confused: { label: "Confused", emoji: "😕", color: "text-cat-4" },
  worried: { label: "Worried", emoji: "😟", color: "text-warning" },
  hurt: { label: "Hurt", emoji: "💔", color: "text-destructive" },
};

export default function IncidentDetail() {
  const { t } = useTranslation("incidents");
  const [, params] = useRoute("/incidents/:id");
  const id = params?.id || "";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userRole = user?.role || "";
  const isStaff = STAFF_ROLES.includes(userRole);
  const canAssess = ["teacher", "head_of_year", "coordinator", "head_teacher", "senco"].includes(userRole);
  const canChangeStatus = ["coordinator", "head_teacher", "senco"].includes(userRole);
  
  const { data: inc, isLoading } = useGetIncident(id);
  const updateStatus = useUpdateIncidentStatus();
  const assessMutation = useAssessIncident();
  
  type WitnessEntry = { witnessId?: string | null; witnessName: string; statement: string; recordedAt: string; recordedBy?: string | null };
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessForm, setAssessForm] = useState({
    addedToFile: false,
    parentVisible: false,
    staffNotes: "",
    witnessStatements: [] as WitnessEntry[],
    parentSummary: "",
  });
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const canRequestDisclosure = ["coordinator", "head_teacher", "senco"].includes(userRole);
  const needsDisclosure = ["teacher", "head_of_year", "support_staff"].includes(userRole);
  const canExport = ["coordinator", "head_teacher", "senco", "teacher", "head_of_year"].includes(userRole);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!inc) return;
    setIsExporting(true);
    try {
      const token = localStorage.getItem("safeschool_token");
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
      const res = await fetch(`${apiBase}api/incidents/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-${inc.referenceNumber}.pdf`;
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

  const disclosureRequestMutation = useMutation({
    mutationFn: async ({ incidentId, subjectPupilId, requestedFromParentId, scope }: { incidentId: string; subjectPupilId: string; requestedFromParentId: string; scope?: string }) => {
      const token = localStorage.getItem("safeschool_token");
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
      const res = await fetch(`${apiBase}api/incidents/${incidentId}/disclosure-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subjectPupilId, requestedFromParentId, scope: scope || "summary_only" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to request disclosure");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
    },
  });

  const disclosureRespondMutation = useMutation({
    mutationFn: async ({ incidentId, permissionId, decision }: { incidentId: string; permissionId: string; decision: "approved" | "declined" }) => {
      const token = localStorage.getItem("safeschool_token");
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
      const res = await fetch(`${apiBase}api/incidents/${incidentId}/disclosure-respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissionId, decision }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to respond to disclosure request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await updateStatus.mutateAsync({
        id,
        data: { status: newStatus }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
    } finally {
      setIsUpdating(false);
    }
  };

  const openAssessmentPanel = () => {
    const i = inc as any;
    let existingStatements: WitnessEntry[] = [];
    if (Array.isArray(i?.witnessStatements)) {
      existingStatements = i.witnessStatements;
    } else if (typeof i?.witnessStatements === "string" && i.witnessStatements) {
      existingStatements = [{ witnessName: "Unknown", statement: i.witnessStatements, recordedAt: new Date().toISOString() }];
    }
    setAssessForm({
      addedToFile: i?.addedToFile || false,
      parentVisible: i?.parentVisible || false,
      staffNotes: i?.staffNotes || "",
      witnessStatements: existingStatements,
      parentSummary: i?.parentSummary || "",
    });
    setAssessmentSaved(false);
    setShowAssessment(true);
  };

  const handleSaveAssessment = async () => {
    try {
      setIsUpdating(true);
      await assessMutation.mutateAsync({
        id,
        // UI collects structured witness statements; server accepts them as JSON. Spec types this field as string (drift — see OVERNIGHT_LOG.md T02).
        data: assessForm as unknown as Parameters<typeof assessMutation.mutateAsync>[0]["data"],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
      setAssessmentSaved(true);
      setTimeout(() => setAssessmentSaved(false), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8"></div>;
  if (!inc) return <div className="p-8 text-center text-destructive">{t("incidentNotFound")}</div>;

  const unknownDescs: any[] = (inc as any).unknownPersonDescriptions || [];
  const incAny = inc as any;

  if (userRole === "parent") {
    return <ParentIncidentReport inc={inc} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold">{t("incidentRef", { ref: inc.referenceNumber })}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              inc.status === 'open' ? 'bg-warning/20 text-warning' : 
              inc.status === 'under_review' ? 'bg-primary/20 text-primary' : 
              'bg-muted text-muted-foreground'
            }`}>
              {inc.status.replace('_', ' ')}
            </span>
            {incAny.addedToFile && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                {t("common:onFile")}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {t("common:reportedOn", { date: formatDateTime(inc.createdAt) })}
            {incAny.assessedByName && (
              <span className="ml-2 text-xs">
                — {t("common:assessedByOn", { name: incAny.assessedByName, date: formatDate(incAny.assessedAt) })}
              </span>
            )}
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

      {needsDisclosure && incAny.disclosureStatus !== "approved" && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Shield size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {incAny.disclosureStatus === "pending"
                ? t("disclosurePermPending")
                : incAny.disclosureStatus === "declined"
                  ? t("parentDeclinedDisclosure")
                  : t("disclosureNotRequested")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {incAny.disclosureStatus === "pending"
                ? t("disclosurePendingDetail")
                : incAny.disclosureStatus === "declined"
                  ? t("parentDeclinedDetail")
                  : t("disclosureNotRequestedDetail")}
            </p>
          </div>
        </div>
      )}

      {userRole === "parent" && incAny.disclosureStatus === "pending" && incAny.disclosurePermissions?.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                {t("staffDisclosureRequest")}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 mb-3">
                {t("staffDisclosureDetail")}
              </p>
              {incAny.disclosurePermissions
                .filter((p: any) => p.status === "pending")
                .map((p: any) => (
                  <div key={p.id} className="flex gap-2 mb-2">
                    <Button
                      size="sm"
                      onClick={() => disclosureRespondMutation.mutate({ incidentId: id, permissionId: p.id, decision: "approved" })}
                      disabled={disclosureRespondMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle size={14} className="mr-1" /> {t("common:approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disclosureRespondMutation.mutate({ incidentId: id, permissionId: p.id, decision: "declined" })}
                      disabled={disclosureRespondMutation.isPending}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <EyeOff size={14} className="mr-1" /> {t("common:decline")}
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {userRole === "parent" && incAny.disclosureStatus === "approved" && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{t("approvedDisclosure")}</p>
        </div>
      )}

      {userRole === "parent" && incAny.disclosureStatus === "declined" && (
        <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center gap-2">
          <EyeOff size={16} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{t("declinedDisclosure")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg">{t("common:details")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <ShieldAlert className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("common:category")}</p>
                  <p className="font-semibold capitalize">{inc.category.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <Calendar className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("common:dateOfIncident")}</p>
                  <p className="font-semibold">{formatDate(inc.incidentDate)}</p>
                </div>
              </div>
              <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3 flex-1 min-w-[200px]">
                <MapPin className="text-primary" size={20}/>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("common:location")}</p>
                  <p className="font-semibold capitalize">{inc.location || t("common:notSpecified")}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("common:description")}</h4>
              <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
                {inc.description || t("common:noDescriptionProvided")}
              </p>
            </div>

            {isStaff && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border p-4 rounded-xl">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("common:reporter")}</h4>
                  <div className="flex items-center gap-2 font-semibold">
                    <User size={16} className="text-muted-foreground"/>
                    {inc.anonymous ? t("common:anonymous") : ((inc as any).reporterName || t("common:unknown"))}
                    <span className="text-xs font-normal text-muted-foreground">({(inc as any).reporterRole})</span>
                  </div>
                </div>
                <div className="border border-border p-4 rounded-xl">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("common:victims")}</h4>
                  <div className="font-semibold">
                    {inc.victimNames && inc.victimNames.length > 0 ? inc.victimNames.join(', ') : t("common:notSpecified")}
                  </div>
                </div>
              </div>
            )}

            {userRole === "parent" && inc.victimNames && inc.victimNames.length > 0 && (
              <div className="border border-border p-4 rounded-xl">
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("common:involved")}</h4>
                <div className="font-semibold">{inc.victimNames.join(', ')}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canChangeStatus && (
            <Card>
              <CardHeader className="border-b border-border/50 bg-muted/10">
                <CardTitle className="text-lg">{t("common:actions")}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant={inc.status === 'open' ? 'default' : 'outline'}
                  disabled={isUpdating || inc.status === 'open'}
                  onClick={() => handleStatusChange('open')}
                >
                  <AlertTriangle className="mr-2" size={18}/> {t("markAsOpen")}
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant={inc.status === 'under_review' ? 'default' : 'outline'}
                  disabled={isUpdating || inc.status === 'under_review'}
                  onClick={() => handleStatusChange('under_review')}
                >
                  <Clock className="mr-2" size={18}/> {t("markUnderReview")}
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant={inc.status === 'closed' ? 'secondary' : 'outline'}
                  disabled={isUpdating || inc.status === 'closed'}
                  onClick={() => handleStatusChange('closed')}
                >
                  <CheckCircle className="mr-2" size={18}/> {t("closeIncident")}
                </Button>

                <hr className="my-4 border-border" />
                
                {!inc.protocolId && (
                  <Link href={`/protocols/new?incidentId=${inc.id}`}>
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                      {t("openFormalProtocol")}
                    </Button>
                  </Link>
                )}
                {inc.protocolId && (
                  <Link href={`/protocols/${inc.protocolId}`}>
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
                      {t("viewLinkedProtocol")}
                    </Button>
                  </Link>
                )}

                {canRequestDisclosure && incAny.disclosureStatus === "not_requested" && (
                  <>
                    <hr className="my-4 border-border" />
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        const victimIds = incAny.victimIds || [];
                        if (victimIds.length === 0) return;
                        const subjectPupilId = victimIds[0];
                        const token = localStorage.getItem("safeschool_token");
                        const baseUrl = import.meta.env.BASE_URL || "/";
                        const apiBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
                        fetch(`${apiBase}api/my-pupils`, {
                          headers: { Authorization: `Bearer ${token}` },
                        }).then(() => {
                          disclosureRequestMutation.mutate({
                            incidentId: id,
                            subjectPupilId,
                            requestedFromParentId: incAny._parentId || "",
                            scope: "summary_only",
                          });
                        });
                      }}
                      disabled={disclosureRequestMutation.isPending}
                    >
                      <Eye className="mr-2" size={18} /> {t("requestDisclosurePerm")}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("requestDisclosureDetail")}
                    </p>
                  </>
                )}
                {canRequestDisclosure && incAny.disclosureStatus === "pending" && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 mt-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock size={12} /> {t("disclosureRequested")}
                    </p>
                  </div>
                )}
                {canRequestDisclosure && incAny.disclosureStatus === "approved" && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 mt-2 space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle size={12} /> {t("parentApprovedDisclosure")}
                    </p>
                    {incAny.disclosurePermissions?.filter((p: any) => p.status === "approved").map((p: any) => (
                      <div key={p.id} className="text-xs text-green-700 dark:text-green-400 pl-5">
                        {p.acknowledgedAt ? (
                          <>
                            <p className="flex items-center gap-1.5">
                              <CheckCircle size={10} /> {t("acknowledgedByParent", { date: formatDate(p.acknowledgedAt) })}
                            </p>
                            {p.parentResponse && (
                              <p className="mt-1 pl-4 text-green-600 dark:text-green-500 italic">
                                "{p.parentResponse}"
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <Clock size={10} /> {t("awaitingAcknowledgement")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {canRequestDisclosure && incAny.disclosureStatus === "declined" && (
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 mt-2">
                    <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <EyeOff size={12} /> {t("parentDeclinedDisclosureShort")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canAssess && (
            <Card className="border-primary/30">
              <CardHeader className="border-b border-border/50 bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList size={18} /> {t("teacherAssessment")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!showAssessment ? (
                  <Button onClick={openAssessmentPanel} className="w-full" variant="outline">
                    <FileText className="mr-2" size={16} />
                    {incAny.assessedAt ? t("editAssessment") : t("startAssessment")}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessForm.addedToFile}
                          onChange={(e) => setAssessForm(f => ({ ...f, addedToFile: e.target.checked }))}
                          className="rounded border-border"
                        />
                        <FileText size={14} />
                        {t("addedToPupilFile")}
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessForm.parentVisible}
                          onChange={(e) => setAssessForm(f => ({ ...f, parentVisible: e.target.checked }))}
                          className="rounded border-border"
                        />
                        {assessForm.parentVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        {t("shareWithParents")}
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {t("staffNotes")}
                      </label>
                      <textarea
                        value={assessForm.staffNotes}
                        onChange={(e) => setAssessForm(f => ({ ...f, staffNotes: e.target.value }))}
                        rows={3}
                        placeholder="Internal notes for staff only..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                        {t("witnessStatements")}
                      </label>
                      {assessForm.witnessStatements.map((ws, idx) => (
                        <div key={idx} className="mb-3 p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <User size={14} className="text-muted-foreground shrink-0" />
                              <input
                                type="text"
                                value={ws.witnessName}
                                onChange={(e) => {
                                  const updated = [...assessForm.witnessStatements];
                                  updated[idx] = { ...updated[idx], witnessName: e.target.value };
                                  setAssessForm(f => ({ ...f, witnessStatements: updated }));
                                }}
                                placeholder={t("witnessNamePlaceholder")}
                                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = assessForm.witnessStatements.filter((_, i) => i !== idx);
                                setAssessForm(f => ({ ...f, witnessStatements: updated }));
                              }}
                              className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <textarea
                            value={ws.statement}
                            onChange={(e) => {
                              const updated = [...assessForm.witnessStatements];
                              updated[idx] = { ...updated[idx], statement: e.target.value };
                              setAssessForm(f => ({ ...f, witnessStatements: updated }));
                            }}
                            rows={2}
                            placeholder={t("witnessStatementPlaceholder")}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <p className="text-xs text-muted-foreground">
                            <Clock size={10} className="inline mr-1" />
                            {ws.recordedAt ? t("recorded", { date: formatDateTime(ws.recordedAt) }) : t("notYetSaved")}
                          </p>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setAssessForm(f => ({
                            ...f,
                            witnessStatements: [
                              ...f.witnessStatements,
                              { witnessName: "", statement: "", recordedAt: new Date().toISOString(), recordedBy: user?.id || null },
                            ],
                          }));
                        }}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus size={14} />
                        {t("addWitnessStatement")}
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {t("summaryForParents")}
                      </label>
                      <textarea
                        value={assessForm.parentSummary}
                        onChange={(e) => setAssessForm(f => ({ ...f, parentSummary: e.target.value }))}
                        rows={3}
                        placeholder={t("parentSummaryPlaceholder")}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("parentSummaryNote")}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveAssessment} 
                        disabled={isUpdating}
                        className="flex-1"
                      >
                        <Save className="mr-2" size={14} />
                        {isUpdating ? t("common:saving") : t("saveAssessment")}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowAssessment(false)}
                        className="text-muted-foreground"
                      >
                        {t("common:cancel")}
                      </Button>
                    </div>

                    {assessmentSaved && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium text-center">
                        {t("assessmentSaved")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <h4 className="font-bold text-destructive flex items-center gap-2">
                <ShieldAlert size={18}/> {t("escalationTier", { tier: inc.escalationTier })}
              </h4>
              <p className="text-sm text-destructive/80 mt-2">
                {inc.escalationTier === 3 
                  ? t("tier3Desc") 
                  : inc.escalationTier === 2 
                  ? t("tier2Desc")
                  : t("tier1Desc")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {isStaff && incAny.staffNotes && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText size={18} /> {t("staffNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm">{incAny.staffNotes}</p>
          </CardContent>
        </Card>
      )}

      {isStaff && incAny.witnessStatements && (Array.isArray(incAny.witnessStatements) ? incAny.witnessStatements.length > 0 : !!incAny.witnessStatements) && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} /> {t("witnessStatements")} ({Array.isArray(incAny.witnessStatements) ? incAny.witnessStatements.length : 1})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {Array.isArray(incAny.witnessStatements) ? (
              incAny.witnessStatements.map((ws: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      <User size={14} className="text-primary" />
                      {ws.witnessName || t("unknownWitness")}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} />
                      {ws.recordedAt ? formatDateTime(ws.recordedAt) : t("noTimestamp")}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm pl-5">{ws.statement}</p>
                </div>
              ))
            ) : (
              <p className="whitespace-pre-wrap text-sm">{incAny.witnessStatements}</p>
            )}
          </CardContent>
        </Card>
      )}

      {isStaff && incAny.parentSummary && !showAssessment && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              {incAny.parentVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              {t("parentSummary")}
              {incAny.parentVisible && (
                <span className="text-xs font-normal text-green-600 dark:text-green-400">({t("sharedWithParents")})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm">{incAny.parentSummary}</p>
          </CardContent>
        </Card>
      )}

      {unknownDescs.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} />
              {t("personDescriptions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unknownDescs.map((desc: any, i: number) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-muted-foreground">{t("common:person", { number: i + 1 })}</p>
                    {desc.roleInIncident && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        desc.roleInIncident === "victim" ? "bg-info/15 text-info" :
                        desc.roleInIncident === "perpetrator" ? "bg-destructive/15 text-destructive" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {desc.roleInIncident === "perpetrator" ? "involved" : desc.roleInIncident}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {desc.gender && (
                      <div>
                        <span className="text-muted-foreground text-xs block">{t("common:gender")}</span>
                        <span className="font-medium capitalize">{desc.gender}</span>
                      </div>
                    )}
                    {desc.staffOrPupil && (
                      <div>
                        <span className="text-muted-foreground text-xs block">{t("common:type")}</span>
                        <span className="font-medium capitalize">{desc.staffOrPupil}</span>
                      </div>
                    )}
                    {desc.ageRelation && (
                      <div>
                        <span className="text-muted-foreground text-xs block">{t("common:age")}</span>
                        <span className="font-medium capitalize">{desc.ageRelation}</span>
                      </div>
                    )}
                    {desc.yearGroup && (
                      <div>
                        <span className="text-muted-foreground text-xs block">{t("common:yearGroup")}</span>
                        <span className="font-medium">{desc.yearGroup}</span>
                      </div>
                    )}
                    {desc.howMany > 1 && (
                      <div>
                        <span className="text-muted-foreground text-xs block">{t("common:howMany")}</span>
                        <span className="font-medium">{desc.howMany}</span>
                      </div>
                    )}
                  </div>
                  {desc.physicalDescription && (
                    <div>
                      <span className="text-muted-foreground text-xs block">{t("common:physicalDescription")}</span>
                      <p className="text-sm font-medium mt-0.5">{desc.physicalDescription}</p>
                    </div>
                  )}
                  {desc.friendsWith && (
                    <div>
                      <span className="text-muted-foreground text-xs block">{t("common:friendsWith")}</span>
                      <p className="text-sm font-medium mt-0.5">{desc.friendsWith}</p>
                    </div>
                  )}
                  {desc.whereSeenThem && (
                    <div>
                      <span className="text-muted-foreground text-xs block">{t("common:whereSeen")}</span>
                      <p className="text-sm font-medium mt-0.5">{desc.whereSeenThem}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ParentIncidentReport({ inc }: { inc: any }) {
  const { t } = useTranslation("incidents");
  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    submitted: { label: t("common:submitted"), color: "text-info", bg: "bg-info/10 border-info/30", icon: FileText },
    open: { label: t("beingLookedInto"), color: "text-warning", bg: "bg-warning/10 border-warning/30", icon: AlertTriangle },
    under_review: { label: t("common:underReview"), color: "text-primary", bg: "bg-primary/5 border-primary/20", icon: Clock },
    investigating: { label: t("beingInvestigated"), color: "text-cat-4", bg: "bg-cat-4/10 border-cat-4/30", icon: Shield },
    escalated: { label: t("escalatedExtraSupport"), color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: ShieldAlert },
    resolved: { label: t("common:resolved"), color: "text-success", bg: "bg-success/10 border-success/30", icon: CheckCircle },
    closed: { label: t("common:closed"), color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: CheckCircle },
  };
  const status = statusConfig[inc.status] || statusConfig.open;
  const StatusIcon = status.icon;
  const emotional = inc.emotionalState ? EMOTIONAL_LABELS[inc.emotionalState] : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold">{t("incidentReport")}</h1>
          <p className="text-sm text-muted-foreground">{t("reference", { ref: inc.referenceNumber })}</p>
        </div>
      </div>

      <Card className={`border ${status.bg}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${status.bg}`}>
              <StatusIcon size={22} className={status.color} />
            </div>
            <div>
              <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
              <p className="text-sm text-muted-foreground">
                {inc.status === "closed" || inc.status === "resolved"
                  ? t("incidentClosedMsg")
                  : t("schoolAwareMsg")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info size={18} /> {t("incidentDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3">
              <ShieldAlert className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("common:type")}</p>
                <p className="font-semibold capitalize">{inc.category.split(",").map((c: string) => c.trim()).join(", ")}</p>
              </div>
            </div>
            <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3">
              <Calendar className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("when")}</p>
                <p className="font-semibold">
                  {formatDate(inc.incidentDate)}
                  {inc.incidentTime && <span className="text-muted-foreground font-normal"> at {inc.incidentTime}</span>}
                </p>
              </div>
            </div>
            <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3">
              <MapPin className="text-primary shrink-0" size={20} />
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t("common:where")}</p>
                <p className="font-semibold capitalize">{inc.location || t("common:notSpecified")}</p>
              </div>
            </div>
          </div>

          {inc.victimNames && inc.victimNames.length > 0 && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-4 rounded-xl">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("yourChild")}</p>
              <p className="font-semibold">{inc.victimNames.join(", ")}</p>
            </div>
          )}

          {inc.perpetratorNames && inc.perpetratorNames.filter((n: string) => n !== "Another pupil").length === 0 && inc.perpetratorNames.length > 0 && (
            <div className="bg-muted/30 p-4 rounded-xl">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t("otherPeopleInvolved")}</p>
              <p className="text-sm text-muted-foreground">{t("otherPupilsConfidential")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={18} /> {t("whatHappened")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="bg-muted/30 p-4 rounded-xl text-foreground leading-relaxed whitespace-pre-wrap">
            {inc.description || t("noDescriptionReview")}
          </p>

          {(inc.happeningToMe || inc.happeningToSomeoneElse || inc.iSawIt) && (
            <div className="flex flex-wrap gap-2">
              {inc.happeningToMe && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                  {t("happenedToYourChild")}
                </span>
              )}
              {inc.happeningToSomeoneElse && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
                  {t("happenedToSomeoneElse")}
                </span>
              )}
              {inc.iSawIt && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  {t("witnessedByChild")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {emotional && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart size={18} /> {t("howYourChildFelt")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emotional.emoji}</span>
              <div>
                <p className={`font-bold text-lg ${emotional.color}`}>{emotional.label}</p>
                {inc.emotionalFreetext && (
                  <p className="text-sm text-muted-foreground mt-1">"{inc.emotionalFreetext}"</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield size={18} /> {t("schoolResponse")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inc.childrenSeparated !== undefined && inc.childrenSeparated !== null && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className={inc.childrenSeparated ? "text-green-600" : "text-muted-foreground"} />
                <span>{inc.childrenSeparated ? t("childrenWereSeparated") : t("childrenNotSeparated")}</span>
              </div>
            )}
            {inc.immediateActionTaken && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600" />
                <span>{t("immediateActionTaken")}</span>
              </div>
            )}
            {inc.addedToFile && (
              <div className="flex items-center gap-2 text-sm">
                <FileText size={16} className="text-blue-600" />
                <span>{t("addedToChildFile")}</span>
              </div>
            )}
          </div>

          {inc.assessedByName && (
            <div className="bg-muted/30 p-4 rounded-xl">
              <p className="text-sm">
                {t("reviewedByStaff", { name: inc.assessedByName })}
                {inc.assessedAt && <span className="text-muted-foreground"> on {formatDate(inc.assessedAt)}</span>}
              </p>
            </div>
          )}

          {!inc.assessedByName && inc.status !== "closed" && inc.status !== "resolved" && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-4 rounded-xl">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {t("stillBeingReviewed")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Need to know more?</p>
              <p>If you have concerns or questions about this incident, please contact the school's safeguarding coordinator directly. Other children's names are kept confidential to protect everyone involved.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center pb-4">
        <p className="text-xs text-muted-foreground">
          Report filed: {formatDateTime(inc.createdAt)}
          {inc.updatedAt && inc.updatedAt !== inc.createdAt && (
            <span> · Last updated: {formatDateTime(inc.updatedAt)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetPtaDashboard,
  useListPtaMessages,
  useSendPtaMessage,
  useGetPtaPolicy,
  useAcknowledgePtaPolicy,
  useFlagPtaPolicy,
  useGetLatestPtaReport,
  useGetPtaCodesign,
  useSubmitPtaCodesignResponse,
  useGetPtaResources,
  useSubmitPtaConcern,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui-polished";
import {
  BarChart3, TrendingUp, Shield, MessageCircle, FileText, BookOpen,
  Send, AlertTriangle, CheckCircle2, Flag, ChevronRight, Download,
  Users, Activity, Lightbulb, ArrowUpDown, Heart
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const TAB_KEYS = ["dashboard", "messages", "policy", "report", "codesign", "resources"] as const;
const TAB_ICONS = {
  dashboard: BarChart3,
  messages: MessageCircle,
  policy: Shield,
  report: FileText,
  codesign: Lightbulb,
  resources: BookOpen,
} as const;

type TabId = typeof TAB_KEYS[number];

const CATEGORY_COLORS: Record<string, string> = {
  physical: "#ef4444",
  verbal: "#f97316",
  psychological: "#eab308",
  sexual: "#dc2626",
  relational: "#8b5cf6",
  coercive: "#6366f1",
  property: "#0ea5e9",
  online: "#14b8a6",
};

const LEVEL_COLORS: Record<string, string> = {
  "Good Standing": "#22c55e",
  "Warning": "#eab308",
  "Formal Warning": "#f97316",
  "Suspension Risk": "#ef4444",
  "Suspended": "#dc2626",
  "Term Exclusion": "#991b1b",
  "Full Exclusion": "#450a0a",
};

const CONCERN_CATEGORY_KEYS = ["policy", "incident_pattern", "communication", "resources", "other"] as const;

export default function PtaPortal() {
  const { t } = useTranslation("pta");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const TAB_LABELS: Record<TabId, string> = {
    dashboard: t("ptaDashboard"),
    messages: t("coordinatorChannel"),
    policy: t("policy"),
    report: t("annualReport"),
    codesign: t("coDesign"),
    resources: t("resources"),
  };

  if (!user || user.role !== "pta") {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto mb-4 text-muted-foreground" size={48} />
        <h2 className="text-xl font-bold">{t("accessRestricted")}</h2>
        <p className="text-muted-foreground mt-2">{t("ptaOnlyAccess")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className="text-primary" />
          {t("ptaPortal")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("anonymisedOverview")}
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="PTA portal sections">
        {TAB_KEYS.map((tabId) => {
          const Icon = TAB_ICONS[tabId];
          return (
          <button
            key={tabId}
            role="tab"
            aria-selected={activeTab === tabId}
            aria-controls={`tabpanel-pta-${tabId}`}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tabId
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {TAB_LABELS[tabId]}
          </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "dashboard" && <PtaDashboardTab />}
        {activeTab === "messages" && <PtaMessagesTab />}
        {activeTab === "policy" && <PtaPolicyTab />}
        {activeTab === "report" && <PtaReportTab />}
        {activeTab === "codesign" && <PtaCodesignTab />}
        {activeTab === "resources" && <PtaResourcesTab />}
      </motion.div>
    </div>
  );
}

function PtaDashboardTab() {
  const { t } = useTranslation("pta");
  const { data, isLoading } = useGetPtaDashboard();
  const { data: moodData } = useQuery({
    queryKey: ["/api/pta/mood-trends"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/pta/mood-trends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { weeks: [] };
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!data) return <p className="text-muted-foreground p-4">{t("noDataAvailable")}</p>;

  const trend = data.incidentsThisTerm - data.incidentsLastTerm;
  const trendPct = data.incidentsLastTerm > 0
    ? Math.round((trend / data.incidentsLastTerm) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t("incidentsThisTerm")}
          value={data.incidentsThisTerm ?? 0}
          subtitle={`${trend >= 0 ? "+" : ""}${trendPct}% ${t("vsLastTerm")}`}
          icon={AlertTriangle}
          color={trend > 0 ? "text-amber-600" : "text-green-600"}
        />
        <KpiCard
          title={t("openProtocols")}
          value={data.protocols.open ?? 0}
          subtitle={`${data.protocols.closedThisTerm ?? 0} ${t("closedThisTerm")}`}
          icon={Shield}
          color="text-blue-600"
        />
        <KpiCard
          title={t("amberAlerts")}
          value={data.alerts.amber ?? 0}
          subtitle={`${data.alerts.resolvedThisTerm ?? 0} ${t("resolvedThisTerm")}`}
          icon={Activity}
          color="text-amber-600"
        />
        <KpiCard
          title={t("redAlerts")}
          value={data.alerts.red ?? 0}
          subtitle={t("immediateResponse")}
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 size={16} /> {t("incidentsByCategory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.categoryBreakdown.map((entry: any, i: number) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noIncidentsThisTerm")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={16} /> {t("monthlyTrend")} ({t("rolling12Months")})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noTrendData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowUpDown size={16} /> {t("behaviourLevelDist")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t("behaviourLevelDesc")}
          </p>
          {data.behaviourDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.behaviourDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="level" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.behaviourDistribution.map((entry: any, i: number) => (
                    <Cell key={i} fill={LEVEL_COLORS[entry.level] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noBehaviourData")}</p>
          )}
        </CardContent>
      </Card>

      {moodData && moodData.weeks && moodData.weeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart size={16} className="text-pink-500" /> {t("pupilWellbeingTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {t("moodTrendDesc")}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moodData.weeks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="weekStart"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)} / 5`, t("avgMood")]}
                  labelFormatter={(label: string) => {
                    const d = new Date(label);
                    return `${t("weekOf")} ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
                  }}
                />
                <Line type="monotone" dataKey="avgMood" stroke="#ec4899" strokeWidth={2} dot={{ r: 4, fill: "#ec4899" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Shield size={14} />
          {t("allDataAnonymisedFull")}
        </p>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: number; subtitle: string; icon: any; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PtaMessagesTab() {
  const { t } = useTranslation("pta");
  const { user } = useAuth();
  const { data, refetch } = useListPtaMessages();
  const sendMessage = useSendPtaMessage();
  const [body, setBody] = useState("");
  const [showConcernForm, setShowConcernForm] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) return;
    await sendMessage.mutateAsync({ data: { body: body.trim() } });
    setBody("");
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle size={16} /> {t("ptaCoordinatorChannel")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {data?.data && data.data.length > 0 ? (
              [...data.data].reverse().map((msg: any) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl ${
                    msg.senderRole === "pta"
                      ? "bg-primary/10 ml-8"
                      : "bg-muted/50 mr-8"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold">
                      {msg.senderFirstName} {msg.senderLastName}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {msg.senderRole === "pta" ? "PTA" : "Coordinator"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm">{msg.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noMessagesStartConversation")}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("typeMessageCoordinator")}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button onClick={handleSend} disabled={!body.trim() || sendMessage.isPending} size="sm">
              <Send size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag size={16} /> {t("submitFormalConcern")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConcernForm(!showConcernForm)}
            >
              {showConcernForm ? t("common:cancel") : t("newConcern")}
            </Button>
          </div>
        </CardHeader>
        {showConcernForm && (
          <CardContent>
            <ConcernForm onSubmitted={() => { setShowConcernForm(false); }} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ConcernForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { t } = useTranslation("pta");
  const submitConcern = useSubmitPtaConcern();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject || !body) return;
    await submitConcern.mutateAsync({ data: { category, subject, body } });
    onSubmitted();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">{t("common:category")}</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          required
        >
          <option value="">{t("selectCategory")}</option>
          {CONCERN_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>{t(`concernCategory_${key}`)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("subject")}</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("briefDescription")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">{t("common:details")}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("fullDetails")}
          className="w-full h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          required
        />
      </div>
      <Button type="submit" disabled={submitConcern.isPending}>
        {submitConcern.isPending ? t("submitting") : t("submitConcern")}
      </Button>
    </form>
  );
}

function PtaPolicyTab() {
  const { t } = useTranslation("pta");
  const { data, isLoading, refetch } = useGetPtaPolicy();
  const acknowledgeMutation = useAcknowledgePtaPolicy();
  const flagMutation = useFlagPtaPolicy();
  const [flagComment, setFlagComment] = useState("");
  const [showFlagForm, setShowFlagForm] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!data) return null;

  const policy = data.currentPolicy;
  const acks = data.acknowledgements || [];
  if (!policy) return null;

  const handleAcknowledge = async () => {
    await acknowledgeMutation.mutateAsync({
      data: { policyVersion: policy.version ?? "" }
    });
    refetch();
  };

  const handleFlag = async () => {
    if (!flagComment.trim()) return;
    await flagMutation.mutateAsync({
      data: { policyVersion: policy.version ?? "", comment: flagComment.trim() }
    });
    setFlagComment("");
    setShowFlagForm(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} /> {policy.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Version: {policy.version} | Framework: {policy.framework} | Last updated: {policy.lastUpdated}
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(policy.sections ?? []).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleAcknowledge} disabled={acknowledgeMutation.isPending}>
              <CheckCircle2 size={16} className="mr-2" />
              {acknowledgeMutation.isPending ? t("recording") : t("acknowledgePolicy")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFlagForm(!showFlagForm)}
            >
              <Flag size={16} className="mr-2" />
              {t("flagDisagreement")}
            </Button>
          </div>

          {showFlagForm && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium mb-2">{t("raiseDisagreement")}</p>
              <textarea
                value={flagComment}
                onChange={(e) => setFlagComment(e.target.value)}
                placeholder={t("explainDisagreement")}
                className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none mb-2"
              />
              <Button onClick={handleFlag} variant="destructive" size="sm" disabled={flagMutation.isPending || !flagComment.trim()}>
                {t("submitFormalDisagreement")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("acknowledgementTrail")}</CardTitle>
        </CardHeader>
        <CardContent>
          {acks.length > 0 ? (
            <div className="space-y-2">
              {acks.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  {a.actionType === "acknowledge" ? (
                    <CheckCircle2 size={16} className="text-green-600" />
                  ) : (
                    <Flag size={16} className="text-amber-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {a.userFirstName} {a.userLastName} — {a.actionType === "acknowledge" ? t("acknowledged") : t("flaggedDisagreement")}
                    </p>
                    {a.comment && <p className="text-xs text-muted-foreground">{a.comment}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAcknowledgements")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PtaReportTab() {
  const { t } = useTranslation("pta");
  const { data, isLoading } = useGetLatestPtaReport();

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const report = data?.report;

  if (!report) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h3 className="text-lg font-bold">{t("noAnnualReport")}</h3>
          <p className="text-muted-foreground mt-2">
            {t("noAnnualReportDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rd = report.reportData as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} /> {t("annualSafeguardingReport")} — {report.academicYear}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-medium text-green-600">{report.status}</span>
            {report.approvedAt && ` | Approved: ${new Date(report.approvedAt).toLocaleDateString()}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">{t("totalIncidents")}</p>
              <p className="text-3xl font-bold">{rd.totalIncidents}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">{t("incidentsByCategory")}</p>
              {rd.incidentsByCategory?.map((c: any) => (
                <div key={c.category} className="flex justify-between text-sm py-0.5">
                  <span className="capitalize">{c.category}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          {rd.protocolsByStatus && rd.protocolsByStatus.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">{t("protocolsByStatus")}</p>
              {rd.protocolsByStatus.map((p: any) => (
                <div key={p.status} className="flex justify-between text-sm py-0.5">
                  <span className="capitalize">{p.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{p.count}</span>
                </div>
              ))}
            </div>
          )}

          {rd.alertsSummary && rd.alertsSummary.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">{t("patternAlertsSummary")}</p>
              {rd.alertsSummary.map((a: any, i: number) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span className="capitalize">{a.level} — {a.status}</span>
                  <span className="font-medium">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PtaCodesignTab() {
  const { t } = useTranslation("pta");
  const { data, isLoading, refetch } = useGetPtaCodesign();
  const submitResponse = useSubmitPtaCodesignResponse();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!data) return null;

  const handleSubmit = async (questionKey: string) => {
    const response = answers[questionKey];
    if (!response?.trim()) return;
    await submitResponse.mutateAsync({ data: { questionKey, response: response.trim() } });
    setAnswers(prev => ({ ...prev, [questionKey]: "" }));
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={18} /> {t("coDesignWorkspace")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("coDesignDesc")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.questions?.map((q: any) => {
            const existing = (data.responses || []).filter((r: any) => r.questionKey === q.key);
            return (
              <div key={q.key} className="p-4 rounded-xl bg-muted/30 border">
                <p className="text-sm font-medium mb-2">{q.label}</p>
                {existing.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {existing.map((r: any) => (
                      <div key={r.id} className="text-sm p-2 rounded bg-background border">
                        <span className="font-medium">{r.submitterFirstName} {r.submitterLastName}:</span>{" "}
                        {r.response}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({new Date(r.createdAt).toLocaleDateString()})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={answers[q.key] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder={t("enterPreference")}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(q.key)}
                    disabled={!answers[q.key]?.trim() || submitResponse.isPending}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function PtaResourcesTab() {
  const { t } = useTranslation("pta");
  const { data, isLoading } = useGetPtaResources();

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const categoryIcons: Record<string, any> = {
    legal: Shield,
    protocol: FileText,
    template: Download,
    governance: CheckCircle2,
  };

  const categoryLabels: Record<string, string> = {
    legal: t("legalFramework"),
    protocol: t("protocolGuides"),
    template: t("templateLetters"),
    governance: t("governance"),
  };

  const grouped = (data?.resources || []).reduce((acc: any, r: any) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, resources]) => {
        const Icon = categoryIcons[cat] || BookOpen;
        return (
          <div key={cat}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <Icon size={16} /> {categoryLabels[cat] || cat}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {(resources as any[]).map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                          {r.type}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

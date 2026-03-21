import { useState } from "react";
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
  Users, Activity, Lightbulb, ArrowUpDown
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "messages", label: "Coordinator Channel", icon: MessageCircle },
  { id: "policy", label: "Policy", icon: Shield },
  { id: "report", label: "Annual Report", icon: FileText },
  { id: "codesign", label: "Co-Design", icon: Lightbulb },
  { id: "resources", label: "Resources", icon: BookOpen },
] as const;

type TabId = typeof TABS[number]["id"];

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

const CONCERN_CATEGORIES = [
  { value: "policy", label: "Policy" },
  { value: "incident_pattern", label: "Incident Pattern" },
  { value: "communication", label: "Communication" },
  { value: "resources", label: "Resources" },
  { value: "other", label: "Other" },
];

export default function PtaPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  if (!user || user.role !== "pta") {
    return (
      <div className="p-8 text-center">
        <Shield className="mx-auto mb-4 text-muted-foreground" size={48} />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">The PTA portal is only available to PTA members.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className="text-primary" />
          PTA Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          Anonymised school-wide safeguarding overview for PTA governance
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
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
  const { data, isLoading } = useGetPtaDashboard();

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!data) return <p className="text-muted-foreground p-4">No data available.</p>;

  const trend = data.incidentsThisTerm - data.incidentsLastTerm;
  const trendPct = data.incidentsLastTerm > 0
    ? Math.round((trend / data.incidentsLastTerm) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Incidents This Term"
          value={data.incidentsThisTerm}
          subtitle={`${trend >= 0 ? "+" : ""}${trendPct}% vs last term`}
          icon={AlertTriangle}
          color={trend > 0 ? "text-amber-600" : "text-green-600"}
        />
        <KpiCard
          title="Open Protocols"
          value={data.protocols.open}
          subtitle={`${data.protocols.closedThisTerm} closed this term`}
          icon={Shield}
          color="text-blue-600"
        />
        <KpiCard
          title="Amber Alerts"
          value={data.alerts.amber}
          subtitle={`${data.alerts.resolvedThisTerm} resolved this term`}
          icon={Activity}
          color="text-amber-600"
        />
        <KpiCard
          title="Red Alerts"
          value={data.alerts.red}
          subtitle="Immediate response"
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 size={16} /> Incidents by Category
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
              <p className="text-sm text-muted-foreground text-center py-8">No incidents this term</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={16} /> Monthly Trend (Rolling 12 Months)
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
              <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowUpDown size={16} /> Behaviour Level Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            How many pupils are at each behaviour level across the school (anonymised — no names shown)
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
            <p className="text-sm text-muted-foreground text-center py-8">No behaviour data available</p>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Shield size={14} />
          All data on this dashboard is anonymised and aggregated. No individual pupil records or personally identifiable information is accessible to PTA members.
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
            <MessageCircle size={16} /> PTA–Coordinator Channel
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
                No messages yet. Start a conversation with the coordinator.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message to the coordinator..."
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
              <Flag size={16} /> Submit a Formal Concern
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConcernForm(!showConcernForm)}
            >
              {showConcernForm ? "Cancel" : "New Concern"}
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
        <label className="text-sm font-medium block mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          required
        >
          <option value="">Select category...</option>
          {CONCERN_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your concern"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Details</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Please provide full details of your concern..."
          className="w-full h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
          required
        />
      </div>
      <Button type="submit" disabled={submitConcern.isPending}>
        {submitConcern.isPending ? "Submitting..." : "Submit Concern"}
      </Button>
    </form>
  );
}

function PtaPolicyTab() {
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

  const handleAcknowledge = async () => {
    await acknowledgeMutation.mutateAsync({
      data: { policyVersion: policy.version }
    });
    refetch();
  };

  const handleFlag = async () => {
    if (!flagComment.trim()) return;
    await flagMutation.mutateAsync({
      data: { policyVersion: policy.version, comment: flagComment.trim() }
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
            {policy.sections.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleAcknowledge} disabled={acknowledgeMutation.isPending}>
              <CheckCircle2 size={16} className="mr-2" />
              {acknowledgeMutation.isPending ? "Recording..." : "Acknowledge Policy"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFlagForm(!showFlagForm)}
            >
              <Flag size={16} className="mr-2" />
              Flag Disagreement
            </Button>
          </div>

          {showFlagForm && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium mb-2">Raise a formal disagreement with this policy:</p>
              <textarea
                value={flagComment}
                onChange={(e) => setFlagComment(e.target.value)}
                placeholder="Explain your disagreement..."
                className="w-full h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none mb-2"
              />
              <Button onClick={handleFlag} variant="destructive" size="sm" disabled={flagMutation.isPending || !flagComment.trim()}>
                Submit Formal Disagreement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Acknowledgement Trail</CardTitle>
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
                      {a.userFirstName} {a.userLastName} — {a.actionType === "acknowledge" ? "Acknowledged" : "Flagged disagreement"}
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
            <p className="text-sm text-muted-foreground">No acknowledgements recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PtaReportTab() {
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
          <h3 className="text-lg font-bold">No Annual Report Available</h3>
          <p className="text-muted-foreground mt-2">
            The coordinator has not yet generated and approved the annual safeguarding report.
            Once approved, it will appear here for review and download.
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
            <FileText size={18} /> Annual Safeguarding Report — {report.academicYear}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-medium text-green-600">{report.status}</span>
            {report.approvedAt && ` | Approved: ${new Date(report.approvedAt).toLocaleDateString()}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">Total Incidents</p>
              <p className="text-3xl font-bold">{rd.totalIncidents}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border">
              <p className="text-sm font-medium mb-2">Incidents by Category</p>
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
              <p className="text-sm font-medium mb-2">Protocols by Status</p>
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
              <p className="text-sm font-medium mb-2">Pattern Alerts Summary</p>
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
            <Lightbulb size={18} /> Co-Design Workspace
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Share your preferences for how SafeSchool should work for parents at Morna.
            Your input shapes the platform configuration.
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
                    placeholder="Enter your preference..."
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
    legal: "Legal Framework",
    protocol: "Protocol Guides",
    template: "Template Letters",
    governance: "Governance",
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

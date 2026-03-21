import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetCoordinatorDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-polished";
import {
  AlertTriangle, ShieldAlert, FileText, Activity,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Eye,
  MapPin, Users
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const CHART_COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#ec4899", "#3b82f6", "#f97316", "#06b6d4"];

const CATEGORY_LABELS: Record<string, string> = {
  bullying: "Bullying",
  cyberbullying: "Cyberbullying",
  physical: "Physical",
  verbal: "Verbal",
  emotional: "Emotional",
  sexual: "Sexual",
  neglect: "Neglect",
  discrimination: "Discrimination",
  safeguarding: "Safeguarding",
  other: "Other",
  coercive_control: "Coercive Control",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  under_investigation: "Under Investigation",
  resolved: "Resolved",
  escalated: "Escalated",
  closed: "Closed",
};

export default function CoordinatorDashboardView() {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const { data, isLoading } = useGetCoordinatorDashboard();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/analytics"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/dashboard/analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="h-10 bg-muted rounded w-64"></div>
    <div className="grid grid-cols-4 gap-4"><div className="h-32 bg-muted rounded-2xl" /></div>
  </div>;

  const stats = [
    { label: "Total Incidents", value: analytics?.totalIncidents || 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Open Protocols", value: data?.openProtocols || 0, icon: ShieldAlert, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Safeguarding", value: analytics?.safeguardingCount || 0, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Reports (Month)", value: data?.reportsThisMonth || 0, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
  ];

  const categoryData = (analytics?.byCategory || []).map((c: any) => ({
    ...c,
    name: CATEGORY_LABELS[c.name] || c.name,
  }));

  const statusData = (analytics?.byStatus || []).map((s: any) => ({
    ...s,
    name: STATUS_LABELS[s.name] || s.name,
  }));

  const yearGroupData = analytics?.byYearGroup || [];
  const locationData = analytics?.byLocation || [];
  const monthlyData = analytics?.monthlyTrend || [];
  const topVictims = analytics?.topVictims || [];
  const topPerpetrators = analytics?.topPerpetrators || [];
  const escalationData = analytics?.byEscalationTier || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Safeguarding overview and incident analytics.</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl" role="tablist" aria-label="Dashboard view">
          <button
            role="tab"
            aria-selected={activeTab === "overview"}
            aria-controls="tabpanel-overview"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "analytics"}
            aria-controls="tabpanel-analytics"
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "analytics" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon size={18} className={s.color} aria-hidden="true" />
                </div>
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/incidents">
              <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">View Incidents</h3>
                    <p className="text-sm text-muted-foreground">Review all reported incidents</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/protocols">
              <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Protocols</h3>
                    <p className="text-sm text-muted-foreground">Manage safeguarding protocols</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/report">
              <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Report Incident</h3>
                    <p className="text-sm text-muted-foreground">Log a new incident or concern</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {activeTab === "analytics" && !analyticsLoading && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary" aria-hidden="true" />
                  Incidents by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div role="img" aria-label={`Bar chart showing incidents by type: ${categoryData.map((d: any) => `${d.name}: ${d.count}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} name="Incidents" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-violet-500" aria-hidden="true" />
                  Incidents by Year Group
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yearGroupData.length > 0 ? (
                  <div role="img" aria-label={`Pie chart showing incidents by year group: ${yearGroupData.map((d: any) => `${d.name}: ${d.count}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={yearGroupData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, count }) => `${name} (${count})`} labelLine={false}>
                          {yearGroupData.map((_: any, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" aria-hidden="true" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <div role="img" aria-label={`Line chart showing monthly incident trend: ${monthlyData.map((d: any) => `${d.month}: ${d.count}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} name="Incidents" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-amber-500" aria-hidden="true" />
                  Incident Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <div role="img" aria-label={`Pie chart showing incident status: ${statusData.map((d: any) => `${d.name}: ${d.count}`).join(", ")}`}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, count }) => `${count}`}>
                          {statusData.map((_: any, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {escalationData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-500" aria-hidden="true" />
                    Escalation Tiers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={escalationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Incidents">
                        {escalationData.map((_: any, i: number) => (
                          <Cell key={i} fill={["#22c55e", "#f59e0b", "#ef4444"][i] || "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {locationData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 size={18} className="text-teal-500" aria-hidden="true" />
                    Top Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={locationData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {topVictims.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye size={18} className="text-blue-500" aria-hidden="true" />
                    Most Involved Victims
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topVictims.map((p: any) => (
                      <Link key={p.id} href={`/class?pupil=${p.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/30">
                          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-muted-foreground">{p.yearGroup} &middot; {p.className}</p>
                          </div>
                          <span className="text-lg font-bold text-blue-500">{p.count}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {topPerpetrators.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users size={18} className="text-amber-500" aria-hidden="true" />
                    Most Named Perpetrators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topPerpetrators.length > 0 ? (
                    <div className="space-y-2">
                      {topPerpetrators.map((p: any) => (
                        <Link key={p.id} href={`/class?pupil=${p.id}`}>
                          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/30">
                            <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{p.firstName} {p.lastName}</p>
                              <p className="text-xs text-muted-foreground">{p.yearGroup} &middot; {p.className}</p>
                            </div>
                            <span className="text-lg font-bold text-amber-500">{p.count}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-sm py-4 text-center">No data yet.</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "analytics" && analyticsLoading && (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-2xl" />
            <div className="h-80 bg-muted rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

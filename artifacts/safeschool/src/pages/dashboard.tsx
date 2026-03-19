import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  useGetCoordinatorDashboard, 
  useListIncidents, 
  useListAlerts,
  useListNotifications 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { 
  AlertTriangle, ShieldAlert, HeartHandshake, Bell,
  ArrowRight, FileText, Activity, TrendingUp, Users, BarChart3, PieChart as PieChartIcon, Eye,
  MapPin, Clock, Calendar, UserCheck, ChevronDown, ChevronUp, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

// --- Pupil Dashboard ---
function PupilDashboard({ user }: { user: any }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-display font-bold text-foreground">Hi, {user.firstName}! 👋</h1>
        <p className="mt-2 text-xl text-muted-foreground">How are you feeling today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 group overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-500">
             <HeartHandshake size={180} />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
              <HeartHandshake size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Speak Up</h2>
            <p className="text-muted-foreground mb-8">If something isn't right, let us know. We are here to help and listen to you.</p>
            <Link href="/report">
              <Button size="lg" className="w-full text-lg shadow-xl shadow-primary/20">
                Report an Incident <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardContent className="p-8 flex flex-col h-full justify-between">
            <div>
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-secondary/30">
                <Users size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">My Safe Contacts</h2>
              <p className="text-muted-foreground">Reach out to your trusted teachers anytime.</p>
            </div>
            <div className="mt-6 space-y-3">
              {['Mr. Smith (Tutor)', 'Ms. Davis (Counselor)'].map((t, i) => (
                <div key={i} className="flex items-center gap-4 bg-background p-3 rounded-xl border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                    {t.charAt(0)}
                  </div>
                  <span className="font-semibold text-foreground">{t}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

function CoordinatorDashboardView() {
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
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "analytics" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" />Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                <s.icon size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Recent Incidents</CardTitle>
              <Link href="/incidents" className="text-primary text-sm font-bold hover:underline flex items-center">
                View all <ArrowRight size={16} className="ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                {data?.recentIncidents?.slice(0, 5).map((inc) => (
                  <Link key={inc.id} href={`/incidents/${inc.id}`}>
                    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${inc.escalationTier === 3 ? 'bg-destructive' : inc.escalationTier === 2 ? 'bg-warning' : 'bg-secondary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate capitalize">{inc.category.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(inc.incidentDate)} &middot; {inc.location || 'Unknown'}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize whitespace-nowrap">
                        {inc.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
                {!data?.recentIncidents?.length && <p className="text-muted-foreground text-sm py-4 text-center">No recent incidents.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Active Pattern Alerts</CardTitle>
              <Link href="/alerts" className="text-primary text-sm font-bold hover:underline flex items-center">
                Review <ArrowRight size={16} className="ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-2">
                {data?.recentAlerts?.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <ShieldAlert className="text-destructive mt-0.5 shrink-0" size={18} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground">{alert.ruleLabel || 'Pattern Detected'}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${alert.alertLevel === 'red' ? 'bg-destructive text-white' : 'bg-warning text-warning-foreground'}`}>
                          {alert.alertLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Involves {alert.victimName || 'unknown student'}. {formatDate(alert.triggeredAt)}.
                      </p>
                    </div>
                  </div>
                ))}
                {!data?.recentAlerts?.length && <p className="text-muted-foreground text-sm py-4 text-center">No active alerts.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "analytics" && !analyticsLoading && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary" />
                  Incidents by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-violet-500" />
                  Incidents by Year Group
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yearGroupData.length > 0 ? (
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
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} name="Incidents" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon size={18} className="text-amber-500" />
                  Incident Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
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
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye size={18} className="text-red-500" />
                  Escalation Tiers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {escalationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={escalationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Incidents">
                        {escalationData.map((_: any, i: number) => (
                          <Cell key={i} fill={i === 0 ? "#10b981" : i === 1 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={18} className="text-teal-500" />
                  Incidents by Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {locationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={locationData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users size={18} className="text-rose-500" />
                  Students Most Affected (Victims)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topVictims.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {topVictims.map((v: any, i: number) => (
                      <Link key={v.id} href={`/class`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold dark:bg-rose-900/30 dark:text-rose-400">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{v.name}</p>
                            <p className="text-xs text-muted-foreground">{v.yearGroup} &middot; {v.className}</p>
                          </div>
                          <span className="text-lg font-bold text-rose-500">{v.count}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm py-4 text-center">No data yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users size={18} className="text-amber-500" />
                  Students with Repeated Behaviour (Perpetrators)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPerpetrators.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {topPerpetrators.map((p: any, i: number) => (
                      <Link key={p.id} href={`/class`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold dark:bg-amber-900/30 dark:text-amber-400">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{p.name}</p>
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

// --- Teacher / Head of Year Dashboard ---
function TeacherDashboard({ user }: { user: any }) {
  const { data: pupilData } = useQuery<any>({
    queryKey: ["/api/my-pupils"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/my-pupils", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: incidentsData } = useListIncidents({ limit: 5 });
  const incidents = incidentsData?.data || [];

  const totalPupils = pupilData ? Object.values(pupilData.classes as Record<string, any[]>).reduce((sum: number, arr: any[]) => sum + arr.length, 0) : 0;
  const scopeLabel = pupilData?.scopeLabel || "";
  const isHoY = user.role === "head_of_year";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Welcome back, {user.firstName}</h1>
        <p className="text-muted-foreground mt-1">
          {isHoY ? `Head of Year for ${scopeLabel}` : `Class teacher for ${scopeLabel}`} — {totalPupils} pupils
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/report">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <AlertTriangle size={28} />
              </div>
              <h3 className="font-bold text-lg">Report Incident</h3>
              <p className="text-sm text-muted-foreground">Log a new concern or incident</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/class">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <h3 className="font-bold text-lg">{isHoY ? "My Year Group" : "My Class"}</h3>
              <p className="text-sm text-muted-foreground">{totalPupils} pupils in your care</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/incidents">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors dark:bg-amber-900/30 dark:text-amber-400">
                <FileText size={28} />
              </div>
              <h3 className="font-bold text-lg">View Incidents</h3>
              <p className="text-sm text-muted-foreground">Review and track incidents</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Recent Incidents</CardTitle>
          <Link href="/incidents" className="text-primary text-sm font-bold hover:underline flex items-center">
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-2">
            {incidents.map((inc) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`}>
                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border/50">
                  <div className={`w-2 h-10 rounded-full shrink-0 ${inc.escalationTier === 3 ? "bg-destructive" : inc.escalationTier === 2 ? "bg-warning" : "bg-secondary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{inc.referenceNumber}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted capitalize">{inc.status}</span>
                    </div>
                    <p className="font-bold capitalize truncate">{inc.category?.split(",").join(", ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inc.incidentDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
            {incidents.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No recent incidents.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Parent Dashboard ---
const PERIOD_OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "All time", days: 9999 },
];

const CHART_COLORS_PARENT = ["#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981"];

const PARENT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  submitted: "Submitted",
  investigating: "Being looked into",
  closed: "Resolved",
  escalated: "Escalated",
};

const PARENT_CATEGORY_LABELS: Record<string, string> = {
  verbal: "Unkind words",
  physical: "Physical",
  psychological: "Emotional",
  exclusion: "Left out",
  online: "Online",
  neglect: "Welfare",
  safeguarding: "Safeguarding",
  relational: "Friendship issues",
  sexual: "Safeguarding concern",
  "verbal,physical": "Unkind words & physical",
  "verbal,psychological": "Unkind words & emotional",
};

const PARENT_EMOTION_LABELS: Record<string, { label: string; emoji: string }> = {
  scared: { label: "Scared", emoji: "\u{1F628}" },
  sad: { label: "Sad", emoji: "\u{1F622}" },
  angry: { label: "Angry", emoji: "\u{1F620}" },
  worried: { label: "Worried", emoji: "\u{1F61F}" },
  confused: { label: "Confused", emoji: "\u{1F615}" },
  okay: { label: "Okay", emoji: "\u{1F610}" },
};

const PARENT_LOCATION_LABELS: Record<string, string> = {
  playground: "Playground",
  classroom: "Classroom",
  corridor: "Corridor",
  canteen: "Canteen / Dining hall",
  toilets: "Toilets",
  sports_field: "Sports field",
  changing_rooms: "Changing rooms",
  bus_stop: "Bus stop / Pick-up area",
  online: "Online / Social media",
  off_site: "Off school grounds",
  other: "Other",
};

const PARENT_TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Low level", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  2: { label: "Moderate", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  3: { label: "Serious", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
};

function ParentReportCard({ inc }: { inc: any }) {
  const [expanded, setExpanded] = useState(false);
  const emotion = inc.emotionalState ? PARENT_EMOTION_LABELS[inc.emotionalState] : null;
  const tierInfo = inc.escalationTier ? PARENT_TIER_LABELS[inc.escalationTier] : null;

  return (
    <div className="p-4 hover:bg-muted/20 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{inc.referenceNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                inc.status === "closed" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                inc.status === "investigating" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                "bg-warning/20 text-warning"
              }`}>
                {PARENT_STATUS_LABELS[inc.status] || inc.status}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {PARENT_CATEGORY_LABELS[inc.category] || inc.category}
              </span>
              {tierInfo && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              )}
              {inc.addedToFile && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary/10 text-secondary font-bold">
                  On File
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(inc.incidentDate)}
              </span>
              {inc.incidentTime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {inc.incidentTime}
                </span>
              )}
              {inc.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {PARENT_LOCATION_LABELS[inc.location] || inc.location.replace(/_/g, " ")}
                </span>
              )}
              {emotion && (
                <span className="flex items-center gap-1">
                  {emotion.emoji} {emotion.label}
                </span>
              )}
              <span className="flex items-center gap-1 font-medium text-foreground/70">
                {inc.childName}
              </span>
            </div>

            {inc.description && (
              <p className="text-sm text-foreground mt-2 line-clamp-2">{inc.description}</p>
            )}
          </div>
          <div className="mt-1 text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
              {inc.description && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">School's Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{inc.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">Child</p>
                  <p className="text-sm font-bold mt-0.5">{inc.childName}</p>
                  {inc.childYearGroup && (
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.childYearGroup} · {inc.childClassName}</p>
                  )}
                </div>
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">Date & Time</p>
                  <p className="text-sm font-bold mt-0.5">{formatDate(inc.incidentDate)}</p>
                  {inc.incidentTime && (
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.incidentTime}</p>
                  )}
                </div>
                {inc.location && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">Where</p>
                    <p className="text-sm font-bold mt-0.5">{PARENT_LOCATION_LABELS[inc.location] || inc.location.replace(/_/g, " ")}</p>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">Type</p>
                  <p className="text-sm font-bold mt-0.5">{PARENT_CATEGORY_LABELS[inc.category] || inc.category}</p>
                </div>
                {emotion && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">How they felt</p>
                    <p className="text-sm font-bold mt-0.5">{emotion.emoji} {emotion.label}</p>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">Current Status</p>
                  <p className="text-sm font-bold mt-0.5">{PARENT_STATUS_LABELS[inc.status] || inc.status}</p>
                </div>
              </div>

              {(inc.assessedBy || inc.assessedAt) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-3">
                  <UserCheck size={14} className="text-primary" />
                  <span>
                    Reviewed by <strong className="text-foreground">{inc.assessedBy || "Staff"}</strong>
                    {inc.assessedAt && <> on {formatDate(inc.assessedAt)}</>}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <span>Reported: {formatDate(inc.createdAt)}</span>
                {inc.updatedAt && inc.updatedAt !== inc.createdAt && (
                  <span>· Last updated: {formatDate(inc.updatedAt)}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParentDashboard({ user }: { user: any }) {
  const [periodDays, setPeriodDays] = useState(180);
  const { data: notificationsData } = useListNotifications();
  const notifications = notificationsData?.data || [];
  const unread = notifications.filter((n: any) => !n.acknowledgedAt);

  const { data: parentData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/parent"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/dashboard/parent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const filteredIncidents = (parentData?.incidents || []).filter(
    (inc: any) => periodDays >= 9999 || inc.incidentDate >= cutoffStr
  );
  const filteredMonthly = (parentData?.monthlyTrend || []).filter(
    (m: any) => periodDays >= 9999 || m.month >= cutoffStr.substring(0, 7)
  );

  const filteredByCategory: Record<string, number> = {};
  const filteredByStatus: Record<string, number> = {};
  for (const inc of filteredIncidents) {
    const cats = (inc.category || "").split(",").map((c: string) => c.trim()).filter(Boolean);
    for (const cat of cats) {
      filteredByCategory[cat] = (filteredByCategory[cat] || 0) + 1;
    }
    filteredByStatus[inc.status] = (filteredByStatus[inc.status] || 0) + 1;
  }
  const categoryData = Object.entries(filteredByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name: PARENT_CATEGORY_LABELS[name] || name, count }));
  const statusData = Object.entries(filteredByStatus)
    .map(([name, count]) => ({ name: PARENT_STATUS_LABELS[name] || name, count }));

  const childrenList = parentData?.children || [];
  const childName = childrenList.length === 1
    ? `${childrenList[0].firstName} ${childrenList[0].lastName}`
    : childrenList.length > 1
    ? childrenList.map((c: any) => c.firstName).join(" & ")
    : "your child";

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-2xl m-8"></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Welcome, {user.firstName}</h1>
          <p className="text-muted-foreground mt-1">
            Stay informed about {childName}'s wellbeing at school.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setPeriodDays(opt.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                periodDays === opt.days
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <FileText className="mx-auto text-primary mb-2" size={28} />
            <p className="text-3xl font-bold">{filteredIncidents.length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <AlertTriangle className="mx-auto text-warning mb-2" size={28} />
            <p className="text-3xl font-bold">{filteredIncidents.filter((i: any) => i.status !== "closed").length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Activity className="mx-auto text-green-600 mb-2" size={28} />
            <p className="text-3xl font-bold">{filteredIncidents.filter((i: any) => i.status === "closed").length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">Resolved</p>
          </CardContent>
        </Card>
        <Link href="/notifications">
          <Card className="hover:border-primary/30 transition-all cursor-pointer relative h-full">
            <CardContent className="p-5 text-center">
              <Bell className="mx-auto text-secondary mb-2" size={28} />
              <p className="text-3xl font-bold">{unread.length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Unread Updates</p>
            </CardContent>
            {unread.length > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-destructive animate-pulse"></span>
            )}
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/report">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Report a Concern</h2>
                <p className="text-sm text-muted-foreground">If you are worried about something, let the school know.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        {parentData?.children?.map((child: any) => (
          <Card key={child.id}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary flex-shrink-0">
                <Users size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{child.firstName} {child.lastName}</h2>
                <p className="text-sm text-muted-foreground">
                  {child.yearGroup && `Year ${child.yearGroup}`}{child.className && ` · ${child.className}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMonthly.length > 1 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp size={18} /> Reports Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={filteredMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(m: string) => {
                    const [y, mo] = m.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(m: string) => {
                    const [y, mo] = m.split("-");
                    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                    return `${months[parseInt(mo) - 1]} ${y}`;
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} name="Reports" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categoryData.length > 0 && (
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 size={18} /> Types of Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusData.length > 0 && (
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon size={18} /> Report Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="count" nameKey="name" label={({ name, count }) => `${name} (${count})`} labelLine={false}>
                    {statusData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={CHART_COLORS_PARENT[idx % CHART_COLORS_PARENT.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={18} /> Report History
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Tap any report to see full details</p>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No reports found for this time period.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIncidents.map((inc: any) => (
                <ParentReportCard key={inc.id} inc={inc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {unread.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell size={18} /> Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {unread.slice(0, 5).map((n: any) => (
                <div key={n.id} className="p-4 rounded-xl border border-border bg-primary/5">
                  <p className="font-bold text-sm">{n.title || "School Notification"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Main Switcher ---
export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {user.role === "pupil" ? (
        <PupilDashboard user={user} />
      ) : user.role === "parent" ? (
        <ParentDashboard user={user} />
      ) : user.role === "coordinator" || user.role === "head_teacher" || user.role === "senco" ? (
        <CoordinatorDashboardView />
      ) : user.role === "teacher" || user.role === "head_of_year" || user.role === "support_staff" ? (
        <TeacherDashboard user={user} />
      ) : (
        <div className="max-w-3xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-display font-bold">Welcome back, {user.firstName}</h1>
          <p className="text-muted-foreground mt-4 text-lg">Use the navigation menu to get started.</p>
          <Link href="/report">
            <Button size="lg" className="mt-8">Report an Incident</Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

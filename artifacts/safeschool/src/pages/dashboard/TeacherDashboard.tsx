import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListIncidents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-polished";
import {
  AlertTriangle, FileText, TrendingUp, Users,
  BarChart3, MapPin, ArrowRight
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

export default function TeacherDashboard({ user }: { user: any }) {
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

  const { data: analyticsData } = useQuery<any>({
    queryKey: ["/api/dashboard/teacher-analytics"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/dashboard/teacher-analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

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

      {analyticsData && analyticsData.totalIncidents > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold">Incident Analytics</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
              {analyticsData.totalIncidents} incidents &middot; {analyticsData.scopeLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData.byLocation?.length > 0 && (
              <Card>
                <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin size={16} aria-hidden="true" /> Where Incidents Happen
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Top locations for your {isHoY ? "year group" : "class"}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={Math.max(180, analyticsData.byLocation.length * 32)}>
                    <BarChart data={analyticsData.byLocation} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={95} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analyticsData.byCategory?.length > 0 && (
              <Card>
                <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 size={16} aria-hidden="true" /> Types of Incidents
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Breakdown by category</p>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={Math.max(180, analyticsData.byCategory.length * 32)}>
                    <BarChart data={analyticsData.byCategory} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={95} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {analyticsData.monthlyTrend?.length > 1 && (
            <Card>
              <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp size={16} aria-hidden="true" /> Monthly Trend
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">How incident volume is changing over time</p>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analyticsData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(m: string) => {
                        const [, mo] = m.split("-");
                        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        return months[parseInt(mo) - 1];
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(m: string) => {
                        const [y, mo] = m.split("-");
                        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                        return `${months[parseInt(mo) - 1]} ${y}`;
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="Incidents" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

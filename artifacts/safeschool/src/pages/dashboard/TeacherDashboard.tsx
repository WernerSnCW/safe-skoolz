import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useListIncidents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";
import { WhatsNewBand, type DigestItem } from "@/components/dashboard/WhatsNewBand";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import {
  AlertTriangle, FileText, TrendingUp, Users,
  BarChart3, MapPin, ArrowRight, MessageCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

export default function TeacherDashboard({ user }: { user: any }) {
  const { t } = useTranslation("dashboard");
  const { data: pupilData, isLoading: pupilLoading, isError: pupilError } = useQuery<any>({
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

  const { data: incidentsData, isLoading: incidentsLoading, isError: incidentsError } = useListIncidents({ limit: 5 });
  const incidents = incidentsData?.data || [];

  const { totalUnread: messageUnread } = useMessageNotifications();

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

  const isDataLoading = pupilLoading || incidentsLoading;

  if (isDataLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-9 bg-muted rounded-lg w-72 mb-2" />
          <div className="h-5 bg-muted rounded w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (pupilError && incidentsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("unableToLoadDashboard")}</h2>
        <p className="text-muted-foreground mb-4">{t("dashboardLoadError")}</p>
        <Button onClick={() => window.location.reload()}>{t("common:refreshPage")}</Button>
      </div>
    );
  }

  const digest: DigestItem[] = [];
  if (messageUnread > 0) {
    digest.push({
      id: "messages", icon: MessageCircle, tone: "info",
      title: t("newMessagesCount", { count: messageUnread, defaultValue: `${messageUnread} new messages` }),
      href: "/messages", unread: true,
    });
  }
  for (const inc of incidents.slice(0, 2)) {
    digest.push({
      id: `inc-${inc.id}`, icon: FileText,
      tone: inc.escalationTier === 3 ? "destructive" : inc.escalationTier === 2 ? "warning" : "info",
      title: `${t("incidents")}: ${(inc.category ?? "").split(",")[0]}`.trim(),
      detail: inc.referenceNumber, href: `/incidents/${inc.id}`,
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={isHoY ? "Head of year" : "Class teacher"}
        title={t("welcomeBack", { name: user.firstName })}
        subtitle={`${isHoY ? t("headOfYearFor", { group: scopeLabel }) : t("classTeacherFor", { group: scopeLabel })} — ${t("pupilsInYourCare", { count: totalPupils })}`}
      />

      <WhatsNewBand
        items={digest}
        heading={t("sinceLastHere", { defaultValue: "Since you were last here" })}
        emptyLabel={t("allCaughtUp", { defaultValue: "You're all caught up." })}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/report">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <AlertTriangle size={28} />
              </div>
              <h3 className="font-bold text-lg">{t("reportIncident")}</h3>
              <p className="text-sm text-muted-foreground">{t("logNewConcern")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/class">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <h3 className="font-bold text-lg">{isHoY ? t("myYearGroup") : t("myClass")}</h3>
              <p className="text-sm text-muted-foreground">{t("pupilsInYourCare", { count: totalPupils })}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/incidents">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors dark:bg-amber-900/30 dark:text-amber-400">
                <FileText size={28} />
              </div>
              <h3 className="font-bold text-lg">{t("viewIncidents")}</h3>
              <p className="text-sm text-muted-foreground">{t("reviewAndTrackIncidents")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t("recentIncidents")}</CardTitle>
          <Link href="/incidents" className="text-primary text-sm font-bold hover:underline flex items-center">
            {t("common:viewAll")} <ArrowRight size={16} className="ml-1" />
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
            {incidents.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">{t("noRecentIncidents")}</p>}
          </div>
        </CardContent>
      </Card>

      {analyticsData && analyticsData.totalIncidents > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold">{t("incidentAnalytics")}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
              {analyticsData.totalIncidents} {t("incidents").toLowerCase()} &middot; {analyticsData.scopeLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData.byLocation?.length > 0 && (
              <Card>
                <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin size={16} aria-hidden="true" /> {t("whereIncidentsHappen")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("topLocationsForScope", { scope: isHoY ? t("myYearGroup").toLowerCase() : t("myClass").toLowerCase() })}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={Math.max(180, analyticsData.byLocation.length * 32)}>
                    <BarChart data={analyticsData.byLocation} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={95} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 6, 6, 0]} name={t("incidents")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analyticsData.byCategory?.length > 0 && (
              <Card>
                <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 size={16} aria-hidden="true" /> {t("typesOfIncidents")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("breakdownByCategory")}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={Math.max(180, analyticsData.byCategory.length * 32)}>
                    <BarChart data={analyticsData.byCategory} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={95} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} name={t("incidents")} />
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
                  <TrendingUp size={16} aria-hidden="true" /> {t("monthlyTrend")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t("howIncidentVolumeChanging")}</p>
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
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} name={t("incidents")} />
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

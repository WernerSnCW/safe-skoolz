import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  useGetCoordinatorDashboard, 
  useListIncidents, 
  useListAlerts 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { 
  AlertTriangle, ShieldAlert, HeartHandshake, 
  ArrowRight, FileText, Activity, TrendingUp, Users 
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

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

// --- Coordinator Dashboard ---
function CoordinatorDashboardView() {
  const { data, isLoading } = useGetCoordinatorDashboard();
  const { data: alerts } = useListAlerts({ limit: 5 });

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="h-10 bg-muted rounded w-64"></div>
    <div className="grid grid-cols-4 gap-4"><div className="h-32 bg-muted rounded-2xl" /></div>
  </div>;

  const stats = [
    { label: "Open Protocols", value: data?.openProtocols || 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Red Alerts", value: data?.patternAlerts?.red || 0, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Amber Alerts", value: data?.patternAlerts?.amber || 0, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Reports (Month)", value: data?.reportsThisMonth || 0, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">School safeguarding summary & pending actions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                <s.icon size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Incidents</CardTitle>
            <Link href="/incidents" className="text-primary text-sm font-bold hover:underline flex items-center">
              View all <ArrowRight size={16} className="ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {data?.recentIncidents?.slice(0, 5).map((inc) => (
                <div key={inc.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors border border-border/50">
                  <div className={`w-2 h-12 rounded-full ${inc.escalationTier === 3 ? 'bg-destructive' : inc.escalationTier === 2 ? 'bg-warning' : 'bg-secondary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{inc.category.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{formatDate(inc.incidentDate)}</span>
                      <span>•</span>
                      <span className="truncate">{inc.location || 'Unknown location'}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                    {inc.status}
                  </span>
                </div>
              ))}
              {!data?.recentIncidents?.length && <p className="text-muted-foreground text-sm">No recent incidents.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Active Pattern Alerts</CardTitle>
            <Link href="/alerts" className="text-primary text-sm font-bold hover:underline flex items-center">
              Review alerts <ArrowRight size={16} className="ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {data?.recentAlerts?.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <ShieldAlert className="text-destructive mt-1 shrink-0" size={20} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">{alert.ruleLabel || 'Pattern Detected'}</p>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${alert.alertLevel === 'red' ? 'bg-destructive text-white' : 'bg-warning text-warning-foreground'}`}>
                        {alert.alertLevel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Involves {alert.victimName || 'unknown student'}. Triggered {formatDate(alert.triggeredAt)}.
                    </p>
                  </div>
                </div>
              ))}
              {!data?.recentAlerts?.length && <p className="text-muted-foreground text-sm">No active alerts. All clear.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
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
      ) : user.role === "coordinator" || user.role === "head_teacher" || user.role === "senco" ? (
        <CoordinatorDashboardView />
      ) : (
        <div className="max-w-3xl mx-auto py-12 text-center">
          <div className="w-24 h-24 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <Users size={48} />
          </div>
          <h1 className="text-3xl font-display font-bold">Welcome back, {user.firstName}</h1>
          <p className="text-muted-foreground mt-4 text-lg">Use the navigation menu to view your class details, report incidents, or check notifications.</p>
          <Link href="/report">
            <Button size="lg" className="mt-8">Report an Incident</Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

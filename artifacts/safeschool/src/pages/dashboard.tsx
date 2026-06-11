import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui-polished";
import { Play } from "lucide-react";
import { useDemo } from "@/components/demo/DemoWalkthrough";
import PupilDashboard from "./dashboard/PupilDashboard";
import CoordinatorDashboardView from "./dashboard/CoordinatorDashboard";
import TeacherDashboard from "./dashboard/TeacherDashboard";
import ParentDashboard from "./dashboard/ParentDashboard";

function PtaDashboardRedirect() {
  const { t } = useTranslation("dashboard");
  const [_, setLocation] = useLocation();
  useEffect(() => { setLocation("/pta"); }, []);
  return (
    <div className="max-w-3xl mx-auto py-12 text-center">
      <h1 className="text-2xl font-bold">{t("redirectingToPta")}</h1>
    </div>
  );
}

function DemoTourBanner() {
  const { t } = useTranslation("dashboard");
  const { startDemo, isActive } = useDemo();
  if (isActive) return null;
  return (
    <button
      onClick={startDemo}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all group mb-6"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
        <Play size={16} className="fill-primary/20 group-hover:fill-white/20" />
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t("takeGuidedTour")}</p>
        <p className="text-xs text-muted-foreground">{t("guidedTourDesc")}</p>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      {user.role !== "pta" && <DemoTourBanner />}
      {user.role === "pupil" ? (
        <PupilDashboard user={user} />
      ) : user.role === "parent" ? (
        <ParentDashboard user={user} />
      ) : user.role === "pta" ? (
        <PtaDashboardRedirect />
      ) : user.role === "coordinator" || user.role === "head_teacher" || user.role === "senco" ? (
        <CoordinatorDashboardView />
      ) : user.role === "teacher" || user.role === "head_of_year" || user.role === "support_staff" ? (
        <TeacherDashboard user={user} />
      ) : (
        <div className="max-w-3xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-display font-bold">{t("welcomeBack", { name: user.firstName })}</h1>
          <p className="text-muted-foreground mt-4 text-lg">{t("useNavToStart")}</p>
          <Link href="/report">
            <Button size="lg" className="mt-8">{t("reportAnIncident")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

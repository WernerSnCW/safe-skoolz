import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui-polished";
import { motion } from "framer-motion";
import PupilDashboard from "./dashboard/PupilDashboard";
import CoordinatorDashboardView from "./dashboard/CoordinatorDashboard";
import TeacherDashboard from "./dashboard/TeacherDashboard";
import ParentDashboard from "./dashboard/ParentDashboard";

function PtaDashboardRedirect() {
  const [_, setLocation] = useLocation();
  useEffect(() => { setLocation("/pta"); }, []);
  return (
    <div className="max-w-3xl mx-auto py-12 text-center">
      <h1 className="text-2xl font-bold">Redirecting to PTA Portal...</h1>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

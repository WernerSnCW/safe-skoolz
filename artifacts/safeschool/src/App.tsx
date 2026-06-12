import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Hooks & Lib
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { DemoProvider, DemoOverlay } from "@/components/demo/DemoWalkthrough";

// Pages
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import HomePage from "@/pages/home";
import SchoolsPage from "@/pages/schools";
import ParentsPage from "@/pages/parents";
import PtasPage from "@/pages/ptas";
import CoalitionsPage from "@/pages/coalitions";
import PupilsPage from "@/pages/pupils";
import DiagnosticPage from "@/pages/diagnostic";
import LearningPage from "@/pages/learning";
import SafeguardingPage from "@/pages/safeguarding";
import VoicePublicPage from "@/pages/voice-public";
import CommunityDiagnosticPage from "@/pages/diagnostic-community";
import ResourcesPage from "@/pages/resources";
import AboutPage from "@/pages/about";
import ParentsJoinPta from "@/pages/parents-join-pta";
import PtasOperatingPack from "@/pages/ptas-operating-pack";
import PtasSchoolEngagement from "@/pages/ptas-school-engagement";
import Schools10DayRollout from "@/pages/schools-10-day-rollout";
import SchoolsCaseStudy from "@/pages/schools-case-study";
import Dashboard from "@/pages/dashboard";
import ReportIncident from "@/pages/report-incident";
import IncidentsList from "@/pages/incidents";
import IncidentDetail from "@/pages/incidents/detail";
import ProtocolsList from "@/pages/protocols";
import NewProtocol from "@/pages/protocols/new";
import ProtocolDetail from "@/pages/protocols/detail";
import AlertsList from "@/pages/alerts";
import NotificationsList from "@/pages/notifications";
import Settings from "@/pages/settings";
import MyClass from "@/pages/my-class";
import LearnPage from "@/pages/learn";
import LearnLessonPage from "@/pages/learn-lesson";
import StaffLessons from "@/pages/learn-staff";
import LearnPresentPage from "@/pages/learn-present";
import MessagesPage from "@/pages/messages";
import CaseloadPage from "@/pages/caseload";
import BehaviourPage from "@/pages/behaviour";
import PtaPortal from "@/pages/pta";
import PtaGovernance from "@/pages/pta-governance";
import PtaDecisions from "@/pages/pta-decisions";
import PtaVoting from "@/pages/pta-voting";
import PtaAnnouncements from "@/pages/pta-announcements";
import PtaUpdates from "@/pages/pta-updates";
import PtaInitiatives from "@/pages/pta-initiatives";
import VoicePage from "@/pages/voice";
import Diagnostics from "@/pages/diagnostics";
import DiagnosticsResults from "@/pages/diagnostics-results";
import DiaryPage from "@/pages/diary";
import LearningsPage from "@/pages/learnings";
import CaseStudiesPage from "@/pages/case-studies";
import HowItWorksPage from "@/pages/how-it-works";
import TrainingStatusPage from "@/pages/training-status";
import AuditPage from "@/pages/audit";
import MembershipQueuePage from "@/pages/membership-queue";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import ResourceCentre from "@/pages/resource-centre";
import HowVbeWorks from "@/pages/how-vbe-works";
import DiagnosticResultsPage from "@/pages/diagnostic-results";
import JoinPage from "@/pages/join";

const queryClient = new QueryClient();

// A simple wrapper to redirect unauthenticated users
function ProtectedRoute({
  component: Component,
  allowedRoles,
  unauthRedirect,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
  unauthRedirect?: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // We cannot use hooks conditionally, so just window location redirect is fine here 
    // or return a redirect component. Wouter's useLocation is fine.
    window.location.href = unauthRedirect || "/login";
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Access denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

// Smart root: anonymous visitors get the public SchoolVBE marketing homepage
// (which is prerendered to static HTML for SEO); authenticated users get the
// platform dashboard. use-auth reports isLoading=false immediately when there's
// no token, so the anon render is synchronous and matches the prerendered
// markup — no spinner flash. When a token is present, ProtectedRoute handles
// the loading/auth/redirect flow exactly as before.
function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (!isAuthenticated && !isLoading) {
    return <HomePage />;
  }
  return <ProtectedRoute component={Dashboard} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/how-it-works/safeguarding" component={HowItWorksPage} />
      <Route path="/how-it-works" component={HowVbeWorks} />
      <Route path="/schools" component={SchoolsPage} />
      <Route path="/parents" component={ParentsPage} />
      <Route path="/ptas" component={PtasPage} />
      <Route path="/coalitions" component={CoalitionsPage} />
      <Route path="/pupils" component={PupilsPage} />
      <Route path="/diagnostic" component={DiagnosticPage} />
      <Route path="/learning" component={LearningPage} />
      <Route path="/safeguarding" component={SafeguardingPage} />
      <Route path="/v/:id">{(params) => <VoicePublicPage id={params.id} />}</Route>
      <Route path="/d/:slug">{(params) => <CommunityDiagnosticPage slug={params.slug} />}</Route>
      <Route path="/join/:slug">{(params) => <JoinPage slug={params.slug} />}</Route>
      <Route path="/join">{() => <JoinPage slug="morna" />}</Route>
      <Route path="/results/:slug">
        {(params) => (
          <ProtectedRoute
            component={() => <DiagnosticResultsPage slug={params.slug} />}
            allowedRoles={["parent", "pta", "coordinator", "head_teacher"]}
          />
        )}
      </Route>
      {/* Ported public deep guide pages (specific routes BEFORE the catch-all). */}
      <Route path="/schools/10-day-rollout" component={Schools10DayRollout} />
      <Route path="/schools/case-study" component={SchoolsCaseStudy} />
      <Route path="/parents/join-pta" component={ParentsJoinPta} />
      <Route path="/ptas/operating-pack" component={PtasOperatingPack} />
      <Route path="/ptas/school-engagement" component={PtasSchoolEngagement} />
      {/* Safety net: remaining public deep guides aren't ported yet — fall back
          to the section page instead of a hard 404. Add specific routes ABOVE
          these when the real deep pages land. */}
      <Route path="/schools/:slug">{() => <Redirect to="/schools" />}</Route>
      <Route path="/parents/:slug">{() => <Redirect to="/parents" />}</Route>
      <Route path="/ptas/:slug">{() => <Redirect to="/ptas" />}</Route>
      <Route path="/coalitions/:slug">{() => <Redirect to="/coalitions" />}</Route>
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/">
        {() => <HomeRoute />}
      </Route>
      <Route path="/report">
        {() => <ProtectedRoute component={ReportIncident} />}
      </Route>
      <Route path="/incidents">
        {() => <ProtectedRoute component={IncidentsList} />}
      </Route>
      <Route path="/incidents/:id">
        {() => <ProtectedRoute component={IncidentDetail} />}
      </Route>
      <Route path="/protocols/new">
        {() => <ProtectedRoute component={NewProtocol} />}
      </Route>
      <Route path="/protocols/:id">
        {() => <ProtectedRoute component={ProtocolDetail} />}
      </Route>
      <Route path="/protocols">
        {() => <ProtectedRoute component={ProtocolsList} />}
      </Route>
      <Route path="/class">
        {() => <ProtectedRoute component={MyClass} />}
      </Route>
      <Route path="/alerts">
        {() => <ProtectedRoute component={AlertsList} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={NotificationsList} />}
      </Route>
      <Route path="/learn">
        {() => <ProtectedRoute component={LearnPage} />}
      </Route>
      <Route path="/learn/:id">
        {() => <ProtectedRoute component={LearnLessonPage} />}
      </Route>
      <Route path="/lessons/present/:id">
        {() => (
          <ProtectedRoute
            component={LearnPresentPage}
            allowedRoles={["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"]}
          />
        )}
      </Route>
      <Route path="/lessons">
        {() => (
          <ProtectedRoute
            component={StaffLessons}
            allowedRoles={["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"]}
          />
        )}
      </Route>
      <Route path="/education">
        {() => <ProtectedRoute component={LearnPage} />}
      </Route>
      <Route path="/training">
        {() => <ProtectedRoute component={LearnPage} />}
      </Route>
      <Route path="/messages">
        {() => <ProtectedRoute component={MessagesPage} />}
      </Route>
      <Route path="/caseload">
        {() => <ProtectedRoute component={CaseloadPage} />}
      </Route>
      <Route path="/behaviour">
        {() => <ProtectedRoute component={BehaviourPage} />}
      </Route>
      <Route path="/pta">
        {() => <ProtectedRoute component={PtaPortal} />}
      </Route>
      <Route path="/pta/governance">
        {() => <ProtectedRoute component={PtaGovernance} />}
      </Route>
      <Route path="/pta/decisions">
        {() => <ProtectedRoute component={PtaDecisions} />}
      </Route>
      <Route path="/pta/voting">
        {() => <ProtectedRoute component={PtaVoting} />}
      </Route>
      <Route path="/pta/announcements">
        {() => <ProtectedRoute component={PtaAnnouncements} />}
      </Route>
      <Route path="/pta/initiatives">
        {() => <ProtectedRoute component={PtaInitiatives} />}
      </Route>
      <Route path="/pta-updates">
        {() => <ProtectedRoute component={PtaUpdates} />}
      </Route>
      <Route path="/voice">
        {() => <ProtectedRoute component={VoicePage} />}
      </Route>
      <Route path="/diagnostics/:id/results">
        {() => <ProtectedRoute component={DiagnosticsResults} />}
      </Route>
      <Route path="/diary">
        {() => <ProtectedRoute component={DiaryPage} />}
      </Route>
      <Route path="/learnings">
        {() => <ProtectedRoute component={LearningsPage} />}
      </Route>
      <Route path="/resources-hub">
        {() => <ProtectedRoute component={ResourceCentre} />}
      </Route>
      <Route path="/case-studies">
        {() => <ProtectedRoute component={CaseStudiesPage} />}
      </Route>
      <Route path="/diagnostics">
        {() => <ProtectedRoute component={Diagnostics} />}
      </Route>
      <Route path="/training-status">
        {() => <ProtectedRoute component={TrainingStatusPage} />}
      </Route>
      <Route path="/audit">
        {() => <ProtectedRoute component={AuditPage} allowedRoles={["coordinator", "head_teacher"]} />}
      </Route>
      <Route path="/membership">
        {() => <ProtectedRoute component={MembershipQueuePage} allowedRoles={["pta", "coordinator", "head_teacher"]} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} allowedRoles={["coordinator"]} unauthRedirect="/admin/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Reset scroll to the top on client-side route changes — SPA navigation keeps
// the previous scroll position, so without this a click in the footer lands you
// at the bottom of the next page. Anchor links (#…) are left alone.
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <DemoProvider>
              <ScrollToTop />
              <Router />
              <DemoOverlay />
            </DemoProvider>
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

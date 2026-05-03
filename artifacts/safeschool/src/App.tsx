import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Hooks & Lib
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { DemoProvider, DemoOverlay } from "@/components/demo/DemoWalkthrough";

// Pages
import Login from "@/pages/login";
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
import MessagesPage from "@/pages/messages";
import CaseloadPage from "@/pages/caseload";
import BehaviourPage from "@/pages/behaviour";
import PtaPortal from "@/pages/pta";
import Diagnostics from "@/pages/diagnostics";
import DiagnosticsResults from "@/pages/diagnostics-results";
import DiaryPage from "@/pages/diary";
import LearningsPage from "@/pages/learnings";
import CaseStudiesPage from "@/pages/case-studies";
import HowItWorksPage from "@/pages/how-it-works";
import TrainingStatusPage from "@/pages/training-status";
import AuditPage from "@/pages/audit";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// A simple wrapper to redirect unauthenticated users
function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
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
    window.location.href = "/login";
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
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
      <Route path="/diagnostics/:id/results">
        {() => <ProtectedRoute component={DiagnosticsResults} />}
      </Route>
      <Route path="/diary">
        {() => <ProtectedRoute component={DiaryPage} />}
      </Route>
      <Route path="/learnings">
        {() => <ProtectedRoute component={LearningsPage} />}
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
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <DemoProvider>
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

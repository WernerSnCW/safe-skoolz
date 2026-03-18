import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Hooks & Lib
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ReportIncident from "@/pages/report-incident";
import IncidentsList from "@/pages/incidents";
import IncidentDetail from "@/pages/incidents/detail";
import ProtocolsList from "@/pages/protocols";
import AlertsList from "@/pages/alerts";
import NotificationsList from "@/pages/notifications";
import Settings from "@/pages/settings";
import MyClass from "@/pages/my-class";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// A simple wrapper to redirect unauthenticated users
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

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
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

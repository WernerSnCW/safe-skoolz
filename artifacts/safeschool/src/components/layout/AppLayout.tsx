import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  ShieldCheck, Home, AlertTriangle, FileText, Shield,
  Bell, Settings, LogOut, Menu, X, Users, Activity, BookOpen, MessageCircle, ClipboardList, Gauge, GraduationCap
} from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get notifications count
  const { data: notificationsData } = useListNotifications();
  const unreadCount = notificationsData?.data.filter(n => !n.acknowledgedAt).length || 0;

  if (!user) return <>{children}</>;

  const getNavItems = () => {
    const base = [{ name: "Dashboard", href: "/", icon: Home }];
    
    if (user.role === "pupil") {
      return [
        ...base,
        { name: "Report Incident", href: "/report", icon: AlertTriangle },
        { name: "My Behaviour", href: "/behaviour", icon: Gauge },
        { name: "Training", href: "/training", icon: GraduationCap },
        { name: "Learn", href: "/education", icon: BookOpen },
        { name: "My Settings", href: "/settings", icon: Settings },
      ];
    }
    
    if (user.role === "parent") {
      return [
        ...base,
        { name: "Report Incident", href: "/report", icon: AlertTriangle },
        { name: "Incidents", href: "/incidents", icon: FileText },
        { name: "Behaviour", href: "/behaviour", icon: Gauge },
        { name: "Messages", href: "/messages", icon: MessageCircle },
        { name: "Training", href: "/training", icon: GraduationCap },
        { name: "Learn", href: "/education", icon: BookOpen },
        { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "teacher" || user.role === "head_of_year") {
      return [
        ...base,
        { name: "Log Incident", href: "/report", icon: AlertTriangle },
        { name: "Behaviour", href: "/behaviour", icon: Gauge },
        { name: user.role === "head_of_year" ? "My Year Group" : "My Class", href: "/class", icon: Users },
        { name: "Messages", href: "/messages", icon: MessageCircle },
        { name: "Incidents", href: "/incidents", icon: FileText },
        { name: "Alerts", href: "/alerts", icon: Activity },
        { name: "Training", href: "/training", icon: GraduationCap },
        { name: "Learn", href: "/education", icon: BookOpen },
        { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "support_staff") {
      return [
        ...base,
        { name: "Log Incident", href: "/report", icon: AlertTriangle },
        { name: "Behaviour", href: "/behaviour", icon: Gauge },
        { name: "My Pupils", href: "/class", icon: Users },
        { name: "Messages", href: "/messages", icon: MessageCircle },
        { name: "Training", href: "/training", icon: GraduationCap },
        { name: "Learn", href: "/education", icon: BookOpen },
        { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "senco") {
      return [
        ...base,
        { name: "My Caseload", href: "/caseload", icon: ClipboardList },
        { name: "Behaviour", href: "/behaviour", icon: Gauge },
        { name: "Log Incident", href: "/report", icon: AlertTriangle },
        { name: "Incidents", href: "/incidents", icon: FileText },
        { name: "All Pupils", href: "/class", icon: Users },
        { name: "Messages", href: "/messages", icon: MessageCircle },
        { name: "Protocols", href: "/protocols", icon: Shield },
        { name: "Alerts", href: "/alerts", icon: Activity },
        { name: "Training", href: "/training", icon: GraduationCap },
        { name: "Learn", href: "/education", icon: BookOpen },
        { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    }

    // Coordinator, Head Teacher
    return [
      ...base,
      { name: "Behaviour", href: "/behaviour", icon: Gauge },
      { name: "Log Incident", href: "/report", icon: AlertTriangle },
      { name: "Incidents", href: "/incidents", icon: FileText },
      { name: "All Pupils", href: "/class", icon: Users },
      { name: "Messages", href: "/messages", icon: MessageCircle },
      { name: "Protocols", href: "/protocols", icon: Shield },
      { name: "Alerts", href: "/alerts", icon: Activity },
      { name: "Training", href: "/training", icon: GraduationCap },
      { name: "Learn", href: "/education", icon: BookOpen },
      { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
      { name: "Settings", href: "/settings", icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel fixed h-full z-20 border-r border-border/50">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            SafeSchool
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className="block">
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <div className="flex items-center gap-3 font-medium">
                    <item.icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "text-primary-foreground")} />
                    {item.name}
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-sm mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user.avatarImageUrl ? (
                <img src={user.avatarImageUrl} alt={user.firstName} className="w-full h-full object-cover" />
              ) : (
                user.firstName.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden glass-panel sticky top-0 z-30 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={24} />
          <span className="font-display font-bold text-lg">SafeSchool</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-[68px] z-20 glass-panel border-b border-border shadow-xl p-4 flex flex-col gap-2"
          >
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground font-medium hover:bg-muted">
                  <item.icon size={20} className="text-primary" />
                  {item.name}
                </div>
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive font-medium hover:bg-destructive/10">
              <LogOut size={20} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative min-h-screen pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav (Pupils/Parents generally prefer bottom nav) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 glass-panel border-t border-border/50 pb-safe z-30">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className="flex-1 h-full flex flex-col items-center justify-center relative">
                <div className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  <div className="relative">
                    <item.icon size={22} className={isActive ? "fill-primary/20" : ""} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

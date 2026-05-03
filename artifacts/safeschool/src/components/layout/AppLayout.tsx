import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  ShieldCheck, Home, AlertTriangle, FileText, Shield,
  Bell, Settings, LogOut, Menu, X, Users, Activity, BookOpen, MessageCircle, ClipboardList, Gauge, ClipboardCheck, BookHeart, Megaphone, BookMarked
} from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { useMessageNotifications, useMessageNotificationEngine } from "@/hooks/useMessageNotifications";
import { motion, AnimatePresence } from "framer-motion";

const MOBILE_PRIORITY_HREFS: Record<string, string[]> = {
  pupil: ["/", "/report", "/diary", "/learn"],
  parent: ["/", "/report", "/messages", "/notifications"],
  teacher: ["/", "/report", "/class", "/messages"],
  head_of_year: ["/", "/report", "/class", "/messages"],
  support_staff: ["/", "/report", "/class", "/messages"],
  senco: ["/", "/caseload", "/incidents", "/messages"],
  coordinator: ["/", "/incidents", "/protocols", "/alerts"],
  head_teacher: ["/", "/incidents", "/protocols", "/alerts"],
  pta: ["/pta", "/learn", "/notifications", "/learnings"],
};

function getMobileNavItems(navItems: any[], role: string) {
  const priorityHrefs = MOBILE_PRIORITY_HREFS[role] || MOBILE_PRIORITY_HREFS.teacher;
  const result: any[] = [];
  for (const href of priorityHrefs) {
    const item = navItems.find(n => n.href === href);
    if (item) result.push(item);
  }
  if (result.length < 4) {
    for (const item of navItems) {
      if (!result.includes(item) && result.length < 4) {
        result.push(item);
      }
    }
  }
  return result.slice(0, 5);
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation("nav");

  // Get notifications count
  const { data: notificationsData } = useListNotifications();
  const unreadCount = notificationsData?.data.filter(n => !n.acknowledgedAt).length || 0;

  // Live message notifications (toasts + sound + browser notification)
  const { totalUnread: messageUnread } = useMessageNotifications();
  useMessageNotificationEngine();

  if (!user) return <>{children}</>;

  const role = user.role;

  const getNavItems = (): Array<{ name: string; href: string; icon: any; badge?: number }> => {
    const base = [{ name: t("dashboard"), href: "/", icon: Home }];
    
    if (user.role === "pupil") {
      return [
        ...base,
        { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
        { name: t("myDiary"), href: "/diary", icon: BookHeart },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("myBehaviour"), href: "/behaviour", icon: Gauge },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("mySettings"), href: "/settings", icon: Settings },
      ];
    }
    
    if (user.role === "parent") {
      return [
        ...base,
        { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
        { name: t("incidents"), href: "/incidents", icon: FileText },
        { name: t("behaviour"), href: "/behaviour", icon: Gauge },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
        { name: t("settings"), href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "teacher" || user.role === "head_of_year") {
      return [
        ...base,
        { name: t("logIncident"), href: "/report", icon: AlertTriangle },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("behaviour"), href: "/behaviour", icon: Gauge },
        { name: user.role === "head_of_year" ? t("myYearGroup") : t("myClass"), href: "/class", icon: Users },
        { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        { name: t("incidents"), href: "/incidents", icon: FileText },
        { name: t("alerts"), href: "/alerts", icon: Activity },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
        { name: t("settings"), href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "support_staff") {
      return [
        ...base,
        { name: t("logIncident"), href: "/report", icon: AlertTriangle },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("behaviour"), href: "/behaviour", icon: Gauge },
        { name: t("myPupils"), href: "/class", icon: Users },
        { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
        { name: t("settings"), href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "senco") {
      return [
        ...base,
        { name: t("myCaseload"), href: "/caseload", icon: ClipboardList },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("behaviour"), href: "/behaviour", icon: Gauge },
        { name: t("logIncident"), href: "/report", icon: AlertTriangle },
        { name: t("incidents"), href: "/incidents", icon: FileText },
        { name: t("allPupils"), href: "/class", icon: Users },
        { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        { name: t("protocols"), href: "/protocols", icon: Shield },
        { name: t("alerts"), href: "/alerts", icon: Activity },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
        { name: t("settings"), href: "/settings", icon: Settings },
      ];
    }

    if (user.role === "pta") {
      return [
        { name: t("ptaDashboard"), href: "/pta", icon: Home },
        { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        { name: t("learn"), href: "/learn", icon: BookOpen },
        { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
        { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
        { name: t("settings"), href: "/settings", icon: Settings },
      ];
    }

    // Coordinator, Head Teacher
    return [
      ...base,
      { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
      { name: t("behaviour"), href: "/behaviour", icon: Gauge },
      { name: t("logIncident"), href: "/report", icon: AlertTriangle },
      { name: t("incidents"), href: "/incidents", icon: FileText },
      { name: t("allPupils"), href: "/class", icon: Users },
      { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
      { name: t("protocols"), href: "/protocols", icon: Shield },
      { name: t("alerts"), href: "/alerts", icon: Activity },
      { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
      { name: t("learn"), href: "/learn", icon: BookOpen },
      { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
      { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
      { name: t("settings"), href: "/settings", icon: Settings },
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
            safeskoolz
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
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
            {t("common:signOut")}
          </button>
          <p className="text-center text-[9px] text-muted-foreground/50 mt-3 pb-1">{t("common:poweredByCloudworkz")}</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden glass-panel sticky top-0 z-30 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={24} />
          <span className="font-display font-bold text-lg">safeskoolz</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-foreground"
          aria-label={isMobileMenuOpen ? t("closeNavMenu") : t("openNavMenu")}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
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
              {t("common:signOut")}
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

      {/* Mobile Bottom Nav — role-specific priority items */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 glass-panel border-t border-border/50 pb-safe z-30">
        <div className="flex justify-around items-center h-16 px-2">
          {getMobileNavItems(navItems, role).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
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

import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { LogOut, Menu, X, ExternalLink } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { useMessageNotifications, useMessageNotificationEngine } from "@/hooks/useMessageNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { getNavSections, flattenSections, type NavItem } from "@/components/layout/nav-config";

const MOBILE_PRIORITY_HREFS: Record<string, string[]> = {
  pupil: ["/", "/learn", "/diary", "/messages"],
  parent: ["/", "/report", "/messages", "/notifications"],
  teacher: ["/", "/report", "/class", "/messages"],
  head_of_year: ["/", "/report", "/class", "/messages"],
  support_staff: ["/", "/report", "/class", "/messages"],
  senco: ["/", "/caseload", "/incidents", "/messages"],
  coordinator: ["/", "/incidents", "/protocols", "/alerts"],
  head_teacher: ["/", "/incidents", "/protocols", "/alerts"],
  pta: ["/pta", "/learn", "/notifications", "/learnings"],
};

function getMobileNavItems(navItems: NavItem[], role: string) {
  const priorityHrefs = MOBILE_PRIORITY_HREFS[role] || MOBILE_PRIORITY_HREFS.teacher;
  const result: NavItem[] = [];
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

// Single sidebar row — shared by the grouped sections and the pinned footer.
function NavRow({ item, location }: { item: NavItem; location: string }) {
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} className="block">
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
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

  const { sections, footer } = getNavSections(role, t, { messageUnread, unreadCount });
  const navItems = flattenSections(sections); // mobile priority + dropdown

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel fixed h-full z-20 border-r border-border/50">
        <div className="p-6 flex items-center border-b border-border/50">
          <BrandLockup size="md" />
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {sections.map((section, i) => (
            <div key={section.label ?? `s${i}`} className={cn(section.label && "pt-3")}>
              {section.label && (
                <p className="px-4 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => <NavRow key={item.name} item={item} location={location} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="space-y-1 mb-2">
            {footer.map((item) => <NavRow key={item.name} item={item} location={location} />)}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
            >
              <ExternalLink size={18} />
              SchoolVBE
            </a>
          </div>
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
        <BrandLockup size="sm" />
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
          {children}
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

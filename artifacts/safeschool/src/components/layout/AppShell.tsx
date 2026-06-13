import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { buttonVariants } from "@/components/ui/button";
import { LogOut, Menu, X, ExternalLink } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { useMessageNotifications, useMessageNotificationEngine } from "@/hooks/useMessageNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { getNav, flattenSections, type NavItem } from "@/components/layout/nav-config";
import { GlobalLauncher } from "@/components/layout/GlobalLauncher";
import { useTenant } from "@/providers/tenant";
import { getMembershipState } from "@/lib/membership";

// ─── Module-scope helpers (inlined from AppLayout to avoid duplicate-symbol
//     issues while both files coexist during this task) ───────────────────────

const APPSHELL_MOBILE_PRIORITY_HREFS: Record<string, string[]> = {
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

function getAuthedMobileNavItems(navItems: NavItem[], role: string) {
  const priorityHrefs =
    APPSHELL_MOBILE_PRIORITY_HREFS[role] || APPSHELL_MOBILE_PRIORITY_HREFS.teacher;
  const result: NavItem[] = [];
  for (const href of priorityHrefs) {
    const item = navItems.find((n) => n.href === href);
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
  const isActive =
    location === item.href ||
    (item.href !== "/" && location.startsWith(item.href + "/"));

  if (item.state === "soon" || item.state === "locked") {
    return (
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl text-muted-foreground/60 cursor-default select-none"
        title={
          item.state === "soon"
            ? "Available — switched on as your school adopts VBE"
            : "Unlocks once you're an approved member"
        }
      >
        <div className="flex items-center gap-3 font-medium">
          <item.icon size={20} />
          <span className="flex-1 text-sm">{item.name}</span>
        </div>
        <span className="text-[9px] uppercase tracking-wide rounded-full border border-border px-1.5 py-0.5">
          {item.state === "soon" ? "soon" : "🔒"}
        </span>
      </div>
    );
  }

  return (
    <Link href={item.href} className="block">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <div className="flex items-center gap-3 font-medium">
          <item.icon
            size={20}
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              isActive && "text-primary-foreground",
            )}
          />
          {item.name}
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isActive
                ? "bg-primary-foreground text-primary"
                : "bg-destructive text-destructive-foreground",
            )}
          >
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── AuthedShell — verbatim lift of AppLayout body ──────────────────────────

function AuthedShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation("nav");

  // Get notifications count
  const { data: notificationsData } = useListNotifications();
  const unreadCount =
    notificationsData?.data.filter((n) => !n.acknowledgedAt).length || 0;

  // Live message notifications (toasts + sound + browser notification)
  const { totalUnread: messageUnread } = useMessageNotifications();
  useMessageNotificationEngine();

  const { tenant } = useTenant();

  if (!user) return <>{children}</>;

  const role = user.role;

  const capabilities = (tenant?.capabilities ?? {
    learn: true,
    diagnostic: true,
    voice: true,
    membership: true,
    results: true,
    concerns: true,
    pta: true,
    safeguarding: true,
    lessons: true,
    behaviour: true,
  }) as any; // fallback all-on so staff navs are unaffected before tenant loads
  const displayName = tenant?.displayName ?? "";
  const slug = tenant?.slug ?? "";
  const membershipState = getMembershipState(user);
  const { sections, footer } = getNav({
    membershipState,
    role,
    capabilities,
    displayName,
    slug,
    t,
    counts: { messageUnread, unreadCount },
  });
  const navItems = flattenSections(sections).filter(
    (i) => i.state !== "soon" && i.state !== "locked",
  ); // mobile priority + dropdown

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel fixed h-full z-20 border-r border-border/50">
        <div className="p-6 flex items-center border-b border-border/50">
          <BrandLockup size="md" />
        </div>

        <div className="px-4 pt-4">
          <GlobalLauncher />
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {sections.map((section, i) => (
            <div key={section.label ?? `s${i}`} className={cn(section.label && "pt-3")}>
              {section.label && (
                <p className="px-4 pb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavRow key={item.name} item={item} location={location} />
                ))}
              </div>
            </div>
          ))}
          {/* Secondary nav (Resource Centre, Notifications, Settings) + back-to-site
              live INSIDE the scroll so a heavy footer can't squeeze the main nav
              into a cramped, scrolled sliver. Only identity + sign-out stay pinned. */}
          <div className="pt-3 mt-2 border-t border-border/50 space-y-1">
            {footer.map((item) => (
              <NavRow key={item.name} item={item} location={location} />
            ))}
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
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-sm mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user.avatarImageUrl ? (
                <img
                  src={user.avatarImageUrl}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.firstName.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
          >
            <LogOut size={20} />
            {t("common:signOut")}
          </button>
          <p className="text-center text-[9px] text-muted-foreground/50 mt-3 pb-1">
            {t("common:poweredByCloudworkz")}
          </p>
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
          {isMobileMenuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
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
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground font-medium hover:bg-muted">
                  <item.icon size={20} className="text-primary" />
                  {item.name}
                </div>
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive font-medium hover:bg-destructive/10"
            >
              <LogOut size={20} />
              {t("common:signOut")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative min-h-screen pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pt-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav — role-specific priority items */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 glass-panel border-t border-border/50 pb-safe z-30">
        <div className="flex justify-around items-center h-16 px-2">
          {getAuthedMobileNavItems(navItems, role).map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href + "/"));
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 h-full flex flex-col items-center justify-center relative"
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="relative">
                    <item.icon
                      size={22}
                      className={isActive ? "fill-primary/20" : ""}
                    />
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

// ─── PublicShell — lifted from PublicLayout, nav from getNav anon branch,
//     Option-C naming, SSR-safe ────────────────────────────────────────────────

// Multi-column marketing footer (lifted verbatim from PublicLayout FOOTER const,
// with Option-C naming: "Log in to vibez" → "Log in", copyright text → Vibes).
const PUBLIC_FOOTER: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "For schools", href: "/schools" },
      { label: "For parents", href: "/parents" },
      { label: "For PTAs", href: "/ptas" },
      { label: "For pupils", href: "/pupils" },
      { label: "Parent groups", href: "/coalitions" },
    ],
  },
  {
    heading: "Tools & resources",
    links: [
      { label: "VBE readiness diagnostic", href: "/diagnostic" },
      { label: "The learning centre", href: "/learning" },
      { label: "Safeguarding & reporting", href: "/safeguarding" },
      { label: "Free resources", href: "/resources" },
      { label: "Illustrative case study", href: "/schools/case-study" },
      { label: "About", href: "/about" },
    ],
  },
  {
    heading: "Platform",
    // Option-C: "Log in to vibez" → "Log in"
    links: [{ label: "Log in", href: "/login" }],
  },
];

function PublicShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { tenant } = useTenant();

  // Nav from getNav anon branch — single source of truth.
  const { sections, footer } = getNav({
    membershipState: "anon",
    role: "",
    capabilities: {} as any,
    displayName: tenant?.displayName ?? "",
    slug: tenant?.slug ?? "",
    t: ((k: string) => k) as any,
    counts: { messageUnread: 0, unreadCount: 0 },
  });
  const navItems = sections[0]?.items ?? [];

  // Option-C CTA: "Try vibez" → "Log in"; if tenant present → "Join"
  const ctaLabel = tenant?.slug ? "Join" : "Log in";
  const ctaHref = tenant?.slug ? `/s/${tenant.slug}` : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Option-C: replace hardcoded "SchoolVBE" wordmark with BrandLockup */}
          <Link href="/" className="flex items-center gap-2" aria-label="Vibes home">
            <BrandLockup size="md" />
          </Link>

          {/* Desktop nav bar — from getNav anon items */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Right-side actions from getNav footer (Find your school / Log in / Join) */}
            {footer.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                {item.name}
              </Link>
            ))}
            {/* Option-C CTA — "Try vibez" → "Log in" or "Join" if tenant present */}
            <Link href={ctaHref} className={cn(buttonVariants({ size: "sm" }))}>
              {ctaLabel}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown — navItems + footer (replaces old NAV + MOBILE_TOOLS) */}
        {menuOpen && (
          <div className="border-t border-border/60 bg-background">
            <nav className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <p className="mb-1 mt-4 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Account
              </p>
              <div className="flex flex-col gap-1">
                {footer.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              {/* Option-C: "SchoolVBE" heading → "Vibes" */}
              <span className="font-display text-lg font-bold text-primary">Vibes</span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                New School Vibez, Old School Values
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Free tools for values-led school communities.
              </p>
            </div>
            {PUBLIC_FOOTER.map((col) => (
              <div key={col.heading}>
                <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Option-C: "© 2026 SchoolVBE. Everything here is free." → "© 2026 Vibes — software for VBE." */}
          <div className="mt-10 border-t border-border/60 pt-6 text-sm text-muted-foreground">
            © 2026 Vibes — software for VBE.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── AppShell — public entry point ───────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <AuthedShell>{children}</AuthedShell>;
  return <PublicShell>{children}</PublicShell>;
}

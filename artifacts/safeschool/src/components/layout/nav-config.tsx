import {
  ShieldCheck, Home, AlertTriangle, FileText, Shield, Bell, Settings,
  Users, Activity, BookOpen, MessageCircle, ClipboardList, Gauge,
  ClipboardCheck, BookHeart, Megaphone, BookMarked, ScrollText, Presentation,
  Library, Vote, Rocket, Target,
  HelpCircle, School, Heart, GraduationCap, LogIn, Search,
} from "lucide-react";
import type { Capabilities } from "@workspace/api-client-react";
import type { MembershipState } from "@/lib/membership";

export type NavItemState = "live" | "locked" | "soon";
export type NavItem = { name: string; href: string; icon: any; badge?: number; state?: NavItemState };
export type NavSection = { label: string | null; items: NavItem[] };

// Grouped, ordered nav for the authed sidebar. Preserves every item/href/icon
// the flat lists used before — only adds grouping + order. Footer items
// (Notifications, Settings) are returned separately so AppLayout can pin them.
// t = i18next nav-namespace translator; counts passed in from AppLayout.
export function getRoleNavSections(
  role: string,
  t: (k: string) => string,
  counts: { messageUnread: number; unreadCount: number },
): { sections: NavSection[]; footer: NavItem[] } {
  const { messageUnread, unreadCount } = counts;
  const home: NavItem = { name: t("dashboard"), href: "/", icon: Home };
  const footer: NavItem[] = [
    { name: "Resource Centre", href: "/resources-hub", icon: Library },
    { name: t("notifications"), href: "/notifications", icon: Bell, badge: unreadCount },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];

  if (role === "pupil") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Wellbeing", items: [
          { name: t("myDiary"), href: "/diary", icon: BookHeart },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
        ]},
        { label: "Safeguarding", items: [
          { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
        ]},
        { label: "People", items: [
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "parent") {
    return {
      sections: [
        { label: null, items: [
          home,
          { name: "Parent VOICE", href: "/voice", icon: Vote },
        ]},
        { label: "Safeguarding", items: [
          { name: t("reportIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
          { name: "PTA Updates", href: "/pta-updates", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "teacher" || role === "head_of_year" || role === "support_staff") {
    const classItem: NavItem =
      role === "support_staff"
        ? { name: t("myPupils"), href: "/class", icon: Users }
        : { name: role === "head_of_year" ? t("myYearGroup") : t("myClass"), href: "/class", icon: Users };
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          ...(role !== "support_staff" ? [{ name: t("alerts"), href: "/alerts", icon: Activity }] : []),
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          classItem,
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "senco") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("myCaseload"), href: "/caseload", icon: ClipboardList },
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          { name: t("protocols"), href: "/protocols", icon: Shield },
          { name: t("alerts"), href: "/alerts", icon: Activity },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("allPupils"), href: "/class", icon: Users },
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
      ],
      footer,
    };
  }

  if (role === "pta") {
    return {
      sections: [
        { label: "PTA", items: [
          { name: t("ptaDashboard"), href: "/pta", icon: Home },
          { name: "Parent VOICE", href: "/voice", icon: Vote },
          { name: "Members & Officers", href: "/pta/governance", icon: ShieldCheck },
          { name: "Charter", href: "/pta/charter", icon: FileText },
          { name: "Decision Log", href: "/pta/decisions", icon: ScrollText },
          { name: "Voting", href: "/pta/voting", icon: ClipboardList },
          { name: "Initiatives", href: "/pta/initiatives", icon: Rocket },
          { name: "Goals", href: "/pta/goals", icon: Target },
          { name: "Announcements", href: "/pta/announcements", icon: Megaphone },
        ]},
        { label: "Wellbeing", items: [
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
      ],
      footer,
    };
  }

  if (role === "coordinator" || role === "head_teacher") {
    return {
      sections: [
        { label: null, items: [home] },
        { label: "Safeguarding", items: [
          { name: t("logIncident"), href: "/report", icon: AlertTriangle },
          { name: t("incidents"), href: "/incidents", icon: FileText },
          { name: t("protocols"), href: "/protocols", icon: Shield },
          { name: t("alerts"), href: "/alerts", icon: Activity },
        ]},
        { label: "Wellbeing", items: [
          { name: t("behaviour"), href: "/behaviour", icon: Gauge },
          { name: t("noticeboard"), href: "/learnings", icon: Megaphone },
        ]},
        { label: "Learning", items: [
          { name: t("lessons"), href: "/lessons", icon: Presentation },
          { name: t("learn"), href: "/learn", icon: BookOpen },
          { name: t("caseStudies"), href: "/case-studies", icon: BookMarked },
          { name: t("diagnostic"), href: "/diagnostics", icon: ClipboardCheck },
        ]},
        { label: "People", items: [
          { name: t("allPupils"), href: "/class", icon: Users },
          { name: "Parent VOICE", href: "/voice", icon: Vote },
          { name: t("messages"), href: "/messages", icon: MessageCircle, badge: messageUnread },
        ]},
        { label: "Admin", items: [
          { name: t("auditLog"), href: "/audit", icon: ScrollText },
          ...(role === "coordinator" ? [{ name: t("admin"), href: "/admin", icon: ShieldCheck }] : []),
        ]},
      ],
      footer,
    };
  }

  // Fallback: home only
  return { sections: [{ label: null, items: [home] }], footer };
}

// ---------------------------------------------------------------------------
// Off-capability "More of Vibes" block
// ---------------------------------------------------------------------------
function moreOfVibesSection(capabilities: Capabilities, displayName: string): NavSection | null {
  const candidates: Array<{ key: keyof Capabilities; name: string; href: string; icon: any }> = [
    { key: "safeguarding", name: "Safeguarding", href: "/report", icon: ShieldCheck },
    { key: "lessons", name: "Lessons & PSHE", href: "/learn", icon: BookOpen },
    { key: "behaviour", name: "Behaviour", href: "/behaviour", icon: Activity },
  ];
  const off = candidates.filter(c => capabilities[c.key] === false);
  if (off.length === 0) return null;
  return {
    label: `More of Vibes — switched on as ${displayName} adopts`,
    items: off.map(c => ({ name: c.name, href: c.href, icon: c.icon, state: "soon" as const })),
  };
}

// ---------------------------------------------------------------------------
// Community (parent / pta) state-aware nav
// ---------------------------------------------------------------------------
function communityNav(
  membershipState: MembershipState,
  capabilities: Capabilities,
  displayName: string,
  slug: string,
  t: (k: string) => string,
  counts: { messageUnread: number; unreadCount: number },
): { sections: NavSection[]; footer: NavItem[] } {
  const isExec = membershipState === "exec";
  const isPending = membershipState === "pending";
  const lockIfPending = (item: NavItem): NavItem =>
    isPending ? { ...item, state: "locked" } : { ...item, state: "live" };

  const sections: NavSection[] = [];
  sections.push({ label: null, items: [{ name: t("dashboard"), href: "/", icon: Home, state: "live" }] });

  if (capabilities.learn) {
    sections.push({ label: "Learn VBE", items: [
      { name: "What VBE is & why", href: "/learn", icon: BookOpen, state: "live" },
      { name: "Resources", href: "/resources-hub", icon: Library, state: "live" },
    ]});
  }

  const picture: NavItem[] = [];
  if (capabilities.diagnostic) picture.push({ name: "Diagnostic", href: `/d/${slug}`, icon: Gauge, state: "live" });
  if (capabilities.results) picture.push(lockIfPending({ name: "Results", href: `/results/${slug}`, icon: Activity }));
  if (picture.length) sections.push({ label: "The picture", items: picture });

  const community: NavItem[] = [];
  if (capabilities.voice) community.push({ name: "The ask & backing", href: "/voice", icon: Vote, state: "live" });
  if (capabilities.concerns) community.push({ name: "Concerns", href: "/concerns", icon: MessageCircle, state: "live" });
  if (isExec && capabilities.membership) community.push({ name: "Members", href: "/membership", icon: Users, state: "live" });
  if (community.length) sections.push({ label: "Your community", items: community });

  if (capabilities.pta) {
    const pta: NavItem[] = [
      lockIfPending({ name: "Goals", href: "/pta/goals", icon: Target }),
      lockIfPending({ name: "Initiatives", href: "/pta/initiatives", icon: Rocket }),
      lockIfPending({ name: "Decisions", href: "/pta/decisions", icon: ClipboardList }),
      lockIfPending({ name: "Announcements", href: "/pta/announcements", icon: Megaphone }),
    ];
    if (isExec) {
      pta.push({ name: "Voting", href: "/pta/voting", icon: Vote, state: "live" });
      pta.push({ name: "Charter", href: "/pta/charter", icon: ScrollText, state: "live" });
    }
    sections.push({ label: "PTA", items: pta });
  }

  const more = moreOfVibesSection(capabilities, displayName);
  if (more) sections.push(more);

  const footer: NavItem[] = [
    { name: t("notifications"), href: "/notifications", icon: Bell, badge: counts.unreadCount },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];
  return { sections, footer };
}

// The anonymous (marketing) nav — top-level audience + tool entries for the
// top-nav presentation, plus right-side actions. All hrefs are existing routes.
// The big multi-column marketing footer lives in AppShell (lifted from
// PublicLayout); getNav only supplies the bar items + actions here.
function marketingNav(
  displayName: string,
  slug: string,
): { sections: NavSection[]; footer: NavItem[] } {
  const items: NavItem[] = [
    { name: "How it works", href: "/how-it-works", icon: HelpCircle, state: "live" },
    { name: "For schools", href: "/schools", icon: School, state: "live" },
    { name: "For parents", href: "/parents", icon: Users, state: "live" },
    { name: "For PTAs", href: "/ptas", icon: Heart, state: "live" },
    { name: "For pupils", href: "/pupils", icon: GraduationCap, state: "live" },
    { name: "Learn", href: "/learn", icon: BookOpen, state: "live" },
    { name: "Diagnostic", href: "/diagnostic", icon: Gauge, state: "live" },
  ];
  const footer: NavItem[] = [
    { name: "Find your school", href: "/find-school", icon: Search, state: "live" },
    { name: "Log in", href: "/login", icon: LogIn, state: "live" },
  ];
  if (slug) {
    footer.unshift({ name: "Join", href: `/s/${slug}`, icon: LogIn, state: "live" });
  }
  return { sections: [{ label: null, items }], footer };
}

// ---------------------------------------------------------------------------
// State-aware dispatcher — entry point for Task 11 AppLayout migration
// ---------------------------------------------------------------------------
export function getNav(args: {
  membershipState: MembershipState;
  role: string;
  capabilities: Capabilities;
  displayName: string;
  slug: string;
  t: (k: string) => string;
  counts: { messageUnread: number; unreadCount: number };
}): { sections: NavSection[]; footer: NavItem[] } {
  const { membershipState, role, capabilities, displayName, slug, t, counts } = args;
  if (membershipState === "anon") {
    return marketingNav(displayName, slug);
  }
  if (role === "parent" || role === "pta") {
    return communityNav(membershipState, capabilities, displayName, slug, t, counts);
  }
  const base = getRoleNavSections(role, t, counts);
  const sections: NavSection[] = base.sections.map(s => ({
    ...s,
    items: s.items.map(i => ({ ...i, state: "live" as const })),
  }));
  const more = moreOfVibesSection(capabilities, displayName);
  if (more) sections.push(more);
  return { sections, footer: base.footer };
}

// Flatten for the mobile bottom-nav priority logic + dropdown (preserves behaviour).
export function flattenSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

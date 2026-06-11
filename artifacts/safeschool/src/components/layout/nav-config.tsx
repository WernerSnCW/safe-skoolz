import {
  ShieldCheck, Home, AlertTriangle, FileText, Shield, Bell, Settings,
  Users, Activity, BookOpen, MessageCircle, ClipboardList, Gauge,
  ClipboardCheck, BookHeart, Megaphone, BookMarked, ScrollText, Presentation,
} from "lucide-react";

export type NavItem = { name: string; href: string; icon: any; badge?: number };
export type NavSection = { label: string | null; items: NavItem[] };

// Grouped, ordered nav for the authed sidebar. Preserves every item/href/icon
// the flat lists used before — only adds grouping + order. Footer items
// (Notifications, Settings) are returned separately so AppLayout can pin them.
// t = i18next nav-namespace translator; counts passed in from AppLayout.
export function getNavSections(
  role: string,
  t: (k: string) => string,
  counts: { messageUnread: number; unreadCount: number },
): { sections: NavSection[]; footer: NavItem[] } {
  const { messageUnread, unreadCount } = counts;
  const home: NavItem = { name: t("dashboard"), href: "/", icon: Home };
  const footer: NavItem[] = [
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
        { label: null, items: [home] },
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
          { name: "Members & Officers", href: "/pta/governance", icon: ShieldCheck },
          { name: "Decision Log", href: "/pta/decisions", icon: ScrollText },
          { name: "Voting", href: "/pta/voting", icon: ClipboardList },
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

// Flatten for the mobile bottom-nav priority logic + dropdown (preserves behaviour).
export function flattenSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

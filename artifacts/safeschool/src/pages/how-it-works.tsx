import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ArrowRight, ArrowLeft, BookOpen, Users, Bell,
  Heart, Eye, AlertTriangle, TrendingDown, BarChart3, Megaphone,
  MessageSquare, Shield, ChevronDown, ChevronUp, Sparkles,
  UserCircle, GraduationCap, ClipboardCheck, BookHeart,
  FileText, Activity, Gauge, Send, Search, Zap, CheckCircle2,
  ArrowDown, MousePointerClick, Hand, ChevronRight
} from "lucide-react";

interface StoryStep {
  id: string;
  week: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
  narrative: string;
  screens: {
    role: string;
    roleIcon: any;
    roleColor: string;
    page: string;
    pageIcon: any;
    title: string;
    description: string;
    mockupElements: { type: "mood" | "form" | "alert" | "chart" | "notification" | "badge" | "action" | "timeline"; content: string; color?: string }[];
  }[];
}

const STEPS: StoryStep[] = [
  {
    id: "first-signs",
    week: "Week 1",
    title: "Something small happens",
    subtitle: "A single comment at lunch. Nobody thinks much of it.",
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    borderColor: "border-teal-200 dark:border-teal-800",
    icon: BookHeart,
    narrative: "Marcus calls Sofia stupid at lunch. A lunchtime supervisor sees it and logs it as a verbal incident. On its own, it looks minor. Sofia goes home and writes in her diary.",
    screens: [
      {
        role: "Lunchtime supervisor",
        roleIcon: GraduationCap,
        roleColor: "text-indigo-600",
        page: "Report Incident",
        pageIcon: FileText,
        title: "A single verbal incident is logged",
        description: "The supervisor logs what she saw. It takes 60 seconds. At this stage, it looks like a one-off comment between children.",
        mockupElements: [
          { type: "form", content: "Category: Verbal" },
          { type: "form", content: "Who was involved: Marcus \u2192 Sofia" },
          { type: "form", content: "\"Called her stupid at the lunch table. Sofia looked upset but carried on eating.\"" },
          { type: "badge", content: "Incident CS1-001 logged. Tier 1 \u2014 no escalation required.", color: "teal" },
        ],
      },
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Feelings Diary",
        pageIcon: BookHeart,
        title: "Sofia writes in her private diary",
        description: "Nobody else can see her diary. No teacher, parent, or coordinator has access. But the system quietly tracks her mood over time.",
        mockupElements: [
          { type: "mood", content: "\ud83d\ude10 Okay \u2014 3/5", color: "amber" },
          { type: "form", content: "\"Marcus said something mean at lunch. I didn't like it but it's probably nothing.\"" },
          { type: "badge", content: "Entry saved. This is private \u2014 only you can see it.", color: "teal" },
        ],
      },
      {
        role: "System",
        roleIcon: Zap,
        roleColor: "text-blue-600",
        page: "Pattern Engine",
        pageIcon: Activity,
        title: "The system records \u2014 but doesn't alert",
        description: "One incident, one diary entry. No pattern yet. The data is stored and waiting.",
        mockupElements: [
          { type: "chart", content: "Sofia: 1 incident as victim \u2022 Marcus: 1 incident as instigator" },
          { type: "badge", content: "No alerts triggered. Monitoring.", color: "teal" },
        ],
      },
    ],
  },
  {
    id: "escalates",
    week: "Weeks 2\u20133",
    title: "It happens again. And again.",
    subtitle: "Three more incidents from two different teachers. Marcus is recruiting.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    icon: FileText,
    narrative: "Week 2: Ms Rivera sees Marcus push Sofia in the corridor. She logs it. Week 3: Mr Davies sees Tyler exclude Sofia from group work \u2014 and notices Marcus watching from across the room. A different pupil anonymously reports that Jayden filmed Sofia being tripped.",
    screens: [
      {
        role: "Ms Rivera (teacher)",
        roleIcon: GraduationCap,
        roleColor: "text-indigo-600",
        page: "Report Incident",
        pageIcon: FileText,
        title: "Second incident \u2014 different teacher, physical this time",
        description: "Ms Rivera logs a physical incident. She doesn't know about the verbal incident from Week 1 \u2014 a different staff member logged that one.",
        mockupElements: [
          { type: "form", content: "Category: Physical" },
          { type: "form", content: "Who was involved: Marcus pushed Sofia in the corridor" },
          { type: "form", content: "Victim emotional state: Upset, crying" },
          { type: "badge", content: "Incident CS1-002 logged. Tier 2 \u2014 coordinator auto-notified.", color: "indigo" },
          { type: "alert", content: "Protocol guidance shown: \"This is a Tier 2 physical incident. Follow the Convivèxit process. Check for injuries. Separate the children.\"", color: "amber" },
        ],
      },
      {
        role: "Mr Davies (teacher)",
        roleIcon: GraduationCap,
        roleColor: "text-indigo-600",
        page: "Report Incident",
        pageIcon: FileText,
        title: "Third incident \u2014 a third teacher sees exclusion",
        description: "Mr Davies sees Tyler excluding Sofia from group work, with Marcus watching approvingly. He doesn't know Marcus pushed her last week. He logs it as relational.",
        mockupElements: [
          { type: "form", content: "Category: Relational" },
          { type: "form", content: "Who was involved: Tyler excluded Sofia from group work. Marcus was observing." },
          { type: "badge", content: "Incident CS1-003 logged.", color: "indigo" },
        ],
      },
      {
        role: "Anonymous pupil",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Report a Concern",
        pageIcon: FileText,
        title: "Fourth report \u2014 anonymous, from a pupil",
        description: "A classmate reports anonymously that Jayden has been filming Sofia being bullied and sharing it in a group chat.",
        mockupElements: [
          { type: "form", content: "\"Jayden filmed Sofia getting tripped and put it in the group chat. Everyone saw it.\"" },
          { type: "badge", content: "Anonymous report received. Category: Online. Tier 2.", color: "indigo" },
        ],
      },
      {
        role: "Sofia's mum (parent)",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "At home",
        pageIcon: Users,
        title: "At home, something is clearly wrong",
        description: "Sofia doesn't want to go to school. She mentions Marcus but says \"it's nothing\". Her mum is worried but has no evidence.",
        mockupElements: [
          { type: "timeline", content: "Week 2: \"I don't want to go tomorrow\" \u2014 but won't say why" },
          { type: "timeline", content: "Week 3: Stopped talking about school completely" },
          { type: "timeline", content: "Week 3: Found Sofia crying in her room after checking her phone" },
        ],
      },
    ],
  },
  {
    id: "pattern",
    week: "Week 3",
    title: "safeskoolz connects the dots",
    subtitle: "No single teacher saw the full picture. The system did.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
    narrative: "Four incidents logged by three different staff members and one anonymous pupil. No individual saw more than one event. But safeskoolz links them all: same victim, escalating severity, group forming around a ringleader, and a mood that's falling off a cliff.",
    screens: [
      {
        role: "System",
        roleIcon: Zap,
        roleColor: "text-red-600",
        page: "Pattern Alerts",
        pageIcon: Activity,
        title: "Three pattern alerts fire simultaneously",
        description: "The pattern detection engine links incidents across different reporters. No human could have connected these \u2014 they were logged by different staff on different days.",
        mockupElements: [
          { type: "alert", content: "\ud83d\udea8 RED: Same victim in 4 incidents \u2014 Sofia has been targeted in 4 separate incidents over 3 weeks, logged by 3 different staff", color: "red" },
          { type: "alert", content: "\ud83d\udea8 RED: Group targeting detected \u2014 Marcus (ringleader), Tyler (recruited Week 3), Jayden (recruited Week 3) acting together", color: "red" },
          { type: "alert", content: "\ud83d\udea8 AMBER: Escalating severity \u2014 Pattern has escalated from verbal (Week 1) \u2192 physical (Week 2) \u2192 relational + online (Week 3)", color: "amber" },
        ],
      },
      {
        role: "System",
        roleIcon: TrendingDown,
        roleColor: "text-blue-600",
        page: "Mood Analysis",
        pageIcon: BookHeart,
        title: "Diary mood decline detected",
        description: "Nobody has read Sofia's diary. But the system tracks the trend. Her mood has dropped from 3 to 1 in two weeks \u2014 a sustained decline that triggers a welfare flag.",
        mockupElements: [
          { type: "chart", content: "Week 1: \ud83d\ude10 3/5 \u2022 Week 2: \ud83d\ude1f 2/5 \u2022 Week 3: \ud83d\ude22 1/5" },
          { type: "alert", content: "\ud83d\udea8 AMBER: Sustained mood decline \u2014 average mood \u22642 over 5+ entries. SENCO + coordinator alerted.", color: "amber" },
        ],
      },
    ],
  },
  {
    id: "coordinator",
    week: "Week 4",
    title: "Mrs Chen sees the full picture",
    subtitle: "Four incidents. Three reporters. One clear pattern. One screen.",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Shield,
    narrative: "Mrs Chen opens her coordinator dashboard. She doesn't see four unrelated incidents. She sees a ringleader who recruited two others, an escalating pattern from words to physical to online, and a child whose mood is collapsing. She initiates the Convivèxit protocol.",
    screens: [
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Coordinator Dashboard",
        pageIcon: BarChart3,
        title: "Everything connected on one screen",
        description: "Incidents, pattern alerts, diary mood trends, and behaviour points \u2014 linked together. Mrs Chen can see the full timeline of how Marcus recruited Tyler and Jayden.",
        mockupElements: [
          { type: "badge", content: "4 active alerts \u2022 4 linked incidents \u2022 1 mood decline flag \u2022 1 anonymous report", color: "purple" },
          { type: "chart", content: "Sofia: 4 incidents (verbal \u2192 physical \u2192 relational \u2192 online) \u2022 Severity: escalating" },
          { type: "timeline", content: "Week 1: Marcus alone \u2192 Week 2: Marcus alone (physical) \u2192 Week 3: Marcus + Tyler + Jayden (group)" },
        ],
      },
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Behaviour Tracker",
        pageIcon: Gauge,
        title: "Behaviour points tell the story",
        description: "Marcus has accumulated the most points as the instigator across all four incidents. Tyler and Jayden have fewer \u2014 they were recruited, not ringleaders. This distinction matters for the intervention.",
        mockupElements: [
          { type: "badge", content: "Marcus: 14 pts \u2014 Level 4 (Formal Warning + parent meeting)", color: "red" },
          { type: "badge", content: "Tyler: 5 pts \u2014 Level 2 (Verbal Warning)", color: "amber" },
          { type: "badge", content: "Jayden: 4 pts \u2014 Level 2 (Verbal Warning)", color: "amber" },
          { type: "badge", content: "Convivèxit protocol initiated \u2014 interviews scheduled", color: "purple" },
        ],
      },
    ],
  },
  {
    id: "intervene",
    week: "Weeks 4\u20135",
    title: "The school intervenes \u2014 differently for each child",
    subtitle: "Sofia gets a safe adult. Marcus's parents are called in. Tyler and Jayden get support.",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    narrative: "The Convivèxit protocol drives different actions for each child. Sofia gets a named safe adult. Marcus's parents are called for a formal meeting. Tyler and Jayden receive restorative conversations \u2014 the data shows they were coerced, not leading. Sofia's mum receives a private notification that the school has acted.",
    screens: [
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Messages",
        pageIcon: MessageSquare,
        title: "Sofia gets a named safe adult",
        description: "Ms Rivera is assigned as Sofia's safe adult. Sofia can message her privately through the platform, any time she needs to talk.",
        mockupElements: [
          { type: "notification", content: "You have a new safe contact: Ms Rivera. You can message her any time.", color: "teal" },
          { type: "form", content: "Message: \"Hi Ms Rivera, can I talk to you at break?\"" },
          { type: "badge", content: "Message delivered securely", color: "teal" },
        ],
      },
      {
        role: "Sofia's mum (parent)",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "Notifications",
        pageIcon: Bell,
        title: "Sofia's mum is notified privately",
        description: "This is a targeted notification to Sofia's parents only \u2014 not a broadcast to all 47 families. It confirms the school has identified the problem and is acting.",
        mockupElements: [
          { type: "notification", content: "We are writing to let you know that a pattern of targeted behaviour towards Sofia has been identified and addressed. A Convivèxit protocol has been initiated. Sofia has been assigned a named safe adult (Ms Rivera). We would welcome the opportunity to discuss this with you.", color: "blue" },
          { type: "action", content: "Acknowledge \u00b7 Request meeting", color: "teal" },
        ],
      },
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Protocol Tracker",
        pageIcon: ClipboardCheck,
        title: "Each child gets a proportionate response",
        description: "The Convivèxit protocol requires different actions for ringleaders vs recruited participants. safeskoolz tracks each task and deadline.",
        mockupElements: [
          { type: "badge", content: "Marcus: Formal parent meeting \u2022 Behaviour contract \u2022 Daily check-in with Head of Year", color: "red" },
          { type: "badge", content: "Tyler: Restorative conversation with Sofia (with consent) \u2022 Mentoring sessions", color: "amber" },
          { type: "badge", content: "Jayden: Restorative conversation \u2022 Online safety session \u2022 Phone use reviewed", color: "amber" },
          { type: "badge", content: "Sofia: Safe adult assigned \u2022 Daily wellbeing check-in \u2022 Break/lunch buddy system", color: "teal" },
        ],
      },
    ],
  },
  {
    id: "diagnostics",
    week: "Week 6",
    title: "The school checks the bigger picture",
    subtitle: "Was Sofia's case isolated? Or is there a wider culture problem?",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: ClipboardCheck,
    narrative: "Sofia's case raised a question: do children in this school actually trust the reporting system? Mrs Chen launches an anonymous diagnostic survey across all pupils, staff, and parents to find out.",
    screens: [
      {
        role: "All users",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "Diagnostic Survey",
        pageIcon: ClipboardCheck,
        title: "Anonymous climate survey",
        description: "20 role-adaptive questions across 5 categories. Pupils, staff, and parents each get questions written for them.",
        mockupElements: [
          { type: "form", content: "\"If I report something, adults will take it seriously\" \u2014 Strongly Disagree \u2022 Disagree \u2022 Neutral \u2022 Agree \u2022 Strongly Agree" },
          { type: "form", content: "\"I know who to talk to if I see something wrong\" \u2014 Strongly Disagree \u2022 ... \u2022 Strongly Agree" },
          { type: "badge", content: "142 responses: 88 pupils \u2022 32 staff \u2022 22 parents", color: "amber" },
        ],
      },
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Diagnostic Results",
        pageIcon: BarChart3,
        title: "Perception gaps revealed",
        description: "The data shows that staff and parents think reporting works well. But pupils don't agree. The gap is 1.8 points \u2014 children don't trust the system the way adults assume they do.",
        mockupElements: [
          { type: "chart", content: "Trust & Reporting: Pupils 2.1 \u2022 Parents 3.9 \u2022 Staff 4.2" },
          { type: "alert", content: "1.8pt perception gap: Pupils scored 'reporting makes things better' at 2.1. Staff scored 4.2. Children don't believe reporting helps.", color: "amber" },
          { type: "timeline", content: "This explains why Sofia didn't tell anyone for a week \u2014 and why the anonymous pupil report was the breakthrough." },
        ],
      },
    ],
  },
  {
    id: "recovery",
    week: "Week 10",
    title: "The data shows it worked",
    subtitle: "Sofia's mood recovers. Incidents stop. The school has evidence.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: Sparkles,
    narrative: "Six weeks after intervention. Sofia's diary mood is back to 4. Marcus has had no new incidents since the parent meeting. Tyler and Jayden completed restorative sessions. The PTA sees anonymised evidence that the safeguarding system is working.",
    screens: [
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Feelings Diary",
        pageIcon: BookHeart,
        title: "Mood recovery visible over time",
        description: "Sofia's diary tells the story nobody else can see: from fine, to declining, to rock bottom, to gradual recovery after intervention.",
        mockupElements: [
          { type: "chart", content: "Wk 1: \ud83d\ude10 3 \u2192 Wk 2: \ud83d\ude1f 2 \u2192 Wk 3: \ud83d\ude22 1 \u2192 Wk 5: \ud83d\ude10 3 \u2192 Wk 8: \ud83d\ude42 4 \u2192 Wk 10: \ud83d\ude04 5" },
          { type: "badge", content: "Mood trend: sustained recovery over 6 weeks", color: "green" },
        ],
      },
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Incident Timeline",
        pageIcon: Activity,
        title: "Incidents have stopped",
        description: "No new incidents involving Marcus, Tyler, Jayden, or Sofia since Week 5. The Convivèxit protocol is marked as resolved.",
        mockupElements: [
          { type: "chart", content: "Marcus: 0 incidents since Week 4 \u2022 Behaviour points declining \u2022 14 \u2192 8" },
          { type: "badge", content: "Convivèxit protocol: RESOLVED \u2014 all actions completed", color: "green" },
          { type: "badge", content: "Sofia: mood recovered \u2022 safe adult check-ins continuing \u2022 no new incidents", color: "green" },
        ],
      },
      {
        role: "PTA Chair",
        roleIcon: Users,
        roleColor: "text-emerald-600",
        page: "PTA Portal",
        pageIcon: BarChart3,
        title: "PTA sees anonymised evidence",
        description: "PTA members see aggregated, anonymised data. No names. Just evidence that the school identified a pattern, intervened proportionately, and achieved recovery.",
        mockupElements: [
          { type: "chart", content: "This term: 1 group bullying pattern identified \u2022 Resolved within 5 weeks of detection" },
          { type: "chart", content: "School-wide mood trend: 3.2 \u2192 3.8 (improving since diagnostic actions)" },
          { type: "notification", content: "Annual safeguarding summary: \"Pattern of escalating group behaviour identified through linked incident reports. Convivèxit protocol initiated. Victim assigned safe adult. All parties received proportionate intervention. Full recovery evidenced through mood data and zero re-offending.\"", color: "green" },
        ],
      },
    ],
  },
];

function MockupElement({ el }: { el: { type: string; content: string; color?: string } }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    red: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400" },
    green: { bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400" },
    teal: { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-400" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-400" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400" },
  };
  const c = colors[el.color || "teal"] || colors.teal;

  if (el.type === "alert") {
    return (
      <div className={`px-3 py-2.5 rounded-lg border ${c.bg} ${c.border} ${c.text} text-xs font-medium`}>
        {el.content}
      </div>
    );
  }
  if (el.type === "notification") {
    return (
      <div className={`px-3 py-2.5 rounded-lg border ${c.bg} ${c.border} text-xs`}>
        <div className="flex items-center gap-1.5 mb-1">
          <Bell size={12} className={c.text} />
          <span className={`font-bold uppercase tracking-wide ${c.text}`} style={{ fontSize: "10px" }}>Notification</span>
        </div>
        <p className="text-foreground/80">{el.content}</p>
      </div>
    );
  }
  if (el.type === "badge") {
    return (
      <div className={`px-3 py-2 rounded-lg ${c.bg} border ${c.border} ${c.text} text-xs font-bold flex items-center gap-1.5`}>
        <CheckCircle2 size={12} />
        {el.content}
      </div>
    );
  }
  if (el.type === "chart") {
    const parts = el.content.split("\u2022").map(s => s.trim());
    return (
      <div className="px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-xs">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 size={12} className="text-muted-foreground" />
          <span className="font-bold text-muted-foreground uppercase tracking-wide" style={{ fontSize: "10px" }}>Data</span>
        </div>
        {parts.length > 1 ? (
          <div className="space-y-1.5">
            {parts.map((p, idx) => {
              const numMatch = p.match(/(\d+\.?\d*)/);
              const val = numMatch ? parseFloat(numMatch[1]) : 0;
              const maxVal = Math.max(val, 5);
              const pct = Math.min((val / maxVal) * 100, 100);
              const barColors = ["bg-primary/60", "bg-amber-400/60", "bg-indigo-400/60", "bg-teal-400/60"];
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-foreground/70 text-[10px] min-w-0 flex-1 truncate">{p}</span>
                  <div className="w-16 h-1.5 rounded-full bg-border/50 shrink-0">
                    <div className={`h-full rounded-full ${barColors[idx % barColors.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-mono text-foreground/70">{el.content}</p>
        )}
      </div>
    );
  }
  if (el.type === "mood") {
    return (
      <div className="px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
        {el.content}
      </div>
    );
  }
  if (el.type === "action") {
    return (
      <div className={`px-3 py-2 rounded-lg ${c.bg} border ${c.border} ${c.text} text-xs font-bold text-center cursor-default`}>
        {el.content}
      </div>
    );
  }
  if (el.type === "timeline") {
    return (
      <div className="flex items-start gap-2 px-3 py-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-1 shrink-0" />
        <span>{el.content}</span>
      </div>
    );
  }
  return (
    <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-card border border-border/80 text-xs text-muted-foreground flex items-center gap-2">
      <div className="w-1 h-4 rounded-full bg-primary/20 shrink-0" />
      {el.content}
    </div>
  );
}

interface RoleFeature {
  page: string;
  icon: any;
  title: string;
  description: string;
  mockup: { type: string; content: string; color?: string }[];
}

interface RoleProfile {
  id: string;
  role: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  tagline: string;
  features: RoleFeature[];
}

const ROLES: RoleProfile[] = [
  {
    id: "pupil",
    role: "Pupils",
    icon: Heart,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    borderColor: "border-teal-200 dark:border-teal-800",
    tagline: "A safe, private space to speak up \u2014 even anonymously",
    features: [
      {
        page: "Report a Concern",
        icon: FileText,
        title: "Tell someone what happened",
        description: "Report anything that feels wrong \u2014 bullying, something scary, or something happening to a friend. You can stay anonymous if you want.",
        mockup: [
          { type: "form", content: "What happened? \u2014 Physical \u00b7 Verbal \u00b7 Mind games \u00b7 My body, my rules \u00b7 Leaving out \u00b7 Online" },
          { type: "form", content: "Is this happening to you, or someone else?" },
          { type: "form", content: "How are you feeling? \u2014 \ud83d\ude28 Scared \u00b7 \ud83d\ude22 Sad \u00b7 \ud83d\ude20 Angry \u00b7 \ud83d\ude1f Worried" },
          { type: "badge", content: "You can keep this anonymous. Adults will keep you safe.", color: "teal" },
        ],
      },
      {
        page: "Feelings Diary",
        icon: BookHeart,
        title: "A private diary that only you can see",
        description: "Record how you feel each day with a mood score and optional notes. Nobody at school can read it \u2014 but if the system detects you\u2019re struggling, it quietly alerts a trusted adult.",
        mockup: [
          { type: "mood", content: "\ud83d\ude04 Great \u00b7 \ud83d\ude42 Good \u00b7 \ud83d\ude10 Okay \u00b7 \ud83d\ude1f Not great \u00b7 \ud83d\ude22 Really bad" },
          { type: "form", content: "Write about your day (optional)..." },
          { type: "badge", content: "Nobody can read your diary. It belongs to you.", color: "teal" },
        ],
      },
      {
        page: "Safe Messaging",
        icon: MessageSquare,
        title: "Message your safe adult",
        description: "If you\u2019ve been assigned a safe adult, you can message them directly through safeskoolz. Private, secure, available any time.",
        mockup: [
          { type: "notification", content: "Your safe adult is: Ms Rivera. You can message her any time.", color: "teal" },
          { type: "form", content: "\"Can I talk to you at break? Something happened again.\"" },
        ],
      },
      {
        page: "School Updates",
        icon: Megaphone,
        title: "See what the school is doing",
        description: "Read school updates about safeguarding, wellbeing events, and things the school wants you to know.",
        mockup: [
          { type: "notification", content: "Anti-Bullying Week: workshops in assembly this week. Remember \u2014 telling someone is brave, not weak.", color: "blue" },
        ],
      },
    ],
  },
  {
    id: "parent",
    role: "Parents",
    icon: Users,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    tagline: "Know what the school is doing \u2014 and raise concerns yourself",
    features: [
      {
        page: "Report a Concern",
        icon: FileText,
        title: "Report what your child is telling you",
        description: "If your child comes home upset, you can log a concern directly. It goes to the safeguarding team. You don\u2019t need to wait for a parents\u2019 evening.",
        mockup: [
          { type: "form", content: "What are you concerned about? \u2014 Bullying \u00b7 Online safety \u00b7 Behaviour change \u00b7 Something my child told me" },
          { type: "form", content: "\"My daughter has been coming home in tears. She says a group of boys are targeting her at lunch.\"" },
          { type: "badge", content: "Concern logged. The safeguarding coordinator has been notified.", color: "amber" },
        ],
      },
      {
        page: "Notifications",
        icon: Bell,
        title: "Get notified when the school acts",
        description: "When the school identifies something involving your child, you receive a private notification. Not a generic newsletter \u2014 a specific alert with what\u2019s been done.",
        mockup: [
          { type: "notification", content: "A pattern of targeted behaviour towards your child has been identified. A Convivèxit protocol has been initiated. Your child has been assigned a named safe adult.", color: "blue" },
          { type: "action", content: "Acknowledge \u00b7 Request meeting", color: "teal" },
        ],
      },
      {
        page: "Diagnostic Results",
        icon: BarChart3,
        title: "See how safe children feel at school",
        description: "When the school runs a safeguarding diagnostic, parents see the aggregated results \u2014 how pupils, staff, and parents scored across trust, awareness, and culture.",
        mockup: [
          { type: "chart", content: "Trust & Reporting: Pupils 2.1 \u2022 Parents 3.9 \u2022 Staff 4.2" },
          { type: "alert", content: "Perception gap: Children don\u2019t trust the reporting system as much as parents think they do.", color: "amber" },
        ],
      },
      {
        page: "Contact PTA",
        icon: MessageSquare,
        title: "Message your PTA representative",
        description: "Raise a concern directly with a PTA member. They see anonymised safeguarding data and can advocate for change at governor level.",
        mockup: [
          { type: "form", content: "\"I\u2019m worried about the lunchtime supervision. My child says there\u2019s nowhere to go if they feel unsafe.\"" },
          { type: "badge", content: "Message sent to PTA Chair (Sarah T.)", color: "amber" },
        ],
      },
      {
        page: "Case Studies",
        icon: BookOpen,
        title: "Understand real patterns",
        description: "Read anonymised case studies showing how bullying patterns develop and what the school does about them. See what parents typically receive at each stage.",
        mockup: [
          { type: "timeline", content: "Case Study 1: Ringleader plus recruited bullies \u2014 how group dynamics work" },
          { type: "timeline", content: "Case Study 5: Slow emotional collapse \u2014 when a child withdraws gradually" },
          { type: "badge", content: "\"What parents receive\" section shows example alerts, reports, and diagnostic data", color: "amber" },
        ],
      },
    ],
  },
  {
    id: "teacher",
    role: "Teachers & Staff",
    icon: GraduationCap,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    tagline: "Log incidents in 60 seconds. Get guided through the right process.",
    features: [
      {
        page: "Log Incident",
        icon: FileText,
        title: "Report an incident with guided categories",
        description: "Select what happened, who was involved, and the child\u2019s emotional state. The form adapts to the category \u2014 physical, verbal, online, sexual, coercive. Takes under a minute.",
        mockup: [
          { type: "form", content: "Category: Physical \u00b7 Verbal \u00b7 Psychological \u00b7 Sexual \u00b7 Relational \u00b7 Coercive \u00b7 Property \u00b7 Online" },
          { type: "form", content: "Victims \u00b7 Perpetrators \u00b7 Witnesses \u2014 search by name or describe unknown persons" },
          { type: "form", content: "Staff checks: Were children separated? Coordinator notified? Told by child?" },
        ],
      },
      {
        page: "Protocol Guidance",
        icon: Shield,
        title: "Serious incidents show you what to do next",
        description: "When you log a Tier 2 or Tier 3 incident, the confirmation screen shows step-by-step protocol guidance: what to do, what NOT to do, who to notify, legal basis, and timeframes.",
        mockup: [
          { type: "badge", content: "Tier 3 \u2014 CRITICAL \u00b7 LOPIVI Protocol", color: "red" },
          { type: "alert", content: "Step 1: Secure the child in a safe space with a trusted adult", color: "red" },
          { type: "alert", content: "Step 2: Do not investigate. Your role is to report, not question.", color: "red" },
          { type: "alert", content: "Do NOT promise the child you will keep it secret", color: "red" },
          { type: "badge", content: "Coordinator must be informed within 15 minutes. External referral within 24 hours.", color: "amber" },
        ],
      },
      {
        page: "Behaviour Tracker",
        icon: Gauge,
        title: "Track behaviour points across your class",
        description: "See which children are accumulating behaviour points, what level they\u2019re at, and how trends are changing. Filter by your class or year group.",
        mockup: [
          { type: "badge", content: "Marcus: 14 pts \u2014 Level 4 (Formal Warning)", color: "red" },
          { type: "badge", content: "Tyler: 5 pts \u2014 Level 2 (Verbal Warning)", color: "amber" },
          { type: "chart", content: "Class 6A: 12 incidents this term \u2022 3 amber alerts \u2022 1 red alert" },
        ],
      },
      {
        page: "School Updates",
        icon: Megaphone,
        title: "Post updates and \u2018Heads Up\u2019 alerts to staff",
        description: "Share observations, flag concerns to colleagues, or post safeguarding updates. \u2018Heads Up\u2019 posts are staff-only and show a prominent observation guidance banner.",
        mockup: [
          { type: "form", content: "Category: Heads Up \u2022 Audience: Staff only" },
          { type: "form", content: "\"Keep an eye on Year 5 at lunch \u2014 there\u2019s been tension between two groups this week.\"" },
          { type: "alert", content: "Heads Up: This is an observation for staff awareness. If you see anything, log it.", color: "amber" },
        ],
      },
      {
        page: "Notifications",
        icon: Bell,
        title: "Get alerted when patterns involve your pupils",
        description: "When pattern alerts fire for children in your class, you receive a notification. When protocols are opened, you\u2019re told what tasks you\u2019ve been assigned.",
        mockup: [
          { type: "notification", content: "Pattern Alert: A pupil in your class (6A) has been involved in 3 incidents this week as a victim.", color: "blue" },
          { type: "notification", content: "Task assigned: Daily wellbeing check-in with Sofia for the next 2 weeks.", color: "blue" },
        ],
      },
    ],
  },
  {
    id: "coordinator",
    role: "Coordinators & Head Teachers",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    tagline: "See everything. Respond proportionately. Evidence every decision.",
    features: [
      {
        page: "Dashboard",
        icon: BarChart3,
        title: "Full safeguarding picture in one place",
        description: "Open incidents, active alerts (red/amber), mood trends, behaviour escalations, active protocols, and overdue tasks. Everything you need to make decisions.",
        mockup: [
          { type: "badge", content: "4 active alerts \u2022 12 open incidents \u2022 2 mood decline flags \u2022 1 overdue task", color: "purple" },
          { type: "chart", content: "This week: 3 new incidents \u2022 2 resolved \u2022 1 protocol opened" },
          { type: "alert", content: "\ud83d\udea8 RED: Group targeting detected \u2014 3 perpetrators acting together against 1 victim over 3 weeks", color: "red" },
        ],
      },
      {
        page: "Pattern Alerts",
        icon: Activity,
        title: "Automatic pattern detection across the school",
        description: "The system links incidents across different reporters, days, and categories. It spots repeat victims, repeat perpetrators, group dynamics, location hotspots, and escalating severity.",
        mockup: [
          { type: "alert", content: "\ud83d\udea8 RED: Same victim in 4+ incidents from 3 different reporters", color: "red" },
          { type: "alert", content: "\ud83d\udea8 AMBER: Location hotspot \u2014 4 incidents in the same corridor this term", color: "amber" },
          { type: "alert", content: "\ud83d\udea8 AMBER: Sustained mood decline for 2 pupils over 14 days", color: "amber" },
        ],
      },
      {
        page: "Broadcast Alerts",
        icon: Megaphone,
        title: "Notify parents, staff, or the whole school",
        description: "Send targeted or school-wide alerts. Choose your audience: all parents, all staff, parents and staff, or everyone. Every send is audit-logged.",
        mockup: [
          { type: "form", content: "Audience: All Staff \u2022 Category: Safeguarding Update" },
          { type: "form", content: "Subject: \"Increased supervision at lunch \u2014 active Convivèxit protocol\"" },
          { type: "badge", content: "Sent to 32 staff members. Audit logged.", color: "purple" },
        ],
      },
      {
        page: "Diagnostics",
        icon: ClipboardCheck,
        title: "Run school climate surveys",
        description: "Launch anonymous diagnostics for pupils, staff, and parents. See aggregated results, perception gaps, auto-ranked priorities, and recommended KPIs.",
        mockup: [
          { type: "chart", content: "Trust & Reporting: Pupils 2.1 \u2022 Staff 4.2 \u2014 1.8pt gap" },
          { type: "badge", content: "Priority 1 (Critical): Pupil trust in reporting \u2014 KPI: raise from 2.1 to 3.0 by end of term", color: "red" },
          { type: "badge", content: "Agreed Actions published to parents and staff", color: "purple" },
        ],
      },
      {
        page: "Incident Management",
        icon: FileText,
        title: "Review, assess, and escalate incidents",
        description: "See every incident logged by any staff member or pupil. Filter by status, category, tier, or child. Add assessments, update status, mark for external referral.",
        mockup: [
          { type: "chart", content: "SS-2026-0012 \u2022 Sexual \u2022 Tier 3 \u2022 Status: Under review" },
          { type: "badge", content: "Mandatory external referral: Fiscal\u00eda de Menores", color: "red" },
          { type: "form", content: "Assessment: \"Referral sent to external services. Protective measures in place. Next review: 48 hours.\"" },
        ],
      },
      {
        page: "Audit Log",
        icon: Eye,
        title: "Every action is recorded",
        description: "Every incident, notification, protocol action, login, and data access is audit-logged with timestamps. Immutable. Designed for inspections and legal compliance.",
        mockup: [
          { type: "timeline", content: "14:32 \u2014 teacher@school.dev logged Incident CS1-004 (Online, Tier 2)" },
          { type: "timeline", content: "14:33 \u2014 SYSTEM auto-notified coordinator of Tier 2 incident" },
          { type: "timeline", content: "14:35 \u2014 coordinator@school.dev opened Convivèxit protocol #CVX-003" },
          { type: "timeline", content: "14:40 \u2014 SYSTEM sent notification to parent of victim" },
        ],
      },
    ],
  },
];

function RoleFeaturesSection() {
  const [activeRole, setActiveRole] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const role = ROLES[activeRole];
  const feature = role.features[activeFeature];
  const RoleIcon = role.icon;
  const FeatureIcon = feature.icon;

  const switchRole = (idx: number) => {
    setActiveRole(idx);
    setActiveFeature(0);
  };

  return (
    <div className="mt-16">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl" />
        <div className="relative text-center py-8 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
            <Sparkles size={12} />
            INTERACTIVE DEMO
          </div>
          <h2 className="text-3xl font-display font-bold mb-2">What each role can do</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-4">
            Sofia's story shows pattern detection. But safeskoolz is used every day by pupils, parents, teachers, and coordinators for much more.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <MousePointerClick size={14} className="text-primary" />
            </motion.div>
            Choose a role, then explore their features
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
        {ROLES.map((r, i) => {
          const RI = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => switchRole(i)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                i === activeRole
                  ? `${r.bgColor} ${r.borderColor} ${r.color} shadow-md`
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <RI size={18} />
              {r.role}
              {i === activeRole && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`rounded-2xl border-2 ${role.borderColor} overflow-hidden`}>
            <div className={`${role.bgColor} px-6 py-4`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white/60 dark:bg-black/10 ${role.color}`}>
                  <RoleIcon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{role.role}</h3>
                  <p className="text-sm text-muted-foreground">{role.tagline}</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Hand size={13} className="text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {role.features.length} features &mdash; click to explore
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {role.features.map((f, i) => {
                  const FI = f.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveFeature(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                        i === activeFeature
                          ? `${role.bgColor} ${role.borderColor} ${role.color} shadow-sm`
                          : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      <FI size={13} />
                      {f.page}
                      {i === activeFeature && <ChevronDown size={11} className="opacity-50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeRole}-${activeFeature}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="px-6 py-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FeatureIcon size={16} className={role.color} />
                  <span className={`text-xs font-bold ${role.color}`}>{feature.page}</span>
                </div>
                <h4 className="font-bold text-base mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{feature.page}</span>
                  </div>
                  {feature.mockup.map((el, i) => (
                    <MockupElement key={i} el={el} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {ROLES.map((r) => {
          const RI = r.icon;
          return (
            <div key={r.id} className="p-4 rounded-xl bg-card border border-border">
              <RI size={20} className={`mx-auto mb-1.5 ${r.color}`} />
              <p className="font-bold text-sm">{r.features.length} features</p>
              <p className="text-xs text-muted-foreground">{r.role}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ReportAudience {
  id: string;
  role: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  reports: {
    title: string;
    icon: any;
    frequency: string;
    mockup: { type: string; content: string; color?: string }[];
  }[];
}

const REPORT_AUDIENCES: ReportAudience[] = [
  {
    id: "pta",
    role: "PTA & Governors",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Anonymised data that shows whether the school is getting safer. No child names, no incident details \u2014 just trends, patterns, and outcomes.",
    reports: [
      {
        title: "Termly Safeguarding Summary",
        icon: FileText,
        frequency: "Every term",
        mockup: [
          { type: "chart", content: "Total incidents: 47 \u2022 Resolved: 44 \u2022 Active protocols: 2 \u2022 Avg resolution: 8 days" },
          { type: "chart", content: "Verbal: 22 \u2022 Physical: 9 \u2022 Online: 8 \u2022 Relational: 5 \u2022 Other: 3" },
          { type: "badge", content: "Incidents down 18% from last term. Zero Tier 3 incidents.", color: "green" },
          { type: "alert", content: "Location hotspot: 6 incidents near the sports hall at lunch. Recommend increased supervision.", color: "amber" },
        ],
      },
      {
        title: "Diagnostic Climate Report",
        icon: BarChart3,
        frequency: "Twice yearly",
        mockup: [
          { type: "chart", content: "Pupil trust in reporting: 2.1/5 \u2022 Staff confidence: 4.2/5 \u2022 Parent awareness: 3.9/5" },
          { type: "alert", content: "Critical gap: Pupils score reporting trust 2.1 points lower than staff think. Children don\u2019t believe adults will act.", color: "red" },
          { type: "badge", content: "Agreed action: Relaunch pupil reporting with assembly + safe adult ambassadors. KPI target: 3.0 by July.", color: "purple" },
          { type: "chart", content: "Response rate: Pupils 89% \u2022 Staff 95% \u2022 Parents 62%" },
        ],
      },
      {
        title: "Year-End Outcome Report",
        icon: CheckCircle2,
        frequency: "Annual",
        mockup: [
          { type: "badge", content: "3 Convivèxit protocols opened this year. All 3 resolved with zero re-offending.", color: "green" },
          { type: "chart", content: "Victim recovery rate: 100% \u2022 Avg weeks to resolution: 5.2 \u2022 Parental satisfaction: 4.6/5" },
          { type: "notification", content: "Case summary: \"Group targeting pattern identified through linked incident reports. Intervention included safe adults, restorative conversations, and parent meetings. Full recovery evidenced.\"", color: "green" },
          { type: "badge", content: "Suitable for Ofsted/inspection evidence. PDF export available.", color: "purple" },
        ],
      },
    ],
  },
  {
    id: "staff",
    role: "Staff & Coordinators",
    icon: GraduationCap,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    description: "Operational reporting that helps staff see what\u2019s working and where to focus. Live data, not end-of-term surprises.",
    reports: [
      {
        title: "Weekly Dashboard",
        icon: Activity,
        frequency: "Real-time",
        mockup: [
          { type: "badge", content: "This week: 5 new incidents \u2022 3 resolved \u2022 2 under review \u2022 1 pattern alert", color: "indigo" },
          { type: "chart", content: "Monday: 2 incidents \u2022 Tuesday: 1 \u2022 Wednesday: 0 \u2022 Thursday: 2 \u2022 Friday: 0" },
          { type: "alert", content: "Mood decline: 2 pupils in Year 6 showing sustained low mood (below 2.0 for 7+ days)", color: "amber" },
          { type: "badge", content: "Overdue tasks: 0. All protocol deadlines met.", color: "green" },
        ],
      },
      {
        title: "Behaviour Escalation Report",
        icon: TrendingDown,
        frequency: "Fortnightly",
        mockup: [
          { type: "badge", content: "5 pupils at Level 3+ (formal warning threshold)", color: "amber" },
          { type: "chart", content: "Marcus (Yr 6): 14 pts \u2014 Level 4 \u2022 Tyler (Yr 6): 5 pts \u2014 Level 2 \u2022 Jayden (Yr 6): 4 pts \u2014 Level 2" },
          { type: "alert", content: "Trend: 3 of these 5 pupils are connected through linked incidents. Possible group dynamic.", color: "red" },
          { type: "badge", content: "Recommended: Review behaviour points for Yr 6 cohort. Linked incidents suggest coordinated targeting.", color: "indigo" },
        ],
      },
      {
        title: "Protocol Compliance Tracker",
        icon: ClipboardCheck,
        frequency: "Ongoing",
        mockup: [
          { type: "badge", content: "Active protocols: Convivèxit #CVX-003 (Week 4 of 6)", color: "purple" },
          { type: "timeline", content: "Safe adult check-in: Complete (5 of 5 this week)" },
          { type: "timeline", content: "Restorative conversation #2 (Tyler): Scheduled for Thursday" },
          { type: "timeline", content: "Parent follow-up (Marcus\u2019s parents): Meeting confirmed Friday 2pm" },
          { type: "badge", content: "All LOPIVI deadlines met. No overdue external referrals.", color: "green" },
        ],
      },
    ],
  },
  {
    id: "parents",
    role: "Parents & Families",
    icon: Heart,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    description: "Parents see what matters to their child and their school \u2014 not a data dump, but clear answers to \"is my child safe?\" and \"what is the school doing?\"",
    reports: [
      {
        title: "My Child\u2019s Wellbeing Summary",
        icon: Heart,
        frequency: "On request",
        mockup: [
          { type: "badge", content: "Your child has no active safeguarding concerns.", color: "green" },
          { type: "chart", content: "Behaviour points: 0 \u2022 Incidents involving your child: 0 this term" },
          { type: "notification", content: "Your child\u2019s wellbeing score is healthy. No mood flags detected.", color: "green" },
        ],
      },
      {
        title: "Incident Notification",
        icon: Bell,
        frequency: "When relevant",
        mockup: [
          { type: "notification", content: "We are writing to let you know that a pattern of targeted behaviour towards your child has been identified and addressed.", color: "blue" },
          { type: "notification", content: "A Convivèxit protocol has been initiated. Your child has been assigned a safe adult (Ms Rivera). We would welcome the opportunity to discuss this with you.", color: "blue" },
          { type: "action", content: "Acknowledge \u00b7 Request meeting \u00b7 Ask a question", color: "teal" },
        ],
      },
      {
        title: "School Safeguarding Report",
        icon: Shield,
        frequency: "Termly",
        mockup: [
          { type: "notification", content: "Morna International College \u2014 Term 2 Safeguarding Update", color: "blue" },
          { type: "chart", content: "Incidents this term: 47 (down 18%) \u2022 Resolved: 94% \u2022 Avg resolution: 8 days" },
          { type: "badge", content: "Climate survey: 89% of pupils completed. Key finding: reporting trust needs improvement.", color: "amber" },
          { type: "badge", content: "Action taken: New safe adult ambassador programme launched. Lunchtime supervision increased.", color: "green" },
        ],
      },
      {
        title: "Diagnostic Survey Invitation",
        icon: ClipboardCheck,
        frequency: "Twice yearly",
        mockup: [
          { type: "notification", content: "You are invited to complete a 5-minute safeguarding climate survey. Your answers are anonymous.", color: "blue" },
          { type: "form", content: "\"I trust the school to keep my child safe\" \u2014 Strongly agree \u00b7 Agree \u00b7 Neutral \u00b7 Disagree \u00b7 Strongly disagree" },
          { type: "form", content: "\"I know how to report a concern about my child\" \u2014 Strongly agree \u00b7 Agree \u00b7 Neutral \u00b7 Disagree" },
          { type: "badge", content: "Results are shared with PTA and published to all parents.", color: "amber" },
        ],
      },
    ],
  },
];

function ReportingAnalyticsSection() {
  const [activeAudience, setActiveAudience] = useState(0);
  const [activeReport, setActiveReport] = useState(0);
  const audience = REPORT_AUDIENCES[activeAudience];
  const report = audience.reports[activeReport];
  const AudienceIcon = audience.icon;
  const ReportIcon = report.icon;

  const switchAudience = (idx: number) => {
    setActiveAudience(idx);
    setActiveReport(0);
  };

  return (
    <div className="mt-16">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />
        <div className="relative text-center py-8 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-bold mb-3">
            <BarChart3 size={12} />
            REPORTING & ANALYTICS
          </div>
          <h2 className="text-3xl font-display font-bold mb-2">Where does the data go?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
            Every incident, mood entry, and behaviour point feeds into reports tailored to each audience. PTA governors see anonymised trends. Staff see operational data. Parents see what matters to their child.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <MousePointerClick size={14} className="text-indigo-500" />
            </motion.div>
            Choose an audience to see their reports
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText size={12} className="text-primary" />
          <span>Incidents</span>
        </div>
        <ArrowRight size={14} className="text-muted-foreground/50" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity size={12} className="text-amber-500" />
          <span>Patterns</span>
        </div>
        <ArrowRight size={14} className="text-muted-foreground/50" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BarChart3 size={12} className="text-indigo-500" />
          <span>Analytics</span>
        </div>
        <ArrowRight size={14} className="text-muted-foreground/50" />
        <div className="flex items-center gap-1 text-xs font-bold text-foreground">
          <Send size={12} className="text-purple-500" />
          <span>Reports</span>
        </div>
      </div>

      <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
        {REPORT_AUDIENCES.map((a, i) => {
          const AI = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => switchAudience(i)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                i === activeAudience
                  ? `${a.bgColor} ${a.borderColor} ${a.color} shadow-md`
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <AI size={18} />
              {a.role}
              {i === activeAudience && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAudience}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`rounded-2xl border-2 ${audience.borderColor} overflow-hidden`}>
            <div className={`${audience.bgColor} px-6 py-4`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white/60 dark:bg-black/10 ${audience.color}`}>
                  <AudienceIcon size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{audience.role}</h3>
                  <p className="text-sm text-muted-foreground">{audience.description}</p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Hand size={13} className="text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {audience.reports.length} reports &mdash; click to preview
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {audience.reports.map((r, i) => {
                  const RI = r.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveReport(i)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                        i === activeReport
                          ? `${audience.bgColor} ${audience.borderColor} ${audience.color} shadow-sm`
                          : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      <RI size={13} />
                      {r.title}
                      {i === activeReport && <ChevronDown size={11} className="opacity-50" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeAudience}-${activeReport}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="px-6 py-5"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ReportIcon size={16} className={audience.color} />
                    <span className={`text-xs font-bold ${audience.color}`}>{report.title}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{report.frequency}</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2 mt-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{report.title}</span>
                  </div>
                  {report.mockup.map((el, i) => (
                    <MockupElement key={i} el={el} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeScreen, setActiveScreen] = useState(0);
  const step = STEPS[activeStep];
  const screen = step.screens[activeScreen] || step.screens[0];
  const Icon = step.icon;
  const ScreenIcon = screen.pageIcon;

  const goTo = (idx: number) => {
    setActiveStep(idx);
    setActiveScreen(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft size={14} /> Back to login
          </Link>
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl shadow-lg">
              <ShieldCheck size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-3">How safeskoolz works</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Follow Sofia's story through the actual platform &mdash; see every screen, every alert, every action that protects a child.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
              <MousePointerClick size={16} />
            </motion.div>
            Click the timeline below to explore each week
          </motion.div>
        </div>

        <div className="relative mb-4">
          <div className="h-1.5 rounded-full bg-border/50 mb-1">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{activeStep + 1} of {STEPS.length} stages</p>
        </div>

        <div className="relative mb-8">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border hidden sm:block" />
          <div className="flex justify-between gap-1 sm:gap-0 overflow-x-auto pb-2 sm:pb-0">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`relative flex flex-col items-center gap-1 px-2 sm:px-0 shrink-0 transition-all ${
                    i === activeStep ? "scale-110" : i < activeStep ? "opacity-70" : "opacity-40"
                  }`}
                >
                  <div className="relative">
                    {i === activeStep && (
                      <motion.div
                        className={`absolute inset-0 rounded-full ${s.borderColor} border-2`}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      />
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative z-10 ${
                      i === activeStep
                        ? `${s.bgColor} ${s.borderColor} ${s.color} shadow-md`
                        : i < activeStep
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground hover:border-primary/20"
                    }`}>
                      <StepIcon size={18} />
                    </div>
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold whitespace-nowrap ${
                    i === activeStep ? s.color : "text-muted-foreground"
                  }`}>
                    {s.week}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <div className={`rounded-2xl border-2 ${step.borderColor} overflow-hidden`}>
              <div className={`${step.bgColor} px-6 py-5`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl bg-white/60 dark:bg-black/10 ${step.color}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{step.week}</p>
                    <h2 className="text-xl font-bold">{step.title}</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{step.subtitle}</p>
              </div>

              <div className="px-6 py-4 bg-card/50 border-t border-border/50">
                <p className="text-sm italic text-foreground/70">{step.narrative}</p>
              </div>

              {step.screens.length > 1 && (
                <div className="px-6 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Hand size={13} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {step.screens.length} viewpoints &mdash; click to switch
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {step.screens.map((scr, i) => {
                      const RIcon = scr.roleIcon;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveScreen(i)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                            i === activeScreen
                              ? `${step.bgColor} ${step.borderColor} ${step.color} shadow-sm`
                              : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:shadow-sm"
                          }`}
                        >
                          <RIcon size={14} />
                          <span>{scr.role}</span>
                          <span className="opacity-50">&middot;</span>
                          <span className="opacity-70">{scr.page}</span>
                          {i === activeScreen && <ChevronDown size={12} className="opacity-60" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeStep}-${activeScreen}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="px-6 py-5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ScreenIcon size={16} className={screen.roleColor} />
                    <span className={`text-xs font-bold ${screen.roleColor}`}>{screen.role}</span>
                    <span className="text-xs text-muted-foreground">&middot; {screen.page}</span>
                  </div>
                  <h3 className="font-bold text-base mb-1">{screen.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{screen.description}</p>

                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">{screen.page}</span>
                    </div>
                    {screen.mockupElements.map((el, i) => (
                      <MockupElement key={i} el={el} />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => goTo(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-bold hover:bg-muted hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          {activeStep < STEPS.length - 1 ? (
            <button
              onClick={() => goTo(activeStep + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              See what happens next <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Story complete
            </div>
          )}
        </div>

        <RoleFeaturesSection />

        <ReportingAnalyticsSection />

        <div className="mt-12 text-center">
          <div className="p-8 rounded-2xl bg-card border border-border shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Every school has stories like Sofia's.</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              The difference is whether anyone connects the dots in time. safeskoolz makes the invisible visible.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login">
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors cursor-pointer">
                  <ShieldCheck size={18} />
                  Try the demo
                </span>
              </Link>
              <Link href="/newsletter">
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors cursor-pointer">
                  <Megaphone size={18} />
                  Bring safeskoolz to your school
                </span>
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            All names are fictional. Scenarios are based on real patterns seen in schools across Europe.
            <br />
            Powered by <span className="font-semibold">Cloudworkz</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

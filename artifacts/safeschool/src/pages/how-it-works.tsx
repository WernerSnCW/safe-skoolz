import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ArrowRight, ArrowLeft, BookOpen, Users, Bell,
  Heart, Eye, AlertTriangle, TrendingDown, BarChart3, Megaphone,
  MessageSquare, Shield, ChevronDown, ChevronUp, Sparkles,
  UserCircle, GraduationCap, ClipboardCheck, BookHeart,
  FileText, Activity, Gauge, Send, Search, Zap, CheckCircle2,
  ArrowDown
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
    id: "diary",
    week: "Week 1",
    title: "Sofia writes in her diary",
    subtitle: "A child records how she feels. Nobody else can see it.",
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/20",
    borderColor: "border-teal-200 dark:border-teal-800",
    icon: BookHeart,
    narrative: "Marcus called Sofia stupid at lunch. Tyler and Jayden laughed. She didn't tell anyone \u2014 but she opened her safeskoolz diary.",
    screens: [
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Feelings Diary",
        pageIcon: BookHeart,
        title: "Sofia's private diary entry",
        description: "Only Sofia can see her diary. No teacher, parent, or coordinator has access. But the system is listening for patterns.",
        mockupElements: [
          { type: "mood", content: "How are you feeling today?", color: "amber" },
          { type: "mood", content: "\ud83d\ude14 Sad \u2014 selected", color: "amber" },
          { type: "form", content: "\"Marcus was mean to me at lunch. I don't like lunchtimes any more.\"" },
          { type: "badge", content: "Entry saved. This is private \u2014 only you can see it.", color: "teal" },
        ],
      },
    ],
  },
  {
    id: "incident",
    week: "Week 2",
    title: "Ms Rivera logs an incident",
    subtitle: "A teacher sees something and reports it in 60 seconds.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    icon: FileText,
    narrative: "Marcus told Tyler to trip Sofia in the corridor. Jayden filmed it. Sofia told Ms Rivera, who opened safeskoolz on her phone.",
    screens: [
      {
        role: "Ms Rivera (teacher)",
        roleIcon: GraduationCap,
        roleColor: "text-indigo-600",
        page: "Report Incident",
        pageIcon: FileText,
        title: "Quick incident report form",
        description: "Teachers log what happened, who was involved, and how the child was feeling. It takes under a minute.",
        mockupElements: [
          { type: "form", content: "What happened? \u2014 Physical \u00b7 Verbal \u00b7 Exclusion \u00b7 Online" },
          { type: "form", content: "Who was involved? \u2014 Marcus (instigator) \u00b7 Tyler (participant) \u00b7 Jayden (filming)" },
          { type: "form", content: "Victim: Sofia \u2014 Emotional state: Upset, crying" },
          { type: "form", content: "Location: Corridor between lessons" },
          { type: "badge", content: "Incident CS1-002 logged. Coordinator notified automatically.", color: "indigo" },
        ],
      },
      {
        role: "Sofia's mum (parent)",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "At home",
        pageIcon: Users,
        title: "What Sofia's mum notices",
        description: "Sofia doesn't want to go to school tomorrow. She mentions a boy called Marcus but says \"it's nothing\". Her mum is worried but has no evidence yet.",
        mockupElements: [
          { type: "timeline", content: "Sofia seems quieter about school this week" },
          { type: "timeline", content: "\"I don't want to go tomorrow\" \u2014 but won't explain why" },
        ],
      },
    ],
  },
  {
    id: "pattern",
    week: "Week 3",
    title: "The system connects the dots",
    subtitle: "Three alerts fire simultaneously. No human could have seen this.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
    narrative: "A third incident is logged. safeskoolz now has enough data to see the pattern that no single person could.",
    screens: [
      {
        role: "System",
        roleIcon: Zap,
        roleColor: "text-red-600",
        page: "Pattern Alerts",
        pageIcon: Activity,
        title: "Three pattern alerts fire at once",
        description: "The pattern detection engine runs automatically. It links incidents, identifies repeat perpetrators, and spots group targeting.",
        mockupElements: [
          { type: "alert", content: "\ud83d\udea8 Same victim in 3+ incidents \u2014 Sofia has been targeted in 3 separate incidents over 3 weeks", color: "red" },
          { type: "alert", content: "\ud83d\udea8 Group targeting detected \u2014 Marcus, Tyler, and Jayden are acting together against Sofia", color: "red" },
          { type: "alert", content: "\ud83d\udea8 Repeat perpetrator \u2014 Marcus appears as instigator in 5 incidents across different victims", color: "amber" },
        ],
      },
      {
        role: "System",
        roleIcon: TrendingDown,
        roleColor: "text-blue-600",
        page: "Diary Mood Analysis",
        pageIcon: BookHeart,
        title: "Mood decline detected",
        description: "Sofia's private diary is never read by staff \u2014 but the system tracks the mood pattern. Her average has dropped from 4 to 1 over three weeks.",
        mockupElements: [
          { type: "chart", content: "Week 1: \ud83d\ude42 4/5 \u2022 Week 2: \ud83d\ude10 2/5 \u2022 Week 3: \ud83d\ude22 1/5" },
          { type: "alert", content: "\ud83d\udea8 Sustained mood decline \u2014 average mood \u22642 over 5+ entries in 14 days. SENCO + coordinator alerted.", color: "amber" },
        ],
      },
    ],
  },
  {
    id: "coordinator",
    week: "Week 3",
    title: "Mrs Chen sees the full picture",
    subtitle: "The coordinator dashboard connects incidents, diary trends, behaviour points, and alerts.",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: Shield,
    narrative: "Mrs Chen opens her coordinator dashboard. Instead of three unrelated incidents, she sees a complete bullying pattern with data from multiple sources.",
    screens: [
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Coordinator Dashboard",
        pageIcon: BarChart3,
        title: "Full data picture on one screen",
        description: "Incidents, alerts, diary mood trends, behaviour points, and pattern analysis \u2014 all connected.",
        mockupElements: [
          { type: "badge", content: "3 active alerts \u2022 7 open incidents \u2022 2 mood decline flags", color: "purple" },
          { type: "chart", content: "Sofia: 3 incidents as victim \u2022 Marcus: 5 incidents as instigator \u2022 Tyler/Jayden: recruited in weeks 2-3" },
          { type: "timeline", content: "Timeline: Marcus acted alone (Week 1) \u2192 recruited Tyler (Week 2) \u2192 added Jayden (Week 3)" },
        ],
      },
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Behaviour Tracker",
        pageIcon: Gauge,
        title: "Behaviour escalation levels",
        description: "Points-based tracking shows Marcus at Level 4 (12 points). Tyler and Jayden have lower points \u2014 reflecting coerced participation, not ringleading.",
        mockupElements: [
          { type: "badge", content: "Marcus: 12 pts \u2014 Level 4 (Formal Warning)", color: "red" },
          { type: "badge", content: "Tyler: 5 pts \u2014 Level 2 (Verbal Warning)", color: "amber" },
          { type: "badge", content: "Jayden: 4 pts \u2014 Level 2 (Verbal Warning)", color: "amber" },
        ],
      },
    ],
  },
  {
    id: "respond",
    week: "Week 4",
    title: "The school responds",
    subtitle: "Different actions for different roles. Parents are notified. Sofia gets a safe adult.",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    narrative: "Mrs Chen initiates the response. The platform helps coordinate actions across staff, notify parents, and protect Sofia \u2014 all tracked and auditable.",
    screens: [
      {
        role: "Mrs Chen (coordinator)",
        roleIcon: Shield,
        roleColor: "text-purple-600",
        page: "Broadcast Notification",
        pageIcon: Megaphone,
        title: "School-wide alert sent to parents",
        description: "Coordinators can broadcast alerts to all parents, all staff, or specific groups. Every send is audit-logged.",
        mockupElements: [
          { type: "form", content: "Audience: All Parents" },
          { type: "form", content: "Category: Bullying Awareness" },
          { type: "form", content: "Subject: \"Addressing a pattern of targeted bullying\"" },
          { type: "notification", content: "Your child's school has identified a pattern of group bullying. The school is taking action including restorative work and safety plans.", color: "blue" },
          { type: "badge", content: "Sent to 47 parents", color: "green" },
        ],
      },
      {
        role: "Sofia's mum (parent)",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "Notifications",
        pageIcon: Bell,
        title: "Parent receives the alert",
        description: "Sofia's mum sees the notification in her app. She now understands the school is acting. She can also see diagnostics results showing how children feel.",
        mockupElements: [
          { type: "notification", content: "We have identified and are addressing a pattern of targeted bullying. Your child has been assigned a named safe adult.", color: "blue" },
          { type: "action", content: "Acknowledge notification", color: "teal" },
        ],
      },
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Messages",
        pageIcon: MessageSquare,
        title: "Sofia gets a safe adult",
        description: "Sofia can now message her named safe adult directly through the platform. Private, secure, and available any time.",
        mockupElements: [
          { type: "notification", content: "You have a new safe contact: Ms Rivera. You can message her any time you need to talk.", color: "teal" },
          { type: "form", content: "Message: \"Hi Ms Rivera, can I talk to you at break?\"" },
        ],
      },
    ],
  },
  {
    id: "diagnostics",
    week: "Week 6",
    title: "The school runs a diagnostic",
    subtitle: "Anonymous surveys reveal what nobody would say out loud.",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: ClipboardCheck,
    narrative: "Mrs Chen launches a school climate diagnostic. Pupils, staff, and parents each answer 20 questions. The results reveal perception gaps nobody expected.",
    screens: [
      {
        role: "All users",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "Diagnostic Survey",
        pageIcon: ClipboardCheck,
        title: "20-question anonymous climate survey",
        description: "Role-adaptive questions for pupils, staff, and parents across 5 categories: Awareness, Trust, Culture, Knowledge, Readiness.",
        mockupElements: [
          { type: "form", content: "\"I feel safe at break time\" \u2014 Strongly Disagree \u2022 Disagree \u2022 Neutral \u2022 Agree \u2022 Strongly Agree" },
          { type: "badge", content: "142 responses: 88 pupils \u2022 32 staff \u2022 22 parents", color: "amber" },
        ],
      },
      {
        role: "Parents / PTA",
        roleIcon: Users,
        roleColor: "text-amber-600",
        page: "Diagnostic Results",
        pageIcon: BarChart3,
        title: "Perception gaps highlighted for parents",
        description: "Parents see aggregated scores by group. Where pupils and staff see things very differently, the system highlights the gap with an explanation.",
        mockupElements: [
          { type: "chart", content: "Trust & Reporting: Pupils 2.1 \u2022 Parents 3.9 \u2022 Staff 4.2" },
          { type: "alert", content: "1.8pt perception gap: Pupils scored 'If I report something, it will make things better' at 2.1 while parents scored 3.9. Children don't trust the system the way parents assume.", color: "amber" },
        ],
      },
    ],
  },
  {
    id: "recovery",
    week: "Week 8",
    title: "The data proves it worked",
    subtitle: "Mood recovers. Incidents stop. The PTA sees the evidence.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: Sparkles,
    narrative: "Two months later. Sofia's diary mood is back to 4. Marcus's behaviour points have dropped. The PTA annual report shows the full picture, anonymised.",
    screens: [
      {
        role: "Sofia (pupil)",
        roleIcon: Heart,
        roleColor: "text-teal-600",
        page: "Feelings Diary",
        pageIcon: BookHeart,
        title: "Mood recovery visible in diary",
        description: "Sofia's diary shows the journey: from happy, to declining, to lowest point, to recovery. The emotional evidence that the intervention worked.",
        mockupElements: [
          { type: "chart", content: "Week 1: \ud83d\ude42 4 \u2192 Week 3: \ud83d\ude22 1 \u2192 Week 5: \ud83d\ude10 3 \u2192 Week 8: \ud83d\ude04 4" },
          { type: "badge", content: "Mood trend: recovering \u2191", color: "green" },
        ],
      },
      {
        role: "PTA Chair",
        roleIcon: Users,
        roleColor: "text-emerald-600",
        page: "PTA Portal",
        pageIcon: BarChart3,
        title: "Anonymised annual report",
        description: "PTA members see anonymised KPIs, incident trends, and mood data. No names, no details \u2014 just evidence that the school's safeguarding is working.",
        mockupElements: [
          { type: "chart", content: "Incidents this term: 23 reported \u2022 19 resolved \u2022 4 in progress" },
          { type: "chart", content: "School-wide mood trend: 3.2 \u2192 3.8 (improving)" },
          { type: "notification", content: "PTA Annual Report: \"We identified and resolved a ringleader-plus-recruited-bullies pattern. Mood data shows full recovery within 5 weeks of intervention.\"", color: "green" },
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
    return (
      <div className="px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-xs">
        <div className="flex items-center gap-1.5 mb-1">
          <BarChart3 size={12} className="text-muted-foreground" />
          <span className="font-bold text-muted-foreground uppercase tracking-wide" style={{ fontSize: "10px" }}>Data</span>
        </div>
        <p className="font-mono text-foreground/70">{el.content}</p>
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
    <div className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground">
      {el.content}
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow Sofia's story through the actual platform &mdash; see every screen, every alert, every action that protects a child.
          </p>
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    i === activeStep
                      ? `${s.bgColor} ${s.borderColor} ${s.color}`
                      : i < activeStep
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    <StepIcon size={18} />
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
                <div className="px-6 pt-4 flex gap-2 flex-wrap">
                  {step.screens.map((scr, i) => {
                    const RIcon = scr.roleIcon;
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveScreen(i)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                          i === activeScreen
                            ? `${step.bgColor} ${step.borderColor} ${step.color}`
                            : "bg-card border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <RIcon size={14} />
                        <span>{scr.role}</span>
                        <span className="opacity-50">&middot;</span>
                        <span className="opacity-70">{scr.page}</span>
                      </button>
                    );
                  })}
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <span className="text-xs text-muted-foreground">{activeStep + 1} of {STEPS.length}</span>
          <button
            onClick={() => goTo(Math.min(STEPS.length - 1, activeStep + 1))}
            disabled={activeStep === STEPS.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
          <div className="p-5 rounded-xl bg-card border border-border">
            <FileText size={24} className="mx-auto text-indigo-500 mb-2" />
            <p className="font-bold text-sm">7 platform features</p>
            <p className="text-xs text-muted-foreground">Diary, incidents, alerts, behaviour, diagnostics, notifications, PTA portal</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <Users size={24} className="mx-auto text-amber-500 mb-2" />
            <p className="font-bold text-sm">4 perspectives</p>
            <p className="text-xs text-muted-foreground">Pupils, parents, teachers, and coordinators each see what they need</p>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <Shield size={24} className="mx-auto text-purple-500 mb-2" />
            <p className="font-bold text-sm">3 compliance frameworks</p>
            <p className="text-xs text-muted-foreground">LOPIVI, Convixit, and Machista Violence protocols built in</p>
          </div>
        </div>

        <div className="mt-8 text-center">
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

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Play } from "lucide-react";
import { Button } from "@/components/ui-polished";

interface DemoStep {
  page: string;
  navHighlight?: string;
  title: string;
  description: string;
  benefit: string;
  position?: "center" | "sidebar" | "top";
}

interface DemoContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startDemo: () => void;
  stopDemo: () => void;
  nextStep: () => void;
  prevStep: () => void;
  currentStepData: DemoStep | null;
}

const DemoContext = createContext<DemoContextType>({
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  startDemo: () => {},
  stopDemo: () => {},
  nextStep: () => {},
  prevStep: () => {},
  currentStepData: null,
});

export const useDemo = () => useContext(DemoContext);

function getStepsForRole(role: string): DemoStep[] {
  if (role === "pupil") {
    return [
      {
        page: "/",
        title: "Your Dashboard",
        description: "Your safe contacts are listed here — these are the adults you can message. The three quick-action buttons let you: report an incident, send an urgent help alert (goes to your form tutor and the safeguarding coordinator), or request a private chat with a trusted adult. Your recent notifications appear below.",
        benefit: "One-tap access to report, get urgent help, or talk to someone you trust.",
      },
      {
        page: "/report",
        navHighlight: "Report Incident",
        title: "Report Something That Happened",
        description: "Step 1: Choose what happened — pick from 8 categories: Physical, Verbal, Mind games, My body my rules, Leaving out, Pressure/control, Property, or Online. Step 2: Pick where it happened (Playground, Forest, Classroom, Corridors, Toilets, Online, and more). Step 3: Name who was involved — or tick 'Report anonymously' so nobody knows it was you. Step 4: Choose how you're feeling with emoji faces (Scared, Sad, Angry, Worried, Confused, or Okay). Step 5: Write what happened in your own words. Your report goes to the safeguarding team.",
        benefit: "You control what to share. Anonymous reporting means you can speak up safely.",
      },
      {
        page: "/diary",
        navHighlight: "My Diary",
        title: "Your Private Diary",
        description: "Tap the diary cover to start writing. You can pick a mood emoji (Sad, Worried, Meh, Happy, Amazing) or just start writing straight away — the mood is optional. Your entries are private — only you and your parent can see them. Tap the palette icon at the top to switch between 6 diary styles: Classic, Ocean, Rose, Forest, Midnight, and Sunset. Each entry shows the date and time. You can delete old entries if you want to.",
        benefit: "A safe, private space to write down your thoughts and feelings. The AI watches over entries to keep you safe — but nobody reads your diary.",
      },
      {
        page: "/behaviour",
        navHighlight: "My Behaviour",
        title: "Your Behaviour Record",
        description: "The colour gauge at the top shows your current level: green (Good Standing, 0-3 pts), yellow (Warning, 4-6 pts), orange (Formal Warning, 7-9 pts), or red (higher levels). Below it you can see every behaviour point you've received — what category it was (disruption, disrespect, bullying, physical, verbal, property, defiance, safety, online), when it happened, and which teacher gave it. The escalation ladder shows all 7 levels from Good Standing through to Full Exclusion.",
        benefit: "No surprises — you can always see exactly where you are and what the levels mean.",
      },
      {
        page: "/learnings",
        navHighlight: "School Updates",
        title: "School Updates & News",
        description: "Your teachers post updates here — school news, safeguarding reminders, event announcements, and important notices. New posts appear at the top. You can read through everything your school has shared.",
        benefit: "Stay in the loop with what's happening at school.",
      },
      {
        page: "/diagnostics",
        navHighlight: "Diagnostic",
        title: "Safeguarding Survey",
        description: "When a survey is active, you'll answer questions about how safe you feel at school using emoji faces — from sad to happy. Questions cover: whether bullying happens, do you know how to report it, do you feel safe, and are people kind to each other. For questions about bad things (like 'does bullying happen?'), the happy face means 'not at all' — because no bullying is a good thing! Your answers help the school understand how everyone feels.",
        benefit: "Your voice matters. The school uses your answers to make things better for everyone.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "How To Use SafeSkoolZ",
        description: "Step-by-step guides explain every feature: how to report an incident, how to use your diary, how messages work, how to send an urgent help alert, and how the behaviour system works. Each guide has numbered steps you can follow along with.",
        benefit: "If you're ever unsure how something works, the answer is here.",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Learn About Staying Safe",
        description: "Sections cover: What is bullying? (physical, verbal, cyber, exclusion), What to do if you're being bullied, How to help a friend who's being bullied, Your rights at school, Understanding your feelings, and Online safety. Each topic uses simple language and real examples.",
        benefit: "Understanding what's happening is the first step to feeling safe.",
      },
      {
        page: "/notifications",
        navHighlight: "Notifications",
        title: "Your Notifications",
        description: "Every important update appears here — when a teacher responds to your report, when you receive a message, when your behaviour record changes, or when there's something new to read. Unread notifications show a red badge on the bell icon in the sidebar. Tap any notification to go straight to the related page.",
        benefit: "Never miss an important update. Everything is in one place.",
      },
      {
        page: "/settings",
        navHighlight: "My Settings",
        title: "Your Avatar & Settings",
        description: "Pick your animal avatar from the grid — dog, cat, rabbit, bear, fox, owl, penguin, lion, panda, unicorn, and more. Your chosen animal appears next to your name everywhere in SafeSkoolZ. You can change it any time.",
        benefit: "Your avatar is your identity in SafeSkoolZ — pick the one that feels like you.",
      },
    ];
  }

  if (role === "parent") {
    return [
      {
        page: "/",
        title: "Parent Dashboard",
        description: "The top cards show your child's current behaviour level (Good Standing, Warning, Formal Warning, etc.), total incidents this term, and any unread notifications. Below, the monthly trend chart plots incidents over time so you can see if things are improving or worsening. Recent notifications list every update — new incidents, behaviour points, messages from staff, and status changes on existing cases. You can also contact your PTA representatives directly from here.",
        benefit: "At a glance: is my child safe, and are things getting better or worse?",
      },
      {
        page: "/report",
        navHighlight: "Report Incident",
        title: "Submit Your Own Concern",
        description: "You can report a concern yourself — choose from the same 8 categories (physical, verbal, psychological, sexual, relational, coercive, property, online), describe what happened, name who was involved, and select the location. Your report goes to the school's safeguarding team and is treated with the same priority as any staff-reported incident.",
        benefit: "Your concerns are formally recorded, tracked, and responded to — not lost in an email.",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Your Child's Incident Reports",
        description: "Every incident involving your child is listed with: date and time, category (physical, verbal, psychological, sexual, relational, coercive, property, online), location, current status (open, under review, investigating, resolved, closed), and your child's role. Tap any incident to see the full report including: what happened, who was involved, your child's emotional state at the time, staff assessment notes, and any actions taken. You only see incidents marked as parent-visible — false or unverified reports are filtered out by staff.",
        benefit: "Full transparency: see exactly what happened, how your child felt, and what the school is doing.",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Points & Escalation",
        description: "See your child's current behaviour level on the colour gauge. Below it, every behaviour point is listed: date, category (disruption, disrespect, bullying, physical aggression, verbal abuse, property damage, defiance, endangering safety, online misconduct), the teacher who issued it, and any notes. The 7 escalation levels: Good Standing (0-3 pts), Warning (4-6), Formal Warning (7-9), Suspension Risk (10-14), Suspended (15-19), Term Exclusion (20-24), Full Exclusion (25+).",
        benefit: "Understand exactly where your child stands and what each level means before it escalates.",
      },
      {
        page: "/learnings",
        navHighlight: "School Updates",
        title: "School Updates & News",
        description: "Teachers post updates here — school news, safeguarding reminders, event announcements, and important notices. This is also where you'll find newsletters, policy updates, and information about upcoming events. New posts appear at the top.",
        benefit: "Stay informed about what's happening at your child's school.",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Messages & Emergency Alerts",
        description: "Send messages directly to your child's class teacher, head of year, SENCO, or the safeguarding coordinator. Each conversation is a thread — you can see the full history. If your child has pressed the 'Urgent Help' button, you'll see their emergency alert — the timestamp, the message they sent, and who received it (their form tutor and coordinator).",
        benefit: "Direct, private communication with staff — plus visibility when your child asks for urgent help.",
      },
      {
        page: "/diagnostics",
        navHighlight: "Diagnostic",
        title: "Safeguarding Survey",
        description: "When a survey is active, you'll answer questions about your perception of the school's safeguarding culture — how much of a problem you think bullying is, whether you believe your child feels safe, how confident you are in the reporting system, and how well the school communicates. Your responses are anonymous and help the school measure and improve its safeguarding climate.",
        benefit: "Your voice shapes how the school improves. Honest answers lead to real action plans.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "How To Use SafeSkoolZ",
        description: "Step-by-step guides for every feature — viewing incidents, checking behaviour points and levels, messaging staff, reporting concerns, and reading your child's diary. Each guide has numbered steps you can follow along with.",
        benefit: "Never feel lost — everything is explained here.",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Safeguarding Resources for Parents",
        description: "Guides cover: How to talk to your child about bullying, Signs your child might be being bullied, What the school's safeguarding policy covers, How LOPIVI (child protection law) protects your child, Online safety at home, and How the Convivèxit anti-bullying protocol works. Each guide is written in plain language with actionable steps.",
        benefit: "Practical knowledge to support your child and understand how the school's safeguarding system works.",
      },
      {
        page: "/notifications",
        navHighlight: "Notifications",
        title: "Your Notifications",
        description: "Every important update appears here — new incidents involving your child, behaviour point changes, messages from staff, and survey invitations. Unread notifications show a red badge on the bell icon. Tap any notification to go straight to the related page.",
        benefit: "Never miss an important update about your child.",
      },
      {
        page: "/settings",
        navHighlight: "Settings",
        title: "Your Profile & Settings",
        description: "Update your profile information and preferences. Manage your notification settings and account details.",
        benefit: "Keep your profile up to date so staff can reach you when it matters.",
      },
    ];
  }

  if (role === "teacher" || role === "head_of_year") {
    return [
      {
        page: "/",
        title: "Dashboard & Analytics",
        description: "Top row: KPI cards showing total incidents this term, open cases needing action, and active pattern alerts. Below: a location heatmap showing where incidents happen most (playground, corridors, toilets), an incident category breakdown (physical, verbal, psychological, sexual, relational, coercive, property, online), and a monthly trend line chart. The 'Recent Incidents' feed lists the latest reports with status badges.",
        benefit: "Spot where problems happen, what types are most common, and whether things are improving.",
      },
      {
        page: "/report",
        navHighlight: "Log Incident",
        title: "Log an Incident — Step by Step",
        description: "Step 1: Select categories (physical, verbal, psychological, sexual, relational, coercive, property, online — select all that apply). Step 2: Add victims and perpetrators from the pupil list — multiple allowed. You can also describe unknown persons. Step 3: Choose location from school-specific places (Playground, Forest, Stage, Classroom, Corridors, etc.), plus date/time. Step 4: Write your professional description of what happened. Step 5: Submit — the system auto-assigns an escalation tier based on category and notifies the coordinator for serious incidents.",
        benefit: "Consistent, compliant recording. Auto-escalation means nothing falls through the cracks.",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Points System",
        description: "Issue points to any pupil: select the pupil, choose a category (disruption, disrespect, bullying, physical aggression, verbal abuse, property damage, defiance, endangering safety, online misconduct, or other), and add a reason and notes. Each category has a default point value (1-3 pts). The system tracks cumulative totals and moves pupils through the 7-level escalation ladder: Good Standing (0-3 pts), Warning (4-6), Formal Warning (7-9), Suspension Risk (10-14), Suspended (15-19), Term Exclusion (20-24), Full Exclusion (25+). Parents see their child's level automatically.",
        benefit: "Fair, transparent escalation. Points accumulate, levels change automatically, parents see it in real time.",
      },
      {
        page: "/class",
        navHighlight: role === "head_of_year" ? "My Year Group" : "My Class",
        title: "Pupil Management & PINs",
        description: "Your class roster shows every pupil with their avatar, name, year group, and current behaviour level. PIN Management: each pupil has a unique 4-digit PIN for login. You can: 'Reset All PINs' to bulk-generate new PINs for the whole class, reset an individual pupil's PIN if they forget it, unlock a locked account (locked after 3 wrong attempts), show/hide PINs on screen, and 'Print PIN Slips' to generate cut-out slips for each pupil with their name and new PIN. Locked accounts show a red lock icon.",
        benefit: "Full control over pupil access. Bulk reset at the start of term, print slips for distribution, unlock in seconds.",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Messages, Urgent Help & Chat Requests",
        description: "Three message types arrive here: 1) Regular messages from pupils and parents — reply in threaded conversations. 2) Urgent Help alerts — a pupil has pressed the emergency button; shows their name, timestamp, and message. These are sent to the pupil's form tutor and coordinator. 3) Chat requests — a pupil wants a private conversation. Unread counts show as badges.",
        benefit: "Urgent alerts surface instantly. Chat requests let children ask for help without explaining everything in writing.",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Incident Management & Assessment",
        description: "Browse all incidents involving your pupils. Each shows category, date, status (open, under review, investigating, resolved, closed), and pupils involved. Open any incident to: change its status, write a staff assessment, add witness statements, write a parent-facing summary, and toggle parent visibility on/off to hide sensitive or unverified reports from parents.",
        benefit: "Complete case management. Assess, document, and control exactly what parents see.",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Automated Pattern Alerts",
        description: "The system scans all incidents and generates alerts for concerning patterns — repeat perpetrators, multi-victim patterns, escalating frequency, and welfare concerns. Each alert shows the triggering incidents and the pupil(s) involved so you can see the full picture and take action.",
        benefit: "The system connects dots across hundreds of data points that no single teacher could track manually.",
      },
      {
        page: "/learnings",
        navHighlight: "School Updates",
        title: "School Updates & Posts",
        description: "Post updates for pupils and parents — school news, safeguarding reminders, event announcements, and important notices. Create new posts with a title and content. Your posts are visible to all pupils and parents in the school. You can delete your own posts if needed.",
        benefit: "Keep the whole school community informed. One post reaches every pupil and parent.",
      },
      {
        page: "/diagnostics",
        navHighlight: "Diagnostics",
        title: "Safeguarding Climate Survey",
        description: "Launch diagnostic surveys to measure how pupils, staff, and parents perceive the school's safeguarding culture. Each role gets tailored questions about awareness, trust, reporting, wellbeing, and policy knowledge. View results with radar charts and bar charts showing scores by category and role group. Generate AI-powered action plans with KPIs, baselines, targets, and timeframes.",
        benefit: "Data-driven safeguarding improvement. Measure what matters and track progress over time.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "Training & Help Guides",
        description: "Step-by-step guides for every feature: logging incidents, assessing reports, managing PINs and locked accounts, issuing behaviour points, understanding the 7-level escalation ladder, responding to urgent help alerts, and reading pattern alerts. Each guide has numbered steps you can follow along with.",
        benefit: "New staff can self-train. Experienced staff can look up any feature they haven't used recently.",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Safeguarding Education Hub",
        description: "Educational resources about safeguarding, anti-bullying, child protection, and online safety. Age-appropriate materials you can use in lessons or recommend to pupils and parents.",
        benefit: "Ready-made educational content to support safeguarding across the curriculum.",
      },
      {
        page: "/notifications",
        navHighlight: "Notifications",
        title: "Your Notifications",
        description: "Every important update — new incidents, behaviour alerts, messages, protocol updates, and urgent help requests. Unread notifications show a red badge on the bell icon. Tap any notification to go straight to the action needed.",
        benefit: "Never miss a safeguarding action. Critical alerts rise to the top.",
      },
    ];
  }

  if (role === "senco") {
    return [
      {
        page: "/",
        title: "SENCO Dashboard",
        description: "School-wide KPIs: total incidents, open cases, active alerts, protocol status, and caseload size. The trend chart shows monthly incident volume across the whole school. Category breakdown reveals the most common incident types. The alert panel highlights any unacknowledged pattern alerts requiring your attention.",
        benefit: "Whole-school safeguarding health at a glance — see what needs attention right now.",
      },
      {
        page: "/caseload",
        navHighlight: "My Caseload",
        title: "Caseload Management",
        description: "Add vulnerable pupils to your caseload with a priority level (high, medium, low) and reason (SEN, behaviour, safeguarding, welfare, etc.). For each pupil, record progress observations: rate their feelings (1-5), attitudes (1-5), and overall progress (1-5), plus free-text notes. View the tracking timeline to see how ratings change over weeks and months. Filter by priority to focus on high-risk pupils first. Remove pupils from your caseload when they no longer need monitoring.",
        benefit: "Structured, evidence-based tracking. Progress ratings over time show whether interventions are working.",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "School-Wide Behaviour Analysis",
        description: "See every pupil's behaviour level across all classes. Issue points in any category (disruption, disrespect, bullying, physical aggression, verbal abuse, property damage, defiance, endangering safety, online misconduct, or other). The 7-level escalation ladder: Good Standing (0-3 pts), Warning (4-6), Formal Warning (7-9), Suspension Risk (10-14), Suspended (15-19), Term Exclusion (20-24), Full Exclusion (25+). Identify pupils approaching threshold levels before they cross. Parents see their child's level automatically.",
        benefit: "Intervene before exclusion. Spot pupils at risk across the entire school.",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Full Incident Oversight",
        description: "Access every incident school-wide. Each shows category, date, status (open, under review, investigating, resolved, closed), and pupils involved. Open any incident to: read the original report, view staff assessments, add your own SENCO notes, read witness statements, write a parent summary, toggle parent visibility, and change status.",
        benefit: "Complete safeguarding oversight. Every incident across all classes in one place.",
      },
      {
        page: "/protocols",
        navHighlight: "Protocols",
        title: "Formal Protocol Workflows",
        description: "Three protocol types: 1) Convivèxit (anti-bullying) — phases: detection, investigation, mediation, resolution, follow-up. 2) LOPIVI (child protection) — phases: initial concern, assessment, referral, intervention, review. 3) Machista Violence (gender-based) — specialised phases for gender violence cases. For each protocol: assign pupils, record interviews with timestamps, complete risk assessments (likelihood × impact scoring), create and assign case tasks with deadlines, log external referrals (social services, police, health), and track phase progression with a visual timeline.",
        benefit: "Full compliance with Balearic Islands legislation. Every step documented for inspections and audits.",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Pattern Detection & Response",
        description: "System-generated alerts for concerning patterns: repeat perpetrators, multi-victim targeting, escalating frequency, and welfare flags. Each alert links to its triggering incidents with the pupil(s) involved so you can review the full picture and decide on appropriate intervention.",
        benefit: "Automated early warning system. Patterns that take humans weeks to spot are flagged instantly.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "SENCO Training Guide",
        description: "Covers all standard features plus SENCO-specific workflows: adding pupils to your caseload, recording progress observations, interpreting tracking timelines, managing protocols through each phase, conducting and recording interviews, completing risk assessments, and creating case tasks. Each guide has numbered steps with context for why each action matters.",
        benefit: "Complete training resource. New SENCOs can be operational within a single session.",
      },
    ];
  }

  if (role === "coordinator" || role === "head_teacher") {
    return [
      {
        page: "/",
        title: "Safeguarding Dashboard",
        description: "Top-level KPIs: total incidents this term, open cases requiring action, active pattern alerts, and protocol status. The trend chart plots incident volume over time. The category breakdown shows distribution across the 8 types (physical, verbal, psychological, sexual, relational, coercive, property, online). The location heatmap highlights where incidents cluster. Recent incidents feed shows the latest reports needing review.",
        benefit: "Strategic overview for safeguarding leadership. Identify trends, hotspots, and resource needs.",
      },
      {
        page: "/report",
        navHighlight: "Log Incident",
        title: "Incident Logging & Auto-Escalation",
        description: "Log incidents with: category selection (8 types: physical, verbal, psychological, sexual, relational, coercive, property, online — select all that apply), victim/perpetrator assignment (multiple pupils allowed, plus unknown person descriptions), location from school-specific places (Playground, Forest, Stage, Classroom, Corridors, etc.), date/time, and your professional description. On submit, the system auto-assigns an escalation tier based on category and notifies relevant staff.",
        benefit: "No manual escalation needed. The system ensures serious incidents reach the right people immediately.",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Incident Lifecycle Management",
        description: "Full control over every incident school-wide. Status workflow: Open → Under Review → Investigating → Resolved → Closed. For each incident: read the original report and any staff assessments, add your own coordinator notes, review witness statements, write the parent-facing summary, and toggle parent visibility to hide sensitive or unverified reports from parents.",
        benefit: "Own the full lifecycle. Every case properly managed, documented, and auditable.",
      },
      {
        page: "/protocols",
        navHighlight: "Protocols",
        title: "Protocol Management — Convivèxit, LOPIVI & Machista",
        description: "Create and manage formal protocols required by Balearic Islands law. Convivèxit (anti-bullying): detection → investigation → mediation → resolution → follow-up. LOPIVI (child protection): initial concern → assessment → referral → intervention → review. Machista Violence (gender-based): specialised pathway. For each protocol: assign pupils and staff, record formal interviews (timestamped, signed), complete risk assessments with likelihood × impact matrix, create and assign case tasks with deadlines and owners, log external referrals to social services/police/health, and track phase progression on a visual timeline.",
        benefit: "Inspection-ready compliance. Every required step documented with timestamps and audit trails.",
      },
      {
        page: "/class",
        navHighlight: "All Pupils",
        title: "School-Wide Pupil Directory",
        description: "Every pupil across all classes and year groups. For each pupil: view their incident history, current behaviour level, class and year group, and login status. PIN management: generate unique 4-digit PINs, bulk reset entire classes, print PIN slips for distribution, reset individual PINs, and unlock accounts locked after 3 failed login attempts. Search and filter by year group, class, or name.",
        benefit: "Complete pupil overview. Manage access for the entire school from one place.",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Pattern Alerts & Early Warning",
        description: "The system continuously analyses all incidents and flags concerning patterns: repeat perpetrators, multi-victim patterns, escalating frequency, and welfare indicators. Each alert lists the triggering incidents with the pupil(s) involved so you can review the full picture and decide on intervention.",
        benefit: "Automated vigilance across thousands of data points. Patterns that emerge over weeks are caught early.",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Communications Hub",
        description: "All message threads from parents and pupils. Three types: regular messages (reply in thread), urgent help alerts (pupil pressed emergency button — sent to their form tutor and coordinator), and chat requests (pupil wants private conversation). Unread counts show as badges.",
        benefit: "Central communication hub. Urgent situations surface first; nothing gets buried.",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour System & Escalation Ladder",
        description: "School-wide view of every pupil's behaviour standing. The 7-level escalation system: Level 1 — Good Standing (0-3 pts): no concerns. Level 2 — Warning (4-6): some concerns. Level 3 — Formal Warning (7-9): meeting with parents required. Level 4 — Suspension Risk (10-14): urgent action needed. Level 5 — Suspended (15-19): suspended from school. Level 6 — Term Exclusion (20-24): excluded for the term. Level 7 — Full Exclusion (25+): permanently excluded. Issue points in categories: disruption, disrespect, bullying, physical aggression, verbal abuse, property damage, defiance, endangering safety, online misconduct, other. Parents see their child's level automatically.",
        benefit: "Transparent, consistent discipline. Every level has clear thresholds, actions, and parent visibility.",
      },
      {
        page: "/learnings",
        navHighlight: "School Updates",
        title: "School Updates & Posts",
        description: "Post updates for the school community — news, safeguarding reminders, policy changes, and important notices. Create new posts visible to all pupils, parents, and staff.",
        benefit: "One post reaches the entire school community. Keep everyone informed.",
      },
      {
        page: "/diagnostics",
        navHighlight: "Diagnostics",
        title: "Safeguarding Climate Survey",
        description: "Create and launch diagnostic surveys to measure how pupils, staff, and parents perceive the school's safeguarding culture. Each role gets tailored questions. View results with radar charts and bar charts. Generate AI-powered action plans with KPIs, baselines, targets, and timeframes aligned to LOPIVI and Convivèxit requirements.",
        benefit: "Evidence-based safeguarding improvement. Measure, plan, and track progress systematically.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "Staff Training Resource",
        description: "Complete training guides for all features: incident logging, status management, protocol management, PIN management and printing, behaviour point system and the 7-level escalation ladder, pattern alerts, and dashboard analytics. Each guide has numbered steps you can follow along with.",
        benefit: "Onboard new staff quickly. Every procedure documented step-by-step.",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Safeguarding Education Hub",
        description: "Educational resources for staff, pupils, and parents. Anti-bullying, child protection, online safety, and LOPIVI/Convivèxit guidance materials.",
        benefit: "Ready-made educational content to support safeguarding across the school.",
      },
      {
        page: "/notifications",
        navHighlight: "Notifications",
        title: "Your Notifications",
        description: "Every important update — new incidents, protocol updates, urgent help alerts, behaviour escalations, and staff messages. Critical notifications surface first. Tap any notification to go straight to the action needed.",
        benefit: "Never miss a safeguarding action. Everything that needs your attention in one place.",
      },
    ];
  }

  if (role === "pta") {
    return [
      {
        page: "/pta",
        title: "PTA Dashboard",
        description: "Your PTA Portal home — KPI cards show the current safeguarding climate: total incidents this term (anonymised), active protocols, survey participation rates, and wellbeing trends. Charts show incident trends over time and category breakdowns. All data is anonymised — you never see individual pupil names.",
        benefit: "Oversight without overstepping. See the big picture without compromising any child's privacy.",
      },
      {
        page: "/pta",
        title: "Coordinator Channel",
        description: "Direct messaging channel to the school's Safeguarding Coordinator. Raise questions, flag concerns, or request updates. All messages are threaded and timestamped. You can also formally raise a concern through the 'Raise Concern' form — these are tracked separately and require a coordinator response.",
        benefit: "Direct line to the safeguarding lead. Formal concerns are tracked and can't be ignored.",
      },
      {
        page: "/pta",
        title: "Policy Review",
        description: "Review the school's current safeguarding and anti-bullying policy. You can acknowledge that you've read it, or flag specific sections you think need updating. Flagged items are sent to the coordinator for review. The policy review status shows which PTA members have acknowledged the current version.",
        benefit: "Active PTA involvement in policy governance. Flag gaps before they become problems.",
      },
      {
        page: "/pta",
        title: "Annual Report & Co-Design",
        description: "The Annual Report tab shows the school's anonymised safeguarding report — incident volumes, category trends, protocol outcomes, and action plan progress. You can approve or request changes. The Co-Design tab is a collaborative workspace where PTA members and staff can propose and vote on safeguarding improvements.",
        benefit: "Genuine partnership. The PTA isn't just informed — they actively shape safeguarding policy.",
      },
      {
        page: "/pta",
        title: "Resources Library",
        description: "Curated safeguarding resources organised by category: protocol guides (LOPIVI, Convivèxit), parent guides (how to talk to your child about bullying), training materials, and external links to official bodies. Documents, videos, and web links in one searchable library.",
        benefit: "Everything a PTA member needs to understand the safeguarding landscape.",
      },
      {
        page: "/learnings",
        navHighlight: "School Updates",
        title: "School Updates & News",
        description: "School-wide updates from teachers and coordinators — news, safeguarding reminders, event announcements, and policy changes. Stay informed about what's happening across the school community.",
        benefit: "Stay connected to the school's day-to-day safeguarding activity.",
      },
      {
        page: "/diagnostics",
        navHighlight: "Diagnostic",
        title: "Safeguarding Survey",
        description: "When a survey is active, you'll answer questions about the school's safeguarding culture from the PTA perspective — policy effectiveness, communication quality, trust in reporting systems, and overall safeguarding readiness. Your responses help shape the school's improvement plan.",
        benefit: "Your expertise as a parent and PTA member directly influences school safeguarding priorities.",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "How To Use SafeSkoolZ",
        description: "Step-by-step guides for every PTA feature: navigating the dashboard, messaging the coordinator, reviewing policy, accessing the annual report, using the co-design workspace, and understanding the resources library.",
        benefit: "Get up to speed quickly. Every PTA feature explained step by step.",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Safeguarding Education",
        description: "Guides on safeguarding, anti-bullying, child protection law, and online safety — written for parents and PTA members in plain language with practical steps.",
        benefit: "Deepen your understanding of safeguarding to be a more effective PTA advocate.",
      },
      {
        page: "/notifications",
        navHighlight: "Notifications",
        title: "Your Notifications",
        description: "Updates about new survey invitations, coordinator responses to your concerns, policy changes, annual report availability, and co-design proposals. Tap any notification to go straight to the action.",
        benefit: "Never miss an important PTA update.",
      },
    ];
  }

  return [
    {
      page: "/",
      title: "Your Dashboard",
      description: "Your home page with relevant information and quick actions.",
      benefit: "Everything you need in one place.",
    },
    {
      page: "/training",
      navHighlight: "Training",
      title: "Training Guide",
      description: "Step-by-step guides for every feature.",
      benefit: "Learn at your own pace.",
    },
  ];
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const steps = user ? getStepsForRole(user.role) : [];

  const startDemo = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    if (steps.length > 0) {
      setLocation(steps[0].page);
    }
  }, [steps, setLocation]);

  const stopDemo = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    sessionStorage.removeItem("safeschool_start_demo");
  }, []);

  useEffect(() => {
    if (user && steps.length > 0 && sessionStorage.getItem("safeschool_start_demo") === "true") {
      sessionStorage.removeItem("safeschool_start_demo");
      const timer = setTimeout(() => {
        startDemo();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, steps.length]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setLocation(steps[next].page);
    } else {
      stopDemo();
    }
  }, [currentStep, steps, setLocation, stopDemo]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      setLocation(steps[prev].page);
    }
  }, [currentStep, steps, setLocation]);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopDemo();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextStep(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prevStep(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, stopDemo]);

  return (
    <DemoContext.Provider value={{
      isActive,
      currentStep,
      totalSteps: steps.length,
      startDemo,
      stopDemo,
      nextStep,
      prevStep,
      currentStepData: isActive ? steps[currentStep] || null : null,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function DemoOverlay() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, stopDemo } = useDemo();
  const [navRect, setNavRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !currentStepData?.navHighlight) {
      setNavRect(null);
      return;
    }
    const timer = setTimeout(() => {
      const links = document.querySelectorAll("aside a");
      for (const link of links) {
        if (link.textContent?.trim().includes(currentStepData.navHighlight!)) {
          const rect = link.getBoundingClientRect();
          setNavRect(rect);
          link.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return;
        }
      }
      setNavRect(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [isActive, currentStepData, currentStep]);

  if (!isActive || !currentStepData) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      {navRect && (
        <motion.div
          key={`highlight-${currentStep}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed pointer-events-none z-[90]"
          style={{
            top: navRect.top - 4,
            left: navRect.left - 4,
            width: navRect.width + 8,
            height: navRect.height + 8,
          }}
        >
          <div className="w-full h-full rounded-xl border-2 border-primary bg-primary/10 shadow-lg shadow-primary/30 animate-pulse" />
        </motion.div>
      )}

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 md:left-64 z-[100]"
      >
        <div className="w-full h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="bg-card/95 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm mt-0.5">
                {currentStep + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-foreground text-sm">{currentStepData.title}</h3>
                  <span className="text-xs text-muted-foreground shrink-0">{currentStep + 1}/{totalSteps}</span>
                </div>
                <div className="max-h-28 overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">{currentStepData.description}</p>
                </div>
                <p className="text-xs text-primary font-medium mt-1">{currentStepData.benefit}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={isFirst}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="h-8 gap-1 px-3"
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ChevronRight size={14} />}
                </Button>
                <button
                  onClick={stopDemo}
                  className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function StartDemoButton({ className }: { className?: string }) {
  const { startDemo } = useDemo();
  const { user } = useAuth();
  if (!user) return null;

  const labels: Record<string, string> = {
    pupil: "Take me on a tour",
    parent: "Start the demo",
    teacher: "Start staff demo",
    head_of_year: "Start staff demo",
    coordinator: "Start coordinator demo",
    head_teacher: "Start head teacher demo",
    senco: "Start SENCO demo",
    support_staff: "Start staff demo",
  };

  return (
    <Button
      onClick={startDemo}
      size="lg"
      className={`gap-2 shadow-lg shadow-primary/20 ${className || ""}`}
    >
      <Play size={18} />
      {labels[user.role] || "Start demo"}
    </Button>
  );
}

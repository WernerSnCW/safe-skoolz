import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-polished";
import {
  GraduationCap, AlertTriangle, FileText, MessageCircle, Shield,
  Users, Gauge, Bell, Key, ClipboardList, Activity, Eye, Home,
  ChevronRight, CheckCircle2, Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{number}</span>
      <div>
        <p className="font-bold">{title}</p>
        <div className="text-muted-foreground text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function GuideSection({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color || "bg-primary/10 text-primary"}`}>
            <Icon size={18} />
          </div>
          <span className="font-bold text-sm">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 text-sm leading-relaxed space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickStart({ role }: { role: string }) {
  if (role === "pupil") {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-xl font-display font-bold">Welcome to SafeSchool</h2>
          <p className="text-muted-foreground">SafeSchool is here to help you if something isn't right at school. Here are the main things you can do:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center"><AlertTriangle size={20} className="text-red-600" /></div>
              <p className="font-bold text-sm">Report something</p>
              <p className="text-xs text-muted-foreground">Tell us what happened</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center"><MessageCircle size={20} className="text-blue-600" /></div>
              <p className="font-bold text-sm">Message a teacher</p>
              <p className="text-xs text-muted-foreground">Talk to a safe adult</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center"><Shield size={20} className="text-amber-600" /></div>
              <p className="font-bold text-sm">Get urgent help</p>
              <p className="text-xs text-muted-foreground">When you need help now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (role === "parent") {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-xl font-display font-bold">Getting started as a parent</h2>
          <p className="text-muted-foreground">SafeSchool keeps you informed about your child's wellbeing at school. Here's what you can do:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { icon: Eye, label: "View incidents", desc: "See reports involving your child", color: "bg-blue-100 dark:bg-blue-950/50 text-blue-600" },
              { icon: Gauge, label: "Check behaviour", desc: "Track your child's standing", color: "bg-amber-100 dark:bg-amber-950/50 text-amber-600" },
              { icon: MessageCircle, label: "Message staff", desc: "Talk to teachers directly", color: "bg-green-100 dark:bg-green-950/50 text-green-600" },
              { icon: AlertTriangle, label: "Report a concern", desc: "Submit a concern yourself", color: "bg-red-100 dark:bg-red-950/50 text-red-600" },
            ].map(item => (
              <div key={item.label} className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 text-center space-y-2">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${item.color}`}><item.icon size={20} /></div>
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-3">
        <h2 className="text-xl font-display font-bold">Staff training guide</h2>
        <p className="text-muted-foreground">This guide covers every feature you'll use in SafeSchool. Work through each section to learn how to log incidents, manage pupil accounts, respond to alerts, and use the protocol system.</p>
        <div className="flex items-center gap-2 text-sm text-primary font-bold mt-2">
          <CheckCircle2 size={16} />
          Estimated training time: 30–45 minutes
        </div>
      </CardContent>
    </Card>
  );
}

function PupilGuides() {
  return (
    <div className="space-y-3">
      <GuideSection title="How to log in" icon={Key} color="bg-amber-100 dark:bg-amber-950/50 text-amber-600">
        <div className="space-y-3">
          <Step number={1} title="Select your school">Pick "Morna" from the school dropdown.</Step>
          <Step number={2} title="Find your name">Click "My Name" and look for your name in the list. You'll see your animal avatar next to it.</Step>
          <Step number={3} title="Enter your secret PIN">Type in the 4-digit PIN your teacher gave you. Keep it secret — don't share it with anyone.</Step>
          <Step number={4} title="Press Sign In">You're in! You'll see your dashboard with quick actions.</Step>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mt-2">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">If you get locked out after 3 wrong tries, don't worry — just ask your teacher to reset your PIN.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="How to report something" icon={AlertTriangle} color="bg-red-100 dark:bg-red-950/50 text-red-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'Report Incident'">Find this on your dashboard or in the menu on the left.</Step>
          <Step number={2} title="Tell us what happened">Pick the type of thing that happened (e.g. bullying, hitting, mean words). If you're not sure, just pick the closest one.</Step>
          <Step number={3} title="When and where?">Choose when it happened and where in school (playground, classroom, corridor, etc).</Step>
          <Step number={4} title="Who was involved?">Search for names. If you don't know who did it, you can describe what they looked like instead.</Step>
          <Step number={5} title="How are you feeling?">Pick the emoji that matches how you feel. This helps adults understand.</Step>
          <Step number={6} title="Write what happened">Use your own words. Write as much or as little as you want.</Step>
          <Step number={7} title="Submit">Press the submit button. A trusted adult will see your report.</Step>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2">
            <p className="font-bold text-primary text-sm">You can report anonymously if you want — just tick the box. Nobody will know it was you.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="How to message a teacher" icon={MessageCircle} color="bg-blue-100 dark:bg-blue-950/50 text-blue-600">
        <div className="space-y-3">
          <Step number={1} title="Go to your dashboard">Your safe contacts are shown on the main screen.</Step>
          <Step number={2} title="Pick a teacher">Click on the teacher you want to talk to. Your class teacher will be at the top.</Step>
          <Step number={3} title="Type your message">Write what you want to say and press send. You can choose if it's normal, important, or urgent.</Step>
        </div>
      </GuideSection>

      <GuideSection title="How to use Urgent Help" icon={Shield} color="bg-red-100 dark:bg-red-950/50 text-red-600">
        <div className="space-y-3">
          <Step number={1} title="Find the Urgent Help button">It's the red button on your dashboard — you can't miss it.</Step>
          <Step number={2} title="Pick where you are">Select your location so teachers can find you quickly.</Step>
          <Step number={3} title="Write a short message">Tell them what's wrong. Even just "I need help" is fine.</Step>
          <Step number={4} title="Send">Your message goes straight to staff. Someone will come to help.</Step>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 mt-2">
            <p className="font-bold text-red-700 dark:text-red-400 text-sm">Only use Urgent Help when you really need it — it sends an immediate alert to all your safe adults.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="How to check your behaviour record" icon={Gauge} color="bg-green-100 dark:bg-green-950/50 text-green-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'My Behaviour'">Find it in the menu on the left.</Step>
          <Step number={2} title="See your level">The gauge shows where you are — green is good! The ladder shows all the levels.</Step>
          <Step number={3} title="Check your history">Scroll down to see any points you've received and why.</Step>
        </div>
      </GuideSection>
    </div>
  );
}

function ParentGuides() {
  return (
    <div className="space-y-3">
      <GuideSection title="Logging in" icon={Key} color="bg-amber-100 dark:bg-amber-950/50 text-amber-600">
        <div className="space-y-3">
          <Step number={1} title="Go to the SafeSchool login page">Click "I'm a Parent" tab at the top.</Step>
          <Step number={2} title="Select your name or enter credentials">If you see your name in the dropdown, select it. Otherwise, enter your email and password manually.</Step>
          <Step number={3} title="Sign in">You'll see your dashboard with your child's information.</Step>
        </div>
      </GuideSection>

      <GuideSection title="Viewing your child's incidents" icon={FileText} color="bg-blue-100 dark:bg-blue-950/50 text-blue-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'Incidents' in the sidebar">This shows all incidents involving your child that the school has made visible to you.</Step>
          <Step number={2} title="Click on any incident">You'll see the full details — what happened, when, where, how your child was feeling, and what the school is doing about it.</Step>
          <Step number={3} title="Check the status">Each incident shows its current status (submitted, under review, investigating, resolved, etc).</Step>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 mt-2">
            <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">Incidents are visible to you by default. In rare cases, the school may mark a report as not visible — for example, if a report was found to be unfounded.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Checking behaviour standing" icon={Gauge} color="bg-green-100 dark:bg-green-950/50 text-green-600">
        <div className="space-y-3">
          <Step number={1} title="Check the dashboard">Your child's behaviour standing is shown as a colour-coded card on your dashboard — green means good standing.</Step>
          <Step number={2} title="Click 'Behaviour' for full details">This shows the complete behaviour record with all points, categories, and the escalation ladder.</Step>
        </div>
      </GuideSection>

      <GuideSection title="Messaging school staff" icon={MessageCircle} color="bg-green-100 dark:bg-green-950/50 text-green-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'Messages' in the sidebar">You'll see your conversation history and any emergency alerts from your child.</Step>
          <Step number={2} title="Start a new conversation">Click "New Message", then pick a staff member. Your child's teacher appears first.</Step>
          <Step number={3} title="Write and send">Type your message and send. Staff will reply through the same thread.</Step>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mt-2">
            <p className="font-bold text-primary text-sm">The Messages page also shows any urgent help requests your child has sent to staff, so you can see if they've raised an alarm.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Reporting a concern" icon={AlertTriangle} color="bg-red-100 dark:bg-red-950/50 text-red-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'Report Incident'">You can submit a concern on behalf of your child.</Step>
          <Step number={2} title="Fill in the details">Select the category, describe what happened, identify who was involved if you know, and include when it occurred.</Step>
          <Step number={3} title="Submit">The school's safeguarding team will review your report.</Step>
        </div>
      </GuideSection>
    </div>
  );
}

function StaffGuides({ role }: { role: string }) {
  const isCoordinator = role === "coordinator" || role === "head_teacher";
  const isSenco = role === "senco";

  return (
    <div className="space-y-3">
      <GuideSection title="Logging an incident" icon={AlertTriangle} color="bg-red-100 dark:bg-red-950/50 text-red-600">
        <div className="space-y-3">
          <Step number={1} title="Click 'Log Incident'">Available from the sidebar or dashboard.</Step>
          <Step number={2} title="Select the category">Choose the most accurate category — this determines the escalation tier. Categories include physical, verbal, bullying, online, sexual, coercive, and more.</Step>
          <Step number={3} title="Identify people involved">Use the name search to find victims, perpetrators, and witnesses. For unknown individuals, use the "Unknown Person Builder" to describe their appearance.</Step>
          <Step number={4} title="Record the details">Enter the date, time, location, and a full description. Use the child's exact words where possible.</Step>
          <Step number={5} title="Complete safeguarding checks">Answer the structured questions: Were children separated? Was the coordinator notified? Was immediate action taken?</Step>
          <Step number={6} title="Submit">The incident is logged with a reference number and auto-assigned an escalation tier (1–3) based on the category.</Step>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mt-2">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Tier 3 incidents (sexual, coercive) require immediate coordinator notification. The system flags these automatically.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Assessing an incident" icon={FileText} color="bg-blue-100 dark:bg-blue-950/50 text-blue-600">
        <div className="space-y-3">
          <Step number={1} title="Open the incident">Go to Incidents, find the report, and click to open it.</Step>
          <Step number={2} title="Review the details">Read the full report including emotional state, people involved, and the reporter's description.</Step>
          <Step number={3} title="Add staff notes">Write your professional assessment — this is internal and not visible to parents.</Step>
          <Step number={4} title="Add witness statements">Record statements from witnesses with their names — these are timestamped.</Step>
          <Step number={5} title="Write parent summary (optional)">If you want parents to see a summary in addition to the raw report, add one here.</Step>
          <Step number={6} title="Toggle visibility">If a report turns out to be unfounded or a false accusation, you can hide it from the parent view.</Step>
        </div>
      </GuideSection>

      <GuideSection title="Managing pupil PINs" icon={Key} color="bg-amber-100 dark:bg-amber-950/50 text-amber-600">
        <div className="space-y-3">
          <Step number={1} title="Go to My Class (or My Year Group)">Find it in the sidebar.</Step>
          <Step number={2} title="Find the PIN Management section">It's the amber card at the top of the page.</Step>
          <Step number={3} title="Generate PINs">Click the button for your class to generate new unique random PINs for all pupils at once.</Step>
          <Step number={4} title="Show and distribute">Click "Show PINs" to reveal them. Click "Print PIN Slips" to print individual slips you can cut and hand to each pupil privately.</Step>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mt-2">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">PINs are shown once and cannot be retrieved later. If a pupil forgets their PIN or gets locked out (3 wrong attempts), generate a new one from here.</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="Behaviour points" icon={Gauge} color="bg-green-100 dark:bg-green-950/50 text-green-600">
        <div className="space-y-3">
          <Step number={1} title="Go to Behaviour">Click "Behaviour" in the sidebar.</Step>
          <Step number={2} title="Find the pupil">Use the search bar or scroll the list.</Step>
          <Step number={3} title="Issue points">Click the issue points button, select the category (disruption, bullying, physical, etc.), enter the number of points, and add a note explaining why.</Step>
          <Step number={4} title="Check levels">The system automatically calculates the pupil's level based on total points — from Good Standing (0–3) through to Full Exclusion (25+).</Step>
          <p className="text-muted-foreground">Parents can see their child's behaviour standing on their dashboard. The 7-level escalation ladder (Good Standing, Warning, Formal Warning, Suspension Risk, Suspended, Term Exclusion, Full Exclusion) is visible to all roles.</p>
        </div>
      </GuideSection>

      <GuideSection title="Responding to messages" icon={MessageCircle} color="bg-blue-100 dark:bg-blue-950/50 text-blue-600">
        <div className="space-y-3">
          <Step number={1} title="Go to Messages">Click "Messages" in the sidebar. You'll see conversation threads from pupils and parents.</Step>
          <Step number={2} title="Check for urgent messages">Urgent help requests and chat requests appear with red/amber badges. Respond to these first.</Step>
          <Step number={3} title="Reply">Click a conversation to open it, type your reply, and send.</Step>
        </div>
      </GuideSection>

      <GuideSection title="Understanding alerts" icon={Activity} color="bg-red-100 dark:bg-red-950/50 text-red-600">
        <div className="space-y-3">
          <Step number={1} title="Go to Alerts">The system automatically detects concerning patterns across incidents.</Step>
          <Step number={2} title="Review the pattern">Each alert shows what was detected — e.g. the same pupil named as perpetrator in 3 incidents within 30 days.</Step>
          <Step number={3} title="View linked incidents">Click "View Incident" to see the specific incidents that triggered the alert.</Step>
          {isCoordinator && <Step number={4} title="Take action">As coordinator, you can acknowledge, dismiss, or escalate alerts.</Step>}
        </div>
      </GuideSection>

      {isCoordinator && (
        <GuideSection title="Managing protocols" icon={Shield} color="bg-purple-100 dark:bg-purple-950/50 text-purple-600">
          <div className="space-y-3">
            <Step number={1} title="Open a protocol">From an incident or the Protocols page, create a new formal protocol.</Step>
            <Step number={2} title="Select the framework">Choose Convivèxit (anti-bullying), LOPIVI (safeguarding), or Machista Violence (gender-based) based on the nature of the concern.</Step>
            <Step number={3} title="Complete risk assessment">Rate risk and protective factors. This determines the severity level.</Step>
            <Step number={4} title="Manage interviews">Record interviews with the children and witnesses involved. Convivèxit requires these in a specific order.</Step>
            <Step number={5} title="Create case tasks">Assign follow-up actions (review meetings, parent contact, external referral) with due dates.</Step>
            <Step number={6} title="Progress through phases">Move the protocol through its phases as the school's response develops.</Step>
            <Step number={7} title="External referral">If needed, refer to external bodies (IB Dona, Fiscalía de Menores, IMAS, Servicios Sociales) from the referral bodies directory.</Step>
          </div>
        </GuideSection>
      )}

      {isSenco && (
        <GuideSection title="SENCO caseload management" icon={ClipboardList} color="bg-purple-100 dark:bg-purple-950/50 text-purple-600">
          <div className="space-y-3">
            <Step number={1} title="Go to My Caseload">Click "My Caseload" in the sidebar.</Step>
            <Step number={2} title="Add a pupil">Click "Add to Caseload", search for the pupil, set a priority and reason.</Step>
            <Step number={3} title="Record observations">Expand a pupil's card and click "New Observation". Rate their progress, feelings, and attitudes (1–5 scale) and add detailed notes.</Step>
            <Step number={4} title="Review timeline">Each pupil's tracking history shows all observations chronologically so you can see progress over time.</Step>
          </div>
        </GuideSection>
      )}

      <GuideSection title="Dashboard overview" icon={Home} color="bg-primary/10 text-primary">
        <div className="space-y-2">
          {role === "teacher" || role === "head_of_year" ? (
            <>
              <p>Your dashboard shows:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Recent incidents involving your class/year group</li>
                <li>Active pattern alerts</li>
                <li>Location analytics — bar chart showing where incidents happen most</li>
                <li>Incident type distribution — what categories are most common</li>
                <li>Monthly trend — line chart tracking incidents over time</li>
              </ul>
            </>
          ) : isCoordinator ? (
            <>
              <p>Your dashboard shows school-wide KPIs:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Total incidents, open cases, active alerts, and active protocols</li>
                <li>Recent incidents across the whole school</li>
                <li>Incidents by category, by month, and by escalation tier</li>
                <li>Quick access to create new protocols and review alerts</li>
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">Your dashboard shows an overview of relevant incidents, alerts, and quick actions based on your role.</p>
          )}
        </div>
      </GuideSection>
    </div>
  );
}

export default function TrainingPage() {
  const { user } = useAuth();
  if (!user) return null;

  const isPupil = user.role === "pupil";
  const isParent = user.role === "parent";
  const isStaff = !isPupil && !isParent;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-3xl font-display font-bold">How to use SafeSchool</h1>
        <p className="text-muted-foreground mt-2">
          {isPupil && "A simple guide to help you use SafeSchool"}
          {isParent && "Everything you need to know about using SafeSchool as a parent"}
          {isStaff && "Step-by-step training guide for all SafeSchool features"}
        </p>
      </div>

      <QuickStart role={user.role} />

      {isPupil && <PupilGuides />}
      {isParent && <ParentGuides />}
      {isStaff && <StaffGuides role={user.role} />}

      <Card className="border-muted bg-muted/30">
        <CardContent className="p-6 text-center">
          <Monitor size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isPupil
              ? "If you need more help, ask your teacher or click 'Learn' to find out about staying safe."
              : isParent
                ? "If you have questions about how the school handles safeguarding, visit the 'Learn' section or message the school directly."
                : "For safeguarding policies, frameworks, and educational resources, visit the 'Learn' section in the sidebar."
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

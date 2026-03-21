import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Play, SkipForward } from "lucide-react";
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
        description: "This is your home page. You can see your safe contacts, report something, send an urgent help message, or request a chat with a trusted adult.",
        benefit: "Everything you need is right here — one click away.",
        position: "center",
      },
      {
        page: "/report",
        navHighlight: "Report Incident",
        title: "Report Something",
        description: "If something isn't right, tell us here. Pick what happened, where it happened, and how you're feeling. You can even report anonymously — nobody will know it was you.",
        benefit: "Your voice matters. Reporting helps adults keep everyone safe.",
        position: "center",
      },
      {
        page: "/behaviour",
        navHighlight: "My Behaviour",
        title: "My Behaviour",
        description: "Check your behaviour record here. The gauge shows your current level — green is great! You can see the escalation ladder and any points you've received.",
        benefit: "Know where you stand and what you're doing well.",
        position: "center",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Learn About Staying Safe",
        description: "Read about what bullying is, what to do if it happens, and how to help a friend. There's also information about your body, your feelings, and your rights.",
        benefit: "Knowledge is power. Understanding helps you stay safe.",
        position: "center",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "How To Use SafeSchool",
        description: "Step-by-step guides showing you how to use every feature — from logging in to sending urgent help.",
        benefit: "Never get stuck — the answers are always here.",
        position: "center",
      },
      {
        page: "/settings",
        navHighlight: "My Settings",
        title: "Your Settings",
        description: "Choose your animal avatar here! Pick the animal that represents you. Your avatar appears next to your name across the app.",
        benefit: "Make SafeSchool yours with a personal avatar.",
        position: "center",
      },
    ];
  }

  if (role === "parent") {
    return [
      {
        page: "/",
        title: "Your Dashboard",
        description: "See an overview of your child's wellbeing at a glance. Their behaviour standing, incident statistics, monthly trends, and recent notifications are all here.",
        benefit: "Stay informed about what matters most — your child's safety.",
        position: "center",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Your Child's Incidents",
        description: "View all reported incidents involving your child. Each report shows what happened, when, where, how they were feeling, and what the school is doing about it.",
        benefit: "Full transparency on every incident — no surprises.",
        position: "center",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Standing",
        description: "Track your child's behaviour record. See their current level, points received, categories, and the full escalation ladder from Good Standing through to exclusion levels.",
        benefit: "Catch issues early before they escalate.",
        position: "center",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Messages & Emergency Alerts",
        description: "Message your child's teachers and school staff directly. You'll also see any urgent help requests your child has sent to staff — so you know if they've raised an alarm.",
        benefit: "Direct line to school staff, plus peace of mind about urgent situations.",
        position: "center",
      },
      {
        page: "/report",
        navHighlight: "Report Incident",
        title: "Report a Concern",
        description: "Submit a concern about your child yourself. Fill in the details and the school's safeguarding team will review it.",
        benefit: "Your concerns are heard and formally recorded.",
        position: "center",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "How To Use SafeSchool",
        description: "Step-by-step guides for every feature — viewing incidents, checking behaviour, messaging staff, and reporting concerns.",
        benefit: "Never feel lost — everything is explained here.",
        position: "center",
      },
      {
        page: "/education",
        navHighlight: "Learn",
        title: "Safeguarding Resources",
        description: "Information about recognising bullying, talking to your child, what to do if they're being bullied, and how the school handles concerns.",
        benefit: "Practical advice to support your child at home.",
        position: "center",
      },
    ];
  }

  if (role === "teacher" || role === "head_of_year") {
    return [
      {
        page: "/",
        title: "Your Dashboard",
        description: "Overview of your class/year group. See recent incidents, active alerts, and analytics — location hotspots, incident type breakdown, and monthly trends.",
        benefit: "Spot patterns early with at-a-glance analytics.",
        position: "center",
      },
      {
        page: "/report",
        navHighlight: "Log Incident",
        title: "Log an Incident",
        description: "Record incidents with full detail — category, people involved, location, safeguarding checks, and your professional notes. The system auto-assigns escalation tiers.",
        benefit: "Structured, consistent recording that meets compliance requirements.",
        position: "center",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Tracker",
        description: "View all pupils' behaviour records, issue points by category, and track escalation levels. Parents can see their child's standing on their dashboard.",
        benefit: "Fair, transparent behaviour management with a clear escalation path.",
        position: "center",
      },
      {
        page: "/class",
        navHighlight: role === "head_of_year" ? "My Year Group" : "My Class",
        title: role === "head_of_year" ? "Your Year Group" : "Your Class",
        description: "See all your pupils at a glance. Generate and manage unique login PINs — bulk generate for the whole class, print PIN slips, and reset locked accounts.",
        benefit: "Secure pupil access with teacher-controlled PIN management.",
        position: "center",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Messages",
        description: "View and respond to messages from pupils and parents. Urgent help requests and chat requests are flagged with priority badges so you see them first.",
        benefit: "Never miss a child's cry for help — urgent messages surface immediately.",
        position: "center",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "Incident List",
        description: "Browse and filter all incidents involving your pupils. Open any incident to add staff notes, witness statements, or a parent summary. Toggle parent visibility on false reports.",
        benefit: "Complete oversight with professional assessment tools.",
        position: "center",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Pattern Alerts",
        description: "The system automatically detects concerning patterns — repeat perpetrators, multi-victim incidents, welfare concerns. Each alert links to the incidents that triggered it.",
        benefit: "AI-assisted pattern detection catches what humans might miss.",
        position: "center",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "Training Guide",
        description: "Step-by-step instructions for every feature — logging incidents, assessing reports, managing PINs, issuing behaviour points, and understanding alerts.",
        benefit: "Self-service training — new staff can learn at their own pace.",
        position: "center",
      },
    ];
  }

  if (role === "senco") {
    return [
      {
        page: "/",
        title: "Your Dashboard",
        description: "School-wide overview with KPIs — total incidents, open cases, active alerts, and protocol status.",
        benefit: "Full picture of safeguarding across the whole school.",
        position: "center",
      },
      {
        page: "/caseload",
        navHighlight: "My Caseload",
        title: "SENCO Caseload",
        description: "Manage your caseload of vulnerable pupils. Add pupils with priority and reason, record progress observations (feelings, attitudes, progress ratings 1-5), and review tracking timelines.",
        benefit: "Structured, evidence-based monitoring of your most vulnerable pupils.",
        position: "center",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Tracker",
        description: "School-wide behaviour overview. Issue points, track escalation levels, and identify pupils at risk of suspension or exclusion.",
        benefit: "Early intervention before behaviour reaches crisis point.",
        position: "center",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "All Incidents",
        description: "Full access to every incident across the school. Filter by pupil, category, status, or year group. Assess incidents and manage parent visibility.",
        benefit: "Complete safeguarding oversight in one place.",
        position: "center",
      },
      {
        page: "/protocols",
        navHighlight: "Protocols",
        title: "Formal Protocols",
        description: "Manage Convivèxit, LOPIVI, and Machista Violence protocols. Track phases, conduct interviews, complete risk assessments, and create case tasks.",
        benefit: "Compliance-ready protocol management for Balearic Islands legislation.",
        position: "center",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Pattern Alerts",
        description: "System-generated alerts for concerning patterns. Review, acknowledge, or escalate based on severity.",
        benefit: "Automated pattern detection across hundreds of data points.",
        position: "center",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "Training Guide",
        description: "Comprehensive step-by-step guides covering every feature including caseload management and protocol workflows.",
        benefit: "Always know how to use every tool at your disposal.",
        position: "center",
      },
    ];
  }

  if (role === "coordinator" || role === "head_teacher") {
    return [
      {
        page: "/",
        title: "Coordinator Dashboard",
        description: "School-wide KPIs at a glance — total incidents, open cases, active alerts, and protocol status. Trend charts and category breakdowns help you see the bigger picture.",
        benefit: "Data-driven safeguarding leadership.",
        position: "center",
      },
      {
        page: "/report",
        navHighlight: "Log Incident",
        title: "Log an Incident",
        description: "Record incidents with full professional detail. The system auto-detects safeguarding triggers and assigns escalation tiers based on category.",
        benefit: "Structured recording that drives automatic escalation.",
        position: "center",
      },
      {
        page: "/incidents",
        navHighlight: "Incidents",
        title: "All Incidents",
        description: "Complete oversight of every incident. Change status (open, under review, investigating, resolved, closed), assess reports, and manage parent visibility.",
        benefit: "Full control over the incident lifecycle.",
        position: "center",
      },
      {
        page: "/protocols",
        navHighlight: "Protocols",
        title: "Protocol Management",
        description: "Create and manage formal protocols — Convivèxit (anti-bullying), LOPIVI (safeguarding), and Machista Violence (gender-based). Track phases, interviews, risk assessments, case tasks, and external referrals.",
        benefit: "Full compliance with Balearic Islands safeguarding legislation.",
        position: "center",
      },
      {
        page: "/class",
        navHighlight: "All Pupils",
        title: "All Pupils",
        description: "School-wide pupil directory. View any child's incidents, generate PINs, and manage access.",
        benefit: "Every pupil, every class — one view.",
        position: "center",
      },
      {
        page: "/alerts",
        navHighlight: "Alerts",
        title: "Pattern Alerts",
        description: "System-generated alerts for repeat perpetrators, multi-victim incidents, and welfare patterns. Acknowledge, dismiss, or escalate with full audit trail.",
        benefit: "Never miss a pattern — the system watches what you can't.",
        position: "center",
      },
      {
        page: "/messages",
        navHighlight: "Messages",
        title: "Messages",
        description: "Respond to parent and pupil messages. Urgent help requests are flagged immediately.",
        benefit: "Direct communication channel for safeguarding concerns.",
        position: "center",
      },
      {
        page: "/behaviour",
        navHighlight: "Behaviour",
        title: "Behaviour Tracker",
        description: "School-wide behaviour management with a 7-level escalation system. Track every pupil's standing and intervene before exclusion.",
        benefit: "Transparent, evidence-based behaviour management.",
        position: "center",
      },
      {
        page: "/training",
        navHighlight: "Training",
        title: "Training Guide",
        description: "Complete staff training resource covering incident logging, protocol management, PIN management, behaviour tracking, and alert handling.",
        benefit: "Onboard new staff quickly with self-service training.",
        position: "center",
      },
    ];
  }

  return [
    {
      page: "/",
      title: "Your Dashboard",
      description: "Your home page with relevant information and quick actions.",
      benefit: "Everything you need in one place.",
      position: "center",
    },
    {
      page: "/training",
      navHighlight: "Training",
      title: "Training Guide",
      description: "Step-by-step guides for every feature.",
      benefit: "Learn at your own pace.",
      position: "center",
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
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStepData?.navHighlight) {
      setNavRect(null);
      return;
    }
    const timer = setTimeout(() => {
      const links = document.querySelectorAll("aside a");
      for (const link of links) {
        if (link.textContent?.trim().includes(currentStepData.navHighlight!)) {
          setNavRect(link.getBoundingClientRect());
          return;
        }
      }
      setNavRect(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [isActive, currentStepData, currentStep]);

  if (!isActive || !currentStepData) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={stopDemo} />

        {navRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
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
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg z-[101]"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {currentStep + 1}
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium">Step {currentStep + 1} of {totalSteps}</p>
                  <h3 className="text-white font-bold text-lg leading-tight">{currentStepData.title}</h3>
                </div>
              </div>
              <button onClick={stopDemo} className="text-white/70 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="w-full h-1 bg-primary/20">
              <motion.div
                className="h-full bg-white/50"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="p-6 space-y-4">
              <p className="text-foreground leading-relaxed">{currentStepData.description}</p>

              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="shrink-0">Why it matters:</span>
                </p>
                <p className="text-sm text-primary/80 mt-1">{currentStepData.benefit}</p>
              </div>

              {currentStepData.navHighlight && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ChevronRight size={12} />
                  Find this under <span className="font-bold text-foreground">"{currentStepData.navHighlight}"</span> in the sidebar
                </p>
              )}
            </div>

            <div className="px-6 pb-5 flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={isFirst}
                  className="gap-1"
                >
                  <ChevronLeft size={14} />
                  Back
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopDemo}
                  className="text-muted-foreground gap-1"
                >
                  <SkipForward size={14} />
                  End tour
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="gap-1"
                >
                  {isLast ? "Finish" : "Next"}
                  {!isLast && <ChevronRight size={14} />}
                </Button>
              </div>
            </div>

            <div className="px-6 pb-4 flex justify-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

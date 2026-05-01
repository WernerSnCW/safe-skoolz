import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

interface RawStep {
  page: string;
  navKey?: string;
  navKeyHeadOfYear?: string;
}

const STEPS: Record<string, RawStep[]> = {
  pupil: [
    { page: "/" },
    { page: "/report", navKey: "reportIncident" },
    { page: "/diary", navKey: "myDiary" },
    { page: "/behaviour", navKey: "myBehaviour" },
    { page: "/learnings", navKey: "noticeboard" },
    { page: "/diagnostics", navKey: "diagnostic" },
    { page: "/training" },
    { page: "/education", navKey: "learn" },
    { page: "/notifications", navKey: "notifications" },
    { page: "/settings", navKey: "mySettings" },
  ],
  parent: [
    { page: "/" },
    { page: "/report", navKey: "reportIncident" },
    { page: "/incidents", navKey: "incidents" },
    { page: "/behaviour", navKey: "behaviour" },
    { page: "/learnings", navKey: "noticeboard" },
    { page: "/messages", navKey: "messages" },
    { page: "/diagnostics", navKey: "diagnostic" },
    { page: "/training" },
    { page: "/education", navKey: "learn" },
    { page: "/notifications", navKey: "notifications" },
    { page: "/settings", navKey: "settings" },
  ],
  teacher: [
    { page: "/" },
    { page: "/report", navKey: "logIncident" },
    { page: "/behaviour", navKey: "behaviour" },
    { page: "/class", navKey: "myClass", navKeyHeadOfYear: "myYearGroup" },
    { page: "/messages", navKey: "messages" },
    { page: "/incidents", navKey: "incidents" },
    { page: "/alerts", navKey: "alerts" },
    { page: "/learnings", navKey: "noticeboard" },
    { page: "/diagnostics", navKey: "diagnostic" },
    { page: "/training" },
    { page: "/education", navKey: "learn" },
    { page: "/notifications", navKey: "notifications" },
  ],
  senco: [
    { page: "/" },
    { page: "/caseload", navKey: "myCaseload" },
    { page: "/behaviour", navKey: "behaviour" },
    { page: "/incidents", navKey: "incidents" },
    { page: "/protocols", navKey: "protocols" },
    { page: "/alerts", navKey: "alerts" },
    { page: "/training" },
  ],
  coordinator: [
    { page: "/" },
    { page: "/report", navKey: "logIncident" },
    { page: "/incidents", navKey: "incidents" },
    { page: "/protocols", navKey: "protocols" },
    { page: "/class", navKey: "allPupils" },
    { page: "/alerts", navKey: "alerts" },
    { page: "/messages", navKey: "messages" },
    { page: "/behaviour", navKey: "behaviour" },
    { page: "/learnings", navKey: "noticeboard" },
    { page: "/diagnostics", navKey: "diagnostic" },
    { page: "/training" },
    { page: "/education", navKey: "learn" },
    { page: "/notifications", navKey: "notifications" },
  ],
  pta: [
    { page: "/pta", navKey: "ptaDashboard" },
    { page: "/learnings", navKey: "noticeboard" },
    { page: "/diagnostics", navKey: "diagnostic" },
    { page: "/training" },
    { page: "/education", navKey: "learn" },
    { page: "/notifications", navKey: "notifications" },
  ],
  default: [
    { page: "/" },
    { page: "/training" },
  ],
};

function roleGroup(role: string): keyof typeof STEPS {
  if (role === "pupil") return "pupil";
  if (role === "parent") return "parent";
  if (role === "teacher" || role === "head_of_year") return "teacher";
  if (role === "senco") return "senco";
  if (role === "coordinator" || role === "head_teacher") return "coordinator";
  if (role === "pta") return "pta";
  return "default";
}

function buildSteps(role: string, t: TFunction): DemoStep[] {
  const group = roleGroup(role);
  const rawSteps = STEPS[group];
  return rawSteps.map((raw, i) => {
    const useHoy = group === "teacher" && role === "head_of_year" && raw.navKeyHeadOfYear;
    const navKey = useHoy ? raw.navKeyHeadOfYear : raw.navKey;
    return {
      page: raw.page,
      navHighlight: navKey ? (t(navKey, { ns: "nav" }) as string) : undefined,
      title: t(`steps.${group}.${i}.title`, { ns: "tour" }) as string,
      description: t(`steps.${group}.${i}.description`, { ns: "tour" }) as string,
      benefit: t(`steps.${group}.${i}.benefit`, { ns: "tour" }) as string,
    };
  });
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["tour", "nav"]);
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const steps = useMemo(
    () => (user ? buildSteps(user.role, t) : []),
    // re-resolve when language changes too
    [user, t, i18n.language],
  );

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
    setTimeout(() => setLocation("/"), 50);
  }, [setLocation]);

  useEffect(() => {
    if (user && steps.length > 0 && sessionStorage.getItem("safeschool_start_demo") === "true") {
      sessionStorage.removeItem("safeschool_start_demo");
      const timer = setTimeout(() => {
        startDemo();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, steps.length, startDemo]);

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
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextStep();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, stopDemo]);

  return (
    <DemoContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: steps.length,
        startDemo,
        stopDemo,
        nextStep,
        prevStep,
        currentStepData: isActive ? steps[currentStep] || null : null,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function DemoOverlay() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, stopDemo } = useDemo();
  const { t } = useTranslation("tour");
  const [navRect, setNavRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !currentStepData?.navHighlight) {
      setNavRect(null);
      return;
    }
    const target = currentStepData.navHighlight;
    const timer = setTimeout(() => {
      const links = document.querySelectorAll("aside a");
      for (const link of links) {
        if (link.textContent?.trim().includes(target)) {
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
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs sm:text-sm mt-0.5">
                {currentStep + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-foreground text-xs sm:text-sm leading-tight">{currentStepData.title}</h3>
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{currentStep + 1}/{totalSteps}</span>
                </div>
                <div className="max-h-16 sm:max-h-28 overflow-y-auto pr-1">
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{currentStepData.description}</p>
                </div>
                <p className="text-[11px] sm:text-xs text-primary font-medium mt-0.5 sm:mt-1 line-clamp-2">{currentStepData.benefit}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 mt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={isFirst}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                  aria-label={t("buttons.previousAria")}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="h-7 sm:h-8 gap-1 px-2.5 sm:px-3 text-xs sm:text-sm"
                  aria-label={isLast ? t("buttons.finishAria") : t("buttons.nextAria")}
                >
                  {isLast ? t("buttons.done") : t("buttons.next")}
                  {!isLast && <ChevronRight size={12} />}
                </Button>
                <button
                  onClick={stopDemo}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-md"
                  aria-label={t("buttons.closeAria")}
                >
                  <X size={14} />
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
  const { t } = useTranslation("tour");
  if (!user) return null;

  const label = t(`startLabels.${user.role}`, {
    defaultValue: t("startLabels.default") as string,
  }) as string;

  return (
    <Button
      onClick={startDemo}
      size="lg"
      className={`gap-2 shadow-lg shadow-primary/20 ${className || ""}`}
    >
      <Play size={18} />
      {label}
    </Button>
  );
}

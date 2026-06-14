import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Education from "./education";
import TrainingPage from "./training";
import PupilLearn from "./learn-pupil";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

type LearnTab = "safeguarding" | "using";

export default function LearnPage() {
  const { t } = useTranslation("learn");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LearnTab>("safeguarding");

  if (user?.role === "pupil") {
    return <PupilLearn />;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border">
        <button
          onClick={() => setActiveTab("safeguarding")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "safeguarding"
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={18} />
          {t("aboutSafeguarding")}
        </button>
        <button
          onClick={() => setActiveTab("using")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "using"
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap size={18} />
          Using vibez
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "safeguarding" && <Education />}
          {activeTab === "using" && <TrainingPage />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

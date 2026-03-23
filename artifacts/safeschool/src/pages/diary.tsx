import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui-polished";
import { Trash2, Lock, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  { value: 1, emoji: "\uD83D\uDE22", label: "Sad" },
  { value: 2, emoji: "\uD83D\uDE1F", label: "Worried" },
  { value: 3, emoji: "\uD83D\uDE10", label: "Meh" },
  { value: 4, emoji: "\uD83D\uDE0A", label: "Happy" },
  { value: 5, emoji: "\uD83E\uDD29", label: "Amazing" },
];

const EXTRA_EMOJIS = [
  "\uD83D\uDE21", "\uD83D\uDE30", "\uD83D\uDE34", "\uD83E\uDD14",
  "\uD83D\uDE0D", "\uD83E\uDD2F", "\uD83D\uDE2D", "\uD83E\uDD17",
  "\uD83D\uDE24", "\uD83E\uDD73", "\uD83D\uDE31", "\uD83D\uDE44",
];

const PROMPTS = [
  "What happened today?",
  "Something on your mind?",
  "How was your day?",
  "What made you feel this way?",
  "Anything you want to remember?",
  "What are you looking forward to?",
  "Did something good happen?",
  "Is anything worrying you?",
];

type DiaryTheme = {
  id: string;
  name: string;
  emoji: string;
  cover: { bg: string; border: string; text: string; shadow: string };
  paper: { bg: string; lines: string; margin: string; bgDark: string; linesDark: string; borderDark: string };
  text: { primary: string; muted: string; faint: string; primaryDark: string; mutedDark: string };
  dateTab: { bg: string; text: string; bgDark: string; textDark: string };
  accent: { ring: string; bg: string; bgDark: string; ringDark: string };
  btn: { bg: string; border: string };
  swatch: string;
};

const THEMES: DiaryTheme[] = [
  {
    id: "classic",
    name: "Classic",
    emoji: "📖",
    swatch: "#8B4513",
    cover: { bg: "linear-gradient(135deg, #8B4513 0%, #654321 50%, #8B4513 100%)", border: "#5a3210", text: "#f5e6c8", shadow: "rgba(0,0,0,0.3)" },
    paper: { bg: "#fdf6e3", lines: "#e8d5b7", margin: "#e8b4b8", bgDark: "#2a2316", linesDark: "#3d3520", borderDark: "#4a3f2e" },
    text: { primary: "#2c1810", muted: "#8B7355", faint: "#a89880", primaryDark: "#d4c4a0", mutedDark: "#a89880" },
    dateTab: { bg: "#d4a574", text: "#3d2b1a", bgDark: "#5a4530", textDark: "#d4c4a0" },
    accent: { ring: "ring-amber-300", bg: "bg-amber-100", bgDark: "bg-amber-900/30", ringDark: "ring-amber-700" },
    btn: { bg: "#8B4513", border: "#654321" },
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    swatch: "#1e5f8a",
    cover: { bg: "linear-gradient(135deg, #1e5f8a 0%, #164a6b 50%, #1e6f9a 100%)", border: "#0f3a55", text: "#d4eaf5", shadow: "rgba(0,30,60,0.35)" },
    paper: { bg: "#eef6fa", lines: "#c8dde8", margin: "#a8c8d8", bgDark: "#162028", linesDark: "#1e3040", borderDark: "#2a4050" },
    text: { primary: "#1a3a4a", muted: "#4a7a8a", faint: "#7aa0b0", primaryDark: "#a0cce0", mutedDark: "#6a9ab0" },
    dateTab: { bg: "#6aaac0", text: "#0f3040", bgDark: "#2a5060", textDark: "#a0cce0" },
    accent: { ring: "ring-sky-300", bg: "bg-sky-100", bgDark: "bg-sky-900/30", ringDark: "ring-sky-700" },
    btn: { bg: "#1e5f8a", border: "#164a6b" },
  },
  {
    id: "rose",
    name: "Rose",
    emoji: "🌸",
    swatch: "#a0526a",
    cover: { bg: "linear-gradient(135deg, #a0526a 0%, #7a3a50 50%, #b06080 100%)", border: "#6a2a40", text: "#f5dce5", shadow: "rgba(80,20,40,0.3)" },
    paper: { bg: "#fdf2f5", lines: "#ecc8d5", margin: "#d4a0b8", bgDark: "#2a1820", linesDark: "#3d2030", borderDark: "#4a2a38" },
    text: { primary: "#3a1520", muted: "#8a5060", faint: "#b08090", primaryDark: "#daa0b8", mutedDark: "#a07888" },
    dateTab: { bg: "#d08aa0", text: "#3a1520", bgDark: "#5a3040", textDark: "#daa0b8" },
    accent: { ring: "ring-pink-300", bg: "bg-pink-100", bgDark: "bg-pink-900/30", ringDark: "ring-pink-700" },
    btn: { bg: "#a0526a", border: "#7a3a50" },
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌿",
    swatch: "#2d6a4f",
    cover: { bg: "linear-gradient(135deg, #2d6a4f 0%, #1b4332 50%, #357a5f 100%)", border: "#153528", text: "#d8f0e0", shadow: "rgba(0,40,20,0.3)" },
    paper: { bg: "#f0f8f2", lines: "#c0d8c8", margin: "#90b8a0", bgDark: "#162018", linesDark: "#203828", borderDark: "#2a4832" },
    text: { primary: "#1a3520", muted: "#4a7a5a", faint: "#7aa888", primaryDark: "#a0d0b0", mutedDark: "#6a9878" },
    dateTab: { bg: "#70b088", text: "#1a3520", bgDark: "#2a5838", textDark: "#a0d0b0" },
    accent: { ring: "ring-emerald-300", bg: "bg-emerald-100", bgDark: "bg-emerald-900/30", ringDark: "ring-emerald-700" },
    btn: { bg: "#2d6a4f", border: "#1b4332" },
  },
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌙",
    swatch: "#4a3580",
    cover: { bg: "linear-gradient(135deg, #4a3580 0%, #2d1f5e 50%, #5a4090 100%)", border: "#1f154a", text: "#d8d0f0", shadow: "rgba(20,10,50,0.35)" },
    paper: { bg: "#f4f0fa", lines: "#d0c4e8", margin: "#b0a0d0", bgDark: "#1a1428", linesDark: "#2a2040", borderDark: "#382a50" },
    text: { primary: "#201530", muted: "#6a5090", faint: "#9080b0", primaryDark: "#c0b0e0", mutedDark: "#8870a8" },
    dateTab: { bg: "#9080c0", text: "#201530", bgDark: "#3a2860", textDark: "#c0b0e0" },
    accent: { ring: "ring-violet-300", bg: "bg-violet-100", bgDark: "bg-violet-900/30", ringDark: "ring-violet-700" },
    btn: { bg: "#4a3580", border: "#2d1f5e" },
  },
  {
    id: "sunset",
    name: "Sunset",
    emoji: "🌅",
    swatch: "#c05030",
    cover: { bg: "linear-gradient(135deg, #c05030 0%, #a03820 50%, #d06840 100%)", border: "#802818", text: "#fde8d8", shadow: "rgba(60,20,0,0.3)" },
    paper: { bg: "#fdf5ee", lines: "#e8d0b8", margin: "#d8b090", bgDark: "#2a1e14", linesDark: "#3d2e1e", borderDark: "#4a382a" },
    text: { primary: "#2a1508", muted: "#8a6040", faint: "#b08868", primaryDark: "#d8b890", mutedDark: "#a88868" },
    dateTab: { bg: "#d89060", text: "#2a1508", bgDark: "#5a3820", textDark: "#d8b890" },
    accent: { ring: "ring-orange-300", bg: "bg-orange-100", bgDark: "bg-orange-900/30", ringDark: "ring-orange-700" },
    btn: { bg: "#c05030", border: "#a03820" },
  },
];

function getStoredTheme(): string {
  try { return localStorage.getItem("diary_theme") || "classic"; } catch { return "classic"; }
}
function setStoredTheme(id: string) {
  try { localStorage.setItem("diary_theme", id); } catch {}
}

function getMoodInfo(mood: number) {
  return MOODS.find(m => m.value === mood) || MOODS[2];
}

function getRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString("en-GB", { weekday: "long" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function groupEntriesByDate(entries: any[]) {
  const groups: Record<string, any[]> = {};
  for (const entry of entries) {
    const key = new Date(entry.createdAt).toLocaleDateString("en-GB");
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return Object.entries(groups);
}

function ThemePicker({ current, onSelect, onClose }: { current: string; onSelect: (id: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-56"
    >
      <p className="text-xs font-semibold mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">Diary Style</p>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            type="button"
            onClick={() => { onSelect(theme.id); onClose(); }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              current === theme.id
                ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 bg-gray-50 dark:bg-gray-800"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div
              className="w-8 h-8 rounded-full shadow-sm border-2"
              style={{
                background: theme.cover.bg,
                borderColor: theme.cover.border,
              }}
            />
            <span className="text-[10px] text-gray-600 dark:text-gray-400">{theme.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function DiaryPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  if (user?.role !== "pupil") {
    setLocation("/");
    return null;
  }

  const [themeId, setThemeId] = useState(getStoredTheme);
  const [showPicker, setShowPicker] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [showExtraEmojis, setShowExtraEmojis] = useState(false);
  const [currentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    setStoredTheme(id);
  };

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/diary/entries"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/diary/entries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/diary/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mood: selectedMood, note: note.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/entries"] });
      setIsWriting(false);
      setSelectedMood(null);
      setNote("");
      setShowExtraEmojis(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/diary/entries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/entries"] });
    },
  });

  useEffect(() => {
    if (isWriting && selectedMood && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isWriting, selectedMood]);

  const grouped = groupEntriesByDate(entries);
  const firstName = user?.firstName || "";
  const todayFull = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const t = theme;

  if (isLoading) {
    return (
      <div className="diary-page max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 rounded w-40" style={{ background: t.paper.lines + "80" }} />
          <div className="h-48 rounded" style={{ background: t.paper.bg + "80" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="diary-page max-w-lg mx-auto px-4 py-4">
      <style>{`
        .diary-page {
          font-family: 'Georgia', 'Times New Roman', 'Palatino', serif;
        }
        .diary-paper {
          background: linear-gradient(to bottom, transparent 27px, ${t.paper.lines} 28px);
          background-size: 100% 28px;
          background-color: ${t.paper.bg};
          border: 1px solid ${t.paper.lines};
          border-radius: 8px;
          box-shadow: 2px 3px 12px ${t.cover.shadow}, inset 0 0 40px ${t.cover.shadow.replace(/[\d.]+\)$/, "0.04)")};
          position: relative;
        }
        .diary-paper::before {
          content: '';
          position: absolute;
          left: 40px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: ${t.paper.margin};
          opacity: 0.5;
        }
        .dark .diary-paper {
          background: linear-gradient(to bottom, transparent 27px, ${t.paper.linesDark} 28px);
          background-size: 100% 28px;
          background-color: ${t.paper.bgDark};
          border-color: ${t.paper.borderDark};
          box-shadow: 2px 3px 12px rgba(0,0,0,0.3);
        }
        .dark .diary-paper::before {
          background: ${t.paper.margin};
          opacity: 0.3;
        }
        .diary-cover {
          background: ${t.cover.bg};
          border: 2px solid ${t.cover.border};
          border-radius: 10px;
          box-shadow: 3px 4px 15px ${t.cover.shadow}, inset 0 1px 0 rgba(255,255,255,0.1);
          color: ${t.cover.text};
          position: relative;
          overflow: hidden;
        }
        .diary-cover::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
        }
        .diary-entry-text {
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 28px;
          color: ${t.text.primary};
        }
        .dark .diary-entry-text {
          color: ${t.text.primaryDark};
        }
        .diary-date-tab {
          background: ${t.dateTab.bg};
          color: ${t.dateTab.text};
          font-size: 11px;
          font-weight: bold;
          padding: 2px 10px;
          border-radius: 0 0 6px 6px;
          display: inline-block;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .dark .diary-date-tab {
          background: ${t.dateTab.bgDark};
          color: ${t.dateTab.textDark};
        }
      `}</style>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
              My Diary
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: t.text.muted }}>
              <Lock size={11} />
              <span>Private — only you and your parent can see this</span>
            </div>
          </div>
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Change diary style"
              title="Change diary style"
            >
              <Palette size={18} style={{ color: t.text.muted }} />
            </button>
            <AnimatePresence>
              {showPicker && (
                <ThemePicker current={themeId} onSelect={handleThemeChange} onClose={() => setShowPicker(false)} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isWriting ? (
          <motion.div
            key={`closed-${themeId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => setIsWriting(true)}
              className="w-full text-left diary-cover p-6 mb-6 hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className="text-center relative z-10">
                <p className="text-2xl mb-2">{t.emoji}</p>
                <p className="font-bold text-base" style={{ fontFamily: "'Georgia', serif" }}>
                  {firstName ? `${firstName}'s Diary` : "My Diary"}
                </p>
                <p className="text-xs mt-2 opacity-70">{todayFull}</p>
                <p className="text-xs mt-3 opacity-60 italic">tap to write...</p>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`open-${themeId}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="diary-paper p-5 pl-12 mb-6">
              <div className="mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: t.text.muted }}>
                  {todayFull}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: t.text.faint }}>
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: t.text.primary }}>How I'm feeling:</p>
                <div className="flex gap-1">
                  {MOODS.map(mood => (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setSelectedMood(mood.value)}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all min-w-[48px] ${
                        selectedMood === mood.value
                          ? `${t.accent.bg} dark:${t.accent.bgDark} scale-110 shadow-sm ring-2 ${t.accent.ring} dark:${t.accent.ringDark}`
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      <span className="text-xl">{mood.emoji}</span>
                      <span className="text-[9px]" style={{ color: t.text.muted }}>{mood.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtraEmojis(!showExtraEmojis)}
                  className="text-[10px] mt-1.5 underline cursor-pointer"
                  style={{ color: t.text.faint }}
                >
                  {showExtraEmojis ? "less" : "more feelings..."}
                </button>

                <AnimatePresence>
                  {showExtraEmojis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1 mt-2">
                        {EXTRA_EMOJIS.map((emoji, i) => (
                          <span key={i} className="text-lg cursor-default" title="Express yourself">{emoji}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {selectedMood !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-xs italic mb-2" style={{ color: t.text.faint }}>
                      {currentPrompt}
                    </p>
                    <textarea
                      ref={textareaRef}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={6}
                      maxLength={1000}
                      className="diary-entry-text w-full bg-transparent border-none outline-none resize-none text-sm p-0"
                      placeholder="Dear diary..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px]" style={{ color: t.text.faint }}>
                        {note.length > 0 ? `${note.length}/1000` : ""}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: `1px dashed ${t.paper.lines}` }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsWriting(false);
                    setSelectedMood(null);
                    setNote("");
                    setShowExtraEmojis(false);
                  }}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ color: t.text.muted }}
                >
                  Cancel
                </button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!selectedMood || createMutation.isPending}
                  size="sm"
                  className="flex-1 text-xs"
                  style={{ background: t.btn.bg, borderColor: t.btn.border }}
                >
                  {createMutation.isPending ? "Saving..." : "Save entry \u2713"}
                </Button>
              </div>

              {createMutation.isError && (
                <p className="text-red-600 text-xs text-center mt-2">Could not save. Please try again.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {entries.length === 0 && !isWriting && (
        <div className="text-center py-6">
          <p className="text-sm italic" style={{ color: t.text.faint }}>
            Your diary is empty — tap the cover above to start writing
          </p>
        </div>
      )}

      {grouped.length > 0 && (
        <div className="space-y-3">
          {grouped.map(([dateKey, dayEntries]) => {
            const firstEntry = dayEntries[0];
            const relDate = getRelativeDate(firstEntry.createdAt);

            return (
              <div key={dateKey}>
                <div className="diary-date-tab mb-0 ml-4">{relDate}</div>
                <div className="diary-paper pl-12 pr-5 py-4 space-y-4">
                  {dayEntries.map((entry: any) => {
                    const moodInfo = getMoodInfo(entry.mood);
                    const time = new Date(entry.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit",
                    });

                    return (
                      <div key={entry.id} className="group">
                        <div className="flex items-start gap-2">
                          <span className="text-lg mt-0.5">{moodInfo.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] block mb-0.5" style={{ color: t.text.faint }}>
                              {time}
                            </span>
                            {entry.note ? (
                              <p className="diary-entry-text text-sm whitespace-pre-wrap">
                                {entry.note}
                              </p>
                            ) : (
                              <p className="text-xs italic" style={{ color: t.text.faint }}>
                                {moodInfo.label} — no note
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this entry?")) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                            className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 rounded"
                            style={{ color: t.text.faint }}
                            aria-label="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

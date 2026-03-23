import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { BookHeart, Trash2, Lock, Pencil, Sparkles, Calendar, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  { value: 1, emoji: "\uD83D\uDE1E", label: "Really bad", color: "bg-red-50 dark:bg-red-950/20", accent: "border-red-300 dark:border-red-700", dot: "bg-red-400" },
  { value: 2, emoji: "\uD83D\uDE1F", label: "Not great", color: "bg-orange-50 dark:bg-orange-950/20", accent: "border-orange-300 dark:border-orange-700", dot: "bg-orange-400" },
  { value: 3, emoji: "\uD83D\uDE10", label: "Okay", color: "bg-yellow-50 dark:bg-yellow-950/20", accent: "border-yellow-300 dark:border-yellow-700", dot: "bg-yellow-400" },
  { value: 4, emoji: "\uD83D\uDE0A", label: "Good", color: "bg-green-50 dark:bg-green-950/20", accent: "border-green-300 dark:border-green-700", dot: "bg-green-400" },
  { value: 5, emoji: "\uD83D\uDE04", label: "Great!", color: "bg-emerald-50 dark:bg-emerald-950/20", accent: "border-emerald-300 dark:border-emerald-700", dot: "bg-emerald-400" },
];

const PROMPTS = [
  "What happened today that made you feel this way?",
  "Is there something on your mind you want to get out?",
  "What was the best part of your day?",
  "Did anything happen that you want to remember?",
  "Is there something you wish had gone differently?",
  "How did someone make you feel today?",
  "What are you looking forward to?",
  "Did you do something kind for someone, or did someone do something kind for you?",
  "What would make tomorrow a really good day?",
  "Is there anything worrying you right now?",
];

function getMoodInfo(mood: number) {
  return MOODS.find(m => m.value === mood) || MOODS[2];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun, period: "morning" };
  if (hour < 17) return { text: "Good afternoon", icon: Sun, period: "afternoon" };
  return { text: "Good evening", icon: Moon, period: "evening" };
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
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
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

function MoodTimeline({ entries }: { entries: any[] }) {
  if (entries.length < 2) return null;
  const recent = entries.slice(0, 14).reverse();

  return (
    <div className="flex items-end gap-1 h-12">
      {recent.map((e: any, i: number) => {
        const mood = getMoodInfo(e.mood);
        const height = `${(e.mood / 5) * 100}%`;
        return (
          <motion.div
            key={e.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`w-3 rounded-full ${mood.dot} opacity-80`}
            title={`${mood.label} — ${getRelativeDate(e.createdAt)}`}
            style={{ minHeight: "4px" }}
          />
        );
      })}
    </div>
  );
}

export default function DiaryPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (user?.role !== "pupil") {
    setLocation("/");
    return null;
  }

  const [isWriting, setIsWriting] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [currentPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

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
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const firstName = user?.firstName || "";

  const todayKey = new Date().toLocaleDateString("en-GB");
  const todayEntries = entries.filter((e: any) =>
    new Date(e.createdAt).toLocaleDateString("en-GB") === todayKey
  );
  const streak = getStreak(entries);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-pulse px-2">
        <div className="h-12 bg-muted rounded-lg w-56" />
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-2">
      <div className="pt-2">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Lock size={12} />
          <span>Private — only you and your parent can see this</span>
        </div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BookHeart className="text-pink-500" size={24} />
          My Diary
        </h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          <GreetingIcon size={16} className="text-amber-500" />
          {greeting.text}{firstName ? `, ${firstName}` : ""}
        </p>
      </div>

      {streak > 1 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <Sparkles size={14} />
          {streak} day streak
        </div>
      )}

      {entries.length > 0 && (
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">How I've been feeling</span>
            <span className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
          </div>
          <MoodTimeline entries={entries} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isWriting ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <button
              type="button"
              onClick={() => setIsWriting(true)}
              className="w-full text-left"
            >
              <Card className="border-2 border-dashed border-pink-200 dark:border-pink-800/40 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-sm transition-all group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center shrink-0 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30 transition-colors">
                      <Pencil size={18} className="text-pink-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-0.5">
                        {todayEntries.length === 0 ? "Write in your diary" : "Write another entry"}
                      </p>
                      <p className="text-sm text-muted-foreground italic">
                        {currentPrompt}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-pink-200 dark:border-pink-800/40 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-purple-950/20 px-5 py-4 border-b border-pink-100 dark:border-pink-900/30">
                <p className="text-sm font-bold">
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-sm font-bold mb-3">How am I feeling right now?</p>
                  <div className="flex justify-center gap-2">
                    {MOODS.map(mood => (
                      <button
                        key={mood.value}
                        type="button"
                        onClick={() => setSelectedMood(mood.value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all min-w-[60px] ${
                          selectedMood === mood.value
                            ? `${mood.color} ${mood.accent} scale-110 shadow-md`
                            : "border-transparent hover:border-pink-200 dark:hover:border-pink-800 hover:bg-muted/30"
                        }`}
                      >
                        <span className={`text-2xl transition-transform ${selectedMood === mood.value ? "scale-110" : ""}`}>{mood.emoji}</span>
                        <span className="text-[10px] font-bold leading-tight">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {selectedMood && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground italic">{currentPrompt}</p>
                        <textarea
                          ref={textareaRef}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={5}
                          maxLength={1000}
                          className="w-full px-4 py-3 rounded-xl border border-border/50 bg-muted/10 text-sm leading-relaxed focus-visible:outline-none focus-visible:border-pink-300 focus-visible:ring-2 focus-visible:ring-pink-100 dark:focus-visible:ring-pink-950/30 transition-all resize-none placeholder:text-muted-foreground/50"
                          placeholder="Start writing..."
                          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground">
                            {note.length > 0 ? `${note.length}/1000` : "Writing is optional — just the mood is fine too"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsWriting(false);
                      setSelectedMood(null);
                      setNote("");
                    }}
                    className="text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!selectedMood || createMutation.isPending}
                    className="flex-1 bg-pink-500 hover:bg-pink-600"
                    size="sm"
                  >
                    {createMutation.isPending ? "Saving..." : "Save to diary"}
                  </Button>
                </div>

                {createMutation.isError && (
                  <p className="text-destructive text-xs text-center">Could not save. Please try again.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {entries.length === 0 && !isWriting && (
        <div className="text-center py-8">
          <BookHeart size={40} className="mx-auto text-pink-200 dark:text-pink-900 mb-3" />
          <p className="text-sm text-muted-foreground">
            Your diary is empty — tap above to write your first entry
          </p>
        </div>
      )}

      {grouped.length > 0 && (
        <div className="space-y-1">
          {grouped.map(([dateKey, dayEntries]) => {
            const firstEntry = dayEntries[0];
            const relDate = getRelativeDate(firstEntry.createdAt);
            const fullDate = new Date(firstEntry.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            });

            return (
              <div key={dateKey} className="space-y-1">
                <div className="flex items-center gap-2 pt-4 pb-1 px-1">
                  <Calendar size={12} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {relDate}
                  </span>
                  {relDate !== fullDate && (
                    <span className="text-xs text-muted-foreground/60">{fullDate}</span>
                  )}
                </div>

                {dayEntries.map((entry: any) => {
                  const moodInfo = getMoodInfo(entry.mood);
                  const time = new Date(entry.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit",
                  });

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group"
                    >
                      <div className={`relative rounded-xl border ${moodInfo.accent} ${moodInfo.color} p-4 transition-all`}>
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{moodInfo.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold">{moodInfo.label}</span>
                              <span className="text-[10px] text-muted-foreground">{time}</span>
                            </div>
                            {entry.note ? (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                                {entry.note}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No note</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this entry?")) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                            className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive focus-visible:text-destructive transition-all p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 rounded"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getStreak(entries: any[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set<string>();
  for (const e of entries) {
    dates.add(new Date(e.createdAt).toLocaleDateString("en-GB"));
  }
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-GB");
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

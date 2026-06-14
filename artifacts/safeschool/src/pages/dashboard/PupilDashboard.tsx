import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { WhatsNewBand, type DigestItem } from "@/components/dashboard/WhatsNewBand";
import {
  AlertTriangle, HeartHandshake, ArrowRight, Users,
  MessageCircle, Send, Zap, X, ChevronDown, ChevronUp, CheckCircle2,
  Smile, BookOpen, MessageSquareWarning
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { useMessageNotifications, suppressNotificationsFor } from "@/hooks/useMessageNotifications";

function MessageDialog({ contact, onClose, user }: { contact: any; onClose: () => void; user: any }) {
  const { t } = useTranslation("dashboard");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [location, setLocation] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const markedRef = useRef(new Set<string>());

  const QUICK_PHRASES = [
    t("someoneUnkind"),
    t("dontFeelSafe"),
    t("needToTalk"),
    t("somethingHappened"),
    t("worriedAboutFriend"),
    t("someoneHurtingMe"),
  ];

  const SCHOOL_LOCATIONS_MSG = [
    { id: "playground", label: t("playground") },
    { id: "classroom", label: t("classroom") },
    { id: "corridor", label: t("corridor") },
    { id: "canteen", label: t("canteen") },
    { id: "toilets", label: t("toilets") },
    { id: "sports_field", label: t("sportsField") },
    { id: "changing_rooms", label: t("changingRooms") },
    { id: "bus_stop", label: t("busStop") },
    { id: "library", label: t("library") },
    { id: "entrance_gate", label: t("entranceGate") },
    { id: "other", label: t("somewhereElse") },
  ];

  const PRIORITY_OPTIONS = [
    { id: "normal", label: t("justLettingYouKnow"), color: "bg-success/15 text-success", icon: MessageCircle },
    { id: "important", label: t("needHelpSoon"), color: "bg-warning/15 text-warning", icon: AlertTriangle },
    { id: "urgent", label: t("needHelpNow"), color: "bg-destructive/15 text-destructive", icon: Zap },
  ];

  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/messages", contact.id],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/messages?contactId=${contact.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!messages) return;
    const unread = messages.filter((m: any) => !m.readAt && !m.isFromMe && !markedRef.current.has(m.id));
    if (unread.length === 0) return;
    const token = localStorage.getItem("safeschool_token");
    for (const m of unread) {
      markedRef.current.add(m.id);
      fetch(`/api/messages/${m.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) {
            markedRef.current.delete(m.id);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        })
        .catch(() => { markedRef.current.delete(m.id); });
    }
  }, [messages, queryClient]);

  const sortedMessages = [...(messages || [])].reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedMessages.length]);

  // Suppress in-app message toasts for this contact while their chat is open
  useEffect(() => {
    const release = suppressNotificationsFor(contact.id);
    return release;
  }, [contact.id]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: contact.id, body: body.trim(), priority, type: "message", location: location || null }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setBody("");
      setPriority("normal");
      setLocation("");
      setShowOptions(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      inputRef.current?.focus();
    },
  });

  const priorityIcon = priority === "urgent" ? <Zap size={16} /> : priority === "important" ? <AlertTriangle size={16} /> : <MessageCircle size={16} />;
  const optionsActive = showOptions || priority !== "normal";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              {contact.firstName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate">{contact.firstName} {contact.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{contact.displayRole}{contact.isFormTutor ? ` (${t("yourTutor")})` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close chat" className="text-muted-foreground hover:text-foreground shrink-0 ml-2"><X size={20} /></button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[180px]">
          {sortedMessages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10 px-4">
              {t("noMessagesYetWithContact", { name: contact.firstName })}
            </div>
          ) : (
            sortedMessages.map((m: any) => (
              <div key={m.id} className={`flex ${m.isFromMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  m.isFromMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : m.priority === "urgent" || m.type === "urgent_help"
                      ? "bg-destructive/15 text-destructive rounded-bl-md border border-destructive/30"
                      : m.priority === "important"
                        ? "bg-warning/10 text-foreground rounded-bl-md border border-warning/30"
                        : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {!m.isFromMe && (m.priority === "urgent" || m.type === "urgent_help") && (
                    <div className="flex items-center gap-1.5 mb-1 opacity-80">
                      <Zap size={12} />
                      <span className="text-[10px] font-bold uppercase">{t("needHelpNow")}</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">{formatDate(m.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {sortedMessages.length === 0 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">{t("quickPhrases")}</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PHRASES.map(phrase => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => { setBody(phrase); inputRef.current?.focus(); }}
                  className="px-2.5 py-1 rounded-xl text-xs bg-muted/60 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-all"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-t border-border bg-muted/20 shrink-0"
            >
              <div className="p-3">
                <p className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">{t("howImportantIsThis")}</p>
                <div className="flex gap-1.5 mb-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriority(opt.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                        priority === opt.id ? `${opt.color} border-current` : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <opt.icon size={12} aria-hidden="true" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {priority === "urgent" && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground mb-1.5 mt-2 uppercase tracking-wider">{t("whereAreYou")}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {SCHOOL_LOCATIONS_MSG.map(loc => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => setLocation(loc.id)}
                          className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                            location === loc.id ? "bg-destructive/15 border-destructive/40 text-destructive" : "bg-background border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => { e.preventDefault(); if (body.trim() && !sendMutation.isPending) sendMutation.mutate(); }}
          className="p-3 border-t border-border bg-background shrink-0 flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => setShowOptions(s => !s)}
            aria-label={t("addPriorityOrLocation")}
            aria-expanded={showOptions}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              optionsActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {priorityIcon}
            {showOptions ? <ChevronDown size={10} className="ml-0.5" /> : <ChevronUp size={10} className="ml-0.5" />}
          </button>
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (body.trim() && !sendMutation.isPending) sendMutation.mutate();
              }
            }}
            rows={1}
            placeholder={t("typeMessageHere")}
            className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none max-h-32"
            autoFocus
          />
          <Button type="submit" disabled={!body.trim() || sendMutation.isPending} size="default" className="shrink-0 h-10 w-10 p-0" aria-label={t("sendMessage")}>
            <Send size={16} />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function UrgentHelpDialog({ contacts, onClose, user }: { contacts: any[]; onClose: () => void; user: any }) {
  const { t } = useTranslation("dashboard");
  const [location, setLocation] = useState("");
  const [body, setBody] = useState(t("iNeedHelpRightNow"));
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);
  const queryClient = useQueryClient();

  const SCHOOL_LOCATIONS_MSG = [
    { id: "playground", label: t("playground") },
    { id: "classroom", label: t("classroom") },
    { id: "corridor", label: t("corridor") },
    { id: "canteen", label: t("canteen") },
    { id: "toilets", label: t("toilets") },
    { id: "sports_field", label: t("sportsField") },
    { id: "changing_rooms", label: t("changingRooms") },
    { id: "bus_stop", label: t("busStop") },
    { id: "library", label: t("library") },
    { id: "entrance_gate", label: t("entranceGate") },
    { id: "other", label: t("somewhereElse") },
  ];

  const tutor = contacts.find((c: any) => c.isFormTutor);
  const coordinator = contacts.find((c: any) => c.role === "coordinator");
  const targets = [tutor, coordinator].filter(Boolean);
  if (targets.length === 0 && contacts.length > 0) targets.push(contacts[0]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (targets.length === 0) throw new Error("No contacts available");
      const token = localStorage.getItem("safeschool_token");
      let delivered = 0;
      for (const t of targets) {
        try {
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              recipientId: t.id,
              body: `${body}${location ? ` [Location: ${location}]` : ""}`,
              priority: "urgent",
              type: "urgent_help",
              location: location || null,
            }),
          });
          if (res.ok) delivered++;
        } catch {}
      }
      if (delivered === 0) throw new Error("Failed to deliver");
      return delivered;
    },
    onSuccess: () => {
      setSent(true);
      setSendError(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => {
      setSendError(true);
    },
  });

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{t("helpOnTheWay")}</h3>
          <p className="text-muted-foreground mb-6">
            {t("teachersAlerted")}
          </p>
          <Button onClick={onClose} className="w-full">{t("common:done")}</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background rounded-t-2xl md:rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-destructive/15 rounded-full flex items-center justify-center">
              <Zap size={24} className="text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{t("iNeedHelpNow")}</p>
              <p className="text-xs text-muted-foreground">{t("alertTeachersImmediately")}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close urgent help dialog" className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">{t("whereAreYou")}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {SCHOOL_LOCATIONS_MSG.map(loc => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setLocation(loc.id)}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                  location === loc.id ? "bg-destructive/15 border-destructive/40 text-destructive" : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">{t("whatsHappening")}</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-destructive focus-visible:ring-4 focus-visible:ring-destructive/20 transition-all resize-none"
            placeholder={t("tellUsWhatsHappening")}
          />
        </div>

        {sendError && (
          <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
            {t("alertCouldNotBeSent")}
          </div>
        )}

        {targets.length === 0 ? (
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm font-medium text-center">
            {t("noContactsAvailable")}
          </div>
        ) : (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            size="lg"
          >
            {sendMutation.isPending ? t("sendingAlert") : t("sendUrgentAlert")}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function PupilMyMessages({ user, totalUnread }: { user: any; totalUnread: number }) {
  const { t } = useTranslation("dashboard");
  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return <div className="animate-pulse h-24 bg-muted rounded-xl" />;
  if (!messages || messages.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle size={18} aria-hidden="true" /> {t("myMessages")}
          {totalUnread > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {messages.slice(0, 8).map((m: any) => (
            <div key={m.id} className={`p-4 ${!m.readAt && !m.isFromMe ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold">
                      {m.isFromMe ? `You \u2192 ${m.recipientName}` : `${m.senderName} \u2192 You`}
                    </span>
                    {m.priority === "urgent" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive">URGENT</span>}
                    {m.priority === "important" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/15 text-warning">IMPORTANT</span>}
                    {m.type === "chat_request" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/15 text-info">CHAT REQUEST</span>}
                  </div>
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{m.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(m.createdAt)}</p>
                </div>
                {!m.readAt && !m.isFromMe && <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PupilDashboard({ user }: { user: any }) {
  const { t } = useTranslation(["dashboard", "diary"]);
  const [messageContact, setMessageContact] = useState<any>(null);
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);
  const { unreadByContact, totalUnread } = useMessageNotifications();

  const { data: contacts } = useQuery({
    queryKey: ["/api/safe-contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/safe-contacts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const safeContacts = contacts || [];

  // Phase 1 ticket 2: wellbeing-led headline. Mood chips reuse the same 5
  // mood definitions as the diary page so the labels stay in lockstep —
  // clicking a chip navigates to /diary?mood=N (the diary page can preselect
  // later; pre-selection is out of scope here).
  const MOOD_CHIPS = [
    { value: 1, emoji: "\uD83D\uDE22", labelKey: "sad" },
    { value: 2, emoji: "\uD83D\uDE1F", labelKey: "worried" },
    { value: 3, emoji: "\uD83D\uDE10", labelKey: "meh" },
    { value: 4, emoji: "\uD83D\uDE0A", labelKey: "happy" },
    { value: 5, emoji: "\uD83E\uDD29", labelKey: "amazing" },
  ];

  const digest: DigestItem[] = [];
  if (totalUnread > 0) {
    digest.push({
      id: "messages", icon: MessageCircle, tone: "primary",
      title: t("dashboard:newMessagesCount", { count: totalUnread, defaultValue: `${totalUnread} new messages` }),
      href: "/messages", unread: true,
    });
  }

  return (
    <div className="space-y-6 md:space-y-10 max-w-4xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">{t("dashboard:hi", { name: user.firstName })}</h1>
        <p className="mt-2 md:mt-3 text-lg md:text-xl text-muted-foreground/90 leading-relaxed">{t("dashboard:howAreYouFeeling")}</p>
      </div>

      <WhatsNewBand
        items={digest}
        heading={t("dashboard:sinceLastHere", { defaultValue: "Since you were last here" })}
        emptyLabel={t("dashboard:allCaughtUp", { defaultValue: "You're all caught up." })}
      />

      {/* Wellbeing-led headline: mood + PSHE learning. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-6 md:mt-8">
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 group overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Smile size={180} />
          </div>
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-5 md:mb-6 shadow-md shadow-primary/30">
              <Smile size={32} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("dashboard:feelingHeadline")}</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t("dashboard:feelingSubtitle")}</p>
            <div className="grid grid-cols-5 gap-2 mb-6" role="group" aria-label={t("dashboard:feelingHeadline")}>
              {MOOD_CHIPS.map((m) => (
                <Link key={m.value} href={`/diary?mood=${m.value}`}>
                  <button
                    type="button"
                    aria-label={t(`diary:${m.labelKey}`)}
                    className="w-full aspect-square min-h-[72px] rounded-2xl bg-background border-2 border-border hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all flex flex-col items-center justify-center gap-1 group/chip"
                  >
                    <span className="text-3xl group-hover/chip:scale-110 transition-transform" aria-hidden="true">{m.emoji}</span>
                    <span className="text-[10px] font-bold text-muted-foreground truncate w-full text-center px-1 uppercase tracking-wide">{t(`diary:${m.labelKey}`)}</span>
                  </button>
                </Link>
              ))}
            </div>
            <Link href="/diary">
              <Button size="lg" className="w-full text-base font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                {t("dashboard:feelingCta")} <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:border-secondary/40 group overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-500">
            <BookOpen size={180} />
          </div>
          <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-secondary rounded-2xl flex items-center justify-center text-white mb-5 md:mb-6 shadow-md shadow-secondary/30">
              <BookOpen size={32} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("dashboard:pshHeadline")}</h2>
            <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{t("dashboard:pshPlaceholder")}</p>
            <Link href="/learn">
              <Button size="lg" variant="outline" className="w-full text-base font-semibold hover:-translate-y-0.5 transition-all">
                {t("dashboard:pshCta")} <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Safe contacts card — unchanged behaviour, now full width below the headline. */}
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
        <CardContent className="p-5 md:p-7 flex flex-col h-full">
          <div className="mb-5">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white mb-3 shadow-md shadow-secondary/30">
              <Users size={24} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-1">{t("dashboard:mySafeContacts")}</h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{t("dashboard:tapToSendMessage")}</p>
          </div>
          <div className="space-y-2 flex-1">
            {safeContacts.slice(0, 4).map((c: any) => {
              const unread = unreadByContact[c.id] || 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMessageContact(c)}
                  className={`w-full flex items-center gap-3 bg-background p-3 md:p-4 rounded-2xl border transition-all text-left group hover:shadow-sm ${
                    unread > 0
                      ? "border-primary/60 bg-primary/5 hover:border-primary"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                      {c.firstName?.charAt(0)}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ring-2 ring-background">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm md:text-base truncate ${unread > 0 ? "font-bold" : "font-semibold"}`}>{c.firstName} {c.lastName}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{c.displayRole}{c.isFormTutor ? ` \u00b7 ${t("dashboard:yourTutor")}` : ""}</p>
                  </div>
                  <MessageCircle size={16} className={`shrink-0 transition-colors ${unread > 0 ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowUrgentHelp(true)}
        className="w-full flex items-center justify-center gap-3 p-5 md:p-6 rounded-2xl bg-destructive/10 border-2 border-destructive/30 hover:border-destructive/50 hover:bg-destructive/15 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="w-12 h-12 bg-destructive rounded-2xl flex items-center justify-center text-destructive-foreground shadow-md shadow-destructive/30 group-hover:scale-105 transition-transform">
          <Zap size={24} />
        </div>
        <div className="text-left">
          <p className="font-bold text-destructive text-lg">{t("dashboard:iNeedHelpNow")}</p>
          <p className="text-sm text-destructive/70 leading-relaxed">{t("dashboard:sendUrgentAlertToTeachers")}</p>
        </div>
      </button>

      <PupilMyMessages user={user} totalUnread={totalUnread} />

      {/* Demoted: reporting tool now lives at the foot of the dashboard as a
          small secondary card, not the front-door headline. /report route is
          unchanged. */}
      <Card className="rounded-2xl border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
        <CardContent className="p-4 md:p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-warning/15 flex items-center justify-center text-warning shrink-0">
            <MessageSquareWarning size={20} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm md:text-base">{t("dashboard:talkOrReportHeadline")}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed">{t("dashboard:talkOrReportBody")}</p>
          </div>
          <Link href="/report">
            <Button size="sm" variant="outline" className="shrink-0 font-semibold">
              {t("dashboard:talkOrReportCta")}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {messageContact && (
        <MessageDialog contact={messageContact} onClose={() => setMessageContact(null)} user={user} />
      )}
      {showUrgentHelp && (
        <UrgentHelpDialog contacts={safeContacts} onClose={() => setShowUrgentHelp(false)} user={user} />
      )}
    </div>
  );
}

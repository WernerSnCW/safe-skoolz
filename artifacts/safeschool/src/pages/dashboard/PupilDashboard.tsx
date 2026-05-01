import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import {
  AlertTriangle, HeartHandshake, ArrowRight, Users,
  MessageCircle, Send, Zap, X, ChevronDown, ChevronUp, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";

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
    { id: "normal", label: t("justLettingYouKnow"), color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400", icon: MessageCircle },
    { id: "important", label: t("needHelpSoon"), color: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", icon: AlertTriangle },
    { id: "urgent", label: t("needHelpNow"), color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400", icon: Zap },
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
                      ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-200 rounded-bl-md border border-red-200 dark:border-red-800"
                      : m.priority === "important"
                        ? "bg-amber-50 text-foreground dark:bg-amber-950/20 rounded-bl-md border border-amber-200 dark:border-amber-800"
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
                  className="px-2.5 py-1 rounded-lg text-xs bg-muted/60 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-all"
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
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
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
                          className={`px-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                            location === loc.id ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-950/30 dark:text-red-400" : "bg-background border-border text-muted-foreground hover:bg-muted"
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
          <div className="w-20 h-20 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
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
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
              <Zap size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{t("iNeedHelpNow")}</p>
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
                className={`px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                  location === loc.id ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-950/30 dark:text-red-400" : "bg-muted/30 border-border text-muted-foreground"
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
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-red-400 focus-visible:ring-4 focus-visible:ring-red-100 transition-all resize-none"
            placeholder={t("tellUsWhatsHappening")}
          />
        </div>

        {sendError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
            {t("alertCouldNotBeSent")}
          </div>
        )}

        {targets.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium text-center">
            {t("noContactsAvailable")}
          </div>
        ) : (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {sendMutation.isPending ? t("sendingAlert") : t("sendUrgentAlert")}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function PupilMyMessages({ user }: { user: any }) {
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
        <CardTitle className="text-lg flex items-center gap-2"><MessageCircle size={18} aria-hidden="true" /> {t("myMessages")}</CardTitle>
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
                    {m.priority === "urgent" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">URGENT</span>}
                    {m.priority === "important" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">IMPORTANT</span>}
                    {m.type === "chat_request" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">CHAT REQUEST</span>}
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
  const { t } = useTranslation("dashboard");
  const [messageContact, setMessageContact] = useState<any>(null);
  const [showUrgentHelp, setShowUrgentHelp] = useState(false);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-display font-bold text-foreground">{t("hi", { name: user.firstName })}</h1>
        <p className="mt-2 text-xl text-muted-foreground">{t("howAreYouFeeling")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 group overflow-hidden relative">
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-500">
             <HeartHandshake size={180} />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/30">
              <HeartHandshake size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t("speakUp")}</h2>
            <p className="text-muted-foreground mb-8">{t("ifSomethingNotRight")}</p>
            <Link href="/report">
              <Button size="lg" className="w-full text-lg shadow-xl shadow-primary/20">
                {t("reportAConcern")} <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="mb-4">
              <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-secondary/30">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold mb-1">{t("mySafeContacts")}</h2>
              <p className="text-sm text-muted-foreground">{t("tapToSendMessage")}</p>
            </div>
            <div className="space-y-2 flex-1">
              {safeContacts.slice(0, 4).map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMessageContact(c)}
                  className="w-full flex items-center gap-3 bg-background p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold shrink-0">
                    {c.firstName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground">{c.displayRole}{c.isFormTutor ? ` \u00b7 ${t("yourTutor")}` : ""}</p>
                  </div>
                  <MessageCircle size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <button
        type="button"
        onClick={() => setShowUrgentHelp(true)}
        className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all group"
      >
        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
          <Zap size={24} />
        </div>
        <div className="text-left">
          <p className="font-bold text-red-700 dark:text-red-400 text-lg">{t("iNeedHelpNow")}</p>
          <p className="text-sm text-red-600/70 dark:text-red-400/70">{t("sendUrgentAlertToTeachers")}</p>
        </div>
      </button>

      <PupilMyMessages user={user} />

      {messageContact && (
        <MessageDialog contact={messageContact} onClose={() => setMessageContact(null)} user={user} />
      )}
      {showUrgentHelp && (
        <UrgentHelpDialog contacts={safeContacts} onClose={() => setShowUrgentHelp(false)} user={user} />
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { MessageCircle, Send, ArrowLeft, Zap, AlertTriangle, MapPin, Clock, UserPlus, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";

type ContactInfo = { id: string; firstName: string; lastName: string; role: string; displayRole: string; isChildsTeacher?: boolean; className?: string | null };

function ConversationList({ onSelect, selectedId }: { onSelect: (id: string) => void; selectedId: string | null }) {
  const { t } = useTranslation("messages");
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["/api/messages/conversations"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages/conversations", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>;

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageCircle size={48} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground font-medium">{t("noMessagesYet")}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">{t("messagesAppearHere")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv: any) => (
        <button
          key={conv.contactId}
          type="button"
          onClick={() => onSelect(conv.contactId)}
          className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-all text-left ${
            selectedId === conv.contactId ? "bg-primary/5 border-l-2 border-primary" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {conv.contactName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm truncate">{conv.contactName}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(conv.lastMessageAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {conv.lastMessageType === "urgent_help" && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-destructive/15 text-destructive">{t("urgent")}</span>}
              {conv.lastMessageType === "chat_request" && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">{t("chatReq")}</span>}
              {conv.lastMessagePriority === "important" && conv.lastMessageType === "message" && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-warning/15 text-warning">{t("important")}</span>}
              <p className="text-xs text-muted-foreground truncate">
                {conv.lastMessageIsFromMe ? t("you") : ""}{conv.lastMessage}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{conv.contactRole} {conv.contactClass ? `· ${conv.contactClass}` : ""}</p>
          </div>
          {conv.unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ConversationThread({ contactId }: { contactId: string }) {
  const { t } = useTranslation("messages");
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", contactId],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/messages?contactId=${contactId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });

  const markedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!messages) return;
    const unread = messages.filter((m: any) => !m.readAt && !m.isFromMe && !markedRef.current.has(m.id));
    if (unread.length === 0) return;
    const token = localStorage.getItem("safeschool_token");
    for (const m of unread) {
      markedRef.current.add(m.id);
      fetch(`/api/messages/${m.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
        .then(() => queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] }));
    }
  }, [messages]);

  const sendReply = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: contactId, body: reply.trim(), priority: "normal", type: "message" }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>;

  const sortedMessages = [...(messages || [])].reverse();
  const contactName = sortedMessages.find((m: any) => !m.isFromMe)?.senderName || sortedMessages[0]?.recipientName || t("student");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-bold text-lg">{contactName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedMessages.map((m: any) => (
          <div key={m.id} className={`flex ${m.isFromMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              m.isFromMe
                ? "bg-primary text-primary-foreground rounded-br-md"
                : m.type === "urgent_help"
                  ? "bg-destructive/15 text-destructive rounded-bl-md border border-destructive/30"
                  : m.type === "chat_request"
                    ? "bg-info/15 text-info rounded-bl-md border border-info/30"
                    : m.priority === "important"
                      ? "bg-warning/10 text-foreground rounded-bl-md border border-warning/30"
                      : "bg-muted text-foreground rounded-bl-md"
            }`}>
              {m.type === "urgent_help" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={14} />
                  <span className="text-xs font-bold uppercase">{t("urgentHelpRequest")}</span>
                </div>
              )}
              {m.type === "chat_request" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageCircle size={14} />
                  <span className="text-xs font-bold uppercase">{t("chatRequest")}</span>
                </div>
              )}
              <p className="text-sm">{m.body}</p>
              {m.location && (
                <div className="flex items-center gap-1 mt-1.5 text-xs opacity-70">
                  <MapPin size={12} />
                  {m.location.replace(/_/g, " ")}
                </div>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                <Clock size={10} className="opacity-50" />
                <span className="text-[10px] opacity-50">{formatDate(m.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={e => { e.preventDefault(); if (reply.trim()) sendReply.mutate(); }} className="flex gap-2">
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={t("typeReply")}
            className="flex-1 rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
          />
          <Button type="submit" disabled={!reply.trim() || sendReply.isPending} size="default">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewParentMessage({ onStartConversation }: { onStartConversation: (contactId: string) => void }) {
  const { t } = useTranslation("messages");
  const [open, setOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts } = useQuery<ContactInfo[]>({
    queryKey: ["/api/parent-contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/parent-contacts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!selectedContact || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: selectedContact.id, body: body.trim(), priority: "normal", type: "message" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send message. Please try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setOpen(false);
      setBody("");
      setSelectedContact(null);
      onStartConversation(selectedContact.id);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus size={16} />
        {t("newMessage")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <Card className="w-full max-w-md" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg">{t("newMessage")}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("sendTo")}</label>
            <select
              value={selectedContact?.id || ""}
              onChange={(e) => {
                const contact = contacts?.find(c => c.id === e.target.value);
                setSelectedContact(contact || null);
              }}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>{t("chooseStaff")}</option>
              {contacts?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} — {c.displayRole}{c.isChildsTeacher ? ` (${t("childsTeacher")})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t("message")}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("writeMessage")}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">{error}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={!selectedContact || !body.trim() || sending} className="flex-1 gap-2">
              <Send size={14} />
              {sending ? t("common:sending") : t("sendMessage")}
            </Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setSelectedContact(null); setBody(""); setError(""); }}>
              {t("common:cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChildEmergencyAlerts() {
  const { t } = useTranslation("messages");
  const [expanded, setExpanded] = useState(true);

  const { data: alerts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/messages/child-alerts"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages/child-alerts", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading || !alerts || alerts.length === 0) return null;

  const roleLabels: Record<string, string> = {
    teacher: t("roleTeacher"),
    head_of_year: t("roleHeadOfYear"),
    senco: "SENCO",
    coordinator: t("roleCoordinator"),
    head_teacher: t("roleHeadTeacher"),
    support_staff: t("roleSupportStaff"),
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="border-destructive/30 bg-destructive/10 mb-6">
      <CardHeader className="border-b border-destructive/30 bg-destructive/10 pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <ShieldAlert size={20} />
            {t("emergencyAlerts")} ({alerts.length})
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        <p className="text-sm text-destructive/80 mt-1">
          {t("urgentHelpRequests")}
        </p>
      </CardHeader>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="p-4 space-y-3">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-gray-900 border border-destructive/30 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-destructive/15 rounded-full flex items-center justify-center">
                        <Zap size={14} className="text-destructive" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{alert.childName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("sentTo")} {alert.recipientName}{alert.recipientRole ? ` (${roleLabels[alert.recipientRole] || alert.recipientRole})` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDateTime(alert.createdAt)}</span>
                  </div>
                  <p className="text-sm bg-destructive/10 rounded-lg p-3 text-destructive border border-destructive/30">
                    "{alert.body}"
                  </p>
                  {alert.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={12} />
                      <span className="capitalize">{alert.location.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function MessagesPage() {
  const { t } = useTranslation("messages");
  const { user } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  if (!user) return null;

  const allowedRoles = ["teacher", "head_of_year", "senco", "coordinator", "head_teacher", "support_staff", "parent"];
  if (!allowedRoles.includes(user.role || "")) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("messagesAvailable")}</p>
      </div>
    );
  }

  const isParent = user.role === "parent";
  const isStaff = !isParent;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("messages")}</h1>
          <p className="text-muted-foreground mt-1">{isParent ? t("parentSubtitle") : t("staffSubtitle")}</p>
        </div>
        {isParent && (
          <NewParentMessage onStartConversation={(contactId) => setSelectedContactId(contactId)} />
        )}
      </div>

      {isParent && <ChildEmergencyAlerts />}

      <Card className="overflow-hidden">
        <div className="flex h-[600px]">
          <div className={`${selectedContactId ? "hidden md:block" : ""} w-full md:w-80 border-r border-border overflow-y-auto`}>
            <ConversationList onSelect={setSelectedContactId} selectedId={selectedContactId} />
          </div>
          <div className={`${selectedContactId ? "" : "hidden md:flex"} flex-1 flex flex-col`}>
            {selectedContactId ? (
              <>
                <div className="md:hidden p-2 border-b border-border">
                  <button onClick={() => setSelectedContactId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={16} /> {t("common:back")}
                  </button>
                </div>
                <ConversationThread contactId={selectedContactId} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">{t("selectConversation")}</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {isParent ? t("chooseStaffOrStart") : t("chooseContact")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

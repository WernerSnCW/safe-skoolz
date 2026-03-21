import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import {
  AlertTriangle, HeartHandshake, ArrowRight, Users,
  MessageCircle, Send, Zap, X, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

const QUICK_PHRASES = [
  "Someone is being unkind to me",
  "I don't feel safe",
  "I need to talk to someone",
  "Something happened and I'm upset",
  "I'm worried about a friend",
  "Someone is hurting me",
];

const SCHOOL_LOCATIONS_MSG = [
  { id: "playground", label: "Playground" },
  { id: "classroom", label: "Classroom" },
  { id: "corridor", label: "Corridor" },
  { id: "canteen", label: "Canteen" },
  { id: "toilets", label: "Toilets" },
  { id: "sports_field", label: "Sports field" },
  { id: "changing_rooms", label: "Changing rooms" },
  { id: "bus_stop", label: "Bus stop" },
  { id: "library", label: "Library" },
  { id: "entrance_gate", label: "Entrance gate" },
  { id: "other", label: "Somewhere else" },
];

const PRIORITY_OPTIONS = [
  { id: "normal", label: "Just letting you know", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400", icon: MessageCircle },
  { id: "important", label: "I need help soon", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400", icon: AlertTriangle },
  { id: "urgent", label: "I need help now", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400", icon: Zap },
];

function MessageDialog({ contact, onClose, user }: { contact: any; onClose: () => void; user: any }) {
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<"message" | "chat_request">("message");
  const [sent, setSent] = useState(false);
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: contact.id, body, priority, type, location: location || null }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Message sent!</h3>
          <p className="text-muted-foreground mb-6">
            {contact.firstName} {contact.lastName} will see your message. You did the right thing by reaching out.
          </p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background rounded-t-2xl md:rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {contact.firstName?.charAt(0)}
            </div>
            <div>
              <p className="font-bold">{contact.firstName} {contact.lastName}</p>
              <p className="text-xs text-muted-foreground">{contact.displayRole}{contact.isFormTutor ? " (Your tutor)" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close message dialog" className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType("message")}
            className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${type === "message" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            <Send size={14} className="inline mr-1.5" aria-hidden="true" /> Send a message
          </button>
          <button
            onClick={() => setType("chat_request")}
            className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${type === "chat_request" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            <MessageCircle size={14} className="inline mr-1.5" aria-hidden="true" /> Request a chat
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Quick phrases</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PHRASES.map(phrase => (
              <button
                key={phrase}
                type="button"
                onClick={() => setBody(phrase)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${body === phrase ? "bg-primary/10 border-primary text-primary font-bold" : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"}`}
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            {type === "chat_request" ? "Why would you like to talk?" : "Your message"}
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
            placeholder={type === "chat_request" ? "Tell them why you'd like to talk..." : "Type your message here..."}
          />
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">How important is this?</p>
          <div className="space-y-2">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPriority(opt.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                  priority === opt.id ? `${opt.color} border-current` : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                <opt.icon size={16} aria-hidden="true" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {priority === "urgent" && (
          <div className="mb-4">
            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Where are you right now?</p>
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
        )}

        <Button
          onClick={() => sendMutation.mutate()}
          disabled={!body.trim() || sendMutation.isPending}
          className="w-full"
          size="lg"
        >
          {sendMutation.isPending ? "Sending..." : type === "chat_request" ? "Request chat" : "Send message"}
        </Button>
      </motion.div>
    </div>
  );
}

function UrgentHelpDialog({ contacts, onClose, user }: { contacts: any[]; onClose: () => void; user: any }) {
  const [location, setLocation] = useState("");
  const [body, setBody] = useState("I need help right now");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);
  const queryClient = useQueryClient();

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
              type: "message",
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
          <h3 className="text-2xl font-bold mb-2">Help is on the way</h3>
          <p className="text-muted-foreground mb-6">
            Your teachers have been alerted. Stay where you are — someone will come to you as quickly as possible.
          </p>
          <Button onClick={onClose} className="w-full">Done</Button>
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
              <p className="text-lg font-bold text-red-700 dark:text-red-400">I Need Help NOW</p>
              <p className="text-xs text-muted-foreground">This will alert your teachers immediately</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close urgent help dialog" className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Where are you right now?</p>
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
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">What's happening? (optional)</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-red-400 focus-visible:ring-4 focus-visible:ring-red-100 transition-all resize-none"
            placeholder="Tell us what's happening..."
          />
        </div>

        {sendError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
            Alert could not be sent. Please find a trusted adult in person right away.
          </div>
        )}

        {targets.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium text-center">
            No contacts available right now. Please find a teacher or go to the school office immediately.
          </div>
        ) : (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {sendMutation.isPending ? "Sending alert..." : "Send urgent alert"}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function PupilMyMessages({ user }: { user: any }) {
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
        <CardTitle className="text-lg flex items-center gap-2"><MessageCircle size={18} aria-hidden="true" /> My Messages</CardTitle>
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
        <h1 className="text-4xl font-display font-bold text-foreground">Hi, {user.firstName}! {"👋"}</h1>
        <p className="mt-2 text-xl text-muted-foreground">How are you feeling today?</p>
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
            <h2 className="text-2xl font-bold mb-2">Speak Up</h2>
            <p className="text-muted-foreground mb-8">If something isn't right, let us know. We are here to help and listen to you.</p>
            <Link href="/report">
              <Button size="lg" className="w-full text-lg shadow-xl shadow-primary/20">
                Report a Concern <ArrowRight className="ml-2" size={20} />
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
              <h2 className="text-xl font-bold mb-1">My Safe Contacts</h2>
              <p className="text-sm text-muted-foreground">Tap a name to send them a message or request a chat.</p>
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
                    <p className="text-xs text-muted-foreground">{c.displayRole}{c.isFormTutor ? " \u00b7 Your tutor" : ""}</p>
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
          <p className="font-bold text-red-700 dark:text-red-400 text-lg">I need help NOW</p>
          <p className="text-sm text-red-600/70 dark:text-red-400/70">Send an urgent alert to your teachers with your location</p>
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

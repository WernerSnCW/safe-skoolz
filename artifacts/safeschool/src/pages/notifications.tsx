import { useState } from "react";
import { useListNotifications, useAcknowledgeNotification } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, Button } from "@/components/ui-polished";
import { formatDate } from "@/lib/utils";
import { Bell, Check, Info, Send, Megaphone, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AUDIENCE_OPTIONS = [
  { value: "all_parents", label: "All Parents" },
  { value: "all_staff", label: "All Staff" },
  { value: "parents_and_staff", label: "Parents & Staff" },
  { value: "all", label: "Everyone" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "General" },
  { value: "misogyny", label: "Misogyny / Gender Respect" },
  { value: "bullying", label: "Bullying Awareness" },
  { value: "material", label: "Material / Socio-economic" },
  { value: "retaliation", label: "Anti-Retaliation" },
  { value: "online_safety", label: "Online Safety" },
  { value: "wellbeing", label: "Wellbeing" },
  { value: "safeguarding", label: "Safeguarding Update" },
  { value: "policy", label: "Policy Change" },
];

function fetchWithAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("safeschool_token");
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
}

export default function NotificationsList() {
  const { user } = useAuth();
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const ackMutation = useAcknowledgeNotification();
  const queryClient = useQueryClient();
  const notifications = data?.data || [];
  const canBroadcast = user && ["coordinator", "head_teacher"].includes(user.role);

  const handleAck = async (id: string) => {
    await ackMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-xl">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Notifications</h1>
            <p className="text-muted-foreground">Stay updated on important safeguarding alerts.</p>
          </div>
        </div>
      </div>

      {canBroadcast && <BroadcastPanel />}

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl"></div>)}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={notif.id}>
              <Card className={`transition-colors ${!notif.acknowledgedAt ? 'border-primary/30 shadow-md bg-primary/[0.02]' : 'opacity-70 bg-muted/20'}`}>
                <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                  <div className={`p-2 rounded-full shrink-0 mt-1 ${!notif.acknowledgedAt ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Info size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold ${!notif.acknowledgedAt ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.subject || 'System Alert'}
                      </h4>
                      <span className="text-xs text-muted-foreground shrink-0 ml-4">
                        {formatDate(notif.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>
                  {!notif.acknowledgedAt && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0 text-primary border-primary hover:bg-primary/10"
                      onClick={() => handleAck(notif.id)}
                      isLoading={ackMutation.isPending}
                    >
                      <Check size={16} className="mr-1"/> Ack
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              <Bell size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-semibold">All caught up!</p>
              <p className="text-sm mt-1">You have no pending notifications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BroadcastPanel() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all_parents");
  const [category, setCategory] = useState("");
  const [sent, setSent] = useState<{ count: number } | null>(null);
  const queryClient = useQueryClient();

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ subject, body, audience, category: category || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send" }));
        throw new Error(err.error || "Failed to broadcast");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSent({ count: data.sent });
      setSubject("");
      setBody("");
      setCategory("");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardContent className="p-4">
        <button
          onClick={() => { setOpen(!open); setSent(null); }}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Send School Alert</p>
              <p className="text-xs text-muted-foreground">Broadcast a notification to parents, staff, or everyone</p>
            </div>
          </div>
          {open ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                {sent && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <p className="text-sm font-medium">Sent to {sent.count} {sent.count === 1 ? "person" : "people"}.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Audience</label>
                    <select
                      value={audience}
                      onChange={e => setAudience(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {AUDIENCE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      {CATEGORY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Important: Addressing inappropriate behaviour toward girls"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Message</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write your message to parents/staff..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    This will send a notification to {AUDIENCE_OPTIONS.find(a => a.value === audience)?.label?.toLowerCase() || "selected audience"}.
                  </p>
                  <Button
                    onClick={() => broadcastMutation.mutate()}
                    disabled={!subject.trim() || !body.trim() || broadcastMutation.isPending}
                    size="sm"
                  >
                    <Send size={14} className="mr-1" />
                    {broadcastMutation.isPending ? "Sending..." : "Send Alert"}
                  </Button>
                </div>

                {broadcastMutation.isError && (
                  <p className="text-xs text-destructive">{(broadcastMutation.error as Error).message}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

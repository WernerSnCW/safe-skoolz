import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export interface Conversation {
  contactId: string;
  contactName: string;
  contactRole: string;
  contactClass: string | null;
  lastMessage: string;
  lastMessageType: string;
  lastMessagePriority: string;
  lastMessageAt: string;
  lastMessageIsFromMe: boolean;
  unreadCount: number;
}

const suppressedContacts = new Set<string>();

export function suppressNotificationsFor(contactId: string) {
  suppressedContacts.add(contactId);
  return () => { suppressedContacts.delete(contactId); };
}

let audioCtx: AudioContext | null = null;
function playNotificationSound() {
  try {
    if (!audioCtx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.setValueAtTime(880, now);
    o2.frequency.setValueAtTime(1320, now);
    o1.frequency.setValueAtTime(660, now + 0.09);
    o2.frequency.setValueAtTime(990, now + 0.09);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    o1.start(now); o2.start(now);
    o1.stop(now + 0.36); o2.stop(now + 0.36);
  } catch { /* ignore */ }
}

let permissionRequested = false;
function maybeRequestBrowserNotificationPermission() {
  if (permissionRequested) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    permissionRequested = true;
    Notification.requestPermission().catch(() => {});
  }
}

function showBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;
    const n = new Notification(title, { body, tag: "safeschool-message" });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* ignore */ }
}

const SUPPORTED_ROLES = new Set([
  "pupil",
  "parent",
  "teacher",
  "head_of_year",
  "support_staff",
  "senco",
  "coordinator",
  "head_teacher",
]);

function useConversationsData(): Conversation[] {
  const { isAuthenticated, user } = useAuth();
  const enabled = isAuthenticated && !!user && SUPPORTED_ROLES.has(user.role);

  const { data } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    enabled,
    refetchInterval: enabled ? 8000 : false,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return data || [];
}

/**
 * Read-only consumer: returns unread counts from the shared conversations query.
 * Does NOT trigger toasts/sound/browser-notifications. Safe to mount in any
 * component that needs unread numbers (badges, etc.).
 */
export function useMessageNotifications(): {
  totalUnread: number;
  unreadByContact: Record<string, number>;
  conversations: Conversation[];
} {
  const conversations = useConversationsData();

  const unreadByContact: Record<string, number> = {};
  let totalUnread = 0;
  for (const c of conversations) {
    if (c.unreadCount > 0) {
      unreadByContact[c.contactId] = c.unreadCount;
      totalUnread += c.unreadCount;
    }
  }

  return { totalUnread, unreadByContact, conversations };
}

/**
 * Side-effect engine: shows toast + plays sound + raises browser notification
 * when a new incoming message arrives. MUST be mounted exactly once per session
 * (currently in AppLayout) to avoid duplicate alerts.
 */
export function useMessageNotificationEngine(): void {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");
  const queryClient = useQueryClient();
  const conversations = useConversationsData();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && SUPPORTED_ROLES.has(user.role)) {
      maybeRequestBrowserNotificationPermission();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user || !SUPPORTED_ROLES.has(user.role)) {
      seenIdsRef.current = null;
      initializedRef.current = false;
      return;
    }

    const currentSignatures = new Set<string>();
    for (const c of conversations) {
      if (c.unreadCount > 0 && !c.lastMessageIsFromMe) {
        currentSignatures.add(`${c.contactId}::${c.lastMessageAt}`);
      }
    }

    if (!initializedRef.current) {
      seenIdsRef.current = currentSignatures;
      initializedRef.current = true;
      return;
    }

    const seen = seenIdsRef.current!;
    const newOnes: Conversation[] = [];
    for (const c of conversations) {
      if (c.unreadCount > 0 && !c.lastMessageIsFromMe) {
        const sig = `${c.contactId}::${c.lastMessageAt}`;
        if (!seen.has(sig)) {
          newOnes.push(c);
          seen.add(sig);
        }
      }
    }

    if (newOnes.length === 0) return;

    let didNotify = false;
    for (const c of newOnes) {
      if (suppressedContacts.has(c.contactId)) continue;
      const isUrgent = c.lastMessagePriority === "urgent" || c.lastMessageType === "urgent_help";
      const title = isUrgent
        ? t("urgentMessageFrom", { name: c.contactName })
        : t("newMessageFrom", { name: c.contactName });
      const preview = c.lastMessage.length > 90 ? c.lastMessage.slice(0, 90) + "…" : c.lastMessage;

      const handle = toast({
        title,
        description: preview,
        variant: isUrgent ? "destructive" : "default",
      });
      const dismissAfter = isUrgent ? 15000 : 8000;
      setTimeout(() => { try { handle.dismiss(); } catch { /* ignore */ } }, dismissAfter);

      showBrowserNotification(title, preview);
      didNotify = true;
    }

    if (didNotify) playNotificationSound();

    queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
  }, [conversations, isAuthenticated, user, t, toast, queryClient]);
}

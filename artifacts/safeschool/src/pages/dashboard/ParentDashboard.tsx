import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListNotifications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { PageHeader } from "@/components/layout/PageHeader";
import { WhatsNewBand, type DigestItem } from "@/components/dashboard/WhatsNewBand";
import { MissionActions } from "@/components/dashboard/MissionActions";
import { Megaphone, Library } from "lucide-react";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import {
  AlertTriangle, Bell, FileText, Activity, TrendingUp, Users,
  BarChart3, PieChart as PieChartIcon, MapPin, Clock, Calendar,
  UserCheck, ChevronDown, ChevronUp, Shield, Gauge, MessageCircle, Send,
  CheckCircle2, Vote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const CHART_COLORS_PARENT = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))","hsl(var(--chart-6))","hsl(var(--chart-7))"];

function ParentReportCard({ inc }: { inc: any }) {
  const { t } = useTranslation("dashboard");
  const [expanded, setExpanded] = useState(false);

  const PARENT_STATUS_LABELS: Record<string, string> = {
    open: t("statusOpen"),
    submitted: t("parentStatusSubmitted"),
    investigating: t("parentStatusInvestigating"),
    closed: t("statusResolved"),
    escalated: t("statusEscalated"),
  };

  const PARENT_CATEGORY_LABELS: Record<string, string> = {
    verbal: t("parentCategoryVerbal"),
    physical: t("parentCategoryPhysical"),
    psychological: t("parentCategoryPsychological"),
    exclusion: t("parentCategoryExclusion"),
    online: t("parentCategoryOnline"),
    neglect: t("parentCategoryNeglect"),
    safeguarding: t("parentCategorySafeguarding"),
    relational: t("parentCategoryRelational"),
    sexual: t("parentCategorySexual"),
    "verbal,physical": t("parentCategoryVerbalPhysical"),
    "verbal,psychological": t("parentCategoryVerbalPsychological"),
  };

  const PARENT_EMOTION_LABELS: Record<string, { label: string; emoji: string }> = {
    scared: { label: t("emotionScared"), emoji: "😨" },
    sad: { label: t("emotionSad"), emoji: "😢" },
    angry: { label: t("emotionAngry"), emoji: "😠" },
    worried: { label: t("emotionWorried"), emoji: "😟" },
    confused: { label: t("emotionConfused"), emoji: "😕" },
    okay: { label: t("emotionOkay"), emoji: "😐" },
  };

  const PARENT_LOCATION_LABELS: Record<string, string> = {
    playground: t("locationPlayground"),
    classroom: t("locationClassroom"),
    corridor: t("locationCorridor"),
    canteen: t("locationCanteen"),
    toilets: t("locationToilets"),
    sports_field: t("locationSportsField"),
    changing_rooms: t("locationChangingRooms"),
    bus_stop: t("locationBusStop"),
    online: t("locationOnline"),
    off_site: t("locationOffSite"),
    other: t("locationOther"),
  };

  const PARENT_TIER_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: t("lowLevel"), color: "bg-scale-5/15 text-scale-5" },
    2: { label: t("moderate"), color: "bg-scale-3/15 text-scale-3" },
    3: { label: t("serious"), color: "bg-scale-1/15 text-scale-1" },
  };

  const emotion = inc.emotionalState ? PARENT_EMOTION_LABELS[inc.emotionalState] : null;
  const tierInfo = inc.escalationTier ? PARENT_TIER_LABELS[inc.escalationTier] : null;

  return (
    <div className="p-4 hover:bg-muted/20 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{inc.referenceNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                inc.status === "closed" ? "bg-success/15 text-success" :
                inc.status === "investigating" ? "bg-info/15 text-info" :
                "bg-warning/20 text-warning"
              }`}>
                {PARENT_STATUS_LABELS[inc.status] || inc.status}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {PARENT_CATEGORY_LABELS[inc.category] || inc.category}
              </span>
              {tierInfo && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              )}
              {inc.addedToFile && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary/10 text-secondary font-bold">
                  {t("onFile")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={12} aria-hidden="true" />
                {formatDate(inc.incidentDate)}
              </span>
              {inc.incidentTime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} aria-hidden="true" />
                  {inc.incidentTime}
                </span>
              )}
              {inc.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} aria-hidden="true" />
                  {PARENT_LOCATION_LABELS[inc.location] || inc.location.replace(/_/g, " ")}
                </span>
              )}
              {emotion && (
                <span className="flex items-center gap-1">
                  {emotion.emoji} {emotion.label}
                </span>
              )}
              <span className="flex items-center gap-1 font-medium text-foreground/70">
                {inc.childName}
              </span>
            </div>

            {inc.description && (
              <p className="text-sm text-foreground mt-2 line-clamp-2">{inc.description}</p>
            )}
          </div>
          <div className="mt-1 text-muted-foreground">
            {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
              {inc.description && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{t("schoolsSummary")}</p>
                  <p className="text-sm text-foreground leading-relaxed">{inc.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">{t("child")}</p>
                  <p className="text-sm font-bold mt-0.5">{inc.childName}</p>
                  {inc.childYearGroup && (
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.childYearGroup} &middot; {inc.childClassName}</p>
                  )}
                </div>
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">{t("dateAndTime")}</p>
                  <p className="text-sm font-bold mt-0.5">{formatDate(inc.incidentDate)}</p>
                  {inc.incidentTime && (
                    <p className="text-xs text-muted-foreground mt-0.5">{inc.incidentTime}</p>
                  )}
                </div>
                {inc.location && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">{t("where")}</p>
                    <p className="text-sm font-bold mt-0.5">{PARENT_LOCATION_LABELS[inc.location] || inc.location.replace(/_/g, " ")}</p>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">{t("type")}</p>
                  <p className="text-sm font-bold mt-0.5">{PARENT_CATEGORY_LABELS[inc.category] || inc.category}</p>
                </div>
                {emotion && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">{t("howTheyFelt")}</p>
                    <p className="text-sm font-bold mt-0.5">{emotion.emoji} {emotion.label}</p>
                  </div>
                )}
                <div className="bg-muted/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground font-medium">{t("currentStatus")}</p>
                  <p className="text-sm font-bold mt-0.5">{PARENT_STATUS_LABELS[inc.status] || inc.status}</p>
                </div>
              </div>

              {(inc.assessedBy || inc.assessedAt) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-3">
                  <UserCheck size={14} className="text-primary" aria-hidden="true" />
                  <span>
                    {t("reviewedBy", { name: inc.assessedBy || "Staff", date: inc.assessedAt ? formatDate(inc.assessedAt) : "" })}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <span>{t("reported")}: {formatDate(inc.createdAt)}</span>
                {inc.updatedAt && inc.updatedAt !== inc.createdAt && (
                  <span>&middot; {t("lastUpdated")}: {formatDate(inc.updatedAt)}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactPTACard() {
  const { t } = useTranslation("dashboard");
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sent, setSent] = useState(false);

  const { data: ptaContacts } = useQuery({
    queryKey: ["/api/parent/pta-contacts"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/parent/pta-contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/parent/pta-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, subject }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      setMessage("");
      setSubject("");
    },
  });

  if (!ptaContacts || ptaContacts.length === 0) return null;

  return (
    <Card className="border-role-pta/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-role-pta/15 rounded-xl flex items-center justify-center">
              <MessageCircle size={24} className="text-role-pta" />
            </div>
            <div>
              <h3 className="font-bold">{t("contactYourPta")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("ptaMemberCount", { count: ptaContacts.length })}: {ptaContacts.map((c: any) => c.name).join(", ")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsOpen(!isOpen); setSent(false); }}
            className="border-role-pta/40 text-role-pta hover:bg-role-pta/10"
          >
            <Send size={14} className="mr-1" />
            {isOpen ? t("common:close") : t("sendMessage")}
          </Button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {sent ? (
                <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/30 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-success mb-2" />
                  <p className="font-bold text-sm">{t("messageSent")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("messageSentPta")}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">{t("subjectOptional")}</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder={t("subjectPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-role-pta/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">{t("yourMessage")}</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={t("writeMessageToPta")}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-role-pta/40 resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => sendMutation.mutate()}
                      disabled={!message.trim() || sendMutation.isPending}
                      size="sm"
                      className="bg-role-pta hover:bg-role-pta/90"
                    >
                      <Send size={14} className="mr-1" />
                      {sendMutation.isPending ? t("common:sending") : t("sendToPta")}
                    </Button>
                  </div>
                  {sendMutation.isError && (
                    <p className="text-destructive text-xs">{t("failedToSend")}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function ParentDashboard({ user }: { user: any }) {
  const { t } = useTranslation("dashboard");
  const [periodDays, setPeriodDays] = useState(180);
  const { data: notificationsData } = useListNotifications();
  const notifications = notificationsData?.data || [];
  const unread = notifications.filter((n: any) => !n.acknowledgedAt);

  const PERIOD_OPTIONS = [
    { label: t("last30Days"), days: 30 },
    { label: t("last3Months"), days: 90 },
    { label: t("last6Months"), days: 180 },
    { label: t("allTime"), days: 9999 },
  ];

  const PARENT_STATUS_LABELS: Record<string, string> = {
    open: t("statusOpen"),
    submitted: t("parentStatusSubmitted"),
    investigating: t("parentStatusInvestigating"),
    closed: t("statusResolved"),
    escalated: t("statusEscalated"),
  };

  const PARENT_CATEGORY_LABELS: Record<string, string> = {
    verbal: t("parentCategoryVerbal"),
    physical: t("parentCategoryPhysical"),
    psychological: t("parentCategoryPsychological"),
    exclusion: t("parentCategoryExclusion"),
    online: t("parentCategoryOnline"),
    neglect: t("parentCategoryNeglect"),
    safeguarding: t("parentCategorySafeguarding"),
    relational: t("parentCategoryRelational"),
    sexual: t("parentCategorySexual"),
    "verbal,physical": t("parentCategoryVerbalPhysical"),
    "verbal,psychological": t("parentCategoryVerbalPsychological"),
  };

  const { data: parentData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/parent"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/dashboard/parent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  const { totalUnread: messageUnread } = useMessageNotifications();
  const childIds = parentData?.children?.map((c: any) => c.id) || [];
  const { data: childBehaviourData } = useQuery({
    queryKey: ["parent-children-behaviour", childIds],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const results: any[] = [];
      for (const id of childIds) {
        try {
          const res = await fetch(`/api/behaviour/pupil/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) results.push(await res.json());
        } catch {}
      }
      return results;
    },
    enabled: childIds.length > 0,
  });

  const queryClient = useQueryClient();
  const { data: disclosuresData } = useQuery({
    queryKey: ["/api/incidents/my-disclosures"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/incidents/my-disclosures", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const pendingDisclosures = (disclosuresData || []).filter((d: any) => !d.acknowledgedAt);

  const [ackDisclosureId, setAckDisclosureId] = useState<string | null>(null);
  const [ackResponse, setAckResponse] = useState("");
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ incidentId, disclosureId, response }: { incidentId: string; disclosureId: string; response?: string }) => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/incidents/${incidentId}/disclosure/${disclosureId}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response: response || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to acknowledge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/my-disclosures"] });
      setAckDisclosureId(null);
      setAckResponse("");
    },
  });

  const [showSchoolOverview, setShowSchoolOverview] = useState(false);
  const { data: schoolData } = useQuery({
    queryKey: ["/api/dashboard/school-overview"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/dashboard/school-overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load school overview");
      return res.json();
    },
    enabled: showSchoolOverview,
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const filteredIncidents = (parentData?.incidents || []).filter(
    (inc: any) => periodDays >= 9999 || inc.incidentDate >= cutoffStr
  );
  const filteredMonthly = (parentData?.monthlyTrend || []).filter(
    (m: any) => periodDays >= 9999 || m.month >= cutoffStr.substring(0, 7)
  );

  const filteredByCategory: Record<string, number> = {};
  const filteredByStatus: Record<string, number> = {};
  for (const inc of filteredIncidents) {
    const cats = (inc.category || "").split(",").map((c: string) => c.trim()).filter(Boolean);
    for (const cat of cats) {
      filteredByCategory[cat] = (filteredByCategory[cat] || 0) + 1;
    }
    filteredByStatus[inc.status] = (filteredByStatus[inc.status] || 0) + 1;
  }
  const categoryData = Object.entries(filteredByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name: PARENT_CATEGORY_LABELS[name] || name, count }));
  const statusData = Object.entries(filteredByStatus)
    .map(([name, count]) => ({ name: PARENT_STATUS_LABELS[name] || name, count }));

  const childrenList = parentData?.children || [];
  const childName = childrenList.length === 1
    ? `${childrenList[0].firstName} ${childrenList[0].lastName}`
    : childrenList.length > 1
    ? childrenList.map((c: any) => c.firstName).join(" & ")
    : t("yourChild");

  const digest: DigestItem[] = [];
  if (messageUnread > 0) {
    digest.push({
      id: "messages", icon: MessageCircle, tone: "info",
      title: t("newMessagesCount", { count: messageUnread, defaultValue: `${messageUnread} new messages` }),
      detail: t("fromSchool", { defaultValue: "From the school" }),
      href: "/messages", unread: true,
    });
  }
  for (const inc of filteredIncidents.slice(0, 2)) {
    digest.push({
      id: `inc-${inc.id}`, icon: FileText,
      tone: inc.status === "closed" || inc.status === "resolved" ? "info" : "warning",
      title: t("incidentUpdate", { defaultValue: "Incident update" }),
      detail: `${inc.referenceNumber} · ${inc.status}`,
      href: `/incidents/${inc.id}`,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto animate-pulse">
        <div>
          <div className="h-9 bg-muted rounded-lg w-64 mb-2" />
          <div className="h-5 bg-muted rounded w-56" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Parent"
        title={t("welcomeBack", { name: user.firstName })}
        subtitle={t("stayInformed", { child: childName })}
        action={
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setPeriodDays(opt.days)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  periodDays === opt.days
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <WhatsNewBand
        items={digest}
        heading={t("sinceLastHere", { defaultValue: "Since you were last here" })}
        emptyLabel={t("allCaughtUp", { defaultValue: "You're all caught up." })}
      />

      <MissionActions
        actions={[
          { label: "Raise a concern", sub: "Tell the school", icon: AlertTriangle, href: "/report" },
          { label: "Start or join a VOICE", sub: "A parent group with one ask: adopt VBE", icon: Vote, href: "/voice" },
          { label: "Message the school", sub: "Securely, any time", icon: MessageCircle, href: "/messages" },
          { label: "PTA updates", sub: "Stay in the loop", icon: Megaphone, href: "/pta-updates" },
          { label: "Resource Centre", sub: "Guides for parents", icon: Library, href: "/resources-hub" },
        ]}
      />

      {pendingDisclosures.length > 0 && (
        <div className="space-y-3">
          {pendingDisclosures.map((disc: any) => (
            <Card key={disc.id} className="border-warning/40 bg-warning/10">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-warning text-sm">{t("actionRequired")}</h3>
                    <p className="text-sm text-warning mt-1" dangerouslySetInnerHTML={{ __html: t("schoolSharedDetails", { ref: disc.referenceNumber }) }} />

                    {ackDisclosureId === disc.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={ackResponse}
                          onChange={(e) => setAckResponse(e.target.value)}
                          placeholder={t("addResponseOptional")}
                          maxLength={1000}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-warning/30 bg-white dark:bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-warning/40"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate({ incidentId: disc.incidentId, disclosureId: disc.id, response: ackResponse })}
                            disabled={acknowledgeMutation.isPending}
                            className="bg-warning hover:bg-warning/90 text-warning-foreground"
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            {acknowledgeMutation.isPending ? t("confirming") : t("confirmAcknowledgement")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setAckDisclosureId(null); setAckResponse(""); }}
                            className="text-muted-foreground"
                          >
                            {t("common:cancel")}
                          </Button>
                        </div>
                        {acknowledgeMutation.isError && (
                          <p className="text-xs text-destructive">{t("failedToAcknowledge")}</p>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setAckDisclosureId(disc.id)}
                        className="mt-2 bg-warning hover:bg-warning/90 text-warning-foreground"
                      >
                        <CheckCircle2 size={14} className="mr-1" />
                        {t("acknowledge")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <FileText className="mx-auto text-primary mb-2" size={28} aria-hidden="true" />
            <p className="text-3xl font-bold">{filteredIncidents.length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{t("totalReports")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <AlertTriangle className="mx-auto text-warning mb-2" size={28} aria-hidden="true" />
            <p className="text-3xl font-bold">{filteredIncidents.filter((i: any) => i.status !== "closed").length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{t("active")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Activity className="mx-auto text-success mb-2" size={28} aria-hidden="true" />
            <p className="text-3xl font-bold">{filteredIncidents.filter((i: any) => i.status === "closed").length}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{t("statusResolved")}</p>
          </CardContent>
        </Card>
        <Link href="/notifications">
          <Card className="hover:border-primary/30 transition-all cursor-pointer relative h-full">
            <CardContent className="p-5 text-center">
              <Bell className="mx-auto text-secondary mb-2" size={28} aria-hidden="true" />
              <p className="text-3xl font-bold">{unread.length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{t("unreadUpdates")}</p>
            </CardContent>
            {unread.length > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-destructive animate-pulse"></span>
            )}
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/report">
          <Card className="hover:border-primary/50 transition-all cursor-pointer group h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t("reportAConcern")}</h2>
                <p className="text-sm text-muted-foreground">{t("worriedAboutSomething")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        {parentData?.children?.map((child: any) => (
          <Card key={child.id}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary flex-shrink-0">
                <Users size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{child.firstName} {child.lastName}</h2>
                <p className="text-sm text-muted-foreground">
                  {child.yearGroup && `Year ${child.yearGroup}`}{child.className && ` \u00b7 ${child.className}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ContactPTACard />

      {childBehaviourData && childBehaviourData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Gauge size={20} className="text-primary" aria-hidden="true" />
            {t("behaviourStanding")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {childBehaviourData.map((child: any) => {
              const levelColors: Record<string, string> = {
                green: "from-green-500 to-emerald-600",
                yellow: "from-yellow-400 to-amber-500",
                orange: "from-orange-500 to-amber-600",
                red: "from-red-500 to-rose-600",
                darkred: "from-red-700 to-red-900",
                purple: "from-purple-600 to-violet-800",
                black: "from-gray-800 to-gray-950",
              };
              const bgGradient = levelColors[child.level.color] || levelColors.green;
              return (
                <Link key={child.pupil.id} href="/behaviour">
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className={`bg-gradient-to-r ${bgGradient} p-4 text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                            {child.pupil.firstName.charAt(0)}{child.pupil.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{child.pupil.firstName} {child.pupil.lastName}</p>
                            <p className="text-sm opacity-80">{child.level.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{child.totalPoints}</p>
                          <p className="text-xs opacity-80">{t("points")}</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{child.level.description}</span>
                        {child.pointsToNextLevel !== null && (
                          <span className="text-muted-foreground font-medium">
                            {t("toNextLevel", { count: child.pointsToNextLevel })}
                          </span>
                        )}
                      </div>
                      {child.nextLevel && child.pointsToNextLevel !== null && (
                        <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${bgGradient} rounded-full transition-all`}
                            style={{ width: `${Math.min(((child.totalPoints - (child.level.minPoints || 0)) / ((child.nextLevel.minPoints || 1) - (child.level.minPoints || 0))) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {filteredMonthly.length > 1 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp size={18} aria-hidden="true" /> {t("reportsOverTime")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={filteredMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(m: string) => {
                    const [y, mo] = m.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(m: string) => {
                    const [y, mo] = m.split("-");
                    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                    return `${months[parseInt(mo) - 1]} ${y}`;
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} name={t("totalReports")} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categoryData.length > 0 && (
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 size={18} aria-hidden="true" /> {t("typesOfReports")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} name={t("totalReports")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusData.length > 0 && (
          <Card>
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon size={18} aria-hidden="true" /> {t("reportStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="count" nameKey="name" label={({ name, count }) => `${name} (${count})`} labelLine={false}>
                    {statusData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={CHART_COLORS_PARENT[idx % CHART_COLORS_PARENT.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-primary/20">
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 size={18} aria-hidden="true" /> {t("schoolOverview")}
            </CardTitle>
            <Button
              variant={showSchoolOverview ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSchoolOverview(!showSchoolOverview)}
            >
              {showSchoolOverview ? t("hide") : t("viewSchoolAnalytics")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("schoolAnalyticsDesc")}
          </p>
        </CardHeader>
        <AnimatePresence>
          {showSchoolOverview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className="p-6 space-y-6">
                {!schoolData ? (
                  <div className="h-48 bg-muted animate-pulse rounded-xl" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{schoolData.totalIncidents}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{t("totalReports")}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold text-success">{schoolData.resolutionRate}%</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{t("resolutionRate")}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold text-secondary">{schoolData.totalPupils}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{t("pupilsEnrolled")}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold text-amber-600">{schoolData.resolvedCount}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{t("casesResolved")}</p>
                      </div>
                    </div>

                    {schoolData.monthlyTrend?.length > 1 && (
                      <div>
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <TrendingUp size={14} aria-hidden="true" /> {t("schoolWideTrend")}
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={schoolData.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 10 }}
                              tickFormatter={(m: string) => {
                                const [y, mo] = m.split("-");
                                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                                return `${months[parseInt(mo) - 1]}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip
                              labelFormatter={(m: string) => {
                                const [y, mo] = m.split("-");
                                const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                                return `${months[parseInt(mo) - 1]} ${y}`;
                              }}
                            />
                            <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} name={t("totalReports")} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {schoolData.byCategory?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <PieChartIcon size={14} aria-hidden="true" /> {t("reportTypes")}
                          </h3>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={schoolData.byCategory} layout="vertical" margin={{ left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} name={t("totalReports")} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {schoolData.topLocations?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <MapPin size={14} aria-hidden="true" /> {t("whereReportsHappen")}
                          </h3>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={schoolData.topLocations} layout="vertical" margin={{ left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} name={t("totalReports")} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {schoolData.byEscalationTier?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <Shield size={14} aria-hidden="true" /> {t("severityLevels")}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {schoolData.byEscalationTier.map((tier: any) => (
                            <div key={tier.name} className={`text-center p-3 rounded-xl ${
                              tier.name === "Level 3" ? "bg-destructive/10 text-destructive" :
                              tier.name === "Level 2" ? "bg-warning/15 text-warning" :
                              "bg-success/15 text-success"
                            }`}>
                              <p className="text-xl font-bold">{tier.count}</p>
                              <p className="text-xs font-medium mt-0.5">{tier.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={18} aria-hidden="true" /> {t("reportHistory")}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t("tapToSeeDetails")}</p>
        </CardHeader>
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">{t("noReportsForPeriod")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIncidents.map((inc: any) => (
                <ParentReportCard key={inc.id} inc={inc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {unread.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell size={18} aria-hidden="true" /> {t("recentUpdates")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {unread.slice(0, 5).map((n: any) => (
                <div key={n.id} className="p-4 rounded-xl border border-border bg-primary/5">
                  <p className="font-bold text-sm">{n.title || t("schoolNotification")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

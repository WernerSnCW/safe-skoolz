import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import {
  BarChart3, Users, TrendingUp, CheckCircle2,
  ArrowLeft, ArrowRight, Sparkles, Target, Plus, Trash2, Send, Shield, Eye,
  MessageSquare, MessageCircle, Database
} from "lucide-react";
import { Link } from "wouter";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from "recharts";

const GROUP_COLORS: Record<string, string> = {
  pupil: "#0d9488",
  staff: "#6366f1",
  parent: "#f59e0b",
};

const GROUP_LABELS: Record<string, string> = {
  pupil: "Pupils",
  staff: "Staff",
  parent: "Parents",
};

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

export default function DiagnosticsResults() {
  const { user } = useAuth();
  const [, params] = useRoute("/diagnostics/:id/results");
  const surveyId = params?.id;
  const isLeadership = user && ["coordinator", "head_teacher"].includes(user.role);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/diagnostics", surveyId, "results"],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/results`);
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
    enabled: !!surveyId && !!isLeadership,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/seed-demo`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to seed" }));
        throw new Error(err.error || "Failed to seed demo data");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics", surveyId, "results"] });
    },
  });

  if (!user) return null;

  if (!isLeadership) {
    return <PublicActionsView surveyId={surveyId} />;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-lg w-80" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
        </div>
        <div className="h-80 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Unable to load results</h2>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </div>
    );
  }

  const { survey, participation, categories, strengths, growthAreas, alignmentNotes, priorities, actions, totalResponses } = data;

  const radarData = categories
    .filter((c: any) => c.category !== "System Readiness")
    .map((c: any) => ({
      category: c.category.replace(" & ", "\n& "),
      shortName: c.category.split(" ")[0],
      ...c.averages,
    }));

  const barData = categories.map((c: any) => ({
    category: c.category.length > 18 ? c.category.substring(0, 16) + "..." : c.category,
    fullCategory: c.category,
    ...c.averages,
  }));

  const totalParticipants =
    participation.pupil.responded + participation.staff.responded + participation.parent.responded;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/diagnostics" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Diagnostics
          </Link>
          <h1 className="text-3xl font-display font-bold">{survey.title}</h1>
          <p className="text-muted-foreground mt-1">
            {survey.status === "active" ? "Live results — responses are still coming in" : `Closed ${survey.closedAt ? new Date(survey.closedAt).toLocaleDateString() : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="text-xs"
          >
            <Database size={14} className="mr-1.5" />
            {seedMutation.isPending ? "Seeding..." : "Load Demo Data"}
          </Button>
          {seedMutation.isError && (
            <span className="text-xs text-destructive">{(seedMutation.error as Error).message}</span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
            <Eye size={14} />
            Confidential — coordinator view only
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["pupil", "staff", "parent"] as const).map(group => {
          const p = participation[group];
          const pct = p.total > 0 ? Math.round((p.responded / p.total) * 100) : 0;
          return (
            <Card key={group}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GROUP_COLORS[group]}20` }}>
                    <Users size={20} style={{ color: GROUP_COLORS[group] }} />
                  </div>
                  <div>
                    <p className="font-bold">{GROUP_LABELS[group]}</p>
                    <p className="text-xs text-muted-foreground">{p.responded} / {p.total} responded</p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: GROUP_COLORS[group] }}
                  />
                </div>
                <p className="text-right text-xs font-bold mt-1" style={{ color: GROUP_COLORS[group] }}>{pct}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalParticipants === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Waiting for responses</h2>
            <p className="text-muted-foreground">
              No one has completed the diagnostic yet. Share the link with your school community.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Database size={16} className="mr-2" />
              {seedMutation.isPending ? "Seeding..." : "Load Demo Data"}
            </Button>
            {seedMutation.isError && (
              <p className="text-sm text-destructive mt-2">{(seedMutation.error as Error).message}</p>
            )}
            {seedMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-2">Demo data loaded — refreshing results...</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {strengths && strengths.length > 0 && (
            <Card className="border-green-200 dark:border-green-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={20} className="text-green-500" />
                  Strengths
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Areas where the school community is well aligned and scoring well.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30">
                      <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {growthAreas && growthAreas.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} className="text-blue-500" />
                  Growth Areas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Categories with the most potential for positive development.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {growthAreas.map((g: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
                      <TrendingUp size={16} className="text-blue-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{g}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {alignmentNotes && alignmentNotes.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={20} className="text-amber-500" />
                  Alignment Notes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Where different groups see things differently — opportunities for dialogue.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alignmentNotes.map((n: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                      <MessageSquare size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{n}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {priorities && priorities.length > 0 && (
            <Card className="border-violet-200 dark:border-violet-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} className="text-violet-500" />
                  Priorities & KPIs
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Categories ranked by urgency. Each includes recommended KPIs and actions linked to what the diagnostic found.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {priorities.map((p: any) => {
                  const urgencyStyles: Record<string, { bg: string; text: string; badge: string; label: string }> = {
                    critical: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-800 dark:text-red-300", badge: "bg-red-500 text-white", label: "Critical" },
                    high: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-800 dark:text-amber-300", badge: "bg-amber-500 text-white", label: "High Priority" },
                    moderate: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-800 dark:text-blue-300", badge: "bg-blue-500 text-white", label: "Moderate" },
                    monitor: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-800 dark:text-green-300", badge: "bg-green-600 text-white", label: "Strength" },
                  };
                  const style = urgencyStyles[p.urgency] || urgencyStyles.moderate;
                  return (
                    <details key={p.category} className={`rounded-xl border border-border overflow-hidden ${style.bg}`} open={p.urgency === "critical" || p.urgency === "high"}>
                      <summary className="px-5 py-4 cursor-pointer select-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{p.rank}</span>
                          <div>
                            <span className="font-bold text-sm">{p.category}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({p.overallAvg}/5)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.perceptionGap !== null && p.perceptionGap >= 1.0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {p.perceptionGap}pt gap
                            </span>
                          )}
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                      </summary>
                      <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
                        <p className={`text-sm ${style.text}`}>{p.rationale}</p>

                        {p.kpis && p.kpis.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recommended KPIs</h4>
                            <div className="space-y-2">
                              {p.kpis.map((kpi: any, ki: number) => (
                                <div key={ki} className="bg-white dark:bg-card rounded-lg border border-border p-3">
                                  <p className="text-sm font-medium">{kpi.metric}</p>
                                  <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-muted-foreground">
                                    <span><strong>Baseline:</strong> {kpi.baseline}</span>
                                    <span><strong>Target:</strong> {kpi.target}</span>
                                    <span><strong>By:</strong> {kpi.timeframe}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {p.suggestedActions && p.suggestedActions.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Suggested Actions</h4>
                            <ul className="space-y-1.5">
                              {p.suggestedActions.map((a: string, ai: number) => (
                                <li key={ai} className="flex items-start gap-2 text-sm">
                                  <ArrowRight size={14} className="text-primary mt-0.5 shrink-0" />
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {radarData.length > 0 && radarData.some((d: any) => d.pupil || d.staff || d.parent) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  Alignment Overview
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How pupils, staff, and parents compare across safeguarding areas (1-5 scale).
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80" role="img" aria-label="Radar chart comparing pupil, staff, and parent scores">
                  <ResponsiveContainer>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                      {participation.pupil.responded > 0 && (
                        <Radar name="Pupils" dataKey="pupil" stroke={GROUP_COLORS.pupil} fill={GROUP_COLORS.pupil} fillOpacity={0.15} strokeWidth={2} />
                      )}
                      {participation.staff.responded > 0 && (
                        <Radar name="Staff" dataKey="staff" stroke={GROUP_COLORS.staff} fill={GROUP_COLORS.staff} fillOpacity={0.15} strokeWidth={2} />
                      )}
                      {participation.parent.responded > 0 && (
                        <Radar name="Parents" dataKey="parent" stroke={GROUP_COLORS.parent} fill={GROUP_COLORS.parent} fillOpacity={0.15} strokeWidth={2} />
                      )}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                Scores by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72" role="img" aria-label="Bar chart of average scores per category by group">
                <ResponsiveContainer>
                  <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                    {participation.pupil.responded > 0 && (
                      <Bar dataKey="pupil" name="Pupils" fill={GROUP_COLORS.pupil} radius={[0, 4, 4, 0]} />
                    )}
                    {participation.staff.responded > 0 && (
                      <Bar dataKey="staff" name="Staff" fill={GROUP_COLORS.staff} radius={[0, 4, 4, 0]} />
                    )}
                    {participation.parent.responded > 0 && (
                      <Bar dataKey="parent" name="Parents" fill={GROUP_COLORS.parent} radius={[0, 4, 4, 0]} />
                    )}
                    <Legend />
                    <Tooltip />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground py-2">
            Total responses recorded: {totalResponses}
          </div>
        </>
      )}

      <AgreedActionsPanel surveyId={surveyId!} existingActions={actions || []} categories={categories?.map((c: any) => c.category) || []} />
    </div>
  );
}

function AgreedActionsPanel({ surveyId, existingActions, categories }: {
  surveyId: string;
  existingActions: any[];
  categories: string[];
}) {
  const queryClient = useQueryClient();
  const [newAction, setNewAction] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOwner, setNewOwner] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: newAction,
          category: newCategory || null,
          owner: newOwner || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add action");
      return res.json();
    },
    onSuccess: () => {
      setNewAction("");
      setNewCategory("");
      setNewOwner("");
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics", surveyId, "results"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/actions/${actionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics", surveyId, "results"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/actions/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostics", surveyId, "results"] });
    },
  });

  const isPublished = existingActions.some(a => a.publishedAt);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target size={20} className="text-primary" />
          Agreed Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create the action plan here. Only published actions are shared with the wider school community — raw scores and charts stay confidential.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingActions.length > 0 && (
          <div className="space-y-2">
            {existingActions.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {a.category && <span>{a.category}</span>}
                    {a.owner && <span>Owner: {a.owner}</span>}
                    {a.publishedAt && (
                      <span className="text-green-600 dark:text-green-400 font-bold">Published</span>
                    )}
                  </div>
                </div>
                {!a.publishedAt && (
                  <button
                    onClick={() => deleteMutation.mutate(a.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Remove action"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isPublished && (
          <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Action</label>
              <input
                type="text"
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                placeholder="e.g. Run assembly on reporting channels for all year groups"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Category (optional)</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">General</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Owner (optional)</label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={e => setNewOwner(e.target.value)}
                  placeholder="e.g. DSL, SENCO, Head of Year"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newAction.trim() || addMutation.isPending}
              size="sm"
            >
              <Plus size={14} className="mr-1" />
              {addMutation.isPending ? "Adding..." : "Add Action"}
            </Button>
          </div>
        )}

        {existingActions.length > 0 && !isPublished && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div>
              <p className="text-sm font-bold">Ready to share with the school?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Publishing shares these actions with all staff, parents, and PTA. Raw scores and charts remain confidential.
              </p>
            </div>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              size="sm"
            >
              <Send size={14} className="mr-1" />
              {publishMutation.isPending ? "Publishing..." : "Publish Actions"}
            </Button>
          </div>
        )}

        {isPublished && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30">
            <CheckCircle2 size={16} />
            Actions published — the wider school community can now see these agreed actions.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PublicActionsView({ surveyId }: { surveyId: string | undefined }) {
  const { user } = useAuth();
  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ["/api/diagnostics", surveyId, "actions"],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/actions`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!surveyId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/diagnostics", surveyId, "summary"],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/diagnostics/${surveyId}/summary`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!surveyId,
  });

  if (actionsLoading || summaryLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-lg w-64" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  const CATEGORY_COLORS: Record<string, string> = {
    "Awareness & Prevalence": "#3b82f6",
    "Trust & Reporting": "#0d9488",
    "Culture & Wellbeing": "#22c55e",
    "Safeguarding Knowledge": "#8b5cf6",
    "System Readiness": "#f59e0b",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/diagnostics" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Diagnostics
        </Link>
        <h1 className="text-3xl font-display font-bold">Diagnostic Results</h1>
        <p className="text-muted-foreground mt-1">
          {summary?.survey?.title || actionsData?.surveyTitle || "School Onboarding Diagnostic"}
          {summary?.survey?.closedAt && ` — Closed ${new Date(summary.survey.closedAt).toLocaleDateString()}`}
        </p>
      </div>

      {summary && summary.categories?.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{summary.participation.total}</p>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-600">{summary.participation.pupil}</p>
                <p className="text-xs text-muted-foreground">Pupils</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{summary.participation.staff + summary.participation.parent}</p>
                <p className="text-xs text-muted-foreground">Staff & Parents</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                School Safeguarding Climate
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Combined scores across all respondent groups (1-5 scale)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.overallScores.map((s: any) => {
                  const pct = (s.overall / 5) * 100;
                  const color = CATEGORY_COLORS[s.category] || "#6b7280";
                  return (
                    <div key={s.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{s.category}</span>
                        <span className="text-sm font-bold" style={{ color }}>{s.overall}/5</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {summary.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Scores by Group
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How different groups scored each category
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={summary.categories.map((c: any) => ({
                    category: c.category.length > 16 ? c.category.substring(0, 14) + "..." : c.category,
                    ...c.averages,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="pupil" name="Pupils" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="staff" name="Staff" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="parent" name="Parents" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-teal-500" /><span className="text-xs text-muted-foreground">Pupils</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500" /><span className="text-xs text-muted-foreground">Staff</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500" /><span className="text-xs text-muted-foreground">Parents</span></div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!actionsData?.isPublished || !actionsData?.actions?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Agreed Actions coming soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The school leadership is reviewing the results and developing an action plan. You'll be able to see the agreed actions once they're published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} className="text-primary" />
                Agreed Actions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on the school diagnostic, these are the actions the school has committed to.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {actionsData.actions.map((a: any) => (
                  <li key={a.id} className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{a.action}</p>
                      {a.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {a.category}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {user?.role === "parent" && (
            <PTAContactPrompt />
          )}
        </>
      )}
    </div>
  );
}

function PTAContactPrompt() {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { data: ptaContacts } = useQuery({
    queryKey: ["/api/parent/pta-contacts"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/parent/pta-contacts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/parent/pta-message", {
        method: "POST",
        body: JSON.stringify({
          message,
          subject: "Question about diagnostic actions",
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      setMessage("");
    },
  });

  if (!ptaContacts || ptaContacts.length === 0) return null;

  return (
    <Card className="border-purple-200 dark:border-purple-900/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/30 rounded-xl flex items-center justify-center">
              <MessageCircle size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Have questions about these actions?</p>
              <p className="text-xs text-muted-foreground">
                Reach out to your PTA: {ptaContacts.map((c: any) => c.name).join(", ")}
              </p>
            </div>
          </div>
          {!sent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="border-purple-300 text-purple-700 dark:text-purple-400"
            >
              <Send size={14} className="mr-1" />
              {showForm ? "Close" : "Message PTA"}
            </Button>
          )}
        </div>

        {sent && (
          <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <p className="text-sm font-medium">Message sent to your PTA representatives.</p>
          </div>
        )}

        {showForm && !sent && (
          <div className="mt-3 space-y-2">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your question or comment about the agreed actions..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!message.trim() || sendMutation.isPending}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send size={14} className="mr-1" />
                {sendMutation.isPending ? "Sending..." : "Send to PTA"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

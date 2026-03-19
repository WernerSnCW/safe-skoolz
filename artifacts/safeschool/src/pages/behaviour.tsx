import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Shield, TrendingUp, Users, Plus, Search,
  ChevronRight, ArrowUp, Calendar, Target, Gauge
} from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  red: "bg-red-100 text-red-800 border-red-300",
  darkred: "bg-red-200 text-red-900 border-red-400",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  black: "bg-gray-900 text-white border-gray-700",
};

const LEVEL_BG: Record<string, string> = {
  green: "from-green-500 to-emerald-600",
  yellow: "from-yellow-400 to-amber-500",
  orange: "from-orange-500 to-amber-600",
  red: "from-red-500 to-rose-600",
  darkred: "from-red-700 to-red-900",
  purple: "from-purple-600 to-violet-800",
  black: "from-gray-800 to-gray-950",
};

function getToken() {
  return localStorage.getItem("safeschool_token") || "";
}

function LevelGauge({ level, totalPoints, nextLevel, pointsToNext }: {
  level: any; totalPoints: number; nextLevel: any; pointsToNext: number | null;
}) {
  const maxDisplayPoints = nextLevel ? level.minPoints + (nextLevel.minPoints - level.minPoints) : totalPoints + 5;
  const progress = nextLevel
    ? ((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
    : 100;

  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${LEVEL_BG[level.color] || LEVEL_BG.green} p-6 text-white`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gauge size={28} />
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">Current Level</p>
              <h3 className="text-2xl font-display font-bold">{level.name}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{totalPoints}</p>
            <p className="text-sm opacity-80">points total</p>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-2">{level.description}</p>
      </div>
      <CardContent className="p-4">
        {nextLevel && pointsToNext !== null ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{level.name}</span>
              <span>{nextLevel.name} ({pointsToNext} more point{pointsToNext !== 1 ? "s" : ""})</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${LEVEL_BG[level.color] || LEVEL_BG.green} rounded-full transition-all duration-700`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Maximum escalation level reached.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LevelLadder({ currentLevel }: { currentLevel: number }) {
  const { data: config } = useQuery({
    queryKey: ["behaviour-levels"],
    queryFn: async () => {
      const res = await fetch("/api/behaviour/levels");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (!config) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target size={16} /> Escalation Ladder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {config.levels.map((lvl: any) => {
            const isCurrent = lvl.level === currentLevel;
            const isPast = lvl.level < currentLevel;
            return (
              <div
                key={lvl.level}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? `${LEVEL_COLORS[lvl.color]} border-2 font-bold shadow-sm`
                    : isPast
                    ? "border-border bg-muted/30 text-muted-foreground"
                    : "border-border/50 text-muted-foreground/60"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent ? "bg-current/10" : "bg-muted"
                }`}>
                  {lvl.level}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lvl.name}</p>
                  <p className="text-[10px] text-muted-foreground">{lvl.minPoints}–{lvl.maxPoints === Infinity ? "∞" : lvl.maxPoints} pts</p>
                </div>
                {isCurrent && (
                  <Badge variant="default" className="text-[10px]">YOU ARE HERE</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PointHistory({ history }: { history: any[] }) {
  if (history.length === 0) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Shield size={32} className="mx-auto mb-2 text-green-500" />
        <p className="font-medium">No behaviour points recorded</p>
        <p className="text-sm">A clean record — well done!</p>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar size={16} /> Point History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry: any) => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/10">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                +{entry.points}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{entry.reason}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>
                  {entry.issuedBy && <span className="text-[10px] text-muted-foreground">by {entry.issuedBy}</span>}
                </div>
                {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {new Date(entry.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddPointsForm({ pupilId, pupilName, onClose }: { pupilId: string; pupilName: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [points, setPoints] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const { data: config } = useQuery({
    queryKey: ["behaviour-levels"],
    queryFn: async () => {
      const res = await fetch("/api/behaviour/levels");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/behaviour/points", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ pupilId, points, reason, category, note: note.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points recorded",
        description: `${points} point${points > 1 ? "s" : ""} added. ${pupilName} is now at Level ${data.level.level}: ${data.level.name} (${data.totalPoints} total points).`,
      });
      queryClient.invalidateQueries({ queryKey: ["behaviour-pupil", pupilId] });
      queryClient.invalidateQueries({ queryKey: ["behaviour-summary"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const catConfig = config?.categories?.find((c: any) => c.id === cat);
    if (catConfig) {
      setPoints(catConfig.defaultPoints);
      setReason(catConfig.label);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {(config?.categories || []).map((cat: any) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm border-2 transition-all ${
                category === cat.id
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span className="block">{cat.label}</span>
              <span className="text-[10px] text-muted-foreground">{cat.defaultPoints} pt{cat.defaultPoints > 1 ? "s" : ""} default</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Points (1–10)</label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setPoints(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                points === v
                  ? v <= 2 ? "bg-yellow-100 border-yellow-500 text-yellow-800"
                    : v <= 5 ? "bg-orange-100 border-orange-500 text-orange-800"
                    : "bg-red-100 border-red-500 text-red-800"
                  : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Brief description of the behaviour..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Additional note (optional)</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any context or follow-up needed..."
          rows={2}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!category || !reason || mutation.isPending}>
          {mutation.isPending ? "Saving..." : `Add ${points} Point${points > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}

function PupilBehaviourView({ pupilId, showIssuePts }: { pupilId: string; showIssuePts: boolean }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["behaviour-pupil", pupilId],
    queryFn: async () => {
      const res = await fetch(`/api/behaviour/pupil/${pupilId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-destructive text-center py-8">Failed to load behaviour record.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{data.pupil.firstName} {data.pupil.lastName}</h2>
          <p className="text-sm text-muted-foreground">{data.pupil.yearGroup} · {data.pupil.className}</p>
        </div>
        {showIssuePts && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Plus size={14} className="mr-1" /> Issue Points
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Issue Behaviour Points — {data.pupil.firstName}</DialogTitle>
              </DialogHeader>
              <AddPointsForm pupilId={pupilId} pupilName={data.pupil.firstName} onClose={() => setAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <LevelGauge
        level={data.level}
        totalPoints={data.totalPoints}
        nextLevel={data.nextLevel}
        pointsToNext={data.pointsToNextLevel}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PointHistory history={data.history} />
        </div>
        <div>
          <LevelLadder currentLevel={data.level.level} />
        </div>
      </div>
    </div>
  );
}

function StaffBehaviourOverview() {
  const [selectedPupilId, setSelectedPupilId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["behaviour-summary"],
    queryFn: async () => {
      const res = await fetch("/api/behaviour/summary", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: allPupils } = useQuery({
    queryKey: ["all-pupils-for-behaviour"],
    queryFn: async () => {
      const res = await fetch("/api/my-pupils", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const pupils: any[] = [];
      for (const cls of Object.values(data.classes) as any[]) {
        for (const p of cls) pupils.push(p);
      }
      return pupils;
    },
  });

  if (selectedPupilId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPupilId(null)}>
          ← Back to overview
        </Button>
        <PupilBehaviourView pupilId={selectedPupilId} showIssuePts={true} />
      </div>
    );
  }

  const filteredSummary = (summary || []).filter((s: any) => {
    if (!search) return true;
    const n = `${s.pupil?.firstName} ${s.pupil?.lastName}`.toLowerCase();
    return n.includes(search.toLowerCase());
  });

  const pupilsWithNoPoints = (allPupils || []).filter(
    (p: any) => !(summary || []).some((s: any) => s.pupilId === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <AlertTriangle className="text-primary" size={28} />
            Behaviour Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track behaviour points and see where each pupil stands on the escalation ladder
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Plus size={16} className="mr-2" /> Issue Points
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Issue Behaviour Points</DialogTitle>
            </DialogHeader>
            <QuickIssuePicker onSelect={(pupilId, pupilName) => {
              setAddDialogOpen(false);
              setSelectedPupilId(pupilId);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search pupils..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filteredSummary.length === 0 && !search ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Shield size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">No behaviour points issued yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                All pupils are in good standing. Use "Issue Points" when you need to record a behaviour event.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSummary.map((entry: any) => (
            <button
              key={entry.pupilId}
              onClick={() => setSelectedPupilId(entry.pupilId)}
              className="w-full text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {entry.pupil?.firstName?.charAt(0)}{entry.pupil?.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{entry.pupil?.firstName} {entry.pupil?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{entry.pupil?.className || entry.pupil?.yearGroup}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${LEVEL_COLORS[entry.level.color]} border text-xs`}>
                      {entry.level.name}
                    </Badge>
                    <span className="text-sm font-bold text-muted-foreground">{entry.totalPoints} pts</span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}

          {pupilsWithNoPoints.length > 0 && !search && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Shield size={14} className="text-green-500" />
                Good Standing ({pupilsWithNoPoints.length} pupils with no points)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {pupilsWithNoPoints.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPupilId(p.id)}
                    className="text-left p-3 rounded-lg border border-border/50 bg-green-50/50 hover:bg-green-50 transition-colors"
                  >
                    <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.className}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickIssuePicker({ onSelect }: { onSelect: (pupilId: string, name: string) => void }) {
  const [search, setSearch] = useState("");

  const { data: allPupils, isLoading } = useQuery({
    queryKey: ["all-pupils-for-behaviour"],
    queryFn: async () => {
      const res = await fetch("/api/my-pupils", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const pupils: any[] = [];
      for (const cls of Object.values(data.classes) as any[]) {
        for (const p of cls) pupils.push(p);
      }
      return pupils;
    },
  });

  const filtered = (allPupils || []).filter((p: any) => {
    if (!search) return true;
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select a pupil to issue behaviour points:</p>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search pupil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-center text-muted-foreground py-4">Loading...</p>
      ) : (
        <div className="max-h-52 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id, `${p.firstName} ${p.lastName}`)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex justify-between"
            >
              <span className="font-medium">{p.firstName} {p.lastName}</span>
              <span className="text-xs text-muted-foreground">{p.className}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PupilOwnView() {
  const { data, isLoading } = useQuery({
    queryKey: ["behaviour-my-record"],
    queryFn: async () => {
      const res = await fetch("/api/behaviour/my-record", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-destructive text-center py-8">Could not load your record.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <Gauge className="text-primary" size={28} />
          My Behaviour Record
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          See where you stand and what you can work on
        </p>
      </div>

      <LevelGauge
        level={data.level}
        totalPoints={data.totalPoints}
        nextLevel={data.nextLevel}
        pointsToNext={data.pointsToNextLevel}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PointHistory history={data.recentHistory} />
        </div>
        <div>
          <LevelLadder currentLevel={data.level.level} />
        </div>
      </div>
    </div>
  );
}

function ParentView() {
  const { user } = useAuth();

  const { data: parentUser } = useQuery({
    queryKey: ["parent-user-for-behaviour"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.user;
    },
  });

  const childIds = parentUser?.parentOf || [];

  if (childIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Behaviour Record</h1>
        <p className="text-muted-foreground">No children linked to your account.</p>
      </div>
    );
  }

  if (childIds.length === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Gauge className="text-primary" size={28} />
            Behaviour Record
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your child's behaviour standing at school</p>
        </div>
        <PupilBehaviourView pupilId={childIds[0]} showIssuePts={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
          <Gauge className="text-primary" size={28} />
          Behaviour Records
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your children's behaviour standing at school</p>
      </div>
      {childIds.map((id: string) => (
        <PupilBehaviourView key={id} pupilId={id} showIssuePts={false} />
      ))}
    </div>
  );
}

export default function BehaviourPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "pupil") return <PupilOwnView />;
  if (user.role === "parent") return <ParentView />;
  return <StaffBehaviourOverview />;
}

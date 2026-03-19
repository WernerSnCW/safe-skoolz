import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, UserPlus, TrendingUp, Heart, BookOpen,
  Users, ChevronDown, ChevronUp, X, Plus, Smile, Meh, Frown,
  ThumbsUp, ThumbsDown, Minus, Calendar, FileText
} from "lucide-react";

const RATING_LABELS: Record<number, string> = { 1: "Struggling", 2: "Some concerns", 3: "Getting there", 4: "Good", 5: "Excellent" };
const FEELING_ICONS = [
  { value: 1, icon: Frown, label: "Very unhappy", color: "text-red-500" },
  { value: 2, icon: Frown, label: "Unhappy", color: "text-orange-500" },
  { value: 3, icon: Meh, label: "OK", color: "text-yellow-500" },
  { value: 4, icon: Smile, label: "Happy", color: "text-lime-500" },
  { value: 5, icon: Smile, label: "Very happy", color: "text-green-500" },
];
const ATTITUDE_ICONS = [
  { value: 1, icon: ThumbsDown, label: "Very negative", color: "text-red-500" },
  { value: 2, icon: ThumbsDown, label: "Negative", color: "text-orange-500" },
  { value: 3, icon: Minus, label: "Neutral", color: "text-yellow-500" },
  { value: 4, icon: ThumbsUp, label: "Positive", color: "text-lime-500" },
  { value: 5, icon: ThumbsUp, label: "Very positive", color: "text-green-500" },
];

function getToken() {
  return localStorage.getItem("safeschool_token") || "";
}

function RatingSelector({ label, value, onChange, icons }: {
  label: string; value: number | null; onChange: (v: number) => void;
  icons: Array<{ value: number; icon: any; label: string; color: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        {icons.map((item) => {
          const Icon = item.icon;
          const selected = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border-2 ${
                selected
                  ? `${item.color} border-current bg-current/10 scale-110`
                  : "border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground"
              }`}
              title={item.label}
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProgressSlider({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Progress</label>
      <div className="flex gap-2 items-center">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
              value === v
                ? v <= 2 ? "bg-red-500/10 border-red-500 text-red-700"
                  : v === 3 ? "bg-yellow-500/10 border-yellow-500 text-yellow-700"
                  : "bg-green-500/10 border-green-500 text-green-700"
                : "border-muted hover:border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {value && <p className="text-xs text-muted-foreground text-center">{RATING_LABELS[value]}</p>}
    </div>
  );
}

function TrackingHistory({ caseloadId }: { caseloadId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["senco-tracking", caseloadId],
    queryFn: async () => {
      const res = await fetch(`/api/senco/caseload/${caseloadId}/tracking`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-2">Loading history...</p>;
  if (!history || history.length === 0) return <p className="text-sm text-muted-foreground py-2">No tracking entries yet. Add the first one above.</p>;

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2"><Calendar size={14} /> Tracking History</h4>
      {history.map((entry: any) => (
        <div key={entry.id} className="border border-border rounded-xl p-3 bg-muted/20 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {new Date(entry.recordedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {entry.progressRating && (
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-blue-500" />
                <span>Progress: <strong>{RATING_LABELS[entry.progressRating]}</strong></span>
              </div>
            )}
            {entry.feelingsRating && (
              <div className="flex items-center gap-1.5">
                <Heart size={12} className="text-pink-500" />
                <span>Feelings: <strong>{FEELING_ICONS[entry.feelingsRating - 1]?.label}</strong></span>
              </div>
            )}
            {entry.attitudeToLearning && (
              <div className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-indigo-500" />
                <span>Learning: <strong>{ATTITUDE_ICONS[entry.attitudeToLearning - 1]?.label}</strong></span>
              </div>
            )}
            {entry.attitudeToOthers && (
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-teal-500" />
                <span>With Others: <strong>{ATTITUDE_ICONS[entry.attitudeToOthers - 1]?.label}</strong></span>
              </div>
            )}
          </div>
          {entry.notes && (
            <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">{entry.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AddTrackingForm({ caseloadId, onSuccess }: { caseloadId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const [feelings, setFeelings] = useState<number | null>(null);
  const [learning, setLearning] = useState<number | null>(null);
  const [others, setOthers] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/senco/caseload/${caseloadId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          progressRating: progress,
          feelingsRating: feelings,
          attitudeToLearning: learning,
          attitudeToOthers: others,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tracking saved", description: "Your observation has been recorded." });
      queryClient.invalidateQueries({ queryKey: ["senco-tracking", caseloadId] });
      queryClient.invalidateQueries({ queryKey: ["senco-caseload"] });
      setProgress(null); setFeelings(null); setLearning(null); setOthers(null); setNotes("");
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save tracking entry.", variant: "destructive" });
    },
  });

  const hasAnyRating = progress || feelings || learning || others;

  return (
    <div className="space-y-4">
      <ProgressSlider value={progress} onChange={setProgress} />
      <RatingSelector label="How are they feeling?" value={feelings} onChange={setFeelings} icons={FEELING_ICONS} />
      <RatingSelector label="Attitude to learning" value={learning} onChange={setLearning} icons={ATTITUDE_ICONS} />
      <RatingSelector label="Attitude to others" value={others} onChange={setOthers} icons={ATTITUDE_ICONS} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations, actions taken, or next steps..."
          rows={3}
        />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !hasAnyRating} className="w-full">
        {mutation.isPending ? "Saving..." : "Save Observation"}
      </Button>
    </div>
  );
}

function PupilCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/senco/caseload/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Removed", description: `${entry.pupil?.firstName} removed from your caseload.` });
      queryClient.invalidateQueries({ queryKey: ["senco-caseload"] });
    },
  });

  const pupil = entry.pupil;
  const latest = entry.latestTracking;

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {pupil?.firstName?.charAt(0)}{pupil?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{pupil?.firstName} {pupil?.lastName}</p>
            <p className="text-xs text-muted-foreground">{pupil?.className || pupil?.yearGroup || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latest ? (
            <div className="flex items-center gap-1.5">
              {latest.feelingsRating && (() => {
                const fi = FEELING_ICONS[latest.feelingsRating - 1];
                const Icon = fi.icon;
                return <Icon size={16} className={fi.color} />;
              })()}
              {latest.progressRating && (
                <Badge variant={latest.progressRating >= 4 ? "default" : latest.progressRating >= 3 ? "secondary" : "destructive"} className="text-[10px]">
                  {RATING_LABELS[latest.progressRating]}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px]">No entries yet</Badge>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <CardContent className="border-t border-border/50 pt-4 space-y-4">
          {entry.reason && (
            <div className="text-xs bg-muted/30 rounded-lg p-3">
              <span className="font-medium">Reason added:</span> {entry.reason}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant={showAddForm ? "secondary" : "default"} onClick={() => setShowAddForm(!showAddForm)} className="flex-1">
              <Plus size={14} className="mr-1" /> {showAddForm ? "Hide Form" : "Add Observation"}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeMutation.mutate()}>
              <X size={14} className="mr-1" /> Remove
            </Button>
          </div>

          {showAddForm && <AddTrackingForm caseloadId={entry.id} onSuccess={() => setShowAddForm(false)} />}

          <TrackingHistory caseloadId={entry.id} />
        </CardContent>
      )}
    </Card>
  );
}

function AddPupilModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPupil, setSelectedPupil] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");

  const { data: pupils, isLoading } = useQuery({
    queryKey: ["senco-available-pupils"],
    queryFn: async () => {
      const res = await fetch("/api/senco/pupils-available", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/senco/caseload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ pupilId: selectedPupil, reason: reason.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pupil added", description: "They've been added to your caseload." });
      queryClient.invalidateQueries({ queryKey: ["senco-caseload"] });
      queryClient.invalidateQueries({ queryKey: ["senco-available-pupils"] });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (pupils || []).filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || (p.className || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search pupils by name or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading pupils...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No available pupils found.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
          {filtered.map((p: any) => (
            <button
              key={p.id}
              onClick={() => setSelectedPupil(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                selectedPupil === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="font-medium">{p.firstName} {p.lastName}</span>
              <span className={`text-xs ${selectedPupil === p.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {p.className || p.yearGroup || ""}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason for support (optional)</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Emotional regulation support, bullying concerns..."
          rows={2}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => addMutation.mutate()} disabled={!selectedPupil || addMutation.isPending}>
          {addMutation.isPending ? "Adding..." : "Add to Caseload"}
        </Button>
      </div>
    </div>
  );
}

export default function CaseloadPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: caseload, isLoading } = useQuery({
    queryKey: ["senco-caseload"],
    queryFn: async () => {
      const res = await fetch("/api/senco/caseload", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to load caseload");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <ClipboardList className="text-primary" size={28} />
            My Caseload
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track the pupils you're supporting — their progress, feelings, and attitudes
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus size={16} className="mr-2" /> Add Pupil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add a Pupil to Your Caseload</DialogTitle>
            </DialogHeader>
            <AddPupilModal onClose={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !caseload || caseload.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ClipboardList size={32} className="text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">No pupils on your caseload yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add the pupils you're supporting to start tracking their progress.
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus size={16} className="mr-2" /> Add Your First Pupil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users size={12} className="mr-1" /> {caseload.length} pupil{caseload.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {caseload.map((entry: any) => (
            <PupilCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

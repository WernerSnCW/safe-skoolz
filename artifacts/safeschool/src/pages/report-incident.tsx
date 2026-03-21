import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCreateIncident } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, Button, Input, Label } from "@/components/ui-polished";
import { AlertTriangle, CheckCircle2, ShieldCheck, Info, Search, X, UserPlus, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOTIONS = [
  { id: "scared", emoji: "😨", label: "Scared" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😠", label: "Angry" },
  { id: "worried", emoji: "😟", label: "Worried" },
  { id: "confused", emoji: "😕", label: "Confused" },
  { id: "okay", emoji: "😐", label: "Okay" }
];

const CATEGORIES: { id: string; label: string; pupilLabel: string; hint: string; staffHint: string }[] = [
  {
    id: "physical",
    label: "Physical",
    pupilLabel: "Physical",
    hint: "Hitting, pushing, kicking, throwing things at someone, or hurting someone\u2019s body.",
    staffHint: "Physical aggression: hitting, pushing, kicking, throwing objects, or any deliberate physical harm."
  },
  {
    id: "verbal",
    label: "Verbal",
    pupilLabel: "Verbal",
    hint: "Name-calling, shouting, saying mean or hurtful things to someone.",
    staffHint: "Verbal abuse: name-calling, insults, shouting, or persistent derogatory language directed at a pupil."
  },
  {
    id: "psychological",
    label: "Psychological",
    pupilLabel: "Mind games",
    hint: "Making someone feel scared, worthless, or confused on purpose \u2014 like threatening, ignoring, or playing mind games.",
    staffHint: "Psychological harm: intimidation, threats, deliberate exclusion, manipulation, or sustained behaviour causing emotional distress."
  },
  {
    id: "sexual",
    label: "Sexual",
    pupilLabel: "My body, my rules",
    hint: "Someone touched you in a way you didn\u2019t like, showed you something that made you uncomfortable, or asked you to do something that didn\u2019t feel right. Your body belongs to you.",
    staffHint: "Sexual misconduct: inappropriate touching, exposure, sexual language, sharing indecent images, or any conduct of a sexual nature involving a minor."
  },
  {
    id: "relational",
    label: "Relational",
    pupilLabel: "Leaving out",
    hint: "Deliberately leaving someone out, spreading rumours, or turning friends against someone.",
    staffHint: "Relational aggression: deliberate social exclusion, rumour-spreading, or orchestrated peer rejection."
  },
  {
    id: "coercive",
    label: "Coercive",
    pupilLabel: "Pressure / control",
    hint: "Forcing or pressuring someone to do things they don\u2019t want to, controlling who they can talk to, or making threats.",
    staffHint: "Coercive control: forcing or pressuring a pupil into actions against their will, controlling social contacts, or persistent threats."
  },
  {
    id: "property",
    label: "Property",
    pupilLabel: "Property",
    hint: "Breaking, stealing, hiding or damaging someone\u2019s belongings on purpose.",
    staffHint: "Property damage/theft: deliberate destruction, theft, or concealment of a pupil\u2019s belongings."
  },
  {
    id: "online",
    label: "Online",
    pupilLabel: "Online",
    hint: "Cyberbullying, mean messages, sharing private photos, or being cruel on social media or chat.",
    staffHint: "Online/cyber: cyberbullying, abusive messages, non-consensual image sharing, or harassment via digital platforms."
  }
];

const SCHOOL_LOCATIONS = [
  "Playground",
  "Forest",
  "Stage / Amphitheatre",
  "Tires",
  "Play Park",
  "Year 6 Block",
  "Cafeteria / Buffet",
  "Picnic Area",
  "Eating Caravan",
  "Classroom",
  "Corridor",
  "Toilets",
  "Sports Hall / Gym",
  "Library",
  "Reception Area",
  "Car Park / Drop-off",
  "Online",
  "Outside School",
];

const YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

interface UnknownPersonDesc {
  gender: string;
  yearGroup: string;
  className: string;
  known: boolean;
  ageRelation: string;
  staffOrPupil: string;
  physicalDescription: string;
  friendsWith: string;
  whereSeenThem: string;
  howMany: number;
}

const emptyDesc = (): UnknownPersonDesc => ({
  gender: "",
  yearGroup: "",
  className: "",
  known: false,
  ageRelation: "",
  staffOrPupil: "pupil",
  physicalDescription: "",
  friendsWith: "",
  whereSeenThem: "",
  howMany: 1,
});

interface PupilResult {
  id: string;
  firstName: string;
  lastName: string;
  yearGroup?: string;
  className?: string;
}

function PupilSearchPicker({
  label,
  selectedIds,
  onSelect,
  onRemove,
  isPupil,
  childFriendlyLabel,
}: {
  label: string;
  selectedIds: PupilResult[];
  onSelect: (p: PupilResult) => void;
  onRemove: (id: string) => void;
  isPupil: boolean;
  childFriendlyLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PupilResult[]>([]);
  const [allPupils, setAllPupils] = useState<PupilResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  const fetchPupils = async (searchQuery: string) => {
    const fetchId = ++fetchIdRef.current;
    setIsSearching(true);
    try {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/pupils/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok && fetchId === fetchIdRef.current) {
        const data = await res.json();
        if (isPupil && searchQuery === "") {
          setAllPupils(data);
          setAllLoaded(true);
        }
        setResults(data.filter((p: PupilResult) => !selectedIds.some(s => s.id === p.id)));
      }
    } catch {}
    if (fetchId === fetchIdRef.current) setIsSearching(false);
  };

  useEffect(() => {
    if (isPupil && allLoaded) {
      const filtered = query.trim()
        ? allPupils.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.toLowerCase())
          )
        : allPupils;
      setResults(filtered.filter(p => !selectedIds.some(s => s.id === p.id)));
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPupils(query), query.length > 0 ? 250 : 0);
  }, [query, selectedIds, allLoaded]);

  useEffect(() => {
    if (isPupil && !allLoaded) {
      fetchPupils("");
    }
  }, [isPupil]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableForSelect = allPupils.filter(p => !selectedIds.some(s => s.id === p.id));

  return (
    <div ref={containerRef}>
      <Label className="text-sm">{isPupil ? childFriendlyLabel : label}</Label>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-2">
          {selectedIds.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium">
              {p.firstName} {p.lastName}
              {p.className && <span className="text-xs text-muted-foreground">({p.className})</span>}
              <button type="button" onClick={() => onRemove(p.id)} className="ml-1 hover:text-destructive">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      {isPupil ? (
        <div className="mt-1">
          <select
            value=""
            onChange={(e) => {
              const picked = allPupils.find(p => p.id === e.target.value);
              if (picked) { onSelect(picked); }
            }}
            className="w-full h-10 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer appearance-auto"
          >
            <option value="" disabled>
              {!allLoaded ? "Loading names..." : availableForSelect.length === 0 ? "No one left to pick" : "Pick a name..."}
            </option>
            {availableForSelect.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}{p.className ? ` (${p.className})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="relative mt-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => { setShowResults(true); if (results.length === 0 && !isSearching) fetchPupils(query); }}
            placeholder="Search for a pupil by name..."
            className="w-full h-10 rounded-xl border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto"
              >
                {isSearching && <p className="p-3 text-sm text-muted-foreground">Searching...</p>}
                {!isSearching && results.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">No pupils found</p>
                )}
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onSelect(p); setQuery(""); setShowResults(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm flex items-center justify-between"
                  >
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-xs text-muted-foreground">{p.className || p.yearGroup || ""}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function UnknownPersonBuilder({
  descriptions,
  onChange,
  isPupil,
}: {
  descriptions: UnknownPersonDesc[];
  onChange: (d: UnknownPersonDesc[]) => void;
  isPupil: boolean;
}) {
  const addPerson = () => onChange([...descriptions, emptyDesc()]);
  const removePerson = (i: number) => onChange(descriptions.filter((_, idx) => idx !== i));
  const updatePerson = (i: number, field: keyof UnknownPersonDesc, value: any) => {
    const updated = [...descriptions];
    (updated[i] as any)[field] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-2">
          <HelpCircle size={16} className="text-muted-foreground" />
          {isPupil ? "Can you describe who it was?" : "Describe the unknown person(s)"}
        </Label>
        <button
          type="button"
          onClick={addPerson}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <UserPlus size={14} /> Add person
        </button>
      </div>

      {descriptions.map((desc, i) => (
        <Card key={i} className="border-dashed border-2 border-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-muted-foreground">Person {i + 1}</p>
              {descriptions.length > 1 && (
                <button type="button" onClick={() => removePerson(i)} className="text-destructive hover:text-destructive/80 text-sm font-medium">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Are they a boy or a girl?" : "Gender"}
                </label>
                <select
                  value={desc.gender}
                  onChange={(e) => updatePerson(i, "gender", e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Not sure</option>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Child or grown-up?" : "Staff or pupil?"}
                </label>
                <select
                  value={desc.staffOrPupil}
                  onChange={(e) => updatePerson(i, "staffOrPupil", e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="pupil">{isPupil ? "A child" : "Pupil"}</option>
                  <option value="staff">{isPupil ? "A grown-up / teacher" : "Staff member"}</option>
                  <option value="unknown">{isPupil ? "Not sure" : "Unknown"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Are they older, younger, or same age?" : "Age relation"}
                </label>
                <select
                  value={desc.ageRelation}
                  onChange={(e) => updatePerson(i, "ageRelation", e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Not sure</option>
                  <option value="older">{isPupil ? "Older than me" : "Older than the victim"}</option>
                  <option value="same">{isPupil ? "About the same age" : "Same age group"}</option>
                  <option value="younger">{isPupil ? "Younger than me" : "Younger than the victim"}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Do you know what year they're in?" : "Year group"}
                </label>
                <select
                  value={desc.yearGroup}
                  onChange={(e) => updatePerson(i, "yearGroup", e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Not sure</option>
                  {YEAR_GROUPS.map(yg => <option key={yg} value={yg}>{yg}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                {isPupil ? "What do they look like? (hair colour, height, anything you remember)" : "Physical description"}
              </label>
              <input
                type="text"
                value={desc.physicalDescription}
                onChange={(e) => updatePerson(i, "physicalDescription", e.target.value)}
                placeholder={isPupil ? "e.g. tall, brown hair, wears glasses..." : "Physical description..."}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Are they friends with anyone you know?" : "Friends with"}
                </label>
                <input
                  type="text"
                  value={desc.friendsWith}
                  onChange={(e) => updatePerson(i, "friendsWith", e.target.value)}
                  placeholder={isPupil ? "Names of their friends..." : "Known associates..."}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  {isPupil ? "Where have you seen them before?" : "Where seen"}
                </label>
                <input
                  type="text"
                  value={desc.whereSeenThem}
                  onChange={(e) => updatePerson(i, "whereSeenThem", e.target.value)}
                  placeholder={isPupil ? "e.g. playground, lunch hall..." : "Location seen..."}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                {isPupil ? "How many people were involved?" : "How many"}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={desc.howMany}
                onChange={(e) => updatePerson(i, "howMany", parseInt(e.target.value) || 1)}
                className="w-20 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const formSchema = z.object({
  categories: z.array(z.string()).min(1, "Please select at least one"),
  incidentDate: z.string().min(1, "Date is required"),
  location: z.string().optional(),
  personInvolvedText: z.string().optional(),
  witnessText: z.string().optional(),
  description: z.string().optional(),
  emotions: z.array(z.string()).optional(),
  happeningToMe: z.boolean().default(true),
  anonymous: z.boolean().default(false),
  childrenSeparated: z.boolean().optional(),
  coordinatorNotified: z.boolean().optional(),
  toldByChild: z.boolean().optional(),
  iSawIt: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ReportIncident() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const createMutation = useCreateIncident();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [selectedVictims, setSelectedVictims] = useState<PupilResult[]>([]);
  const [selectedPerps, setSelectedPerps] = useState<PupilResult[]>([]);
  const [selectedWitnesses, setSelectedWitnesses] = useState<PupilResult[]>([]);

  const isPupil = user?.role === "pupil";

  const [showDescribeVictim, setShowDescribeVictim] = useState(false);
  const [showDescribePerp, setShowDescribePerp] = useState(false);
  const [unknownVictimDescs, setUnknownVictimDescs] = useState<UnknownPersonDesc[]>([emptyDesc()]);
  const [unknownPerpDescs, setUnknownPerpDescs] = useState<UnknownPersonDesc[]>([emptyDesc()]);
  const [locationChoice, setLocationChoice] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categories: [],
      happeningToMe: isPupil,
      anonymous: false,
      incidentDate: new Date().toISOString().split('T')[0]
    }
  });
  const watchCategories = watch("categories") || [];
  const watchEmotions = watch("emotions") || [];
  const [openHint, setOpenHint] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    const allUnknownDescs: any[] = [];
    if (showDescribeVictim) {
      unknownVictimDescs.forEach(d => allUnknownDescs.push({ ...d, known: false, roleInIncident: "victim" }));
    }
    if (showDescribePerp) {
      unknownPerpDescs.forEach(d => allUnknownDescs.push({ ...d, known: false, roleInIncident: "perpetrator" }));
    }

    try {
      await createMutation.mutateAsync({
        data: {
          category: data.categories.join(","),
          incidentDate: new Date(data.incidentDate).toISOString(),
          location: data.location,
          personInvolvedText: data.personInvolvedText || null,
          victimIds: selectedVictims.map(v => v.id),
          perpetratorIds: selectedPerps.map(p => p.id),
          witnessIds: selectedWitnesses.map(w => w.id),
          witnessText: data.witnessText || null,
          description: data.description,
          emotionalState: data.emotions?.length ? data.emotions.join(",") : undefined,
          happeningToMe: data.happeningToMe,
          anonymous: data.anonymous,
          childrenSeparated: data.childrenSeparated,
          coordinatorNotified: data.coordinatorNotified,
          toldByChild: data.toldByChild,
          iSawIt: data.iSawIt,
          unknownPersonDescriptions: allUnknownDescs.length > 0 ? allUnknownDescs : undefined,
        }
      });
      setIsSuccess(true);
      setSubmitError("");
    } catch (error) {
      console.error(error);
      setSubmitError("Something went wrong submitting your report. Please try again.");
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="text-center p-12 bg-primary/5 border-primary/20">
          <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">{isPupil ? "Report Submitted" : "Incident Logged"}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {isPupil
              ? "Thank you for speaking up. We take every report seriously and will review it immediately. You are safe."
              : "The incident has been recorded and assigned a reference number. The safeguarding team will be notified if escalation is required."}
          </p>
          <Button size="lg" onClick={() => setLocation("/")}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">{isPupil ? "Report a Concern" : "Log a Safeguarding Incident"}</h1>
        <p className="text-muted-foreground mt-2">
          {isPupil 
            ? "Tell us what happened. You don't have to share your name if you don't want to." 
            : "Record an incident involving a pupil. You are reporting on behalf of a child, not about yourself."}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-6">
              <div>
                <Label className="text-base mb-3">{isPupil ? "What happened?" : "Incident category"} <span className="text-muted-foreground font-normal text-sm">(select all that apply)</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CATEGORIES.map(cat => {
                    const isSelected = watchCategories.includes(cat.id);
                    return (
                    <div key={cat.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? watchCategories.filter((c: string) => c !== cat.id)
                            : [...watchCategories, cat.id];
                          setValue("categories", updated, { shouldValidate: true });
                        }}
                        className={`w-full p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border hover:border-primary/30 text-muted-foreground"
                        }`}
                      >
                        {isPupil ? cat.pupilLabel : cat.label}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenHint(openHint === cat.id ? null : cat.id); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        aria-label={`What does ${isPupil ? cat.pupilLabel : cat.label} mean?`}
                      >
                        <Info size={12} />
                      </button>
                      <AnimatePresence>
                        {openHint === cat.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-10 top-full mt-2 left-0 right-0 p-3 rounded-xl bg-white border border-border shadow-lg text-xs text-foreground leading-relaxed"
                          >
                            {isPupil ? cat.hint : cat.staffHint}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    );
                  })}
                </div>
                {openHint && (
                  <div className="fixed inset-0 z-[5]" onClick={() => setOpenHint(null)} />
                )}
                {errors.categories && <p className="text-destructive text-sm mt-2">{errors.categories.message}</p>}
              </div>

              <div>
                <Label className="text-base mb-3">
                  {isPupil 
                    ? "How are you feeling about it?" 
                    : "How was the child feeling? (if known)"}
                  {" "}<span className="text-muted-foreground font-normal text-sm">(pick all that fit)</span>
                </Label>
                <div className="flex flex-wrap gap-3">
                  {EMOTIONS.map(emo => {
                    const isSelected = watchEmotions.includes(emo.id);
                    return (
                      <button
                        key={emo.id}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? watchEmotions.filter((e: string) => e !== emo.id)
                            : [...watchEmotions, emo.id];
                          setValue("emotions", updated);
                        }}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 min-w-[80px] transition-all ${
                          isSelected
                            ? "border-secondary bg-secondary/10"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span className="text-3xl mb-1">{emo.emoji}</span>
                        <span className="text-xs font-bold text-foreground">{emo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isPupil && (
                <div className="p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 space-y-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <Info size={18} className="text-blue-600 dark:text-blue-400"/>
                    How did you become aware of this?
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { val: true, label: "A child told me directly", field: "toldByChild" as const },
                      { val: true, label: "I witnessed it myself", field: "iSawIt" as const },
                    ].map(item => (
                      <label key={item.field} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border cursor-pointer hover:border-primary/30 transition-colors">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" {...register(item.field)} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Other source (parent report, another staff member, etc.)</label>
                    <input
                      type="text"
                      {...register("personInvolvedText")}
                      placeholder="e.g. Parent reported via phone call, lunchtime supervisor observed..."
                      className="w-full h-10 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">{isPupil ? "When did it happen?" : "Date of incident"}</Label>
                  <Input id="date" type="date" {...register("incidentDate")} />
                  {errors.incidentDate && <p className="text-destructive text-sm mt-1">{errors.incidentDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="location">{isPupil ? "Where did it happen? (optional)" : "Location (optional)"}</Label>
                  <select
                    value={locationChoice}
                    onChange={(e) => {
                      setLocationChoice(e.target.value);
                      if (e.target.value && e.target.value !== "__other__") {
                        setValue("location", e.target.value);
                        setCustomLocation("");
                      } else if (e.target.value === "__other__") {
                        setValue("location", customLocation);
                      } else {
                        setValue("location", "");
                      }
                    }}
                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                  >
                    <option value="">{isPupil ? "Pick a place..." : "Select location..."}</option>
                    {SCHOOL_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="__other__">{isPupil ? "Somewhere else..." : "Other (type below)"}</option>
                  </select>
                  {locationChoice === "__other__" && (
                    <Input
                      className="mt-2"
                      placeholder={isPupil ? "Tell us where it happened..." : "Describe the location..."}
                      value={customLocation}
                      onChange={(e) => {
                        setCustomLocation(e.target.value);
                        setValue("location", e.target.value);
                      }}
                    />
                  )}
                </div>
              </div>

              <Card className="border-2 border-border">
                <CardContent className="p-5 space-y-5">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Search size={18} className="text-primary" />
                    {isPupil ? "Who was involved?" : "People Involved"}
                  </h3>

                  <PupilSearchPicker
                    label="Victim(s)"
                    childFriendlyLabel="Who was hurt or affected?"
                    selectedIds={selectedVictims}
                    onSelect={(p) => setSelectedVictims(prev => [...prev, p])}
                    onRemove={(id) => setSelectedVictims(prev => prev.filter(p => p.id !== id))}
                    isPupil={isPupil}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDescribeVictim(!showDescribeVictim)}
                      className={`text-sm font-medium transition-colors ${showDescribeVictim ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {isPupil ? "I don't know their name" : "Describe unknown victim(s)"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDescribeVictim && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <UnknownPersonBuilder
                          descriptions={unknownVictimDescs}
                          onChange={setUnknownVictimDescs}
                          isPupil={isPupil}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <hr className="border-border" />

                  <PupilSearchPicker
                    label="Person(s) who did it"
                    childFriendlyLabel="Who did it?"
                    selectedIds={selectedPerps}
                    onSelect={(p) => setSelectedPerps(prev => [...prev, p])}
                    onRemove={(id) => setSelectedPerps(prev => prev.filter(p => p.id !== id))}
                    isPupil={isPupil}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDescribePerp(!showDescribePerp)}
                      className={`text-sm font-medium transition-colors ${showDescribePerp ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {isPupil ? "I don't know their name" : "Describe unknown person(s)"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showDescribePerp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <UnknownPersonBuilder
                          descriptions={unknownPerpDescs}
                          onChange={setUnknownPerpDescs}
                          isPupil={isPupil}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <hr className="border-border" />

                  <PupilSearchPicker
                    label="Witnesses"
                    childFriendlyLabel="Did anyone else see it?"
                    selectedIds={selectedWitnesses}
                    onSelect={(p) => setSelectedWitnesses(prev => [...prev, p])}
                    onRemove={(id) => setSelectedWitnesses(prev => prev.filter(p => p.id !== id))}
                    isPupil={isPupil}
                  />
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="desc">{isPupil ? "Can you tell us what happened?" : "Description of the incident"}</Label>
                <textarea 
                  id="desc"
                  {...register("description")}
                  rows={4}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all resize-none"
                  placeholder={isPupil ? "Tell us what happened in your own words..." : "Describe what happened, who reported it, and any actions already taken..."}
                ></textarea>
              </div>

              {isPupil && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                  <input 
                    type="checkbox" 
                    id="anon" 
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    {...register("anonymous")} 
                  />
                  <Label htmlFor="anon" className="mb-0 cursor-pointer font-bold">Keep this report anonymous</Label>
                </div>
              )}

              {!isPupil && (
                <div className="p-5 rounded-xl bg-muted/30 border border-border space-y-4">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck size={18} className="text-primary"/>
                    Staff Safeguarding Checks
                  </h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sep" className="mb-0 cursor-pointer">Were the children separated immediately?</Label>
                    <input type="checkbox" id="sep" className="w-5 h-5 rounded" {...register("childrenSeparated")} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="coord" className="mb-0 cursor-pointer">Has the Safeguarding Coordinator been notified?</Label>
                    <input type="checkbox" id="coord" className="w-5 h-5 rounded" {...register("coordinatorNotified")} />
                  </div>
                </div>
              )}
            </div>

            <div role="alert" aria-live="assertive" aria-atomic="true">
              {submitError && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2 mb-4">
                  {submitError}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" size="lg" isLoading={createMutation.isPending} className="w-full md:w-auto">
                {isPupil ? "Submit Report securely" : "Log Incident securely"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

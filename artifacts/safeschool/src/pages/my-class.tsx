import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import { Users, GraduationCap, School, ChevronDown, ChevronUp, ShieldAlert, Key, RefreshCw, Printer, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Pupil {
  id: string;
  firstName: string;
  lastName: string;
  yearGroup: string | null;
  className: string | null;
  avatarType: string | null;
  avatarValue: string | null;
}

interface MyPupilsResponse {
  scope: string;
  scopeLabel: string;
  classes: Record<string, Pupil[]>;
}

function ScopeIcon({ scope }: { scope: string }) {
  if (scope === "class") return <Users size={48} />;
  if (scope === "year") return <GraduationCap size={48} />;
  return <School size={48} />;
}

function roleScopeDescription(role: string, scope: string, scopeLabel: string): string {
  if (role === "teacher") return `You are the class teacher for ${scopeLabel}`;
  if (role === "head_of_year") return `You are the Head of Year for ${scopeLabel}`;
  if (role === "head_teacher") return `You oversee all pupils at this school`;
  if (role === "coordinator") return `You oversee all pupils at this school`;
  if (role === "senco") return `You have access to all pupils for SEND monitoring`;
  if (role === "support_staff") return `Your assigned scope: ${scopeLabel}`;
  return `Viewing: ${scopeLabel}`;
}

export default function MyClass() {
  const { user } = useAuth();
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<MyPupilsResponse>({
    queryKey: ["/api/my-pupils"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/my-pupils", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load pupils");
      return res.json();
    },
  });

  if (!user) return null;

  const pageTitle =
    user.role === "head_of_year" ? "My Year Group" :
    user.role === "teacher" ? "My Class" :
    user.role === "support_staff" ? "My Pupils" :
    "All Pupils";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-destructive">Failed to load pupil data.</p>
      </div>
    );
  }

  const classNames = Object.keys(data.classes).sort();
  const totalPupils = classNames.reduce((sum, c) => sum + data.classes[c].length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <ScopeIcon scope={data.scope} />
        </div>
        <h1 className="text-3xl font-display font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {roleScopeDescription(user.role, data.scope, data.scopeLabel)}
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold">
            <Users size={16} /> {totalPupils} {totalPupils === 1 ? "pupil" : "pupils"}
          </span>
          <span className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-bold">
            <GraduationCap size={16} /> {classNames.length} {classNames.length === 1 ? "class" : "classes"}
          </span>
        </div>
      </div>

      <PinManagement classes={data.classes} scope={data.scope} />

      {classNames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pupils found in your assigned scope.
          </CardContent>
        </Card>
      ) : classNames.length === 1 ? (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <GraduationCap size={20} className="text-primary" />
            Class {classNames[0]}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.classes[classNames[0]].map((pupil) => (
              <PupilCard key={pupil.id} pupil={pupil} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {classNames.map((className) => {
            const pupils = data.classes[className];
            const isExpanded = expandedClass === className || expandedClass === null;
            return (
              <Card key={className} className="overflow-hidden">
                <button
                  onClick={() => setExpandedClass(expandedClass === className ? null : className)}
                  className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">
                      {className}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Class {className}</h3>
                      <p className="text-sm text-muted-foreground">{pupils.length} {pupils.length === 1 ? "pupil" : "pupils"}</p>
                    </div>
                  </div>
                  {expandedClass === className ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 pb-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {pupils.map((pupil) => (
                            <PupilCard key={pupil.id} pupil={pupil} />
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PinResult {
  pupilId: string;
  firstName: string;
  lastName: string;
  className?: string;
  yearGroup?: string;
  newPin: string;
}

function PinManagement({ classes, scope }: { classes: Record<string, Pupil[]>; scope: string }) {
  const { user } = useAuth();
  const [generatedPins, setGeneratedPins] = useState<PinResult[]>([]);
  const [resettingPupilId, setResettingPupilId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(false);

  const canManagePins = ["teacher", "head_of_year", "coordinator", "head_teacher"].includes(user?.role || "");

  const resetSinglePin = useMutation({
    mutationFn: async (pupilId: string) => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/pupils/reset-pin/${pupilId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to reset PIN");
      return res.json();
    },
    onSuccess: (data: PinResult) => {
      setGeneratedPins(prev => {
        const filtered = prev.filter(p => p.pupilId !== data.pupilId);
        return [...filtered, data];
      });
      setResettingPupilId(null);
    },
  });

  const bulkResetPins = useMutation({
    mutationFn: async (params: { className?: string; yearGroup?: string }) => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/pupils/bulk-reset-pins", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to reset PINs");
      return res.json();
    },
    onSuccess: (data: { count: number; pupils: PinResult[] }) => {
      setGeneratedPins(data.pupils);
      setShowPins(true);
    },
  });

  if (!canManagePins) return null;

  const allPupils = Object.values(classes).flat();
  const classNames = Object.keys(classes).sort();

  const handleCopyPin = (pupilId: string, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedId(pupilId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    const printContent = generatedPins.map(p =>
      `${p.firstName} ${p.lastName} (${p.className || ""}) - PIN: ${p.newPin}`
    ).join("\n");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>PIN Slips - SafeSchool</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          .slip { border: 1px dashed #ccc; padding: 12px 16px; margin: 8px 0; page-break-inside: avoid; }
          .name { font-weight: bold; font-size: 14px; }
          .pin { font-size: 24px; letter-spacing: 8px; font-weight: bold; margin-top: 4px; }
          .note { font-size: 10px; color: #666; margin-top: 4px; }
          @media print { .no-print { display: none; } }
        </style></head><body>
        <h1>SafeSchool Login PINs</h1>
        <p class="no-print" style="font-size:12px;color:#666;">Print this page and cut along the dashed lines. Give each pupil their slip privately.</p>
        ${generatedPins.map(p => `
          <div class="slip">
            <div class="name">${p.firstName} ${p.lastName} ${p.className ? `(${p.className})` : ""}</div>
            <div class="pin">${p.newPin}</div>
            <div class="note">This is your secret PIN for SafeSchool. Do not share it with anyone.</div>
          </div>
        `).join("")}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Key size={20} />
          PIN Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate unique secret PINs for pupils. Each pupil gets their own PIN — no shared passwords.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {classNames.length === 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkResetPins.mutate({ className: classNames[0] })}
              disabled={bulkResetPins.isPending}
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
            >
              <RefreshCw size={14} className={bulkResetPins.isPending ? "animate-spin" : ""} />
              {bulkResetPins.isPending ? "Generating..." : `Generate New PINs for Class ${classNames[0]}`}
            </Button>
          ) : (
            classNames.map(cn => (
              <Button
                key={cn}
                variant="outline"
                size="sm"
                onClick={() => bulkResetPins.mutate({ className: cn })}
                disabled={bulkResetPins.isPending}
                className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
              >
                <RefreshCw size={14} className={bulkResetPins.isPending ? "animate-spin" : ""} />
                {bulkResetPins.isPending ? "..." : `Class ${cn}`}
              </Button>
            ))
          )}
        </div>

        {generatedPins.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {generatedPins.length} PIN{generatedPins.length !== 1 ? "s" : ""} generated
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPins(!showPins)}>
                  {showPins ? "Hide PINs" : "Show PINs"}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer size={14} />
                  Print PIN Slips
                </Button>
              </div>
            </div>

            {showPins && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {generatedPins.map(p => (
                  <div key={p.pupilId} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-amber-200/50 dark:border-amber-800/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-bold">{p.firstName} {p.lastName}</p>
                      <p className="text-lg font-mono font-bold tracking-widest text-amber-700 dark:text-amber-400">{p.newPin}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyPin(p.pupilId, p.newPin)}
                    >
                      {copiedId === p.pupilId ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-amber-600/70 dark:text-amber-400/50">
              PINs are shown once. Print or copy them now — they cannot be retrieved later, only reset.
            </p>
          </motion.div>
        )}

        {!generatedPins.length && (
          <div className="text-xs text-muted-foreground">
            Or reset individual pupil PINs by clicking the key icon on their card below.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PupilCard({ pupil }: { pupil: Pupil }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl mb-2">
        {pupil.avatarValue || pupil.firstName.charAt(0)}
      </div>
      <p className="font-bold text-sm text-center">{pupil.firstName} {pupil.lastName}</p>
      <p className="text-xs text-muted-foreground mb-2">{pupil.yearGroup} · {pupil.className}</p>
      <Link
        href={`/incidents?pupilId=${pupil.id}&pupilName=${encodeURIComponent(pupil.firstName + " " + pupil.lastName)}`}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
      >
        <ShieldAlert size={10} />
        View incidents
      </Link>
    </div>
  );
}

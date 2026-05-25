import { useState, useEffect } from "react";
import { useRoute, useSearch, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useCreateProtocol, useGetIncident } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui-polished";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function NewProtocol() {
  const { t } = useTranslation("protocols");
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const incidentId = urlParams.get("incidentId") || "";
  const queryClient = useQueryClient();

  // orval-generated options now require `queryKey`; the hook supplies its own. Cast at the boundary.
  const { data: incident } = useGetIncident(incidentId || "none", {
    query: { enabled: !!incidentId } as any,
  });

  const { data: pupilData } = useQuery<any>({
    queryKey: ["/api/my-pupils"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/my-pupils", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !incidentId,
  });

  const allPupils: any[] = pupilData
    ? Object.values(pupilData.classes as Record<string, any[]>).flat()
    : [];

  const createProtocol = useCreateProtocol();

  const [protocolType, setProtocolType] = useState("");
  const [protocolSource, setProtocolSource] = useState("");
  const [genderBasedViolence, setGenderBasedViolence] = useState(false);
  const [context, setContext] = useState("");
  const [victimId, setVictimId] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [riskFactors, setRiskFactors] = useState<string[]>([]);
  const [protectiveFactors, setProtectiveFactors] = useState<string[]>([]);
  const [riskNotes, setRiskNotes] = useState("");
  const [externalReferralRequired, setExternalReferralRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (incident) {
      if (incident.victimIds?.length) {
        setVictimId(incident.victimIds[0]);
      }
      const cats = (incident.category || "").toLowerCase();
      if (cats.includes("sexual") || cats.includes("coercive")) {
        setProtocolType("machista_violence");
        setGenderBasedViolence(true);
      } else if (cats.includes("safeguarding") || cats.includes("neglect")) {
        setProtocolType("lopivi");
      } else {
        setProtocolType("convivexit");
      }
      setProtocolSource("pupil_report");
    }
  }, [incident]);

  const PROTOCOL_TYPES = [
    { value: "convivexit", label: t("convivexit") },
    { value: "lopivi", label: t("lopivi") },
    { value: "machista_violence", label: t("machistaViolence") },
    { value: "general_safeguarding", label: t("generalSafeguarding") },
  ];

  const PROTOCOL_SOURCES = [
    { value: "pupil_report", label: t("pupilReport") },
    { value: "teacher_observation", label: t("teacherObservation") },
    { value: "parent_concern", label: t("parentConcern") },
    { value: "pattern_alert", label: t("patternAlert") },
    { value: "external_referral", label: t("externalReferral") },
  ];

  const RISK_LEVELS = [
    { value: "low", label: t("low"), color: "bg-green-100 text-green-700 border-green-300", desc: t("lowDesc") },
    { value: "medium", label: t("medium"), color: "bg-amber-100 text-amber-700 border-amber-300", desc: t("mediumDesc") },
    { value: "high", label: t("high"), color: "bg-orange-100 text-orange-700 border-orange-300", desc: t("highDesc") },
    { value: "critical", label: t("critical"), color: "bg-red-100 text-red-700 border-red-300", desc: t("criticalDesc") },
  ];

  const RISK_FACTORS = [
    t("repeatBehaviour"),
    t("powerImbalance"),
    t("ageGap"),
    t("vulnerability"),
    t("selfHarmRisk"),
    t("familyConcerns"),
    t("onlineElement"),
    t("groupInvolvement"),
  ];

  const PROTECTIVE_FACTORS = [
    t("supportiveFamily"),
    t("goodPeerRelationships"),
    t("willingToTalk"),
    t("receivingExternalSupport"),
  ];

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!protocolType || !victimId) {
      setError(t("pleaseSelectTypeAndVictim"));
      return;
    }

    if (!riskLevel) {
      setError(t("pleaseSelectRiskLevel"));
      return;
    }

    try {
      const result = await createProtocol.mutateAsync({
        // UI sends risk* fields the spec doesn't yet declare (drift — see OVERNIGHT_LOG.md T02). Server accepts and stores them.
        data: {
          protocolType,
          protocolSource: protocolSource || undefined,
          genderBasedViolence,
          context: context || undefined,
          linkedIncidentIds: incidentId ? [incidentId] : [],
          victimId,
          riskLevel,
          riskAssessment: riskNotes || undefined,
          riskFactors,
          protectiveFactors,
          externalReferralRequired,
        } as unknown as Parameters<typeof createProtocol.mutateAsync>[0]["data"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/protocols"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setLocation(`/protocols/${result.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message || t("failedToCreate");
      setError(msg);
    }
  };

  const victimName = incident?.victimNames?.[0] || t("common:unknown");
  const perpetratorNames = incident?.perpetratorNames?.join(", ") || t("common:unknown");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={incidentId ? `/incidents/${incidentId}` : "/protocols"}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold">{t("openFormalProtocol")}</h1>
          <p className="text-muted-foreground mt-1">{t("startFormal")}</p>
        </div>
      </div>

      {incident && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-primary" />
              {t("linkedToIncident", { ref: incident.referenceNumber })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("incidentDetail", { category: incident.category, victim: victimName, perps: perpetratorNames })}
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-destructive text-sm font-bold">{error}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="border-b border-border/50">
            <CardTitle>{t("protocolDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label>{t("protocolType")}</Label>
              <select
                value={protocolType}
                onChange={(e) => setProtocolType(e.target.value)}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                required
              >
                <option value="">{t("selectProtocolType")}</option>
                {PROTOCOL_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t("source")}</Label>
              <select
                value={protocolSource}
                onChange={(e) => setProtocolSource(e.target.value)}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
              >
                <option value="">{t("selectSource")}</option>
                {PROTOCOL_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="gbv"
                checked={genderBasedViolence}
                onChange={(e) => setGenderBasedViolence(e.target.checked)}
                className="w-5 h-5 rounded border-input"
              />
              <Label htmlFor="gbv" className="cursor-pointer">{t("gbvProtocol")}</Label>
            </div>

            {!incidentId && (
              <div>
                <Label>{t("victimChildOfConcern")}</Label>
                <select
                  value={victimId}
                  onChange={(e) => setVictimId(e.target.value)}
                  className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                  required
                >
                  <option value="">{t("selectChild")}</option>
                  {allPupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.className || p.yearGroup || ""})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label>{t("contextNotes")}</Label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t("contextPlaceholder")}
                className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="border-b border-border/50">
            <CardTitle>{t("riskAssessment")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="mb-3 block">{t("selectRiskLevel")}</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {RISK_LEVELS.map((rl) => (
                  <button
                    key={rl.value}
                    type="button"
                    onClick={() => setRiskLevel(rl.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      riskLevel === rl.value
                        ? `${rl.color} border-current ring-2 ring-current/20`
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-bold text-sm">{rl.label}</p>
                    <p className="text-xs mt-1 opacity-80">{rl.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">{t("riskFactorsSelect")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {RISK_FACTORS.map((rf) => (
                  <label
                    key={rf}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      riskFactors.includes(rf)
                        ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={riskFactors.includes(rf)}
                      onChange={() => setRiskFactors(toggleArrayItem(riskFactors, rf))}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm font-medium">{rf}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">{t("protectiveFactorsSelect")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PROTECTIVE_FACTORS.map((pf) => (
                  <label
                    key={pf}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      protectiveFactors.includes(pf)
                        ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={protectiveFactors.includes(pf)}
                      onChange={() => setProtectiveFactors(toggleArrayItem(protectiveFactors, pf))}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm font-medium">{pf}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>{t("additionalRiskNotesOpt")}</Label>
              <textarea
                value={riskNotes}
                onChange={(e) => setRiskNotes(e.target.value)}
                placeholder={t("additionalRiskPlaceholder")}
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 resize-y"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="externalRef"
                checked={externalReferralRequired}
                onChange={(e) => setExternalReferralRequired(e.target.checked)}
                className="w-5 h-5 rounded border-input"
              />
              <Label htmlFor="externalRef" className="cursor-pointer">{t("externalReferralRequired")}</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-6">
          <Link href={incidentId ? `/incidents/${incidentId}` : "/protocols"}>
            <Button type="button" variant="outline" size="lg">{t("common:cancel")}</Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            disabled={createProtocol.isPending}
          >
            <Shield className="mr-2" size={18} />
            {createProtocol.isPending ? t("openingProtocol") : t("openProtocol")}
          </Button>
        </div>
      </form>
    </div>
  );
}

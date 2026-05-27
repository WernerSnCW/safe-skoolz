import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useStaffLogin, useParentLogin, useListSchools } from "@workspace/api-client-react";
import { Button, Input, Label, Card, CardContent } from "@/components/ui-polished";
import { ShieldCheck, User, Users, GraduationCap, AlertTriangle, Play, UserCheck, Building2, ChevronRight, Lock, ArrowLeft, Heart, Shield, BarChart3, Bell, Eye, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

type DemoAccount = { label: string; subtitle: string; email: string; password: string };

type PupilProfile = {
  loginKey: string;
  displayName: string;
  avatarType: string;
  avatarValue: string;
  yearGroup: string;
  className: string;
};

type PupilLoginStep = "school" | "accessCode" | "selectProfile" | "enterPin";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "nl", label: "Nederlands" },
  { code: "fr", label: "Français" },
] as const;

export default function Login() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { t } = useTranslation("login");
  const [activeTab, setActiveTab] = useState<"pupil" | "staff" | "parent" | "pta">("pupil");
  const staffLogin = useStaffLogin();
  const parentLogin = useParentLogin();
  const { data: schools } = useListSchools();

  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedStaffEmail, setSelectedStaffEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);
  // T11: MFA challenge step.
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackup, setMfaBackup] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  // T3: forced re-enrolment after an admin reset.
  const [enrollmentToken, setEnrollmentToken] = useState("");
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollBackupCodes, setEnrollBackupCodes] = useState<string[] | null>(null);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  const beginEnrollment = async (token: string) => {
    setEnrollmentToken(token);
    setError("");
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/enroll/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentToken: token }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error || "Could not start MFA enrolment.");
        return;
      }
      setEnrollQr(data.qrDataUrl);
    } catch {
      setError("Could not start MFA enrolment.");
    }
  };

  const handleEnrollmentVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setEnrollSubmitting(true);
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/enroll/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentToken, code: enrollCode }),
      });
      const data = await r.json();
      if (!r.ok || !data.token) {
        setError(data?.error || "Invalid code.");
        return;
      }
      setEnrollBackupCodes(data.backupCodes || []);
      // Hold the session JWT but don't redirect until the user has seen the
      // backup codes and clicked "Continue".
      (window as any).__pendingMfaJwt = data.token;
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const finishEnrollment = () => {
    const jwt = (window as any).__pendingMfaJwt as string | undefined;
    if (!jwt) return;
    delete (window as any).__pendingMfaJwt;
    setEnrollmentToken("");
    setEnrollQr(null);
    setEnrollCode("");
    setEnrollBackupCodes(null);
    setToken(jwt);
    setLocation("/");
  };

  const handleMfaChallenge = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setMfaSubmitting(true);
    try {
      const body: Record<string, string> = { mfaToken };
      if (mfaCode) body.code = mfaCode;
      else if (mfaBackup) body.backupCode = mfaBackup;
      else {
        setError("Enter a 6-digit code or a backup code.");
        setMfaSubmitting(false);
        return;
      }
      const r = await fetch(`${apiBase}api/auth/mfa/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || !data.token) {
        setError(data?.error || "Invalid code.");
        setMfaSubmitting(false);
        return;
      }
      setToken(data.token);
      setMfaToken("");
      setMfaCode("");
      setMfaBackup("");
      setLocation("/");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setMfaSubmitting(false);
    }
  };

  useEffect(() => {
    const apiBase = (() => {
      const b = import.meta.env.BASE_URL || "/";
      return b.endsWith("/") ? b : b + "/";
    })();
    fetch(`${apiBase}api/config`)
      .then(r => r.json())
      .then(data => {
        if (data.demoEnabled) {
          setDemoEnabled(true);
        }
      })
      .catch(() => {});
  }, []);

  const [loginAccounts, setLoginAccounts] = useState<{ staff: DemoAccount[]; parent: DemoAccount[]; pta: DemoAccount[] }>({ staff: [], parent: [], pta: [] });
  useEffect(() => {
    if (!selectedSchoolId) return;
    const base = (() => {
      const b = import.meta.env.BASE_URL || "/";
      return b.endsWith("/") ? b : b + "/";
    })();
    const loadAccounts = async () => {
      try {
        const [staffRes, parentRes, ptaRes] = await Promise.all([
          fetch(`${base}api/auth/login-accounts?schoolId=${selectedSchoolId}&type=staff`),
          fetch(`${base}api/auth/login-accounts?schoolId=${selectedSchoolId}&type=parent`),
          fetch(`${base}api/auth/login-accounts?schoolId=${selectedSchoolId}&type=pta`),
        ]);
        const [staff, parent, pta] = await Promise.all([
          staffRes.ok ? staffRes.json() : [],
          parentRes.ok ? parentRes.json() : [],
          ptaRes.ok ? ptaRes.json() : [],
        ]);
        setLoginAccounts({ staff, parent, pta });
      } catch {
        setLoginAccounts({ staff: [], parent: [], pta: [] });
      }
    };
    loadAccounts();
  }, [selectedSchoolId]);

  const [pupilStep, setPupilStep] = useState<PupilLoginStep>("school");
  const [accessCode, setAccessCode] = useState("");
  const [loginSessionToken, setLoginSessionToken] = useState("");
  const [profiles, setProfiles] = useState<PupilProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PupilProfile | null>(null);
  const [pin, setPin] = useState("");
  const [pupilLoading, setPupilLoading] = useState(false);

  useEffect(() => {
    if (schools && schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
      if (schools.length === 1 && pupilStep === "school") {
        setPupilStep("accessCode");
      }
    }
  }, [schools, selectedSchoolId]);

  const apiBase = (() => {
    const b = import.meta.env.BASE_URL || "/";
    return b.endsWith("/") ? b : b + "/";
  })();

  const handleAccessCodeSubmit = async () => {
    setError("");
    setPupilLoading(true);
    try {
      const res = await fetch(`${apiBase}api/auth/pupil/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: selectedSchoolId, accessCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid access code. Check with your teacher.");
        setPupilLoading(false);
        return;
      }
      setLoginSessionToken(data.loginSessionToken);
      setProfiles(data.profiles);
      setPupilStep("selectProfile");
    } catch {
      setError("Could not connect. Please try again.");
    }
    setPupilLoading(false);
  };

  const handleProfileSelect = (profile: PupilProfile) => {
    setSelectedProfile(profile);
    setPin("");
    setError("");
    setPupilStep("enterPin");
  };

  const handlePupilPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !pin) return;
    setError("");
    setPupilLoading(true);
    try {
      const res = await fetch(`${apiBase}api/auth/pupil/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginSessionToken,
          loginKey: selectedProfile.loginKey,
          pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.locked) {
          setError(data.message || "Account locked. Ask your teacher to reset your PIN.");
        } else if (data.message) {
          setError(data.message);
        } else {
          setError(data.error || "Wrong PIN. Try again.");
        }
        setPupilLoading(false);
        return;
      }
      setToken(data.token);
      setLocation("/");
    } catch {
      setError("Could not connect. Please try again.");
    }
    setPupilLoading(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      let res;
      if (activeTab === "staff") {
        const accounts = loginAccounts.staff;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name and enter your password.");
          return;
        }
        res = await staffLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
      } else if (activeTab === "parent") {
        const accounts = loginAccounts.parent;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name and enter your password.");
          return;
        }
        res = await parentLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
      } else {
        const accounts = loginAccounts.pta;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name and enter your password.");
          return;
        }
        res = await staffLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
      }

      // T11: staff login may return { requiresMfa, mfaToken } instead of a
      // full JWT when MFA is enforced and enabled for the user.
      const r = res as any;
      if (r?.requiresMfaEnrollment && r?.enrollmentToken) {
        // T3: an admin has reset this user's MFA — route them into re-enrol.
        await beginEnrollment(r.enrollmentToken as string);
        return;
      }
      if (r?.requiresMfa && r?.mfaToken) {
        setMfaToken(r.mfaToken as string);
        return;
      }
      setToken(res.token);
      setLocation("/");
    } catch (err: any) {
      const data = err?.data || err?.response?.data;
      if (data?.locked) {
        setError(data.message || "Account locked.");
      } else if (data?.message) {
        setError(data.message);
      } else {
        setError(data?.error || "Login failed. Please check your credentials.");
      }
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setDemoLoading(activeTab);
    try {
      const res = await fetch(`${apiBase}api/auth/demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: activeTab }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Demo login failed");
        setDemoLoading(null);
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("safeschool_start_demo", "true");
      setToken(data.token);
      setLocation("/");
    } catch {
      setError("Could not start demo. Please try again.");
      setDemoLoading(null);
    }
  };

  const isPending = staffLogin.isPending || parentLogin.isPending || pupilLoading;

  const resetPupilFlow = () => {
    if (schools && schools.length === 1) {
      setPupilStep("accessCode");
    } else {
      setPupilStep("school");
    }
    setAccessCode("");
    setLoginSessionToken("");
    setProfiles([]);
    setSelectedProfile(null);
    setPin("");
    setError("");
  };

  const profileSearch = useState("");

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      <button
        type="button"
        disabled={!!demoLoading}
        onClick={async () => {
          setError("");
          setDemoLoading("coordinator");
          try {
            const res = await fetch(`${apiBase}api/auth/demo-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "coordinator" }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error || "Admin demo login failed");
              setDemoLoading(null);
              return;
            }
            const data = await res.json();
            setToken(data.token);
            setLocation("/admin");
          } catch {
            setError("Could not open Admin demo. Please try again.");
            setDemoLoading(null);
          }
        }}
        className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-teal-700 transition-colors z-20 disabled:opacity-60"
      >
        <ShieldCheck size={14} />
        Admin
      </button>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background"></div>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col justify-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/20 mb-6 text-white transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShieldCheck size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">safeskoolz</h1>
          <p className="mt-3 text-muted-foreground text-lg">{t("tagline")}</p>
        </motion.div>

        <Card className="shadow-2xl shadow-primary/5 border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-1 px-4 pt-3 pb-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => { i18n.changeLanguage(lang.code); localStorage.setItem("safeskoolz_lang", lang.code); }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  i18n.language === lang.code
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 p-1.5 gap-1 border-b border-border/50 bg-muted/30" role="tablist" aria-label={t("loginType")}>
            {[
              { id: "pupil" as const, label: t("pupil"), icon: User },
              { id: "staff" as const, label: t("staff"), icon: GraduationCap },
              { id: "parent" as const, label: t("parent"), icon: Users },
              { id: "pta" as const, label: "PTA", icon: UserCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => { setActiveTab(tab.id); setError(""); setSelectedStaffEmail(""); resetPupilFlow(); }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-card shadow-sm text-primary"
                    : "text-muted-foreground hover:bg-black/5"
                }`}
              >
                <tab.icon size={16} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {demoEnabled && (
            <div className="px-6 sm:px-8 py-3 border-b border-border/30 bg-primary/5">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={!!demoLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {demoLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    {t("startingDemo")}
                  </>
                ) : (
                  <>
                    <Play size={16} className="fill-primary/20" />
                    {activeTab === "pupil" ? t("showMeAround") : activeTab === "parent" ? t("showMeAroundParent") : activeTab === "pta" ? t("showMeAroundPta") : t("showMeAroundStaff")}
                  </>
                )}
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "pupil" && (
                <div className="px-6 sm:px-8 pt-5 pb-3 border-b border-border/30 bg-teal-50/30 dark:bg-teal-950/10">
                  <p className="text-sm font-bold text-teal-700 dark:text-teal-400 mb-2">{t("whatSafeskoolzDoes")}</p>
                  <div className="grid gap-1.5">
                    <div className="flex items-start gap-2">
                      <Heart size={13} className="text-teal-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMe")}</span> — {t("pupilForMe")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users size={13} className="text-teal-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMyFriends")}</span> — {t("pupilForFriends")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Building2 size={13} className="text-teal-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMySchool")}</span> — {t("pupilForSchool")}</p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "staff" && (
                <div className="px-6 sm:px-8 pt-5 pb-3 border-b border-border/30 bg-indigo-50/30 dark:bg-indigo-950/10">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">{t("whatSafeskoolzDoes")}</p>
                  <div className="grid gap-1.5">
                    <div className="flex items-start gap-2">
                      <ClipboardCheck size={13} className="text-indigo-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMe")}</span> — {t("staffForMe")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Eye size={13} className="text-indigo-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMyPupils")}</span> — {t("staffForPupils")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield size={13} className="text-indigo-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forTheirParents")}</span> — {t("staffForParents")}</p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "parent" && (
                <div className="px-6 sm:px-8 pt-5 pb-3 border-b border-border/30 bg-amber-50/30 dark:bg-amber-950/10">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">{t("whatSafeskoolzDoes")}</p>
                  <div className="grid gap-1.5">
                    <div className="flex items-start gap-2">
                      <Bell size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMe")}</span> — {t("parentForMe")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Heart size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMyChild")}</span> — {t("parentForChild")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <BarChart3 size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMySchool")}</span> — {t("parentForSchool")}</p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "pta" && (
                <div className="px-6 sm:px-8 pt-5 pb-3 border-b border-border/30 bg-purple-50/30 dark:bg-purple-950/10">
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-2">{t("whatSafeskoolzDoes")}</p>
                  <div className="grid gap-1.5">
                    <div className="flex items-start gap-2">
                      <BarChart3 size={13} className="text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forMe")}</span> — {t("ptaForMe")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users size={13} className="text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forParents")}</span> — {t("ptaForParents")}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield size={13} className="text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">{t("forTheSchool")}</span> — {t("ptaForSchool")}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <CardContent className="p-6 sm:p-8">
            <div role="alert" aria-live="assertive" aria-atomic="true">
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>

            {activeTab === "pupil" ? (
              <AnimatePresence mode="wait">
                {pupilStep === "school" && (
                  <motion.div key="school" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <div>
                      <Label htmlFor="school">{t("mySchool")}</Label>
                      <select
                        id="school"
                        value={selectedSchoolId}
                        onChange={e => { setSelectedSchoolId(e.target.value); }}
                        className="w-full h-14 rounded-xl border border-input bg-background px-4 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        style={{ fontSize: "16px" }}
                        required
                      >
                        <option value="">{t("selectYourSchool")}</option>
                        {schools?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      disabled={!selectedSchoolId}
                      onClick={() => { setError(""); setPupilStep("accessCode"); }}
                    >
                      {t("common:next")}
                    </Button>
                  </motion.div>
                )}

                {pupilStep === "accessCode" && (
                  <motion.div key="accessCode" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <button type="button" onClick={() => setPupilStep("school")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft size={14} /> {t("common:back")}
                    </button>
                    <div className="text-center py-2">
                      <Lock size={32} className="mx-auto text-primary/60 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("enterAccessCodePrompt")}</p>
                    </div>
                    <div>
                      <Label htmlFor="accessCode">{t("classAccessCode")}</Label>
                      <Input
                        id="accessCode"
                        type="text"
                        placeholder={t("accessCodePlaceholder")}
                        value={accessCode}
                        onChange={e => setAccessCode(e.target.value.toUpperCase())}
                        required
                        autoComplete="off"
                        className="tracking-widest text-center text-lg font-bold uppercase"
                      />
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      disabled={!accessCode || pupilLoading}
                      onClick={handleAccessCodeSubmit}
                    >
                      {pupilLoading ? t("checking") : t("enter")}
                    </Button>
                  </motion.div>
                )}

                {pupilStep === "selectProfile" && (
                  <motion.div key="selectProfile" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    <button type="button" onClick={resetPupilFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft size={14} /> {t("common:startOver")}
                    </button>
                    <p className="text-sm font-semibold text-center">{t("findYourName")}</p>
                    <Input
                      type="text"
                      placeholder={t("searchByName")}
                      value={profileSearch[0]}
                      onChange={e => profileSearch[1](e.target.value)}
                      className="text-sm"
                    />
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {profiles
                        .filter(p => !profileSearch[0] || p.displayName.toLowerCase().includes(profileSearch[0].toLowerCase()))
                        .map((p) => (
                        <button
                          key={p.loginKey}
                          type="button"
                          onClick={() => handleProfileSelect(p)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                        >
                          <span className="text-2xl">{p.avatarValue || "👤"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{p.displayName}</p>
                            <p className="text-xs text-muted-foreground">{p.className || p.yearGroup}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {pupilStep === "enterPin" && selectedProfile && (
                  <motion.div key="enterPin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <button type="button" onClick={() => { setPupilStep("selectProfile"); setPin(""); setError(""); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft size={14} /> {t("common:changeName")}
                    </button>
                    <div className="text-center py-2">
                      <span className="text-4xl block mb-2">{selectedProfile.avatarValue || "👤"}</span>
                      <p className="font-bold text-lg">{selectedProfile.displayName}</p>
                      <p className="text-xs text-muted-foreground">{selectedProfile.className || selectedProfile.yearGroup}</p>
                    </div>
                    <form onSubmit={handlePupilPinSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="pin">{t("secretPin")}</Label>
                        <Input
                          id="pin"
                          type="password"
                          placeholder="****"
                          maxLength={4}
                          value={pin}
                          onChange={e => setPin(e.target.value)}
                          required
                          autoComplete="one-time-code"
                          className="tracking-widest text-center text-xl font-bold"
                          autoFocus
                        />
                      </div>
                      <Button type="submit" size="lg" className="w-full" disabled={pupilLoading || pin.length < 4}>
                        {pupilLoading ? t("common:signingIn") : t("signInSecurely")}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : enrollmentToken ? (
              <div className="space-y-5">
                <div className="p-3 rounded-xl bg-primary/10 text-sm">
                  Your two-factor authentication was reset by an administrator.
                  Please re-enrol an authenticator app to continue.
                </div>
                {enrollBackupCodes ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Backup codes (save these now)</p>
                    <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
                      {enrollBackupCodes.map(c => (
                        <li key={c} className="p-2 bg-muted rounded">{c}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Each code works once. They will not be shown again.
                    </p>
                    <Button size="lg" className="w-full" onClick={finishEnrollment}>
                      I have saved my backup codes — continue
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleEnrollmentVerify} className="space-y-4">
                    {enrollQr ? (
                      <>
                        <p className="text-sm">
                          Scan this QR with your authenticator app, then enter the
                          6-digit code below.
                        </p>
                        <img
                          src={enrollQr}
                          alt="MFA QR code"
                          className="border rounded-lg w-48 h-48 mx-auto"
                        />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    )}
                    <div>
                      <Label htmlFor="enrollCode">Verification code</Label>
                      <Input
                        id="enrollCode"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={enrollCode}
                        onChange={e => setEnrollCode(e.target.value)}
                        placeholder="123456"
                        className="h-14 text-base"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    {error && (
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                        {error}
                      </div>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={enrollSubmitting || enrollCode.length < 6 || !enrollQr}
                    >
                      {enrollSubmitting ? "Verifying…" : "Verify and enable"}
                    </Button>
                  </form>
                )}
              </div>
            ) : mfaToken ? (
              <form onSubmit={handleMfaChallenge} className="space-y-5">
                <div>
                  <Label htmlFor="mfaCode">Authenticator app code</Label>
                  <Input
                    id="mfaCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={e => { setMfaCode(e.target.value); setMfaBackup(""); }}
                    placeholder="123456"
                    className="h-14 text-base"
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  <div className="flex-1 h-px bg-border" />
                  <span>or use a backup code</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div>
                  <Label htmlFor="mfaBackup">Backup code</Label>
                  <Input
                    id="mfaBackup"
                    value={mfaBackup}
                    onChange={e => { setMfaBackup(e.target.value.toUpperCase()); setMfaCode(""); }}
                    placeholder="ABCDE-12345"
                    className="h-14 text-base"
                    style={{ fontSize: "16px" }}
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={mfaSubmitting || (!mfaCode && !mfaBackup)}>
                  {mfaSubmitting ? "Verifying…" : "Verify and continue"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => { setMfaToken(""); setMfaCode(""); setMfaBackup(""); setError(""); }}
                >
                  ← Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleStaffSubmit} className="space-y-5">
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  {(() => {
                    const accounts = activeTab === "parent" ? loginAccounts.parent : activeTab === "pta" ? loginAccounts.pta : loginAccounts.staff;
                    const selectedAccount = accounts.find(a => a.email === selectedStaffEmail);
                    const hasAccounts = accounts.length > 0;
                    return (
                      <>
                        {hasAccounts && (
                          <div>
                            <Label htmlFor="staffSelect">{t("myName")}</Label>
                            <select
                              id="staffSelect"
                              value={selectedStaffEmail}
                              onChange={e => {
                                setSelectedStaffEmail(e.target.value);
                                setEmail("");
                                setPassword("");
                              }}
                              className="w-full h-14 rounded-xl border border-input bg-background px-4 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                              style={{ fontSize: "16px" }}
                            >
                              <option value="">{t("findMyName")}</option>
                              {accounts.map(a => (
                                <option key={a.email} value={a.email}>
                                  {a.label} — {a.subtitle}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {selectedAccount ? (
                          <div className="p-3 rounded-xl bg-muted/50 border border-border">
                            <p className="text-sm font-bold">{selectedAccount.label}</p>
                            <p className="text-xs text-muted-foreground">{selectedAccount.subtitle}</p>
                          </div>
                        ) : (
                          <>
                            {hasAccounts && (
                              <div className="flex items-center gap-3 text-muted-foreground text-xs">
                                <div className="flex-1 h-px bg-border" />
                                <span>{t("orEnterManually")}</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <div>
                              <Label htmlFor="email">{t("emailAddress")}</Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder={t("emailPlaceholder")}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <Label htmlFor="password">{t("password")}</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder={t("enterYourPassword")}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                          />
                          <div className="mt-2 text-right">
                            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                              Forgot password?
                            </Link>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>

                <Button type="submit" size="lg" className="w-full mt-6" disabled={isPending}>
                  {isPending ? t("common:signingIn") : t("signInSecurely")}
                </Button>
              </form>
            )}

            
          </CardContent>
        </Card>

        <Link href="/how-it-works">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200/50 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Play size={24} className="text-white fill-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">{t("seeHowItWorks")}</p>
                <p className="text-sm text-indigo-200 mt-0.5">{t("seeHowItWorksDesc")}</p>
              </div>
              <ChevronRight size={20} className="text-indigo-200 flex-shrink-0" />
            </div>
          </motion.div>
        </Link>


        <p className="text-center text-sm text-muted-foreground mt-4">
          {t("protectedBy")}
        </p>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          {t("common:poweredByCloudworkz")}
        </p>
      </div>
    </div>
  );
}

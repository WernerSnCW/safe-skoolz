import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useStaffLogin, useParentLogin, useListSchools } from "@workspace/api-client-react";
import { Button, Input, Label, Card, CardContent } from "@/components/ui-polished";
import { ShieldCheck, User, Users, GraduationCap, AlertTriangle, Play, UserCheck, Building2, ChevronRight, Lock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const IS_DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";

const STAFF_ACCOUNTS = IS_DEMO ? [
  { label: "Coordinator A", subtitle: "Coordinator", email: "coordinator@safeschool.dev", password: "password123" },
  { label: "Head Teacher A", subtitle: "Head Teacher", email: "head@safeschool.dev", password: "password123" },
  { label: "Teacher A", subtitle: "Head of Year · Y6 · 6A", email: "teacher@safeschool.dev", password: "password123" },
  { label: "Teacher B", subtitle: "Teacher · 5B", email: "teacher2@safeschool.dev", password: "password123" },
  { label: "Teacher C", subtitle: "Teacher · 4A", email: "teacher3@safeschool.dev", password: "password123" },
  { label: "Teacher D", subtitle: "Teacher · 3A", email: "teacher4@safeschool.dev", password: "password123" },
  { label: "SENCO A", subtitle: "SENCO", email: "senco@safeschool.dev", password: "password123" },
  { label: "Support Staff A", subtitle: "Support Staff", email: "support@safeschool.dev", password: "password123" },
] : [];

const PARENT_ACCOUNTS = IS_DEMO ? [
  { label: "Parent A", subtitle: "Parent of Boy A", email: "parent.a@safeschool.dev", password: "parent123" },
  { label: "Parent B", subtitle: "Parent of Boy B", email: "parent.b@safeschool.dev", password: "parent123" },
] : [];

const PTA_ACCOUNTS = IS_DEMO ? [
  { label: "PTA Chair A", subtitle: "PTA Chair", email: "pta.chair@safeschool.dev", password: "pta123" },
  { label: "PTA Member 1", subtitle: "PTA Member", email: "pta.member1@safeschool.dev", password: "pta123" },
] : [];

type PupilProfile = {
  loginKey: string;
  displayName: string;
  avatarType: string;
  avatarValue: string;
  yearGroup: string;
  className: string;
};

type PupilLoginStep = "school" | "accessCode" | "selectProfile" | "enterPin";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();
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
        const accounts = STAFF_ACCOUNTS;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = selected?.password || password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name or enter your credentials.");
          return;
        }
        res = await staffLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
      } else if (activeTab === "parent") {
        const accounts = PARENT_ACCOUNTS;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = selected?.password || password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name or enter your credentials.");
          return;
        }
        res = await parentLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
      } else {
        const accounts = PTA_ACCOUNTS;
        const selected = accounts.find(a => a.email === selectedStaffEmail);
        const loginEmail = selected?.email || email;
        const loginPassword = selected?.password || password;
        if (!loginEmail || !loginPassword) {
          setError("Please select your name or enter your credentials.");
          return;
        }
        res = await staffLogin.mutateAsync({
          data: { email: loginEmail, password: loginPassword }
        });
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
    setPupilStep("school");
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
          <p className="mt-3 text-muted-foreground text-lg">A safe space to speak up and seek help.</p>
        </motion.div>

        <Card className="shadow-2xl shadow-primary/5 border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="grid grid-cols-4 p-1.5 gap-1 border-b border-border/50 bg-muted/30" role="tablist" aria-label="Login type">
            {[
              { id: "pupil" as const, label: "Pupil", icon: User },
              { id: "staff" as const, label: "Staff", icon: GraduationCap },
              { id: "parent" as const, label: "Parent", icon: Users },
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
                      <Label htmlFor="school">My School</Label>
                      <select
                        id="school"
                        value={selectedSchoolId}
                        onChange={e => { setSelectedSchoolId(e.target.value); }}
                        className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                        required
                      >
                        <option value="">Select your school...</option>
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
                      Next
                    </Button>
                  </motion.div>
                )}

                {pupilStep === "accessCode" && (
                  <motion.div key="accessCode" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <button type="button" onClick={() => setPupilStep("school")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft size={14} /> Back
                    </button>
                    <div className="text-center py-2">
                      <Lock size={32} className="mx-auto text-primary/60 mb-2" />
                      <p className="text-sm text-muted-foreground">Enter the school access code your teacher gave you</p>
                    </div>
                    <div>
                      <Label htmlFor="accessCode">School Access Code</Label>
                      <Input
                        id="accessCode"
                        type="text"
                        placeholder="e.g. MORNA2025"
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
                      {pupilLoading ? "Checking..." : "Enter"}
                    </Button>
                  </motion.div>
                )}

                {pupilStep === "selectProfile" && (
                  <motion.div key="selectProfile" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    <button type="button" onClick={resetPupilFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ArrowLeft size={14} /> Start over
                    </button>
                    <p className="text-sm font-semibold text-center">Find your name</p>
                    <Input
                      type="text"
                      placeholder="Search by name..."
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
                      <ArrowLeft size={14} /> Change name
                    </button>
                    <div className="text-center py-2">
                      <span className="text-4xl block mb-2">{selectedProfile.avatarValue || "👤"}</span>
                      <p className="font-bold text-lg">{selectedProfile.displayName}</p>
                      <p className="text-xs text-muted-foreground">{selectedProfile.className || selectedProfile.yearGroup}</p>
                    </div>
                    <form onSubmit={handlePupilPinSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="pin">Secret PIN</Label>
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
                        {pupilLoading ? "Signing in..." : "Sign In securely"}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <form onSubmit={handleStaffSubmit} className="space-y-5">
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  {(() => {
                    const accounts = activeTab === "parent" ? PARENT_ACCOUNTS : activeTab === "pta" ? PTA_ACCOUNTS : STAFF_ACCOUNTS;
                    const selectedAccount = accounts.find(a => a.email === selectedStaffEmail);
                    const hasAccounts = accounts.length > 0;
                    return (
                      <>
                        {hasAccounts && (
                          <div>
                            <Label htmlFor="staffSelect">My Name</Label>
                            <select
                              id="staffSelect"
                              value={selectedStaffEmail}
                              onChange={e => {
                                setSelectedStaffEmail(e.target.value);
                                setEmail("");
                                setPassword("");
                              }}
                              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="">Find my name...</option>
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
                                <span>or enter manually</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                            )}
                            <div>
                              <Label htmlFor="email">Email Address</Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="name@school.edu"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                              />
                            </div>
                            <div>
                              <Label htmlFor="password">Password</Label>
                              <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                              />
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </motion.div>

                <Button type="submit" size="lg" className="w-full mt-6" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign In securely"}
                </Button>
              </form>
            )}

            {IS_DEMO && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={!!demoLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {demoLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      Starting demo...
                    </>
                  ) : (
                    <>
                      <Play size={16} className="fill-primary/20" />
                      {activeTab === "pupil" ? "Show me around" : activeTab === "parent" ? "Show me around as a parent" : activeTab === "pta" ? "Show me around as PTA" : "Show me around as staff"}
                    </>
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Link href="/newsletter">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white shadow-lg shadow-teal-200/50 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">Bring safeskoolz to your school</p>
                <p className="text-sm text-teal-100 mt-0.5">Schools & authorities — sign up to our newsletter and register your interest</p>
              </div>
              <ChevronRight size={20} className="text-teal-200 flex-shrink-0" />
            </div>
          </motion.div>
        </Link>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Protected by safeskoolz. Your reports are confidential.
        </p>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          Powered by Cloudworkz
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button, Input, Label } from "@/components/ui-polished";
import { User, Save, CheckCircle2, Mail, BookOpen, GraduationCap, Moon, Sun, Monitor, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

type ThemePref = "light" | "dark" | "system";

function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    return (localStorage.getItem("safeschool_theme") as ThemePref) || "light";
  });

  useEffect(() => {
    const isDark = pref === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    localStorage.setItem("safeschool_theme", p);
    setPrefState(p);
  };

  return { pref, setPref };
}

const ANIMAL_AVATARS = [
  { value: "\uD83E\uDD8A", label: "Fox" },
  { value: "\uD83D\uDC3B", label: "Bear" },
  { value: "\uD83D\uDC2C", label: "Dolphin" },
  { value: "\uD83E\uDD8B", label: "Butterfly" },
  { value: "\uD83D\uDC27", label: "Penguin" },
  { value: "\uD83E\uDD81", label: "Lion" },
  { value: "\uD83D\uDC28", label: "Koala" },
  { value: "\uD83D\uDC3A", label: "Wolf" },
  { value: "\uD83D\uDC36", label: "Dog" },
  { value: "\uD83D\uDC31", label: "Cat" },
  { value: "\uD83E\uDD84", label: "Unicorn" },
  { value: "\uD83D\uDC22", label: "Turtle" },
  { value: "\uD83E\uDD89", label: "Owl" },
  { value: "\uD83D\uDC38", label: "Frog" },
  { value: "\uD83D\uDC3C", label: "Panda" },
  { value: "\uD83E\uDD8E", label: "Lizard" },
];

export default function Settings() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarValue, setAvatarValue] = useState(user?.avatarValue || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { pref: themePref, setPref: setThemePref } = useTheme();

  const isPupil = user?.role === "pupil";

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      if (firstName !== user?.firstName) body.firstName = firstName;
      if (lastName !== user?.lastName) body.lastName = lastName;
      if (!isPupil && email !== user?.email) body.email = email;
      if (avatarValue !== user?.avatarValue) {
        body.avatarType = "animal";
        body.avatarValue = avatarValue;
      }

      if (Object.keys(body).length === 0) {
        setSaved(true);
        setIsSaving(false);
        return;
      }

      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">{t("settings")}</h1>
        <p className="text-muted-foreground mt-2">
          {isPupil ? t("changeNameOrAvatar") : t("updateProfile")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 space-y-8">
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
              {avatarValue || user.firstName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
              {user.className && (
                <p className="text-xs text-muted-foreground mt-0.5">Class {user.className}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={20} className="text-primary" />
              {t("editProfile")}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t("firstName")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={t("yourFirstName")}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t("lastName")}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={t("yourLastName")}
                  />
                </div>
              </div>

              {!isPupil && (
                <div>
                  <Label htmlFor="email">
                    <Mail size={14} className="inline mr-1" />
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t("yourEmail")}
                  />
                </div>
              )}
            </div>
          </div>

          {isPupil && (
            <div>
              <h3 className="text-lg font-bold mb-4">{t("pickYourAvatar")}</h3>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {ANIMAL_AVATARS.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAvatarValue(a.value)}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                      avatarValue === a.value
                        ? "border-primary bg-primary/10 scale-110"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{a.value}</span>
                    <span className="text-[9px] font-medium text-muted-foreground mt-0.5">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            {error && (
              <p className="text-destructive text-sm font-medium flex-1">{error}</p>
            )}
            {saved && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-primary text-sm font-medium flex items-center gap-1 flex-1"
              >
                <CheckCircle2 size={16} /> {t("saved")}
              </motion.p>
            )}
            <div className="flex-1" />
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
              {isSaving ? t("common:saving") : (
                <>
                  <Save size={16} className="mr-2" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {themePref === "dark" ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
              {t("appearance")}
            </h3>
            <div className="flex gap-2">
              {([
                { value: "light" as ThemePref, label: t("light"), icon: Sun },
                { value: "dark" as ThemePref, label: t("dark"), icon: Moon },
                { value: "system" as ThemePref, label: t("system"), icon: Monitor },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setThemePref(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    themePref === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-muted-foreground mb-3">{t("accountDetails")}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap size={14} />
                <span>{t("role")} <span className="font-medium text-foreground capitalize">{user.role.replace("_", " ")}</span></span>
              </div>
              {user.yearGroup && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen size={14} />
                  <span>{t("year")} <span className="font-medium text-foreground">{user.yearGroup}</span></span>
                </div>
              )}
              {user.className && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen size={14} />
                  <span>{t("class")} <span className="font-medium text-foreground">{user.className}</span></span>
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail size={14} />
                  <span className="font-medium text-foreground truncate">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(user.role === "coordinator" || user.role === "head_teacher") && <MfaPanel />}
    </div>
  );
}

// T11: minimal MFA enrolment panel for coordinator + head_teacher. Shows the
// QR/secret, accepts the verification code, and reveals backup codes once.
function MfaPanel() {
  const apiBase = (() => {
    const b = import.meta.env.BASE_URL || "/";
    return b.endsWith("/") ? b : b + "/";
  })();
  const token = localStorage.getItem("safeschool_token") || "";
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [qr, setQr] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const startSetup = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/setup`, { method: "POST", headers: authHeaders });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data?.error || "Setup failed.");
        return;
      }
      setQr(data.qrDataUrl);
      setOtpauth(data.otpauth);
    } finally {
      setBusy(false);
    }
  };

  const verifySetup = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/verify-setup`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data?.error || "Invalid code.");
        return;
      }
      setBackupCodes(data.backupCodes);
      setQr(null);
      setOtpauth(null);
      setVerifyCode("");
      setMsg("MFA enabled. Save your backup codes — they will not be shown again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/disable`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data?.error || "Could not disable MFA.");
        return;
      }
      setDisableCode("");
      setBackupCodes(null);
      setMsg("MFA disabled.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h2 className="text-lg font-bold">Two-factor authentication</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Use an authenticator app (Google Authenticator, Authy, 1Password, …) for an extra layer of security.
        </p>

        {!qr && !backupCodes && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={startSetup} disabled={busy}>Set up MFA</Button>
            <div className="flex-1 min-w-[240px] flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="disableCode">Disable (enter current code)</Label>
                <Input id="disableCode" value={disableCode} onChange={e => setDisableCode(e.target.value)} placeholder="123456" />
              </div>
              <Button variant="ghost" onClick={disable} disabled={busy || !disableCode}>Disable</Button>
            </div>
          </div>
        )}

        {qr && (
          <div className="space-y-3">
            <p className="text-sm">Scan this QR with your authenticator app, then enter the 6-digit code.</p>
            <img src={qr} alt="MFA QR code" className="border rounded-lg w-48 h-48" />
            {otpauth && (
              <p className="text-xs break-all text-muted-foreground">
                Or enter this URI manually: <code>{otpauth}</code>
              </p>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="verifyCode">Verification code</Label>
                <Input id="verifyCode" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="123456" />
              </div>
              <Button onClick={verifySetup} disabled={busy || verifyCode.length < 6}>Enable</Button>
            </div>
          </div>
        )}

        {backupCodes && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Backup codes (save these now)</p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
              {backupCodes.map(c => <li key={c} className="p-2 bg-muted rounded">{c}</li>)}
            </ul>
            <p className="text-xs text-muted-foreground">Each code works once. They will not be shown again.</p>
          </div>
        )}

        {msg && <p className="text-sm">{msg}</p>}
      </CardContent>
    </Card>
  );
}

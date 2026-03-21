import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Button, Input, Label } from "@/components/ui-polished";
import { User, Save, CheckCircle2, Mail, BookOpen, GraduationCap, Moon, Sun, Monitor } from "lucide-react";
import { motion } from "framer-motion";

type ThemePref = "light" | "dark" | "system";

function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    return (localStorage.getItem("safeschool_theme") as ThemePref) || "system";
  });

  useEffect(() => {
    const apply = (p: ThemePref) => {
      const isDark = p === "dark" || (p === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply(pref);
    if (pref === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
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
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          {isPupil ? "Change your name or pick a new avatar" : "Update your profile information"}
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
              Edit Profile
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              {!isPupil && (
                <div>
                  <Label htmlFor="email">
                    <Mail size={14} className="inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@school.dev"
                  />
                </div>
              )}
            </div>
          </div>

          {isPupil && (
            <div>
              <h3 className="text-lg font-bold mb-4">Pick Your Avatar</h3>
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
                <CheckCircle2 size={16} /> Saved
              </motion.p>
            )}
            <div className="flex-1" />
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
              {isSaving ? "Saving..." : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {themePref === "dark" ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
              Appearance
            </h3>
            <div className="flex gap-2">
              {([
                { value: "light" as ThemePref, label: "Light", icon: Sun },
                { value: "dark" as ThemePref, label: "Dark", icon: Moon },
                { value: "system" as ThemePref, label: "System", icon: Monitor },
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
            <h3 className="text-sm font-bold text-muted-foreground mb-3">Account Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap size={14} />
                <span>Role: <span className="font-medium text-foreground capitalize">{user.role.replace("_", " ")}</span></span>
              </div>
              {user.yearGroup && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen size={14} />
                  <span>Year: <span className="font-medium text-foreground">{user.yearGroup}</span></span>
                </div>
              )}
              {user.className && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen size={14} />
                  <span>Class: <span className="font-medium text-foreground">{user.className}</span></span>
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
    </div>
  );
}

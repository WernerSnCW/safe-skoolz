import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useStaffLogin } from "@workspace/api-client-react";
import { Button, Input, Label, Card } from "@/components/ui-polished";
import { ShieldCheck, ArrowLeft, Lock, Play } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const staffLogin = useStaffLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const apiBase = (() => {
    const b = (import.meta as any).env?.BASE_URL || "/";
    return b.endsWith("/") ? b : b + "/";
  })();

  useEffect(() => {
    fetch(`${apiBase}api/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.demoEnabled) setDemoEnabled(true);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res: any = await staffLogin.mutateAsync({
        data: { email, password },
      });
      if (res?.requiresMfa && res?.mfaToken) {
        setMfaToken(res.mfaToken as string);
        return;
      }
      setToken(res.token);
      setLocation("/admin");
    } catch (err: any) {
      const data = err?.data || err?.response?.data;
      setError(
        data?.message ||
          data?.error ||
          "Sign-in failed. Please check your email and password."
      );
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMfaSubmitting(true);
    try {
      const r = await fetch(`${apiBase}api/auth/mfa/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, code: mfaCode }),
      });
      const data = await r.json();
      if (!r.ok || !data.token) {
        setError(data?.error || "Invalid code. Please try again.");
        return;
      }
      setToken(data.token);
      setLocation("/admin");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError("");
    setDemoLoading(true);
    try {
      const r = await fetch(`${apiBase}api/auth/demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "coordinator" }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error || "Demo sign-in failed.");
        setDemoLoading(false);
        return;
      }
      setToken(data.token);
      setLocation("/admin");
    } catch {
      setError("Could not start the admin demo. Please try again.");
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col justify-center px-4 py-10 relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 self-start"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to main sign-in
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-xl shadow-primary/20 mb-6 text-white">
            <ShieldCheck size={40} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Admin sign-in
          </h1>
          <p className="mt-3 text-muted-foreground">
            For the appointed Data Controller
          </p>
        </div>

        <Card className="shadow-2xl shadow-primary/5 border-border/50 bg-background/80 backdrop-blur-xl p-6 sm:p-8">
          {mfaToken ? (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-mfa">Two-factor code</Label>
                <Input
                  id="admin-mfa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={mfaSubmitting}>
                {mfaSubmitting ? "Verifying…" : "Verify"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@yourschool.org"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={staffLogin.isPending}
              >
                <Lock size={14} className="mr-1.5" aria-hidden="true" />
                {staffLogin.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {demoEnabled && !mfaToken && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  or
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                type="button"
                onClick={handleDemo}
                disabled={demoLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 border border-primary/30"
              >
                {demoLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    Opening admin demo…
                  </>
                ) : (
                  <>
                    <Play
                      size={14}
                      className="fill-primary/20"
                      aria-hidden="true"
                    />
                    Use demo coordinator account
                  </>
                )}
              </button>
            </>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          Access is restricted to the appointed Designated Safeguarding Lead and
          Data Controller. All sign-ins are logged.
        </p>
      </div>
    </div>
  );
}

import { useState, useMemo, type FormEvent } from "react";
import { useLocation, Link } from "wouter";
import { Button, Input, Label, Card, CardContent } from "@/components/ui-polished";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [_loc, setLocation] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const base = import.meta.env.BASE_URL;

  function localValidate(): string | null {
    if (pw.length < 12) return "Password must be at least 12 characters.";
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain a letter and a digit.";
    if (pw !== pw2) return "Passwords do not match.";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = localValidate();
    if (v) { setErr(v); return; }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${base}api/auth/password-reset/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      if (res.status === 200) {
        setDone(true);
        setTimeout(() => setLocation("/login"), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        setErr(body.error ?? "Could not reset password. The link may be invalid or expired.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <h1 className="text-xl font-semibold">Reset password</h1>
            <p className="text-sm text-destructive">Missing reset token.</p>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Request a new link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold">Choose a new password</h1>
          </div>

          {done ? (
            <p className="text-sm text-success">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-sm text-slate-600">
                Use at least 12 characters with one letter and one digit.
              </p>
              <div>
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pw2">Confirm new password</Label>
                <Input id="pw2" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving…" : "Update password"}
              </Button>
              <Link href="/login" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

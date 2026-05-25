import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Button, Input, Label, Card, CardContent } from "@/components/ui-polished";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const base = import.meta.env.BASE_URL;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${base}api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Per security contract the server always 200s; ignore network errors here too.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold">Forgot password</h1>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                If that email matches a staff or parent account, we've sent a reset link. It will
                expire in 30 minutes and can only be used once.
              </p>
              <Link href="/login" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter the email address on your Safeskoolz account. We'll send a link to reset
                your password.
              </p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.example"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending…" : "Send reset link"}
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

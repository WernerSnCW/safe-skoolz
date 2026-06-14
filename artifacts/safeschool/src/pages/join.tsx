import { useState } from "react";
import { useLocation } from "wouter";
import { useGetJoinSummary, useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

export default function JoinPage({ slug }: { slug: string }) {
  const q = useGetJoinSummary(slug);
  const signup = useSignup();
  const { setToken } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  // Chapter 2 (spec §3): the Delegated Voice mandate. Joining IS the authorisation;
  // the checkbox is default-on and a condition of joining (cannot submit unticked).
  // Copy is placeholder — Tom-owned (content audit).
  const [mandateConfirmed, setMandateConfirmed] = useState(true);
  const [wasPtaMember, setWasPtaMember] = useState(false);

  const data = q.data as any;
  const onSubmit = async () => {
    setErr(null);
    try {
      const res = (await signup.mutateAsync({ data: { email: email.trim(), password, name: name.trim() || undefined, schoolSlug: slug, wasPtaMember } })) as any;
      setToken(res.token);
      setLocation("/");
    } catch (e: any) {
      setErr(e?.data?.error ?? "Sign-up failed — please try again.");
    }
  };

  if (q.isLoading) {
    return <AppShell><div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  if (q.isError || (q.data && !(q.data as any).schoolName)) {
    return <AppShell><div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">School not found</h1></div></AppShell>;
  }

  return (
    <AppShell>
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-primary">{data?.voiceName ?? "Vibes"}</div>
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold text-foreground">How is {data?.schoolName ?? "your school"} really doing?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Join the parents asking the school and PTA to act.</p>
        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">By joining, you authorise {data?.voiceName ?? "Vibes"} to contact your school about two things on your behalf:</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Ask the school to adopt VBE</strong> — embed a values-based education framework.</span></div>
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Ask the PTA to give every parent a voice</strong> — adopt a structure that represents every family.</span></div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={mandateConfirmed} onChange={(e) => setMandateConfirmed(e.target.checked)} aria-label="Confirm the mandate" />
            <span>I authorise this on these two topics only. (You can leave any time.)</span>
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={wasPtaMember} onChange={(e) => setWasPtaMember(e.target.checked)} aria-label="I am currently a PTA member" />
            <span>I'm currently a member of the school's PTA.</span>
          </label>
        </div>
        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {data?.joinCount ?? 0} {data?.joinCount === 1 ? "family has" : "families have"} joined
          </span>
        </div>
        <div className="mt-5 space-y-2">
          <input className={inputCls} type="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Your name (optional)" aria-label="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Create a password" aria-label="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <button
          type="button"
          disabled={!email.trim() || password.length < 8 || signup.isPending || !mandateConfirmed}
          onClick={onSubmit}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {signup.isPending ? "Signing up…" : `Sign up & join ${data?.voiceName ?? "Vibes"}`}
        </button>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <a href="/login" className="hover:underline">Already joined? Log in</a>
          <a href="/find-school" className="hover:underline">Different school?</a>
        </div>
      </div>
    </div>
    </AppShell>
  );
}

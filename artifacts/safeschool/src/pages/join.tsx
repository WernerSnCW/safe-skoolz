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
          <div className="font-display text-2xl font-bold text-primary">{data?.voiceName ?? "vibez"}</div>
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold text-foreground">Bring values-based education to {data?.schoolName ?? "your school"}.</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Join the families helping {data?.schoolName ?? "your school"} adopt values-based education and give every parent a voice.</p>
        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">By joining, you ask {data?.voiceName ?? "vibez"} to speak to your school about two things on your behalf — and nothing else:</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Adopt values-based education (VBE)</strong> — a whole-school approach built around shared values.</span></div>
            <div className="flex items-start gap-2 text-sm"><span className="mt-0.5 text-primary">●</span> <span><strong>Run the PTA openly</strong> — adopt a fair, open structure so every family has a voice.</span></div>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={mandateConfirmed} onChange={(e) => setMandateConfirmed(e.target.checked)} aria-label="Confirm the mandate" />
            <span>I authorise {data?.voiceName ?? "vibez"} to speak for me on these two things only. I can withdraw at any time.</span>
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={wasPtaMember} onChange={(e) => setWasPtaMember(e.target.checked)} aria-label="I am currently a PTA member" />
            <span>I'm currently a member of {data?.schoolName ?? "your school"}'s PTA.</span>
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
          {signup.isPending ? "Signing up…" : `Sign up & join ${data?.voiceName ?? "vibez"}`}
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

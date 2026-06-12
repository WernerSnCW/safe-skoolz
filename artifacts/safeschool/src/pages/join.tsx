import { useState } from "react";
import { useLocation } from "wouter";
import { useGetJoinSummary, useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

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

  const data = q.data as any;
  const onSubmit = async () => {
    setErr(null);
    try {
      const res = (await signup.mutateAsync({ data: { email: email.trim(), password, name: name.trim() || undefined, schoolSlug: slug } })) as any;
      setToken(res.token);
      setLocation("/");
    } catch (e: any) {
      setErr(e?.data?.error ?? "Sign-up failed — please try again.");
    }
  };

  if (q.isLoading) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }

  if (q.isError || (q.data && !(q.data as any).schoolName)) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">School not found</h1></div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-primary">{data?.voiceName ?? "Vibes"}</div>
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold text-foreground">How is {data?.schoolName ?? "your school"} really doing?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Join the parents asking the school and PTA to act.</p>
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-sm"><span className="text-primary">●</span> Ask the school to adopt VBE</div>
          <div className="flex items-center gap-2 text-sm"><span className="text-primary">●</span> Ask the PTA to give every parent a voice</div>
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
          disabled={!email.trim() || password.length < 8 || signup.isPending}
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
  );
}

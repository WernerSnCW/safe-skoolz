import { useState } from "react";
import { useSubmitConcern, useListConcerns, useSetConcernStatus } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui-polished";

const EXEC_ROLES = ["pta", "coordinator", "head_teacher"];

const PATTERNS = [
  "Group conduct — harm done by a group acting together, often with a less-visible ringleader and plausible deniability.",
  "Social exclusion — deliberate leaving-out done through signals and silences rather than visible acts.",
  "Status-based targeting — money, clothes and possessions used as a vector for cruelty.",
  "Age-inappropriate conduct — behaviour or content imported from outside, beyond what's appropriate for the age.",
  "Bystander passivity — children witnessing harm and feeling unable to speak up.",
  "Isolation in a transient community — arriving knowing no one, or losing friends when families move on.",
];

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

function TriageList() {
  const q = useListConcerns();
  const setStatus = useSetConcernStatus();
  const data = q.data as any;

  const onSet = async (id: string, status: string) => {
    try {
      await setStatus.mutateAsync({ id, data: { status } });
      await q.refetch();
    } catch {
      // surfaced inline below via setStatus.isError
    }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading concerns…</p>;
  if (q.isError) return <p className="text-sm text-destructive">Couldn't load concerns.</p>;

  const concerns = (data?.concerns ?? []) as Array<{ id: string; body: string; status: string; createdAt: string; firstName: string; lastName: string }>;

  return (
    <div className="space-y-3">
      {setStatus.isError && <p className="text-sm text-destructive">Couldn't update that concern — please try again.</p>}
      {concerns.length === 0 && <p className="text-sm text-muted-foreground">No concerns raised yet.</p>}
      {concerns.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{c.firstName} {c.lastName}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{c.status}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
          <div className="mt-3 flex gap-2">
            {["reviewed", "actioned", "dismissed"].map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                disabled={setStatus.isPending || c.status === s}
                onClick={() => onSet(c.id, s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConcernsPage() {
  const { user } = useAuth();
  const submit = useSubmitConcern();
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isExec = !!user && EXEC_ROLES.includes(user.role);

  const onSubmit = async () => {
    setErr(null);
    try {
      await submit.mutateAsync({ data: { body: body.trim() } });
      setBody("");
      setDone(true);
    } catch (e: any) {
      setErr(e?.data?.error ?? "Couldn't submit your concern — please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Community concerns</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is the parent community's concern channel — raised to the Vibes coalition and PTA. It is separate from the
        school's formal safeguarding reporting line. If a child is at risk, always use the school's official route.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">The behaviour patterns we watch for</h2>
        <ol className="mt-3 space-y-2">
          {PATTERNS.map((p, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm text-foreground">
              <span className="font-semibold text-primary">{i + 1}.</span>
              <span>{p.replace(/^\d+\.\s*/, "")}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Raise your own concern</h2>
        {done ? (
          <div className="mt-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-foreground">Thank you — your concern has been shared with the coalition.</p>
            <Button type="button" variant="outline" onClick={() => setDone(false)} className="mt-3">
              Raise another
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <textarea
              className={`${inputCls} min-h-[120px]`}
              placeholder="Describe what you've noticed…"
              aria-label="Describe your concern"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button
              type="button"
              disabled={!body.trim() || submit.isPending}
              onClick={onSubmit}
            >
              {submit.isPending ? "Submitting…" : "Submit concern"}
            </Button>
          </div>
        )}
      </section>

      {isExec && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-foreground">Triage — concerns raised by the community</h2>
          <div className="mt-3">
            <TriageList />
          </div>
        </section>
      )}
    </div>
  );
}

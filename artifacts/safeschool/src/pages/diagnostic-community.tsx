import { useMemo, useState } from "react";
import { useGetCommunityDiagnostic, useSubmitCommunityDiagnostic } from "@workspace/api-client-react";
import { AppShell } from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, ShieldCheck, Check } from "lucide-react";

// Public community diagnostic — the Classlist link (/d/:slug). No login.
// Answers are stored unlinkably from the email (spec §4.2): the email gates
// the submission, never tags the answers. Plain elements only — no framer
// enter-animations (prod-blank gotcha).

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const YEAR_GROUPS = [
  "Nursery", "Reception",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13",
];

export default function CommunityDiagnosticPage({ slug }: { slug: string }) {
  const q = useGetCommunityDiagnostic(slug);
  const submit = useSubmitCommunityDiagnostic();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeTexts, setFreeTexts] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [classOrTeacher, setClassOrTeacher] = useState("");
  const [done, setDone] = useState<null | { count: number }>(null);
  const [err, setErr] = useState<string | null>(null);

  const survey = q.data as any;
  const sections = useMemo(() => {
    const out: { section: string; questions: any[] }[] = [];
    for (const question of survey?.questions ?? []) {
      const last = out[out.length - 1];
      if (last && last.section === question.section) last.questions.push(question);
      else out.push({ section: question.section, questions: [question] });
    }
    return out;
  }, [survey]);

  // Mirror the server's completeness rule: every non-optional question must be
  // answered (scale → an option picked; text → non-empty), instrument-driven.
  const requiredScale = (survey?.questions ?? []).filter((x: any) => x.type === "scale" && !x.optional);
  const requiredText = (survey?.questions ?? []).filter((x: any) => x.type === "text" && !x.optional);
  const answeredAll =
    requiredScale.every((x: any) => answers[x.key] != null) &&
    requiredText.every((x: any) => freeTexts[x.key]?.trim());

  const onSubmit = async () => {
    setErr(null);
    try {
      const payload = {
        email: email.trim(),
        name: name.trim() || undefined,
        yearGroup: yearGroup || undefined,
        classOrTeacher: classOrTeacher.trim() || undefined,
        answers: [
          ...Object.entries(answers).map(([questionKey, answer]) => ({ questionKey, answer })),
          ...Object.entries(freeTexts)
            .filter(([, v]) => v.trim())
            .map(([questionKey, freeText]) => ({ questionKey, freeText: freeText.trim() })),
        ],
      };
      const r = (await submit.mutateAsync({ slug, data: payload })) as any;
      setDone({ count: r.count });
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      // The shared client throws ApiError: parsed body on .data, status on .status.
      setErr(
        e?.data?.error ??
          (e?.status === 409
            ? "This email address has already taken part."
            : "Something went wrong — please try again."),
      );
    }
  };

  if (q.isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (!survey) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Survey not found</h1>
        </div>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-foreground">
            You're counted — #{done.count}.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Check your email: we've sent you a link to create your account. When the results are
            released, every participant will see them — and you'll be notified.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Know another family at the school? Share the link — every voice makes the picture clearer.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="border-b border-border/60 bg-accent/40">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Community diagnostic
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {survey.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Run by the parent community. Your answers are anonymous —{" "}
            <span className="font-semibold text-foreground">
              they cannot be traced back to your email, even by us.
            </span>{" "}
            Results are shared with every participant. And this is the start of the record: once
            tracking begins, parents can follow reported bullying and the school's responses over
            time.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              <Users className="h-4 w-4" />
              {survey.submissionCount} {survey.submissionCount === 1 ? "family has" : "families have"} taken part
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> One submission per email · ~5 minutes
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl space-y-10 px-4 py-10 sm:px-6">
        {sections.map((s) => (
          <div key={s.section}>
            <h2 className="font-display text-lg font-bold text-foreground">{s.section}</h2>
            <div className="mt-4 space-y-6">
              {s.questions.map((question: any) =>
                question.type === "text" ? (
                  <div key={question.key}>
                    <p className="text-sm font-medium text-foreground">{question.text}</p>
                    <textarea
                      rows={4}
                      className={cn(inputCls, "mt-2")}
                      value={freeTexts[question.key] ?? ""}
                      onChange={(e) => setFreeTexts((p) => ({ ...p, [question.key]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div key={question.key}>
                    <p className="text-sm font-medium text-foreground">{question.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(question.options ?? []).map((opt: string, i: number) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((p) => ({ ...p, [question.key]: i }))}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                            answers[question.key] === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground">About your family (optional)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Helps the community see results by year group. Stored with your anonymous answers, never
            with your email.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <select className={inputCls} value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
              <option value="">Year group (optional)</option>
              {YEAR_GROUPS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Class or teacher (optional)"
              value={classOrTeacher}
              onChange={(e) => setClassOrTeacher(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-display text-lg font-bold text-foreground">You're almost counted</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One submission per email. Your email gates the submission — it is never attached to
            your answers.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              className={inputCls}
              type="email"
              placeholder="Email (required)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          <button
            type="button"
            disabled={!email.trim() || !answeredAll || submit.isPending}
            onClick={onSubmit}
            className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full disabled:opacity-60")}
          >
            {submit.isPending ? "Submitting…" : "Submit — be counted"}
          </button>
          {!answeredAll && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Answer every scale question to submit (the open question is optional).
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

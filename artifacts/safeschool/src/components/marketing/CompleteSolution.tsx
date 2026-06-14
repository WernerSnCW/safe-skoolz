import { Shield, Users, Vote, School } from "lucide-react";

const STAKEHOLDERS: { icon: typeof Shield; title: string; body: string }[] = [
  { icon: Shield, title: "Children", body: "Report safely, learn the values, and have a voice in their school." },
  { icon: Users, title: "Parents", body: "Stay informed, raise concerns, and back the change — from anywhere." },
  { icon: Vote, title: "The PTA", body: "Operate with real structure: membership, voting, goals, tracked initiatives." },
  { icon: School, title: "The school", body: "Keep safeguarding on record, embed VBE, and respond with evidence." },
];

// The complete-solution story: one VBE operating system for the whole community,
// not a survey or a funnel. Always shown (broad) regardless of audience.
export function CompleteSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          The complete solution
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          One operating system for the whole community
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          VBE works when everyone is part of it. vibez brings all four together —
          switched on for your community as your school adopts VBE.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STAKEHOLDERS.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <s.icon className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

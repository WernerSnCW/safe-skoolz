import { useState } from "react";
import { useSearchSchools, useRequestSchoolCreate } from "@workspace/api-client-react";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

export default function FindSchoolPage() {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useSearchSchools({ q }, { query: { enabled: q.length > 0 } });

  // Request-to-create form state.
  const createReq = useRequestSchoolCreate();
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [reqErr, setReqErr] = useState<string | null>(null);
  const [reqDone, setReqDone] = useState(false);

  const results = (search.data as any)?.schools as
    | Array<{ slug?: string | null; name: string; hasVibes: boolean }>
    | undefined;

  const submitRequest = async () => {
    setReqErr(null);
    try {
      await createReq.mutateAsync({ data: { schoolName: schoolName.trim(), email: email.trim() } });
      setReqDone(true);
    } catch (e: any) {
      setReqErr(e?.data?.error ?? "Couldn't submit your request — please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-center font-display text-xl font-bold text-foreground">Find your school</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Search for your school to join the parents asking for change.
        </p>

        <div className="mt-5">
          <input
            className={inputCls}
            type="search"
            placeholder="Start typing your school's name…"
            aria-label="Search for your school"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-2">
          {q.length > 0 && search.isLoading && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {q.length > 0 && search.isError && (
            <p className="text-sm text-destructive">Search failed — please try again.</p>
          )}
          {q.length > 0 && !search.isLoading && !search.isError && results && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No schools found for “{q}”.</p>
          )}
          {results?.map((s) => (
            <a
              key={s.slug ?? s.name}
              href={s.slug ? `/join/${s.slug}` : "#"}
              className={`flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm ${s.slug ? "hover:bg-accent" : "pointer-events-none opacity-60"}`}
            >
              <span className="font-medium text-foreground">{s.name}</span>
              {s.hasVibes && (
                <span className="ml-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Has a Vibes
                </span>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Can't find your school?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Request to create a Vibes for your school and we'll be in touch.
        </p>
        {reqDone ? (
          <p className="mt-4 rounded-md bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
            Thanks — your request has been received. We'll email you at {email.trim()}.
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              <input
                className={inputCls}
                placeholder="Your school's name"
                aria-label="Your school's name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              <input
                className={inputCls}
                type="email"
                placeholder="Your email"
                aria-label="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {reqErr && <p className="mt-3 text-sm text-destructive">{reqErr}</p>}
            <button
              type="button"
              disabled={!schoolName.trim() || !email.trim() || createReq.isPending}
              onClick={submitRequest}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {createReq.isPending ? "Submitting…" : "Request to create one"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useSearchSchools, useCreateSchool } from "@workspace/api-client-react";
import { AppShell } from "@/components/layout/AppShell";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

// Naive client-side slug preview; the server derives the authoritative unique slug.
function previewSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
}

export default function FindSchoolPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const qStr = query.trim();
  const search = useSearchSchools({ q: qStr }, { query: { enabled: qStr.length > 0 } });

  const createSchool = useCreateSchool();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);

  const results = (search.data as any)?.schools as
    | Array<{ slug?: string | null; name: string; hasVibes: boolean }>
    | undefined;

  const effectiveSlug = slugTouched ? slug : previewSlug(name);

  const onCreate = async () => {
    setCreateErr(null);
    try {
      const res = (await createSchool.mutateAsync({
        data: {
          name: name.trim(),
          slug: effectiveSlug || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
        },
      })) as any;
      // Creator now signs up (flat role=parent) at the new school's join page.
      setLocation(`/join/${res.school.slug}`);
    } catch (e: any) {
      setCreateErr(e?.data?.error ?? "Couldn't start your school — please try again.");
    }
  };

  return (
    <AppShell>
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
          {qStr.length > 0 && search.isLoading && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {qStr.length > 0 && search.isError && (
            <p className="text-sm text-destructive">Search failed — please try again.</p>
          )}
          {qStr.length > 0 && !search.isLoading && !search.isError && results && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No schools found for "{qStr}".</p>
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
        <h2 className="font-display text-lg font-bold text-foreground">Can't find your school? Start one</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You're not creating an admin account — you're starting the parent coalition for your school.
          Everyone who joins has the same right: to share and grow it.
        </p>
        <div className="mt-4 space-y-2">
          <input
            className={inputCls}
            placeholder="Your school's name"
            aria-label="Your school's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="block text-xs text-muted-foreground">
            Web address
            <div className="mt-1 flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/join/</span>
              <input
                className={inputCls}
                aria-label="Web address slug"
                value={effectiveSlug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
              />
            </div>
          </label>
          <input
            className={inputCls}
            placeholder="School / PTA contact name (optional)"
            aria-label="School or PTA contact name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <input
            className={inputCls}
            type="email"
            placeholder="School / PTA contact email (optional)"
            aria-label="School or PTA contact email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        {createErr && <p className="mt-3 text-sm text-destructive">{createErr}</p>}
        <button
          type="button"
          disabled={!name.trim() || createSchool.isPending}
          onClick={onCreate}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {createSchool.isPending ? "Starting…" : `Start the coalition for ${name.trim() || "your school"}`}
        </button>
      </div>
    </div>
    </AppShell>
  );
}

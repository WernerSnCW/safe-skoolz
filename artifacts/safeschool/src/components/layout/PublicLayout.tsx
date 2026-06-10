import { type ReactNode } from "react";
import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Public marketing shell (SchoolVBE — the free community funnel). Distinct from
// the authed AppLayout: no sidebar, no auth dependency, SSR-safe (no window /
// document / data fetching at render) so the prerender step can renderToString
// it at build time. "vibez" is the paid platform you log into from here.

const NAV: { label: string; href: string }[] = [
  { label: "How it works", href: "/how-it-works" },
  { label: "For schools", href: "/schools" },
  { label: "For parents", href: "/parents" },
  { label: "For PTAs", href: "/ptas" },
];

const FOOTER: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Explore",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "For schools", href: "/schools" },
      { label: "For parents", href: "/parents" },
      { label: "For PTAs", href: "/ptas" },
      { label: "Parent groups", href: "/coalitions" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Free resources", href: "/resources" },
      { label: "Illustrative case study", href: "/schools/case-study" },
      { label: "About", href: "/about" },
    ],
  },
  {
    heading: "Platform",
    links: [{ label: "Log in to vibez", href: "/login" }],
  },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="SchoolVBE home">
            <span className="font-display text-xl font-bold tracking-tight text-primary">
              SchoolVBE
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="transition-colors hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <span className="font-display text-lg font-bold text-primary">SchoolVBE</span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                New School Vibez, Old School Values
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Free tools for values-led school communities.
              </p>
            </div>
            {FOOTER.map((col) => (
              <div key={col.heading}>
                <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-border/60 pt-6 text-sm text-muted-foreground">
            © 2026 SchoolVBE. Everything here is free.
          </div>
        </div>
      </footer>
    </div>
  );
}

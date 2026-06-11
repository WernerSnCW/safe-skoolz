import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Search, ClipboardCheck, AlertTriangle, ClipboardList, ScrollText, Megaphone,
  MessageCircle, Home, Library, Settings, School, Users, Vote, ArrowRight,
} from "lucide-react";

// The global launcher — "get everywhere from anywhere". A ⌘K / Ctrl-K command
// palette (also opened by the sidebar trigger) that fires any action, jumps to
// any page, or opens any resource from any screen. Plain DOM + CSS, no
// framer-motion (enter-animations were unreliable in the prod build).

type Command = {
  group: "Do" | "Go to" | "Resources";
  label: string;
  icon: any;
  href: string;
  tag?: string;
  external?: boolean;
};

const COMMANDS: Command[] = [
  { group: "Do", label: "Initiate a VBE diagnostic", icon: ClipboardCheck, href: "/diagnostics", tag: "School" },
  { group: "Do", label: "Open a PTA vote", icon: Vote, href: "/pta/voting", tag: "PTA" },
  { group: "Do", label: "Log a PTA decision", icon: ScrollText, href: "/pta/decisions", tag: "PTA" },
  { group: "Do", label: "Post a PTA announcement", icon: Megaphone, href: "/pta/announcements", tag: "PTA" },
  { group: "Do", label: "Raise a concern", icon: AlertTriangle, href: "/report", tag: "Parent" },
  { group: "Do", label: "Send a message", icon: MessageCircle, href: "/messages" },
  { group: "Go to", label: "Home", icon: Home, href: "/" },
  { group: "Go to", label: "Resource Centre", icon: Library, href: "/resources-hub" },
  { group: "Go to", label: "Noticeboard", icon: Megaphone, href: "/learnings" },
  { group: "Go to", label: "Settings", icon: Settings, href: "/settings" },
  { group: "Resources", label: "VBE Adoption Pack", icon: School, href: "/schools", external: true },
  { group: "Resources", label: "Parent Guide to VBE", icon: Users, href: "/parents", external: true },
  { group: "Resources", label: "PTA Operating Pack", icon: Vote, href: "/ptas", external: true },
];

const GROUP_ORDER: Command["group"][] = ["Do", "Go to", "Resources"];

export function GlobalLauncher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K toggles; Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);

  const run = (c: Command) => {
    setOpen(false);
    if (c.external) {
      window.open(c.href, "_blank", "noopener");
    } else {
      setLocation(c.href);
    }
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); run(results[active]); }
  };

  let flatIndex = -1;

  return (
    <>
      {/* Sidebar trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search size={16} />
        <span className="flex-1 text-left">Search or do anything…</span>
        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">⌘K</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={18} className="text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onInputKey}
                placeholder="Search or do anything…"
                className="flex-1 bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">esc</span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches “{query}”.</p>
              )}
              {GROUP_ORDER.map((group) => {
                const items = results.filter((r) => r.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <p className="px-3 pb-1 pt-2 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground/70">{group}</p>
                    {items.map((c) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      return (
                        <button
                          key={c.label}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => run(c)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm",
                            active === idx ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          <c.icon size={16} className={active === idx ? "text-primary-foreground" : "text-muted-foreground"} />
                          <span className="flex-1">{c.label}</span>
                          {c.tag && (
                            <span className={cn("text-[10px] font-semibold", active === idx ? "text-primary-foreground/80" : "text-muted-foreground")}>{c.tag}</span>
                          )}
                          <ArrowRight size={14} className={active === idx ? "text-primary-foreground" : "text-muted-foreground/50"} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

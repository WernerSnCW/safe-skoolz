import { useState } from "react";
import { useTenant } from "@/providers/tenant";
import { useListVoice } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui-polished";
import { Share2, Copy, Check } from "lucide-react";

// Phase 4b (spec §4.2): "Tell your school" — share the /v/:id coalition link.
// Sharing-to-the-school IS the flat "build the coalition" action. WhatsApp / copy
// / mailto. Pre-addresses the captured school contact via mailto when present.
export function ShareSchoolCard() {
  const { tenant } = useTenant();
  const cap = (tenant?.capabilities ?? {}) as any;
  const q = useListVoice({ query: { enabled: !!cap.voice } as any });
  const [copied, setCopied] = useState(false);
  if (!cap.voice) return null;

  const voices = (q.data as any)?.voices ?? [];
  const lead = voices.find((v: any) => v.status === "advocating") ?? voices[0];
  if (!lead) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/v/${lead.id}`;
  const name = tenant?.displayName ?? "our school";
  const msg = `A parent coalition is forming for ${name}. Join us — every family makes the picture clearer: ${link}`;

  const copy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const mail = `mailto:?subject=${encodeURIComponent(`A parent coalition for ${name}`)}&body=${encodeURIComponent(msg)}`;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Share2 size={20} className="text-primary" aria-hidden /> Tell your school
      </h2>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{msg}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={wa} target="_blank" rel="noreferrer" className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">Share on WhatsApp</a>
            <a href={mail} className="rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-foreground">Email the school</a>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-foreground">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

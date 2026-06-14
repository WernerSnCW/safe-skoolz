// Single source of truth for tenant capability flags (spec §3.2). The SERVER
// resolves defaults and sends the complete map to clients, so the client never
// needs these defaults — no drift between client and server.
import type { School } from "@workspace/db";

export const CAPABILITY_KEYS = [
  "learn", "diagnostic", "voice", "membership", "results", "concerns", "pta",
  "safeguarding", "lessons", "behaviour",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
export type Capabilities = Record<CapabilityKey, boolean>;

// Default for an un-configured school: the community/PTA tier is on; the
// whole-school (deep app) capabilities are off until a school switches them on.
export const CAPABILITY_DEFAULTS: Capabilities = {
  learn: true, diagnostic: true, voice: true, membership: true,
  results: true, concerns: true, pta: true,
  safeguarding: false, lessons: false, behaviour: false,
};

/** Merge a school's stored capability overrides over the defaults. */
export function resolveCapabilities(stored: unknown): Capabilities {
  const out = { ...CAPABILITY_DEFAULTS };
  if (stored && typeof stored === "object") {
    for (const key of CAPABILITY_KEYS) {
      const v = (stored as Record<string, unknown>)[key];
      if (typeof v === "boolean") out[key] = v;
    }
  }
  return out;
}

/** The public, end-user-facing view of a tenant (no internal ids). */
export function tenantPublicView(school: School) {
  return {
    slug: school.slug,
    displayName: school.displayName ?? school.name,
    theme: (school.theme != null && typeof school.theme === "object" && !Array.isArray(school.theme)
      ? school.theme : {}) as Record<string, unknown>,
    capabilities: resolveCapabilities(school.capabilities),
  };
}

/**
 * Community-mode discriminator (spec §6 regression guard). A tenant is in
 * community mode when the whole-school (paid) capabilities are all OFF — i.e.
 * the school hasn't adopted. Community mode => open-join + flag/remove +
 * threshold-release. Whole-school mode (e.g. Riverside) keeps the existing
 * approve-then-display + manual exec release. Pass a school row or resolved caps.
 */
export function isCommunityMode(school: { capabilities?: unknown } | Capabilities): boolean {
  const caps =
    "safeguarding" in (school as any) && typeof (school as any).safeguarding === "boolean"
      ? (school as Capabilities)
      : resolveCapabilities((school as { capabilities?: unknown }).capabilities);
  return !caps.safeguarding && !caps.lessons && !caps.behaviour;
}

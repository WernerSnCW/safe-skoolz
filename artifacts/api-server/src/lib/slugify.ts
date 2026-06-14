// Phase 4b (spec §4.1): derive a URL-safe slug from a school name. Used by
// POST /api/schools; the result is surfaced to the creator and editable before
// commit. Mirrors the schools.slug column constraint (varchar 60, unique).

const MAX = 60;

/** lowercase, accent-fold, hyphenate, strip punctuation, cap at 60 chars. */
export function slugify(name: string): string {
  const s = String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/[''`]/g, "") // strip apostrophes/smart quotes before hyphenating
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, ""); // a mid-word cut could leave a trailing hyphen
  return s || "school";
}

/**
 * Resolve a collision-free slug. `exists(slug)` returns true if the slug is
 * already taken. Appends -2, -3 … (trimming the base so the suffix fits in 60).
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const trimmed = base.slice(0, MAX - suffix.length).replace(/-+$/g, "");
    const candidate = `${trimmed}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
}

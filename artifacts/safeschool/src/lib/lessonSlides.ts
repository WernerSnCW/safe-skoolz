// Shared slide parser for lesson delivery.
//
// Lesson `body` is authored as discrete markdown sections (see
// CURRICULUM_YEAR7.md / seedLessons.ts):
//
//   **Learning objectives:**
//   - ...
//
//   **Slide 1.** ...
//   **Slide 2.** ...
//
//   **Activity (60 seconds, silent, private):** ...
//
//   **Reflection:** ...
//
// Both the teacher Present mode and the pupil step-through render from the
// ordered slides this returns, so the two experiences stay in lockstep with
// the seeded content. No content is invented here — we only split what's
// already authored.

export type SlideKind = "objectives" | "content" | "activity" | "reflection";

export interface LessonSlide {
  kind: SlideKind;
  // Heading text exactly as authored in the body marker, e.g.
  // "Learning objectives", "Slide 1", "Activity (60 seconds, silent, private)",
  // "Reflection". For content slides this is positional ("Slide N") and the UI
  // typically shows the slide counter instead.
  heading: string;
  // Markdown body that follows the marker.
  body: string;
}

// Lookahead split: keep the marker with the segment that follows it. Only the
// known section keywords match, so inline **bold** inside slide prose is left
// untouched.
const SPLIT_RE =
  /(?=\*\*(?:Learning objectives:|Slide \d+\.|Activity[^*\n]*:|Reflection:)\*\*)/g;

const OBJECTIVES_RE = /^\*\*Learning objectives:\*\*\s*/;
const SLIDE_RE = /^\*\*Slide (\d+)\.\*\*\s*/;
const ACTIVITY_RE = /^\*\*(Activity[^*\n]*?):\*\*\s*/;
const REFLECTION_RE = /^\*\*Reflection:\*\*\s*/;

function classify(segment: string): LessonSlide {
  let m: RegExpMatchArray | null;

  if (OBJECTIVES_RE.test(segment)) {
    return {
      kind: "objectives",
      heading: "Learning objectives",
      body: segment.replace(OBJECTIVES_RE, "").trim(),
    };
  }

  if ((m = segment.match(SLIDE_RE))) {
    return {
      kind: "content",
      heading: `Slide ${m[1]}`,
      body: segment.slice(m[0].length).trim(),
    };
  }

  if ((m = segment.match(ACTIVITY_RE))) {
    return {
      kind: "activity",
      heading: m[1].trim(),
      body: segment.slice(m[0].length).trim(),
    };
  }

  if (REFLECTION_RE.test(segment)) {
    return {
      kind: "reflection",
      heading: "Reflection",
      body: segment.replace(REFLECTION_RE, "").trim(),
    };
  }

  // Any preamble before the first recognised marker (shouldn't normally occur
  // with the seeded content) is rendered as a plain content slide so nothing
  // authored is silently dropped.
  return { kind: "content", heading: "", body: segment.trim() };
}

export function parseLessonSlides(body: string): LessonSlide[] {
  if (!body || !body.trim()) return [];
  return body
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(classify);
}

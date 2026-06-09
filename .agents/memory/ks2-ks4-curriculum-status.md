---
name: KS2/KS4 curriculum content status
description: Why lessons can't be seeded for younger/older year groups — content doesn't exist and must not be fabricated.
---

# Only KS3 (Year 7) lesson content is authored

The lesson delivery plumbing (schema with `keyStage`, key-stage-gated
fail-closed `GET /api/lessons`, the shared `lessonSlides.ts` parser, and the
`seedLessons.ts` pipeline) is fully built. But the **only authored pupil-facing
curriculum is `CURRICULUM_YEAR7.md` (KS3)**. No KS1/KS2/KS4/KS5 lesson content
exists in the repo or attached assets.

Year groups map: Y1-2=KS1, Y3-6=KS2, Y7-9=KS3, Y10-11=KS4. Most pupils are
Y3-6 (KS2) and correctly see "Lessons coming soon" because no KS2 content is
seeded — this is the intended fail-closed behaviour, not a bug.

**Why:** `PILOT_BRIEF.md` lists "KS1/KS2/KS4/KS5 curriculum buildout" under
**post-pilot backlog** ("Year 7 is the pilot"). Lesson content is
safeguarding/PSHE material for children and must be authored/vetted by humans —
the standing rule is **never fabricate it** (same rule that governs the
`[PLACEHOLDER:]` markers — strip-and-keep-generic, never invent specifics).

**How to apply:** seeding KS2/KS4 lessons is blocked on approved, vetted
content being supplied (e.g. a `CURRICULUM_KS2.md` authored the same way as
`CURRICULUM_YEAR7.md`). When that content arrives, seed it via `seedLessons.ts`
with the correct `keyStage` value and assert zero `[PLACEHOLDER:` remain in any
seeded `body`. Do not author the content yourself.

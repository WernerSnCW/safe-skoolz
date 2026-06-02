---
name: Curriculum placeholders leak into pupil body
description: CURRICULUM_YEAR7.md [PLACEHOLDER:] markers are NOT confined to teacher/safeguarding sections — some sit inside pupil-facing slides/activity.
---

# Curriculum [PLACEHOLDER:] markers can render to pupils

CURRICULUM_YEAR7.md uses `[PLACEHOLDER: ...]` markers for content Morna must
supply before go-live. Most live in teacher-notes / safeguarding-signpost
sections (which are intentionally NOT seeded into `lessons.body`). But a
minority sit **inside the pupil-facing flow** (learning objectives → slides →
activity → reflection). When seeding only the pupil-facing body, a naive
"seed everything between objectives and the quiz" still drags those in.

`GET /api/lessons/:id` serves `body` straight to pupils as rendered markdown, so
any leftover `[PLACEHOLDER: ...]` renders verbatim on a child's screen.

**Why:** the original "seed pupil-facing only" decision assumed all placeholders
were in non-seeded teacher sections. That assumption was wrong — pupil slides
also contained them (helpline pointers like Samaritans/Childline, plus a few
coordinator/teacher editorial notes that had leaked into the pupil flow).

**How to apply:** whenever seeding or regenerating pupil-facing lesson bodies
from a curriculum markdown, assert zero `[PLACEHOLDER:` remain in the seeded
text (DB-level: `SELECT count(*) FROM lessons WHERE body LIKE '%PLACEHOLDER%'`
must be 0) before shipping. Tom's standing decision: strip the marker and keep
the surrounding generic safe guidance (trusted adult / safeguarding lead /
safeskoolz safe-contacts list) — never fabricate helpline numbers; Morna fills
real numbers later. The verbatim placeholders stay in CURRICULUM_YEAR7.md.

---
name: Demo pupil key stage vs seeded lessons
description: Why pupil-facing lesson e2e via demo-login shows an empty lesson list
---

The `POST /api/auth/demo-login {role:"pupil"}` helper resolves to a pupil named
"Bob" who is **Year 4 (KS2)**. The seeded PSHE lessons are **Year 7 (KS3) only**.
Because the pupil lessons list is key-stage gated (fail-closed), Bob correctly
sees "Lessons coming soon" — an empty list — so any pupil-facing lesson e2e that
authenticates via demo-login will appear to fail at the lesson-list step.

**Why:** the curriculum content is KS3-only for the Year 7 pilot; the demo pupil
predates it and was never moved to Y7.

**How to apply:** to exercise pupil lesson flows in a browser test, don't rely on
the demo pupil. Either (a) temporarily set Bob's `year_group` to `Y7` and revert
in a guaranteed `finally`, or (b) authenticate as the actual Y7 pupil. Minting a
JWT by hand isn't possible from the agent sandbox — `viewEnvVars` masks
`JWT_SECRET`'s value, so the temporary-year-group swap is the reliable path.

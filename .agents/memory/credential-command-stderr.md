---
name: Never suppress stderr on credential commands
description: When shelling out to hash/sign/encrypt for an auth-table write, do not redirect stderr away — a missing dep can silently produce an empty value and corrupt the credential row.
---

Rule: any shell pipeline that produces a value destined for a `password_hash`, token, signing key, or other auth-table column must leave stderr visible AND must verify the captured value's shape (length + expected prefix) before the UPDATE.

**Why:** A `node -e "require('bcrypt')...." 2>/dev/null` once swallowed a `MODULE_NOT_FOUND` (bcrypt wasn't installed at the path where node was invoked). The captured `$HASH` was the empty string. The downstream `UPDATE users SET password_hash = ''` succeeded silently. Depending on the auth code's handling of empty strings, that's either an account lockout or an auth bypass. Caught only because the verification SELECT checked `password_hash LIKE '$2b$12$%'` and reported FALSE. 27-second window, dev-only, no real users — but the same mistake against a production row is the kind of incident that makes the news.

**How to apply:**
- Do not put `2>/dev/null` on any command whose stdout is going into a credential variable.
- After capturing the value, assert in shell: `[ -z "$VAR" ] && { echo ABORT; exit 1; }` plus a shape check (length, expected prefix like `$2b$12$` for bcrypt).
- After the UPDATE, run a verification SELECT that checks the shape of the stored value, not just that the row updated.
- For the strongest check on bcrypt specifically: pull the stored hash back and run `bcrypt.compare(plaintext, stored_hash)` — the only check that proves the round-trip works.

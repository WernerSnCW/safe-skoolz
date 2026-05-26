---
name: Workspace-root node has no app dependencies
description: In this pnpm monorepo, common deps like bcrypt, pg, drizzle-orm are installed inside artifact node_modules, not at the workspace root.
---

Rule: when running `node -e` or a one-off script that requires an app dep (bcrypt, pg, drizzle-orm, jsonwebtoken, etc.), `cd` into the specific artifact directory first, or the require will throw `MODULE_NOT_FOUND`.

**Why:** pnpm hoists per-package, not to the workspace root. A `node -e "require('bcrypt')"` from `/home/runner/workspace` fails; the same call from `/home/runner/workspace/artifacts/api-server` succeeds. Easy to miss if stderr is suppressed (see credential-command-stderr.md).

**How to apply:**
- For api-server work: `cd artifacts/api-server && node -e "..."`.
- For raw psql DB access from a node script, prefer the api-server's existing Drizzle pool over installing `pg` separately — but if you need raw `pg`, the api-server doesn't have it either (it uses postgres.js / drizzle). Use `psql` from the shell for one-off SQL instead of a node round-trip.
- Discover via `ls artifacts/<name>/node_modules/<pkg>` before writing the script.

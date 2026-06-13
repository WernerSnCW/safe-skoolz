# Phase 3 — Community Home (four-state, capability-gated)

**Date:** 2026-06-14
**Status:** Brainstormed with Tom (this date) — design approved (visual companion). Ready for writing-plans.
**Branch:** `feat/unified-app`
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — Phase 3 (§6: "Four-state progressive home"). Builds on Phase 1 (tenant config + `getMembershipState`), Phase 2a (unified `AppShell`/`getNav`), 2b (front door), 2c (Learn area).

## 1. What this is

One **state-aware home** at `/` for the **parent** role — the authed counterpart to the anon front door. It consolidates today's ad-hoc `ParentDashboard` (which has two inline modes — school-parent safeguarding vs community funnel tiles) into a single **`CommunityHome`** composed of **independently-gated sections**. Each section renders *live* / *locked (by membership state)* / *promised ("switched on as…")* / *nothing*, based on its own **capability + data** gate.

**Front-end only** — no schema, no API, no new endpoints. Reuses existing TanStack Query hooks and the Phase-1 `getMembershipState`. The home is authed-only (behind `HomeRoute`), so it is **not prerendered**.

This is **structure/IA only**; copy is honest placeholder, polished in the end-of-redesign content audit (consistent with 2a/2b/2c).

## 2. Decisions locked this session

1. **Scope = the `parent`-role community home only** (Option A). `pta` role → `/pta` (unchanged, it is the exec "run it" home); `coordinator`/`head_teacher`/`teacher`/`pupil` → their existing dashboards (unchanged). Staff/pupil have no membership-state journey — out of scope.
2. **No linear "maturity" enum.** A tenant's stage (parent VOICE → PTA operating → school adopted) is **emergent from capability flags + live data**, not a hardcoded enum. A PTA may **already exist** (legacy) — the model must not assume VOICE→PTA conversion is the only path.
3. **Two gate axes:** **capability** (tenant config, Phase-1 flags: `voice`/`pta`/`results`/`concerns`/`safeguarding`/`lessons`/…) **and** **data** (does a VOICE exist? a PTA? a charter? results released? children linked?). **Membership state** (`pending`/`approved`, from `getMembershipState`) gates *depth* within whatever is live.
4. **The two PTA goals are first-class:** get the PTA (existing or new) to **adopt the VIBES operating principles** (pitch shown when no charter), and **grow PTA membership** to build advocacy weight (a running "join the PTA / add your voice" CTA).
5. **Pre-adoption, results = the diagnostic report.** The "real picture" an approved member sees pre-adoption is the report; pupils/safeguarding/lessons are post-adoption only (the whole-school capabilities).
6. **Children/safeguarding is a capability-gated layer**, not a parallel parent mode — it appears only when `safeguarding` is on (school adopted) **and** children are linked; otherwise it's a "switched on as your school adopts VBE" promise.
7. **Naming/idiom = Option C / established marketing+dashboard idiom.** Reuse `PageHeader`, `rounded-2xl` cards, `MissionActions`/`WhatsNewBand` patterns; no new design language.

## 3. The home composition — `CommunityHome`

An ordered list of self-gating sections. Each section component owns its gate and renders `null` when its gate is unmet (except the promise section, which renders *because* a capability is off).

| # | Section | Gate (capability + data) | State-depth behaviour | Reuses |
|---|---|---|---|---|
| 1 | **`YoureInBanner`** | always | `pending` → "awaiting approval" + live join counter; `approved` → "you're backing {cause}" | `getMembershipState`, `useGetJoinSummary(slug)` |
| 2 | **`VoiceSection`** | `voice` cap **+** a VOICE exists | always readable; CTA to back/share | `useListVoice` |
| 3 | **`PtaSection`** | `pta` cap **+** a PTA exists | members read goals/initiatives/decisions/announcements; `pending` → locked teaser. **"Bring VIBES to your PTA"** pitch when no charter. **"Join the PTA / add your voice"** growth CTA always. | `useListPtaGoals`, `useListPtaInitiatives`, `useListPtaProposals`, `useGetPtaAnnouncementFeed`, `useGetPtaCharter` |
| 4 | **`ResultsSection`** | `results` cap **+** released **+** `approved` | `pending`/unreleased → 🔒 locked card ("notified when released"); else the **report** | `useGetDiagnosticResults(slug)` |
| 5 | **`ConcernsSection`** | `concerns` cap | raise + (approved) track | `useListConcerns`, `useSubmitConcern` |
| 6 | **`ChildrenSafeguardingSection`** | `safeguarding` cap **+** children linked | live incidents · behaviour · lessons summary | the existing ParentDashboard safeguarding widgets (extracted) |
| 7 | **`SwitchedOnPromises`** | any relevant capability **off** | honest "switched on as your school adopts VBE / as your VOICE grows" cards | `useTenant().capabilities` |

Section order is the teach-then-act flow: standing → the cause → the PTA → the picture → concerns → (post-adoption) children → what's next.

## 4. Routing & component architecture

- **`src/App.tsx`** — `HomeRoute`/`Dashboard` unchanged except: when `user.role === "parent"`, render `<CommunityHome/>` instead of `<ParentDashboard/>`. All other roles unchanged (`pta`→`PtaDashboardRedirect`→`/pta`; staff→Coordinator/Teacher dashboards; pupil→PupilDashboard).
- **`CommunityHome`** is a thin composer: resolves the shared context once (auth/user, `useTenant`, `getMembershipState`) and renders the seven sections in order. Sections self-gate; TanStack Query dedupes any shared fetches.
- **Sections are isolated units** under `src/components/home/` — each: one file, one gate, one clear responsibility, testable/readable independently. A section that needs data the home doesn't otherwise need fetches it itself (gated so it only fetches when its capability is on).
- **`ParentDashboard` decomposition:** the safeguarding widgets currently inline in `src/pages/dashboard/ParentDashboard.tsx` (incident history, behaviour standing, charts, `WhatsNewBand`, `ContactPTACard`, `MissionActions`) are **extracted** into `ChildrenSafeguardingSection` (and helpers as needed). The community funnel-tile branch is **superseded** by sections 1–5/7. `ParentDashboard.tsx` is removed once nothing references it.

## 5. The gates (explicit, refinable heuristics)

Stated here so they are easy to tune in one place (propose a small `src/lib/homeGates.ts` of pure predicates, or inline per section — the plan decides):

- **capability(x)** = `resolveCapabilities(tenant)[x]` via `useTenant()` (Phase-1; defaults all-on before tenant resolves).
- **membership state** = `getMembershipState(user)` → `pending` | `approved` | `exec` (exec never reaches `CommunityHome`).
- **a VOICE exists** = `useListVoice()` returns ≥1.
- **a PTA exists** = `useListPtaMembers()` (or officers) returns ≥1.
- **PTA adopted VIBES** = `useGetPtaCharter()` returns a charter; absent → show the "bring VIBES to your PTA" pitch.
- **results available** = `useGetDiagnosticResults(slug)` resolves with `released === true` (the hook already 403s for pending/unreleased non-exec — treat that as "locked").
- **children linked** = the existing children query used by `ParentDashboard` today (reuse its source).

These are heuristics over existing data, not new persisted state. If any proves wrong it changes one predicate, not the architecture.

## 6. Files

| File | Change | Responsibility |
|---|---|---|
| `src/pages/community-home.tsx` **(create)** | `CommunityHome` composer — resolves shared context, renders the 7 sections in order. |
| `src/components/home/YoureInBanner.tsx` **(create)** | standing + join counter. |
| `src/components/home/VoiceSection.tsx` **(create)** | the cause / VOICE. |
| `src/components/home/PtaSection.tsx` **(create)** | PTA operating content + VIBES pitch + join-to-advocate CTA. |
| `src/components/home/ResultsSection.tsx` **(create)** | the diagnostic report / locked card. |
| `src/components/home/ConcernsSection.tsx` **(create)** | raise/track concerns. |
| `src/components/home/ChildrenSafeguardingSection.tsx` **(create)** | the extracted safeguarding widgets (capability+children gated). |
| `src/components/home/SwitchedOnPromises.tsx` **(create)** | "switched on as…" cards for off-capabilities. |
| `src/lib/homeGates.ts` **(create, optional)** | pure gate predicates (or inline — plan decides). |
| `src/App.tsx` **(modify)** | parent route → `CommunityHome`. |
| `src/pages/dashboard/ParentDashboard.tsx` **(remove/decompose)** | safeguarding widgets extracted to `ChildrenSafeguardingSection`; file removed once unreferenced. |

The firm seams: the `CommunityHome` composer, the seven section interfaces (each a gated unit), and the `App.tsx` parent-route swap.

## 7. Data flow / SSR

- `CommunityHome` is **authed-only** (reached via `HomeRoute` → `ProtectedRoute`), so it is **never prerendered** and **not** registered in `prerender-entry.tsx`. No SSR-safety constraints apply to it specifically (it runs client-side after auth resolves), though it must still compile in the prod build.
- It depends on `AuthProvider`, `TenantProvider`, and `QueryClientProvider` — all mounted in the live SPA tree. Capabilities default all-on until the tenant resolves (Phase-1 behaviour) — sections must tolerate the brief all-on window without flicker-then-hide jank (render skeletons or wait for `tenant.isLoading === false` before deciding promise-vs-live).
- Capability gating here is **presentational only** (consistent with Phases 1–2 — API enforcement is Phase 4). A section being shown does not bypass the existing per-endpoint authorization (e.g. results still 403 server-side for pending users).

## 8. Verification

- **Typecheck:** `pnpm typecheck` — no NEW errors referencing changed files (pre-existing api-zod/implicit-any failures ignored, per 2a/2b/2c).
- **Build:** `PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm build` — vite build + prerender succeed; all existing public routes still prerender (the parent home is authed, so it is NOT among them); no new errors.
- **In-browser (preview MCP, unified prod server, real DB on :8095):**
  - **Pending community parent:** `YoureInBanner` shows awaiting-approval + join counter; `VoiceSection`/`PtaSection` readable; `ResultsSection` 🔒 locked; off-capability promise cards present; no console errors.
  - **Approved community parent:** results section shows the report; PTA content readable; concerns usable.
  - **Capability variations** (flip Morna caps temporarily, revert): with `pta` off + a VOICE only → VOICE section + "PTA as you grow" promise; with `safeguarding` on + children linked → the `ChildrenSafeguardingSection` renders the live widgets.
  - **Regression:** `pta` exec still lands at `/pta`; coordinator/teacher/pupil dashboards unchanged; the 2a/2b/2c chrome + brand intact; the extracted safeguarding widgets render identically to before for a school-parent-with-children.
- **No api-server changes** → existing server suite stays green.

## 9. Out of scope (later phases / Tom-owned)

- **Staff (coordinator/teacher) + pupil dashboards** — unchanged; their consolidation is separate role work (not the four-state journey).
- **Final copy** across the home — the end-of-redesign content audit.
- **New endpoints / API enforcement of capabilities** — Phase 4 (gating here is presentational).
- **The `pta`-exec home** — stays at `/pta`; not rebuilt here.
- **A persisted tenant "maturity"/adoption field** — deliberately avoided; stage is emergent from capabilities + data.

# Phase 2b — Teach-Then-Ask Front Door + Complete-Solution Story + Audience Personalization

**Date:** 2026-06-13
**Status:** Brainstormed with Tom (this date) — design approved (visual companion). Ready for writing-plans.
**Branch:** `feat/unified-app`
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — Phase 2, sub-phase **2b**. Builds on **Phase 1** (unified shell + tenant config + naming, shipped) and **Phase 2a** (one `AppShell`, one `getNav`; anon → top-nav presentation, shipped + live in prod).
**Backlog input folded in:** [`2026-06-13-pta-vibes-marketing-brief.md`](./2026-06-13-pta-vibes-marketing-brief.md) — the PTA VIBES content (5-seat model + engagement principles) becomes the PTA audience track + the rebuilt `/ptas` deep page.

## 1. What this is

Phase 2a gave us one shell with an **anonymous presentation** (top-nav marketing chrome) but the page *bodies* still render today's accreted marketing pages as-is. Phase 2b rebuilds the **front door** that drops into that anon slot:

- a **teach-then-ask** homepage (lead with VBE value and understanding; earn the join ask),
- the **complete-solution story** (the four-stakeholder picture, so it reads as a whole VBE operating system, not a survey/funnel),
- **audience personalization** — a broad homepage that **reshapes its content in place** when a visitor self-selects **Schools / Parents / PTAs**.

This is a **front-end-only** build. No schema, no API, no new server routes. It targets the **bare-domain `/` platform homepage**; the per-tenant `/s/:slug` door and the Learn area are later phases.

## 2. Decisions locked this session

1. **Structure = Option C (hybrid):** a broad homepage whose content **reshapes in place** on audience self-select, **and** "go deeper" links into the existing dedicated pages (`/schools`, `/parents`, `/ptas`), which are kept for depth + SEO. (Rejected: A = retire dedicated pages; B = personalization-by-navigation only.)
2. **Audience switcher set = Schools · Parents · PTAs** (the three real self-identifying visitor types). **Pupils** are *shown* in the always-on complete-solution story (a stakeholder), not a switcher track; `/pupils` stays reachable. **Coalitions** folds into the Parents track (a VOICE is a parent mechanism).
3. **PTA IP = showcase the full model publicly.** The 5-seat equal-responsibility model, the why-structure argument, what VIBES facilitates, and the engagement principles all render publicly — the model *is* the pitch, and teach-then-ask requires actually teaching it. The operational tooling (send-check workflow, rolling-agenda machinery) lives in-product anyway.
4. **Front-door scope = bare-domain `/` only.** The `/s/:slug` tenant door keeps its current join-funnel behaviour (it is the live Morna sign-in path); folding the same template into `/s/:slug` is a later phase. Build the template so it *can* be reused there.
5. **Section order (teach-then-ask):** value → why we exist → why it matters → complete solution → what you get → go deeper → the ask. Switcher chips live **inside the hero**; the complete-solution block sits **before** "what you get".
6. **Naming = Option C (Phase 1/2a):** platform brand **"Vibes"**, framework **"VBE"**, endorsement **"Vibes — software for VBE."** No "SchoolVBE" and no "{School} Vibes" on the bare homepage (tenant context only).

## 3. The homepage spine

A single `/` page (rebuilt `pages/home.tsx`). Each block is **BROAD** (audience-agnostic, always identical) or **RESHAPE** (swaps with the selected audience).

| # | Block | Type | Content |
|---|---|---|---|
| 1 | **Hero — the VBE value** | BROAD | Eyebrow "Values-Based Education" · H1 (Tom-owned copy) · subhead · CTAs `[Find your school]` `[Log in]` · the **AudienceSwitcher** chips ("I'm a… School · Parent · PTA"). |
| 2 | **Why this exists** | BROAD | "Vibes helps your school adopt VBE — working *with* the school. For a school to commit, it needs its parents behind it." |
| 3 | **Why it matters** | RESHAPE | The observed behaviours the diagnostic measures (the six patterns). Default = general framing; per-audience reframe (e.g. PTAs → "no structure = second-/third-class citizens"). Links to `/diagnostic`. |
| 4 | **The complete solution** | BROAD | Four stakeholder cards — **Children** (report safely · learn values · a voice) · **Parents** (informed · raise concerns · back the change) · **PTA** (operates with structure) · **School** (embeds VBE · responds with evidence). Honest-aspirational "available — switched on as your school adopts VBE" framing. |
| 5 | **What you get** | RESHAPE | Value props for the selected audience. Default = balanced 3-up. **PTAs → the PTA VIBES content**: the 5-seat model (President · VP · Chair · Secretary · Treasurer, equal responsibility not rank) + Active/Voting tiers; what VIBES facilitates (rolling agendas · survey-data review · formal Q&A to school · clear goals · tracked initiatives); the engagement principles (support the school, the PTA, each other). |
| 6 | **Go deeper →** | RESHAPE | "Go deeper for {audience}" → `/schools` · `/parents` · `/ptas`. PTA label = "Get your PTA VIBING →". |
| 7 | **The ask** | BROAD | Final join band — `[Find your school]` / `[Join]`. CTA label nudges per audience. |

**Tom-owned, placeholder until signed off** (umbrella §8): the H1 ("VBE improves how children treat each other — and how the school responds when they don't" is the working draft) and the observed-behaviour wording (legal-reviewed). The build uses honest placeholders and marks them clearly; final copy is dropped in by Tom.

## 4. Audience personalization mechanism

- **Self-select, client-side** (per `Resources/frameworks/audience-personalization-for-websites-V1.md`). A switcher chip swaps the RESHAPE blocks (3, 5, 6) and nudges the block-7 CTA label **in place** — no navigation, no server round-trip.
- **Default = "All" (broad).** Prerendered HTML is always the broad state → crawlers and first paint get complete, indexable content. Reshaping is a post-hydration client enhancement.
- **State precedence on load:** URL param (`/?audience=ptas`) → `localStorage` → `'all'`. Selecting a chip updates both the URL (so the link is shareable/pre-personalized) and `localStorage` (so a returning visitor keeps their track).
- **SEO surface stays the dedicated pages.** `/ptas` (rebuilt), `/schools`, `/parents` remain the per-audience prerendered, rankable pages. The homepage switcher is on-site self-identification, **not** a new indexable page per audience — so no new prerender routes beyond the already-registered `/ptas`.
- **No backend.** Capability gating in block 4 is presentational copy only (consistent with Phase 1 — API enforcement is Phase 4).

## 5. Components & data flow

```
pages/home.tsx
 ├─ <Hero/>                      BROAD    (contains <AudienceSwitcher/>)
 ├─ <WhyThisExists/>             BROAD
 ├─ <WhyItMatters/>     ← useAudience()   reads audienceContent.ts
 ├─ <CompleteSolution/>          BROAD
 ├─ <WhatYouGet/>       ← useAudience()   reads audienceContent.ts
 ├─ <GoDeeper/>         ← useAudience()   reads audienceContent.ts
 └─ <TheAsk/>                    BROAD    (CTA label per audience)

providers/audience.tsx     AudienceProvider + useAudience()
                           value: 'all'|'schools'|'parents'|'ptas'
                           resolve: URL param → localStorage → 'all'
                           SSR-safe: returns 'all' with no provider / during prerender
marketing/audienceContent.ts   typed map:
                           audience → { whyItMatters, whatYouGet, goDeeper, askLabel }
components/marketing/
  AudienceSwitcher.tsx     the chips; reads+sets useAudience
  CompleteSolution.tsx     the four-stakeholder block (BROAD)
```

- New files live under `artifacts/safeschool/src/`. Section components may live inline in `home.tsx` or under `components/marketing/` — the plan decides per-component; the typed content map and the provider are the firm seams.
- **Visual idiom = the established marketing system:** mono eyebrow, Quicksand display titles, rounded-2xl cards, accent icon-tiles, the `PageHeader` / card patterns already in use. No new design language.
- **SSR/prerender safety:** every RESHAPE component must render correctly with `useAudience() === 'all'` and with no `AudienceProvider` in the tree (the prerender path), mirroring how 2a made `useAuth` SSR-safe.

## 6. `/ptas` rebuilt — "Get your PTA VIBING"

The only dedicated page rebuilt in 2b. It becomes the deep PTA VIBES page the homepage PTA track links into:

- **The 5-seat model** (President = primary channel to the school · Vice President = membership + engagement · Chair = platform admin / caretaker-admin · Secretary · Treasurer) — equal responsibility, not rank. Plus **Active Members** (run initiatives with sign-off from any exec) and **Voting Members** (vote · raise issues · equal access to information).
- **Why structure matters:** without it you get second- and third-class citizens (parents outside the PTA get no information; parents inside but outside comms know less than the exec). VIBES = transparent by default, equal access, async participation from anywhere.
- **What VIBES facilitates:** rolling agendas · reviewing survey-results data · formal questions & responses to the school (the five-stage process) · clear goals · tracked initiatives.
- **The engagement principles** (the IP's heart): "we support the school, the PTA, and each other; we don't criticise any of them," backed by the codified principles (partners not petitioners; the three hard rules; propose→acknowledge→discuss→decide→review with silence recorded not accepted; the send-check).

**Reconciliation note for the builder** (PTA VIBES brief §3.1): the public 5-seat model (President/VP/Chair/Secretary/Treasurer + Active/Voting) must align with the built `PTA_OFFICER_ROLES` (president/vice_president/chair/vice_chair/secretary/treasurer/domain_lead) and tiers (executive_board/senior_group/general_membership). The page presents the **clean public 5-seat model**; where the built software is richer, the page simplifies — document the simplification, don't contradict the software.

## 7. Verification

- **In-browser via preview MCP** (`:8080` unified prod server, real DB):
  - Prerendered `/` serves broad "All" content with a populated `#root` (verify in `dist/public/index.html`).
  - Switching chips reshapes blocks 3/5/6 + the block-7 CTA, no console errors, no flicker.
  - `/?audience=ptas` deep-link lands pre-selected on the PTA track.
  - Reload preserves the selection (localStorage).
  - Rebuilt `/ptas` renders the PTA VIBES content and prerenders clean.
  - **Regression:** authed users still hit Dashboard; the 2a anon top-nav chrome + brand are intact; `/schools` + `/parents` + their "go deeper" links still work.
- **Build:** frontend prod build + prerender pass clean; all existing routes still prerender to populated `#root`; marketing `AppShell` chrome unchanged.
- No api-server changes → no new server tests; existing suite stays green.

## 8. Out of scope (later phases / Tom-owned)

- **Final parent copy** — the H1 and the observed-behaviour wording (Tom-owned, legal-reviewed). Build with marked placeholders.
- **`/s/:slug` tenant-skinned front door** — render the same template tenant-aware (Phase 3 / a 2b-follow).
- **Learn area** — Phase 2c.
- **`/schools` + `/parents` reframes** — kept as-is in 2b; light reframe is a later pass.
- **Legal-rights & effective-comms tools** — its own backlog item (PTA VIBES brief §2 piece #3).
- **Standalone marketing-site retirement** — the Tom-run 301 runbook from 2a (Task 6), parallel and non-blocking.

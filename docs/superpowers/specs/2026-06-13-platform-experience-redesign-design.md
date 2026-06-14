# Platform Experience Redesign — North-Star & Decomposition

**Date:** 2026-06-13
**Status:** Brainstormed with Tom (this date) — north-star agreed; per-phase specs to follow.
**Type:** Discovery / redesign brief. This is **not** a single-feature spec — it is the umbrella that decomposes into per-phase specs → plans → builds.
**Supersedes the framing of:** the accreted M1→M2→A→B1–B4 experience (those builds are sound; their *assembly* into one product is what this redesign fixes).

## 1. Why we're doing this

Tom's critique, verbatim in spirit: the experience is *a bit of a mess*. Concretely:

1. **Four front doors, one product.** A parent crosses four separate shells with three brand names — the marketing site (**SchoolVBE**), the join funnel (**Morna Vibes**, `/join/morna`), the diagnostic (`/d/morna`), and the app you log into (**vibez**). It feels like "signing into a different site," never one product.
2. **The journey is inverted.** We ask parents to *act* (back VBE, sign up) before we ever let them *understand* — what VBE is, why it helps their child. You can't advocate for what you haven't been taught. Understanding is currently thin and buried.
3. **Accretion, not architecture.** Each vertical (diagnostic → membership → VOICE → charter → goals → initiatives) was built correctly, one per session, but no one has owned the *whole experience* as a single information architecture.

## 2. Principles (the spine of every decision below)

- **Platform-first, tenant-generic.** The product is the **platform**; a school community is a **tenant**. **Morna is instance #1, not the product.** Nothing Morna-specific is hardcoded — the schema is already multi-tenant (`schoolId`/`slug` everywhere); the experience must *think* platform-first. Riverside is the demo tenant.
- **Teach, then ask.** Lead with value and understanding; earn the ask. Order: **VBE value → why this exists (with the school) → the observed behaviours → what you get → join.**
- **Show the complete solution.** This is not a survey or a funnel — it is a complete VBE operating system for the whole community. Surface all of it: **children report safely, parents stay informed, the PTA operates with structure, the school embeds VBE.** Visibility of the full picture is what signals "complete solution."
- **Visible, but honestly gated.** The experience *shows* the whole solution; what is **live** for a given school is driven by **tenant config + role**. Capabilities a tenant hasn't switched on yet are shown as **"available — switched on as your school adopts VBE"** (aspirational but honest — never over-promised as live).
- **One shell, one name, one nav.** Parents only ever see the per-tenant skin **"{School} Vibes"** (Morna parents → "Morna Vibes"). The platform/company brand (**SchoolVBE / vibez**) stays behind the scenes. The VBE-education content moves *into* the product as a **"Learn"** area rather than living on a separate marketing site.

## 3. The model: platform vs tenant

| Layer | Owns | Examples |
|---|---|---|
| **Platform (the product)** | Everything reusable, built once | The VBE framework + "Learn" content; the unified shell/nav; the teach-then-ask front-door template; the diagnostic engine; membership/approval; VOICE; the PTA operating layer (charter/goals/initiatives/voting/decisions); results aggregation; safeguarding/incident reporting; lessons/PSHE; pupil & teacher accounts |
| **Tenant (a school community)** | A configured instance | Display name + "{School} Vibes" theme; slug; which capabilities are switched on; its diagnostic responses & results; its members; its PTA; its observed-behaviour content |
| **Parent-facing skin** | Per-tenant theming only | "Morna Vibes" — a theme of the one platform, not a separate site |

## 4. Stakeholders & states

**Stakeholders (the complete solution serves all four):** children (report safely · learn the values · a voice), parents (stay informed · raise concerns · back the change), **the PTA (the operating infrastructure — see §5.2)**, the school (safeguarding on record · embed VBE · respond with evidence).

**Membership states (the progressive-disclosure spine):**

| State | What they see |
|---|---|
| **Anyone** (not signed in) | The front door (VBE value → why → observed behaviours) + the **Learn** area + the diagnostic + **Join (one click)** |
| **Signed up · pending** | "You're in" — mission + live join counter, submit a concern, results **locked** (notified on release), keep learning |
| **Approved member** | The **community home** — the results (the real picture), the ask to the school + backing, PTA goals & initiatives (read), announcements · concerns · decisions |
| **Exec / admin** | **Run it** — approve members, release results, PTA charter/goals/initiatives/voting, prepare the ask to the school |

Capabilities outside a state's reach are not hidden — they're shown gated by role + tenant config, reinforcing "complete solution."

## 5. The unified information architecture

**One shell, one nav, gated by where the parent is — not by which "site."** Today's four shells / three names collapse into **one shell, one name ("{School} Vibes"), one nav**. The marketing site's VBE-education content folds in as a **"Learn"** area. The deep app (safeguarding/incidents, lessons/PSHE, pupil & teacher logins) is **surfaced as part of the complete solution**, switched on per tenant + role — for Morna today it shows as "what the school turns on as it adopts," not hidden, not yet live.

### 5.1 The front door (teach-then-ask), platform template, tenant-configured
1. **VBE value** — lead with what VBE *improves* (headline copy: Tom's words; draft: "VBE improves how children treat each other — and how the school responds when they don't").
2. **Why this exists** — "{School} Vibes exists to support {School}, working *with* the school to adopt VBE; for the school to commit it needs parents behind it."
3. **Why it matters here** — the observed behaviours as drill-down (the six patterns the diagnostic measures; exact wording tenant-owned + legal-reviewed).
4. **The complete solution** — the four-stakeholder picture (children/parents/PTA/school) so it reads complete, not like a survey.
5. **What you get by joining** — value-led: the real picture/results, a voice with weight, track responses, shape it.
6. **The ask** — one-click join, at the end, once taught.

### 5.2 PTA operating infrastructure (a first-class capability pillar)

The platform is **the infrastructure that lets a PTA actually function** — the operating-structure docx made real, moving a committee from "individuals acting alone" to structured collective process. This is a headline value pillar in its own right, not an exec-only tab. It must be visible (members see and participate; exec runs) and, like everything, tenant-generic:

- **Build membership** — grow the PTA; the join front door feeds the roster (tiers: executive board / senior group / general membership). Growth-by-demonstrated-value, not by asking.
- **Facilitate elections** — officer elections / AGM machinery. *Roadmap per the operating-structure docx (formal elections deliberately deferred today); the infrastructure is built to support them, surfaced under the "available — switched on as you're ready" rule, not shown as live until run.*
- **Voting** — ballots, quorum, proxies, electorate scoping (senior-group vs all-members) — built (B-era).
- **Democratise information / transparency** — decisions, results, and what the PTA is doing are relayed to the whole parent community ("transparent by default"); answers the school gives — and **doesn't** give — are on record.
- **Provide visibility** — a clear, shared picture of goals, initiatives, decisions, and where each stands.
- **Infrastructure to get things done** — the operating spine: annual goals → initiatives → the six-box self-approval checklist → the five-stage school process (B1–B4), so good ideas move quickly with named owners and clear criteria.
- **Track progress of initiatives** — status + school-stage history, non-response tracking ("silence is not acceptance"), follow-ups — visible progress, not lost threads.
- **Support parents** — a structured channel for concerns (aggregated, not landing ad hoc on exec members), a real voice without needing to attend meetings, and information available nowhere else.
- **Participation without a time commitment** — busy parents, parents working abroad, parents who'll never make a meeting can still **support, contribute ideas, ask questions, give feedback, and back proposals — asynchronously, from anywhere in the world, at any time.** No meeting attendance required. Especially decisive for an international, transient community where the in-person committee model excludes most families. (Docx §2b/§11: lightweight, low-friction, asynchronous contribution.)

Most of this is already built (members/officers, decision log, voting/proxies, announcements, charter, goals, initiatives + five-stage). The redesign's job here is to **surface it as a coherent value pillar** in the front door (the complete-solution story) and the home (per state), rather than leaving it buried.

## 6. Decomposition (a program, not one spec)

Each phase runs the proven loop (brainstorm-as-needed → spec → plan → subagent build with two-stage + holistic review), platform-generic throughout, validated on the Morna tenant.

- **Phase 1 — Unified shell + tenant theming + naming.** One app shell, one nav, per-tenant "{School} Vibes" theme driven by tenant config; cut the vibez/SchoolVBE/Morna naming knot. *The backbone everything hangs off — recommended start.*
- **Phase 2 — Teach-then-ask front door + "Learn" area + complete-solution story.** The value-led landing as a platform template; fold the marketing site's VBE-education content in as Learn; surface the four-stakeholder complete-solution view; begin retiring the separate marketing surfaces. **Backlog input:** [`2026-06-13-pta-vibes-marketing-brief.md`](./2026-06-13-pta-vibes-marketing-brief.md) — the PTA-pillar content ("PTA VIBES" / the 5-seat model + engagement principles), plus two decomposed sub-briefs (audience personalization; legal-rights/effective-comms tools).
- **Phase 3 — Four-state progressive home.** Consolidate the scattered funnel tiles + dashboards into one home that reveals by membership state, surfacing capabilities gated by role + tenant config (incl. the "available as your school adopts" treatment). Reuses existing endpoints.
- **Phase 4 — Tenant-generic hardening + second-tenant onboarding.** Audit out any hardcoded-Morna assumptions; make "spin up a new {School} Vibes" (incl. the capability flags for the deep app) a clean, proven path.

## 7. Recommended way to run it

Solo, **phase by phase, as B1–B4** — each phase its own spec → plan → subagent build, with Tom at each gate. (The alternative — a multi-agent "product-team" fresh-eyes pass before building — was offered; this brief already captures the north-star, so the lighter path is recommended unless Tom wants the extra critique round.) *Proposed, adjustable on review.*

## 8. Deliberately out of scope / not yet decided

- Final parent-facing copy (the "VBE improves ___" headline, behaviour wording) — **Tom-owned**, legal-reviewed where it touches the observed behaviours.
- Whether the platform/company brand surfaces anywhere parent-facing (current decision: no — parents see only "{School} Vibes").
- Migration/retirement plan for the existing standalone marketing site (`main.schoolvbe.pages.dev`) — sequenced within Phase 2.
- The deep app's per-capability config UX (which flags, who sets them) — detailed in Phase 4.

## 9. Open items for the per-phase specs

- Phase 1: what exactly "tenant config" is (a `tenants`/`schools` config object: display name, theme, enabled-capability flags, slug) and how the shell reads it; the naming cutover (where "vibez"/"SchoolVBE" strings live today and what replaces them).
- Phase 2: the Learn content model (static vs CMS), and the redirect/retirement map from the old marketing routes.
- Phase 3: the exact home composition per state and which existing endpoints/hooks each tile reuses.
- Phase 4: the capability-flag schema + a checklist for "is anything still Morna-specific?"

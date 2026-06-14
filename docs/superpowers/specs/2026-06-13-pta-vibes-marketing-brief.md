# PTA VIBES — Marketing Surface Brief (Phase-2 backlog input)

**Date:** 2026-06-13
**Status:** Backlog brief — captured from Tom's dictation. NOT yet brainstormed-to-spec or built. Feeds **Phase 2** of the experience-redesign program.
**Type:** Discovery brief / content + capability capture. Not a build spec.
**Parent program:** [`2026-06-13-platform-experience-redesign-design.md`](./2026-06-13-platform-experience-redesign-design.md) — this feeds **Phase 2** (teach-then-ask front door + Learn area + complete-solution story; §5.1, §5.2 PTA pillar). Phase 1 (unified shell + tenant config + naming) shipped 2026-06-13.

> **Why a brief, not a build:** Tom's call (2026-06-13) — capture now, build with Phase 2. The standalone marketing site (`main.schoolvbe.pages.dev` / the `PublicLayout` in the unified app) is slated for retirement/fold-in during Phase 2, so building a new marketing page on it today would be throwaway. This brief preserves the content and decisions so Phase 2 picks them up.

---

## 1. The ask, in one line

A marketing/examples surface — **"Get your PTA VIBING / What a PTA with VIBES looks like"** — that showcases the PTA operating model (Cloudworkz IP), the engagement principles, and what the VIBES software does for a PTA. It is the public face of the PTA pillar of the complete-solution story.

## 2. Decomposition (three independent pieces)

Tom's brief bundles three things; treat them as separate units, the page first:

1. **The PTA VIBES marketing page** (this brief's primary subject) — content + positioning.
2. **Audience personalization for the marketing site** — a site-wide mechanism (self-select "I'm a school / parent / PTA / coalition"). Framework already written: `Resources/frameworks/audience-personalization-for-websites-V1.md` (+ working demo `audience-personalization-demo.html`). Its worked example *is* School Vibes. Recommended trigger: **self-select, client-side toggle** (SEO-safe, no platform). This is its own Phase-2 sub-brief — referenced here, not designed here.
3. **Legal-rights & effective-comms tools** for parents/PTAs — a value-add feature (know your legal rights; how to communicate with the school effectively). Its own backlog item — likely a Learn-area module + possibly an in-app tool, not just marketing copy.

## 3. The PTA VIBES page — content (captured verbatim-in-spirit from Tom)

**Headline candidates:** "Get your PTA VIBING." · "What a PTA with VIBES looks like."

### 3.1 The model: a 5-seat, equal-responsibility executive (the IP)
Five seats, **equal responsibility, not rank** (consistent with the operating-structure docx's "responsibility not rank"):

| Seat | Remit |
|---|---|
| **President** | The primary channel to the school (unless a matter is outside the President's remit). |
| **Vice President** | Focused on growing membership + community engagement. |
| **Chair** | Platform admin (the caretaker-admin / operational authority — maps to today's `role=pta` MANAGE; see B1 "admin = caretaker-Chair"). |
| **Secretary** | (standard) |
| **Treasurer** | (standard) |

Then two membership tiers below the exec:
- **Active Members** — participate in monthly meetings; **can run initiatives with sign-off from *any* exec member**.
- **Voting Members** (wider) — can **vote**, **raise issues**, and have **equal access to information**.

> **Alignment note for whoever builds this:** the in-app PTA layer (B1) already added `president`/`vice_president` to `PTA_OFFICER_ROLES` alongside chair/vice_chair/secretary/treasurer/domain_lead, and member tiers `executive_board`/`senior_group`/`general_membership`. Reconcile the marketing model's clean 5 seats + Active/Voting tiers with the built roles/tiers so the public model and the software match (or deliberately document where the public model simplifies the built one).

### 3.2 Why structure matters (the core argument)
Without this structure you get **second- and third-class citizens**:
- Parents **outside the PTA** have **no information** available to them.
- Parents **in the PTA but outside direct communications** know **less than the executive** — unless clear communications and documents exist.

VIBES levels this: **transparent by default, equal access to information**, async participation from anywhere. (Ties to redesign §5.2: "democratise information / transparency," "participation without a time commitment.")

### 3.3 What VIBES facilitates (the software value)
- Structured meetings + **rolling agendas**
- Reviewing the **data from survey results**
- **Formal questions and responses** to the school (the five-stage process)
- **Clear goals**
- **Initiatives that are tracked**

(All of this is already built in-app: B1 charter, B2 VOICE→PTA merge, B3 annual goals, B4 initiatives + five-stage school process + non-response tracking. The page *shows* it; the software *is* it.)

### 3.4 The engagement rules (most important — the IP's heart)
Tom's framing: **"We do not criticise the school, the PTA, or each other. We support the school, we support the PTA, and we support each other."**

Backed by the codified principles in `Projects/Morna/2026-06-13-pta-communication-principles-V1.md`:
- **Governing posture:** partners, not petitioners — every communication reads as *working with* the school.
- **The three hard rules:** (1) never criticise a person, only a gap in a document; (2) never claim the research describes *these* children, only environments like this one; (3) always end on the offer (drafted, free, changeable).
- **Five-stage initiative process:** Propose → Acknowledge → Discuss → Decide → Review; every proposal reaches a decision; **silence is recorded, not accepted**.
- **The send-check** before any communication to the school.

### 3.5 Value-add: legal rights & effective communication
Tools that ensure parents and PTAs **know their legal rights** and **know how to communicate with the school effectively**. (Piece #3 above — its own brief; flagged here as part of the value story.)

## 4. Audience personalization (piece #2, referenced)
Per `Resources/frameworks/audience-personalization-for-websites-V1.md`: the marketing site should reshape per audience (Schools / Parents / PTAs / Coalitions). PTA VIBES is the **PTA** variant's lead content. Recommended: self-select client-side toggle; inferred defaults later if paid campaigns run. The framework's §7 variant matrix already sketches the four tracks.

## 5. Open decisions (for Phase-2 design time)

1. **IP exposure (Tom-owned):** does the page **showcase the full 5-seat model + principles** publicly (thought-leadership / value-prop), or **tease the shape and reserve the detail behind sign-up**? Tom flagged the structure "is kind of our IP." Default assumption pending his call: showcase, because the model *is* the pitch — but confirm before publishing.
2. **Surface:** standalone marketing page vs a section of the Phase-2 per-audience front door vs a Learn-area module. (Leaning: the PTA track of the personalized front door + a deeper Learn module.)
3. **Public model vs built model reconciliation** (see §3.1 note).
4. **How much of the engagement principles is public** vs an in-product PTA resource (the principles doc is currently a Morna working doc).

## 6. Sources
- `Projects/Morna/2026-06-13-pta-communication-principles-V1.md` (vault) — the engagement-rules IP.
- `Resources/frameworks/audience-personalization-for-websites-V1.md` (+ `audience-personalization-demo.html`) (vault) — the personalization mechanism.
- `~/Downloads/Morna_PTA_Operating_Structure.docx` — the source operating-structure doc (three tiers, responsibility-not-rank, five-stage process).
- The built in-app PTA layer (B1 charter → B2 merge → B3 goals → B4 initiatives) — what the page showcases as live software.

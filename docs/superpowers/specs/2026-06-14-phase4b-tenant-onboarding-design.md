# Phase 4b — Tenant Onboarding & the Coalition (Chapter 1)

**Date:** 2026-06-14
**Branch:** feat/unified-app
**Status:** design — awaiting Tom's review before writing-plans

## 1. Context

This is the foundation the **north-star acceptance test** needs: *sign up with one email → create the school → invite my other emails → run the whole flow (sign up · share · register · approval · coalition · advocate · run diagnostics).* Today the only create-school path is the hardcoded `seed-morna.ts`; there is no `POST /schools`, no self-serve create, and no general invite.

### 1.1 The reframe (Tom, this session)
The unit a parent creates is **not a school they administer** — the school already exists in the world. What they create is a **VOICE / coalition** for their school. The rights model is **flat**: there is no "admin" tier; every member has the same right — **to share, and to build the coalition.** Growth happens by sharing, not by administering. This is VBE's own values made literal (equal access; "First-Class Parents"; no second/third-class citizens).

This maps onto the already-built **VOICE primitive** (parent collective + mission; membership *is* backing; public `/v/:id` share). 4b's "onboarding" is really **"start or join the coalition for your school"**, with the `schools` tenant row created quietly underneath.

### 1.2 Trust = the school, not an internal admin
At creation we capture the **school / PTA contact**. VIBES opens a channel to the school ("a parent coalition is forming — N families have joined; tell us if anyone isn't part of your community"). It is a **negative/exception check** (flag an imposter), default-trusting — not a positive gate. The school, the real-world authority on "who is a parent here", does the verifying. **Verification and advocacy are the same action**: the school watching the coalition grow *is* the adoption pressure.

### 1.3 Commercial model (clarified this session)
**Free for parents · free for PTAs · schools pay.** This maps onto the existing capability tiers with no model change:
- **Community/PTA tier** (`learn, diagnostic, voice, membership, results, concerns, pta`) — defaults **ON, free.**
- **Whole-school tier** (`safeguarding, lessons, behaviour`) — **OFF until the school adopts; this is the paid line.**

So "schools pay" = the whole-school capabilities switch on. Whole-school caps are therefore a **platform-operator / sales-controlled** switch, not self-serve.

### 1.4 Decomposition — three chapters, all to be built (build order, not parking)
The full "how it works" is three chapters; all get a **simple, visual, on-site explanation** (it *is* how the product works) and all are to be built, barriers permitting.

- **Chapter 1 (this spec) — Onboarding & the coalition.** The foundation; everything the north-star test exercises.
- **Chapter 2 — Legitimacy pathway.** See `2026-06-14-chapter2-legitimacy-pathway-IP.md`. Builds on B1/B2.
- **Chapter 3 — Elections.** See `2026-06-14-chapter3-elections-IP.md`. Builds on B3's voting engine.

Chapter 1 is first because 2 and 3 depend on it (charter/merge/voting must exist and a coalition must reach critical mass first).

## 2. Goals / Non-goals

**Goals (Chapter 1):**
1. Self-serve **create a school + its advocating VOICE** in one flat, no-admin flow.
2. **Open join + share** as the only growth mechanism ("invite" = share the link).
3. Capture **school/PTA contact** + a **"tell your school"** share card; record an in-app school-notification (auto-email when Resend lands).
4. **Short sign-up intake** → instant aggregate = first data delivered to PTA + school, growing per member.
5. **Threshold-gated** deep diagnostic + **report release** (no exec release button pre-PTA).
6. **Constitute-PTA → caretaker-Chair** promotion (`role: parent → pta`) — the one parent→exec moment.
7. **Slug policy** (auto-derive + editable + collision suffix) and **backfill Riverside → `riverside`**.
8. **Platform-operator capability toggle** so caps can be flipped without raw SQL; tenants see caps read-only.

**Non-goals (deferred to Ch2/Ch3 or later):**
- The PTA-relative legitimacy threshold, vote-of-no-confidence, school-acknowledgment-as-rep-group (Ch2).
- Elections: role descriptions, self-nomination, candidate questionnaire, the vote (Ch3).
- A full per-tenant moderation role (removal stays platform-operator in Ch1).
- Resend / verified domain (auto-email to the school is deferred; the share card covers it now).
- Multilingual re-language of new copy (English first; later pass).

## 3. Domain model & states

### 3.1 Person state (unchanged spine, reused from Phase 1/M2)
`anon → coalition member (role=parent, flat) → [PTA constituted] → caretaker-Chair / PTA member`.
`membershipStatus` semantics shift: open join means a new member is **active immediately** (no pending gate). `rejected` is now reachable only via the **flag/remove** path. (Implementation decides whether to default new members to `approved` or keep `pending` purely as an internal flag-state — see §4.3.)

### 3.2 Tenant lifecycle
`(no school) → school + advocating VOICE created → coalition grows → threshold met (deep diagnostic + report unlock) → PTA constituted (B1 adopt) → school adopts (whole-school caps / paid)`.

## 4. Design detail

### 4.1 Create the tenant — find-or-start
- `/find-school` stays the front door. Exists → join its coalition. Not found → **"Start one for {name}"**.
- New **`POST /api/schools`** (public, rate-limited): creates the `schools` row + an **advocating `voice_groups` row** ("{School} Vibes" or a founder-supplied coalition name) in one transaction. Seeds capabilities to the **free community tier** (the CAPABILITY_DEFAULTS already do this — store `{}` and resolve).
- Creator is **`role=parent`** like everyone else — no ownership/admin flag.
- **Slug:** `slugify(name)` with a uniqueness suffix (`-2`, `-3`…), surfaced to the creator and **editable** before commit. Unique constraint already on `schools.slug`.
- **Backfill Riverside → `riverside`** (fixes the NULL-slug gap that breaks `/s/:slug` + results links; already code-guarded in ResultsSection).
- **School/PTA contact** captured at create (name + email + optional phone). *Schema:* add light columns to `schools` (`contact_name`, `contact_email`) — chosen over a new table for v1 (one contact per tenant).

### 4.2 Join + share (= invite)
- Reuses the existing VOICE; **sign-up auto-backs it** (already built in `auth.ts`).
- **"Invite my emails" = share the `/v/:id` link.** No separate invite-email feature (consistent with flat rights and the no-Resend reality).
- **"Tell your school" share card:** at/after creation, generate a ready-to-send message + link (WhatsApp / copy / mailto) addressed to the captured school contact. Record an in-app **school-notification stub**; when Resend/domain lands, the same record auto-emails. Sharing-to-the-school is itself the flat "build the coalition" action.

### 4.3 Verification = flag, not gate
- **Join stays open**; members are active on join.
- The M2 approval queue **inverts**: from "approve to admit" → **"flag/remove an imposter"** on the school's word. The act of removal is a **platform-operator capability** in Ch1 (Tom), plus an in-app **"report this member"** affordance that records the report. No full per-tenant moderation role in Ch1.
- ⚠ **Behaviour change** vs M2's exec approval. Reconcile so the Riverside whole-school demo (which *does* use approve/anonymous-display) is not broken — see §6 regression guard.

### 4.4 Sign-up intake + threshold-gated deep diagnostic
- **Short intake at sign-up** (3–5 questions) — stored via the **existing unlinkable answer storage** (the `diagnostic_submissions`/`answers` model, day-truncated timestamps, no FK to identity). Modelled as a **short "intake" survey** distinct from the deep instrument.
- The **intake aggregate** is the **first data delivered to the PTA + school** (surfaced in-app now; carried in the school-notification). It grows with every member; honour the **n≥5 segment-suppression** rule already built.
- The **deep community diagnostic** (the existing 16-q instrument) is the **deep dive, unlocked when the coalition hits the release threshold.**
- ⚠ **Release is threshold-driven, not an exec button** (replaces M2's manual release pre-PTA). **Threshold value:** Ch1 default = the n≥5 privacy floor / a small configurable target on the tenant; Ch2 replaces it with the PTA-relative number. Manual exec release returns only *after* a PTA constitutes.

### 4.5 Constitute the PTA → caretaker-Chair (the one parent→exec point)
- When a member adopts the operating structure (B1 `POST /pta/charter/adopt`), **promote the actor `role=parent → role=pta`** (caretaker-Chair, exactly the B1 framing — "someone holds this until the seats fill"), in the same transaction as the charter claim. This *is* the "parent→exec role assignment" 4b item, resolved by **moment**, not an admin screen.
- ⚠ The only place a user's role auto-changes. Audit it (`role_promoted_caretaker_chair` or similar).

### 4.6 Capability config (platform-operator)
- New **`PATCH /api/schools/:slug/capabilities`** behind a **platform-operator guard** (role `admin`, and/or an env allowlist of platform-operator emails — implementation picks; must NOT be self-serve for a tenant). Lets Tom flip caps (e.g. Morna whole-school on/off) without raw SQL — needed to drive the acceptance test's pre/post-adoption states.
- Tenants continue to see caps **read-only** via the shipped "switched on as your school adopts" treatment (Phase 1/3).

### 4.7 The on-site "How it works" explainer (paired deliverable)
- A simple, visual, public explanation of all three stages (coalition → legitimacy → elections), since that *is* how the product works. Ships alongside the chapters; for Chapter 1, at minimum the **coalition stage** is explained on the public front door / `/learn` / `/how-it-works` surface. Final teaching copy follows the end-of-redesign content audit (Tom-owned).

## 5. Data flow (happy path — the acceptance test)
1. Tom signs up (email #1) at `/find-school` → "start one for {School}" → `POST /api/schools` → school+VOICE created, slug shown, school contact captured, **role=parent**.
2. Short intake answered → first aggregate recorded.
3. Tom shares the `/v/:id` link (and the "tell your school" card) → emails #2/#3 sign up → auto-back the VOICE → answer intake → counter + aggregate grow.
4. Threshold met → deep diagnostic unlocks + report releases to members.
5. Tom (or a member) **constitutes the PTA** (adopt operating structure) → role→pta (caretaker-Chair) → runs B1–B4 (goals/initiatives/voting/announcements).
6. Tom flips Morna's whole-school caps via the platform-operator toggle to exercise the pre/post-adoption surfaces.

## 6. Regression guard
- The **Riverside whole-school demo** uses the *current* approve-then-display and exec-release flows. The flat-join + threshold-release changes must be gated so they apply to **community-tier tenants** (Morna), while whole-school tenants (Riverside) retain their existing membership/release behaviour. Capability flags are the natural discriminator (e.g. release-on-threshold applies where `pta`/`results` community-mode; manual release where whole-school). Implementation must prove both Morna (community) and Riverside (whole-school) paths in-browser.
- Staff/pupil navs and dashboards untouched.

## 7. Prod rollout
⚠ **Chapter 1 is schema-touching** (new `schools.contact_*` columns; an intake-survey marker / release-threshold field; possibly a notifications/report row). Per Tom's rule, the deploy push is **gated on Tom** — apply the DDL via the **Railway Data box** before `git push` (statements one at a time, additive `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), then push (Railway auto-deploys). Final DDL listed in the implementation plan.

## 8. Decisions log
- **Onboarding model:** open self-serve + instant; creator is a flat parent, not an admin. *(Tom)*
- **Pre-PTA powers:** no internal exec; the **school verifies** (flag-to-remove); growth = advocacy. *(Tom)*
- **School channel now:** capture contact + share card + in-app stub; auto-email when Resend lands. *(Tom — option 1)*
- **Results release:** threshold-driven (same number as legitimacy), not an exec button, pre-PTA. *(Tom)*
- **Sign-up data:** short intro intake (first data) + deep diagnostic unlocked at threshold. *(Tom)*
- **Parent→exec:** auto-promote to caretaker-Chair at PTA constitution only. *(recommended; Tom to confirm in review)*
- **Capabilities:** platform-operator toggle, not tenant self-serve (schools pay). *(recommended)*

## 9. Open / Tom-owned
- Final teaching/marketing copy for the "How it works" explainer (content audit).
- Whether the platform-operator guard is `role=admin` vs an env email allowlist.
- Confirm §4.5 auto-promote and §4.4 threshold default before plan.

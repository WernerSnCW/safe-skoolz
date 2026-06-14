# Chapter 2 — Legitimacy Pathway (IP capture, to be brainstormed in detail)

**Date:** 2026-06-14 · **Status:** captured IP, not yet a full design. Builds on Chapter 1 (`2026-06-14-phase4b-tenant-onboarding-design.md`) + the shipped B1 (charter) / B2 (VOICE→PTA merge).

> Captured verbatim-in-spirit from Tom this session. This is **how a VOICE earns the right to change the PTA.** Build after Chapter 1. Needs its own brainstorm→spec→plan before building (the threshold maths, the refusal branches, and the school-acknowledgment flow each have open design questions).

## The pathway
1. **Measure the incumbent.** Ask the PTA how many members it has; ask the PTA to **share VIBES with its members**.
2. **Threshold to act.** Once **VOICE members (including PTA members who've joined the VOICE) exceed the PTA members who have *not* joined**, the VOICE members may **join the PTA and formally ask for VBE/VIBES adoption**.
   - i.e. trigger when `voiceMembers > (ptaTotal − overlap)`.
   - This same threshold drives the **diagnostic deep-dive unlock + report release** (Chapter 1 §4.4).
3. **If the PTA refuses adoption →** a **vote of no confidence** is possible.
   - ⚠ **Placement:** this lives in **FAQs**, NOT front-facing marketing materials. *(Tom, explicit.)*
4. **If the PTA refuses membership →** the VOICE requests that the **school formally acknowledges it as a parent representative group.**
5. **Outcome → unlocks Chapter 3 (elections):** the VOICE has either **converged with the PTA** (B2 merge) **or** been **acknowledged by the school as a representative group.**

## Open questions for the Chapter 2 brainstorm
- How is the incumbent PTA's member count captured/trusted (self-declared by an officer? school-confirmed?).
- What exactly does "join the PTA & ask for adoption" do mechanically vs B2's existing convert.
- No-confidence: who can call it, electorate, quorum, what carrying it does (reuses B3's electorate-aware ballots).
- School-acknowledgment-as-rep-group: data model + how the school records it (ties to the school channel from Ch1 §4.2).

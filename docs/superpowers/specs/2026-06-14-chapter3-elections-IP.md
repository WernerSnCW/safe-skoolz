# Chapter 3 — Elections (IP capture, to be brainstormed in detail)

**Date:** 2026-06-14 · **Status:** captured IP, not yet a full design. Builds on Chapter 1 + Chapter 2, and the shipped B3 electorate-aware voting (`pta_ballots`).

> Captured from Tom this session. Once a VOICE has **converged with the PTA or been acknowledged as a representative group** (Chapter 2 outcome), **VIBES facilitates elections.** Build after Chapters 1 & 2; needs its own brainstorm→spec→plan.

## KEY SEQUENCING (Tom, 2026-06-14)
**The VIBE operating structure cannot be formally adopted until elections have taken place.** No caretaker-Chair adopts it unilaterally — the *elected* committee adopts it. So the order is: legitimacy (Ch2) → **elections (this chapter)** → **formal adoption** of the structure by the elected officers → PTA operates (B1–B4). The charter/role *definitions* must be visible BEFORE the vote (candidates need to know what they're standing for); the *formal adoption act* (`schools.ptaClaimedAt` + filled `pta_officers` seats) happens AFTER. **This supersedes the shipped B1 model** ("admin = caretaker-Chair adopts, ratified over time") — B1's adopt-path must be revised here so adoption is post-election, not caretaker-initiated.

## Mechanics
- **Roles are described.** Each role (the 5-seat "responsibility not rank" model — President / Vice-President / Chair / Secretary / Treasurer) carries a **description + responsibilities**, shown to voters and candidates.
- **Self-nomination, open to all.** Any member can **put themselves forward for any role.**
- **Willingness levels.** For each role a candidate signals **"want the job"** or **"willing to do the job"** — two distinct levels.
- **Candidate questionnaire.** Those standing answer a **short set of questions**, which are **shared digitally with everyone** (transparency — every voter sees the same information).
- **The vote.** A vote ensues, reusing the `pta_ballots` voting engine (one-vote-per-member, quorum, electorate from B3).

## Open questions for the Chapter 3 brainstorm
- Election lifecycle (nomination window → questionnaire publish → voting window → result → seat assignment that sets `pta_officers` + the user's exec role).
- Multi-seat / multi-role ballots vs one ballot per role.
- How "want" vs "willing" influences the slate / tie-breaks / display.
- Re-run / vacancy / term-end handling (ties to `pta_officers` term model).
- How a won seat reconciles with Chapter 1's caretaker-Chair (caretaker dissolves as elected seats fill).

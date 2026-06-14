# vibez Content Production System — Direction (Tom, 2026-06-14)

Tom's call: don't hand-audit content — build a **content production SYSTEM** modelled on the **Unlock content brain** (the `cloudworkz-os` MCP), with **VBE + PTA content skills** and a **sign-off process** (Tom gives final sign-off, never audits raw). This supersedes the "manual content audit + register" approach from the grill (GL1–GL6 remain the governing rules; they become the system's compliance layer).

## The reference model — the Unlock content brain (`cloudworkz-os` MCP)
A governed, queryable content system. Structure (from `describe_unlock` + the tool surface):
- **Content pillars** — N canonical pillars, each with **verbatim canonical wording**, target belief-stages, preferred channels (`query_pillars`, `get_canonical_wording`).
- **Personas** — bullseye audiences with structural definitions.
- **Brand voice** — per-channel **voice locks** (Tom-voice = house style); `voice_examples` returns approved exemplars.
- **Compliance posture** — **LOCKED, mandatory** disclosures/disclaimers per channel, verbatim (`query_compliance`, `get_compliance_for`).
- **Surfaces / moments / channels** — where a rendering is delivered (`list_surfaces`, `list_moments`).
- **Renderings** — approved content per surface/moment, with `modified_by` author + voice lock = the **sign-off trail** (`query_renderings*`, `query_atoms`, `get_objection_response`).
- Operated via the `cloudworkz-unlock-content-brain:brain` skill (drafts only FROM the brain — "synthesise from it only, do not add outside knowledge").

## The vibez equivalent (to build)
| Unlock | vibez |
|---|---|
| Content pillars + canonical wording | **VBE pillars** — the cause (VBE), **G1** (school adopts VBE), **G2** (PTA adopts open structure), parent voice, **PTA-as-partner**, the 5-stage journey, private-first remediation — each with canonical verbatim wording |
| Bullseye personas | the **four stakeholders** (parents = bullseye; also PTAs, schools, pupils), per-school tenant skin "{School} vibez" |
| Voice locks | the **vibez voice** — GL3 non-adversarial ("invitation, not campaign"; never adversarial to school OR PTA) |
| LOCKED compliance constants | **GL1–GL6** (naming/spelling, two-goal scope, non-adversarial-to-both, citation/pattern care, private-first, selective three-depth) + the §8 AI-rules-engine **hard-discard rules** |
| Surfaces + renderings + sign-off | journey stages, marketing pages, join/mandate statement, engagement Q/I — **renderings Tom approves** (final sign-off) |

Source material to populate it: the **Accord Vibes PTA Brief V3**, the parent-voice IP (`docs/content/2026-06-14-pta-parent-voice-and-communication.md`), the vault `Companies/SchoolVBE/Acid-Content/` + `documents/` (Morna Values Working Paper, Anti-Bullying Policy, Pupil Values, VbE Adoption Pathway, PSHE Programme of Study), and the content-audit report (`Companies/SchoolVBE/Brain-Box/working/content-audit-report-V1.md`).

## Components to build (the sub-project)
1. **A vibez content brain** — pillars · personas · voice locks · GL1–GL6 as LOCKED compliance constants · surfaces · renderings with a sign-off trail. (Decide: a DB-backed brain like Unlock's `cloudworkz-os` MCP, vs a lighter structured-vault + skill version — a brainstorm decision.)
2. **A VBE content skill** + **a PTA content skill** — draft ONLY from the brain (the `brain`-skill pattern); VBE-specific + PTA-specific sections.
3. **A sign-off workflow** — renderings move draft → Tom-approved (final sign-off); Tom never audits raw; mechanical GL-conformance is automatic.

## Status / next
- **New sub-project — needs its own brainstorm → spec → plan → build** (build a fresh session, like Ch2; substantial).
- GL1–GL6 (`docs/content/2026-06-14-content-guidelines-V1.md`) are the governing rules feeding the compliance layer.
- The grill's concrete cleanup (revert the shipped `Vibes`→`vibez` drift) can be done independently/now.
- The standalone "manual content audit" is SUPERSEDED by this system (the system produces + governs content; Tom signs off).

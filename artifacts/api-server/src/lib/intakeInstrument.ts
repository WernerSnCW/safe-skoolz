// Phase 4b (spec §4.4): the SHORT sign-up intake — multiple-choice,
// select-all-that-apply across the three fixed domains. The format and the three
// domains are fixed here; the exact OPTION WORDING is PLACEHOLDER and Tom-owned
// (end-of-redesign content audit). Each domain mixes negative + positive options
// so the tally reads as a pulse, not a complaints box. The deep diagnostic
// expands within these same three domains.
//
// Shape matches communityInstrument.InstrumentQuestion. type "multi" => the
// frontend renders checkboxes; submit stores one answer row per selected index.

export interface IntakeQuestion {
  key: string;
  section: string;
  text: string;
  type: "multi";
  options: string[]; // selectable, in order; index is the stored answer value
}

export const INTAKE_INSTRUMENT: IntakeQuestion[] = [
  {
    key: "intake_pta_comms",
    section: "Communications from the PTA",
    type: "multi",
    text: "Thinking about how the PTA communicates with families, which of these match your experience? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "I rarely hear what the PTA is doing", // negative
      "I'm not sure how to raise something with the PTA", // negative
      "I don't feel my views reach the PTA", // negative
      "The PTA keeps families well informed", // positive
      "I know how to get involved if I want to", // positive
    ],
  },
  {
    key: "intake_pupil_issues",
    section: "Pupil issues at school",
    type: "multi",
    text: "Which of these has your child experienced or witnessed at school? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "Unkindness or exclusion from other children", // negative
      "Being targeted over money, clothes or possessions", // negative
      "Seeing something and not feeling able to speak up", // negative
      "My child generally feels they belong here", // positive
      "My child has good friendships at school", // positive
    ],
  },
  {
    key: "intake_school_response",
    section: "How the school handles situations",
    type: "multi",
    text: "When something goes wrong, which of these match how the school responds? (Select all that apply.)",
    options: [
      // PLACEHOLDER WORDING — Tom-owned (content audit)
      "Concerns I raised weren't resolved", // negative
      "I didn't hear back after raising something", // negative
      "It wasn't clear what the school did about it", // negative
      "The school responded clearly and in good time", // positive
      "The school kept me informed about what happened", // positive
    ],
  },
];

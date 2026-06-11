// The Morna community diagnostic instrument (spec §4.5).
// Anchored to the six recurring patterns from the community diagnosis so the
// released results map one-to-one onto the values proposal. Stored as data on
// diagnostic_surveys.instrument — this module is only the canonical source the
// seed writes from.

export const FREQ_OPTIONS = ["Never", "Once or twice", "Several times", "Ongoing", "Not sure"];
export const AGREE_OPTIONS = [
  "Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree", "Doesn't apply / not sure",
];

export interface InstrumentQuestion {
  key: string;
  section: string;
  text: string;
  type: "scale" | "text";
  options?: string[];
  optional?: boolean;
}

export const MORNA_YEAR_GROUPS = [
  "Nursery", "Reception",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13",
];

export const MORNA_INSTRUMENT: InstrumentQuestion[] = [
  // Pattern 01 — coordinated group conduct
  { key: "group_conduct_exp", section: "Group behaviour", type: "scale", options: FREQ_OPTIONS,
    text: "My child has experienced unkind behaviour from a group of children acting together (rather than one child acting alone)." },
  { key: "group_conduct_attrib", section: "Group behaviour", type: "scale", options: AGREE_OPTIONS,
    text: "When group incidents have happened, the school identified everyone involved — including who led it." },
  // Pattern 02 — sophisticated social exclusion
  { key: "exclusion_exp", section: "Exclusion", type: "scale", options: FREQ_OPTIONS,
    text: "My child has been deliberately excluded — left out in ways that are hard to see but clearly intentional." },
  { key: "exclusion_recognised", section: "Exclusion", type: "scale", options: AGREE_OPTIONS,
    text: "Adults at school recognised the exclusion without us having to push for it." },
  // Pattern 03 — status-based targeting
  { key: "status_exp", section: "Status and possessions", type: "scale", options: FREQ_OPTIONS,
    text: "My child has experienced or witnessed children being targeted over money, clothes, or possessions." },
  // Pattern 04 — age-inappropriate conduct
  { key: "age_conduct_exp", section: "Age-appropriate behaviour", type: "scale", options: FREQ_OPTIONS,
    text: "My child has been exposed at school to behaviour or content that is not appropriate for their age." },
  { key: "expectations_clear", section: "Age-appropriate behaviour", type: "scale", options: AGREE_OPTIONS,
    text: "The school's expectations are clear enough that my child knows what is and isn't acceptable here." },
  // Pattern 05 — bystander passivity
  { key: "bystander_exp", section: "Speaking up", type: "scale", options: FREQ_OPTIONS,
    text: "My child has seen other children being treated unkindly and felt unable to speak up or get help." },
  { key: "standing_up_named", section: "Speaking up", type: "scale", options: AGREE_OPTIONS,
    text: "Standing up for others is an explicit, named expectation at the school." },
  // Pattern 06 — isolation in a transient community
  { key: "isolation_exp", section: "Belonging and inclusion", type: "scale", options: FREQ_OPTIONS,
    text: "My child has gone through periods of having no one — when they arrived, or after friends left." },
  { key: "inclusion_new", section: "Belonging and inclusion", type: "scale", options: AGREE_OPTIONS,
    text: "The school actively helps new and isolated children find their feet." },
  { key: "belonging", section: "Belonging and inclusion", type: "scale", options: AGREE_OPTIONS,
    text: "My child feels they belong at this school." },
  // Cross-cutting — reporting and the school's response
  { key: "reported_concern", section: "The school's response", type: "scale",
    options: ["We've never needed to", "Yes, we have", "No — we didn't feel able to", "Prefer not to say"],
    text: "Have you ever reported a bullying or wellbeing concern to the school?" },
  { key: "response_confidence", section: "The school's response", type: "scale", options: AGREE_OPTIONS,
    text: "When concerns are raised, the school's response is clear, timely, and communicated back to families." },
  { key: "conflict_distinction", section: "The school's response", type: "scale", options: AGREE_OPTIONS,
    text: "The school distinguishes properly between a conflict between equals and bullying — where one child holds power over another." },
  // Open question
  { key: "open_message", section: "In your own words", type: "text", optional: true,
    text: "What is the one thing about life at the school that you most want other parents — and the school — to understand?" },
];

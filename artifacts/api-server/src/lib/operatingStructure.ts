// The PTA operating-structure charter (B1). policyVersion is what
// pta_policy_acknowledgements rows reference when an officer adopts/acknowledges.
export const OPERATING_STRUCTURE_VERSION = "operating-structure-v1";

export interface CharterSection { heading: string; body: string }

export const OPERATING_STRUCTURE: { version: string; title: string; sections: CharterSection[] } = {
  version: OPERATING_STRUCTURE_VERSION,
  title: "PTA — Operating Structure",
  sections: [
    { heading: "Purpose",
      body: "The PTA adopts this structure so that every parent has an equal voice and the same information — ending the situation where what shapes school life is visible only to a small committee." },
    { heading: "Three tiers — responsibility, not rank",
      body: "General membership: every approved parent. Senior group: members who take on coordinating work. Executive: the officers. A member's tier records the work they have taken on, never authority over others." },
    { heading: "Officer roles",
      body: "President — the school relationship. Vice President — wellbeing. Secretary — community. Chair — operational governance. Treasurer — finance. Seats are held by approved members; an acting admin carries the Chair's operational authority until a Chair is approved." },
    { heading: "How we govern",
      body: "Decisions and goals are visible to all members. Goals are proposed by any member or the wider community and ratified by a senior-group vote. Initiatives self-approve against a clear checklist and track the school's response — and a non-response is recorded as a non-response. Silence is not acceptance." },
  ],
};

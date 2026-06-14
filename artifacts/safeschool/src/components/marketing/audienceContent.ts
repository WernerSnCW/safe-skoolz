import type { Audience } from "@/providers/audience";

export type AudienceContent = {
  whyItMatters: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  whatYouGet: {
    eyebrow: string;
    title: string;
    items: { title: string; body: string }[];
  };
  goDeeper: { label: string; href: string };
  askLabel: string;
};

// NOTE: "Why it matters" wording describes the behaviours the diagnostic
// measures. Final copy is Tom-owned and legal-reviewed (spec §8) — the strings
// below are honest drafts, safe to ship as placeholder, replace on sign-off.
export const AUDIENCE_CONTENT: Record<Audience, AudienceContent> = {
  all: {
    whyItMatters: {
      eyebrow: "Why it matters",
      title: "Values show up in how a community behaves",
      body: "VBE works on the everyday patterns a school and its community can actually see — how children treat each other, and how the adults respond. The diagnostic measures those patterns so you start from evidence, not assumption.",
      points: [
        "How children treat each other day to day",
        "How the school responds when they fall short",
        "Whether parents have a real, structured voice",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A complete VBE operating system for your community",
      items: [
        { title: "The real picture", body: "See the diagnostic results — the honest read on where your community stands." },
        { title: "A voice with weight", body: "Back the change, raise concerns, and shape what happens next." },
        { title: "Operate well together", body: "The structure a PTA, a school, and parents need to actually get things done." },
      ],
    },
    goDeeper: { label: "Explore by who you are", href: "/schools" },
    askLabel: "Find your school",
  },

  schools: {
    whyItMatters: {
      eyebrow: "For schools",
      title: "Adopt VBE on evidence, not a hunch",
      body: "Before you commit, see where your community actually stands. The diagnostic surfaces the behaviour patterns VBE is designed to improve, so adoption is grounded and your parents are already behind it.",
      points: [
        "A baseline read of your community in days, not terms",
        "Parents brought along before you commit",
        "A 10-day rollout, not a year-long programme",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "Everything your SLT, staff, parents and pupils need",
      items: [
        { title: "Run the diagnostic", body: "A readiness read on your community before you decide." },
        { title: "Adopt in 10 days", body: "The full pack — lessons, PSHE, safeguarding — ready to deploy." },
        { title: "Respond with evidence", body: "Safeguarding and incidents on record; embed VBE and show it." },
      ],
    },
    goDeeper: { label: "See how schools adopt VBE", href: "/schools" },
    askLabel: "Find your school",
  },

  parents: {
    whyItMatters: {
      eyebrow: "For parents",
      title: "Your child's school runs on its values",
      body: "How children treat each other — and how the school responds when they do not — shapes your child's day. VBE works on exactly those patterns, and you get a real, structured way to be part of it.",
      points: [
        "A voice that does not depend on attending meetings",
        "Concerns that reach the right place, not a dead end",
        "See the real picture once results are released",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A real voice, from anywhere, any time",
      items: [
        { title: "Back the change", body: "Add your weight to your school adopting VBE." },
        { title: "Raise a concern", body: "A structured channel that goes somewhere — not ad hoc." },
        { title: "Stay informed", body: "The results and what the PTA is doing, shared with you." },
      ],
    },
    goDeeper: { label: "See how parents take part", href: "/parents" },
    askLabel: "Find your school",
  },

  ptas: {
    whyItMatters: {
      eyebrow: "For PTAs",
      title: "Without structure, parents become second- and third-class citizens",
      body: "Parents outside the PTA get no information. Parents inside it but outside the inner circle know less than the executive. A PTA with VIBES levels that: transparent by default, equal access to information, participation from anywhere.",
      points: [
        "No structure means information lives with a few people",
        "Busy and overseas parents are shut out of the in-person model",
        "Good ideas stall without owners, criteria, or a process",
      ],
    },
    whatYouGet: {
      eyebrow: "What you get",
      title: "A PTA with VIBES — the operating infrastructure",
      items: [
        { title: "Five seats, equal responsibility", body: "President, VP, Chair, Secretary, Treasurer — responsibility, not rank." },
        { title: "Transparent by default", body: "Voting, decisions, goals and initiatives, visible to every member." },
        { title: "Get things done", body: "Rolling agendas, tracked initiatives, formal questions to the school." },
      ],
    },
    goDeeper: { label: "Get your PTA VIBING", href: "/ptas" },
    askLabel: "Find your school",
  },
};

const TIER_3_CATEGORIES = ["sexual", "coercive"];
const TIER_2_CATEGORIES = ["physical", "psychological", "online"];

const MANDATORY_REFERRAL_CATEGORIES = ["sexual", "coercive"];

function parseCategories(category: string): string[] {
  return category.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
}

export function determineEscalationTier(category: string): number {
  const cats = parseCategories(category);
  if (cats.some(c => TIER_3_CATEGORIES.includes(c))) return 3;
  if (cats.some(c => TIER_2_CATEGORIES.includes(c))) return 2;
  return 1;
}

export function isSafeguardingTrigger(category: string): boolean {
  const cats = parseCategories(category);
  return cats.some(c => TIER_3_CATEGORIES.includes(c));
}

export interface MandatoryReferralResult {
  required: boolean;
  reasons: string[];
  suggestedBody: string | null;
}

export function checkMandatoryReferral(opts: {
  category: string;
  escalationTier: number;
  isRepeatRedAlert?: boolean;
}): MandatoryReferralResult {
  const reasons: string[] = [];
  const cats = parseCategories(opts.category);

  if (opts.escalationTier >= 3) {
    reasons.push("Tier 3 escalation requires mandatory external referral");
  }

  if (cats.some(c => MANDATORY_REFERRAL_CATEGORIES.includes(c))) {
    reasons.push(`Category "${cats.filter(c => MANDATORY_REFERRAL_CATEGORIES.includes(c)).join(", ")}" triggers mandatory referral`);
  }

  if (opts.isRepeatRedAlert) {
    reasons.push("Repeat red-level pattern alert triggers mandatory referral");
  }

  const required = reasons.length > 0;

  let suggestedBody: string | null = null;
  if (required) {
    if (cats.includes("sexual")) {
      suggestedBody = "Child Protection Services / Policía Nacional";
    } else if (cats.includes("coercive")) {
      suggestedBody = "Child Protection Services / Social Services";
    } else {
      suggestedBody = "Local Child Protection Authority";
    }
  }

  return { required, reasons, suggestedBody };
}

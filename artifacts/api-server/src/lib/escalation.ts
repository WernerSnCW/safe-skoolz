const TIER_3_CATEGORIES = ["sexual", "coercive"];
const TIER_2_CATEGORIES = ["physical", "psychological", "online"];

export function determineEscalationTier(category: string): number {
  if (TIER_3_CATEGORIES.includes(category)) return 3;
  if (TIER_2_CATEGORIES.includes(category)) return 2;
  return 1;
}

export function isSafeguardingTrigger(category: string): boolean {
  return TIER_3_CATEGORIES.includes(category);
}

/**
 * Golden Visa investment thresholds for Greece (Law 5038/2023).
 * Tier A (prime regions): €800,000 minimum investment
 * Tier B (all other regions): €400,000 minimum investment
 */

export const GOLDEN_VISA_HIGH_TIER_REGIONS = new Set([
  // English names / transliterations
  "attica",
  "athens",
  "athina",
  "attiki",
  "thessaloniki",
  "mykonos",
  "mykonos island",
  "santorini",
  "thira",
  // Greek names
  "θήρα",
  "σαντορίνη",
  "μύκονος",
  "αθήνα",
  "θεσσαλονίκη",
  "αττική",
]);

export const GOLDEN_VISA_THRESHOLD_TIER_A = 800_000;
export const GOLDEN_VISA_THRESHOLD_TIER_B = 400_000;

/**
 * Returns the Golden Visa investment threshold for a given region/municipality.
 * Normalizes input to lowercase before matching.
 *
 * @param region - The property's regional_unit or similar region field
 * @param municipality - The property's municipality field (checked if region doesn't match)
 * @returns €800,000 for Tier A regions, €400,000 for Tier B
 */
export function getGoldenVisaThreshold(
  region?: string | null,
  municipality?: string | null
): number {
  const normalize = (s: string) => s.trim().toLowerCase();

  if (region && GOLDEN_VISA_HIGH_TIER_REGIONS.has(normalize(region))) {
    return GOLDEN_VISA_THRESHOLD_TIER_A;
  }
  if (
    municipality &&
    GOLDEN_VISA_HIGH_TIER_REGIONS.has(normalize(municipality))
  ) {
    return GOLDEN_VISA_THRESHOLD_TIER_A;
  }
  return GOLDEN_VISA_THRESHOLD_TIER_B;
}

"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateBatchMatches,
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type {
  ClientForMatching,
  PropertyForMatching,
  MatchAnalytics,
  MatchResultWithClient,
  MatchResultWithProperty,
  MatchDistribution,
  ClientSummary,
  PropertyWithMatchStats,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptMandateForOrg } from "@/lib/model-encryption";

/**
 * Mandate match analytics — additional statistics for the mandate tab
 */
export interface MandateMatchStats {
  totalMandates: number;
  activeMandates: number;
  mandatesWithMatches: number;
  avgMatchScore: number;
}

/**
 * Complete mandate match analytics payload
 */
export interface MandateMatchAnalytics extends MatchAnalytics {
  mandateStats: MandateMatchStats;
}

// ──────────────────────────────────────────────
// Helpers (extracted to reduce cognitive complexity)
// ──────────────────────────────────────────────

/**
 * Map a mandate's transaction_type to a ClientForMatching intent value.
 */
function mapTransactionToIntent(transactionType: string | null): string | null {
  switch (transactionType) {
    case "SALE":
      return "BUY";
    case "RENTAL":
    case "SHORT_TERM":
      return "RENT";
    default:
      return null;
  }
}

/**
 * Parse the mandate's areas_of_interest JSON and merge municipality/region.
 */
function buildAreasOfInterest(
  areasJson: unknown,
  municipality: string | null,
  region: string | null,
): string[] {
  const areas: string[] = [];

  if (areasJson && Array.isArray(areasJson)) {
    areas.push(...(areasJson as string[]));
  }
  if (municipality && !areas.includes(municipality)) {
    areas.push(municipality);
  }
  if (region && !areas.includes(region)) {
    areas.push(region);
  }
  return areas;
}

/**
 * Parse the mandate's amenities JSON into a required-amenities string array.
 */
function parseAmenitiesFromMandate(amenities: unknown): string[] | undefined {
  if (!amenities) return undefined;

  if (typeof amenities === "object" && amenities !== null && !Array.isArray(amenities)) {
    const record = amenities as Record<string, boolean>;
    const required = Object.entries(record)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    return required.length > 0 ? required : undefined;
  }

  if (Array.isArray(amenities)) {
    return amenities as string[];
  }

  return undefined;
}

type MandateRow = Awaited<ReturnType<typeof fetchActiveMandates>>[number];
type PropertyRow = Awaited<ReturnType<typeof fetchActiveProperties>>[number];

async function fetchActiveMandates(organizationId: string) {
  return prismadb.mandate.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draft_status: { not: true },
    },
    select: {
      id: true,
      friendlyId: true,
      title: true,
      transaction_type: true,
      property_type: true,
      property_purpose: true,
      areas_of_interest: true,
      municipality: true,
      region: true,
      size_min_sqm: true,
      size_max_sqm: true,
      budget_min: true,
      budget_max: true,
      bedrooms_min: true,
      bedrooms_max: true,
      bathrooms_min: true,
      bathrooms_max: true,
      floor_min: true,
      floor_max: true,
      ground_floor_only: true,
      condition: true,
      heating_type: true,
      energy_cert_min: true,
      furnished: true,
      elevator: true,
      parking: true,
      pets_allowed: true,
      amenities: true,
      status: true,
      assigned_to: true,
      organizationId: true,
      clientId: true,
    },
  });
}

async function fetchActiveProperties(organizationId: string) {
  return prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: {
        in: ["ACTIVE", "PENDING"],
      },
    },
    select: {
      id: true,
      friendlyId: true,
      property_name: true,
      price: true,
      property_type: true,
      transaction_type: true,
      property_status: true,
      area: true,
      address_city: true,
      address_state: true,
      municipality: true,
      bedrooms: true,
      bathrooms: true,
      size_net_sqm: true,
      size_gross_sqm: true,
      square_feet: true,
      floor: true,
      elevator: true,
      accepts_pets: true,
      furnished: true,
      heating_type: true,
      energy_cert_class: true,
      condition: true,
      amenities: true,
      assigned_to: true,
      organizationId: true,
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          document_file_url: true,
        },
        take: 1,
      },
    },
  });
}

/**
 * Adapt a single mandate row into the ClientForMatching shape.
 */
function adaptMandateToClient(m: MandateRow): ClientForMatching {
  const intent = mapTransactionToIntent(m.transaction_type);
  const purpose = m.property_purpose ?? null;
  const areasOfInterest = buildAreasOfInterest(m.areas_of_interest, m.municipality, m.region);

  const propertyPreferences: NonNullable<ClientForMatching["property_preferences"]> = {
    bedrooms_min: m.bedrooms_min ?? undefined,
    bedrooms_max: m.bedrooms_max ?? undefined,
    bathrooms_min: m.bathrooms_min ?? undefined,
    bathrooms_max: m.bathrooms_max ?? undefined,
    size_min_sqm: m.size_min_sqm ? Number(m.size_min_sqm) : undefined,
    size_max_sqm: m.size_max_sqm ? Number(m.size_max_sqm) : undefined,
    floor_min: m.floor_min ?? undefined,
    floor_max: m.floor_max ?? undefined,
    ground_floor_only: m.ground_floor_only ?? undefined,
    requires_elevator: m.elevator ?? undefined,
    requires_parking: m.parking ?? undefined,
    requires_pet_friendly: m.pets_allowed ?? undefined,
    furnished_preference: m.furnished ?? undefined,
    heating_preferences: m.heating_type && m.heating_type.length > 0
      ? m.heating_type
      : undefined,
    energy_class_min: m.energy_cert_min ?? undefined,
    condition_preferences: m.condition && m.condition.length > 0
      ? m.condition
      : undefined,
    amenities_required: parseAmenitiesFromMandate(m.amenities),
  };

  return {
    id: m.id,
    client_name: m.title || "Untitled Mandate",
    full_name: null,
    intent: intent as ClientForMatching["intent"],
    purpose: purpose as ClientForMatching["purpose"],
    budget_min: m.budget_min,
    budget_max: m.budget_max,
    areas_of_interest: areasOfInterest.length > 0 ? areasOfInterest : null,
    property_preferences: propertyPreferences,
    client_status: "ACTIVE" as ClientForMatching["client_status"],
    assigned_to: m.assigned_to,
    organizationId: m.organizationId,
  };
}

/**
 * Convert a property row to the PropertyForMatching shape.
 */
function adaptPropertyForMatching(p: PropertyRow): PropertyForMatching {
  return {
    id: p.id,
    property_name: p.property_name,
    price: p.price !== null && p.price !== undefined ? Number(p.price) : null,
    property_type: p.property_type as PropertyForMatching["property_type"],
    transaction_type: p.transaction_type as PropertyForMatching["transaction_type"],
    property_status: p.property_status as PropertyForMatching["property_status"],
    area: p.area,
    address_city: p.address_city,
    address_state: p.address_state,
    municipality: p.municipality,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    size_net_sqm: p.size_net_sqm,
    size_gross_sqm: p.size_gross_sqm,
    square_feet: p.square_feet !== null && p.square_feet !== undefined ? Number(p.square_feet) : null,
    floor: p.floor,
    elevator: p.elevator,
    accepts_pets: p.accepts_pets,
    furnished: p.furnished as PropertyForMatching["furnished"],
    heating_type: p.heating_type as PropertyForMatching["heating_type"],
    energy_cert_class: p.energy_cert_class as PropertyForMatching["energy_cert_class"],
    condition: p.condition as PropertyForMatching["condition"],
    amenities: p.amenities as PropertyForMatching["amenities"],
    assigned_to: p.assigned_to,
    organizationId: p.organizationId,
  };
}

// ──────────────────────────────────────────────
// Main server action
// ──────────────────────────────────────────────

/**
 * Get mandate-to-property match analytics for the dashboard.
 *
 * Adapts each active mandate into the ClientForMatching shape so the
 * existing batch matching algorithm can be reused without modification.
 */
export async function getMandateMatchAnalytics(): Promise<MandateMatchAnalytics> {
  // Permission check: same permission as regular matchmaking
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return getEmptyMandateAnalytics();

  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return getEmptyMandateAnalytics();
  }

  // Fetch active mandates and active properties in parallel
  const [rawMandates, properties] = await Promise.all([
    fetchActiveMandates(organizationId),
    fetchActiveProperties(organizationId),
  ]);

  // Decrypt mandates (title and notes are encrypted)
  const mandates: typeof rawMandates = [];
  for (const m of rawMandates) {
    try {
      const dec = await decryptMandateForOrg(m, organizationId);
      mandates.push(dec);
    } catch (err) {
      console.error(`[GET_MANDATE_MATCHES] Failed to decrypt mandate ${m.id}:`, err);
      // Skip corrupted records rather than crashing
    }
  }

  const totalMandates = mandates.length;

  if (mandates.length === 0 || properties.length === 0) {
    return {
      ...getEmptyMandateAnalytics(),
      totalClients: mandates.length,
      totalProperties: properties.length,
      mandateStats: {
        totalMandates,
        activeMandates: totalMandates,
        mandatesWithMatches: 0,
        avgMatchScore: 0,
      },
    };
  }

  const analytics = buildAnalytics(mandates, properties);

  // Serialize for client components (strips Decimal, Date, etc.)
  // Note: structuredClone does not serialize Prisma Decimal types correctly,
  // so JSON.parse(JSON.stringify(...)) is used intentionally here, matching
  // the pattern in get-match-analytics.ts.
  return JSON.parse(JSON.stringify(analytics));
}

/**
 * Build the full MandateMatchAnalytics from decrypted mandates and properties.
 * Extracted from the main action to keep cognitive complexity manageable.
 */
function buildAnalytics(
  mandates: MandateRow[],
  properties: PropertyRow[],
): MandateMatchAnalytics {
  const totalMandates = mandates.length;

  // Adapt mandates and properties to matching shapes
  const clientsForMatching = mandates.map(adaptMandateToClient);
  const propertiesForMatching = properties.map(adaptPropertyForMatching);

  // Calculate all matches
  const allMatches = calculateBatchMatches(clientsForMatching, propertiesForMatching);

  // Create lookup maps
  const mandateMap = new Map(mandates.map((m) => [m.id, m]));
  const propertyMap = new Map(properties.map((p) => [p.id, p]));

  const topMatches = buildTopMatches(allMatches, mandateMap, propertyMap);
  const matchDistribution = buildMatchDistribution(allMatches);
  const mandateBestScores = buildBestScores(allMatches);
  const unmatchedClients = buildUnmatchedMandates(mandates, mandateBestScores);
  const hotProperties = buildHotProperties(allMatches, properties);

  // Overall stats
  const totalMatchPairs = allMatches.length;
  const averageScore = totalMatchPairs > 0
    ? Math.round(allMatches.reduce((sum, m) => sum + m.overallScore, 0) / totalMatchPairs)
    : 0;

  const mandatesWithMatchesSet = new Set(
    allMatches
      .filter((m) => m.overallScore >= MATCH_THRESHOLDS.FAIR)
      .map((m) => m.clientId)
  );

  return {
    topMatches,
    matchDistribution,
    unmatchedClients,
    hotProperties,
    totalClients: mandates.length,
    totalProperties: properties.length,
    averageMatchScore: averageScore,
    clientsWithMatches: mandatesWithMatchesSet.size,
    mandateStats: {
      totalMandates,
      activeMandates: totalMandates,
      mandatesWithMatches: mandatesWithMatchesSet.size,
      avgMatchScore: averageScore,
    },
  };
}

/**
 * Build the top-20 matches list with enriched client/property data.
 */
function buildTopMatches(
  allMatches: ReturnType<typeof calculateBatchMatches>,
  mandateMap: Map<string, MandateRow>,
  propertyMap: Map<string, PropertyRow>,
): Array<MatchResultWithClient & MatchResultWithProperty> {
  return allMatches
    .filter((m) => m.overallScore >= MATCH_THRESHOLDS.FAIR)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 20)
    .map((m) => {
      const mandate = mandateMap.get(m.clientId)!;
      const property = propertyMap.get(m.propertyId)!;
      const mandateIntent = mapTransactionToIntent(mandate.transaction_type);

      return {
        ...m,
        client: {
          id: mandate.id,
          friendlyId: mandate.friendlyId,
          client_name: mandate.title || "Untitled Mandate",
          full_name: null,
          intent: mandateIntent ?? mandate.transaction_type,
          budget_min: mandate.budget_min ? Number(mandate.budget_min) : null,
          budget_max: mandate.budget_max ? Number(mandate.budget_max) : null,
          client_status: "ACTIVE",
        },
        property: {
          id: property.id,
          friendlyId: property.friendlyId,
          property_name: property.property_name,
          price: property.price !== null && property.price !== undefined ? Number(property.price) : null,
          property_type: property.property_type,
          bedrooms: property.bedrooms,
          area: property.area,
          address_city: property.address_city,
          property_status: property.property_status,
          imageUrl: property.Documents[0]?.document_file_url ?? null,
        },
      };
    }) as Array<MatchResultWithClient & MatchResultWithProperty>;
}

/**
 * Build match score distribution buckets.
 */
function buildMatchDistribution(
  allMatches: ReturnType<typeof calculateBatchMatches>,
): MatchDistribution[] {
  const distribution: MatchDistribution[] = [
    { range: "0-25%", min: 0, max: 25, count: 0 },
    { range: "26-50%", min: 26, max: 50, count: 0 },
    { range: "51-70%", min: 51, max: 70, count: 0 },
    { range: "71-85%", min: 71, max: 85, count: 0 },
    { range: "86-100%", min: 86, max: 100, count: 0 },
  ];

  for (const m of allMatches) {
    const bucket = distribution.find(
      (d) => m.overallScore >= d.min && m.overallScore <= d.max
    );
    if (bucket) bucket.count++;
  }

  return distribution;
}

/**
 * Compute the best match score per mandate (clientId).
 */
function buildBestScores(
  allMatches: ReturnType<typeof calculateBatchMatches>,
): Map<string, number> {
  const bestScores = new Map<string, number>();
  for (const m of allMatches) {
    const current = bestScores.get(m.clientId) ?? 0;
    if (m.overallScore > current) {
      bestScores.set(m.clientId, m.overallScore);
    }
  }
  return bestScores;
}

/**
 * Build the list of mandates without good matches.
 */
function buildUnmatchedMandates(
  mandates: MandateRow[],
  bestScores: Map<string, number>,
): ClientSummary[] {
  return mandates
    .filter((m) => (bestScores.get(m.id) ?? 0) < MATCH_THRESHOLDS.FAIR)
    .map((m) => {
      const mandateIntent = mapTransactionToIntent(m.transaction_type);
      return {
        id: m.id,
        friendlyId: m.friendlyId,
        client_name: m.title || "Untitled Mandate",
        full_name: null,
        intent: (mandateIntent ?? m.transaction_type) as ClientSummary["intent"],
        budget_min: m.budget_min ? Number(m.budget_min) : null,
        budget_max: m.budget_max ? Number(m.budget_max) : null,
        client_status: "ACTIVE" as ClientSummary["client_status"],
        bestMatchScore: bestScores.get(m.id) ?? 0,
      };
    })
    .sort((a, b) => (a.bestMatchScore ?? 0) - (b.bestMatchScore ?? 0))
    .slice(0, 10);
}

/**
 * Build the hot-properties list (properties with the most mandate matches).
 */
function buildHotProperties(
  allMatches: ReturnType<typeof calculateBatchMatches>,
  properties: PropertyRow[],
): PropertyWithMatchStats[] {
  const counts = new Map<string, { count: number; totalScore: number; topScore: number }>();
  for (const m of allMatches) {
    if (m.overallScore >= MATCH_THRESHOLDS.FAIR) {
      const current = counts.get(m.propertyId) ?? { count: 0, totalScore: 0, topScore: 0 };
      counts.set(m.propertyId, {
        count: current.count + 1,
        totalScore: current.totalScore + m.overallScore,
        topScore: Math.max(current.topScore, m.overallScore),
      });
    }
  }

  return properties
    .map((p) => {
      const stats = counts.get(p.id) ?? { count: 0, totalScore: 0, topScore: 0 };
      return {
        id: p.id,
        friendlyId: p.friendlyId,
        property_name: p.property_name,
        price: p.price !== null && p.price !== undefined ? Number(p.price) : null,
        property_type: p.property_type as PropertyWithMatchStats["property_type"],
        area: p.area,
        address_city: p.address_city,
        property_status: p.property_status as PropertyWithMatchStats["property_status"],
        imageUrl: p.Documents[0]?.document_file_url ?? null,
        matchCount: stats.count,
        averageMatchScore: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
        topMatchScore: stats.topScore,
      };
    })
    .filter((p) => p.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);
}

function getEmptyMandateAnalytics(): MandateMatchAnalytics {
  return {
    topMatches: [],
    matchDistribution: [
      { range: "0-25%", min: 0, max: 25, count: 0 },
      { range: "26-50%", min: 26, max: 50, count: 0 },
      { range: "51-70%", min: 51, max: 70, count: 0 },
      { range: "71-85%", min: 71, max: 85, count: 0 },
      { range: "86-100%", min: 86, max: 100, count: 0 },
    ],
    unmatchedClients: [],
    hotProperties: [],
    totalClients: 0,
    totalProperties: 0,
    averageMatchScore: 0,
    clientsWithMatches: 0,
    mandateStats: {
      totalMandates: 0,
      activeMandates: 0,
      mandatesWithMatches: 0,
      avgMatchScore: 0,
    },
  };
}

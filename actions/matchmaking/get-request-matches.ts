"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateBatchMatchesV2,
  MATCH_THRESHOLDS,
} from "@/lib/matchmaking";
import type {
  RequestForMatching,
  PropertyForMatchingV2,
  MatchAnalytics,
  MatchDistribution,
  MatchResultV2,
  CriterionScore,
  PropertyType,
  PropertyStatus,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptRequestForOrg } from "@/lib/model-encryption";

/** Converts a 0.0–1.0 Prisma Decimal matchScore to a 0–100 integer. */
export function convertMatchScore(decimal: number): number {
  return Math.round(decimal * 100);
}

/**
 * Request match analytics — same shape as mandate analytics for UI compatibility.
 */
export interface RequestMatchStats {
  totalRequests: number;
  activeRequests: number;
  requestsWithMatches: number;
  avgMatchScore: number;
}

export interface RequestMatchAnalytics extends MatchAnalytics {
  requestStats: RequestMatchStats;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

async function fetchActiveRequests(organizationId: string) {
  return prismadb.request.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draftStatus: { not: true },
      visibility: { not: "HIDDEN" },
    },
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      propertyCategory: true,
      propertyTypes: true,
      areasOfInterest: true,
      municipality: true,
      region: true,
      centerLatitude: true,
      centerLongitude: true,
      radiusKm: true,
      surfaceMin: true,
      surfaceMax: true,
      budgetMin: true,
      budgetMax: true,
      bedroomsMin: true,
      bedroomsMax: true,
      bathroomsMin: true,
      bathroomsMax: true,
      floorMin: true,
      floorMax: true,
      constructionYearMin: true,
      constructionYearMax: true,
      requiresElevator: true,
      requiresParking: true,
      requiresStorage: true,
      goldenVisaEligible: true,
      financingStatus: true,
      timeline: true,
      amenities: true,
      expiresAt: true,
      status: true,
      assignedAgentId: true,
      organizationId: true,
      requestContacts: {
        select: {
          contact: { select: { displayName: true } },
        },
        take: 1,
      },
    },
  });
}

type RequestRow = Awaited<ReturnType<typeof fetchActiveRequests>>[number];

async function fetchActiveProperties(organizationId: string) {
  return prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: { in: ["ACTIVE", "PENDING"] },
      visibility: { not: "HIDDEN" },
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
      region: true,
      latitude: true,
      longitude: true,
      year_built: true,
      inside_city_plan: true,
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
    },
  });
}

type PropertyRow = Awaited<ReturnType<typeof fetchActiveProperties>>[number];

function adaptPropertyToV2(p: PropertyRow): PropertyForMatchingV2 {
  return {
    id: p.id,
    property_name: p.property_name,
    price: p.price != null ? Number(p.price) : null,
    property_type: p.property_type as PropertyForMatchingV2["property_type"],
    transaction_type: p.transaction_type as PropertyForMatchingV2["transaction_type"],
    property_status: p.property_status as PropertyForMatchingV2["property_status"],
    area: p.area,
    address_city: p.address_city,
    address_state: p.address_state,
    municipality: p.municipality,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    size_net_sqm: p.size_net_sqm,
    size_gross_sqm: p.size_gross_sqm,
    square_feet: p.square_feet != null ? Number(p.square_feet) : null,
    floor: p.floor,
    elevator: p.elevator,
    accepts_pets: p.accepts_pets,
    furnished: p.furnished as PropertyForMatchingV2["furnished"],
    heating_type: p.heating_type as PropertyForMatchingV2["heating_type"],
    energy_cert_class: p.energy_cert_class as PropertyForMatchingV2["energy_cert_class"],
    condition: p.condition as PropertyForMatchingV2["condition"],
    amenities: p.amenities as PropertyForMatchingV2["amenities"],
    assigned_to: p.assigned_to,
    organizationId: p.organizationId,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    region: p.region ?? null,
    inside_city_plan: p.inside_city_plan ?? null,
    year_built: p.year_built ?? null,
    garden: null,
    parking: null,
  };
}

function extractAreas(areasOfInterest: unknown): string[] {
  if (!areasOfInterest) return [];
  if (Array.isArray(areasOfInterest)) {
    return (areasOfInterest as unknown[])
      .filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof areasOfInterest === "string" && areasOfInterest.length > 0) {
    return [areasOfInterest];
  }
  if (typeof areasOfInterest === "object") {
    // Handle {"0":"Athens","1":"Glyfada"} shape
    return Object.values(areasOfInterest as Record<string, unknown>)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  return [];
}

function extractRequiredAmenities(amenities: unknown): string[] {
  if (amenities && typeof amenities === "object" && Array.isArray(amenities) === false) {
    return Object.entries(amenities as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

/**
 * Adapt a Request DB row into the RequestForMatching shape used by the v2 engine.
 */
function adaptRequestToV2(r: RequestRow): RequestForMatching {
  const rawAreas = extractAreas(r.areasOfInterest);
  const areas = [...rawAreas];
  if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
  if (r.region && !areas.includes(r.region)) areas.push(r.region);
  const requiredAmenities = extractRequiredAmenities(r.amenities);

  return {
    id: r.id,
    organizationId: r.organizationId,
    assignedAgentId: r.assignedAgentId ?? null,

    // Budget
    budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
    budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,

    // Property preferences
    propertyTypes: r.propertyTypes ?? [],
    purposeOfUse: r.propertyCategory ?? null,
    transactionType: (r.requestType as "BUY" | "RENT" | null) ?? null,

    // Location preferences
    areas,
    municipality: r.municipality ?? null,
    region: r.region ?? null,

    // Geo search
    centerLatitude: r.centerLatitude ?? null,
    centerLongitude: r.centerLongitude ?? null,
    radiusKm: r.radiusKm ?? null,

    // Size preferences
    minSizeSqm: r.surfaceMin != null ? Number(r.surfaceMin) : null,
    maxSizeSqm: r.surfaceMax != null ? Number(r.surfaceMax) : null,
    minBedrooms: r.bedroomsMin ?? null,
    maxBedrooms: r.bedroomsMax ?? null,
    minBathrooms: r.bathroomsMin ?? null,

    // Floor preferences
    floorMin: r.floorMin ?? null,
    floorMax: r.floorMax ?? null,

    // Features & amenities
    requiredAmenities,
    preferredAmenities: [],
    parkingRequired: r.requiresParking ?? null,
    storageRequired: r.requiresStorage ?? null,
    elevatorRequired: r.requiresElevator ?? null,
    accessibilityRequired: null, // Not stored as a separate field on Request

    // Investment criteria
    goldenVisaRequired: r.goldenVisaEligible ?? null,
    financingStatus: (r.financingStatus as RequestForMatching["financingStatus"]) ?? null,
    timeline: (r.timeline as RequestForMatching["timeline"]) ?? null,

    // Construction
    yearBuiltMin: r.constructionYearMin ?? null,
    yearBuiltMax: r.constructionYearMax ?? null,
    newConstructionOnly: null, // Not a separate field on Request

    // Status
    status: r.status ?? "ACTIVE",
    expires_at: r.expiresAt ?? null,
  };
}

function getEmptyRequestAnalytics(): RequestMatchAnalytics {
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
    requestStats: {
      totalRequests: 0,
      activeRequests: 0,
      requestsWithMatches: 0,
      avgMatchScore: 0,
    },
  };
}

// ──────────────────────────────────────────────
// Main server actions
// ──────────────────────────────────────────────

/**
 * Get all property matches for a specific request (v2 engine).
 * Returns an array of MatchResultV2 sorted by score descending.
 */
export async function getRequestMatches(requestId: string): Promise<MatchResultV2[]> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const [rawRequest, rawProperties] = await Promise.all([
    prismadb.request.findFirst({
      where: {
        id: requestId,
        organizationId,
        status: "ACTIVE",
        draftStatus: { not: true },
        visibility: { not: "HIDDEN" },
      },
      select: {
        id: true,
        friendlyId: true,
        requestType: true,
        propertyCategory: true,
        propertyTypes: true,
        areasOfInterest: true,
        municipality: true,
        region: true,
        centerLatitude: true,
        centerLongitude: true,
        radiusKm: true,
        surfaceMin: true,
        surfaceMax: true,
        budgetMin: true,
        budgetMax: true,
        bedroomsMin: true,
        bedroomsMax: true,
        bathroomsMin: true,
        bathroomsMax: true,
        floorMin: true,
        floorMax: true,
        constructionYearMin: true,
        constructionYearMax: true,
        requiresElevator: true,
        requiresParking: true,
        requiresStorage: true,
        goldenVisaEligible: true,
        financingStatus: true,
        timeline: true,
        amenities: true,
        expiresAt: true,
        status: true,
        assignedAgentId: true,
        organizationId: true,
        requestContacts: {
          select: {
            contact: { select: { displayName: true } },
          },
          take: 1,
        },
      },
    }),
    fetchActiveProperties(organizationId),
  ]);

  if (!rawRequest || rawProperties.length === 0) return [];

  const decrypted = await decryptRequestForOrg(rawRequest, organizationId);
  const request: RequestForMatching = adaptRequestToV2(decrypted as RequestRow);
  const matchableProperties: PropertyForMatchingV2[] = rawProperties.map(adaptPropertyToV2);

  const allMatches = calculateBatchMatchesV2([request], matchableProperties);
  return allMatches.sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Get request-to-property match analytics for the dashboard.
 * Uses the v2 engine (Request-based matching) directly.
 */
export async function getRequestMatchAnalytics(): Promise<RequestMatchAnalytics> {
  const guard = await requireAction("matchmaking:view_analytics");
  // Return empty analytics on permission denial — dashboards show empty state
  if (guard) return getEmptyRequestAnalytics();

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return getEmptyRequestAnalytics();

  const [storedMatches, totalRequests, totalProperties] = await Promise.all([
    prismadb.propertyRequestMatch.findMany({
      where: { organizationId },
      orderBy: { matchScore: "desc" },
      take: 200,
      include: {
        property: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            price: true,
            property_type: true,
            property_status: true,
            area: true,
            address_city: true,
          },
        },
        request: {
          select: {
            id: true,
            friendlyId: true,
          },
        },
      },
    }),
    prismadb.request.count({
      where: {
        organizationId,
        status: "ACTIVE",
        draftStatus: { not: true },
      },
    }),
    prismadb.properties.count({
      where: {
        organizationId,
        property_status: { in: ["ACTIVE", "PENDING"] },
      },
    }),
  ]);

  if (storedMatches.length === 0) {
    return {
      ...getEmptyRequestAnalytics(),
      totalClients: totalRequests,
      totalProperties,
      requestStats: {
        totalRequests,
        activeRequests: totalRequests,
        requestsWithMatches: 0,
        avgMatchScore: 0,
      },
    };
  }

  const matchDistribution: MatchDistribution[] = [
    { range: "0-25%", min: 0, max: 25, count: 0 },
    { range: "26-50%", min: 26, max: 50, count: 0 },
    { range: "51-70%", min: 51, max: 70, count: 0 },
    { range: "71-85%", min: 71, max: 85, count: 0 },
    { range: "86-100%", min: 86, max: 100, count: 0 },
  ];

  const requestsWithMatchesSet = new Set<string>();
  let totalScore = 0;

  for (const m of storedMatches) {
    const score = convertMatchScore(Number(m.matchScore));
    totalScore += score;
    if (score >= MATCH_THRESHOLDS.FAIR) requestsWithMatchesSet.add(m.requestId);
    const bucket = matchDistribution.find((d) => score >= d.min && score <= d.max);
    if (bucket) bucket.count++;
  }

  const averageScore =
    storedMatches.length > 0
      ? Math.round(totalScore / storedMatches.length)
      : 0;

  // Top 10 highest-scoring request-property pairs
  const topMatches = storedMatches.slice(0, 10).map((m) => {
    const breakdown = (m.scoreBreakdown as unknown as CriterionScore[]) ?? [];
    return {
    requestId: m.requestId,
    clientId: m.requestId,
    propertyId: m.propertyId,
    overallScore: convertMatchScore(Number(m.matchScore)),
    breakdown,
    matchedCriteria: breakdown.filter((c) => c.score > 0).length,
    totalCriteria: breakdown.length,
    calculatedAt: m.updatedAt,
    property: {
      id: m.property.id,
      friendlyId: m.property.friendlyId ?? m.property.id,
      property_name: m.property.property_name,
      price: m.property.price != null ? Number(m.property.price) : null,
      property_type: m.property.property_type as PropertyType | null,
      area: m.property.area,
      address_city: m.property.address_city,
      property_status: m.property.property_status as PropertyStatus | null,
      imageUrl: null,
    },
    client: {
      id: m.requestId,
      friendlyId: m.request.friendlyId ?? m.requestId,
      client_name: `Request ${m.request.friendlyId ?? m.requestId}`,
    },
  };
  });

  // Hot properties: aggregate by propertyId, count matches above FAIR threshold
  type PropAcc = {
    count: number;
    totalScore: number;
    topScore: number;
    prop: (typeof storedMatches)[0]["property"];
  };
  const propStats = new Map<string, PropAcc>();
  for (const m of storedMatches) {
    const score = convertMatchScore(Number(m.matchScore));
    if (score < MATCH_THRESHOLDS.FAIR) continue;
    const existing = propStats.get(m.propertyId);
    if (existing) {
      existing.count++;
      existing.totalScore += score;
      if (score > existing.topScore) existing.topScore = score;
    } else {
      propStats.set(m.propertyId, {
        count: 1,
        totalScore: score,
        topScore: score,
        prop: m.property,
      });
    }
  }
  const hotProperties = Array.from(propStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s) => ({
      id: s.prop.id,
      friendlyId: s.prop.friendlyId ?? s.prop.id,
      property_name: s.prop.property_name,
      price: s.prop.price != null ? Number(s.prop.price) : null,
      property_type: s.prop.property_type as PropertyType | null,
      area: s.prop.area,
      address_city: s.prop.address_city,
      property_status: s.prop.property_status as PropertyStatus | null,
      imageUrl: null,
      matchCount: s.count,
      averageMatchScore: Math.round(s.totalScore / s.count),
      topMatchScore: s.topScore,
    }));

  const requestsWithMatches = requestsWithMatchesSet.size;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topMatches: topMatches as any,
    matchDistribution,
    unmatchedClients: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hotProperties: hotProperties as any,
    totalClients: totalRequests,
    totalProperties,
    averageMatchScore: averageScore,
    clientsWithMatches: requestsWithMatches,
    requestStats: {
      totalRequests,
      activeRequests: totalRequests,
      requestsWithMatches,
      avgMatchScore: averageScore,
    },
  };
}

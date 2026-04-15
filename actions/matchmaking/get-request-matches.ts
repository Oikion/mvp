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
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptRequestForOrg } from "@/lib/model-encryption";

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

function extractAreas(r: RequestRow): string[] {
  const areas: string[] = [];
  if (r.areasOfInterest && Array.isArray(r.areasOfInterest)) {
    for (const item of r.areasOfInterest as unknown[]) {
      if (typeof item === "string") {
        areas.push(item);
      } else if (item && typeof item === "object" && "name" in item && typeof (item as { name: unknown }).name === "string") {
        areas.push((item as { name: string }).name);
      }
    }
  }
  if (r.municipality && areas.indexOf(r.municipality) === -1) areas.push(r.municipality);
  if (r.region && areas.indexOf(r.region) === -1) areas.push(r.region);
  return areas;
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
  const areas = extractAreas(r);
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
// Main server action
// ──────────────────────────────────────────────

/**
 * Get request-to-property match analytics for the dashboard.
 * Uses the v2 engine (Request-based matching) directly.
 */
export async function getRequestMatchAnalytics(): Promise<RequestMatchAnalytics> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return getEmptyRequestAnalytics();

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return getEmptyRequestAnalytics();

  const [rawRequests, properties] = await Promise.all([
    fetchActiveRequests(organizationId),
    prismadb.properties.findMany({
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
    }),
  ]);

  // Decrypt request fields (title/notes are encrypted)
  const decryptedRequests = await Promise.all(
    rawRequests.map((r) => decryptRequestForOrg(r, organizationId))
  );

  // Map to v2 matching shapes
  const requests: RequestForMatching[] = decryptedRequests.map(
    (r) => adaptRequestToV2(r as RequestRow)
  );

  const matchableProperties: PropertyForMatchingV2[] = properties.map((p) => ({
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
    // V2 extended fields
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    region: p.region ?? null,
    inside_city_plan: p.inside_city_plan ?? null,
    year_built: p.year_built ?? null,
    garden: null,   // Not a field on Properties model
    parking: null,  // Not a field on Properties model
  }));

  if (requests.length === 0 || matchableProperties.length === 0) {
    return {
      ...getEmptyRequestAnalytics(),
      totalClients: requests.length,
      totalProperties: matchableProperties.length,
      requestStats: {
        totalRequests: rawRequests.length,
        activeRequests: rawRequests.length,
        requestsWithMatches: 0,
        avgMatchScore: 0,
      },
    };
  }

  const allMatches = calculateBatchMatchesV2(requests, matchableProperties);

  const matchDistribution: MatchDistribution[] = [
    { range: "0-25%", min: 0, max: 25, count: 0 },
    { range: "26-50%", min: 26, max: 50, count: 0 },
    { range: "51-70%", min: 51, max: 70, count: 0 },
    { range: "71-85%", min: 71, max: 85, count: 0 },
    { range: "86-100%", min: 86, max: 100, count: 0 },
  ];
  for (const m of allMatches) {
    const bucket = matchDistribution.find(
      (d) => m.overallScore >= d.min && m.overallScore <= d.max
    );
    if (bucket) bucket.count++;
  }

  const totalMatchPairs = allMatches.length;
  const averageScore = totalMatchPairs > 0
    ? Math.round(allMatches.reduce((sum, m) => sum + m.overallScore, 0) / totalMatchPairs)
    : 0;

  const requestsWithMatchesSet = new Set(
    allMatches
      .filter((m) => m.overallScore >= MATCH_THRESHOLDS.FAIR)
      .map((m) => m.requestId)
  );
  const requestsWithMatches = requestsWithMatchesSet.size;

  return {
    topMatches: [],
    matchDistribution,
    unmatchedClients: [],
    hotProperties: [],
    totalClients: requests.length,
    totalProperties: matchableProperties.length,
    averageMatchScore: averageScore,
    clientsWithMatches: requestsWithMatches,
    requestStats: {
      totalRequests: rawRequests.length,
      activeRequests: rawRequests.length,
      requestsWithMatches,
      avgMatchScore: averageScore,
    },
  };
}

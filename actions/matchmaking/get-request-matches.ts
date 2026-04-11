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

function mapRequestTypeToIntent(requestType: string): string | null {
  switch (requestType) {
    case "BUY": return "BUY";
    case "RENT": return "RENT";
    default: return null;
  }
}

function buildAreasFromRequest(
  areasJson: unknown,
  municipality: string | null,
  region: string | null,
): string[] {
  const areas: string[] = [];
  if (areasJson && Array.isArray(areasJson)) {
    areas.push(...(areasJson as string[]));
  }
  if (municipality && !areas.includes(municipality)) areas.push(municipality);
  if (region && !areas.includes(region)) areas.push(region);
  return areas;
}

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
      groundFloorOnly: true,
      conditionPreference: true,
      heatingTypes: true,
      energyClassMin: true,
      furnished: true,
      requiresElevator: true,
      requiresParking: true,
      petFriendly: true,
      amenities: true,
      notes: true,
      locationDisplayName: true,
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

/**
 * Adapt a Request into the ClientForMatching shape used by the matching engine.
 */
function adaptRequestToClient(r: RequestRow, decryptedName: string | null): ClientForMatching {
  const intent = mapRequestTypeToIntent(r.requestType);
  const purpose = r.propertyCategory ?? null;
  const areas = buildAreasFromRequest(r.areasOfInterest, r.municipality, r.region);

  const propertyPreferences: NonNullable<ClientForMatching["property_preferences"]> = {
    bedrooms_min: r.bedroomsMin ?? undefined,
    bedrooms_max: r.bedroomsMax ?? undefined,
    bathrooms_min: r.bathroomsMin ?? undefined,
    bathrooms_max: r.bathroomsMax ?? undefined,
    size_min_sqm: r.surfaceMin ? Number(r.surfaceMin) : undefined,
    size_max_sqm: r.surfaceMax ? Number(r.surfaceMax) : undefined,
    floor_min: r.floorMin ?? undefined,
    floor_max: r.floorMax ?? undefined,
    ground_floor_only: r.groundFloorOnly ?? undefined,
    requires_elevator: r.requiresElevator ?? undefined,
    requires_parking: r.requiresParking ?? undefined,
    requires_pet_friendly: r.petFriendly ?? undefined,
    furnished_preference: r.furnished ?? undefined,
    heating_preferences: r.heatingTypes?.length > 0 ? r.heatingTypes : undefined,
    energy_class_min: r.energyClassMin ?? undefined,
    condition_preferences: r.conditionPreference?.length > 0 ? r.conditionPreference : undefined,
  };

  return {
    id: r.id,
    client_name: decryptedName || r.friendlyId || "Untitled Request",
    full_name: null,
    intent: intent as ClientForMatching["intent"],
    purpose: purpose as ClientForMatching["purpose"],
    budget_min: r.budgetMin,
    budget_max: r.budgetMax,
    areas_of_interest: areas.length > 0 ? areas : null,
    property_preferences: propertyPreferences,
    client_status: "ACTIVE" as ClientForMatching["client_status"],
    assigned_to: r.assignedAgentId,
    organizationId: r.organizationId,
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
 * Adapts each active Request into the ClientForMatching shape so the
 * existing batch matching algorithm is reused without modification.
 */
export async function getRequestMatchAnalytics(): Promise<RequestMatchAnalytics> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return getEmptyRequestAnalytics();

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return getEmptyRequestAnalytics();

  const [rawRequests, properties] = await Promise.all([
    fetchActiveRequests(organizationId),
    // Reuse the same property fetch as mandate matches
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

  // Decrypt request fields (notes and locationDisplayName)
  const decryptedRequests = await Promise.all(
    rawRequests.map((r) => decryptRequestForOrg(r, organizationId))
  );

  // Adapt to matching shapes
  const clients: ClientForMatching[] = decryptedRequests.map((r, i) => {
    const firstContact = (rawRequests[i] as any).requestContacts?.[0]?.contact;
    const contactName = firstContact?.displayName || null;
    return adaptRequestToClient(r as RequestRow, contactName);
  });

  const matchableProperties: PropertyForMatching[] = properties.map((p) => ({
    id: p.id,
    property_name: p.property_name,
    price: p.price != null ? Number(p.price) : null,
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
    square_feet: p.square_feet != null ? Number(p.square_feet) : null,
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
  }));

  if (clients.length === 0 || matchableProperties.length === 0) {
    return {
      ...getEmptyRequestAnalytics(),
      totalClients: clients.length,
      totalProperties: matchableProperties.length,
      requestStats: {
        totalRequests: rawRequests.length,
        activeRequests: rawRequests.length,
        requestsWithMatches: 0,
        avgMatchScore: 0,
      },
    };
  }

  const allMatches = calculateBatchMatches(clients, matchableProperties);

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
      .map((m) => m.clientId)
  );
  const requestsWithMatches = requestsWithMatchesSet.size;

  return {
    topMatches: [],
    matchDistribution,
    unmatchedClients: [],
    hotProperties: [],
    totalClients: clients.length,
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

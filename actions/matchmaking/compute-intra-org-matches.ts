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
  MatchCriterionV2,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { decryptRequestForOrg } from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";

// ──────────────────────────────────────────────
// Helpers (shared with get-request-matches.ts)
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
    },
  });
}

type RequestRow = Awaited<ReturnType<typeof fetchActiveRequests>>[number];

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
  if (amenities && typeof amenities === "object" && !Array.isArray(amenities)) {
    return Object.entries(amenities as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

/**
 * Adapt a Request DB row into the RequestForMatching shape used by the v2 engine.
 * Field mapping mirrors adaptRequestToV2 in get-request-matches.ts (Task 10).
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

async function fetchActiveProperties(organizationId: string): Promise<PropertyForMatchingV2[]> {
  const properties = await prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: { in: ["ACTIVE", "PENDING"] },
      visibility: { not: "HIDDEN" },
    },
    select: {
      id: true,
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

  return properties.map((p) => ({
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
    garden: null,  // Not a field on Properties model
    parking: null, // Not a field on Properties model
  }));
}

export interface IntraOrgMatchResult {
  upserted: number;
  skipped: number;
  requestCount: number;
  propertyCount: number;
}

// ──────────────────────────────────────────────
// Core computation function (internal caller)
// ──────────────────────────────────────────────

/**
 * Run intra-org v2 matchmaking for an organization and persist results above
 * MATCH_THRESHOLDS.FAIR into PropertyRequestMatch. Called by cron or manual trigger.
 */
export async function runIntraOrgMatches(
  organizationId: string
): Promise<IntraOrgMatchResult> {
  // Fetch requests, properties, and optional custom weights in parallel
  const [rawRequests, matchableProperties, orgWeightsRow] = await Promise.all([
    fetchActiveRequests(organizationId),
    fetchActiveProperties(organizationId),
    prismadb.orgMatchWeights.findUnique({
      where: { organizationId },
      select: { weights: true },
    }),
  ]);

  if (rawRequests.length === 0 || matchableProperties.length === 0) {
    return {
      upserted: 0,
      skipped: 0,
      requestCount: rawRequests.length,
      propertyCount: matchableProperties.length,
    };
  }

  // Decrypt request fields (title/notes are encrypted)
  const decryptedRequests = await Promise.all(
    rawRequests.map((r) => decryptRequestForOrg(r, organizationId))
  );

  const requests: RequestForMatching[] = decryptedRequests.map(
    (r) => adaptRequestToV2(r as RequestRow)
  );

  // Parse custom weights — null if none configured
  const customWeights = orgWeightsRow?.weights
    ? (orgWeightsRow.weights as Partial<Record<MatchCriterionV2, number>>)
    : null;

  // Run the v2 engine
  const allMatches = calculateBatchMatchesV2(requests, matchableProperties, customWeights ?? undefined);

  // Filter to matches above the FAIR threshold
  const aboveThreshold = allMatches.filter(
    (m) => m.overallScore >= MATCH_THRESHOLDS.FAIR
  );

  // Upsert in batches of 50
  const BATCH_SIZE = 50;
  let upserted = 0;

  for (let i = 0; i < aboveThreshold.length; i += BATCH_SIZE) {
    const batch = aboveThreshold.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((m) =>
        prismadb.propertyRequestMatch.upsert({
          where: {
            organizationId_propertyId_requestId: {
              organizationId,
              propertyId: m.propertyId,
              requestId: m.requestId,
            },
          },
          create: {
            organizationId,
            propertyId: m.propertyId,
            requestId: m.requestId,
            matchScore: m.overallScore / 100,
            matchMethod: "RULE_BASED",
            scoreBreakdown: m.breakdown as unknown as Prisma.InputJsonValue,
          },
          update: {
            matchScore: m.overallScore / 100,
            matchMethod: "RULE_BASED",
            scoreBreakdown: m.breakdown as unknown as Prisma.InputJsonValue,
          },
        })
      )
    );

    upserted += batch.length;
  }

  return {
    upserted,
    skipped: allMatches.length - aboveThreshold.length,
    requestCount: requests.length,
    propertyCount: matchableProperties.length,
  };
}

// ──────────────────────────────────────────────
// Server action (UI/API trigger)
// ──────────────────────────────────────────────

/**
 * Server action to trigger intra-org matchmaking for the current org.
 * Requires `matchmaking:run` permission.
 */
export async function triggerIntraOrgMatches(): Promise<ActionResponse<IntraOrgMatchResult>> {
  const guard = await requireAction("matchmaking:run");
  if (guard) return guard;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) {
    return actionError("Organization not found", "NOT_FOUND");
  }

  try {
    const result = await runIntraOrgMatches(organizationId);
    return actionSuccess(result);
  } catch (error) {
    console.error("[MATCHMAKING_INTRA_ORG_TRIGGER]", error);
    return actionError("Failed to run matchmaking", error instanceof Error ? error : undefined);
  }
}

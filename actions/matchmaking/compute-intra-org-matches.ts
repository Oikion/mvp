"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  calculateBatchMatchesV2,
  MATCH_THRESHOLDS,
  DEFAULT_MIN_MATCH_SCORE,
} from "@/lib/matchmaking";
import type {
  RequestForMatching,
  PropertyForMatchingV2,
  MatchCriterionV2,
} from "@/lib/matchmaking";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { decryptRequestForOrg } from "@/lib/model-encryption";
import { MATCHMAKING_RATE_LIMIT_MS } from "@/lib/matchmaking-constants";
import type { Prisma } from "@prisma/client";

// ──────────────────────────────────────────────
// Amenity inference helper
// ──────────────────────────────────────────────

/**
 * Infer a boolean property feature (e.g. garden, parking) from the amenities JSON.
 * Supports both array form `["garden", ...]` and object form `{ garden: true, ... }`.
 * Returns true if any of the provided keys is present and truthy; null if the amenity
 * field is absent (unknown); false only when the field exists but none of the keys match.
 */
function inferBooleanAmenity(
  amenities: unknown,
  keys: string[]
): boolean | null {
  if (amenities === null || amenities === undefined) return null;

  if (Array.isArray(amenities)) {
    const normalized = (amenities as unknown[])
      .filter((a): a is string => typeof a === "string")
      .map((a) => a.toLowerCase().replace(/[-\s]/g, "_"));
    return keys.some((k) => normalized.includes(k.toLowerCase().replace(/[-\s]/g, "_")));
  }

  if (typeof amenities === "object") {
    const obj = amenities as Record<string, unknown>;
    const normalizedKeys = Object.keys(obj).map((k) => k.toLowerCase().replace(/[-\s]/g, "_"));
    for (const key of keys) {
      const norm = key.toLowerCase().replace(/[-\s]/g, "_");
      if (normalizedKeys.includes(norm)) {
        const rawKey = Object.keys(obj).find(
          (k) => k.toLowerCase().replace(/[-\s]/g, "_") === norm
        );
        return rawKey !== undefined ? obj[rawKey] === true : false;
      }
    }
    // Object exists but none of the keys are present → explicitly false
    return false;
  }

  return null;
}

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
      requiresGarden: true,
      insideCityPlan: true,
      conditionPreference: true,
      energyClassMin: true,
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
    accessibilityRequired: null,
    gardenRequired: r.requiresGarden ?? null,
    insideCityPlanRequired: r.insideCityPlan ?? null,

    // Condition / quality preferences
    conditionPreferences: (r.conditionPreference ?? null) as RequestForMatching["conditionPreferences"],
    energyClassMin: (r.energyClassMin ?? null) as RequestForMatching["energyClassMin"],

    // Investment criteria
    goldenVisaRequired: r.goldenVisaEligible ?? null,
    financingStatus: (r.financingStatus as RequestForMatching["financingStatus"]) ?? null,
    timeline: (r.timeline as RequestForMatching["timeline"]) ?? null,

    // Construction
    yearBuiltMin: r.constructionYearMin ?? null,
    yearBuiltMax: r.constructionYearMax ?? null,
    newConstructionOnly: null,

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
    // garden and parking are inferred from the amenities JSON
    garden: inferBooleanAmenity(p.amenities, ["garden"]),
    parking: inferBooleanAmenity(p.amenities, ["parking", "garage", "parking_space"]),
  }));
}

export interface IntraOrgMatchResult {
  upserted: number;
  skipped: number;
  deleted: number;
  durationMs: number;
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
  const start = Date.now();
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
      deleted: 0,
      durationMs: Date.now() - start,
    };
  }

  // Decrypt request fields (title/notes are encrypted)
  const decryptedRequests = await Promise.all(
    rawRequests.map((r) => decryptRequestForOrg(r, organizationId))
  );

  const requests: RequestForMatching[] = decryptedRequests.map(
    (r) => adaptRequestToV2(r)
  );

  // Parse custom weights — null if none configured
  const customWeights = orgWeightsRow?.weights
    ? (orgWeightsRow.weights as Partial<Record<MatchCriterionV2, number>>)
    : null;

  // Run the v2 engine
  const allMatches = calculateBatchMatchesV2(requests, matchableProperties, customWeights ?? undefined);

  // Partition results: upsert those above threshold, collect pairs that fell below
  const aboveThreshold = allMatches.filter(
    (m) => m.overallScore >= MATCH_THRESHOLDS.FAIR
  );
  const belowThreshold = allMatches.filter(
    (m) => m.overallScore < DEFAULT_MIN_MATCH_SCORE
  );

  // Build the set of (propertyId, requestId) pairs that scored below the minimum
  // so we can delete stale rows from previous runs.
  const stalePairs = belowThreshold.map((m) => ({
    propertyId: m.propertyId,
    requestId: m.requestId,
  }));

  // Upsert above-threshold matches in batches of 50
  const BATCH_SIZE = 50;
  let upserted = 0;

  for (let i = 0; i < aboveThreshold.length; i += BATCH_SIZE) {
    const batch = aboveThreshold.slice(i, i + BATCH_SIZE);

    await prismadb.$transaction(
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

  // Delete stale rows in batches of 50 (rows that now score below DEFAULT_MIN_MATCH_SCORE)
  let deleted = 0;
  for (let i = 0; i < stalePairs.length; i += BATCH_SIZE) {
    const batch = stalePairs.slice(i, i + BATCH_SIZE);
    const result = await prismadb.propertyRequestMatch.deleteMany({
      where: {
        organizationId,
        OR: batch.map((p) => ({
          propertyId: p.propertyId,
          requestId: p.requestId,
        })),
      },
    });
    deleted += result.count;
  }

  // Purge rows for properties that are no longer in the active set
  // (SOLD, OFF_MARKET, WITHDRAWN, etc.) — they were never scored in this run,
  // so the below-threshold pass above never touched their rows.
  const activePropertyIds = matchableProperties.map((p) => p.id);
  if (activePropertyIds.length > 0) {
    const purgeResult = await prismadb.propertyRequestMatch.deleteMany({
      where: {
        organizationId,
        propertyId: { notIn: activePropertyIds },
      },
    });
    deleted += purgeResult.count;
  }

  return {
    upserted,
    skipped: allMatches.length - aboveThreshold.length - belowThreshold.length,
    deleted,
    durationMs: Date.now() - start,
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

  // Enforce the same rate limit as the API route — prevents the manual trigger
  // from bypassing the cooldown by calling the server action directly.
  const lastOrgRun = await prismadb.propertyRequestMatch.findFirst({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (lastOrgRun?.updatedAt) {
    const elapsed = Date.now() - lastOrgRun.updatedAt.getTime();
    if (elapsed < MATCHMAKING_RATE_LIMIT_MS) {
      const retryAfterSec = Math.ceil((MATCHMAKING_RATE_LIMIT_MS - elapsed) / 1000);
      const retryAfterMin = Math.ceil(retryAfterSec / 60);
      return actionError(
        `Rate limited. Try again in ${retryAfterMin} minute${retryAfterMin !== 1 ? "s" : ""}.`,
        "RATE_LIMITED"
      );
    }
  }

  try {
    const result = await runIntraOrgMatches(organizationId);
    return actionSuccess(result);
  } catch (error) {
    console.error("[MATCHMAKING_INTRA_ORG_TRIGGER]", error);
    return actionError("Failed to run matchmaking", error instanceof Error ? error : undefined);
  }
}

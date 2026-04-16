"use server";

/**
 * Cross-org match computation — background job logic.
 *
 * Called by the Vercel Cron endpoint every 30 minutes.
 * Decrypts network-visible requests and properties server-side
 * (platform holds master KEK → per-org DEK chain), then runs
 * the v2 scoring engine and upserts CrossOrgMatch rows.
 *
 * Never exposes decrypted data externally; CrossOrgMatch stores
 * only scores, breakdowns, and IDs.
 */

import { prismadb } from "@/lib/prisma";
import { decryptRequestForOrg } from "@/lib/model-encryption";
import { calculateBatchMatchesV2 } from "@/lib/matchmaking";
import type { RequestForMatching, PropertyForMatchingV2 } from "@/lib/matchmaking/types";
import type { OrgNetworkMembership } from "@prisma/client";

const BATCH_SIZE = 10;
const MATCH_TTL_DAYS = 30;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type NetworkRequest = Awaited<ReturnType<typeof fetchNetworkRequests>>[number];
type NetworkProperty = Awaited<ReturnType<typeof fetchNetworkProperties>>[number];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function extractAreas(areasOfInterest: unknown): string[] {
  if (!areasOfInterest) return [];
  if (Array.isArray(areasOfInterest)) {
    return (areasOfInterest as unknown[]).filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }
  if (typeof areasOfInterest === "string" && areasOfInterest.length > 0) {
    return [areasOfInterest];
  }
  if (typeof areasOfInterest === "object") {
    return Object.values(areasOfInterest as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
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

// ─────────────────────────────────────────────────────────────────
// DB fetchers
// ─────────────────────────────────────────────────────────────────

async function fetchNetworkRequests(organizationId: string) {
  return prismadb.request.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draftStatus: { not: true },
      visibility: { in: ["SECURE", "PUBLIC"] },
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

async function fetchNetworkProperties(organizationId: string) {
  return prismadb.properties.findMany({
    where: {
      organizationId,
      property_status: { in: ["ACTIVE", "PENDING"] },
      visibility: { in: ["SECURE", "PUBLIC"] },
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
}

// ─────────────────────────────────────────────────────────────────
// Adapters
// ─────────────────────────────────────────────────────────────────

function adaptRequestToV2(r: NetworkRequest): RequestForMatching {
  const rawAreas = extractAreas(r.areasOfInterest);
  const areas = [...rawAreas];
  if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
  if (r.region && !areas.includes(r.region)) areas.push(r.region);
  const requiredAmenities = extractRequiredAmenities(r.amenities);

  return {
    id: r.id,
    organizationId: r.organizationId,
    assignedAgentId: r.assignedAgentId ?? null,

    budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
    budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,

    propertyTypes: r.propertyTypes ?? [],
    purposeOfUse: r.propertyCategory ?? null,
    transactionType: (r.requestType as "BUY" | "RENT" | null) ?? null,

    areas,
    municipality: r.municipality ?? null,
    region: r.region ?? null,

    centerLatitude: r.centerLatitude ?? null,
    centerLongitude: r.centerLongitude ?? null,
    radiusKm: r.radiusKm ?? null,

    minSizeSqm: r.surfaceMin != null ? Number(r.surfaceMin) : null,
    maxSizeSqm: r.surfaceMax != null ? Number(r.surfaceMax) : null,
    minBedrooms: r.bedroomsMin ?? null,
    maxBedrooms: r.bedroomsMax ?? null,
    minBathrooms: r.bathroomsMin ?? null,

    floorMin: r.floorMin ?? null,
    floorMax: r.floorMax ?? null,

    requiredAmenities,
    preferredAmenities: [],
    parkingRequired: r.requiresParking ?? null,
    storageRequired: r.requiresStorage ?? null,
    elevatorRequired: r.requiresElevator ?? null,
    accessibilityRequired: null,

    goldenVisaRequired: r.goldenVisaEligible ?? null,
    financingStatus: (r.financingStatus as RequestForMatching["financingStatus"]) ?? null,
    timeline: (r.timeline as RequestForMatching["timeline"]) ?? null,

    yearBuiltMin: r.constructionYearMin ?? null,
    yearBuiltMax: r.constructionYearMax ?? null,
    newConstructionOnly: null,

    status: r.status ?? "ACTIVE",
    expires_at: r.expiresAt ?? null,
  };
}

function adaptPropertyForMatchingV2(p: NetworkProperty): PropertyForMatchingV2 {
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
    region: p.region ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    year_built: p.year_built ?? null,
    inside_city_plan: p.inside_city_plan ?? null,
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
    garden: null, // Not a field on Properties model
    parking: null, // Not a field on Properties model
  };
}

// ─────────────────────────────────────────────────────────────────
// Eligibility resolution
// ─────────────────────────────────────────────────────────────────

async function getAcceptedPartnerIds(orgId: string): Promise<Set<string>> {
  const rows = await prismadb.orgNetworkPartner.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ initiatorOrgId: orgId }, { partnerOrgId: orgId }],
    },
    select: { initiatorOrgId: true, partnerOrgId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.initiatorOrgId === orgId ? r.partnerOrgId : r.initiatorOrgId);
  }
  return ids;
}

/**
 * Returns the set of property-org IDs whose properties a given request org
 * is eligible to match against, based on network membership.
 */
function eligiblePropertyOrgs(
  requestOrgId: string,
  requestOrgMembership: OrgNetworkMembership,
  allPoolOrgs: Set<string>,
  bilateralPartners: Set<string>,
): Set<string> {
  const eligible = new Set<string>();

  if (requestOrgMembership === "POOL" || requestOrgMembership === "BOTH") {
    Array.from(allPoolOrgs).forEach((orgId) => {
      if (orgId !== requestOrgId) eligible.add(orgId);
    });
  }

  if (requestOrgMembership === "BILATERAL" || requestOrgMembership === "BOTH") {
    Array.from(bilateralPartners).forEach((orgId) => {
      if (orgId !== requestOrgId) eligible.add(orgId);
    });
  }

  return eligible;
}

// ─────────────────────────────────────────────────────────────────
// Main job
// ─────────────────────────────────────────────────────────────────

export interface ComputeResult {
  upserted: number;
  expired: number;
  errors: number;
}

export async function computeCrossOrgMatches(): Promise<ComputeResult> {
  let upserted = 0;
  let errors = 0;

  // 1. Load all participating orgs
  const allSettings = await prismadb.orgNetworkSettings.findMany({
    where: { membership: { not: "NONE" } },
  });

  if (allSettings.length < 2) {
    // Clean up expired rows even if network is small
    const expired = await cleanupExpired();
    return { upserted: 0, expired, errors: 0 };
  }

  const poolOrgIds = new Set(
    allSettings
      .filter((s) => s.membership === "POOL" || s.membership === "BOTH")
      .map((s) => s.organizationId),
  );

  const settingsByOrg = new Map(allSettings.map((s) => [s.organizationId, s]));

  // 2. Load network-visible data per org (in batches to limit memory)
  const orgBatches: (typeof allSettings)[] = [];
  for (let i = 0; i < allSettings.length; i += BATCH_SIZE) {
    orgBatches.push(allSettings.slice(i, i + BATCH_SIZE));
  }

  // Map: orgId → decrypted requests adapted for v2 scoring
  const requestsByOrg = new Map<string, RequestForMatching[]>();
  // Map: requestId → expiresAt (sourced from the already-fetched request row)
  const requestExpiresAt = new Map<string, Date | null>();
  // Map: orgId → adapted properties for v2 scoring
  const propertiesByOrg = new Map<string, PropertyForMatchingV2[]>();

  for (const batch of orgBatches) {
    await Promise.all(
      batch.map(async (orgSettings) => {
        const orgId = orgSettings.organizationId;

        if (orgSettings.shareMandates) {
          try {
            const rawRequests = await fetchNetworkRequests(orgId);
            const decrypted: RequestForMatching[] = [];
            let decryptErrors = 0;
            for (const r of rawRequests) {
              try {
                const dec = await decryptRequestForOrg(r, orgId);
                decrypted.push(adaptRequestToV2(dec));
                requestExpiresAt.set(r.id, r.expiresAt);
              } catch {
                decryptErrors++;
              }
            }
            if (decryptErrors > 0) {
              console.warn(
                `[CROSS_ORG_MATCH] Skipped ${decryptErrors} corrupted requests for ${orgId}`,
              );
            }
            requestsByOrg.set(orgId, decrypted);
          } catch (err) {
            console.error(`[CROSS_ORG_MATCH] Failed to load requests for ${orgId}:`, err);
            errors++;
          }
        }

        if (orgSettings.shareProperties) {
          try {
            const rawProperties = await fetchNetworkProperties(orgId);
            const adapted: PropertyForMatchingV2[] = [];
            for (const p of rawProperties) {
              adapted.push(adaptPropertyForMatchingV2(p));
            }
            propertiesByOrg.set(orgId, adapted);
          } catch (err) {
            console.error(`[CROSS_ORG_MATCH] Failed to load properties for ${orgId}:`, err);
            errors++;
          }
        }
      }),
    );
  }

  // 3. Pre-fetch bilateral partner sets for all request-sharing orgs in parallel
  const partnersByOrg = new Map<string, Set<string>>();
  await Promise.all(
    Array.from(requestsByOrg.keys()).map(async (orgId) => {
      partnersByOrg.set(orgId, await getAcceptedPartnerIds(orgId));
    }),
  );

  // 4. Compute matches across orgs using v2 batch engine
  for (const [requestOrgId, requests] of Array.from(requestsByOrg.entries())) {
    if (requests.length === 0) continue;

    const requestOrgSettings = settingsByOrg.get(requestOrgId)!;
    const partners = partnersByOrg.get(requestOrgId) ?? new Set<string>();

    const eligible = eligiblePropertyOrgs(
      requestOrgId,
      requestOrgSettings.membership,
      poolOrgIds,
      partners,
    );

    for (const propertyOrgId of Array.from(eligible)) {
      const propertyOrgSettings = settingsByOrg.get(propertyOrgId);
      if (!propertyOrgSettings?.shareProperties) continue;

      const properties = propertiesByOrg.get(propertyOrgId);
      if (!properties || properties.length === 0) continue;

      // Scope reflects the actual relationship: bilateral partners take precedence
      const scope = partners.has(propertyOrgId) ? "BILATERAL" : "POLIS";

      try {
        const results = calculateBatchMatchesV2(requests, properties);

        for (const result of results) {
          const defaultExpiry = new Date();
          defaultExpiry.setDate(defaultExpiry.getDate() + MATCH_TTL_DAYS);
          const requestExpiry = requestExpiresAt.get(result.requestId) ?? null;
          const expiresAt =
            requestExpiry && requestExpiry < defaultExpiry ? requestExpiry : defaultExpiry;

          await prismadb.crossOrgMatch.upsert({
            where: {
              requestId_propertyId_scope: {
                requestId: result.requestId,
                propertyId: result.propertyId,
                scope,
              },
            },
            update: {
              matchScore: result.overallScore / 100,
              breakdown: result.breakdown as object[],
              computedAt: new Date(),
              expiresAt,
              requestOrgId,
              propertyOrgId,
            },
            create: {
              requestOrgId,
              requestId: result.requestId,
              propertyOrgId,
              propertyId: result.propertyId,
              scope,
              matchScore: result.overallScore / 100,
              breakdown: result.breakdown as object[],
              expiresAt,
            },
          });
          upserted++;
        }
      } catch (err) {
        console.error(
          `[CROSS_ORG_MATCH] Batch score error requestOrg=${requestOrgId} propertyOrg=${propertyOrgId}:`,
          err,
        );
        errors++;
      }
    }
  }

  const expired = await cleanupExpired();

  return { upserted, expired, errors };
}

async function cleanupExpired(): Promise<number> {
  const result = await prismadb.crossOrgMatch.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

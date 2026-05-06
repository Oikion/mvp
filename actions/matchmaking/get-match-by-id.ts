"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { calculateMatchScoreV2, checkDisqualifiers } from "@/lib/matchmaking";
import { decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import type { CriterionScore, RequestForMatching, PropertyForMatchingV2 } from "@/lib/matchmaking";

// ──────────────────────────────────────────────
// Shape returned per contact
// ──────────────────────────────────────────────

export interface ContactMatchBreakdown {
  contactId: string;
  displayName: string;
  /** Overall match score 0-100 (multiplied from 0-1 internal) */
  overallScore: number;
  breakdown: CriterionScore[];
  isDisqualified: boolean;
  disqualificationReason?: string;
}

export interface MatchDetailItem {
  id: string;
  propertyId: string;
  requestId: string;
  matchScore: number;
  scoreBreakdown: Record<string, unknown> | null;
  status: string;
  property: {
    id: string;
    friendlyId: string | null;
    property_name: string | null;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    size_net_sqm: number | null;
    area: string | null;
    address_city: string | null;
    address_state: string | null;
    property_type: string | null;
    transaction_type: string | null;
    year_built: number | null;
    condition: string | null;
    energy_cert_class: string | null;
    elevator: boolean | null;
    furnished: string | null;
    heating_type: string | null;
    floor: string | null;
    owner: {
      id: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  request: {
    id: string;
    friendlyId: string | null;
    name: string | null;
    requestType: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    areasOfInterest: unknown;
    bedroomsMin: number | null;
    bedroomsMax: number | null;
    requestContacts: {
      contact: {
        id: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        primaryPhone: string | null;
      };
    }[];
  };
  /** Per-contact score breakdowns computed fresh from the v2 engine */
  contactBreakdowns: ContactMatchBreakdown[];
}

// ──────────────────────────────────────────────
// Helpers shared with get-request-matches
// ──────────────────────────────────────────────

function inferBooleanAmenity(amenities: unknown, keys: string[]): boolean | null {
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
          (k) => k.toLowerCase().replace(/[-\s]/g, "_") === norm,
        );
        return rawKey !== undefined ? obj[rawKey] === true : false;
      }
    }
    return false;
  }
  return null;
}

function extractAreas(areasOfInterest: unknown): string[] {
  if (!areasOfInterest) return [];
  if (Array.isArray(areasOfInterest))
    return (areasOfInterest as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0);
  if (typeof areasOfInterest === "string" && areasOfInterest.length > 0) return [areasOfInterest];
  if (typeof areasOfInterest === "object")
    return Object.values(areasOfInterest as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
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

export async function getMatchById(matchId: string): Promise<MatchDetailItem | null> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const rows = await prismadb.propertyRequestMatch.findMany({
    where: { id: matchId, organizationId },
    take: 1,
    select: {
      id: true,
      propertyId: true,
      requestId: true,
      matchScore: true,
      scoreBreakdown: true,
      status: true,
      property: {
        select: {
          id: true,
          friendlyId: true,
          property_name: true,
          price: true,
          bedrooms: true,
          bathrooms: true,
          size_net_sqm: true,
          area: true,
          address_city: true,
          address_state: true,
          property_type: true,
          transaction_type: true,
          year_built: true,
          condition: true,
          energy_cert_class: true,
          elevator: true,
          furnished: true,
          heating_type: true,
          floor: true,
          latitude: true,
          longitude: true,
          municipality: true,
          region: true,
          inside_city_plan: true,
          amenities: true,
          accepts_pets: true,
          assigned_to: true,
          size_gross_sqm: true,
          square_feet: true,
          property_status: true,
          owner: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      request: {
        select: {
          id: true,
          friendlyId: true,
          name: true,
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
          requestContacts: {
            select: {
              contact: {
                select: {
                  id: true,
                  displayName: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  primaryPhone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const row = rows[0];
  if (!row) return null;

  // Decrypt request fields (names/notes may be encrypted)
  const decryptedRequest = await decryptRequestForOrg(row.request as any, organizationId);

  // Decrypt each contact (displayName, firstName, lastName, email, primaryPhone are all encrypted)
  const decryptedContacts = await Promise.all(
    row.request.requestContacts.map(async (rc) => ({
      contact: await decryptContactForOrg(rc.contact, organizationId),
    }))
  );

  // Adapt property to the V2 matching shape
  const p = row.property;
  const propertyForMatching: PropertyForMatchingV2 = {
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
    organizationId,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    region: p.region ?? null,
    inside_city_plan: p.inside_city_plan ?? null,
    year_built: p.year_built ?? null,
    garden: inferBooleanAmenity(p.amenities, ["garden", "private_garden"]),
    parking: inferBooleanAmenity(p.amenities, ["parking", "private_parking", "garage"]),
  };

  // Build one RequestForMatching per contact, then score each against the property.
  // The request criteria are shared; the per-contact breakdown is identical because
  // contacts don't have individual preferences — the difference shows up in who
  // "owns" the match (BUYER vs co-buyer). We still run the engine per-contact so
  // users see which contacts are attached and can select who to include in the deal.
  const r = decryptedRequest as typeof row.request;
  const rawAreas = extractAreas(r.areasOfInterest);
  const areas = [...rawAreas];
  if (r.municipality && !areas.includes(r.municipality)) areas.push(r.municipality);
  if (r.region && !areas.includes(r.region)) areas.push(r.region);
  const requiredAmenities = extractRequiredAmenities(r.amenities);

  const sharedRequestCriteria: RequestForMatching = {
    id: r.id,
    organizationId,
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
    gardenRequired: r.requiresGarden ?? null,
    insideCityPlanRequired: r.insideCityPlan ?? null,
    conditionPreferences: (r.conditionPreference ?? null) as RequestForMatching["conditionPreferences"],
    energyClassMin: (r.energyClassMin ?? null) as RequestForMatching["energyClassMin"],
    goldenVisaRequired: r.goldenVisaEligible ?? null,
    financingStatus: (r.financingStatus as RequestForMatching["financingStatus"]) ?? null,
    timeline: (r.timeline as RequestForMatching["timeline"]) ?? null,
    yearBuiltMin: r.constructionYearMin ?? null,
    yearBuiltMax: r.constructionYearMax ?? null,
    newConstructionOnly: null,
    status: r.status ?? "ACTIVE",
    expires_at: r.expiresAt ?? null,
  };

  // Score the shared request against the property once, then attach to each contact.
  // All contacts on the same request share criteria, so the score is identical per-contact.
  const disqualifierResult = checkDisqualifiers(sharedRequestCriteria, propertyForMatching);
  const scoreResult = calculateMatchScoreV2(sharedRequestCriteria, propertyForMatching);
  const sharedScore = Math.round(scoreResult.overallScore);
  const sharedBreakdown: CriterionScore[] = scoreResult.breakdown ?? [];

  const contactBreakdowns: ContactMatchBreakdown[] = decryptedContacts.map((rc) => {
    const contact = rc.contact;
    const name =
      (contact.displayName || [contact.firstName, contact.lastName].filter(Boolean).join(" ")) ||
      "Unknown";
    return {
      contactId: contact.id,
      displayName: name,
      overallScore: sharedScore,
      breakdown: sharedBreakdown,
      isDisqualified: disqualifierResult.disqualified,
      disqualificationReason: disqualifierResult.reason as string | undefined,
    };
  });

  return {
    id: row.id,
    propertyId: row.propertyId,
    requestId: row.requestId,
    matchScore: row.matchScore == null ? 0 : Math.round(Number(row.matchScore) * 100),
    scoreBreakdown: row.scoreBreakdown as Record<string, unknown> | null,
    status: row.status,
    property: {
      id: p.id,
      friendlyId: p.friendlyId,
      property_name: p.property_name,
      price: p.price == null ? null : Number(p.price),
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      size_net_sqm: p.size_net_sqm != null ? Number(p.size_net_sqm) : null,
      area: p.area,
      address_city: p.address_city,
      address_state: p.address_state,
      property_type: p.property_type,
      transaction_type: p.transaction_type,
      year_built: p.year_built,
      condition: p.condition,
      energy_cert_class: p.energy_cert_class,
      elevator: p.elevator,
      furnished: p.furnished,
      heating_type: p.heating_type,
      floor: p.floor,
      owner: p.owner
        ? {
            id: p.owner.id,
            displayName: p.owner.displayName,
            firstName: p.owner.firstName,
            lastName: p.owner.lastName,
          }
        : null,
    },
    request: {
      id: r.id,
      friendlyId: r.friendlyId,
      name: r.name ?? null,
      requestType: r.requestType ?? null,
      budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
      budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
      areasOfInterest: r.areasOfInterest,
      bedroomsMin: r.bedroomsMin ?? null,
      bedroomsMax: r.bedroomsMax ?? null,
      requestContacts: decryptedContacts,
    },
    contactBreakdowns,
  };
}

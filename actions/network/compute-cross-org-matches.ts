/**
 * Cross-org match computation — background job logic.
 *
 * Called by the Vercel Cron endpoint every 30 minutes.
 * Decrypts network-visible mandates and properties server-side
 * (platform holds master KEK → per-org DEK chain), then runs
 * the existing scoring engine and upserts CrossOrgMatch rows.
 *
 * Never exposes decrypted data externally; CrossOrgMatch stores
 * only scores, breakdowns, and IDs.
 */

import { prismadb } from "@/lib/prisma";
import { decryptMandateForOrg, decryptPropertyForOrg } from "@/lib/model-encryption";
import { calculateMatchScore } from "@/lib/matchmaking/calculator";
import type { ClientForMatching, PropertyForMatching } from "@/lib/matchmaking/types";
import type { OrgNetworkMembership } from "@prisma/client";

const BATCH_SIZE = 10;
const MATCH_TTL_DAYS = 30;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface OrgWithSettings {
  organizationId: string;
  membership: OrgNetworkMembership;
  shareProperties: boolean;
  shareMandates: boolean;
}

type NetworkMandate = Awaited<ReturnType<typeof fetchNetworkMandates>>[number];
type NetworkProperty = Awaited<ReturnType<typeof fetchNetworkProperties>>[number];

// ─────────────────────────────────────────────────────────────────
// DB fetchers
// ─────────────────────────────────────────────────────────────────

async function fetchNetworkMandates(organizationId: string) {
  return prismadb.mandate.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      draft_status: { not: true },
      visibility: { in: ["SECURE", "PUBLIC"] },
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
      expires_at: true,
      assigned_to: true,
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
  });
}

// ─────────────────────────────────────────────────────────────────
// Adapters (reuse same shape as the single-org job)
// ─────────────────────────────────────────────────────────────────

function adaptMandateToClient(m: NetworkMandate): ClientForMatching {
  const intent =
    m.transaction_type === "SALE"
      ? "BUY"
      : m.transaction_type === "RENTAL" || m.transaction_type === "SHORT_TERM"
        ? "RENT"
        : null;

  const areas: string[] = [];
  if (m.areas_of_interest && Array.isArray(m.areas_of_interest)) {
    areas.push(...(m.areas_of_interest as string[]));
  }
  if (m.municipality && !areas.includes(m.municipality)) areas.push(m.municipality);
  if (m.region && !areas.includes(m.region)) areas.push(m.region);

  let amenitiesRequired: string[] | undefined;
  if (m.amenities && typeof m.amenities === "object" && !Array.isArray(m.amenities)) {
    const required = Object.entries(m.amenities as Record<string, boolean>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    if (required.length > 0) amenitiesRequired = required;
  } else if (Array.isArray(m.amenities)) {
    amenitiesRequired = m.amenities as string[];
  }

  return {
    id: m.id,
    client_name: m.title || "Untitled Mandate",
    full_name: null,
    intent: intent as ClientForMatching["intent"],
    purpose: m.property_purpose as ClientForMatching["purpose"],
    budget_min: m.budget_min,
    budget_max: m.budget_max,
    areas_of_interest: areas.length > 0 ? areas : null,
    property_preferences: {
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
      heating_preferences:
        m.heating_type && m.heating_type.length > 0 ? m.heating_type : undefined,
      energy_class_min: m.energy_cert_min ?? undefined,
      condition_preferences:
        m.condition && m.condition.length > 0 ? m.condition : undefined,
      amenities_required: amenitiesRequired,
    },
    client_status: "ACTIVE" as ClientForMatching["client_status"],
    assigned_to: m.assigned_to,
    organizationId: m.organizationId,
  };
}

function adaptPropertyForMatching(p: NetworkProperty): PropertyForMatching {
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
    square_feet:
      p.square_feet !== null && p.square_feet !== undefined ? Number(p.square_feet) : null,
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
 * Returns the set of property-org IDs whose properties a given mandate org
 * is eligible to match against, based on network membership.
 */
function eligiblePropertyOrgs(
  mandateOrgId: string,
  mandateOrgMembership: OrgNetworkMembership,
  allPoolOrgs: Set<string>,
  bilateralPartners: Set<string>,
): Set<string> {
  const eligible = new Set<string>();

  if (mandateOrgMembership === "POOL" || mandateOrgMembership === "BOTH") {
    Array.from(allPoolOrgs).forEach((orgId) => {
      if (orgId !== mandateOrgId) eligible.add(orgId);
    });
  }

  if (mandateOrgMembership === "BILATERAL" || mandateOrgMembership === "BOTH") {
    Array.from(bilateralPartners).forEach((orgId) => {
      if (orgId !== mandateOrgId) eligible.add(orgId);
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
  const orgBatches: OrgWithSettings[][] = [];
  for (let i = 0; i < allSettings.length; i += BATCH_SIZE) {
    orgBatches.push(allSettings.slice(i, i + BATCH_SIZE));
  }

  // Map: orgId → decrypted mandates adapted for scoring
  const mandatesByOrg = new Map<string, ClientForMatching[]>();
  // Map: orgId → adapted properties for scoring
  const propertiesByOrg = new Map<string, PropertyForMatching[]>();

  for (const batch of orgBatches) {
    await Promise.all(
      batch.map(async (orgSettings) => {
        const orgId = orgSettings.organizationId;

        if (orgSettings.shareMandates) {
          try {
            const rawMandates = await fetchNetworkMandates(orgId);
            const decrypted: ClientForMatching[] = [];
            for (const m of rawMandates) {
              try {
                const dec = await decryptMandateForOrg(m, orgId);
                decrypted.push(adaptMandateToClient(dec));
              } catch {
                // Skip corrupted records
              }
            }
            mandatesByOrg.set(orgId, decrypted);
          } catch (err) {
            console.error(`[CROSS_ORG_MATCH] Failed to load mandates for ${orgId}:`, err);
            errors++;
          }
        }

        if (orgSettings.shareProperties) {
          try {
            const rawProperties = await fetchNetworkProperties(orgId);
            const adapted: PropertyForMatching[] = [];
            for (const p of rawProperties) {
              try {
                const dec = await decryptPropertyForOrg(p as any, orgId);
                adapted.push(adaptPropertyForMatching(dec));
              } catch {
                // Skip corrupted records
              }
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

  // 3. Compute matches across orgs
  for (const [mandateOrgId, mandates] of Array.from(mandatesByOrg.entries())) {
    if (mandates.length === 0) continue;

    const mandateOrgSettings = settingsByOrg.get(mandateOrgId)!;
    const partners = await getAcceptedPartnerIds(mandateOrgId);

    const eligible = eligiblePropertyOrgs(
      mandateOrgId,
      mandateOrgSettings.membership,
      poolOrgIds,
      partners,
    );

    for (const propertyOrgId of Array.from(eligible)) {
      const propertyOrgSettings = settingsByOrg.get(propertyOrgId);
      if (!propertyOrgSettings?.shareProperties) continue;

      const properties = propertiesByOrg.get(propertyOrgId);
      if (!properties || properties.length === 0) continue;

      for (const mandate of mandates) {
        for (const property of properties) {
          try {
            const result = calculateMatchScore(mandate, property);

            const mandateRow = await prismadb.mandate.findFirst({
              where: { id: mandate.id },
              select: { expires_at: true },
            });

            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + MATCH_TTL_DAYS);
            const expiresAt =
              mandateRow?.expires_at && mandateRow.expires_at < defaultExpiry
                ? mandateRow.expires_at
                : defaultExpiry;

            await prismadb.crossOrgMatch.upsert({
              where: {
                mandateId_propertyId: {
                  mandateId: mandate.id,
                  propertyId: property.id,
                },
              },
              update: {
                matchScore: Math.round(result.overallScore),
                breakdown: result.breakdown as object[],
                computedAt: new Date(),
                expiresAt,
                mandateOrgId,
                propertyOrgId,
              },
              create: {
                mandateOrgId,
                mandateId: mandate.id,
                propertyOrgId,
                propertyId: property.id,
                matchScore: Math.round(result.overallScore),
                breakdown: result.breakdown as object[],
                expiresAt,
              },
            });
            upserted++;
          } catch (err) {
            console.error(
              `[CROSS_ORG_MATCH] Score error mandate=${mandate.id} property=${property.id}:`,
              err,
            );
            errors++;
          }
        }
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

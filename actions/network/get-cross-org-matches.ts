"use server";

/**
 * Read cross-org match results for the current org's matchmaking dashboard.
 *
 * Applies privacy filtering at read time so source orgs can change their
 * privacy level without requiring a recompute.
 */

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  filterProperty,
  filterMandate,
  type FilteredProperty,
  type FilteredMandate,
} from "@/lib/network/privacy-filter";
import type { CriterionScore } from "@/lib/matchmaking/types";

// ─────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────

export interface CrossOrgMatchResult {
  id: string;
  matchScore: number;
  breakdown: CriterionScore[];
  computedAt: Date;
  /** True when the viewing org owns the mandate; false when they own the property */
  viewingOrgHasMandate: boolean;
  mandate: FilteredMandate;
  property: FilteredProperty;
}

export interface CrossOrgMatchSummary {
  results: CrossOrgMatchResult[];
  isNetworkMember: boolean;
  lastComputedAt: Date | null;
}

// ─────────────────────────────────────────────────────────────────
// Helper: load agency profile and agent info
// ─────────────────────────────────────────────────────────────────

async function loadOrgProfile(orgId: string) {
  return prismadb.agencyProfile.findUnique({
    where: { organizationId: orgId },
    select: { name: true, logo: true },
  });
}

async function loadAgentInfo(userId: string | null) {
  if (!userId) return null;
  return prismadb.users.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
}

// ─────────────────────────────────────────────────────────────────
// Main action
// ─────────────────────────────────────────────────────────────────

export async function getCrossOrgMatches(): Promise<CrossOrgMatchSummary> {
  const guard = await requireAction("matchmaking:view_analytics");
  if (guard) return { results: [], isNetworkMember: false, lastComputedAt: null };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { results: [], isNetworkMember: false, lastComputedAt: null };

  // Check network membership
  const settings = await prismadb.orgNetworkSettings.findUnique({
    where: { organizationId: orgId },
  });

  if (!settings || settings.membership === "NONE") {
    return { results: [], isNetworkMember: false, lastComputedAt: null };
  }

  // Load rows where this org is either the mandate owner or property owner
  const rows = await prismadb.crossOrgMatch.findMany({
    where: {
      OR: [{ mandateOrgId: orgId }, { propertyOrgId: orgId }],
      expiresAt: { gt: new Date() },
    },
    orderBy: { matchScore: "desc" },
    take: 100,
  });

  if (rows.length === 0) {
    return { results: [], isNetworkMember: true, lastComputedAt: null };
  }

  // Load source org settings + profiles in parallel (deduplicated)
  const peerOrgIds = new Set(
    rows.flatMap((r) => [
      r.mandateOrgId === orgId ? r.propertyOrgId : r.mandateOrgId,
    ]),
  );

  const [peerSettingsRows, orgProfilesMap] = await Promise.all([
    prismadb.orgNetworkSettings.findMany({
      where: { organizationId: { in: Array.from(peerOrgIds) } },
    }),
    Promise.all(
      Array.from(peerOrgIds).map(async (id) => {
        const profile = await loadOrgProfile(id);
        return [id, profile] as const;
      }),
    ),
  ]);

  const peerSettings = new Map(peerSettingsRows.map((s) => [s.organizationId, s]));
  const profiles = new Map(orgProfilesMap);

  // Load mandate + property rows needed for privacy-filtered output
  const mandateIds = Array.from(new Set(rows.map((r) => r.mandateId)));
  const propertyIds = Array.from(new Set(rows.map((r) => r.propertyId)));

  const [mandateRows, propertyRows] = await Promise.all([
    prismadb.mandate.findMany({
      where: { id: { in: mandateIds } },
      select: {
        id: true,
        friendlyId: true,
        transaction_type: true,
        property_type: true,
        areas_of_interest: true,
        municipality: true,
        budget_min: true,
        budget_max: true,
        assigned_to: true,
        organizationId: true,
      },
    }),
    prismadb.properties.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        friendlyId: true,
        transaction_type: true,
        property_type: true,
        area: true,
        address_city: true,
        municipality: true,
        bedrooms: true,
        size_net_sqm: true,
        price: true,
        assigned_to: true,
        organizationId: true,
      },
    }),
  ]);

  const mandateMap = new Map(mandateRows.map((m) => [m.id, m]));
  const propertyMap = new Map(propertyRows.map((p) => [p.id, p]));

  const results: CrossOrgMatchResult[] = [];
  let lastComputedAt: Date | null = null;

  for (const row of rows) {
    const mandate = mandateMap.get(row.mandateId);
    const property = propertyMap.get(row.propertyId);
    if (!mandate || !property) continue;

    if (!lastComputedAt || row.computedAt > lastComputedAt) {
      lastComputedAt = row.computedAt;
    }

    const viewingOrgHasMandate = row.mandateOrgId === orgId;
    const peerOrgId = viewingOrgHasMandate ? row.propertyOrgId : row.mandateOrgId;
    const peerSetting = peerSettings.get(peerOrgId);
    const peerProfile = profiles.get(peerOrgId);

    // Load agent info on demand (only for FULL privacy level)
    const mandatePeerSetting = peerSettings.get(row.mandateOrgId);
    const propertyPeerSetting = peerSettings.get(row.propertyOrgId);

    const mandatePrivacy =
      row.mandateOrgId === orgId
        ? settings.mandatePrivacyLevel  // own data: use own setting
        : mandatePeerSetting?.mandatePrivacyLevel ?? "ANONYMIZED";

    const propertyPrivacy =
      row.propertyOrgId === orgId
        ? settings.propertyPrivacyLevel  // own data: use own setting
        : propertyPeerSetting?.propertyPrivacyLevel ?? "ANONYMIZED";

    // Build agent info if needed
    let mandateAgentName: string | null = null;
    let mandateAgentPhone: string | null = null;
    let propertyAgentName: string | null = null;
    let propertyAgentPhone: string | null = null;

    if (mandatePrivacy === "FULL" && mandate.assigned_to) {
      const agent = await loadAgentInfo(mandate.assigned_to);
      if (agent) {
        mandateAgentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ");
        mandateAgentPhone = null;
      }
    }
    if (propertyPrivacy === "FULL" && property.assigned_to) {
      const agent = await loadAgentInfo(property.assigned_to);
      if (agent) {
        propertyAgentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ");
        propertyAgentPhone = null;
      }
    }

    const mandateSourceProfile =
      row.mandateOrgId === orgId
        ? await loadOrgProfile(orgId)
        : profiles.get(row.mandateOrgId) ?? null;

    const propertySourceProfile =
      row.propertyOrgId === orgId
        ? await loadOrgProfile(orgId)
        : profiles.get(row.propertyOrgId) ?? null;

    const filteredMandate = filterMandate(
      {
        id: mandate.id,
        friendlyId: mandate.friendlyId,
        transaction_type: mandate.transaction_type,
        property_type: mandate.property_type,
        areas_of_interest: mandate.areas_of_interest as string[] | null,
        municipality: mandate.municipality,
        budget_min: mandate.budget_min ? Number(mandate.budget_min) : null,
        budget_max: mandate.budget_max ? Number(mandate.budget_max) : null,
        organizationId: mandate.organizationId,
        agencyName: mandateSourceProfile?.name ?? null,
        agencyLogo: mandateSourceProfile?.logo ?? null,
        agentName: mandateAgentName,
        agentPhone: mandateAgentPhone,
      },
      mandatePrivacy,
    );

    const filteredProperty = filterProperty(
      {
        id: property.id,
        friendlyId: property.friendlyId,
        property_name: "",
        transaction_type: property.transaction_type,
        property_type: property.property_type,
        area: property.area,
        address_city: property.address_city,
        municipality: property.municipality,
        bedrooms: property.bedrooms,
        size_net_sqm: property.size_net_sqm ? Number(property.size_net_sqm) : null,
        price: property.price ? Number(property.price) : null,
        organizationId: property.organizationId,
        agencyName: propertySourceProfile?.name ?? null,
        agencyLogo: propertySourceProfile?.logo ?? null,
        listingAgentName: propertyAgentName,
        listingAgentPhone: propertyAgentPhone,
      },
      propertyPrivacy,
    );

    results.push({
      id: row.id,
      matchScore: row.matchScore,
      breakdown: row.breakdown as unknown as CriterionScore[],
      computedAt: row.computedAt,
      viewingOrgHasMandate,
      mandate: filteredMandate,
      property: filteredProperty,
    });
  }

  return { results, isNetworkMember: true, lastComputedAt };
}

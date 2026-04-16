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
  filterRequest,
  type FilteredProperty,
  type FilteredRequest,
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
  /** True when the viewing org owns the request; false when they own the property */
  viewingOrgHasRequest: boolean;
  request: FilteredRequest;
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

  // Load rows where this org is either the request owner or property owner
  const rows = await prismadb.crossOrgMatch.findMany({
    where: {
      OR: [{ requestOrgId: orgId }, { propertyOrgId: orgId }],
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
      r.requestOrgId === orgId ? r.propertyOrgId : r.requestOrgId,
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

  // Load request + property rows needed for privacy-filtered output
  const requestIds = Array.from(new Set(rows.map((r) => r.requestId)));
  const propertyIds = Array.from(new Set(rows.map((r) => r.propertyId)));

  const [requestRows, propertyRows] = await Promise.all([
    prismadb.request.findMany({
      where: { id: { in: requestIds } },
      select: {
        id: true,
        friendlyId: true,
        requestType: true,
        propertyCategory: true,
        areasOfInterest: true,
        municipality: true,
        budgetMin: true,
        budgetMax: true,
        assignedAgentId: true,
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

  const requestMap = new Map(requestRows.map((m) => [m.id, m]));
  const propertyMap = new Map(propertyRows.map((p) => [p.id, p]));

  // Batch-fetch all agent info needed across all rows (single query)
  const uniqueAgentIds = new Set<string>();
  for (const row of rows) {
    const request = requestMap.get(row.requestId);
    const property = propertyMap.get(row.propertyId);
    if (!request || !property) continue;

    const requestPeerSetting = peerSettings.get(row.requestOrgId);
    const propertyPeerSetting = peerSettings.get(row.propertyOrgId);
    const requestPrivacy =
      row.requestOrgId === orgId
        ? settings.requestPrivacyLevel
        : requestPeerSetting?.requestPrivacyLevel ?? "ANONYMIZED";
    const propertyPrivacy =
      row.propertyOrgId === orgId
        ? settings.propertyPrivacyLevel
        : propertyPeerSetting?.propertyPrivacyLevel ?? "ANONYMIZED";

    if (requestPrivacy === "FULL" && request.assignedAgentId) uniqueAgentIds.add(request.assignedAgentId);
    if (propertyPrivacy === "FULL" && property.assigned_to) uniqueAgentIds.add(property.assigned_to);
  }

  const agentRows =
    uniqueAgentIds.size > 0
      ? await prismadb.users.findMany({
          where: { id: { in: Array.from(uniqueAgentIds) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const agentMap = new Map(agentRows.map((a) => [a.id, a]));

  // Fetch the viewing org's own profile once (reused per row)
  const ownProfile = await loadOrgProfile(orgId);

  const results: CrossOrgMatchResult[] = [];
  let lastComputedAt: Date | null = null;

  for (const row of rows) {
    const request = requestMap.get(row.requestId);
    const property = propertyMap.get(row.propertyId);
    if (!request || !property) continue;

    if (!lastComputedAt || row.computedAt > lastComputedAt) {
      lastComputedAt = row.computedAt;
    }

    const viewingOrgHasRequest = row.requestOrgId === orgId;

    // Load agent info on demand (only for FULL privacy level)
    const requestPeerSetting = peerSettings.get(row.requestOrgId);
    const propertyPeerSetting = peerSettings.get(row.propertyOrgId);

    const requestPrivacy =
      row.requestOrgId === orgId
        ? settings.requestPrivacyLevel  // own data: use own setting
        : requestPeerSetting?.requestPrivacyLevel ?? "ANONYMIZED";

    const propertyPrivacy =
      row.propertyOrgId === orgId
        ? settings.propertyPrivacyLevel  // own data: use own setting
        : propertyPeerSetting?.propertyPrivacyLevel ?? "ANONYMIZED";

    // Build agent info if needed (map lookup — no DB query)
    let requestAgentName: string | null = null;
    let requestAgentPhone: string | null = null;
    let propertyAgentName: string | null = null;
    let propertyAgentPhone: string | null = null;

    if (requestPrivacy === "FULL" && request.assignedAgentId) {
      const agent = agentMap.get(request.assignedAgentId);
      if (agent) {
        requestAgentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ");
        requestAgentPhone = null;
      }
    }
    if (propertyPrivacy === "FULL" && property.assigned_to) {
      const agent = agentMap.get(property.assigned_to);
      if (agent) {
        propertyAgentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ");
        propertyAgentPhone = null;
      }
    }

    const requestSourceProfile =
      row.requestOrgId === orgId
        ? ownProfile
        : profiles.get(row.requestOrgId) ?? null;

    const propertySourceProfile =
      row.propertyOrgId === orgId
        ? ownProfile
        : profiles.get(row.propertyOrgId) ?? null;

    const filteredRequest = filterRequest(
      {
        id: request.id,
        friendlyId: request.friendlyId ?? null,
        requestType: request.requestType,
        propertyCategory: request.propertyCategory ?? null,
        areasOfInterest: request.areasOfInterest as string[] | null,
        municipality: request.municipality ?? null,
        budgetMin: request.budgetMin ? Number(request.budgetMin) : null,
        budgetMax: request.budgetMax ? Number(request.budgetMax) : null,
        organizationId: request.organizationId,
        agencyName: requestSourceProfile?.name ?? null,
        agencyLogo: requestSourceProfile?.logo ?? null,
        agentName: requestAgentName,
        agentPhone: requestAgentPhone,
      },
      requestPrivacy,
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
      viewingOrgHasRequest,
      request: filteredRequest,
      property: filteredProperty,
    });
  }

  return { results, isNetworkMember: true, lastComputedAt };
}

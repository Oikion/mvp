"use server";

/**
 * CRUD actions for OrgNetworkSettings and OrgNetworkPartner.
 * All mutations require ORG_OWNER or ADMIN role.
 */

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import type { OrgNetworkMembership, NetworkPrivacyLevel, OrgNetworkSettings } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────

export async function getNetworkSettings(): Promise<OrgNetworkSettings | null> {
  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return null;
  return prismadb.orgNetworkSettings.findUnique({
    where: { organizationId: orgId },
  });
}

export async function getNetworkPartners() {
  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return [];

  const rows = await prismadb.orgNetworkPartner.findMany({
    where: {
      OR: [{ initiatorOrgId: orgId }, { partnerOrgId: orgId }],
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with agency profiles
  const peerIds = rows.map((r) =>
    r.initiatorOrgId === orgId ? r.partnerOrgId : r.initiatorOrgId,
  );

  const profiles = await prismadb.agencyProfile.findMany({
    where: { organizationId: { in: peerIds } },
    select: { organizationId: true, name: true, slug: true, logo: true, city: true },
  });

  const profileMap = new Map(profiles.map((p) => [p.organizationId, p]));

  return rows.map((r) => {
    const peerId = r.initiatorOrgId === orgId ? r.partnerOrgId : r.initiatorOrgId;
    return {
      ...r,
      isInitiator: r.initiatorOrgId === orgId,
      peer: profileMap.get(peerId) ?? { organizationId: peerId, name: null, slug: null, logo: null, city: null },
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Upsert org-level settings
// ─────────────────────────────────────────────────────────────────

export interface UpdateNetworkSettingsInput {
  membership: OrgNetworkMembership;
  shareProperties: boolean;
  shareMandates: boolean;
  propertyPrivacyLevel: NetworkPrivacyLevel;
  mandatePrivacyLevel: NetworkPrivacyLevel;
}

export async function updateNetworkSettings(input: UpdateNetworkSettingsInput) {
  const guard = await requireAction("organization:manage_settings");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  await prismadb.orgNetworkSettings.upsert({
    where: { organizationId: orgId },
    update: { ...input },
    create: { organizationId: orgId, ...input },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────
// Bilateral partner management
// ─────────────────────────────────────────────────────────────────

export async function inviteNetworkPartner(partnerOrgSlug: string) {
  const guard = await requireAction("organization:manage_settings");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  const partnerProfile = await prismadb.agencyProfile.findUnique({
    where: { slug: partnerOrgSlug },
    select: { organizationId: true },
  });

  if (!partnerProfile) {
    return { success: false, error: "Agency not found" };
  }

  if (partnerProfile.organizationId === orgId) {
    return { success: false, error: "Cannot invite your own organization" };
  }

  // Prevent duplicate (either direction)
  const existing = await prismadb.orgNetworkPartner.findFirst({
    where: {
      OR: [
        { initiatorOrgId: orgId, partnerOrgId: partnerProfile.organizationId },
        { initiatorOrgId: partnerProfile.organizationId, partnerOrgId: orgId },
      ],
    },
  });

  if (existing) {
    return { success: false, error: "Partnership already exists or is pending" };
  }

  await prismadb.orgNetworkPartner.create({
    data: {
      initiatorOrgId: orgId,
      partnerOrgId: partnerProfile.organizationId,
      status: "PENDING",
    },
  });

  return { success: true };
}

export async function respondToPartnerInvite(
  partnerId: string,
  accept: boolean,
) {
  const guard = await requireAction("organization:manage_settings");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  const row = await prismadb.orgNetworkPartner.findUnique({
    where: { id: partnerId },
  });

  if (!row || row.partnerOrgId !== orgId) {
    return { success: false, error: "Invitation not found" };
  }

  if (row.status !== "PENDING") {
    return { success: false, error: "Invitation already responded to" };
  }

  await prismadb.orgNetworkPartner.update({
    where: { id: partnerId },
    data: {
      status: accept ? "ACCEPTED" : "REJECTED",
      acceptedAt: accept ? new Date() : null,
    },
  });

  return { success: true };
}

export async function revokeNetworkPartner(partnerId: string) {
  const guard = await requireAction("organization:manage_settings");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  const row = await prismadb.orgNetworkPartner.findUnique({
    where: { id: partnerId },
  });

  if (!row) return { success: false, error: "Partnership not found" };

  if (row.initiatorOrgId !== orgId && row.partnerOrgId !== orgId) {
    return { success: false, error: "Unauthorized" };
  }

  await prismadb.orgNetworkPartner.update({
    where: { id: partnerId },
    data: { status: "REVOKED" },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────
// Per-record network visibility toggle
// ─────────────────────────────────────────────────────────────────

export async function setPropertyNetworkVisible(propertyId: string, visible: boolean) {
  const guard = await requireAction("mls:edit_property");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  await prismadb.properties.updateMany({
    where: { id: propertyId, organizationId: orgId },
    data: { networkVisible: visible },
  });

  return { success: true };
}

export async function setMandateNetworkVisible(mandateId: string, visible: boolean) {
  const guard = await requireAction("mandates:edit");
  if (guard) return { success: false, error: "Unauthorized" };

  const orgId = await getCurrentOrgIdSafe();
  if (!orgId) return { success: false, error: "No organization" };

  await prismadb.mandate.updateMany({
    where: { id: mandateId, organizationId: orgId },
    data: { networkVisible: visible },
  });

  return { success: true };
}

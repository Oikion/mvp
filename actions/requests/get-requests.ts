"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";

/**
 * Fetches all requests for the current organization.
 * Returns decrypted request list with linked contacts + agent info.
 */
export const getRequests = async () => {
  const guard = await requireAction("request:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const data = await prismadb.request.findMany({
    where: { organizationId },
    select: {
      id: true,
      friendlyId: true,
      requestType: true,
      propertyCategory: true,
      propertyTypes: true,
      status: true,
      urgency: true,
      closureReason: true,
      budgetMin: true,
      budgetMax: true,
      surfaceMin: true,
      surfaceMax: true,
      bedroomsMin: true,
      bedroomsMax: true,
      locationDisplayName: true,
      municipality: true,
      region: true,
      notes: true,
      visibility: true,
      timeline: true,
      createdAt: true,
      assignedAgentId: true,
      requestContacts: {
        select: {
          role: true,
          contact: {
            select: {
              id: true,
              friendlyId: true,
              displayName: true,
              isCompany: true,
              email: true,
              primaryPhone: true,
            },
          },
        },
      },
      assignedAgent: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const results = [];
  for (const request of data) {
    try {
      const decReq = await decryptRequestForOrg(request, organizationId);
      // Decrypt linked contacts' display names
      const decContacts = [];
      for (const rc of request.requestContacts) {
        const decContact = await decryptContactForOrg(rc.contact, organizationId);
        decContacts.push({ ...rc, contact: decContact });
      }
      results.push(serializePrisma({ ...decReq, requestContacts: decContacts }));
    } catch (err) {
      console.error(`[GET_REQUESTS] Failed to decrypt request ${request.id}:`, err);
    }
  }
  return results;
};

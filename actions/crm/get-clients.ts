"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getClients = async () => {
  // Check permission to read clients
  const guard = await requireAction("client:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.contact.findMany({
    where: { organizationId },
    select: {
      id: true,
      friendlyId: true,
      displayName: true,
      email: true,
      primaryPhone: true,
      status: true,
      createdAt: true,
      assignedAgentId: true,
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500, // Add reasonable limit to prevent over-fetching
  });
  // Map to legacy fields expected by existing UI until refactor completes
  const results = [];
  for (const c of data) {
    try {
      const dec = await decryptContactForOrg(c, organizationId);
      results.push({
        ...dec,
        name: dec.displayName,
        email: dec.email,
        phone: dec.primaryPhone,
        status: dec.status === "ACTIVE" ? "Active" : "IN_PROGRESS",
        assigned_to: dec.assignedAgentId,
        assigned_to_user: dec.assignedAgent,
        contacts: [],
      });
    } catch (err) {
      console.error(`[GET_CLIENTS] Failed to decrypt contact ${c.id}:`, err);
      // Skip corrupted record rather than crashing the list
    }
  }
  return results;
};



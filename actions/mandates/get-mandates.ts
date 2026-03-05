"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptMandateForOrg } from "@/lib/model-encryption";

export const getMandates = async () => {
  // Check permission to read clients (mandates share CRM permission)
  const guard = await requireAction("client:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }

  const data = await prismadb.mandate.findMany({
    where: {
      organizationId,
      draft_status: { not: true },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      client: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          primary_phone: true,
        },
      },
    },
  });

  const results = [];
  for (const m of data) {
    try {
      const dec = await decryptMandateForOrg(m, organizationId);
      results.push(dec);
    } catch (err) {
      console.error(`[GET_MANDATES] Failed to decrypt mandate ${m.id}:`, err);
      // Skip corrupted record rather than crashing the list
    }
  }

  return JSON.parse(JSON.stringify(results));
};

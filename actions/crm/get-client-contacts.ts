"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getClientContacts = async () => {
  const guard = await requireAction("contact:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.contact.findMany({
    where: {
      organizationId,
    },
    include: {
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    take: 100,
  });
  // Decrypt and map to legacy fields expected by existing UI until refactor completes
  const results = [];
  for (const p of data) {
    const dec = await decryptContactForOrg(p, organizationId);
    results.push({
      ...dec,
      first_name: dec.firstName,
      last_name: dec.lastName,
      assigned_accounts: [],
      assigned_to_user: dec.assignedAgent,
      created_by_user: null,
    });
  }
  return results;
};

"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export const getContactsByAccountId = async (accountId: string) => {
  // Check permission to read contacts
  const guard = await requireAction("contact:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }

  // In v2.0, contacts are the primary entity. This function returns
  // the contact matching accountId for backward compatibility.
  const data = await prismadb.contact.findMany({
    where: {
      id: accountId,
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
  });

  // Map to expected field names for backward compatibility
  return data.map((contact) => ({
    ...contact,
    assigned_to_user: contact.assignedAgent,
    crate_by_user: null,
    assigned_client: null,
  }));
};

"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getAccount = async (accountId: string) => {
  const guard = await requireAction("contact:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();

  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.contact.findFirst({
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

  if (!data) return null;

  const decryptedData = await decryptContactForOrg(data, organizationId);

  // Map to expected field names for backward compatibility
  return {
    ...decryptedData,
    contacts: [],
    assigned_to_user: decryptedData.assignedAgent,
  };
};

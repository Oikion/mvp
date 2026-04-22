"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getAccountsByContactId = async (contactId: string) => {
  const guard = await requireAction("contact:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  // In v2.0 the old "clients with contacts" pattern is gone.
  // A contact IS the entity. Return the contact itself as a single-item array
  // for backward compatibility with callers that expected a list of "accounts".
  const data = await prismadb.contact.findMany({
    where: {
      organizationId,
      id: contactId,
    },
    include: {
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
  });

  // Decrypt and map to expected field names for backward compatibility
  const results = [];
  for (const contact of data) {
    const dec = await decryptContactForOrg(contact, organizationId);
    results.push({
      ...dec,
      assigned_to_user: dec.assignedAgent,
      contacts: [],
    });
  }
  return results;
};

"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

/**
 * Fetches all contacts for the current organization.
 * Returns decrypted contact list with assigned agent info.
 */
export const getContacts = async () => {
  const guard = await requireAction("contact:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  const data = await prismadb.contact.findMany({
    where: { organizationId },
    select: {
      id: true,
      friendlyId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      isCompany: true,
      companyName: true,
      email: true,
      primaryPhone: true,
      category: true,
      status: true,
      visibility: true,
      tags: true,
      createdAt: true,
      assignedAgentId: true,
      assignedAgent: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const results = [];
  for (const contact of data) {
    try {
      const dec = await decryptContactForOrg(contact, organizationId);
      results.push(dec);
    } catch (err) {
      console.error(`[GET_CONTACTS] Failed to decrypt contact ${contact.id}:`, err);
    }
  }
  return results;
};

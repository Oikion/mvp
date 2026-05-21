"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptContactForOrg } from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";

type ContactWithAgent = Prisma.ContactGetPayload<{
  include: { assignedAgent: { select: { firstName: true; lastName: true } } };
}>;

export const getContacts = async (): Promise<ContactWithAgent[]> => {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return [];
  }

  try {
    const data = await prismadb.contact.findMany({
      where: {
        organizationId,
        archivedAt: null,
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

    const results: ContactWithAgent[] = [];
    for (const contact of data) {
      try {
        results.push(await decryptContactForOrg(contact, organizationId));
      } catch (err) {
        console.error(`[GET_CONTACTS] Failed to decrypt contact ${contact.id}:`, err);
      }
    }
    return results;
  } catch (error) {
    console.error("[GET_CONTACTS]", error);
    return [];
  }
};


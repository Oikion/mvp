"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError } from "@/lib/action-response";

export type SharedClientData = {
  id: string;
  entityType: string;
  entityId: string;
  sharedById: string | null;
  sharedWithId: string | null;
  permissions: string;
  message: string | null;
  createdAt: Date;
  contact: {
    id: string;
    friendlyId: string | null;
    displayName: string;
    email: string | null;
    primaryPhone: string | null;
    status: string;
    visibility: string;
    category: string[];
  } | null;
};

export async function getSharedContacts() {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const sharedEntities = await prismadb.sharedEntity.findMany({
      where: {
        organizationId,
        entityType: "CONTACT",
      } as any,
    });

    // Manually join contacts since SharedEntity has no Prisma relation to Contact
    const results = await Promise.all(
      sharedEntities.map(async (se) => {
        const contact = await prismadb.contact.findFirst({
          where: { id: se.entityId, organizationId },
          select: {
            id: true,
            friendlyId: true,
            displayName: true,
            email: true,
            primaryPhone: true,
            status: true,
            visibility: true,
            category: true,
          },
        });

        if (!contact) return { ...se, contact: null };

        const decrypted = await decryptContactForOrg(contact, organizationId);
        return { ...se, contact: decrypted };
      })
    );

    return actionSuccess(serializePrisma(results));
  } catch (error) {
    console.error("[GET_SHARED_CONTACTS]", error);
    return actionError("Failed to fetch shared contacts", error as Error);
  }
}

// Backward-compat alias
export const getSharedClients = getSharedContacts;

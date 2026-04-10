"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";

export async function getSharedContacts(): Promise<ActionResponse> {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const sharedEntities = await prismadb.sharedEntity.findMany({
      where: {
        organizationId,
        entityType: "CONTACT",
      },
      include: {
        contact: {
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
        },
      },
    });

    const results = await Promise.all(
      sharedEntities
        .filter((se) => se.contact)
        .map(async (se) => {
          const decrypted = await decryptContactForOrg(se.contact!, organizationId);
          return { ...se, contact: decrypted };
        })
    );

    return actionSuccess(serializePrisma(results));
  } catch (error) {
    console.error("[GET_SHARED_CONTACTS]", error);
    return actionError("Failed to fetch shared contacts", error as Error);
  }
}

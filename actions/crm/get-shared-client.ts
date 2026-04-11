"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { actionSuccess, actionError, actionNotFound } from "@/lib/action-response";

export async function getSharedContact(contactId: string) {
  const guard = await requireAction("contact:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  try {
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        linkedProperties: {
          include: {
            property: {
              select: { id: true, property_name: true, friendlyId: true, property_status: true },
            },
          },
        },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!contact) return actionNotFound("Contact");

    const decrypted = await decryptContactForOrg(contact, organizationId);
    return actionSuccess(serializePrisma(decrypted));
  } catch (error) {
    console.error("[GET_SHARED_CONTACT]", error);
    return actionError("Failed to fetch contact", error as Error);
  }
}

// Backward-compat alias
export const getSharedClient = getSharedContact;

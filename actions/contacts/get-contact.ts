"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

/**
 * Fetches a single contact by friendlyId with full details.
 * Returns decrypted contact with agent info and relationships.
 */
export const getContact = async (contactId: string) => {
  const guard = await requireAction("contact:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const data = await prismadb.contact.findFirst({
    where: {
      organizationId,
      friendlyId: contactId,
    },
    include: {
      assignedAgent: { select: { name: true, id: true } },
      contactComments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { name: true, id: true, avatar: true } },
        },
      },
      contactRelationshipsA: {
        include: {
          contactB: {
            select: { id: true, friendlyId: true, displayName: true, isCompany: true },
          },
        },
      },
      contactRelationshipsB: {
        include: {
          contactA: {
            select: { id: true, friendlyId: true, displayName: true, isCompany: true },
          },
        },
      },
      // v2.0 linked entities
      requestContacts: {
        include: {
          request: {
            select: {
              id: true,
              friendlyId: true,
              requestType: true,
              status: true,
              urgency: true,
              budgetMin: true,
              budgetMax: true,
              locationDisplayName: true,
              municipality: true,
            },
          },
        },
      },
      ownedProperties: {
        select: {
          id: true,
          friendlyId: true,
          property_name: true,
          property_type: true,
          property_status: true,
          address_city: true,
          price: true,
          bedrooms: true,
          bathrooms: true,
        },
        take: 20,
      },
    },
  });

  if (!data) return null;

  const decrypted = await decryptContactForOrg(data, organizationId);

  // Merge bidirectional relationships into a single list
  const relationships = [
    ...(decrypted.contactRelationshipsA || []).map((r: any) => ({
      id: r.id,
      relatedContact: r.contactB,
      relationshipType: r.relationshipType,
      notes: r.notes,
    })),
    ...(decrypted.contactRelationshipsB || []).map((r: any) => ({
      id: r.id,
      relatedContact: r.contactA,
      relationshipType: r.relationshipType,
      notes: r.notes,
    })),
  ];

  return JSON.parse(JSON.stringify({
    ...decrypted,
    relationships,
  }));
};

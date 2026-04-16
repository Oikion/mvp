"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  decryptRequestForOrg,
  decryptContactForOrg,
  decryptRequestCommentForOrg,
} from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";

/**
 * Fetches a single request by friendlyId with full details.
 * Includes linked contacts, comments, and property matches.
 */
export const getRequest = async (friendlyId: string) => {
  const guard = await requireAction("request:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return null;

  const request = await prismadb.request.findFirst({
    where: { friendlyId, organizationId },
    include: {
      requestContacts: {
        include: {
          contact: {
            select: {
              id: true,
              friendlyId: true,
              displayName: true,
              isCompany: true,
              companyName: true,
              email: true,
              primaryPhone: true,
              category: true,
            },
          },
        },
      },
      assignedAgent: {
        select: { id: true, name: true, email: true },
      },
      requestComments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      propertyMatches: {
        include: {
          property: {
            select: {
              id: true,
              friendlyId: true,
              property_name: true,
              property_type: true,
              price: true,
              address_city: true,
              municipality: true,
              size_net_sqm: true,
              bedrooms: true,
              bathrooms: true,
            },
          },
        },
        orderBy: { matchScore: "desc" },
      },
    },
  });

  if (!request) return null;

  // Decrypt request fields
  const decrypted = await decryptRequestForOrg(request, organizationId);

  // Decrypt linked contacts
  const decContacts = [];
  for (const rc of request.requestContacts) {
    const decContact = await decryptContactForOrg(rc.contact, organizationId);
    decContacts.push({ ...rc, contact: decContact });
  }

  // Decrypt comments
  const decComments = [];
  for (const comment of request.requestComments) {
    try {
      const dec = await decryptRequestCommentForOrg(comment, organizationId);
      decComments.push(dec);
    } catch (err) {
      console.error(`[GET_REQUEST] Failed to decrypt comment ${comment.id}:`, err);
    }
  }

  return serializePrisma({
    ...decrypted,
    requestContacts: decContacts,
    requestComments: decComments,
  });
};

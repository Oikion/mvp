"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { serializePrisma } from "@/lib/prisma-serialize";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Fetches a request that has been explicitly shared with the current user.
 * Allows cross-org read access; decrypts using the owning org's DEK.
 * Comments are excluded from shared views.
 */
export async function getSharedRequest(requestId: string) {
  const guard = await requireAction("request:read");
  if (guard) return null;

  const currentUser = await getCurrentUserSafe();
  if (!currentUser) return null;

  // Resolve by friendlyId (no org filter — cross-org lookup)
  const resolved = await prismadb.request.findFirst({
    where: {
      OR: [{ friendlyId: requestId }, { id: requestId }],
    },
    select: { id: true, organizationId: true },
  });

  if (!resolved) return null;

  // Gate on SharedEntity record
  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "REQUEST",
      entityId: resolved.id,
      sharedWithId: currentUser.id,
    },
    select: {
      permissions: true,
      message: true,
      createdAt: true,
      Users_SharedEntity_sharedByIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!share) return null;

  // Fetch full request (no comments — VIEW_ONLY cross-org)
  const request = await prismadb.request.findUnique({
    where: { id: resolved.id },
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
      propertyMatches: {
        where: { property: { visibility: { not: "HIDDEN" } } },
        include: {
          property: {
            select: {
              id: true,
              friendlyId: true,
              property_name: true,
              property_type: true,
              price: true,
              address_city: true,
              size_net_sqm: true,
              bedrooms: true,
              bathrooms: true,
            },
          },
        },
        orderBy: { matchScore: "desc" },
        take: 10,
      },
    },
  });

  if (!request) return null;

  // Decrypt with the OWNING org's DEK — never the viewer's org
  const owningOrgId = resolved.organizationId;
  const decrypted = await decryptRequestForOrg(request, owningOrgId);

  // Decrypt linked contacts using owning org's DEK
  const decContacts = [];
  for (const rc of request.requestContacts) {
    const decContact = await decryptContactForOrg(rc.contact, owningOrgId);
    decContacts.push({ ...rc, contact: decContact });
  }

  return serializePrisma({
    ...decrypted,
    requestContacts: decContacts,
    requestComments: [], // excluded from shared views
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    },
  });
}

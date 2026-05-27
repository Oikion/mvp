"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { requireAction } from "@/lib/permissions/action-guards";

/**
 * Fetches a contact that has been explicitly shared with the current user.
 * Allows cross-org read access; decrypts using the owning org's DEK.
 */
export async function getSharedContact(contactId: string) {
  const guard = await requireAction("contact:read");
  if (guard) return null;

  const currentUser = await getCurrentUserSafe();
  if (!currentUser) return null;

  // Resolve by friendlyId (no org filter — cross-org lookup)
  const resolved = await prismadb.contact.findFirst({
    where: {
      OR: [{ friendlyId: contactId }, { id: contactId }],
    },
    select: { id: true, organizationId: true },
  });

  if (!resolved) return null;

  // Gate on SharedEntity record
  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "CONTACT",
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

  // Fetch full contact (VIEW_ONLY — no comments)
  const contact = await prismadb.contact.findUnique({
    where: { id: resolved.id },
    include: {
      assignedAgent: { select: { name: true, id: true } },
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
      requestContacts: {
        include: {
          request: {
            select: {
              id: true,
              friendlyId: true,
              requestType: true,
              status: true,
              budgetMin: true,
              budgetMax: true,
              locationDisplayName: true,
            },
          },
        },
      },
      ownedProperties: {
        where: { visibility: { not: "HIDDEN" } },
        select: {
          id: true,
          friendlyId: true,
          property_name: true,
          property_type: true,
          property_status: true,
          address_city: true,
          price: true,
        },
        take: 20,
      },
    },
  });

  if (!contact) return null;

  // Decrypt with the OWNING org's DEK — never the viewer's org
  const decrypted = await decryptContactForOrg(contact, resolved.organizationId);

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
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    },
  }));
}

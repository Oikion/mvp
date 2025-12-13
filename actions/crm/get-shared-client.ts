"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * Get a client that has been shared with the current user
 * This allows cross-organization access for sharees
 */
export async function getSharedClient(clientId: string) {
  const currentUser = await getCurrentUser();

  // Check if the client is shared with the current user
  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "CLIENT",
      entityId: clientId,
      sharedWithId: currentUser.id,
    },
    select: {
      permissions: true,
      message: true,
      createdAt: true,
      sharedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  if (!share) {
    return null;
  }

  // Fetch the client (without organization restriction)
  const client = await prismadb.clients.findUnique({
    where: { id: clientId },
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      contacts: true,
      linked_properties: {
        include: {
          property: {
            select: {
              id: true,
              property_name: true,
              property_type: true,
              price: true,
              address_city: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    return null;
  }

  return {
    ...client,
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.sharedBy,
    },
  };
}

/**
 * Check if the current user has share access to a client
 */
export async function hasClientShareAccess(clientId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();

  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "CLIENT",
      entityId: clientId,
      sharedWithId: currentUser.id,
    },
    select: { id: true },
  });

  return !!share;
}







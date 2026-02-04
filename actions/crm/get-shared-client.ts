"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";

/**
 * Get a client that has been shared with the current user
 * This allows cross-organization access for sharees
 */
export async function getSharedClient(clientId: string) {
  const currentUser = await getCurrentUserSafe();
  
  // Return null if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return null;
  }

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

  if (!share) {
    return null;
  }

  // Fetch the client (without organization restriction)
  const client = await prismadb.clients.findUnique({
    where: { id: clientId },
    include: {
      Users_Clients_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      Client_Contacts: true,
      Client_Properties: {
        include: {
          Properties: {
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
    // Map to expected field names for backward compatibility
    assigned_to_user: client.Users_Clients_assigned_toToUsers,
    contacts: client.Client_Contacts,
    linked_properties: client.Client_Properties.map((cp) => ({
      ...cp,
      property: cp.Properties,
    })),
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    },
  };
}

/**
 * Check if the current user has share access to a client
 */
export async function hasClientShareAccess(clientId: string): Promise<boolean> {
  const currentUser = await getCurrentUserSafe();
  
  // Return false if no user context
  if (!currentUser) {
    return false;
  }

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















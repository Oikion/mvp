// @ts-nocheck
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";
import { decryptContactForOrg } from "@/lib/model-encryption";

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

  // Resolve friendlyId to UUID.
  // SECURITY: We intentionally do not filter by organizationId here because
  // shared clients are cross-org by design. The share-membership check below
  // is the authorisation gate — a share record tying entityId to currentUser.id
  // must exist before any client data is returned.
  const resolvedClient = await prismadb.contact.findFirst({
    where: { friendlyId: clientId },
    select: { id: true },
  });

  if (!resolvedClient) {
    return null;
  }

  // SECURITY: Authorisation gate — verify the caller is an active sharee.
  // The resolved UUID must match the entityId of a share granted to this user.
  // We use the DB-resolved UUID (not the caller-supplied friendlyId) to avoid
  // friendlyId ambiguity attacks across orgs.
  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "CLIENT",
      entityId: resolvedClient.id,
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
  const client = await prismadb.contact.findUnique({
    where: { id: resolvedClient.id },
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

  try {
    const decryptedClient = await decryptContactForOrg(client, client.organizationId);
    return {
      ...decryptedClient,
      // Map to expected field names for backward compatibility
      assigned_to_user: decryptedClient.Users_Clients_assigned_toToUsers,
      contacts: decryptedClient.Client_Contacts,
      linked_properties: decryptedClient.Client_Properties.map((cp) => ({
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
  } catch (err) {
    console.error(`[GET_SHARED_CLIENT] Failed to process client ${client.id}:`, err);
    return null;
  }
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

  // Resolve friendlyId to UUID
  const resolvedClient = await prismadb.contact.findFirst({
    where: { friendlyId: clientId },
    select: { id: true },
  });

  if (!resolvedClient) {
    return false;
  }

  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "CLIENT",
      entityId: resolvedClient.id,
      sharedWithId: currentUser.id,
    },
    select: { id: true },
  });

  return !!share;
}















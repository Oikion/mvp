"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { SharedEntityType, SharePermission } from "@prisma/client";
import { notifyEntityShared } from "@/lib/notifications";

export interface ShareEntityInput {
  entityType: SharedEntityType;
  entityId: string;
  sharedWithId: string;
  permissions?: SharePermission;
  message?: string;
}

/**
 * Share an entity with a connection
 */
export async function shareEntity(input: ShareEntityInput) {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  if (currentUser.id === input.sharedWithId) {
    throw new Error("You cannot share with yourself");
  }

  // Verify the target user is a connection
  const connection = await prismadb.agentConnection.findFirst({
    where: {
      OR: [
        {
          followerId: currentUser.id,
          followingId: input.sharedWithId,
          status: "ACCEPTED",
        },
        {
          followerId: input.sharedWithId,
          followingId: currentUser.id,
          status: "ACCEPTED",
        },
      ],
    },
  });

  if (!connection) {
    throw new Error("You can only share with your connections");
  }

  // Verify the entity exists and user has permission (assigned OR in same org), and get entity name
  let entityExists = false;
  let entityName = "";
  
  switch (input.entityType) {
    case "PROPERTY":
      const property = await prismadb.properties.findFirst({
        where: {
          id: input.entityId,
          OR: [
            { assigned_to: currentUser.id },
            { organizationId },
          ],
        },
        select: { id: true, property_name: true },
      });
      entityExists = !!property;
      entityName = property?.property_name || "Property";
      break;
    case "CLIENT":
      const client = await prismadb.clients.findFirst({
        where: {
          id: input.entityId,
          OR: [
            { assigned_to: currentUser.id },
            { organizationId },
          ],
        },
        select: { id: true, client_name: true },
      });
      entityExists = !!client;
      entityName = client?.client_name || "Client";
      break;
    case "DOCUMENT":
      const document = await prismadb.documents.findFirst({
        where: {
          id: input.entityId,
          OR: [
            { created_by_user: currentUser.id },
            { assigned_user: currentUser.id },
          ],
        },
        select: { id: true, document_name: true },
      });
      entityExists = !!document;
      entityName = document?.document_name || "Document";
      break;
  }

  if (!entityExists) {
    throw new Error("Entity not found or you don't have permission to share it");
  }

  // Check if already shared
  const existingShare = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      sharedWithId: input.sharedWithId,
    },
  });

  if (existingShare) {
    throw new Error("This item is already shared with this user");
  }

  const shared = await prismadb.sharedEntity.create({
    data: {
      id: crypto.randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      sharedById: currentUser.id,
      sharedWithId: input.sharedWithId,
      permissions: input.permissions || "VIEW_COMMENT",
      message: input.message,
    },
  });

  // Send notification to the user receiving the share
  await notifyEntityShared({
    entityType: input.entityType,
    entityId: input.entityId,
    entityName,
    sharedById: currentUser.id,
    sharedByName: currentUser.name || currentUser.email || "Someone",
    sharedWithId: input.sharedWithId,
    organizationId,
    message: input.message,
  });

  // Revalidate all relevant paths so the recipient sees the shared item
  revalidatePath("/shared-with-me");
  revalidatePath("/mls/properties");
  revalidatePath("/crm/clients");
  
  return shared;
}

/**
 * Revoke a share
 */
export async function revokeShare(shareId: string) {
  const currentUser = await getCurrentUser();

  const share = await prismadb.sharedEntity.findUnique({
    where: { id: shareId },
  });

  if (!share) {
    throw new Error("Share not found");
  }

  // Only the sharer can revoke
  if (share.sharedById !== currentUser.id) {
    throw new Error("You don't have permission to revoke this share");
  }

  await prismadb.sharedEntity.delete({
    where: { id: shareId },
  });

  revalidatePath("/shared-with-me");
  return { success: true };
}

/**
 * Get items shared with me
 */
export async function getSharedWithMe(entityType?: SharedEntityType) {
  const currentUser = await getCurrentUser();

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedWithId: currentUser.id,
      ...(entityType ? { entityType } : {}),
    },
    include: {
      Users_SharedEntity_sharedByIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch the actual entities
  const enrichedShares = await Promise.all(
    shares.map(async (share) => {
      let entity = null;
      switch (share.entityType) {
        case "PROPERTY":
          entity = await prismadb.properties.findUnique({
            where: { id: share.entityId },
            select: {
              id: true,
              property_name: true,
              property_type: true,
              price: true,
              address_city: true,
              address_state: true,
              Documents: {
                where: {
                  document_file_mimeType: {
                    startsWith: "image/",
                  },
                },
                select: { document_file_url: true },
                take: 1,
              },
            },
          });
          // Map to expected field name
          if (entity) {
            entity = { ...entity, linkedDocuments: entity.Documents };
          }
          break;
        case "CLIENT":
          entity = await prismadb.clients.findUnique({
            where: { id: share.entityId },
            select: {
              id: true,
              client_name: true,
              primary_email: true,
              primary_phone: true,
              client_status: true,
              intent: true,
            },
          });
          break;
        case "DOCUMENT":
          entity = await prismadb.documents.findUnique({
            where: { id: share.entityId },
            select: {
              id: true,
              document_name: true,
              document_file_mimeType: true,
              document_file_url: true,
              description: true,
            },
          });
          break;
      }

      return {
        ...share,
        sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
        entity,
      };
    })
  );

  return enrichedShares.filter((s) => s.entity !== null);
}

/**
 * Get items I've shared
 */
export async function getMyShares(entityType?: SharedEntityType) {
  const currentUser = await getCurrentUser();

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedById: currentUser.id,
      ...(entityType ? { entityType } : {}),
    },
    include: {
      Users_SharedEntity_sharedWithIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to expected field name
  return shares.map((share) => ({
    ...share,
    sharedWith: share.Users_SharedEntity_sharedWithIdToUsers,
  }));
}

/**
 * Get share status for an entity
 */
export async function getEntityShares(entityType: SharedEntityType, entityId: string) {
  const currentUser = await getCurrentUser();

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      entityType,
      entityId,
      sharedById: currentUser.id,
    },
    include: {
      Users_SharedEntity_sharedWithIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  // Map to expected field name
  return shares.map((share) => ({
    ...share,
    sharedWith: share.Users_SharedEntity_sharedWithIdToUsers,
  }));
}

/**
 * Check if user can access a shared entity
 */
export async function canAccessSharedEntity(
  entityType: SharedEntityType,
  entityId: string
) {
  const currentUser = await getCurrentUser();

  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType,
      entityId,
      sharedWithId: currentUser.id,
    },
  });

  return share ? { canAccess: true, permissions: share.permissions } : { canAccess: false };
}

/**
 * Get connections for sharing
 */
export async function getConnectionsForSharing() {
  const currentUser = await getCurrentUser();

  const connections = await prismadb.agentConnection.findMany({
    where: {
      OR: [{ followerId: currentUser.id }, { followingId: currentUser.id }],
      status: "ACCEPTED",
    },
    include: {
      Users_AgentConnection_followerIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      Users_AgentConnection_followingIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  return connections.map((conn) =>
    conn.followerId === currentUser.id
      ? conn.Users_AgentConnection_followingIdToUsers
      : conn.Users_AgentConnection_followerIdToUsers
  );
}


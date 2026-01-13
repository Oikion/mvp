"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";

/**
 * Get a property that has been shared with the current user
 * This allows cross-organization access for sharees
 */
export async function getSharedProperty(propertyId: string) {
  const currentUser = await getCurrentUserSafe();
  
  // Return null if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return null;
  }

  // Check if the property is shared with the current user
  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "PROPERTY",
      entityId: propertyId,
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

  // Fetch the property (without organization restriction)
  const property = await prismadb.properties.findUnique({
    where: { id: propertyId },
    include: {
      Users_Properties_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
              publicPhone: true,
              publicEmail: true,
            },
          },
        },
      },
      Property_Contacts: true,
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          id: true,
          document_file_url: true,
          document_name: true,
        },
        orderBy: { date_created: "desc" },
      },
    },
  });

  if (!property) {
    return null;
  }

  // Serialize to plain objects - converts Decimal to number, Date to string
  // Map to expected field names for backward compatibility
  return JSON.parse(JSON.stringify({
    ...property,
    assigned_to_user: property.Users_Properties_assigned_toToUsers ? {
      ...property.Users_Properties_assigned_toToUsers,
      agentProfile: property.Users_Properties_assigned_toToUsers.AgentProfile,
    } : null,
    contacts: property.Property_Contacts,
    linkedDocuments: property.Documents,
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    },
  }));
}

/**
 * Check if the current user has share access to a property
 */
export async function hasPropertyShareAccess(propertyId: string): Promise<boolean> {
  const currentUser = await getCurrentUserSafe();
  
  // Return false if no user context
  if (!currentUser) {
    return false;
  }

  const share = await prismadb.sharedEntity.findFirst({
    where: {
      entityType: "PROPERTY",
      entityId: propertyId,
      sharedWithId: currentUser.id,
    },
    select: { id: true },
  });

  return !!share;
}















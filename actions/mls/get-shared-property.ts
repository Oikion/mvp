"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * Get a property that has been shared with the current user
 * This allows cross-organization access for sharees
 */
export async function getSharedProperty(propertyId: string) {
  const currentUser = await getCurrentUser();

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

  // Fetch the property (without organization restriction)
  const property = await prismadb.properties.findUnique({
    where: { id: propertyId },
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          agentProfile: {
            select: {
              slug: true,
              publicPhone: true,
              publicEmail: true,
            },
          },
        },
      },
      contacts: true,
      linkedDocuments: {
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
  return JSON.parse(JSON.stringify({
    ...property,
    _shareInfo: {
      permissions: share.permissions,
      message: share.message,
      sharedAt: share.createdAt,
      sharedBy: share.sharedBy,
    },
  }));
}

/**
 * Check if the current user has share access to a property
 */
export async function hasPropertyShareAccess(propertyId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();

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









"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";

export interface SharedPropertyData {
  id: string;
  friendlyId: string;
  shareId: string;
  property_name: string | null;
  property_type: string | null;
  property_status: string | null;
  price: number | null;
  address_city: string | null;
  address_state: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  createdAt: Date;
  sharedAt: Date;
  permissions: string;
  message: string | null;
  linkedDocuments: { document_file_url: string }[];
  primaryImage?: { url: string } | null;
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

type EnrichedShare = SharedPropertyData | null;

export const getSharedProperties = async (): Promise<SharedPropertyData[]> => {
  const currentUser = await getCurrentUserSafe();
  
  // Return empty array if no user context (e.g., session not synced yet)
  if (!currentUser) {
    return [];
  }

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedWithId: currentUser.id,
      entityType: "PROPERTY",
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

  // Batch-fetch all property entities in a single query (fixes N+1)
  const entityIds = shares.map((s) => s.entityId);
  const properties = await prismadb.properties.findMany({
    where: { id: { in: entityIds } },
    select: {
      id: true,
      friendlyId: true,
      property_name: true,
      property_type: true,
      property_status: true,
      price: true,
      address_city: true,
      address_state: true,
      bedrooms: true,
      bathrooms: true,
      square_feet: true,
      createdAt: true,
      Documents: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: { document_file_url: true },
        take: 1,
      },
      PropertyImage: {
        where: { isPrimary: true },
        select: { url: true },
        take: 1,
      },
    },
  });

  // Build a Map for O(1) lookups when joining
  const propertyMap = new Map(properties.map((p) => [p.id, p]));

  // Join shares with properties in application code
  const enrichedShares: SharedPropertyData[] = [];
  for (const share of shares) {
    const property = propertyMap.get(share.entityId);
    if (!property) continue;

    enrichedShares.push({
      id: property.id,
      friendlyId: property.friendlyId,
      shareId: share.id,
      property_name: property.property_name,
      property_type: property.property_type as string | null,
      property_status: property.property_status as string | null,
      price: property.price ? Number(property.price) : null,
      address_city: property.address_city,
      address_state: property.address_state,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      square_feet: property.square_feet,
      createdAt: property.createdAt,
      sharedAt: share.createdAt,
      permissions: share.permissions,
      message: share.message,
      linkedDocuments: property.Documents,
      primaryImage: (property as Record<string, unknown>).PropertyImage ? ((property as Record<string, unknown>).PropertyImage as Array<{ url: string }>)?.[0] ?? null : null,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
    } as SharedPropertyData);
  }

  return enrichedShares;
};


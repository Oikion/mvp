"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export interface SharedPropertyData {
  id: string;
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
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

type EnrichedShare = SharedPropertyData | null;

export const getSharedProperties = async (): Promise<SharedPropertyData[]> => {
  const currentUser = await getCurrentUser();

  const shares = await prismadb.sharedEntity.findMany({
    where: {
      sharedWithId: currentUser.id,
      entityType: "PROPERTY",
    },
    include: {
      sharedBy: {
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

  // Fetch the actual property entities
  const enrichedShares = await Promise.all(
    shares.map(async (share) => {
      const property = await prismadb.properties.findUnique({
        where: { id: share.entityId },
        select: {
          id: true,
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
          linkedDocuments: {
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

      if (!property) return null;

      return {
        id: property.id,
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
        linkedDocuments: property.linkedDocuments,
        sharedBy: share.sharedBy,
      } as SharedPropertyData;
    })
  );

  return enrichedShares.filter((s): s is SharedPropertyData => s !== null);
};


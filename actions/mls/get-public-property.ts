"use server";

import { prismadb } from "@/lib/prisma";

/**
 * Get a property that is publicly visible (portal_visibility = PUBLIC)
 * This does not require authentication
 */
export async function getPublicProperty(propertyId: string) {
  const property = await prismadb.properties.findFirst({
    where: {
      id: propertyId,
      portal_visibility: "PUBLIC",
      property_status: "ACTIVE",
    },
    include: {
      Users_Properties_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
              publicPhone: true,
              publicEmail: true,
              visibility: true,
            },
          },
        },
      },
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

  if (!property) return null;
  
  // Map to expected field names for backward compatibility
  const mappedProperty = {
    ...property,
    assigned_to_user: property.Users_Properties_assigned_toToUsers ? {
      ...property.Users_Properties_assigned_toToUsers,
      agentProfile: property.Users_Properties_assigned_toToUsers.AgentProfile,
    } : null,
    linkedDocuments: property.Documents,
  };
  
  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedProperty));
}

/**
 * Get all public properties with optional filters
 */
export async function getPublicProperties(options?: {
  limit?: number;
  offset?: number;
  transactionType?: "SALE" | "RENTAL" | "SHORT_TERM";
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
}) {
  const {
    limit = 20,
    offset = 0,
    transactionType,
    propertyType,
    minPrice,
    maxPrice,
    city,
  } = options || {};

  const where: any = {
    portal_visibility: "PUBLIC",
    property_status: "ACTIVE",
  };

  if (transactionType) {
    where.transaction_type = transactionType;
  }

  if (propertyType) {
    where.property_type = propertyType;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = minPrice;
    if (maxPrice) where.price.lte = maxPrice;
  }

  if (city) {
    where.address_city = {
      contains: city,
      mode: "insensitive",
    };
  }

  const [propertiesRaw, total] = await Promise.all([
    prismadb.properties.findMany({
      where,
      include: {
        Users_Properties_assigned_toToUsers: {
          select: {
            id: true,
            name: true,
            avatar: true,
            AgentProfile: {
              select: {
                slug: true,
                visibility: true,
              },
            },
          },
        },
        Documents: {
          where: {
            document_file_mimeType: {
              startsWith: "image/",
            },
          },
          select: {
            document_file_url: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prismadb.properties.count({ where }),
  ]);

  // Map to expected field names for backward compatibility
  const properties = propertiesRaw.map((p) => ({
    ...p,
    assigned_to_user: p.Users_Properties_assigned_toToUsers ? {
      ...p.Users_Properties_assigned_toToUsers,
      agentProfile: p.Users_Properties_assigned_toToUsers.AgentProfile,
    } : null,
    linkedDocuments: p.Documents,
  }));

  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify({
    properties,
    total,
    hasMore: offset + properties.length < total,
  }));
}


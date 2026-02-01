"use server";

import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";

/**
 * Get organization by slug from Clerk
 * Returns the organization ID if found
 */
async function getOrganizationBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    // Clerk doesn't have a direct "get by slug" API, so we search
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const organizationsList = await clerk.organizations.getOrganizationList({
        limit,
        offset,
      });

      const org = organizationsList.data?.find(
        (org) => org.slug?.toLowerCase() === slug.toLowerCase()
      );

      if (org) {
        return {
          id: org.id,
          name: org.name,
          slug: org.slug || slug,
        };
      }

      hasMore = (organizationsList.data?.length ?? 0) === limit;
      offset += limit;

      // Limit search to first 500 organizations
      if (offset >= 500) {
        break;
      }
    }

    return null;
  } catch (error) {
    console.error("[GET_ORG_BY_SLUG]", error);
    return null;
  }
}

/**
 * Get a property that is publicly visible for a specific organization
 * This verifies both the organization slug and that the property belongs to it
 */
export async function getPublicPropertyByOrg(orgSlug: string, propertyId: string) {
  // First, resolve the organization by slug
  const organization = await getOrganizationBySlug(orgSlug);
  
  if (!organization) {
    return null;
  }

  const property = await prismadb.properties.findFirst({
    where: {
      id: propertyId,
      organizationId: organization.id,
      portal_visibility: "PUBLIC",
      property_status: "ACTIVE",
    },
    include: {
      Users_Properties_assigned_toToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
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
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    assigned_to_user: property.Users_Properties_assigned_toToUsers
      ? {
          ...property.Users_Properties_assigned_toToUsers,
          agentProfile: property.Users_Properties_assigned_toToUsers.AgentProfile,
        }
      : null,
    linkedDocuments: property.Documents,
  };

  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedProperty));
}

/**
 * Get all public properties for a specific organization
 * Used for generating static params and property listing pages
 */
export async function getPublicPropertiesByOrg(orgSlug: string, options?: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 100, offset = 0 } = options || {};

  // First, resolve the organization by slug
  const organization = await getOrganizationBySlug(orgSlug);
  
  if (!organization) {
    return { properties: [], total: 0, hasMore: false };
  }

  const where = {
    organizationId: organization.id,
    portal_visibility: "PUBLIC" as const,
    property_status: "ACTIVE" as const,
  };

  const [propertiesRaw, total] = await Promise.all([
    prismadb.properties.findMany({
      where,
      select: {
        id: true,
        property_name: true,
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prismadb.properties.count({ where }),
  ]);

  return {
    properties: propertiesRaw,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    total,
    hasMore: offset + propertiesRaw.length < total,
  };
}

/**
 * Get all organizations with public properties
 * Used for generating static params
 */
export async function getOrganizationsWithPublicProperties() {
  try {
    // Get unique organization IDs that have public properties
    const orgsWithProperties = await prismadb.properties.groupBy({
      by: ["organizationId"],
      where: {
        portal_visibility: "PUBLIC",
        property_status: "ACTIVE",
        organizationId: {
          not: "00000000-0000-0000-0000-000000000000",
        },
      },
    });

    if (orgsWithProperties.length === 0) {
      return [];
    }

    // Get organization details from Clerk
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const organizations: { id: string; slug: string; name: string }[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const organizationsList = await clerk.organizations.getOrganizationList({
        limit,
        offset,
      });

      for (const org of organizationsList.data || []) {
        if (
          org.slug &&
          orgsWithProperties.some((o) => o.organizationId === org.id)
        ) {
          organizations.push({
            id: org.id,
            slug: org.slug,
            name: org.name,
          });
        }
      }

      hasMore = (organizationsList.data?.length ?? 0) === limit;
      offset += limit;

      if (offset >= 500) {
        break;
      }
    }

    return organizations;
  } catch (error) {
    console.error("[GET_ORGS_WITH_PUBLIC_PROPERTIES]", error);
    return [];
  }
}

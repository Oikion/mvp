"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string | null;
  memberCount: number;
  createdAt: Date;
  imageUrl: string | null;
}

export interface GetOrganizationsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetOrganizationsResult {
  organizations: PlatformOrganization[];
  totalCount: number;
  page: number;
  totalPages: number;
}

/**
 * Get all platform organizations
 * Only shows non-sensitive organizational data (name, slug, member count)
 * Does NOT show internal organization data or member details
 */
export async function getPlatformOrganizations(
  options: GetOrganizationsOptions = {}
): Promise<GetOrganizationsResult> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    limit = 20,
    search = "",
  } = options;

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_ORGANIZATIONS", undefined, { page, search });

    const clerk = await clerkClient();
    
    // Get organizations from Clerk
    // Note: Clerk's API doesn't support text search, so we fetch all and filter client-side
    // For large scale, this should be paginated through Clerk's offset/limit
    const offset = (page - 1) * limit;
    
    const orgsResponse = await clerk.organizations.getOrganizationList({
      limit,
      offset,
      // Clerk doesn't support search, we'll filter after
    });

    // If searching, we need to filter
    let filteredOrgs = orgsResponse.data;
    let totalCount = orgsResponse.totalCount;

    if (search) {
      // For search, we need to fetch more and filter
      // This is not ideal for large datasets but Clerk doesn't support server-side search
      const allOrgsResponse = await clerk.organizations.getOrganizationList({
        limit: 500, // Max reasonable limit
      });
      
      filteredOrgs = allOrgsResponse.data.filter(
        (org) =>
          org.name.toLowerCase().includes(search.toLowerCase()) ||
          (org.slug && org.slug.toLowerCase().includes(search.toLowerCase()))
      );
      
      totalCount = filteredOrgs.length;
      // Apply pagination to filtered results
      filteredOrgs = filteredOrgs.slice(offset, offset + limit);
    }

    // Get member counts for each organization
    const organizations: PlatformOrganization[] = await Promise.all(
      filteredOrgs.map(async (org) => {
        let memberCount = 0;
        try {
          const members = await clerk.organizations.getOrganizationMembershipList({
            organizationId: org.id,
            limit: 1, // We just need the count
          });
          memberCount = members.totalCount;
        } catch {
          memberCount = 0;
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          memberCount,
          createdAt: new Date(org.createdAt),
          imageUrl: org.imageUrl,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      organizations,
      totalCount,
      page,
      totalPages,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_ORGANIZATIONS]", error);
    throw new Error("Failed to fetch organizations");
  }
}



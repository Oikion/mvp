"use server";

import { createClerkClient } from "@clerk/backend";

export interface SlugAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Check if an organization slug is available
 * Clerk enforces uniqueness, so we check via Clerk API
 */
export async function checkOrgSlugAvailability(
  slug: string
): Promise<SlugAvailabilityResult> {
  try {
    if (!slug || slug.trim().length < 2) {
      return {
        available: false,
        error: "Slug must be at least 2 characters",
      };
    }

    if (slug.length > 50) {
      return {
        available: false,
        error: "Slug must be at most 50 characters",
      };
    }

    // Validate format: lowercase letters, numbers, and hyphens only
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        available: false,
        error: "Slug can only contain lowercase letters, numbers, and hyphens",
      };
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    // Check if slug exists by trying to list organizations
    // Note: Clerk doesn't have a direct "get by slug" API, so we search
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      try {
        const organizationsList = await clerk.organizations.getOrganizationList({
          limit,
          offset,
        });

        // Check if any organization has this slug
        const slugExists = organizationsList.data?.some(
          (org) => org.slug === slug
        );

        if (slugExists) {
          return {
            available: false,
          };
        }

        hasMore = organizationsList.data && organizationsList.data.length === limit;
        offset += limit;

        // Limit search to first 500 organizations to avoid excessive API calls
        if (offset >= 500) {
          break;
        }
      } catch {
        // If we can't check, return unavailable for safety (Clerk will validate on creation)
        return {
          available: false,
          error: "Unable to verify availability",
        };
      }
    }

    return {
      available: true,
    };
  } catch {
    return {
      available: false,
      error: "Failed to check slug availability",
    };
  }
}

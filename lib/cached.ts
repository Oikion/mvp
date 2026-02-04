import "server-only";
import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * Cached Server Functions
 * 
 * This module provides React cache()-wrapped versions of frequently called
 * server functions. React's cache() deduplicates calls within a single
 * request/render cycle, meaning if the same function is called multiple
 * times during a single page render (e.g., in layout AND page), it only
 * executes once.
 * 
 * This is critical for performance as our layout calls several async functions
 * that are also needed by individual pages.
 */

// ============================================
// AUTH - Cached Clerk authentication
// ============================================

/**
 * Get Clerk auth data with request-level caching
 * Deduplicates auth() calls across layout/page/components in same request
 */
export const getAuth = cache(async () => {
  return auth();
});

// ============================================
// USER - Cached user data from database
// ============================================

/**
 * Get current user from database with request-level caching
 * Throws if user is not authenticated or not found
 */
export const getCachedUser = cache(async () => {
  const { userId: clerkUserId } = await getAuth();

  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  const user = await prismadb.users.findFirst({
    where: {
      clerkUserId: clerkUserId,
    },
  });

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
});

/**
 * Get current user safely (returns null instead of throwing)
 * with request-level caching
 */
export const getCachedUserSafe = cache(async () => {
  try {
    return await getCachedUser();
  } catch {
    return null;
  }
});

/**
 * Get current organization ID with request-level caching
 */
export const getCachedOrgId = cache(async () => {
  const { orgId } = await getAuth();
  return orgId;
});

// ============================================
// MODULES - Cached system modules
// ============================================

/**
 * Get enabled modules with request-level caching
 */
export const getCachedModules = cache(async () => {
  const { userId } = await getAuth();
  if (!userId) return [];

  const data = await prismadb.system_Modules_Enabled.findMany({
    orderBy: [{ position: "asc" }],
  });
  return data;
});

// ============================================
// PLATFORM ADMIN - Cached admin status check
// ============================================

/**
 * Check if current user is a platform admin with request-level caching
 * This is an expensive operation (Clerk API call) so caching is important
 */
export const getCachedIsPlatformAdmin = cache(async (): Promise<boolean> => {
  try {
    const { userId } = await getAuth();

    if (!userId) {
      return false;
    }

    // Check env-based admin emails
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();

    if (userEmail) {
      // Production admin emails (always checked)
      const prodAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;
      if (prodAdminEmails) {
        const adminEmailList = prodAdminEmails
          .replaceAll('"', "")
          .split(",")
          .map(e => e.toLowerCase().trim());
        
        if (adminEmailList.includes(userEmail)) {
          return true;
        }
      }

      // Development bypass (disabled in production)
      if (process.env.NODE_ENV !== "production") {
        const devAdminEmails = process.env.PLATFORM_ADMIN_DEV_EMAILS;
        if (devAdminEmails) {
          const devEmailList = devAdminEmails
            .replaceAll('"', "")
            .split(",")
            .map(e => e.toLowerCase().trim());
          
          if (devEmailList.includes(userEmail)) {
            return true;
          }
        }
      }
    }

    // Check Clerk privateMetadata for isPlatformAdmin flag
    return user.privateMetadata?.isPlatformAdmin === true;
  } catch (error) {
    console.error("[CACHED_PLATFORM_ADMIN_CHECK]", error);
    return false;
  }
});

// ============================================
// DICTIONARY - Cached translations
// ============================================

// Import the dictionary loading function
// We import dynamically to avoid circular dependencies
import { getDictionary as loadDictionary } from "@/dictionaries";

/**
 * Get dictionary/translations with request-level caching
 * Since dictionaries are loaded from static imports, this mainly
 * prevents redundant object creation during a request
 */
export const getCachedDictionary = cache(async (locale: string = "en") => {
  return loadDictionary(locale);
});




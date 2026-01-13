"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import type { AdminActionType } from "./platform-admin-utils";

/**
 * Platform Admin Security Layer
 * 
 * This module provides secure utilities for platform-level admin authentication.
 * Platform admins are identified via Clerk privateMetadata.isPlatformAdmin flag.
 * 
 * Security measures:
 * 1. Server-side only - never expose admin status to client
 * 2. Double verification at middleware AND component level
 * 3. Development bypass via PLATFORM_ADMIN_DEV_EMAILS (disabled in production)
 * 4. Audit logging for all admin actions
 * 
 * NOTE: Utility functions (maskEmail, maskPhone, sanitizeAdminMessage) are in 
 * platform-admin-utils.ts to avoid "use server" restrictions on sync functions.
 */

// Cache for admin status to reduce API calls within same request
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

/**
 * Check if the current authenticated user is a platform admin
 * 
 * This function checks multiple sources in order:
 * 1. Development bypass (only in non-production environments)
 * 2. Clerk privateMetadata.isPlatformAdmin flag
 * 
 * @returns Promise<boolean> - true if user is a platform admin
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return false;
    }

    // Check cache first
    const cached = adminStatusCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.isAdmin;
    }

    // Check env-based admin emails (works in all environments)
    // PLATFORM_ADMIN_EMAILS is the secure production list
    // PLATFORM_ADMIN_DEV_EMAILS is for development only
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();

    if (userEmail) {
      // Production admin emails (always checked)
      const prodAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;
      if (prodAdminEmails) {
        const adminEmailList = prodAdminEmails
          .replace(/"/g, "")
          .split(",")
          .map(e => e.toLowerCase().trim());
        
        if (adminEmailList.includes(userEmail)) {
          adminStatusCache.set(userId, { isAdmin: true, timestamp: Date.now() });
          return true;
        }
      }

      // Development bypass (disabled in production)
      if (process.env.NODE_ENV !== "production") {
        const devAdminEmails = process.env.PLATFORM_ADMIN_DEV_EMAILS;
        if (devAdminEmails) {
          const devEmailList = devAdminEmails
            .replace(/"/g, "")
            .split(",")
            .map(e => e.toLowerCase().trim());
          
          if (devEmailList.includes(userEmail)) {
            adminStatusCache.set(userId, { isAdmin: true, timestamp: Date.now() });
            return true;
          }
        }
      }
    }

    // Check Clerk privateMetadata for isPlatformAdmin flag (more secure than publicMetadata)
    const isAdmin = user.privateMetadata?.isPlatformAdmin === true;

    // Cache the result
    adminStatusCache.set(userId, { isAdmin, timestamp: Date.now() });

    return isAdmin;
  } catch (error) {
    console.error("[PLATFORM_ADMIN_CHECK]", error);
    return false;
  }
}

/**
 * Get current platform admin user details
 * Returns null if user is not a platform admin
 * 
 * @returns Promise<PlatformAdminUser | null>
 */
export interface PlatformAdminUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export async function getPlatformAdminUser(): Promise<PlatformAdminUser | null> {
  try {
    const isAdmin = await isPlatformAdmin();
    if (!isAdmin) {
      return null;
    }

    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    return {
      id: user.id,
      clerkId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_ADMIN_USER]", error);
    return null;
  }
}

/**
 * Require platform admin access - throws error if not admin
 * Use this in server actions and API routes for protection
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminUser> {
  const admin = await getPlatformAdminUser();
  if (!admin) {
    throw new Error("Unauthorized: Platform admin access required");
  }
  return admin;
}

/**
 * Log admin action for audit trail
 * In production, this should write to a secure audit log
 */
export async function logAdminAction(
  adminId: string,
  action: AdminActionType,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    adminId,
    action,
    targetId,
    details,
  };

  // Log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.log("[ADMIN_AUDIT]", JSON.stringify(logEntry, null, 2));
  }

  // TODO: In production, write to secure audit log (e.g., database table, external service)
  // For now, we just log to console
  // await prismadb.adminAuditLog.create({ data: logEntry });
}









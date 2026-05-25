"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import type { AdminActionType } from "./platform-admin-utils";
import { prismadb } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { logAdminAccessDenied } from "@/actions/platform-admin/log-security-audit";

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

// L1: In-process cache for within-request deduplication (2 seconds)
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const L1_CACHE_TTL = 2000; // 2 seconds (within-request dedup)

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

    // L1: In-process cache (survives within a single isolate lifetime)
    const l1Cached = adminStatusCache.get(userId);
    if (l1Cached && Date.now() - l1Cached.timestamp < L1_CACHE_TTL) {
      return l1Cached.isAdmin;
    }

    // L2: Redis cache (survives cold starts, shared across isolates)
    const redisCached = await cacheGet<boolean>(`oik:admin:${userId}`);
    if (redisCached !== null) {
      adminStatusCache.set(userId, { isAdmin: redisCached, timestamp: Date.now() });
      return redisCached;
    }

    // Cache miss — check env-based admin emails (works in all environments)
    // PLATFORM_ADMIN_EMAILS is the secure production list
    // PLATFORM_ADMIN_DEV_EMAILS is for development only
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();

    let isAdmin = false;

    if (userEmail) {
      // Production admin emails (always checked)
      const prodAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;
      if (prodAdminEmails) {
        const adminEmailList = prodAdminEmails
          .replace(/"/g, "")
          .split(",")
          .map(e => e.toLowerCase().trim());

        if (adminEmailList.includes(userEmail)) {
          isAdmin = true;
        }
      }

      // Development bypass (disabled in production)
      if (!isAdmin && process.env.NODE_ENV !== "production") {
        const devAdminEmails = process.env.PLATFORM_ADMIN_DEV_EMAILS;
        if (devAdminEmails) {
          const devEmailList = devAdminEmails
            .replace(/"/g, "")
            .split(",")
            .map(e => e.toLowerCase().trim());

          if (devEmailList.includes(userEmail)) {
            isAdmin = true;
          }
        }
      }
    }

    // Check Clerk privateMetadata for isPlatformAdmin flag (more secure than publicMetadata)
    if (!isAdmin) {
      isAdmin = user.privateMetadata?.isPlatformAdmin === true;
    }

    // Cache in both L1 (in-process) and L2 (Redis, 60s TTL)
    adminStatusCache.set(userId, { isAdmin, timestamp: Date.now() });
    await cacheSet(`oik:admin:${userId}`, isAdmin, 60);

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
    logAdminAccessDenied({ path: "requirePlatformAdmin", denialReason: "not_platform_admin" }).catch(() => {});
    throw new Error("Unauthorized: Platform admin access required");
  }
  return admin;
}

/**
 * Clear cached admin status for a user (both L1 in-process and L2 Redis)
 * Call after admin role changes to force re-verification on next request
 */
export async function clearAdminCache(userId: string): Promise<void> {
  adminStatusCache.delete(userId);
  await cacheSet(`oik:admin:${userId}`, false, 1).catch(() => {});
}

const AUDIT_BLOCKED_KEYS = new Set([
  "email", "phone", "password", "token", "secret",
  "client_name", "primary_email", "primary_phone",
]);

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  return Object.fromEntries(
    Object.entries(details).filter(([k]) => !AUDIT_BLOCKED_KEYS.has(k.toLowerCase()))
  );
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

  // Write to database audit log
  try {
    await prismadb.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetId: targetId ?? undefined,
        details: (sanitizeDetails(details) as object) ?? undefined,
        timestamp: new Date(timestamp),
      },
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("[ADMIN_AUDIT_DB_ERROR]", err);
  }
}









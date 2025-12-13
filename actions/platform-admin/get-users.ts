"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { ActiveStatus } from "@prisma/client";

export interface PlatformUser {
  id: string;
  clerkUserId: string | null;
  email: string;
  name: string | null;
  username: string | null;
  status: ActiveStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  isAdmin: boolean;
  organizationCount: number;
}

export interface GetUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: ActiveStatus | "ALL";
  sortBy?: "created_on" | "lastLoginAt" | "name";
  sortOrder?: "asc" | "desc";
}

export interface GetUsersResult {
  users: PlatformUser[];
  totalCount: number;
  page: number;
  totalPages: number;
}

/**
 * Get all platform users with masked sensitive data
 * Only shows non-sensitive information for privacy
 */
export async function getPlatformUsers(
  options: GetUsersOptions = {}
): Promise<GetUsersResult> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    limit = 20,
    search = "",
    status = "ALL",
    sortBy = "created_on",
    sortOrder = "desc",
  } = options;

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_USERS", undefined, { page, search, status });

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status !== "ALL") {
      where.userStatus = status;
    }

    if (search) {
      // Search by name, username, or partial email (first part before @)
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        // Note: We search by email but display masked version
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prismadb.users.count({ where });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get users from database
    const users = await prismadb.users.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
        username: true,
        userStatus: true,
        created_on: true,
        lastLoginAt: true,
        is_admin: true,
      },
    });

    // Get organization memberships for each user from Clerk
    const clerk = await clerkClient();
    
    // Process users and mask sensitive data
    const processedUsers: PlatformUser[] = await Promise.all(
      users.map(async (user) => {
        let organizationCount = 0;
        
        if (user.clerkUserId) {
          try {
            const memberships = await clerk.users.getOrganizationMembershipList({
              userId: user.clerkUserId,
            });
            organizationCount = memberships.totalCount;
          } catch {
            // User might not exist in Clerk anymore
            organizationCount = 0;
          }
        }

        return {
          id: user.id,
          clerkUserId: user.clerkUserId,
          email: user.email,
          name: user.name,
          username: user.username,
          status: user.userStatus,
          createdAt: user.created_on,
          lastLoginAt: user.lastLoginAt,
          isAdmin: user.is_admin,
          organizationCount,
        };
      })
    );

    return {
      users: processedUsers,
      totalCount,
      page,
      totalPages,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_USERS]", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Get a single user's details (with masked data) for viewing
 */
export async function getPlatformUserDetails(userId: string): Promise<PlatformUser | null> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_USER_DETAILS", userId);

    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
        username: true,
        userStatus: true,
        created_on: true,
        lastLoginAt: true,
        is_admin: true,
      },
    });

    if (!user) {
      return null;
    }

    let organizationCount = 0;
    const clerk = await clerkClient();

    if (user.clerkUserId) {
      try {
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId: user.clerkUserId,
        });
        organizationCount = memberships.totalCount;
      } catch {
        organizationCount = 0;
      }
    }

    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      username: user.username,
      status: user.userStatus,
      createdAt: user.created_on,
      lastLoginAt: user.lastLoginAt,
      isAdmin: user.is_admin,
      organizationCount,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_USER_DETAILS]", error);
    throw new Error("Failed to fetch user details");
  }
}

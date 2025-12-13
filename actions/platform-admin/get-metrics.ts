"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface PlatformMetrics {
  totalOrganizations: number;
  totalUsers: number;
  activeUsersLast30Days: number;
  newUsersThisMonth: number;
  pendingUsers: number;
  inactiveUsers: number;
}

/**
 * Get platform-wide metrics for the admin dashboard
 * Requires platform admin access
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  // Verify admin access
  const admin = await requirePlatformAdmin();
  
  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_METRICS");

    // Get organization count from Clerk
    const clerk = await clerkClient();
    const orgsResponse = await clerk.organizations.getOrganizationList({
      limit: 1, // We just need the count
    });
    const totalOrganizations = orgsResponse.totalCount;

    // Get current date info for time-based queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user counts from database
    const [
      totalUsers,
      activeUsersLast30Days,
      newUsersThisMonth,
      pendingUsers,
      inactiveUsers,
    ] = await Promise.all([
      // Total users
      prismadb.users.count(),
      
      // Active users (logged in within last 30 days)
      prismadb.users.count({
        where: {
          lastLoginAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // New users this month
      prismadb.users.count({
        where: {
          created_on: {
            gte: startOfMonth,
          },
        },
      }),
      
      // Pending users
      prismadb.users.count({
        where: {
          userStatus: "PENDING",
        },
      }),
      
      // Inactive users
      prismadb.users.count({
        where: {
          userStatus: "INACTIVE",
        },
      }),
    ]);

    return {
      totalOrganizations,
      totalUsers,
      activeUsersLast30Days,
      newUsersThisMonth,
      pendingUsers,
      inactiveUsers,
    };
  } catch (error) {
    console.error("[GET_PLATFORM_METRICS]", error);
    throw new Error("Failed to fetch platform metrics");
  }
}

export interface UserGrowthData {
  date: string;
  users: number;
}

/**
 * Get user growth data for the last 30 days
 */
export async function getUserGrowthData(): Promise<UserGrowthData[]> {
  // Verify admin access
  await requirePlatformAdmin();
  
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get users created in the last 30 days grouped by date
    const users = await prismadb.users.findMany({
      where: {
        created_on: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        created_on: true,
      },
      orderBy: {
        created_on: "asc",
      },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    
    // Initialize all dates in range
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dateMap.set(dateStr, 0);
    }
    
    // Count users per date
    users.forEach((user) => {
      const dateStr = user.created_on.toISOString().split("T")[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // Convert to array and sort
    return Array.from(dateMap.entries())
      .map(([date, users]) => ({ date, users }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("[GET_USER_GROWTH_DATA]", error);
    throw new Error("Failed to fetch user growth data");
  }
}

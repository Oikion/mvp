"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

export interface AdminAccessLogEntry {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string | null;
  country: string | null;
  city: string | null;
  sessionId: string;
  accessedAt: Date;
}

export interface GetAdminLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAdminLogsResult {
  logs: AdminAccessLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get admin access logs with pagination and optional filtering
 * Requires platform admin access
 */
export async function getAdminLogs(params: GetAdminLogsParams = {}): Promise<GetAdminLogsResult> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    pageSize = 20,
    search,
    startDate,
    endDate,
  } = params;

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_ADMIN_LOGS");

    // Build where clause
    const where: any = {};

    // Search filter - search by email or name
    if (search) {
      where.OR = [
        { adminEmail: { contains: search, mode: "insensitive" } },
        { adminName: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      where.accessedAt = {};
      if (startDate) {
        where.accessedAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.accessedAt.lt = end;
      }
    }

    // Get total count
    const total = await prismadb.adminAccessLog.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Fetch logs
    const logs = await prismadb.adminAccessLog.findMany({
      where,
      orderBy: { accessedAt: "desc" },
      skip,
      take: pageSize,
    });

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("[GET_ADMIN_LOGS_ERROR]", error);
    throw new Error("Failed to fetch admin logs");
  }
}

export interface AdminLogStats {
  totalSessions: number;
  uniqueAdmins: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
}

/**
 * Get admin access log statistics
 * Requires platform admin access
 */
export async function getAdminLogStats(): Promise<AdminLogStats> {
  // Verify admin access
  await requirePlatformAdmin();

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSessions,
      uniqueAdminsResult,
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
    ] = await Promise.all([
      // Total sessions
      prismadb.adminAccessLog.count(),

      // Unique admins
      prismadb.adminAccessLog.groupBy({
        by: ["adminUserId"],
        _count: { adminUserId: true },
      }),

      // Sessions today
      prismadb.adminAccessLog.count({
        where: { accessedAt: { gte: startOfDay } },
      }),

      // Sessions this week
      prismadb.adminAccessLog.count({
        where: { accessedAt: { gte: startOfWeek } },
      }),

      // Sessions this month
      prismadb.adminAccessLog.count({
        where: { accessedAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalSessions,
      uniqueAdmins: uniqueAdminsResult.length,
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
    };
  } catch (error) {
    console.error("[GET_ADMIN_LOG_STATS_ERROR]", error);
    throw new Error("Failed to fetch admin log statistics");
  }
}

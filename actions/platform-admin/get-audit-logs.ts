"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import type { AdminActionType } from "@/lib/platform-admin-utils";
import type { AdminAuditLog } from "@prisma/client";

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  adminId?: string;
  action?: AdminActionType;
  startDate?: string;
  endDate?: string;
}

export interface GetAuditLogsResult {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get admin audit logs with pagination and filtering
 * Requires platform admin access
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<GetAuditLogsResult> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    pageSize = 50,
    adminId,
    action,
    startDate,
    endDate,
  } = params;

  try {
    // Log the action
    await logAdminAction(admin.clerkId, "VIEW_ADMIN_LOGS");

    // Build where clause
    const where: any = {};

    // Filter by specific admin
    if (adminId) {
      where.adminId = adminId;
    }

    // Filter by action type
    if (action) {
      where.action = action;
    }

    // Date range filter
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.timestamp.lt = end;
      }
    }

    // Get total count
    const total = await prismadb.adminAuditLog.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Fetch logs
    const logs = await prismadb.adminAuditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
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
    console.error("[GET_AUDIT_LOGS_ERROR]", error);
    throw new Error("Failed to fetch audit logs");
  }
}

/**
 * Get audit log statistics
 * Requires platform admin access
 */
export async function getAuditLogStats(): Promise<{
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  logsThisMonth: number;
  topActions: Array<{ action: AdminActionType; count: number }>;
}> {
  // Verify admin access
  await requirePlatformAdmin();

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLogs,
      logsToday,
      logsThisWeek,
      logsThisMonth,
      topActionsResult,
    ] = await Promise.all([
      // Total logs
      prismadb.adminAuditLog.count(),

      // Logs today
      prismadb.adminAuditLog.count({
        where: { timestamp: { gte: startOfDay } },
      }),

      // Logs this week
      prismadb.adminAuditLog.count({
        where: { timestamp: { gte: startOfWeek } },
      }),

      // Logs this month
      prismadb.adminAuditLog.count({
        where: { timestamp: { gte: startOfMonth } },
      }),

      // Top 5 actions
      prismadb.adminAuditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 5,
      }),
    ]);

    const topActions = topActionsResult.map((item) => ({
      action: item.action,
      count: item._count.action,
    }));

    return {
      totalLogs,
      logsToday,
      logsThisWeek,
      logsThisMonth,
      topActions,
    };
  } catch (error) {
    console.error("[GET_AUDIT_LOG_STATS_ERROR]", error);
    throw new Error("Failed to fetch audit log statistics");
  }
}

/**
 * Clean up old audit logs (retention policy)
 * Deletes logs older than the specified retention days
 * Requires platform admin access
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<{ deleted: number }> {
  // Verify admin access
  const admin = await requirePlatformAdmin();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prismadb.adminAuditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Log this cleanup action
    await logAdminAction(
      admin.clerkId,
      "VIEW_ADMIN_LOGS",
      undefined,
      {
        action: "cleanup_old_logs",
        retentionDays,
        deletedCount: result.count,
      }
    );

    return { deleted: result.count };
  } catch (error) {
    console.error("[CLEANUP_AUDIT_LOGS_ERROR]", error);
    throw new Error("Failed to cleanup old audit logs");
  }
}

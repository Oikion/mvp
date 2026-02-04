"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import type { XeSyncStatus, XeSyncItemStatus, XeSyncPolicy, XeSyncRequestType } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface SyncHistoryItem {
  id: string;
  packageId: string;
  policy: XeSyncPolicy;
  requestType: XeSyncRequestType;
  totalItems: number;
  successCount: number;
  failureCount: number;
  status: XeSyncStatus;
  errorMessage: string | null;
  submittedAt: Date;
  processedAt: Date | null;
}

export interface SyncHistoryDetail extends SyncHistoryItem {
  items: Array<{
    id: string;
    propertyId: string;
    propertyName: string;
    refId: string;
    status: XeSyncItemStatus;
    errorMessage: string | null;
  }>;
}

export interface GetHistoryOptions {
  limit?: number;
  offset?: number;
  status?: XeSyncStatus;
}

// ============================================
// GET SYNC HISTORY
// ============================================

/**
 * Get XE sync history for the current organization
 */
export async function getXeSyncHistory(
  options: GetHistoryOptions = {}
): Promise<{
  success: boolean;
  data?: {
    items: SyncHistoryItem[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { limit = 20, offset = 0, status } = options;

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return {
        success: true,
        data: { items: [], total: 0, hasMore: false },
      };
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      integrationId: integration.id,
    };

    if (status) {
      whereClause.status = status;
    }

    // Get total count
    const total = await prismadb.xeSyncHistory.count({
      where: whereClause,
    });

    // Get history items
    const history = await prismadb.xeSyncHistory.findMany({
      where: whereClause,
      orderBy: { submittedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        packageId: true,
        policy: true,
        requestType: true,
        totalItems: true,
        successCount: true,
        failureCount: true,
        status: true,
        errorMessage: true,
        submittedAt: true,
        processedAt: true,
      },
    });

    return {
      success: true,
      data: {
        items: history,
        total,
        hasMore: offset + history.length < total,
      },
    };
  } catch (error) {
    console.error("[XE_GET_SYNC_HISTORY]", error);
    return { success: false, error: "Failed to get sync history" };
  }
}

/**
 * Get detailed sync history for a specific package
 */
export async function getXeSyncHistoryDetail(
  historyId: string
): Promise<{
  success: boolean;
  data?: SyncHistoryDetail;
  error?: string;
}> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: false, error: "XE integration not found" };
    }

    // Get history with items
    const history = await prismadb.xeSyncHistory.findFirst({
      where: {
        id: historyId,
        integrationId: integration.id,
      },
      include: {
        items: {
          include: {
            property: {
              select: { property_name: true },
            },
          },
        },
      },
    });

    if (!history) {
      return { success: false, error: "Sync history not found" };
    }

    return {
      success: true,
      data: {
        id: history.id,
        packageId: history.packageId,
        policy: history.policy,
        requestType: history.requestType,
        totalItems: history.totalItems,
        successCount: history.successCount,
        failureCount: history.failureCount,
        status: history.status,
        errorMessage: history.errorMessage,
        submittedAt: history.submittedAt,
        processedAt: history.processedAt,
        items: history.items.map((item) => ({
          id: item.id,
          propertyId: item.propertyId,
          propertyName: item.property?.property_name || "Unknown Property",
          refId: item.refId,
          status: item.status,
          errorMessage: item.errorMessage,
        })),
      },
    };
  } catch (error) {
    console.error("[XE_GET_SYNC_HISTORY_DETAIL]", error);
    return { success: false, error: "Failed to get sync history detail" };
  }
}

/**
 * Get sync statistics for the organization
 */
export async function getXeSyncStats(): Promise<{
  success: boolean;
  data?: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    pendingSyncs: number;
    totalPropertiesSynced: number;
    lastSyncAt: Date | null;
  };
  error?: string;
}> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true, lastSyncAt: true },
    });

    if (!integration) {
      return {
        success: true,
        data: {
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          pendingSyncs: 0,
          totalPropertiesSynced: 0,
          lastSyncAt: null,
        },
      };
    }

    // Get sync counts by status
    const [total, successful, failed, pending] = await Promise.all([
      prismadb.xeSyncHistory.count({
        where: { integrationId: integration.id },
      }),
      prismadb.xeSyncHistory.count({
        where: { integrationId: integration.id, status: "SUCCESS" },
      }),
      prismadb.xeSyncHistory.count({
        where: { integrationId: integration.id, status: "FAILED" },
      }),
      prismadb.xeSyncHistory.count({
        where: { integrationId: integration.id, status: "PENDING" },
      }),
    ]);

    // Get total unique properties synced
    const totalPropertiesSynced = await prismadb.properties.count({
      where: {
        organizationId,
        xePublished: true,
      },
    });

    return {
      success: true,
      data: {
        totalSyncs: total,
        successfulSyncs: successful,
        failedSyncs: failed,
        pendingSyncs: pending,
        totalPropertiesSynced,
        lastSyncAt: integration.lastSyncAt,
      },
    };
  } catch (error) {
    console.error("[XE_GET_SYNC_STATS]", error);
    return { success: false, error: "Failed to get sync statistics" };
  }
}

/**
 * Update sync status (for webhook/callback processing)
 * This would be called by a webhook endpoint when XE sends results
 */
export async function updateSyncStatus(
  packageId: string,
  status: XeSyncStatus,
  results?: Array<{
    refId: string;
    success: boolean;
    error?: string;
    xeAdId?: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: false, error: "XE integration not found" };
    }

    // Find sync history
    const syncHistory = await prismadb.xeSyncHistory.findFirst({
      where: {
        packageId,
        integrationId: integration.id,
      },
    });

    if (!syncHistory) {
      return { success: false, error: "Sync history not found" };
    }

    // Update sync history status
    let successCount = 0;
    let failureCount = 0;

    if (results) {
      // Update individual items
      for (const result of results) {
        const itemStatus: XeSyncItemStatus = result.success ? "SUCCESS" : "FAILED";
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        await prismadb.xeSyncItem.updateMany({
          where: {
            syncId: syncHistory.id,
            refId: result.refId,
          },
          data: {
            status: itemStatus,
            errorMessage: result.error || null,
            xeAdId: result.xeAdId || null,
          },
        });

        // Update property xePublished status based on result
        if (result.success && syncHistory.requestType === "ADD_ITEMS") {
          await prismadb.properties.updateMany({
            where: {
              xeRefId: result.refId,
              organizationId,
            },
            data: { xePublished: true },
          });
        }
      }
    }

    // Update sync history
    await prismadb.xeSyncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status,
        successCount,
        failureCount,
        processedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[XE_UPDATE_SYNC_STATUS]", error);
    return { success: false, error: "Failed to update sync status" };
  }
}

/**
 * Retry a failed sync
 */
export async function retrySyncPackage(
  historyId: string
): Promise<{ success: boolean; newPackageId?: string; error?: string }> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: false, error: "XE integration not found" };
    }

    // Get failed sync history
    const syncHistory = await prismadb.xeSyncHistory.findFirst({
      where: {
        id: historyId,
        integrationId: integration.id,
        status: "FAILED",
      },
      include: {
        items: {
          select: { propertyId: true },
        },
      },
    });

    if (!syncHistory) {
      return { success: false, error: "Failed sync not found or already processed" };
    }

    // Get property IDs from failed sync
    const propertyIds = syncHistory.items.map((item) => item.propertyId);

    // Import and call sync function
    const { syncPropertiesToXe } = await import("./sync");
    const result = await syncPropertiesToXe({
      propertyIds,
      policy: syncHistory.policy as "RENEW_ALL_STOCK" | "INCREMENTAL",
    });

    return {
      success: result.success,
      newPackageId: result.packageId,
      error: result.success ? undefined : result.message,
    };
  } catch (error) {
    console.error("[XE_RETRY_SYNC]", error);
    return { success: false, error: "Failed to retry sync" };
  }
}

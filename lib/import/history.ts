/**
 * Import History Tracking Service
 *
 * Provides functionality to:
 * - Record imports with metadata and result details
 * - Retrieve paginated import history for an organization
 * - Get full import detail including error/result JSON
 * - Mark an import batch as deleted (soft-delete for undo)
 */

import { prismadb } from "@/lib/prisma";
import type { ImportEntityType, ImportStatus } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface RecordImportParams {
  orgId: string;
  userId: string;
  importType: ImportEntityType;
  sourceFilename: string;
  rowCount: number;
  result: {
    clients: { created: number; reused: number; failed: number };
    properties: { created: number; failed: number };
    mandates: { created: number; failed: number };
    skipped: number;
    errors: Array<{ row: number; field: string; error: string; value?: string }>;
  };
  entityIds: string[];
}

export interface ImportHistoryListItem {
  id: string;
  organizationId: string;
  userId: string;
  importType: ImportEntityType;
  sourceFilename: string;
  rowCount: number;
  createdCount: number;
  reusedCount: number;
  failedCount: number;
  skippedCount: number;
  entityIds: string[];
  status: ImportStatus;
  createdAt: Date;
}

export interface ImportHistoryDetail extends ImportHistoryListItem {
  errorDetails: Array<{ row: number; field: string; error: string; value?: string }> | null;
  resultDetails: Record<string, unknown> | null;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Record a new import in the history
 */
export async function recordImport(params: RecordImportParams): Promise<ImportHistoryDetail> {
  const {
    orgId,
    userId,
    importType,
    sourceFilename,
    rowCount,
    result,
    entityIds,
  } = params;

  // Derive aggregate counts from result
  const createdCount =
    result.clients.created + result.properties.created + result.mandates.created;
  const reusedCount = result.clients.reused;
  const failedCount =
    result.clients.failed + result.properties.failed + result.mandates.failed;
  const skippedCount = result.skipped;

  // Determine status based on failure counts
  let status: ImportStatus;
  if (failedCount > 0 && createdCount === 0 && reusedCount === 0) {
    status = "FAILED";
  } else if (failedCount > 0) {
    status = "PARTIALLY_FAILED";
  } else {
    status = "COMPLETED";
  }

  const record = await prismadb.importHistory.create({
    data: {
      organizationId: orgId,
      userId,
      importType,
      sourceFilename,
      rowCount,
      createdCount,
      reusedCount,
      failedCount,
      skippedCount,
      errorDetails: result.errors.length > 0 ? (result.errors as any) : undefined,
      resultDetails: JSON.parse(JSON.stringify(result)),
      entityIds,
      status,
    },
  });

  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    importType: record.importType,
    sourceFilename: record.sourceFilename,
    rowCount: record.rowCount,
    createdCount: record.createdCount,
    reusedCount: record.reusedCount,
    failedCount: record.failedCount,
    skippedCount: record.skippedCount,
    entityIds: record.entityIds,
    status: record.status,
    createdAt: record.createdAt,
    errorDetails: record.errorDetails as ImportHistoryDetail["errorDetails"],
    resultDetails: record.resultDetails as ImportHistoryDetail["resultDetails"],
  };
}

/**
 * Get paginated import history for an organization (lightweight, no JSON blobs)
 */
export async function getImportHistory(
  orgId: string,
  options?: {
    limit?: number;
    cursor?: string;
    importType?: ImportEntityType;
  }
): Promise<{ items: ImportHistoryListItem[]; nextCursor: string | null }> {
  const { limit = 20, cursor, importType } = options || {};

  const whereClause: Record<string, unknown> = {
    organizationId: orgId,
  };

  if (importType) {
    whereClause.importType = importType;
  }

  const records = await prismadb.importHistory.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      organizationId: true,
      userId: true,
      importType: true,
      sourceFilename: true,
      rowCount: true,
      createdCount: true,
      reusedCount: true,
      failedCount: true,
      skippedCount: true,
      entityIds: true,
      status: true,
      createdAt: true,
      // Intentionally omit errorDetails and resultDetails for lightweight listing
    },
  });

  const hasMore = records.length > limit;
  const items = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return { items, nextCursor };
}

/**
 * Get full import detail including error and result JSON
 */
export async function getImportDetail(
  id: string,
  orgId: string
): Promise<ImportHistoryDetail | null> {
  const record = await prismadb.importHistory.findFirst({
    where: {
      id,
      organizationId: orgId,
    },
  });

  if (!record) return null;

  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    importType: record.importType,
    sourceFilename: record.sourceFilename,
    rowCount: record.rowCount,
    createdCount: record.createdCount,
    reusedCount: record.reusedCount,
    failedCount: record.failedCount,
    skippedCount: record.skippedCount,
    entityIds: record.entityIds,
    status: record.status,
    createdAt: record.createdAt,
    errorDetails: record.errorDetails as ImportHistoryDetail["errorDetails"],
    resultDetails: record.resultDetails as ImportHistoryDetail["resultDetails"],
  };
}

/**
 * Soft-delete an import batch by setting status to BATCH_DELETED.
 * Returns the record with entityIds so the caller can handle actual entity deletion.
 */
export async function deleteImportBatch(
  id: string,
  orgId: string
): Promise<ImportHistoryDetail | null> {
  // Verify ownership first
  const existing = await prismadb.importHistory.findFirst({
    where: {
      id,
      organizationId: orgId,
    },
  });

  if (!existing) return null;

  const record = await prismadb.importHistory.update({
    where: { id },
    data: { status: "BATCH_DELETED" },
  });

  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    importType: record.importType,
    sourceFilename: record.sourceFilename,
    rowCount: record.rowCount,
    createdCount: record.createdCount,
    reusedCount: record.reusedCount,
    failedCount: record.failedCount,
    skippedCount: record.skippedCount,
    entityIds: record.entityIds,
    status: record.status,
    createdAt: record.createdAt,
    errorDetails: record.errorDetails as ImportHistoryDetail["errorDetails"],
    resultDetails: record.resultDetails as ImportHistoryDetail["resultDetails"],
  };
}

/**
 * Import History Tracking Service
 *
 * Provides functionality to:
 * - Record imports with metadata and result details
 * - Create preflight records before a batch starts
 * - Retrieve paginated import history for an organization
 * - Get full import detail including error/result JSON
 * - Hard-delete an import batch (removes entities + updates history record)
 */

import { prismadb } from "@/lib/prisma";
import type { BatchImportResult } from "@/lib/import/unified-engine";
import type { ImportEntityType, ImportStatus, ImportPhase } from "@prisma/client";

// ============================================
// TYPES
// ============================================

export interface RecordImportParams {
  orgId: string;
  userId: string;
  importType: ImportEntityType;
  sourceFilename: string;
  rowCount: number;
  result: BatchImportResult;
  entityIds: string[];
  fileHash?: string;
  /** If provided, UPDATE this record instead of creating a new one. Sets importPhase → COMPLETE. */
  importHistoryId?: string;
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
  importPhase: ImportPhase;
  fileHash: string | null;
  createdAt: Date;
}

export interface ImportHistoryDetail extends ImportHistoryListItem {
  errorDetails: Array<{ row: number; field: string; error: string; value?: string }> | null;
  resultDetails: Record<string, unknown> | null;
}

// ============================================
// HELPERS
// ============================================

/**
 * Shape of resultDetails stored in the ImportHistory record.
 */
export interface StoredResultDetails {
  clients: Array<{ uuid: string; friendlyId: string }>;
  properties: Array<{ uuid: string; friendlyId: string }>;
  mandates: Array<{ uuid: string; friendlyId: string }>;
  linkCounts: {
    clientProperty: number;
    mandateProperty: number;
    mandateClient: number;
  };
}

function deriveStatus(
  createdCount: number,
  reusedCount: number,
  failedCount: number,
): ImportStatus {
  if (failedCount > 0 && createdCount === 0 && reusedCount === 0) return "FAILED";
  if (failedCount > 0) return "PARTIALLY_FAILED";
  return "COMPLETED";
}

function toDetail(record: {
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
  importPhase: ImportPhase;
  fileHash: string | null;
  createdAt: Date;
  errorDetails: unknown;
  resultDetails: unknown;
}): ImportHistoryDetail {
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
    importPhase: record.importPhase,
    fileHash: record.fileHash,
    createdAt: record.createdAt,
    errorDetails: record.errorDetails as ImportHistoryDetail["errorDetails"],
    resultDetails: record.resultDetails as ImportHistoryDetail["resultDetails"],
  };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Record a completed import in the history.
 *
 * Accepts the new BatchImportResult type. Stores typed entity arrays in
 * resultDetails. If `importHistoryId` is provided, UPDATEs that record
 * (e.g. a preflight record created by createImportPreflight) and sets
 * importPhase → COMPLETE; otherwise CREATEs a new record.
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
    fileHash,
    importHistoryId,
  } = params;

  const createdCount = result.clients.length + result.properties.length + result.mandates.length;
  const reusedCount = 0; // BatchImportResult does not track reuse separately
  const failedCount = result.errors.length;
  const skippedCount = result.skippedCount;

  const status = deriveStatus(createdCount, reusedCount, failedCount);

  const storedResultDetails: StoredResultDetails = {
    clients: result.clients,
    properties: result.properties,
    mandates: result.mandates,
    linkCounts: {
      clientProperty: result.linkCounts.clientProperty,
      mandateProperty: result.linkCounts.mandateProperty,
      mandateClient: result.linkCounts.mandateClient,
    },
  };

  // Errors from BatchImportResult use rowIndex/entity/error — normalise to stored format
  const storedErrors =
    result.errors.length > 0
      ? result.errors.map((e) => ({
          row: e.rowIndex,
          field: e.entity,
          error: e.error,
        }))
      : undefined;

  if (importHistoryId) {
    // UPDATE existing preflight record → mark as COMPLETE
    const record = await prismadb.importHistory.update({
      where: { id: importHistoryId },
      data: {
        importType,
        sourceFilename,
        rowCount,
        createdCount,
        reusedCount,
        failedCount,
        skippedCount,
        errorDetails: storedErrors ?? undefined,
        resultDetails: storedResultDetails as any,
        entityIds,
        status,
        importPhase: "COMPLETE",
        ...(fileHash !== undefined ? { fileHash } : {}),
      },
    });
    return toDetail(record);
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
      errorDetails: storedErrors ?? undefined,
      resultDetails: storedResultDetails as any,
      entityIds,
      status,
      importPhase: "COMPLETE",
      ...(fileHash !== undefined ? { fileHash } : {}),
    },
  });

  return toDetail(record);
}

/**
 * Create a preflight ImportHistory record before the batch starts.
 * Returns the new record's ID so the caller can pass it back to
 * recordImport() once the import completes.
 */
export async function createImportPreflight(
  orgId: string,
  userId: string,
  filename: string,
  rowCount: number,
  fileHash?: string,
): Promise<string> {
  const record = await prismadb.importHistory.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId,
      importType: "UNIFIED",
      sourceFilename: filename,
      rowCount,
      createdCount: 0,
      reusedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      status: "COMPLETED",
      importPhase: "IMPORTING",
      fileHash: fileHash ?? null,
    },
  });
  return record.id;
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
      importPhase: true,
      fileHash: true,
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

  return toDetail(record);
}

/**
 * Hard-delete an import batch.
 *
 * Deletes the entities (clients, properties, mandates) that were created by
 * this import, removes related junction links first, and updates the
 * ImportHistory record status to BATCH_DELETED or PARTIALLY_DELETED.
 *
 * @param id          - ImportHistory record ID
 * @param orgId       - Organization ID (ownership check)
 * @param userId      - User performing the deletion (for audit)
 * @param entityTypes - "all" or a subset ["clients", "properties", "mandates"]
 * @returns Counts of deleted entities per type
 */
export async function deleteImportBatch(
  id: string,
  orgId: string,
  userId: string,
  entityTypes: "all" | string[],
): Promise<{ deletedCounts: Record<string, number> }> {
  // 1. Fetch record and verify org ownership
  const existing = await prismadb.importHistory.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    throw new Error("Import record not found or access denied");
  }

  // 2. Read resultDetails to get typed entity arrays
  const details = existing.resultDetails as StoredResultDetails | null;

  const allClientIds: string[] =
    details?.clients?.map((c) => c.uuid) ?? existing.entityIds.filter(() => false);
  const allPropertyIds: string[] = details?.properties?.map((p) => p.uuid) ?? [];
  const allMandateIds: string[] = details?.mandates?.map((m) => m.uuid) ?? [];

  // 3. Filter to requested entity types
  const wantAll = entityTypes === "all";
  const wantClients = wantAll || (entityTypes as string[]).includes("clients");
  const wantProperties = wantAll || (entityTypes as string[]).includes("properties");
  const wantMandates = wantAll || (entityTypes as string[]).includes("mandates");

  const clientIds = wantClients ? allClientIds : [];
  const propertyIds = wantProperties ? allPropertyIds : [];
  const mandateIds = wantMandates ? allMandateIds : [];

  const deletedCounts: Record<string, number> = {
    clients: 0,
    properties: 0,
    mandates: 0,
  };

  // 4. Wrap in transaction
  await prismadb.$transaction(
    async (tx) => {
      // 4a. Delete junction links first (avoid FK constraint failures)
      //     ContactProperty: where contactId OR propertyId is in delete set
      // (client_Properties and mandate_Clients tables removed — no M2M junction needed)

      //     Mandate_Properties: where mandateId OR propertyId is in delete set
      if (mandateIds.length > 0 || propertyIds.length > 0) {
        await tx.mandate_Properties.deleteMany({
          where: {
            OR: [
              ...(mandateIds.length > 0 ? [{ mandateId: { in: mandateIds } }] : []),
              ...(propertyIds.length > 0 ? [{ propertyId: { in: propertyIds } }] : []),
            ],
          },
        });
      }

      // 4b. Delete entities
      if (mandateIds.length > 0) {
        const { count } = await tx.mandate.deleteMany({
          where: { id: { in: mandateIds }, organizationId: orgId },
        });
        deletedCounts.mandates = count;
      }

      if (clientIds.length > 0) {
        const { count } = await tx.contact.deleteMany({
          where: { id: { in: clientIds }, organizationId: orgId },
        });
        deletedCounts.clients = count;
      }

      if (propertyIds.length > 0) {
        const { count } = await tx.properties.deleteMany({
          where: { id: { in: propertyIds }, organizationId: orgId },
        });
        deletedCounts.properties = count;
      }

      // 4c. Determine new status and update resultDetails
      const remainingClients = wantClients ? [] : (details?.clients ?? []);
      const remainingProperties = wantProperties ? [] : (details?.properties ?? []);
      const remainingMandates = wantMandates ? [] : (details?.mandates ?? []);

      const anyRemaining =
        remainingClients.length > 0 ||
        remainingProperties.length > 0 ||
        remainingMandates.length > 0;

      const newStatus: ImportStatus = anyRemaining ? "PARTIALLY_DELETED" : "BATCH_DELETED";

      const updatedResultDetails: StoredResultDetails = {
        clients: remainingClients,
        properties: remainingProperties,
        mandates: remainingMandates,
        linkCounts: details?.linkCounts ?? {
          clientProperty: 0,
          mandateProperty: 0,
          mandateClient: 0,
        },
      };

      await tx.importHistory.update({
        where: { id },
        data: {
          status: newStatus,
          resultDetails: updatedResultDetails as any,
        },
      });
    },
    { timeout: 30000 },
  );

  return { deletedCounts };
}

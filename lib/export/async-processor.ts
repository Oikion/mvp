/**
 * Async bulk export processor.
 *
 * Called via next/server `after()` so it runs after the 202 response is flushed.
 * Reads the BackgroundJob payload, paginates the DB query in 500-row batches,
 * decrypts sensitive fields, generates the export file, uploads to Vercel Blob,
 * then marks the job COMPLETED with the download URL — or FAILED on any error.
 */

import { prismadb } from "@/lib/prisma";
import { uploadToBlob } from "@/lib/vercel-blob";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { decryptPropertyForOrg } from "@/lib/model-encryption";
import {
  type ExportFormat,
  CRM_COLUMNS,
  MLS_COLUMNS,
  generateExportFile,
  generateCRMPDF,
  generateMLSPDF,
  generateDescriptiveFilename,
  getTemplateColumns,
  type ExportTemplateType,
  recordExport,
  createExportAuditLog,
  logExportEvent,
} from "@/lib/export";
import { logPiiAccess } from "@/lib/pii-access-log";
import type { ExportEntityType } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BulkExportPayload {
  exportType: "crm" | "mls";
  format: ExportFormat;
  locale: "en" | "el";
  organizationId: string;
  userId: string;
  filters: {
    status?: string[];
    search?: string;
    type?: string[];
  };
  template?: ExportTemplateType | null;
  destination?: string | null;
  scope?: string;
}

export interface BulkExportResult {
  downloadUrl: string;
  expiresAt: string; // ISO-8601
  filename: string;
  rowCount: number;
}

const BATCH_SIZE = 500;
// Download link is valid for 24 hours
const EXPIRY_MS = 24 * 60 * 60 * 1000;

// ─── Main entry point ────────────────────────────────────────────────────────
//
// Filter contract: the caller (ExportButton) gates filter params on
// `scope === "filtered"` before POSTing. When scope is "all", the payload
// arrives with empty filters — the processor exports all rows without filtering.
// No scope-specific logic is needed here.

export async function processBulkExportJob(
  jobId: string,
  orgId: string
): Promise<void> {
  // Atomically claim the job — includes organizationId for defence-in-depth
  // (prevents double-processing on retries and closes job-ID enumeration window)
  const claimed = await prismadb.backgroundJob.updateMany({
    where: { id: jobId, organizationId: orgId, status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  if (claimed.count === 0) {
    // Already claimed or completed by another invocation
    return;
  }

  let job: { payload: unknown } | null = null;

  try {
    job = await prismadb.backgroundJob.findUnique({
      where: { id: jobId },
      select: { payload: true },
    });

    if (!job) throw new Error("Job not found after claim");

    const payload = job.payload as BulkExportPayload;

    if (payload.exportType === "crm") {
      await processCrmExport(jobId, payload);
    } else if (payload.exportType === "mls") {
      await processMlsExport(jobId, payload);
    } else {
      throw new Error(`Unknown exportType: ${(payload as BulkExportPayload).exportType}`);
    }
  } catch (error) {
    // Log the full error server-side but store only a generic message in the DB.
    // The status route serves this message back to the client, so it must not
    // expose internal details (Prisma queries, stack frames, crypto errors).
    console.error("[ASYNC_EXPORT_ERROR]", jobId, error instanceof Error ? error.message : error);

    await prismadb.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: "Export processing failed",
      },
    });
  }
}

// ─── CRM processor ───────────────────────────────────────────────────────────

async function processCrmExport(
  jobId: string,
  payload: BulkExportPayload
): Promise<void> {
  const { organizationId, userId, format, locale, filters, destination, scope } = payload;

  const whereClause: Record<string, unknown> = { organizationId };
  if (filters.status?.length) whereClause.status = { in: filters.status };
  if (filters.search) {
    whereClause.OR = [
      { displayName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Paginated fetch
  const allExportData: Record<string, unknown>[] = [];
  let skip = 0;

  while (true) {
    const batch = await prismadb.contact.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        category: true,
        status: true,
        notes: true,
        assignedAgentId: true,
        assignedAgent: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const decrypted = await Promise.all(
      batch.map(async (c) => {
        const dec = await decryptContactForOrg(c, organizationId);
        logPiiAccess({
          userId,
          organizationId,
          entityType: "CONTACT",
          entityId: c.id,
          action: "EXPORT",
          fields: ["displayName", "email", "primaryPhone", "notes"],
          source: "async-processor/crm",
        }).catch(() => {});
        return dec;
      })
    );

    allExportData.push(
      ...decrypted.map((c) => ({
        ...c,
        assigned_to_name: (c as { assignedAgent?: { name?: string } }).assignedAgent?.name ?? "",
      }))
    );

    skip += batch.length;
    if (batch.length < BATCH_SIZE) break;
  }

  const rowCount = allExportData.length;
  const descriptiveFilename = generateDescriptiveFilename("crm", allExportData, {
    format,
    destination: destination ?? undefined,
  });

  const { buffer, blob: blobData, contentType } = await generateFile(
    "crm",
    format,
    allExportData,
    descriptiveFilename,
    locale
  );

  await finalizeJob({
    jobId,
    organizationId,
    userId,
    format,
    locale,
    filename: descriptiveFilename,
    rowCount,
    entityType: "BULK_CONTACTS",
    filters,
    destination,
    scope,
    fileData: buffer ?? blobData!,
    contentType,
  });

  logExportEvent(
    createExportAuditLog({
      userId,
      organizationId,
      exportType: "crm",
      format,
      rowCount,
      filters: { ...filters, scope, destination },
      success: true,
    })
  );
}

// ─── MLS processor ───────────────────────────────────────────────────────────

async function processMlsExport(
  jobId: string,
  payload: BulkExportPayload
): Promise<void> {
  const { organizationId, userId, format, locale, filters, template, destination, scope } = payload;

  const whereClause: Record<string, unknown> = { organizationId };
  if (filters.status?.length) whereClause.property_status = { in: filters.status };
  if (filters.type?.length) whereClause.property_type = { in: filters.type };
  if (filters.search) {
    whereClause.OR = [
      { property_name: { contains: filters.search, mode: "insensitive" } },
      { address_city: { contains: filters.search, mode: "insensitive" } },
      { address_street: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const allExportData: Record<string, unknown>[] = [];
  let skip = 0;

  while (true) {
    const batch = await prismadb.properties.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        property_name: true,
        price: true,
        property_type: true,
        property_status: true,
        bedrooms: true,
        bathrooms: true,
        square_feet: true,
        size_net_sqm: true,
        address_street: true,
        address_city: true,
        address_state: true,
        postal_code: true,
        area: true,
        municipality: true,
        year_built: true,
        description: true,
        primary_email: true,
        assigned_to: true,
        floor: true,
        elevator: true,
        furnished: true,
        condition: true,
        transaction_type: true,
        Users_Properties_assigned_toToUsers: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const decrypted = await Promise.all(
      batch.map(async (p) => {
        const dec = await decryptPropertyForOrg(p, organizationId);
        logPiiAccess({
          userId,
          organizationId,
          entityType: "PROPERTY",
          entityId: p.id,
          action: "EXPORT",
          fields: ["primary_email", "communication_notes"],
          source: "async-processor/mls",
        }).catch(() => {});
        return dec as Record<string, unknown>;
      })
    );

    allExportData.push(
      ...decrypted.map((p) => ({
        ...p,
        assigned_to_name:
          (p.Users_Properties_assigned_toToUsers as { name?: string } | null)?.name ?? "",
        price: p.price ? Number(p.price) : null,
        bedrooms: p.bedrooms ? Number(p.bedrooms) : null,
        bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
        square_feet: p.square_feet ? Number(p.square_feet) : null,
        size_net_sqm: p.size_net_sqm ? Number(p.size_net_sqm) : null,
        year_built: p.year_built ? Number(p.year_built) : null,
        address_full: [p.address_street, p.address_city, p.address_state, p.postal_code]
          .filter(Boolean)
          .join(", "),
        price_per_sqm:
          p.price && p.square_feet
            ? Math.round(Number(p.price) / Number(p.square_feet))
            : null,
      }))
    );

    skip += batch.length;
    if (batch.length < BATCH_SIZE) break;
  }

  const rowCount = allExportData.length;
  const descriptiveFilename = generateDescriptiveFilename("mls", allExportData, {
    format,
    destination: destination ?? undefined,
    template: template ?? undefined,
  });

  const columns = template ? getTemplateColumns(template) : MLS_COLUMNS;

  const { buffer, blob: blobData, contentType } = await generateFile(
    "mls",
    format,
    allExportData,
    descriptiveFilename,
    locale,
    columns
  );

  await finalizeJob({
    jobId,
    organizationId,
    userId,
    format,
    locale,
    filename: descriptiveFilename,
    rowCount,
    entityType: "BULK_PROPERTIES",
    filters,
    destination,
    scope,
    fileData: buffer ?? blobData!,
    contentType,
  });

  logExportEvent(
    createExportAuditLog({
      userId,
      organizationId,
      exportType: "mls",
      format,
      rowCount,
      filters: { ...filters, scope, destination, template },
      success: true,
    })
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface GenerateFileResult {
  buffer?: Buffer;
  blob?: Blob;
  contentType: string;
}

async function generateFile(
  module: "crm" | "mls",
  format: ExportFormat,
  data: Record<string, unknown>[],
  filename: string,
  locale: "en" | "el",
  columns?: ReturnType<typeof getTemplateColumns>
): Promise<GenerateFileResult> {
  if (format === "pdf") {
    const pdfResult =
      module === "crm"
        ? await generateCRMPDF(data, {
            locale,
            title: locale === "el" ? "Εξαγωγή Επαφών" : "Contacts Export",
            subtitle: locale === "el" ? `${data.length} εγγραφές` : `${data.length} records`,
          })
        : await generateMLSPDF(data, {
            locale,
            title: locale === "el" ? "Εξαγωγή Ακινήτων" : "Properties Export",
            subtitle: locale === "el" ? `${data.length} εγγραφές` : `${data.length} records`,
          });
    return { blob: pdfResult.blob, contentType: pdfResult.contentType };
  }

  const defaultColumns = module === "crm" ? CRM_COLUMNS : MLS_COLUMNS;
  const result = await generateExportFile(module, format, data, {
    locale,
    columns: columns ?? defaultColumns,
  });
  return { buffer: result.buffer, contentType: result.contentType };
}

interface FinalizeJobParams {
  jobId: string;
  organizationId: string;
  userId: string;
  format: ExportFormat;
  locale: "en" | "el";
  filename: string;
  rowCount: number;
  entityType: ExportEntityType;
  filters: BulkExportPayload["filters"];
  destination?: string | null;
  scope?: string;
  fileData: Buffer | Blob;
  contentType: string;
}

async function finalizeJob(params: FinalizeJobParams): Promise<void> {
  const {
    jobId,
    organizationId,
    userId,
    filename,
    rowCount,
    entityType,
    fileData,
    contentType,
  } = params;

  // Convert Blob → Buffer if needed
  const uploadData =
    fileData instanceof Blob ? Buffer.from(await fileData.arrayBuffer()) : fileData;

  // Upload to Vercel Blob
  const blobResult = await uploadToBlob(filename, uploadData, {
    contentType,
    organizationId,
    folder: "exports",
    addRandomSuffix: true,
  });

  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();

  const result: BulkExportResult = {
    downloadUrl: blobResult.url,
    expiresAt,
    filename,
    rowCount,
  };

  // Update job to COMPLETED
  await prismadb.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      result: result as unknown as object,
      progress: 100,
    },
  });

  // Write ExportHistory record (fire-and-forget)
  prismadb.exportHistory
    .create({
      data: {
        organizationId,
        userId,
        entityType,
        entityId: `bulk-job-${jobId}`,
        entityIds: [],
        exportFormat: params.format,
        filename,
        rowCount,
        changeFields: [],
      },
    })
    .catch((err: unknown) => console.error("[EXPORT_HISTORY_WRITE]", err));
}

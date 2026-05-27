import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import type { ExportEntityType } from "@prisma/client";
import {
  type ExportFormat,
  checkExportRateLimit,
  createRateLimitResponse,
  checkRowLimit,
  createRowLimitResponse,
  getSecureDownloadHeaders,
  createExportAuditLog,
  logExportEvent,
  CRM_COLUMNS,
  generateExportFile,
  generateCRMPDF,
  generateDescriptiveFilename,
} from "@/lib/export";
import { requireCanExport } from "@/lib/permissions/guards";
import { shouldUseK8sForExport, submitExportJob } from "@/lib/export/job-handler";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { logPiiAccess } from "@/lib/pii-access-log";
import { processBulkExportJob, type BulkExportPayload } from "@/lib/export/async-processor";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Supported formats
const VALID_FORMATS: ExportFormat[] = ["xlsx", "xls", "csv", "pdf", "xml"];

export async function GET(req: NextRequest) {
  try {
    // Permission check: Viewers cannot export data
    const permissionError = await requireCanExport();
    if (permissionError) return permissionError;

    // Check authentication
    const { userId: clerkUserId, orgId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to export data" },
        { status: 401 }
      );
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization", message: "You must be part of an organization to export data" },
        { status: 403 }
      );
    }
    
    // Get user from database
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true, name: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found", message: "User not found in database" },
        { status: 404 }
      );
    }
    
    // Check rate limit
    const rateLimitResult = await checkExportRateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.reset);
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "xlsx") as ExportFormat;
    const scope = searchParams.get("scope") || "all"; // "all" or "filtered"
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    const destination = searchParams.get("destination");
    
    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: "Invalid format", message: `Format must be one of: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Parse filter parameters (for filtered scope)
    const statusFilter = searchParams.get("status")?.split(",").filter(Boolean) || [];
    const searchQuery = searchParams.get("search") || "";
    
    // Fetch data from database
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
    };
    
    // Apply status filter if provided
    if (statusFilter.length > 0) {
      whereClause.status = { in: statusFilter };
    }

    // Apply search filter if provided
    if (searchQuery) {
      whereClause.OR = [
        { displayName: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Fetch contacts with full data for export
    const clients = await prismadb.contact.findMany({
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
        assignedAgent: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Check row limit
    const rowCheck = checkRowLimit("crm", clients.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }
    
    // ===========================================
    // K8s Jobs for large exports
    // ===========================================
    const useK8s = shouldUseK8sForExport({
      organizationId: orgId,
      exportType: "crm",
      format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
      rowCount: clients.length,
      filters: { status: statusFilter, search: searchQuery },
      locale,
    });

    if (useK8s) {
      const jobResult = await submitExportJob({
        organizationId: orgId,
        exportType: "crm",
        format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
        rowCount: clients.length,
        filters: { status: statusFilter, search: searchQuery },
        locale,
      });

      if (jobResult.useK8s) {
        // Log the export event
        logExportEvent(createExportAuditLog({
          userId: user.id,
          organizationId: orgId,
          exportType: "crm",
          format,
          rowCount: clients.length,
          filters: { status: statusFilter, search: searchQuery, scope, destination },
          success: true,
        }));

        prismadb.exportHistory.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            entityType: "BULK_CONTACTS" as ExportEntityType,
            entityId: `bulk-${Date.now()}`,
            entityIds: clients.map((c) => c.id),
            exportFormat: format,
            filename: `crm-export-${Date.now()}.${format}`,
            rowCount: clients.length,
            changeFields: [],
          },
        }).catch((err: unknown) => console.error("[EXPORT_HISTORY_WRITE]", err));

        return NextResponse.json({
          success: true,
          useK8s: true,
          jobId: jobResult.jobId,
          message: jobResult.message,
          rowCount: clients.length,
        });
      }
    }
    
    // ===========================================
    // Inline export (small datasets)
    // ===========================================
    
    // Decrypt encrypted contact fields before export
    const decryptedClients = await Promise.all(
      clients.map(async (c) => {
        const dec = await decryptContactForOrg(c, orgId);
        // fire-and-forget PII access log — EXPORT action for each decrypted contact
        logPiiAccess({
          userId: user.id,
          organizationId: orgId,
          entityType: "CONTACT",
          entityId: c.id,
          action: "EXPORT",
          fields: ["displayName", "email", "primaryPhone", "notes"],
          source: "GET /api/export/crm",
        }).catch(() => {});
        return dec;
      })
    );

    // Transform data for export
    const exportData = decryptedClients.map(client => ({
      ...client,
      assigned_to_name: client.assignedAgent?.name || "",
    }));
    
    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "crm",
      format,
      rowCount: exportData.length,
      filters: { status: statusFilter, search: searchQuery, scope, destination },
      success: true,
    });
    
    // Log the export event
    logExportEvent(auditLog);
    
    // Generate descriptive filename
    const descriptiveFilename = generateDescriptiveFilename(
      "crm",
      exportData,
      { format, destination: destination || undefined }
    );

    prismadb.exportHistory.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        entityType: "BULK_CONTACTS" as ExportEntityType,
        entityId: `bulk-${Date.now()}`,
        entityIds: clients.map((c) => c.id),
        exportFormat: format,
        filename: descriptiveFilename,
        rowCount: exportData.length,
        changeFields: [],
      },
    }).catch((err: unknown) => console.error("[EXPORT_HISTORY_WRITE]", err));

    // Generate export file based on format
    let fileBuffer: Buffer | Blob;
    let filename: string;
    let contentType: string;
    
    if (format === "pdf") {
      const pdfResult = await generateCRMPDF(exportData, {
        locale,
        title: locale === "el" ? "Εξαγωγή Πελατών" : "Clients Export",
        subtitle: locale === "el" 
          ? `${exportData.length} εγγραφές` 
          : `${exportData.length} records`,
      });
      fileBuffer = pdfResult.blob;
      filename = descriptiveFilename; // Use descriptive filename
      contentType = pdfResult.contentType;
    } else {
      const result = await generateExportFile("crm", format, exportData, {
        locale,
        columns: CRM_COLUMNS,
      });
      fileBuffer = result.buffer;
      filename = descriptiveFilename; // Use descriptive filename
      contentType = result.contentType;
    }
    
    // Return file response
    const headers = getSecureDownloadHeaders(filename, format);
    
    // Convert Blob or Buffer to Uint8Array for Response
    const bodyData = fileBuffer instanceof Blob
      ? new Uint8Array(await fileBuffer.arrayBuffer())
      : new Uint8Array(fileBuffer);
    
    return new Response(bodyData as BodyInit, {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error("[CRM_EXPORT_ERROR]", error);

    return NextResponse.json(
      {
        error: "Export failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}

// ─── Async bulk export ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const permissionError = await requireCanExport();
    if (permissionError) return permissionError;

    const { userId: clerkUserId, orgId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rateLimitResult = await checkExportRateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.reset);
    }

    // Accept parameters from JSON body or query string (backward compat)
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    }
    const sp = req.nextUrl.searchParams;

    const format = ((body.format ?? sp.get("format")) || "xlsx") as ExportFormat;
    const locale = ((body.locale ?? sp.get("locale")) || "en") as "en" | "el";
    const scope = String(body.scope ?? sp.get("scope") ?? "all");
    const destination = String(body.destination ?? sp.get("destination") ?? "");
    const statusFilter = (body.status as string[] | undefined)
      ?? sp.get("status")?.split(",").filter(Boolean)
      ?? [];
    const searchQuery = String(body.search ?? sp.get("search") ?? "");

    const VALID_FORMATS: ExportFormat[] = ["xlsx", "xls", "csv", "pdf", "xml"];
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const payload: BulkExportPayload = {
      exportType: "crm",
      format,
      locale,
      organizationId: orgId,
      userId: user.id,
      filters: { status: statusFilter, search: searchQuery },
      destination: destination || null,
      scope,
    };

    const job = await prismadb.backgroundJob.create({
      data: {
        type: "BULK_EXPORT",
        organizationId: orgId,
        status: "PENDING",
        payload: payload as unknown as object,
        createdBy: user.id,
      },
      select: { id: true },
    });

    after(async () => {
      await processBulkExportJob(job.id, orgId);
    });

    return NextResponse.json(
      { jobId: job.id, status: "PROCESSING" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[CRM_EXPORT_ENQUEUE_ERROR]", error);
    return NextResponse.json({ error: "Failed to enqueue export" }, { status: 500 });
  }
}

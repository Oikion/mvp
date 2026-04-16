/**
 * Mandates Export API Route
 *
 * Exports mandates data to XLS, XLSX, CSV, XML, or PDF format.
 * Includes rate limiting, authorization, audit logging, and descriptive filenames.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  type ExportFormat,
  checkExportRateLimit,
  createRateLimitResponse,
  checkRowLimit,
  createRowLimitResponse,
  getSecureDownloadHeaders,
  createExportAuditLog,
  logExportEvent,
  REQUEST_COLUMNS,
  generateExportFile,
  generateTablePDF,
  generateDescriptiveFilename,
} from "@/lib/export";
import { requireCanExport } from "@/lib/permissions/guards";
import { shouldUseK8sForExport, submitExportJob } from "@/lib/export/job-handler";
import { decryptRequestForOrg } from "@/lib/model-encryption";

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

    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
      draftStatus: { not: true },
    };

    // Apply status filter if provided
    if (statusFilter.length > 0) {
      whereClause.status = { in: statusFilter };
    }

    // Apply search filter if provided
    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Fetch requests with full data for export
    const mandates = await prismadb.request.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        title: true,
        requestType: true,
        propertyCategory: true,
        status: true,
        urgency: true,
        budgetMin: true,
        budgetMax: true,
        surfaceMin: true,
        surfaceMax: true,
        bedroomsMin: true,
        bedroomsMax: true,
        municipality: true,
        region: true,
        assignedAgentId: true,
        expiresAt: true,
        notes: true,
        communicationNotes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Check row limit
    const rowCheck = checkRowLimit("requests", mandates.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }

    // ===========================================
    // K8s Jobs for large exports
    // ===========================================
    const useK8s = shouldUseK8sForExport({
      organizationId: orgId,
      exportType: "requests",
      format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
      rowCount: mandates.length,
      filters: { status: statusFilter, search: searchQuery },
      locale,
    });

    if (useK8s) {
      const jobResult = await submitExportJob({
        organizationId: orgId,
        exportType: "requests",
        format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
        rowCount: mandates.length,
        filters: { status: statusFilter, search: searchQuery },
        locale,
      });

      if (jobResult.useK8s) {
        // Log the export event
        logExportEvent(createExportAuditLog({
          userId: user.id,
          organizationId: orgId,
          exportType: "requests",
          format,
          rowCount: mandates.length,
          filters: { status: statusFilter, search: searchQuery, scope, destination },
          success: true,
        }));

        return NextResponse.json({
          success: true,
          useK8s: true,
          jobId: jobResult.jobId,
          message: jobResult.message,
          rowCount: mandates.length,
        });
      }
    }

    // ===========================================
    // Inline export (small datasets)
    // ===========================================

    // Decrypt requests and add derived fields
    const exportData = await Promise.all(
      mandates.map(async (m) => {
        const decrypted = await decryptRequestForOrg(m, orgId);
        return {
          ...decrypted,
          // Add derived display fields
          client_name: "",
          assigned_to_name: "",
          // Convert Decimal fields to numbers
          budgetMin: decrypted.budgetMin ? Number(decrypted.budgetMin) : null,
          budgetMax: decrypted.budgetMax ? Number(decrypted.budgetMax) : null,
          surfaceMin: decrypted.surfaceMin ? Number(decrypted.surfaceMin) : null,
          surfaceMax: decrypted.surfaceMax ? Number(decrypted.surfaceMax) : null,
        };
      })
    );

    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "requests",
      format,
      rowCount: exportData.length,
      filters: { status: statusFilter, search: searchQuery, scope, destination },
      success: true,
    });

    // Log the export event
    logExportEvent(auditLog);

    // Generate descriptive filename
    const descriptiveFilename = generateDescriptiveFilename(
      "requests",
      exportData,
      { format, destination: destination || undefined }
    );

    // Generate export file based on format
    let fileBuffer: Buffer | Blob;
    let filename: string;
    let contentType: string;

    if (format === "pdf") {
      const pdfResult = await generateTablePDF("requests", exportData, {
        locale,
        title: locale === "el" ? "Εξαγωγή Εντολών" : "Mandates Export",
        subtitle: locale === "el"
          ? `${exportData.length} εγγραφές`
          : `${exportData.length} records`,
        columns: REQUEST_COLUMNS,
      });
      fileBuffer = pdfResult.blob;
      filename = descriptiveFilename;
      contentType = pdfResult.contentType;
    } else {
      const result = await generateExportFile("requests", format, exportData, {
        locale,
        columns: REQUEST_COLUMNS,
      });
      fileBuffer = result.buffer;
      filename = descriptiveFilename;
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
    console.error("[MANDATES_EXPORT_ERROR]", error);

    return NextResponse.json(
      {
        error: "Export failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}

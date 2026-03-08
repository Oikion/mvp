/**
 * Documents Export API Route
 *
 * Exports documents data to XLS, XLSX, CSV, XML, or PDF format.
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
  DOCUMENT_COLUMNS,
  generateExportFile,
  generateTablePDF,
  generateDescriptiveFilename,
} from "@/lib/export";
import { requireCanExport } from "@/lib/permissions/guards";
import { shouldUseK8sForExport, submitExportJob } from "@/lib/export/job-handler";
import { decryptDocumentForOrg } from "@/lib/model-encryption";

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
    const scope = searchParams.get("scope") || "all";
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    const destination = searchParams.get("destination");

    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: "Invalid format", message: `Format must be one of: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const typeFilter = searchParams.get("document_system_type")?.split(",").filter(Boolean) || [];
    const searchQuery = searchParams.get("search") || "";

    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (typeFilter.length > 0) {
      whereClause.document_system_type = { in: typeFilter };
    }

    // Fetch documents with relations
    const documents = await prismadb.documents.findMany({
      where: whereClause,
      select: {
        id: true,
        friendlyId: true,
        createdAt: true,
        document_name: true,
        description: true,
        document_system_type: true,
        document_file_mimeType: true,
        size: true,
        linkEnabled: true,
        passwordProtected: true,
        viewsCount: true,
        lastViewedAt: true,
        expiresAt: true,
        created_by_user: true,
        assigned_user: true,
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
        Users_Documents_created_by_userToUsers: {
          select: { name: true },
        },
        Users_Documents_assigned_userToUsers: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check row limit
    const rowCheck = checkRowLimit("documents", documents.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }

    // K8s Jobs for large exports
    const useK8s = shouldUseK8sForExport({
      organizationId: orgId,
      exportType: "documents",
      format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
      rowCount: documents.length,
      filters: { document_system_type: typeFilter, search: searchQuery },
      locale,
    });

    if (useK8s) {
      const jobResult = await submitExportJob({
        organizationId: orgId,
        exportType: "documents",
        format: format as "xlsx" | "xls" | "csv" | "pdf" | "xml",
        rowCount: documents.length,
        filters: { document_system_type: typeFilter, search: searchQuery },
        locale,
      });

      if (jobResult.useK8s) {
        logExportEvent(createExportAuditLog({
          userId: user.id,
          organizationId: orgId,
          exportType: "documents",
          format,
          rowCount: documents.length,
          filters: { document_system_type: typeFilter, search: searchQuery, scope, destination },
          success: true,
        }));

        return NextResponse.json({
          success: true,
          useK8s: true,
          jobId: jobResult.jobId,
          message: jobResult.message,
          rowCount: documents.length,
        });
      }
    }

    // Inline export
    const exportData = await Promise.all(
      documents.map(async (doc) => {
        const decrypted = await decryptDocumentForOrg(doc, orgId);
        return {
          ...decrypted,
          created_by_name: (decrypted as any).Users_Documents_created_by_userToUsers?.name || "",
          assigned_to_name: (decrypted as any).Users_Documents_assigned_userToUsers?.name || "",
          linked_clients: ((decrypted as any).Clients || [])
            .map((c: { client_name: string }) => c.client_name)
            .join(", "),
          linked_properties: ((decrypted as any).Properties || [])
            .map((p: { property_name: string }) => p.property_name)
            .join(", "),
        };
      })
    );

    // Apply client-side search filter (document_name/description are encrypted, can't filter in DB)
    const filteredData = searchQuery
      ? exportData.filter(
          (doc) =>
            doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : exportData;

    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "documents",
      format,
      rowCount: filteredData.length,
      filters: { document_system_type: typeFilter, search: searchQuery, scope, destination },
      success: true,
    });

    logExportEvent(auditLog);

    // Generate descriptive filename
    const descriptiveFilename = generateDescriptiveFilename(
      "documents",
      filteredData,
      { format, destination: destination || undefined }
    );

    // Generate export file based on format
    let fileBuffer: Buffer | Blob;
    let filename: string;
    let contentType: string;

    if (format === "pdf") {
      const pdfResult = await generateTablePDF("documents", filteredData, {
        locale,
        title: locale === "el" ? "Εξαγωγή Εγγράφων" : "Documents Export",
        subtitle: locale === "el"
          ? `${filteredData.length} εγγραφές`
          : `${filteredData.length} records`,
        columns: DOCUMENT_COLUMNS,
      });
      fileBuffer = pdfResult.blob;
      filename = descriptiveFilename;
      contentType = pdfResult.contentType;
    } else {
      const result = generateExportFile("documents", format, filteredData, {
        locale,
        columns: DOCUMENT_COLUMNS,
      });
      fileBuffer = result.buffer;
      filename = descriptiveFilename;
      contentType = result.contentType;
    }

    // Return file response
    const headers = getSecureDownloadHeaders(filename, format);

    const bodyData = fileBuffer instanceof Blob
      ? new Uint8Array(await fileBuffer.arrayBuffer())
      : new Uint8Array(fileBuffer);

    return new Response(bodyData as BodyInit, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("[DOCUMENTS_EXPORT_ERROR]", error);

    return NextResponse.json(
      {
        error: "Export failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}

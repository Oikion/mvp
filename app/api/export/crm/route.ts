/**
 * CRM Export API Route
 * 
 * Exports CRM clients data to XLS, XLSX, CSV, XML, or PDF format.
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
  CRM_COLUMNS,
  addAssignedUserName,
  generateExportFile,
  generateCRMPDF,
  generateDescriptiveFilename,
} from "@/lib/export";
import { requireCanExport } from "@/lib/permissions/guards";
import { shouldUseK8sForExport, submitExportJob } from "@/lib/export/job-handler";

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
      whereClause.client_status = { in: statusFilter };
    }
    
    // Apply search filter if provided
    if (searchQuery) {
      whereClause.OR = [
        { client_name: { contains: searchQuery, mode: "insensitive" } },
        { primary_email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }
    
    // Fetch clients with full data for export
    const clients = await prismadb.clients.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_type: true,
        client_status: true,
        budget_min: true,
        budget_max: true,
        billing_city: true,
        billing_country: true,
        description: true,
        assigned_to: true,
        Users_Clients_assigned_toToUsers: {
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
    
    // Get organization users for assigning names
    const users = await prismadb.users.findMany({
      where: { 
        // Get users that are assigned to any client in this org
        OR: [
          { Clients_Clients_assigned_toToUsers: { some: { organizationId: orgId } } },
        ],
      },
      select: { id: true, name: true },
    });
    
    // Transform data for export
    const exportData = clients.map(client => ({
      ...client,
      assigned_to_name: client.Users_Clients_assigned_toToUsers?.name || "",
      // Convert Decimal fields to numbers
      budget_min: client.budget_min ? Number(client.budget_min) : null,
      budget_max: client.budget_max ? Number(client.budget_max) : null,
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
      const result = generateExportFile("crm", format, exportData, {
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

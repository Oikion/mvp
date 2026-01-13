/**
 * MLS Export API Route
 * 
 * Exports MLS properties data to XLS, XLSX, CSV, or PDF format.
 * Includes rate limiting, authorization, and audit logging.
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
  MLS_COLUMNS,
  generateExportFile,
  generateMLSPDF,
} from "@/lib/export";
import { requireCanExport } from "@/lib/permissions/guards";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Supported formats
const VALID_FORMATS: ExportFormat[] = ["xlsx", "xls", "csv", "pdf"];

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
    
    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: "Invalid format", message: `Format must be one of: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Parse filter parameters
    const statusFilter = searchParams.get("status")?.split(",").filter(Boolean) || [];
    const typeFilter = searchParams.get("type")?.split(",").filter(Boolean) || [];
    const searchQuery = searchParams.get("search") || "";
    
    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
    };
    
    if (statusFilter.length > 0) {
      whereClause.property_status = { in: statusFilter };
    }
    
    if (typeFilter.length > 0) {
      whereClause.property_type = { in: typeFilter };
    }
    
    if (searchQuery) {
      whereClause.OR = [
        { property_name: { contains: searchQuery, mode: "insensitive" } },
        { address_city: { contains: searchQuery, mode: "insensitive" } },
        { address_street: { contains: searchQuery, mode: "insensitive" } },
      ];
    }
    
    // Access properties through dynamic prisma client
    const client: any = prismadb as any;
    const delegate = client?.properties;
    
    if (!delegate) {
      return NextResponse.json(
        { error: "Database error", message: "Properties table not accessible" },
        { status: 500 }
      );
    }
    
    // Fetch properties with full data for export
    const properties = await delegate.findMany({
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
        address_street: true,
        address_city: true,
        address_state: true,
        postal_code: true,
        year_built: true,
        description: true,
        assigned_to: true,
        Users_Properties_assigned_toToUsers: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Check row limit
    const rowCheck = checkRowLimit("mls", properties.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }
    
    // Transform data for export
    const exportData = properties.map((property: Record<string, unknown>) => ({
      ...property,
      assigned_to_name: (property.Users_Properties_assigned_toToUsers as { name?: string } | null)?.name || "",
      // Ensure numeric fields are numbers
      price: property.price ? Number(property.price) : null,
      bedrooms: property.bedrooms ? Number(property.bedrooms) : null,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
      square_feet: property.square_feet ? Number(property.square_feet) : null,
      year_built: property.year_built ? Number(property.year_built) : null,
    }));
    
    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "mls",
      format,
      rowCount: exportData.length,
      filters: { status: statusFilter, type: typeFilter, search: searchQuery, scope },
      success: true,
    });
    
    logExportEvent(auditLog);
    
    // Generate export file
    let fileBuffer: Buffer | Blob;
    let filename: string;
    let contentType: string;
    
    if (format === "pdf") {
      const pdfResult = await generateMLSPDF(exportData, {
        locale,
        title: locale === "el" ? "Εξαγωγή Ακινήτων" : "Properties Export",
        subtitle: locale === "el" 
          ? `${exportData.length} εγγραφές` 
          : `${exportData.length} records`,
      });
      fileBuffer = pdfResult.blob;
      filename = pdfResult.filename;
      contentType = pdfResult.contentType;
    } else {
      const result = generateExportFile("mls", format, exportData, {
        locale,
        columns: MLS_COLUMNS,
      });
      fileBuffer = result.buffer;
      filename = result.filename;
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
    console.error("[MLS_EXPORT_ERROR]", error);
    
    return NextResponse.json(
      { 
        error: "Export failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}

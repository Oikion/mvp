/**
 * Reports Export API Route
 * 
 * Exports reports statistics to XLS, XLSX, CSV, or PDF format.
 * Includes rate limiting, authorization, and audit logging.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  type ExportFormat,
  checkExportRateLimit,
  createRateLimitResponse,
  getSecureDownloadHeaders,
  createExportAuditLog,
  logExportEvent,
  REPORTS_COLUMNS,
  generateExportFile,
  generateReportsPDF,
} from "@/lib/export";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Supported formats
const VALID_FORMATS: ExportFormat[] = ["xlsx", "xls", "csv", "pdf"];

export async function GET(req: NextRequest) {
  try {
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
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    
    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: "Invalid format", message: `Format must be one of: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Fetch clients statistics
    const clients = await prismadb.clients.findMany({
      where: { organizationId: orgId },
      select: { client_status: true },
    });
    
    const clientsCount = clients.length;
    const clientsByStatus = clients.reduce((acc: Record<string, number>, client) => {
      const status = client.client_status || "LEAD";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const clientStatusData = [
      "LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"
    ].map(status => ({
      name: status,
      Number: clientsByStatus[status] || 0,
    }));
    
    const activeClients = clientsByStatus["ACTIVE"] || 0;
    
    // Fetch properties statistics
    const client: any = prismadb as any;
    const propertiesDelegate = client?.properties;
    
    let propertiesCount = 0;
    let propertiesByStatus: { name: string; Number: number }[] = [];
    let activeProperties = 0;
    
    if (propertiesDelegate) {
      const properties = await propertiesDelegate.findMany({
        where: { organizationId: orgId },
        select: { property_status: true },
      });
      
      propertiesCount = properties.length;
      const statusCounts = properties.reduce((acc: Record<string, number>, property: { property_status?: string }) => {
        const status = property.property_status || "ACTIVE";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      propertiesByStatus = [
        "ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"
      ].map(status => ({
        name: status,
        Number: statusCounts[status] || 0,
      }));
      
      activeProperties = statusCounts["ACTIVE"] || 0;
    }
    
    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "reports",
      format,
      rowCount: clientStatusData.length + propertiesByStatus.length,
      filters: {},
      success: true,
    });
    
    logExportEvent(auditLog);
    
    // Generate export file
    let fileBuffer: Buffer | Blob;
    let filename: string;
    let contentType: string;
    
    if (format === "pdf") {
      const pdfResult = await generateReportsPDF({
        clientsCount,
        propertiesCount,
        activeClients,
        activeProperties,
        clientsByStatus: clientStatusData,
        propertiesByStatus,
      }, {
        locale,
        title: locale === "el" ? "Αναφορές" : "Reports",
      });
      fileBuffer = pdfResult.blob;
      filename = pdfResult.filename;
      contentType = pdfResult.contentType;
    } else {
      // For Excel/CSV, create tabular data
      const labels = {
        clientsSection: locale === "el" ? "Στατιστικά Πελατών" : "Client Statistics",
        propertiesSection: locale === "el" ? "Στατιστικά Ακινήτων" : "Property Statistics",
        total: locale === "el" ? "Σύνολο" : "Total",
        active: locale === "el" ? "Ενεργοί/ά" : "Active",
      };
      
      const exportData = [
        // Summary section
        { category: labels.clientsSection, metric: labels.total, value: clientsCount, percentage: "100%", trend: "", period: "" },
        { category: labels.clientsSection, metric: labels.active, value: activeClients, percentage: clientsCount > 0 ? `${((activeClients / clientsCount) * 100).toFixed(1)}%` : "0%", trend: "", period: "" },
        // Client status breakdown
        ...clientStatusData.map(item => ({
          category: labels.clientsSection,
          metric: item.name,
          value: item.Number,
          percentage: clientsCount > 0 ? `${((item.Number / clientsCount) * 100).toFixed(1)}%` : "0%",
          trend: "",
          period: "",
        })),
        // Properties section
        { category: labels.propertiesSection, metric: labels.total, value: propertiesCount, percentage: "100%", trend: "", period: "" },
        { category: labels.propertiesSection, metric: labels.active, value: activeProperties, percentage: propertiesCount > 0 ? `${((activeProperties / propertiesCount) * 100).toFixed(1)}%` : "0%", trend: "", period: "" },
        // Property status breakdown
        ...propertiesByStatus.map(item => ({
          category: labels.propertiesSection,
          metric: item.name,
          value: item.Number,
          percentage: propertiesCount > 0 ? `${((item.Number / propertiesCount) * 100).toFixed(1)}%` : "0%",
          trend: "",
          period: "",
        })),
      ];
      
      const result = generateExportFile("reports", format, exportData, {
        locale,
        columns: REPORTS_COLUMNS,
        sheetName: locale === "el" ? "Αναφορές" : "Reports",
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
    console.error("[REPORTS_EXPORT_ERROR]", error);
    
    return NextResponse.json(
      { 
        error: "Export failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}

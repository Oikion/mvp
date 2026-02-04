// @ts-nocheck
// TODO: Fix type errors
/**
 * Portal Export API Route
 * 
 * Exports properties to Greek real estate portals in their specific formats.
 * Supports XML and CSV formats with portal-specific field mappings.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  checkExportRateLimit,
  createRateLimitResponse,
  checkRowLimit,
  createRowLimitResponse,
  getSecureDownloadHeaders,
  createExportAuditLog,
  logExportEvent,
  generateCSV,
} from "@/lib/export";
import {
  getPortalTemplate,
  isValidPortalId,
  mapPropertiesToPortal,
  validatePropertiesForPortal,
  enhancePropertyWithComputed,
  type PortalId,
  type PropertyData,
  type PortalTemplate,
} from "@/lib/export/portals";
import {
  generateXml,
  xmlToBuffer,
} from "@/lib/export/xml-generator";
import { requireCanExport } from "@/lib/permissions/guards";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Valid portal IDs
const VALID_PORTALS: PortalId[] = [
  "spitogatos",
  "golden_home",
  "tospitimou",
  "home_greek_home",
  "facebook",
];

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
    const portalId = searchParams.get("portal") as PortalId;
    const scope = searchParams.get("scope") || "all";
    const locale = (searchParams.get("locale") || "el") as "en" | "el";
    const imageBaseUrl = searchParams.get("imageBaseUrl") || "";
    const listingBaseUrl = searchParams.get("listingBaseUrl") || "";
    
    // Validate portal ID
    if (!portalId || !isValidPortalId(portalId)) {
      return NextResponse.json(
        { 
          error: "Invalid portal", 
          message: `Portal must be one of: ${VALID_PORTALS.join(", ")}`,
          validPortals: VALID_PORTALS,
        },
        { status: 400 }
      );
    }
    
    // Get portal template
    const template = getPortalTemplate(portalId);
    if (!template) {
      return NextResponse.json(
        { error: "Portal not found", message: `Portal template '${portalId}' not found` },
        { status: 404 }
      );
    }
    
    // Parse filter parameters
    const statusFilter = searchParams.get("status")?.split(",").filter(Boolean) || [];
    const typeFilter = searchParams.get("type")?.split(",").filter(Boolean) || [];
    const searchQuery = searchParams.get("search") || "";
    const propertyIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];
    
    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId: orgId,
    };
    
    // Filter by specific IDs if provided
    if (propertyIds.length > 0) {
      whereClause.id = { in: propertyIds };
    }
    
    // Filter by status
    if (statusFilter.length > 0) {
      whereClause.property_status = { in: statusFilter };
    } else if (!template.exportOptions?.includeInactive) {
      // Default: exclude inactive properties
      whereClause.property_status = { in: ["ACTIVE", "PENDING"] };
    }
    
    // Filter by type
    if (typeFilter.length > 0) {
      whereClause.property_type = { in: typeFilter };
    }
    
    // Filter by search query
    if (searchQuery) {
      whereClause.OR = [
        { property_name: { contains: searchQuery, mode: "insensitive" } },
        { address_city: { contains: searchQuery, mode: "insensitive" } },
        { address_street: { contains: searchQuery, mode: "insensitive" } },
      ];
    }
    
    // Exclude drafts unless explicitly included
    if (!template.exportOptions?.includeDrafts) {
      whereClause.draft_status = false;
    }
    
    // Access properties through dynamic prisma client
    const client = prismadb as unknown as { properties: { findMany: (args: unknown) => Promise<unknown[]> } };
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
        updatedAt: true,
        property_name: true,
        price: true,
        property_type: true,
        property_status: true,
        transaction_type: true,
        bedrooms: true,
        bathrooms: true,
        square_feet: true,
        size_net_sqm: true,
        size_gross_sqm: true,
        lot_size: true,
        plot_size_sqm: true,
        address_street: true,
        address_city: true,
        address_state: true,
        address_zip: true,
        postal_code: true,
        area: true,
        municipality: true,
        year_built: true,
        renovated_year: true,
        description: true,
        floor: true,
        floors_total: true,
        elevator: true,
        furnished: true,
        heating_type: true,
        energy_cert_class: true,
        condition: true,
        orientation: true,
        amenities: true,
        accepts_pets: true,
        monthly_common_charges: true,
        available_from: true,
        primary_email: true,
        assigned_to: true,
        Users_Properties_assigned_toToUsers: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as PropertyData[];
    
    // Check row limit
    const rowCheck = checkRowLimit("mls", properties.length);
    if (!rowCheck.allowed) {
      return createRowLimitResponse(rowCheck);
    }
    
    // Check portal-specific max properties limit
    if (template.validation?.maxProperties && properties.length > template.validation.maxProperties) {
      return NextResponse.json(
        { 
          error: "Too many properties", 
          message: `${template.name} supports a maximum of ${template.validation.maxProperties} properties per export. Current selection: ${properties.length}`,
          maxAllowed: template.validation.maxProperties,
          currentCount: properties.length,
        },
        { status: 400 }
      );
    }
    
    // Transform properties for export
    const transformedProperties: PropertyData[] = properties.map((property) => {
      const enhanced = enhancePropertyWithComputed({
        ...property,
        assigned_to_name: (property as unknown as { Users_Properties_assigned_toToUsers?: { name?: string } }).Users_Properties_assigned_toToUsers?.name || "",
        // Convert numeric fields
        price: property.price ? Number(property.price) : null,
        bedrooms: property.bedrooms ? Number(property.bedrooms) : null,
        bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
        square_feet: property.square_feet ? Number(property.square_feet) : null,
        size_net_sqm: property.size_net_sqm ? Number(property.size_net_sqm) : null,
        size_gross_sqm: property.size_gross_sqm ? Number(property.size_gross_sqm) : null,
        lot_size: property.lot_size ? Number(property.lot_size) : null,
        plot_size_sqm: property.plot_size_sqm ? Number(property.plot_size_sqm) : null,
        year_built: property.year_built ? Number(property.year_built) : null,
        renovated_year: property.renovated_year ? Number(property.renovated_year) : null,
        monthly_common_charges: property.monthly_common_charges ? Number(property.monthly_common_charges) : null,
        // Add placeholder for images (should be fetched from documents if needed)
        images: [],
      });
      return enhanced;
    });
    
    // Validate properties for portal
    const validationResults = validatePropertiesForPortal(transformedProperties, template);
    const hasValidationErrors = validationResults.some(r => !r.valid);
    
    // Log validation warnings (but don't block export)
    const allWarnings = validationResults.flatMap(r => r.warnings);
    if (allWarnings.length > 0) {
      console.log(`[PORTAL_EXPORT] ${allWarnings.length} validation warnings for ${template.name}`);
    }
    
    // Map properties to portal format
    const mappedProperties = mapPropertiesToPortal(transformedProperties, template, {
      locale,
      imageBaseUrl,
      listingBaseUrl,
    });
    
    // Generate export file based on format
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;
    
    if (template.format === "xml") {
      // Generate XML
      const xml = generateXml(mappedProperties, {
        rootElement: template.xmlRoot || "properties",
        itemElement: template.xmlItem || "property",
        declaration: template.xmlDeclaration !== false,
        encoding: "UTF-8",
        prettyPrint: true,
        cdataFields: ["description", "perigrafi", "title", "titlos"],
      });
      
      fileBuffer = xmlToBuffer(xml);
      contentType = "application/xml; charset=utf-8";
      fileExtension = "xml";
    } else {
      // Generate CSV
      const headers = template.fieldMappings
        .filter(m => m.required || mappedProperties.some(p => p[m.portalField] !== null && p[m.portalField] !== undefined && p[m.portalField] !== ""))
        .map(m => m.portalField);
      
      const rows = mappedProperties.map(property => 
        headers.map(header => {
          const value = property[header];
          if (value === null || value === undefined) return "";
          if (Array.isArray(value)) return value.join(";");
          return String(value);
        })
      );
      
      const delimiter = template.csvDelimiter || ",";
      const csvContent = [
        headers.join(delimiter),
        ...rows.map(row => row.map(cell => {
          // Quote cells containing delimiter, quotes, or newlines
          if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(delimiter))
      ].join("\n");
      
      // Add BOM for UTF-8 if needed
      const bom = template.csvBom !== false ? "\uFEFF" : "";
      fileBuffer = Buffer.from(bom + csvContent, "utf-8");
      contentType = "text/csv; charset=utf-8";
      fileExtension = "csv";
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${template.id}_export_${timestamp}.${fileExtension}`;
    
    // Create audit log
    const auditLog = createExportAuditLog({
      userId: user.id,
      organizationId: orgId,
      exportType: "portal",
      format: template.format,
      rowCount: mappedProperties.length,
      filters: { 
        portal: portalId,
        status: statusFilter, 
        type: typeFilter, 
        search: searchQuery, 
        scope,
        ids: propertyIds,
      },
      success: true,
    });
    
    logExportEvent(auditLog);
    
    // Return file response
    const headers_response = getSecureDownloadHeaders(filename, template.format);
    
    return new Response(fileBuffer, {
      status: 200,
      headers: headers_response,
    });
    
  } catch (error) {
    console.error("[PORTAL_EXPORT_ERROR]", error);
    
    return NextResponse.json(
      { 
        error: "Export failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/portal/info - Get information about available portals
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    
    if (action === "list") {
      // Return list of available portals
      const portals = VALID_PORTALS.map(id => {
        const template = getPortalTemplate(id);
        return template ? {
          id: template.id,
          name: template.name,
          nameEl: template.nameEl,
          description: template.description,
          descriptionEl: template.descriptionEl,
          format: template.format,
          website: template.website,
          requiredFields: template.fieldMappings.filter(m => m.required).map(m => m.internalField),
          validation: template.validation,
        } : null;
      }).filter(Boolean);
      
      return NextResponse.json({ portals });
    }
    
    if (action === "validate") {
      // Validate properties for a specific portal
      const { portalId, propertyIds } = body;
      
      if (!portalId || !isValidPortalId(portalId)) {
        return NextResponse.json(
          { error: "Invalid portal ID" },
          { status: 400 }
        );
      }
      
      // Get auth
      const { userId: clerkUserId, orgId } = await auth();
      if (!clerkUserId || !orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const template = getPortalTemplate(portalId);
      if (!template) {
        return NextResponse.json(
          { error: "Portal not found" },
          { status: 404 }
        );
      }
      
      // Fetch properties
      const client = prismadb as unknown as { properties: { findMany: (args: unknown) => Promise<PropertyData[]> } };
      const properties = await client.properties.findMany({
        where: {
          organizationId: orgId,
          ...(propertyIds?.length ? { id: { in: propertyIds } } : {}),
        },
        take: 100, // Limit for validation
      });
      
      // Transform and validate
      const transformedProperties = properties.map(p => enhancePropertyWithComputed(p));
      const validationResults = validatePropertiesForPortal(transformedProperties, template);
      
      const summary = {
        total: validationResults.length,
        valid: validationResults.filter(r => r.valid).length,
        invalid: validationResults.filter(r => !r.valid).length,
        warnings: validationResults.reduce((sum, r) => sum + r.warnings.length, 0),
        errors: validationResults.reduce((sum, r) => sum + r.errors.length, 0),
      };
      
      return NextResponse.json({
        portal: portalId,
        summary,
        results: validationResults.slice(0, 10), // Return first 10 detailed results
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action", validActions: ["list", "validate"] },
      { status: 400 }
    );
    
  } catch (error) {
    console.error("[PORTAL_INFO_ERROR]", error);
    return NextResponse.json(
      { error: "Request failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

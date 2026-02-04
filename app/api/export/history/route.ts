/**
 * Export History API Route
 * 
 * GET: Fetch export history for an entity or organization
 * POST: Record a new export (typically called internally by export routes)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  getExportHistory,
  getEntityExportHistory,
  recordExport,
  detectChanges,
  type RecordExportParams,
} from "@/lib/export";
import type { ExportEntityType } from "@prisma/client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Valid entity types
const VALID_ENTITY_TYPES: ExportEntityType[] = [
  "PROPERTY",
  "CLIENT",
  "CALENDAR",
  "REPORT",
  "BULK_PROPERTIES",
  "BULK_CLIENTS",
];

/**
 * GET /api/export/history
 * 
 * Query params:
 * - entityType: PROPERTY | CLIENT | CALENDAR | REPORT | BULK_PROPERTIES | BULK_CLIENTS
 * - entityId: Optional specific entity ID
 * - limit: Number of records to return (default: 20)
 * - offset: Pagination offset (default: 0)
 * - detectChanges: "true" to include change detection (requires entityId and currentData)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId, orgId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization", message: "Organization context required" },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") as ExportEntityType | null;
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    
    // Validate entity type if provided
    if (entityType && !VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type", message: `Entity type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    
    // If fetching for a specific entity
    if (entityType && entityId) {
      const history = await getEntityExportHistory(entityType, entityId, {
        limit,
        organizationId: orgId,
      });
      
      // Check for changes if we have current data in the request
      const currentDataParam = searchParams.get("currentData");
      let changeDetection = null;
      
      if (currentDataParam) {
        try {
          const currentData = JSON.parse(currentDataParam);
          changeDetection = await detectChanges(entityType, entityId, currentData, {
            organizationId: orgId,
            locale,
          });
        } catch {
          // Ignore parsing errors for change detection
        }
      }
      
      return NextResponse.json({
        history,
        changeDetection,
        meta: {
          entityType,
          entityId,
          count: history.length,
        },
      });
    }
    
    // General history query with pagination
    const { records, total } = await getExportHistory({
      organizationId: orgId,
      entityType: entityType || undefined,
      limit,
      offset,
    });
    
    return NextResponse.json({
      history: records,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + records.length < total,
      },
    });
    
  } catch (error) {
    console.error("[EXPORT_HISTORY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch export history", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/export/history
 * 
 * Record a new export. Body should contain:
 * - entityType: PROPERTY | CLIENT | etc.
 * - entityId: The entity's ID
 * - entityIds?: Array of IDs for bulk exports
 * - exportFormat: xlsx | csv | pdf | xml
 * - exportTemplate?: CMA | SHORTLIST | ROI | MARKET_TRENDS
 * - destination?: client | xe.gr | spitogatos | etc.
 * - filename: The generated filename
 * - rowCount?: Number of rows exported
 * - entityData?: Current entity data for snapshot
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId, orgId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization", message: "Organization context required" },
        { status: 403 }
      );
    }
    
    // Get user ID from database
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.entityType || !body.entityId || !body.exportFormat || !body.filename) {
      return NextResponse.json(
        { error: "Missing required fields", message: "entityType, entityId, exportFormat, and filename are required" },
        { status: 400 }
      );
    }
    
    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(body.entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type", message: `Entity type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Record the export
    const params: RecordExportParams = {
      organizationId: orgId,
      userId: user.id,
      entityType: body.entityType,
      entityId: body.entityId,
      entityIds: body.entityIds || [],
      exportFormat: body.exportFormat,
      exportTemplate: body.exportTemplate || null,
      destination: body.destination || null,
      filename: body.filename,
      rowCount: body.rowCount || 1,
      entityData: body.entityData,
      customChangeFields: body.customChangeFields,
    };
    
    const record = await recordExport(params);
    
    return NextResponse.json({
      success: true,
      record,
    }, { status: 201 });
    
  } catch (error) {
    console.error("[EXPORT_HISTORY_POST]", error);
    return NextResponse.json(
      { error: "Failed to record export", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

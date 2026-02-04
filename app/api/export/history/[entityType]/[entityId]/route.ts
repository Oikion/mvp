/**
 * Export History API Route for Specific Entity
 * 
 * GET: Fetch export history and detect changes for a specific entity
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  getEntityExportHistory,
  detectChanges,
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
 * GET /api/export/history/[entityType]/[entityId]
 * 
 * Query params:
 * - limit: Number of records to return (default: 10)
 * - locale: en | el for change detection labels
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
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
    
    const { entityType, entityId } = await params;
    
    // Validate entity type
    const upperEntityType = entityType.toUpperCase() as ExportEntityType;
    if (!VALID_ENTITY_TYPES.includes(upperEntityType)) {
      return NextResponse.json(
        { error: "Invalid entity type", message: `Entity type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const locale = (searchParams.get("locale") || "en") as "en" | "el";
    
    // Fetch export history
    const history = await getEntityExportHistory(upperEntityType, entityId, {
      limit,
      organizationId: orgId,
    });
    
    // Fetch current entity data for change detection
    let currentData: Record<string, unknown> | null = null;
    let changeDetection = null;
    
    if (upperEntityType === "PROPERTY") {
      const property = await prismadb.properties.findFirst({
        where: { id: entityId, organizationId: orgId },
        select: {
          price: true,
          property_status: true,
          square_feet: true,
          bedrooms: true,
          description: true,
        },
      });
      if (property) {
        currentData = {
          price: property.price,
          property_status: property.property_status,
          square_feet: property.square_feet,
          bedrooms: property.bedrooms,
          description: property.description,
        };
      }
    } else if (upperEntityType === "CLIENT") {
      const client = await prismadb.clients.findFirst({
        where: { id: entityId, organizationId: orgId },
        select: {
          client_status: true,
          budget_min: true,
          budget_max: true,
          primary_email: true,
          primary_phone: true,
        },
      });
      if (client) {
        currentData = {
          client_status: client.client_status,
          budget_min: client.budget_min ? Number(client.budget_min) : null,
          budget_max: client.budget_max ? Number(client.budget_max) : null,
          primary_email: client.primary_email,
          primary_phone: client.primary_phone,
        };
      }
    }
    
    // Detect changes if we have current data and history
    if (currentData && history.length > 0) {
      changeDetection = await detectChanges(upperEntityType, entityId, currentData, {
        organizationId: orgId,
        locale,
      });
    }
    
    return NextResponse.json({
      history,
      currentData,
      changeDetection,
      meta: {
        entityType: upperEntityType,
        entityId,
        count: history.length,
      },
    });
    
  } catch (error) {
    console.error("[EXPORT_HISTORY_ENTITY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch export history", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";
import { prismadb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const check = await canPerformAction("property:update");
    if (!check.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await req.json();
    const { propertyIds, portalIds } = body as {
      propertyIds: string[];
      portalIds: string[];
    };

    if (!propertyIds || propertyIds.length === 0) {
      return NextResponse.json(
        { error: "Property IDs are required" },
        { status: 400 }
      );
    }

    if (!portalIds || portalIds.length === 0) {
      return NextResponse.json(
        { error: "Portal IDs are required" },
        { status: 400 }
      );
    }

    // Update all selected properties to PUBLIC visibility
    const result = await prismadb.properties.updateMany({
      where: {
        id: { in: propertyIds },
        organizationId, // Ensure user can only update their org's properties
      },
      data: {
        visibility: "PUBLIC",
        updatedAt: new Date(),
      },
    });

    // TODO: In a full implementation, this would also:
    // 1. Generate XML package in Unified Ad Format
    // 2. Create ZIP with images
    // 3. Call the xe.gr API endpoint

    return NextResponse.json({
      success: true,
      updated: result.count,
      portals: portalIds,
      message: `Successfully published ${result.count} properties`,
    });
  } catch (error: unknown) {
    console.error("[BULK_PUBLISH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

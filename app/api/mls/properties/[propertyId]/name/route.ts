// @ts-nocheck
// TODO: Fix type errors
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireAuth, requireOrg, handleGuardError } from "@/lib/permissions/action-guards";

/**
 * GET /api/mls/properties/[propertyId]/name
 *
 * Lightweight endpoint for fetching just the property name.
 * Used for breadcrumb navigation to display property names instead of UUIDs.
 *
 * Response: { name: string, id: string }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    // Auth check
    const authGuard = await requireAuth();
    if (authGuard) {
      return handleGuardError(authGuard);
    }

    const orgResult = await requireOrg();
    if ("error" in orgResult) {
      return NextResponse.json(
        { error: orgResult.error },
        { status: orgResult.status }
      );
    }

    const { organizationId } = orgResult;

    // Fetch only the name field for performance
    const property = await prismadb.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: property.id,
      name: property.title || "Untitled Property",
    });
  } catch (error) {
    console.error("[API] Error fetching property name:", error);
    return NextResponse.json(
      { error: "Failed to fetch property name" },
      { status: 500 }
    );
  }
}

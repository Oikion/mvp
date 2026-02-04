import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// NOTE: Tag functionality is not yet implemented in the database schema.
// These endpoints return empty responses until the Tag models are added.
// ============================================

interface RouteParams {
  params: Promise<{ entityType: string; entityId: string }>;
}

// ============================================
// GET /api/tags/entities/[entityType]/[entityId] - Get tags for an entity (stub)
// ============================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to satisfy Next.js 16 requirements
    await params;

    // Tag feature not yet implemented - return empty array
    return NextResponse.json([]);
  } catch (error) {
    console.error("[ENTITY_TAGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch entity tags" },
      { status: 500 }
    );
  }
}

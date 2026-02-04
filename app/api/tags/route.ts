import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// NOTE: Tag functionality is not yet implemented in the database schema.
// These endpoints return stub responses until the Tag models are added.
// ============================================

// ============================================
// GET /api/tags - List all tags for the organization (stub)
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Tag feature not yet implemented - return empty array
    return NextResponse.json([]);
  } catch (error) {
    console.error("[TAGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/tags - Create a new tag (stub)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!user || !organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Tag feature not yet implemented
    return NextResponse.json(
      { error: "Tag functionality is not yet available" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[TAGS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

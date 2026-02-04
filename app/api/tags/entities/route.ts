import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// NOTE: Tag functionality is not yet implemented in the database schema.
// These endpoints return empty/stub responses until the Tag models are added.
// ============================================

// ============================================
// POST /api/tags/entities - Tag an entity (stub)
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
    console.error("[TAG_ENTITY_POST]", error);
    return NextResponse.json(
      { error: "Failed to tag entity" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/tags/entities - Untag an entity (stub)
// ============================================

export async function DELETE(request: NextRequest) {
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
    console.error("[UNTAG_ENTITY_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to untag entity" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/tags/entities - Bulk update tags for an entity (stub)
// ============================================

export async function PUT(request: NextRequest) {
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
    console.error("[BULK_TAG_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }
}

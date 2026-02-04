import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// NOTE: Tag functionality is not yet implemented in the database schema.
// These endpoints return stub responses until the Tag models are added.
// ============================================

interface RouteParams {
  params: Promise<{ tagId: string }>;
}

// ============================================
// GET /api/tags/[tagId] - Get a single tag (stub)
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

    // Tag feature not yet implemented
    return NextResponse.json(
      { error: "Tag not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[TAG_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/tags/[tagId] - Update a tag (stub)
// ============================================

export async function PUT(
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

    // Tag feature not yet implemented
    return NextResponse.json(
      { error: "Tag functionality is not yet available" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[TAG_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/tags/[tagId] - Delete a tag (stub)
// ============================================

export async function DELETE(
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

    // Tag feature not yet implemented
    return NextResponse.json(
      { error: "Tag functionality is not yet available" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[TAG_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}

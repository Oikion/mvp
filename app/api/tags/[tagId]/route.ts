import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// Types
// ============================================

interface UpdateTagBody {
  name?: string;
  color?: string;
  category?: string | null;
  description?: string | null;
}

interface RouteParams {
  params: Promise<{ tagId: string }>;
}

// ============================================
// GET /api/tags/[tagId] - Get a single tag
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

    const { tagId } = await params;

    const tag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            propertyTags: true,
            clientTags: true,
            documentTags: true,
            eventTags: true,
            userTags: true,
            taskTags: true,
            dealTags: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...tag,
      usageCount:
        tag._count.propertyTags +
        tag._count.clientTags +
        tag._count.documentTags +
        tag._count.eventTags +
        tag._count.userTags +
        tag._count.taskTags +
        tag._count.dealTags,
    });
  } catch (error) {
    console.error("[TAG_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/tags/[tagId] - Update a tag
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

    const { tagId } = await params;
    const body: UpdateTagBody = await request.json();

    // Verify tag exists and belongs to organization
    const existingTag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // If updating name, check for conflicts
    if (body.name && body.name.trim() !== existingTag.name) {
      const conflictingTag = await prismadb.tag.findUnique({
        where: {
          name_organizationId: {
            name: body.name.trim(),
            organizationId,
          },
        },
      });

      if (conflictingTag) {
        return NextResponse.json(
          { error: "A tag with this name already exists" },
          { status: 409 }
        );
      }
    }

    const tag = await prismadb.tag.update({
      where: { id: tagId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.color && { color: body.color }),
        ...(body.category !== undefined && { category: body.category?.trim() || null }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("[TAG_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/tags/[tagId] - Delete a tag
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

    const { tagId } = await params;

    // Verify tag exists and belongs to organization
    const existingTag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Delete tag (cascade will handle junction tables)
    await prismadb.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TAG_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}

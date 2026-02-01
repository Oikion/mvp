import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// Types
// ============================================

interface CreateTagBody {
  name: string;
  color?: string;
  category?: string;
  description?: string;
}

// ============================================
// GET /api/tags - List all tags for the organization
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const tags = await prismadb.tag.findMany({
      where: {
        organizationId,
        ...(category && { category }),
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }),
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
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

    // Transform to include total usage count
    const tagsWithUsage = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      category: tag.category,
      description: tag.description,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      usageCount:
        tag._count.propertyTags +
        tag._count.clientTags +
        tag._count.documentTags +
        tag._count.eventTags +
        tag._count.userTags +
        tag._count.taskTags +
        tag._count.dealTags,
    }));

    return NextResponse.json(tagsWithUsage);
  } catch (error) {
    console.error("[TAGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/tags - Create a new tag
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

    const body: CreateTagBody = await request.json();
    const { name, color = "#6366f1", category, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    // Check if tag with same name already exists
    const existingTag = await prismadb.tag.findUnique({
      where: {
        name_organizationId: {
          name: name.trim(),
          organizationId,
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await prismadb.tag.create({
      data: {
        name: name.trim(),
        color,
        category: category?.trim() || null,
        description: description?.trim() || null,
        organizationId,
        createdBy: user.id,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("[TAGS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

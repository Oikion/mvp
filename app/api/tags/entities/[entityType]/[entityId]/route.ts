import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// Types
// ============================================

type EntityType = "property" | "client" | "document" | "event" | "user" | "task" | "deal";

interface RouteParams {
  params: Promise<{ entityType: EntityType; entityId: string }>;
}

// ============================================
// GET /api/tags/entities/[entityType]/[entityId] - Get tags for an entity
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

    const { entityType, entityId } = await params;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    let tags;

    switch (entityType) {
      case "property":
        tags = await prismadb.propertyTag.findMany({
          where: { propertyId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "client":
        tags = await prismadb.clientTag.findMany({
          where: { clientId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "document":
        tags = await prismadb.documentTag.findMany({
          where: { documentId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "event":
        tags = await prismadb.eventTag.findMany({
          where: { eventId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "user":
        tags = await prismadb.userTag.findMany({
          where: { userId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "task":
        tags = await prismadb.taskTag.findMany({
          where: { taskId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      case "deal":
        tags = await prismadb.dealTag.findMany({
          where: { dealId: entityId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                description: true,
                organizationId: true,
              },
            },
          },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid entity type" },
          { status: 400 }
        );
    }

    // Filter to only return tags from this organization and transform
    const orgTags = tags
      .filter((t) => t.tag.organizationId === organizationId)
      .map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
        category: t.tag.category,
        description: t.tag.description,
        taggedAt: t.createdAt,
      }));

    return NextResponse.json(orgTags);
  } catch (error) {
    console.error("[ENTITY_TAGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch entity tags" },
      { status: 500 }
    );
  }
}

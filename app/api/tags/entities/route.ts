import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

// ============================================
// Types
// ============================================

type EntityType = "property" | "client" | "document" | "event" | "user" | "task" | "deal";

interface TagEntityBody {
  tagId: string;
  entityId: string;
  entityType: EntityType;
}

interface UntagEntityBody {
  tagId: string;
  entityId: string;
  entityType: EntityType;
}

interface BulkTagBody {
  tagIds: string[];
  entityId: string;
  entityType: EntityType;
}

// ============================================
// Helper Functions
// ============================================

async function getJunctionTable(entityType: EntityType) {
  const tables = {
    property: prismadb.propertyTag,
    client: prismadb.clientTag,
    document: prismadb.documentTag,
    event: prismadb.eventTag,
    user: prismadb.userTag,
    task: prismadb.taskTag,
    deal: prismadb.dealTag,
  };
  return tables[entityType];
}

function getEntityIdField(entityType: EntityType) {
  const fields: Record<EntityType, string> = {
    property: "propertyId",
    client: "clientId",
    document: "documentId",
    event: "eventId",
    user: "userId",
    task: "taskId",
    deal: "dealId",
  };
  return fields[entityType];
}

// ============================================
// POST /api/tags/entities - Tag an entity
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

    const body: TagEntityBody = await request.json();
    const { tagId, entityId, entityType } = body;

    if (!tagId || !entityId || !entityType) {
      return NextResponse.json(
        { error: "tagId, entityId, and entityType are required" },
        { status: 400 }
      );
    }

    // Verify tag exists and belongs to organization
    const tag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    const idField = getEntityIdField(entityType);
    
    // Create the tag relationship based on entity type
    // Using raw Prisma operations for type safety
    let result;
    
    switch (entityType) {
      case "property":
        result = await prismadb.propertyTag.upsert({
          where: {
            propertyId_tagId: { propertyId: entityId, tagId },
          },
          create: { propertyId: entityId, tagId },
          update: {},
        });
        break;
      case "client":
        result = await prismadb.clientTag.upsert({
          where: {
            clientId_tagId: { clientId: entityId, tagId },
          },
          create: { clientId: entityId, tagId },
          update: {},
        });
        break;
      case "document":
        result = await prismadb.documentTag.upsert({
          where: {
            documentId_tagId: { documentId: entityId, tagId },
          },
          create: { documentId: entityId, tagId },
          update: {},
        });
        break;
      case "event":
        result = await prismadb.eventTag.upsert({
          where: {
            eventId_tagId: { eventId: entityId, tagId },
          },
          create: { eventId: entityId, tagId },
          update: {},
        });
        break;
      case "user":
        result = await prismadb.userTag.upsert({
          where: {
            userId_tagId: { userId: entityId, tagId },
          },
          create: { userId: entityId, tagId },
          update: {},
        });
        break;
      case "task":
        result = await prismadb.taskTag.upsert({
          where: {
            taskId_tagId: { taskId: entityId, tagId },
          },
          create: { taskId: entityId, tagId },
          update: {},
        });
        break;
      case "deal":
        result = await prismadb.dealTag.upsert({
          where: {
            dealId_tagId: { dealId: entityId, tagId },
          },
          create: { dealId: entityId, tagId },
          update: {},
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid entity type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("[TAG_ENTITY_POST]", error);
    return NextResponse.json(
      { error: "Failed to tag entity" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/tags/entities - Untag an entity
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

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType") as EntityType;

    if (!tagId || !entityId || !entityType) {
      return NextResponse.json(
        { error: "tagId, entityId, and entityType are required" },
        { status: 400 }
      );
    }

    // Verify tag exists and belongs to organization
    const tag = await prismadb.tag.findFirst({
      where: {
        id: tagId,
        organizationId,
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Delete the tag relationship based on entity type
    switch (entityType) {
      case "property":
        await prismadb.propertyTag.deleteMany({
          where: { propertyId: entityId, tagId },
        });
        break;
      case "client":
        await prismadb.clientTag.deleteMany({
          where: { clientId: entityId, tagId },
        });
        break;
      case "document":
        await prismadb.documentTag.deleteMany({
          where: { documentId: entityId, tagId },
        });
        break;
      case "event":
        await prismadb.eventTag.deleteMany({
          where: { eventId: entityId, tagId },
        });
        break;
      case "user":
        await prismadb.userTag.deleteMany({
          where: { userId: entityId, tagId },
        });
        break;
      case "task":
        await prismadb.taskTag.deleteMany({
          where: { taskId: entityId, tagId },
        });
        break;
      case "deal":
        await prismadb.dealTag.deleteMany({
          where: { dealId: entityId, tagId },
        });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid entity type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UNTAG_ENTITY_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to untag entity" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/tags/entities - Bulk update tags for an entity
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

    const body: BulkTagBody = await request.json();
    const { tagIds, entityId, entityType } = body;

    if (!tagIds || !entityId || !entityType) {
      return NextResponse.json(
        { error: "tagIds, entityId, and entityType are required" },
        { status: 400 }
      );
    }

    // Verify all tags exist and belong to organization
    const tags = await prismadb.tag.findMany({
      where: {
        id: { in: tagIds },
        organizationId,
      },
    });

    if (tags.length !== tagIds.length) {
      return NextResponse.json(
        { error: "Some tags not found" },
        { status: 404 }
      );
    }

    // Use a transaction to update tags atomically
    await prismadb.$transaction(async (tx) => {
      // Delete existing tags for this entity
      switch (entityType) {
        case "property":
          await tx.propertyTag.deleteMany({ where: { propertyId: entityId } });
          if (tagIds.length > 0) {
            await tx.propertyTag.createMany({
              data: tagIds.map((tagId) => ({ propertyId: entityId, tagId })),
            });
          }
          break;
        case "client":
          await tx.clientTag.deleteMany({ where: { clientId: entityId } });
          if (tagIds.length > 0) {
            await tx.clientTag.createMany({
              data: tagIds.map((tagId) => ({ clientId: entityId, tagId })),
            });
          }
          break;
        case "document":
          await tx.documentTag.deleteMany({ where: { documentId: entityId } });
          if (tagIds.length > 0) {
            await tx.documentTag.createMany({
              data: tagIds.map((tagId) => ({ documentId: entityId, tagId })),
            });
          }
          break;
        case "event":
          await tx.eventTag.deleteMany({ where: { eventId: entityId } });
          if (tagIds.length > 0) {
            await tx.eventTag.createMany({
              data: tagIds.map((tagId) => ({ eventId: entityId, tagId })),
            });
          }
          break;
        case "user":
          await tx.userTag.deleteMany({ where: { userId: entityId } });
          if (tagIds.length > 0) {
            await tx.userTag.createMany({
              data: tagIds.map((tagId) => ({ userId: entityId, tagId })),
            });
          }
          break;
        case "task":
          await tx.taskTag.deleteMany({ where: { taskId: entityId } });
          if (tagIds.length > 0) {
            await tx.taskTag.createMany({
              data: tagIds.map((tagId) => ({ taskId: entityId, tagId })),
            });
          }
          break;
        case "deal":
          await tx.dealTag.deleteMany({ where: { dealId: entityId } });
          if (tagIds.length > 0) {
            await tx.dealTag.createMany({
              data: tagIds.map((tagId) => ({ dealId: entityId, tagId })),
            });
          }
          break;
        default:
          throw new Error("Invalid entity type");
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BULK_TAG_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }
}

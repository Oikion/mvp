import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { SharedEntityType, SharePermission } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notifyEntityShared } from "@/lib/notifications/helpers";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "received" | "sent" | null;
    const entityType = searchParams.get("entityType") as SharedEntityType | null;

    let whereClause: any = {};

    if (type === "received") {
      whereClause = { sharedWithId: currentUser.id };
    } else if (type === "sent") {
      whereClause = { sharedById: currentUser.id };
    } else {
      whereClause = {
        OR: [{ sharedById: currentUser.id }, { sharedWithId: currentUser.id }],
      };
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    const shares = await prismadb.sharedEntity.findMany({
      where: whereClause,
      include: {
        Users_SharedEntity_sharedByIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        Users_SharedEntity_sharedWithIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to expected field names
    const mappedShares = shares.map((share) => ({
      ...share,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
      sharedWith: share.Users_SharedEntity_sharedWithIdToUsers,
    }));

    return NextResponse.json(mappedShares);
  } catch (error) {
    console.error("[SHARE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();

    const { entityType, entityId, sharedWithId, permissions, message } = body;

    // Validate required fields
    if (!entityType || !entityId || !sharedWithId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (currentUser.id === sharedWithId) {
      return new NextResponse("Cannot share with yourself", { status: 400 });
    }

    // Get current organization
    let organizationId: string | null = null;
    try {
      organizationId = await getCurrentOrgId();
    } catch {
      // User might not be in an org
    }

    // Verify entity ownership - user must be assigned OR be in the same organization
    let entityExists = false;
    let entityName = "";
    switch (entityType as SharedEntityType) {
      case "PROPERTY":
        const property = await prismadb.properties.findFirst({
          where: {
            id: entityId,
            OR: [
              { assigned_to: currentUser.id },
              ...(organizationId ? [{ organizationId }] : []),
            ],
          },
          select: { id: true, property_name: true },
        });
        entityExists = !!property;
        entityName = property?.property_name || "Property";
        break;
      case "CONTACT":
        const client = await prismadb.contact.findFirst({
          where: {
            id: entityId,
            OR: [
              { assignedAgentId: currentUser.id },
              ...(organizationId ? [{ organizationId }] : []),
            ],
          },
          select: { id: true, displayName: true },
        });
        entityExists = !!client;
        entityName = client?.displayName || "Client";
        break;
      case "DOCUMENT":
        const document = await prismadb.documents.findFirst({
          where: {
            id: entityId,
            OR: [
              { created_by_user: currentUser.id },
              { assigned_user: currentUser.id },
            ],
          },
          select: { id: true, document_name: true },
        });
        entityExists = !!document;
        entityName = document?.document_name || "Document";
        break;
    }

    if (!entityExists) {
      return new NextResponse("Entity not found or no permission", { status: 404 });
    }

    // Verify the recipient is a connection
    const connection = await prismadb.agentConnection.findFirst({
      where: {
        OR: [
          {
            followerId: currentUser.id,
            followingId: sharedWithId,
            status: "ACCEPTED",
          },
          {
            followerId: sharedWithId,
            followingId: currentUser.id,
            status: "ACCEPTED",
          },
        ],
      },
    });

    if (!connection) {
      return new NextResponse("You can only share with connections", { status: 403 });
    }

    // Check if already shared
    const existingShare = await prismadb.sharedEntity.findFirst({
      where: { entityType, entityId, sharedWithId },
    });

    if (existingShare) {
      return new NextResponse("Already shared with this user", { status: 400 });
    }

    const share = await prismadb.sharedEntity.create({
      data: {
        id: crypto.randomUUID(),
        entityType: entityType as SharedEntityType,
        entityId,
        sharedById: currentUser.id,
        sharedWithId,
        permissions: (permissions as SharePermission) || "VIEW_COMMENT",
        message: message || null,
      },
    });

    // Send notification
    try {
      await notifyEntityShared({
        entityType: entityType as SharedEntityType,
        entityId,
        entityName,
        sharedById: currentUser.id,
        sharedByName: currentUser.name || currentUser.email || "Someone",
        sharedWithId,
        organizationId: organizationId || "",
        message: message || undefined,
      });
    } catch (notifyError) {
      console.error("Failed to send share notification:", notifyError);
    }

    // Revalidate relevant paths so the recipient sees the shared item
    revalidatePath("/shared-with-me");
    revalidatePath("/mls/properties");
    revalidatePath("/crm/contacts");

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("[SHARE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

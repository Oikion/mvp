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
        sharedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        audience: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error("[SHARE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();

    const { entityType, entityId, sharedWithId, audienceId, permissions, message } = body;

    // Validate required fields
    if (!entityType || !entityId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Must have either sharedWithId (individual) or audienceId (audience)
    if (!sharedWithId && !audienceId) {
      return new NextResponse("Must specify either sharedWithId or audienceId", { status: 400 });
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
      case "CLIENT":
        const client = await prismadb.clients.findFirst({
          where: {
            id: entityId,
            OR: [
              { assigned_to: currentUser.id },
              ...(organizationId ? [{ organizationId }] : []),
            ],
          },
          select: { id: true, client_name: true },
        });
        entityExists = !!client;
        entityName = client?.client_name || "Client";
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

    // Handle audience-based sharing (bulk)
    if (audienceId) {
      // Verify audience exists and user has access
      const audience = await prismadb.audience.findFirst({
        where: {
          id: audienceId,
          OR: [
            { createdById: currentUser.id, organizationId: null },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
        include: {
          members: {
            select: { userId: true },
          },
        },
      });

      if (!audience) {
        return new NextResponse("Audience not found or no access", { status: 404 });
      }

      if (audience.members.length === 0) {
        return new NextResponse("Audience has no members", { status: 400 });
      }

      // Filter out self and already shared users
      const memberIds = audience.members
        .map((m) => m.userId)
        .filter((id) => id !== currentUser.id);

      // Get existing shares for this entity to filter out
      const existingShares = await prismadb.sharedEntity.findMany({
        where: {
          entityType: entityType as SharedEntityType,
          entityId,
          sharedWithId: { in: memberIds },
        },
        select: { sharedWithId: true },
      });
      const alreadySharedIds = new Set(existingShares.map((s) => s.sharedWithId));
      
      const newMemberIds = memberIds.filter((id) => !alreadySharedIds.has(id));

      if (newMemberIds.length === 0) {
        return new NextResponse("Already shared with all audience members", { status: 400 });
      }

      // Create shares for all new members
      const shares = await prismadb.sharedEntity.createMany({
        data: newMemberIds.map((userId) => ({
          entityType: entityType as SharedEntityType,
          entityId,
          sharedById: currentUser.id,
          sharedWithId: userId,
          audienceId: audience.id,
          permissions: (permissions as SharePermission) || "VIEW_COMMENT",
          message: message || null,
        })),
        skipDuplicates: true,
      });

      // Send notifications to all new recipients
      for (const userId of newMemberIds) {
        try {
          await notifyEntityShared({
            entityType: entityType as SharedEntityType,
            entityId,
            entityName,
            sharedById: currentUser.id,
            sharedByName: currentUser.name || currentUser.email || "Someone",
            sharedWithId: userId,
            organizationId: organizationId || "",
            message: message || undefined,
          });
        } catch (notifyError) {
          console.error(`Failed to notify user ${userId}:`, notifyError);
        }
      }

      // Revalidate relevant paths
      revalidatePath("/shared-with-me");
      revalidatePath("/mls/properties");
      revalidatePath("/crm/clients");

      return NextResponse.json(
        { 
          success: true, 
          sharedCount: shares.count,
          audienceName: audience.name,
        }, 
        { status: 201 }
      );
    }

    // Individual sharing logic (original behavior)
    if (currentUser.id === sharedWithId) {
      return new NextResponse("Cannot share with yourself", { status: 400 });
    }

    // Verify connection exists (for individual shares)
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

    // Also check if sharedWithId is in an audience the user has access to
    const audienceWithMember = await prismadb.audienceMember.findFirst({
      where: {
        userId: sharedWithId,
        audience: {
          OR: [
            { createdById: currentUser.id, organizationId: null },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
      },
    });

    if (!connection && !audienceWithMember) {
      return new NextResponse("You can only share with connections or audience members", { status: 403 });
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
    revalidatePath("/crm/clients");

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("[SHARE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

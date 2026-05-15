import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { encryptPropertyCommentForOrg, decryptPropertyCommentForOrg } from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
import { notifyCommentAdded } from "@/lib/notifications/helpers";

/**
 * GET /api/mls/properties/[propertyId]/comments
 * Fetch comments for a property (accessible to org members and sharees)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Check access: either org member or shared with user
    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: { id: true, organizationId: true },
    });

    let hasAccess = !!property;
    let propertyOrgId = property?.organizationId ?? organizationId;

    if (!hasAccess) {
      // Check if shared with user
      const share = await prismadb.sharedEntity.findFirst({
        where: {
          entityType: "PROPERTY",
          entityId: propertyId,
          sharedWithId: user.id,
        },
        select: { id: true },
      });
      hasAccess = !!share;
      if (hasAccess) {
        // Fetch property's owning org for correct DEK selection
        const sharedProp = await prismadb.properties.findUnique({
          where: { id: propertyId },
          select: { organizationId: true },
        });
        if (sharedProp) propertyOrgId = sharedProp.organizationId;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch comments
    const comments = await prismadb.propertyComment.findMany({
      where: { propertyId },
      include: {
        Users: {
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

    const encryptionMode = await getOrgEncryptionMode(propertyOrgId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    if (isE2EE) {
      return NextResponse.json({
        comments: comments.map((c) => ({ ...c, user: c.Users, isEncrypted: c.entitySessionId !== null })),
        encryptionMode: "E2EE",
      });
    }

    return NextResponse.json({
      comments: await Promise.all(comments.map(async (c) => ({
        ...await decryptPropertyCommentForOrg(c, propertyOrgId),
        user: c.Users,
        isEncrypted: c.entitySessionId !== null,
      }))),
      encryptionMode: "STANDARD",
    });
  } catch (error) {
    console.error("[PROPERTY_COMMENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mls/properties/[propertyId]/comments
 * Add a comment to a property
 * - Org members can always comment
 * - Sharees can comment only if they have VIEW_COMMENT permission
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { propertyId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Check access and permissions
    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: { id: true, organizationId: true, property_name: true, assigned_to: true },
    });

    let canComment = !!property; // Org members can always comment
    let propertyName = property?.property_name;
    let propertyOrgId = property?.organizationId ?? organizationId;
    let propertyAssignedTo = property?.assigned_to ?? null;

    if (!canComment) {
      // Check if shared with VIEW_COMMENT permission
      const share = await prismadb.sharedEntity.findFirst({
        where: {
          entityType: "PROPERTY",
          entityId: propertyId,
          sharedWithId: user.id,
          permissions: "VIEW_COMMENT", // Only allow if VIEW_COMMENT
        },
        select: { id: true, sharedById: true },
      });

      if (share) {
        canComment = true;
        // Fetch property name, assignee, and owning org for notification and DEK selection
        const sharedProperty = await prismadb.properties.findUnique({
          where: { id: propertyId },
          select: { property_name: true, organizationId: true, assigned_to: true },
        });
        propertyName = sharedProperty?.property_name;
        if (sharedProperty) {
          propertyOrgId = sharedProperty.organizationId;
          propertyAssignedTo = sharedProperty.assigned_to ?? null;
        }
      }
    }

    if (!canComment) {
      return NextResponse.json(
        { error: "You don't have permission to comment on this property" },
        { status: 403 }
      );
    }

    const encryptionMode = await getOrgEncryptionMode(propertyOrgId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      const { entitySessionId: sid, messageIndex: idx } = body;
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }

      // Validate entitySessionId belongs to this entity
      const sessionOwnership = await prismadb.entitySession.findFirst({
        where: {
          id: sid,
          entityType: "PROPERTY",
          entityId: propertyId,
          orgId: propertyOrgId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!sessionOwnership) {
        return NextResponse.json(
          { error: "entitySessionId does not match this entity or is not active" },
          { status: 400 }
        );
      }

      if (!Number.isInteger(idx) || idx < 0) {
        return NextResponse.json(
          { error: "messageIndex must be a non-negative integer" },
          { status: 400 }
        );
      }

      const updated = await prismadb.entitySession.updateMany({
        where: {
          id: sid,
          OR: [
            { lastMessageIndex: null },
            { lastMessageIndex: { lt: idx } },
          ],
        },
        data: { lastMessageIndex: idx },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { error: "messageIndex is not monotonically increasing" },
          { status: 400 }
        );
      }

      commentContent = content.trim();
      if (!commentContent.includes(":")) {
        return NextResponse.json(
          { error: "Invalid encrypted content format" },
          { status: 400 }
        );
      }
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      if (content.length > 2000) {
        return NextResponse.json(
          { error: "Comment is too long (max 2000 characters)" },
          { status: 400 }
        );
      }
      const { content: encryptedContent } = await encryptPropertyCommentForOrg(
        { content: content.trim() },
        propertyOrgId
      );
      commentContent = encryptedContent ?? content.trim();
    }

    // Create comment
    const comment = await prismadb.propertyComment.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        userId: user.id,
        content: commentContent,
        entitySessionId,
        messageIndex,
        updatedAt: new Date(),
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Notify assignee — fire-and-forget
    void notifyCommentAdded({
      entityType: "PROPERTY",
      entityId: propertyId,
      entityName: propertyName ?? "Property",
      commentPreview: content.slice(0, 100) + (content.length > 100 ? "…" : ""),
      organizationId: propertyOrgId,
      actorId: user.id,
      actorName: user.name ?? user.email ?? "Someone",
      assigneeId: propertyAssignedTo,
    }).catch((err) => console.error("[PROPERTY_COMMENT_NOTIFY]", err));

    const responseComment = isE2EE
      ? comment
      : await decryptPropertyCommentForOrg(comment, propertyOrgId);
    return NextResponse.json({ comment: { ...responseComment, user: comment.Users } }, { status: 201 });
  } catch (error) {
    console.error("[PROPERTY_COMMENTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mls/properties/[propertyId]/comments?commentId=xxx
 * Delete a comment (only by the comment author)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { propertyId } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!propertyId || !commentId) {
      return NextResponse.json(
        { error: "Property ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to user
    const comment = await prismadb.propertyComment.findFirst({
      where: {
        id: commentId,
        propertyId,
        userId: user.id, // Only author can delete
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    await prismadb.propertyComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROPERTY_COMMENTS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}















import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import {
  encryptMandateCommentForOrg,
  decryptMandateCommentForOrg,
} from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";

/**
 * GET /api/mandates/[mandateId]/comments
 * Fetch comments for a mandate
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to this organization
    const mandate = await prismadb.mandate.findFirst({
      where: {
        id: mandateId,
        organizationId,
      },
      select: { id: true, organizationId: true },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch comments
    const comments = await prismadb.mandateComment.findMany({
      where: { mandateId },
      include: {
        user: {
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

    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    if (isE2EE) {
      return NextResponse.json({
        comments: comments.map((c) => ({ ...c, user: c.user, isEncrypted: c.entitySessionId !== null })),
        encryptionMode: "E2EE",
      });
    }

    return NextResponse.json({
      comments: await Promise.all(
        comments.map(async (c) => ({
          ...(await decryptMandateCommentForOrg(c, organizationId)),
          user: c.user,
          isEncrypted: c.entitySessionId !== null,
        }))
      ),
      encryptionMode: "STANDARD",
    });
  } catch (error) {
    console.error("[MANDATE_COMMENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mandates/[mandateId]/comments
 * Add a comment to a mandate
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID is required" },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to this organization
    const mandate = await prismadb.mandate.findFirst({
      where: {
        id: mandateId,
        organizationId,
      },
      select: { id: true, organizationId: true },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    const encryptionMode = await getOrgEncryptionMode(organizationId);
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

      // Task 1.5 (C2): Validate entitySessionId belongs to this entity
      const sessionOwnership = await prismadb.entitySession.findFirst({
        where: {
          id: sid,
          entityType: "MANDATE",
          entityId: mandateId,
          orgId: organizationId,
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

      // Task 2.2 (C3): Validate messageIndex is non-negative integer + enforce monotonicity
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
      const { content: encryptedContent } = await encryptMandateCommentForOrg(
        { content: content.trim() },
        organizationId
      );
      commentContent = encryptedContent ?? content.trim();
    }

    // Create comment
    const comment = await prismadb.mandateComment.create({
      data: {
        id: crypto.randomUUID(),
        mandateId,
        userId: user.id,
        content: commentContent,
        entitySessionId,
        messageIndex,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    const responseComment = isE2EE
      ? comment
      : await decryptMandateCommentForOrg(comment, organizationId);

    return NextResponse.json(
      { comment: { ...responseComment, user: comment.user } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MANDATE_COMMENTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mandates/[mandateId]/comments?commentId=xxx
 * Delete a comment (only by the comment author)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { mandateId } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!mandateId || !commentId) {
      return NextResponse.json(
        { error: "Mandate ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to user
    const comment = await prismadb.mandateComment.findFirst({
      where: {
        id: commentId,
        mandateId,
        userId: user.id, // Only author can delete
      },
    });

    if (!comment) {
      return NextResponse.json(
        {
          error:
            "Comment not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    await prismadb.mandateComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MANDATE_COMMENTS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

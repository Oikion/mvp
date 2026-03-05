import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import {
  encryptMandateCommentForOrg,
  decryptMandateCommentForOrg,
} from "@/lib/model-encryption";

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

    return NextResponse.json({
      comments: await Promise.all(
        comments.map(async (c) => ({
          ...(await decryptMandateCommentForOrg(c, organizationId)),
          user: c.Users,
        }))
      ),
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

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Comment is too long (max 2000 characters)" },
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

    // Encrypt comment content with the org DEK
    const { content: encryptedContent } = await encryptMandateCommentForOrg(
      { content: content.trim() },
      organizationId
    );

    // Create comment
    const comment = await prismadb.mandateComment.create({
      data: {
        id: crypto.randomUUID(),
        mandateId,
        userId: user.id,
        content: encryptedContent ?? content.trim(),
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

    const decryptedComment = await decryptMandateCommentForOrg(
      comment,
      organizationId
    );

    return NextResponse.json(
      { comment: { ...decryptedComment, user: comment.Users } },
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

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/crm/clients/[clientId]/comments
 * Fetch comments for a client (accessible to org members and sharees)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Check access: either org member or shared with user
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: { id: true },
    });

    let hasAccess = !!client;

    if (!hasAccess) {
      // Check if shared with user
      const share = await prismadb.sharedEntity.findFirst({
        where: {
          entityType: "CLIENT",
          entityId: clientId,
          sharedWithId: user.id,
        },
        select: { id: true },
      });
      hasAccess = !!share;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch comments
    const comments = await prismadb.clientComment.findMany({
      where: { clientId },
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
      comments: comments.map(c => ({ ...c, user: c.Users }))
    });
  } catch (error) {
    console.error("[CLIENT_COMMENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients/[clientId]/comments
 * Add a comment to a client
 * - Org members can always comment
 * - Sharees can comment only if they have VIEW_COMMENT permission
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { clientId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
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

    // Check access and permissions
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: { id: true, client_name: true },
    });

    let canComment = !!client; // Org members can always comment
    let clientName = client?.client_name;

    if (!canComment) {
      // Check if shared with VIEW_COMMENT permission
      const share = await prismadb.sharedEntity.findFirst({
        where: {
          entityType: "CLIENT",
          entityId: clientId,
          sharedWithId: user.id,
          permissions: "VIEW_COMMENT", // Only allow if VIEW_COMMENT
        },
        select: { id: true, sharedById: true },
      });

      if (share) {
        canComment = true;
        // Fetch client name for notification
        const sharedClient = await prismadb.clients.findUnique({
          where: { id: clientId },
          select: { client_name: true },
        });
        clientName = sharedClient?.client_name;
      }
    }

    if (!canComment) {
      return NextResponse.json(
        { error: "You don't have permission to comment on this client" },
        { status: 403 }
      );
    }

    // Create comment
    const comment = await prismadb.clientComment.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        userId: user.id,
        content: content.trim(),
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

    return NextResponse.json({ comment: { ...comment, user: comment.Users } }, { status: 201 });
  } catch (error) {
    console.error("[CLIENT_COMMENTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/clients/[clientId]/comments?commentId=xxx
 * Delete a comment (only by the comment author)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { clientId } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!clientId || !commentId) {
      return NextResponse.json(
        { error: "Client ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to user
    const comment = await prismadb.clientComment.findFirst({
      where: {
        id: commentId,
        clientId,
        userId: user.id, // Only author can delete
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    await prismadb.clientComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLIENT_COMMENTS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}















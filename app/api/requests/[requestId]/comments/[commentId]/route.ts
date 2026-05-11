import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ requestId: string; commentId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, commentId } = await params;

    const deleteCheck = await canPerformAction("request:delete");
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Resolve friendlyId → id and verify org ownership
    const request = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true },
    });
    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const comment = await prismadb.requestComment.findFirst({
      where: { id: commentId, requestId: request.id },
      select: { id: true, userId: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author or org owners/admins may delete
    const currentUser = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true, is_account_admin: true, is_admin: true },
    });
    const canDelete =
      comment.userId === currentUser?.id ||
      currentUser?.is_account_admin === true ||
      currentUser?.is_admin === true;

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prismadb.requestComment.delete({ where: { id: commentId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[REQUEST_COMMENT_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

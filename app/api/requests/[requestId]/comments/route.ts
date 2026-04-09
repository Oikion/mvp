import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions";
import { encryptRequestCommentForOrg, decryptRequestCommentForOrg } from "@/lib/model-encryption";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Resolve friendlyId → id
    const request = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true },
    });
    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const comments = await prismadb.requestComment.findMany({
      where: { requestId: request.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Decrypt comment content
    const decrypted = [];
    for (const comment of comments) {
      try {
        decrypted.push(await decryptRequestCommentForOrg(comment, organizationId));
      } catch (err) {
        console.error(`[REQUEST_COMMENTS_GET] Failed to decrypt comment ${comment.id}:`, err);
      }
    }

    return NextResponse.json(decrypted);
  } catch (error) {
    console.error("[REQUEST_COMMENTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const commentCheck = await canPerformAction("request:add_comment");
    if (!commentCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Resolve friendlyId → id
    const request = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true },
    });
    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Encrypt comment content
    const encrypted = await encryptRequestCommentForOrg(
      { content: body.content.trim() },
      organizationId
    );

    const comment = await prismadb.requestComment.create({
      data: {
        requestId: request.id,
        userId: user.id,
        content: encrypted.content!,
        entitySessionId: body.entitySessionId ?? null,
        messageIndex: body.messageIndex ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Return decrypted content, not ciphertext
    const decrypted = await decryptRequestCommentForOrg(comment, organizationId);
    return NextResponse.json(decrypted, { status: 201 });
  } catch (error) {
    console.error("[REQUEST_COMMENTS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

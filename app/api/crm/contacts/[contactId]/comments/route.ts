import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions";
import {
  encryptContactCommentForOrg,
  decryptContactCommentForOrg,
} from "@/lib/model-encryption";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const readCheck = await canPerformAction("contact:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;

    // Verify contact belongs to org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const comments = await prismadb.contactComment.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, id: true, avatar: true } },
      },
    });

    // Decrypt comment content
    const decrypted = [];
    for (const comment of comments) {
      try {
        decrypted.push(await decryptContactCommentForOrg(comment, organizationId));
      } catch (err) {
        console.error(`[CONTACT_COMMENTS_GET] Failed to decrypt comment ${comment.id}:`, err);
      }
    }

    return NextResponse.json({ data: decrypted });
  } catch (error) {
    console.error("[CONTACT_COMMENTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const commentCheck = await canPerformAction("contact:add_comment");
    if (!commentCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;
    const body = await req.json();

    const validation = commentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify contact belongs to org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const encrypted = await encryptContactCommentForOrg(
      { content: validation.data.content },
      organizationId
    );

    const comment = await prismadb.contactComment.create({
      data: {
        contactId,
        userId: user.id,
        content: encrypted.content!,
      },
      include: {
        user: { select: { name: true, id: true, avatar: true } },
      },
    });

    // Decrypt before returning so the caller gets plaintext, not ciphertext
    const decrypted = await decryptContactCommentForOrg(comment, organizationId);
    return NextResponse.json({ data: decrypted }, { status: 201 });
  } catch (error) {
    console.error("[CONTACT_COMMENTS_POST]", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const deleteCheck = await canPerformAction("contact:delete_comment");
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    // Verify contact belongs to org and comment belongs to contact
    const comment = await prismadb.contactComment.findFirst({
      where: {
        id: commentId,
        contactId,
        contact: { organizationId },
      },
      select: { id: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await prismadb.contactComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_COMMENTS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

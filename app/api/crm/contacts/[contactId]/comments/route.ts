import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions";
import {
  encryptContactCommentForOrg,
  decryptContactCommentForOrg,
  decryptContactForOrg,
} from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";
import { z } from "zod";
import { notifyCommentAdded } from "@/lib/notifications/helpers";

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  entitySessionId: z.string().optional(),
  messageIndex: z.number().int().min(0).optional(),
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
        user: { select: { name: true, id: true, avatar: true, email: true } },
      },
    });

    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    if (isE2EE) {
      // E2EE: return ciphertext + session metadata — client decrypts
      return NextResponse.json({
        comments: comments.map((c) => ({
          ...c,
          Users: c.user,
          isEncrypted: c.entitySessionId !== null,
        })),
        encryptionMode: "E2EE",
      });
    }

    // Standard: server-side decryption
    const decrypted = [];
    for (const comment of comments) {
      try {
        decrypted.push(await decryptContactCommentForOrg(comment, organizationId));
      } catch (err) {
        console.error(`[CONTACT_COMMENTS_GET] Failed to decrypt comment ${comment.id}:`, err);
      }
    }

    return NextResponse.json({
      comments: decrypted.map((c) => ({ ...c, Users: (c as any).user, isEncrypted: (c as any).entitySessionId !== null })),
      encryptionMode: "STANDARD",
    });
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

    const { content, entitySessionId: sid, messageIndex: idx } = validation.data;

    // Verify contact belongs to org
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, displayName: true, assignedAgentId: true, createdBy: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const decryptedContact = await decryptContactForOrg(contact, organizationId);

    // Determine encryption mode
    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }

      // Verify session belongs to this contact and org
      const sessionOwnership = await prismadb.entitySession.findFirst({
        where: {
          id: sid,
          entityType: "CONTACT",
          entityId: contactId,
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

      if (!Number.isInteger(idx) || idx < 0) {
        return NextResponse.json(
          { error: "messageIndex must be a non-negative integer" },
          { status: 400 }
        );
      }

      // Enforce monotonicity: only advance if idx is strictly greater than lastMessageIndex
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
      const { content: encrypted } = await encryptContactCommentForOrg(
        { content: content.trim() },
        organizationId
      );
      commentContent = encrypted ?? content.trim();
    }

    const comment = await prismadb.contactComment.create({
      data: {
        contactId,
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

    // Notify assignee and owner — fire-and-forget
    void notifyCommentAdded({
      entityType: "CONTACT",
      entityId: contactId,
      entityName: decryptedContact.displayName ?? "Contact",
      commentPreview: content.slice(0, 100) + (content.length > 100 ? "…" : ""),
      organizationId,
      actorId: user.id,
      actorName: user.name ?? user.email ?? "Someone",
      assigneeId: contact.assignedAgentId ?? null,
      entityOwnerId: contact.createdBy ?? null,
    }).catch((err) => console.error("[CONTACT_COMMENT_NOTIFY]", err));

    // For Standard orgs, decrypt before returning to client
    const responseComment = isE2EE
      ? comment
      : await decryptContactCommentForOrg(comment, organizationId);

    return NextResponse.json(
      { comment: { ...responseComment, Users: comment.user } },
      { status: 201 }
    );
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
    const deleteCheck = await canPerformAction("contact:update");
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const organizationId = await getCurrentOrgId();
    const user = await getCurrentUser();
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
      select: { id: true, userId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author can delete
    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this comment" },
        { status: 403 }
      );
    }

    await prismadb.contactComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT_COMMENTS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

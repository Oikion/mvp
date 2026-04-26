import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import {
  encryptContactCommentForOrg,
  decryptContactCommentForOrg,
} from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";

/**
 * DEPRECATED: Use /api/crm/contacts/[contactId]/comments instead
 * 
 * This endpoint remains for backward compatibility but redirects to the Contact model.
 * GET /api/crm/clients/[clientId]/comments
 * Fetch comments for a contact (legacy clients endpoint)
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
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Verify contact exists in org
    const contact = await prismadb.contact.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch comments
    const comments = await prismadb.contactComment.findMany({
      where: { contactId: clientId },
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
      // E2EE: return ciphertext + session metadata — client decrypts
      return NextResponse.json({
        comments: comments.map((c) => ({
          ...c,
          isEncrypted: c.entitySessionId !== null,
        })),
        encryptionMode: "E2EE",
      });
    }

    // Standard: server-side decryption
    const decryptedComments = await Promise.all(
      comments.map((c) => decryptContactCommentForOrg(c, organizationId))
    );

    return NextResponse.json({
      comments: decryptedComments.map((c) => ({ ...c, isEncrypted: (c as any).entitySessionId !== null })),
      encryptionMode: "STANDARD",
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
 * Add a comment to a contact (legacy clients endpoint)
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
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Check access
    const contact = await prismadb.contact.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "You don't have permission to comment on this contact" },
        { status: 403 }
      );
    }

    // Determine encryption mode for this org
    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      // E2EE: client sends pre-encrypted content (iv:ciphertext) + session metadata.
      // Skip server-side length validation — ciphertext is larger than plaintext.
      // Plaintext length is validated client-side before encryption.
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
          entityType: "CONTACT",
          entityId: clientId,
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

      // Validate messageIndex monotonicity
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

      commentContent = content.trim(); // Already ciphertext (iv:ciphertext format)
      if (!commentContent.includes(":")) {
        return NextResponse.json(
          { error: "Invalid encrypted content format" },
          { status: 400 }
        );
      }
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      // Standard: validate length then server-side Layer 1 encryption
      if (content.length > 5000) {
        return NextResponse.json(
          { error: "Comment is too long (max 5000 characters)" },
          { status: 400 }
        );
      }
      const { content: encrypted } = await encryptContactCommentForOrg(
        { content: content.trim() },
        organizationId
      );
      commentContent = encrypted ?? content.trim();
    }

    // Create comment
    const comment = await prismadb.contactComment.create({
      data: {
        id: crypto.randomUUID(),
        contactId: clientId,
        userId: user.id,
        content: commentContent,
        entitySessionId,
        messageIndex,
        createdAt: new Date(),
        updatedAt: new Date(),
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

    // For Standard orgs, decrypt before returning to client
    const responseComment = isE2EE
      ? comment
      : await decryptContactCommentForOrg(comment, organizationId);

    return NextResponse.json(
      { comment: responseComment },
      { status: 201 }
    );
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
        { error: "Contact ID and Comment ID are required" },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to user
    const comment = await prismadb.contactComment.findFirst({
      where: {
        id: commentId,
        contactId: clientId,
        userId: user.id, // Only author can delete
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    await prismadb.contactComment.delete({
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

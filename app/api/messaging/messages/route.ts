import { after } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { encryptMessageForOrg, decryptMessageForOrg } from "@/lib/model-encryption";
import { logPiiAccess } from "@/lib/pii-access-log";
import { notifyNewMessage, notifyMention } from "@/actions/messaging/notifications";
import { publishToChannel, getChannelName, getConversationChannelName, getUserChannelName } from "@/lib/ably";
import { sendEmailReply, getEmailChannelForConversation } from "@/lib/email/outbound-relay";

/**
 * POST /api/messaging/messages
 * 
 * Send a message to a channel or conversation.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { channelId, conversationId, content, parentId, attachments, mentions, entityAttachment } = body;

    if (!channelId && !conversationId) {
      return NextResponse.json(
        { error: "Channel or conversation ID is required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || (!content.trim() && !attachments?.length && !entityAttachment)) {
      return NextResponse.json(
        { error: "Message content or attachments are required" },
        { status: 400 }
      );
    }

    const organizationId = await getCurrentOrgId();

    // Get sender info (avatar/profile needed for recipient-side optimistic render)
    const sender = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        username: true,
        AgentProfile: { select: { visibility: true, slug: true } },
      },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SECURITY: Verify channel/conversation belongs to user's organization
    if (channelId) {
      const channel = await prismadb.channel.findFirst({
        where: {
          id: channelId,
          organizationId, // ← CRITICAL: Verify tenant ownership
        },
        select: { id: true },
      });

      if (!channel) {
        return NextResponse.json(
          { error: "Channel not found or access denied" },
          { status: 404 }
        );
      }

      // Verify user is a member of the channel
      const membership = await prismadb.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId: sender.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this channel" },
          { status: 403 }
        );
      }
    }

    let conversationScope: string = "ORG";
    let conversationParticipantIds: string[] = [];
    if (conversationId) {
      // Security: verify participant membership (not org ownership — DMs are cross-org)
      const conversation = await prismadb.conversation.findFirst({
        where: { id: conversationId },
        select: {
          id: true,
          scope: true,
          participants: { where: { leftAt: null }, select: { userId: true } },
        },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 404 }
        );
      }

      conversationScope = conversation.scope;
      conversationParticipantIds = conversation.participants.map(p => p.userId);

      if (!conversationParticipantIds.includes(sender.id)) {
        return NextResponse.json(
          { error: "You are not a participant of this conversation" },
          { status: 403 }
        );
      }
    }

    // SECURITY: Validate content length (max 10KB to prevent DB issues)
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Message content exceeds maximum length (10,000 characters)" },
        { status: 400 }
      );
    }

    // SECURITY: Validate attachments count and mentions count to prevent spam
    if (attachments && attachments.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 attachments per message" },
        { status: 400 }
      );
    }

    if (mentions !== undefined) {
      if (!Array.isArray(mentions) || !mentions.every((m: unknown) => typeof m === "string")) {
        return NextResponse.json({ error: "Invalid mentions format" }, { status: 400 });
      }
      if (mentions.length > 50) {
        return NextResponse.json({ error: "Maximum 50 mentions per message" }, { status: 400 });
      }
    }

    // Validate and gate entity attachment
    const VALID_LINKED_ENTITY_TYPES = ["PROPERTY", "CONTACT", "REQUEST", "DOCUMENT"] as const;
    type LinkedEntityType = (typeof VALID_LINKED_ENTITY_TYPES)[number];

    let validatedEntityAttachment: {
      linkedEntityId: string;
      linkedEntityType: LinkedEntityType;
      linkedEntityTitle?: string;
      linkedEntitySubtitle?: string;
      linkedEntityFriendlyId?: string;
    } | null = null;

    if (entityAttachment) {
      // Normalize lowercase client EntityType ("property") to uppercase Prisma enum ("PROPERTY")
      const normalizedType = typeof entityAttachment.type === "string"
        ? entityAttachment.type.toUpperCase()
        : entityAttachment.type;

      if (
        typeof entityAttachment !== "object" ||
        typeof entityAttachment.id !== "string" ||
        !VALID_LINKED_ENTITY_TYPES.includes(normalizedType)
      ) {
        return NextResponse.json({ error: "Invalid entity attachment" }, { status: 400 });
      }

      // SECURITY: Verify entity belongs to sender's org AND is not HIDDEN.
      // Both checks are required: visibility alone doesn't enforce org ownership.
      const entityType: LinkedEntityType = normalizedType as LinkedEntityType;
      if (entityType === "PROPERTY") {
        const prop = await prismadb.properties.findFirst({
          where: { id: entityAttachment.id, organizationId, visibility: { not: "HIDDEN" } },
          select: { id: true },
        });
        if (!prop) return NextResponse.json({ error: "Entity not shareable" }, { status: 403 });
      } else if (entityType === "CONTACT") {
        const contact = await prismadb.contact.findFirst({
          where: { id: entityAttachment.id, organizationId, visibility: { not: "HIDDEN" } },
          select: { id: true },
        });
        if (!contact) return NextResponse.json({ error: "Entity not shareable" }, { status: 403 });
      } else if (entityType === "REQUEST") {
        const request = await prismadb.request.findFirst({
          where: { id: entityAttachment.id, organizationId, visibility: { not: "HIDDEN" } },
          select: { id: true },
        });
        if (!request) return NextResponse.json({ error: "Entity not shareable" }, { status: 403 });
      } else if (entityType === "DOCUMENT") {
        const document = await prismadb.documents.findFirst({
          where: { id: entityAttachment.id, organizationId },
          select: { id: true },
        });
        if (!document) return NextResponse.json({ error: "Entity not shareable" }, { status: 403 });
      }

      validatedEntityAttachment = {
        linkedEntityId: entityAttachment.id,
        linkedEntityType: entityType,
        linkedEntityTitle: typeof entityAttachment.title === "string" ? entityAttachment.title : undefined,
        linkedEntitySubtitle: typeof entityAttachment.subtitle === "string" ? entityAttachment.subtitle : undefined,
        linkedEntityFriendlyId: typeof entityAttachment.friendlyId === "string" ? entityAttachment.friendlyId : undefined,
      };
    }

    // Encrypt message content before DB write so Prisma Accelerate and the
    // database only ever see ciphertext.
    const { content: encryptedContent } = await encryptMessageForOrg(
      { content },
      organizationId
    );

    // Create message
    const messageId = await generateFriendlyId(prismadb, "Message", organizationId);
    const message = await prismadb.message.create({
      data: {
        id: messageId,
        organizationId,
        channelId,
        conversationId,
        senderId: sender.id,
        content: encryptedContent ?? content,
        contentType: "TEXT",
        parentId,
        ...(validatedEntityAttachment ?? {}),
        attachments: attachments?.length
          ? {
              create: attachments.map((att: { fileName: string; fileSize: number; fileType: string; url: string }) => ({
                fileName: att.fileName,
                fileSize: att.fileSize,
                fileType: att.fileType,
                url: att.url,
              })),
            }
          : undefined,
        mentions: mentions?.length
          ? {
              create: mentions.map((userId: string) => ({ userId })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        mentions: true,
        reactions: true,
      },
    });

    // Update thread count if this is a reply
    if (parentId) {
      await prismadb.message.update({
        where: { id: parentId },
        data: { threadCount: { increment: 1 } },
      });
    }

    // Update conversation timestamp
    if (conversationId) {
      await prismadb.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    // Grant VIEW_ONLY access to all current conversation participants when an
    // entity is attached. Future participants see a "Request Access" prompt.
    // skipDuplicates handles re-sharing the same entity in the same conversation.
    if (validatedEntityAttachment?.linkedEntityId && conversationParticipantIds.length > 0) {
      const entityType = validatedEntityAttachment.linkedEntityType as "PROPERTY" | "CONTACT" | "DOCUMENT" | "REQUEST";
      const entityId = validatedEntityAttachment.linkedEntityId;
      const recipients = conversationParticipantIds.filter(uid => uid !== sender.id);

      if (recipients.length > 0) {
        await prismadb.sharedEntity.createMany({
          data: recipients.map(uid => ({
            id: crypto.randomUUID(),
            entityType,
            entityId,
            sharedById: sender.id,
            sharedWithId: uid,
            permissions: "VIEW_ONLY",
          })),
          skipDuplicates: true,
        });
      }
    }

    // Emit Ably event for real-time update.
    // We include the plaintext content and sender metadata so the recipient can
    // render the message immediately (optimistic insert) without a round-trip.
    // The DB encryption is at-rest protection; Ably uses TLS the same as HTTP.
    try {
      const senderProfileSlug =
        sender?.AgentProfile?.visibility === "PUBLIC"
          ? (sender?.AgentProfile?.slug ?? sender?.username ?? null)
          : null;

      const ablyPayload = {
        id: message.id,
        content, // plaintext — same value returned to the sender in the HTTP response
        contentType: "TEXT",
        senderId: message.senderId,
        senderName: sender?.name ?? null,
        senderAvatar: sender?.avatar ?? null,
        senderEmail: sender?.email ?? null,
        senderProfileSlug,
        channelId: message.channelId,
        conversationId: message.conversationId,
        parentId: message.parentId ?? null,
        createdAt: message.createdAt,
        attachments: message.attachments,
        linkedEntityId: message.linkedEntityId ?? null,
        linkedEntityType: message.linkedEntityType?.toLowerCase() ?? null,
        linkedEntityTitle: message.linkedEntityTitle ?? null,
        linkedEntitySubtitle: message.linkedEntitySubtitle ?? null,
        linkedEntityFriendlyId: message.linkedEntityFriendlyId ?? null,
      };

      if (channelId) {
        // Org-scoped channel: use org-namespaced channel name
        await publishToChannel(getChannelName(organizationId, channelId), "message:new", ablyPayload);
      } else if (conversationScope === "PERSONAL" || conversationScope === "SHARED") {
        // Cross-org DMs: publish to each participant's personal user channel.
        // The org-scoped conversation channel is not accessible across orgs.
        await Promise.all(
          conversationParticipantIds.map(uid =>
            publishToChannel(getUserChannelName(uid), "message:new", ablyPayload)
          )
        );
      } else {
        // ORG-scoped conversation
        const published = await publishToChannel(
          getConversationChannelName(organizationId, conversationId!),
          "message:new",
          ablyPayload
        );
        if (!published) {
          console.warn("[MESSAGING] Ably not configured - message created but not delivered in real-time");
        }
      }
    } catch (error) {
      console.error("[MESSAGING] Failed to publish to Ably:", error);
      // Message is already created in DB, continue without real-time notification
    }

    // Return plaintext content immediately — the sender already knows it.
    // Notifications are dispatched after the response via after() to avoid
    // blocking the critical path on Clerk API calls (~400-600ms per recipient).
    const responsePayload = {
      success: true,
      message: {
        id: message.id,
        content,
        contentType: message.contentType,
        senderId: message.senderId,
        senderName: sender.name ?? null,
        channelId: message.channelId,
        conversationId: message.conversationId,
        parentId: message.parentId,
        threadCount: 0,
        isEdited: false,
        attachments: message.attachments,
        mentions: message.mentions,
        reactions: message.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
        createdAt: message.createdAt,
        entityAttachment: validatedEntityAttachment ? {
          id: validatedEntityAttachment.linkedEntityId,
          type: validatedEntityAttachment.linkedEntityType.toLowerCase(),
          title: validatedEntityAttachment.linkedEntityTitle ?? null,
          subtitle: validatedEntityAttachment.linkedEntitySubtitle ?? null,
          friendlyId: validatedEntityAttachment.linkedEntityFriendlyId ?? null,
        } : undefined,
      },
    };

    // Fire notifications after the response is sent — these involve Clerk API
    // calls per recipient which would otherwise block the sender for 400-1000ms.
    const messagePreview = validatedEntityAttachment?.linkedEntityTitle
      ? `Shared: ${validatedEntityAttachment.linkedEntityTitle}`
      : content.trim().slice(0, 80) || "New message";

    after(async () => {
      try {
        // If this is a reply inside an email-backed conversation, relay it outbound
        if (conversationId) {
          const emailChannelId = await getEmailChannelForConversation(conversationId, organizationId);
          if (emailChannelId) {
            await sendEmailReply({
              channelId: emailChannelId,
              conversationId,
              organizationId,
              content: content.trim(),
              agentName: sender.name ?? "Agent",
            });
          }
        }
      } catch (relayErr) {
        console.error("[MESSAGING] Email outbound relay error:", relayErr);
      }

      try {
        if (channelId) {
          const channel = await prismadb.channel.findFirst({
            where: { id: channelId, organizationId },
            include: {
              members: {
                where: { userId: { not: sender.id } },
                select: { userId: true },
                take: 100,
              },
            },
          });

          if (channel) {
            await Promise.allSettled(
              channel.members.map((member) =>
                notifyNewMessage({
                  recipientUserId: member.userId,
                  senderUserId: sender.id,
                  senderName: sender.name || "Unknown",
                  channelId,
                  channelName: channel.name,
                  messagePreview,
                })
              )
            );
          }
        } else if (conversationId) {
          const participants = await prismadb.conversationParticipant.findMany({
            where: { conversationId, userId: { not: sender.id }, leftAt: null },
            select: { userId: true },
            take: 50,
          });

          await Promise.allSettled(
            participants.map((participant) =>
              notifyNewMessage({
                recipientUserId: participant.userId,
                senderUserId: sender.id,
                senderName: sender.name || "Unknown",
                conversationId,
                messagePreview,
              })
            )
          );
        }

        if (mentions?.length) {
          await notifyMention({
            mentionedUserIds: mentions,
            senderUserId: sender.id,
            senderName: sender.name || "Unknown",
            channelId,
            conversationId,
            messagePreview: "You were mentioned in a message",
          });
        }
      } catch (err) {
        console.error("[MESSAGING] Post-response notification error:", err);
      }
    });

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error("[API] Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messaging/messages?channelId=xxx&conversationId=xxx&limit=50&before=id
 * 
 * Get messages for a channel or conversation.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getCurrentOrgId();

    // Get current user
    const currentUser = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const channelId = url.searchParams.get("channelId");
    const conversationId = url.searchParams.get("conversationId");
    const parentId = url.searchParams.get("parentId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before");

    // Validate limit to prevent abuse
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 200" },
        { status: 400 }
      );
    }

    // For thread fetching (parentId provided), we don't require channelId/conversationId
    // as they can be derived from the parent message
    if (!channelId && !conversationId && !parentId) {
      return NextResponse.json(
        { error: "Channel, conversation, or parent message ID is required" },
        { status: 400 }
      );
    }

    // SECURITY: Verify access to channel or conversation
    if (channelId) {
      const membership = await prismadb.channelMember.findFirst({
        where: {
          channelId,
          userId: currentUser.id,
          channel: {
            organizationId, // ← Verify channel belongs to user's org
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Channel not found or access denied" },
          { status: 403 }
        );
      }
    }

    // When fetching conversation messages, we skip the org filter — the
    // participant membership check is the security gate, and cross-org DMs
    // have participants from multiple orgs.
    let skipOrgFilterForMessages = false;
    if (conversationId) {
      // Security: participant membership is the correct gate for conversation access
      const participant = await prismadb.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: currentUser.id,
          leftAt: null,
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
      skipOrgFilterForMessages = true;
    }



    // If fetching thread replies, get parent message context
    let parentMessage = null;
    if (parentId) {
      parentMessage = await prismadb.message.findUnique({
        where: { id: parentId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              email: true,
              username: true,
              AgentProfile: {
                select: {
                  visibility: true,
                  slug: true,
                },
              },
            },
          },
          attachments: true,
          reactions: {
            select: {
              emoji: true,
              userId: true,
            },
          },
          mentions: {
            select: { userId: true },
          },
        },
      });

      if (!parentMessage) {
        return NextResponse.json(
          { error: "Parent message not found" },
          { status: 404 }
        );
      }
    }

    // Build where clause. For conversations the participant check already
    // established access — skip the org filter. For channels, org filter stays.
    const whereClause: Record<string, unknown> = {
      ...(skipOrgFilterForMessages ? {} : { organizationId }),
      isDeleted: false,
      parentId: parentId || null,
    };

    // For thread replies, use parent's channelId/conversationId if not provided
    const effectiveChannelId = channelId || parentMessage?.channelId;
    const effectiveConversationId = conversationId || parentMessage?.conversationId;

    if (effectiveChannelId) {
      whereClause.channelId = effectiveChannelId;
    } else if (effectiveConversationId) {
      whereClause.conversationId = effectiveConversationId;
    }

    // Pagination cursor
    if (before) {
      const cursorMessage = await prismadb.message.findUnique({
        where: { id: before },
        select: { createdAt: true, organizationId: true },
      });
      
      // SECURITY: Verify cursor message belongs to same organization
      if (cursorMessage && cursorMessage.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Invalid cursor" },
          { status: 400 }
        );
      }
      
      if (cursorMessage) {
        whereClause.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await prismadb.message.findMany({
      where: whereClause,
        include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            username: true,
            AgentProfile: {
              select: {
                visibility: true,
                slug: true,
              },
            },
          },
        },
        attachments: true,
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        mentions: {
          select: { userId: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // Decrypt message content before returning to the client.
    // DEK is cached in Redis so this doesn't create N key-fetches.
    // Decrypt each message with its own org's DEK, not the requester's org.
    // Cross-org DM messages are encrypted with the sender's org key.
    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => {
        const dec = await decryptMessageForOrg(msg, msg.organizationId);
        // fire-and-forget PII access log
        logPiiAccess({
          userId: currentUser.id,
          organizationId,
          entityType: "MESSAGE",
          entityId: msg.id,
          action: "DECRYPT",
          fields: ["content"],
          source: "GET /api/messaging/messages",
        }).catch(() => {});
        return dec;
      })
    );

    const formattedMessages = decryptedMessages.reverse().map((msg) => {
      // Get the profile slug if the agent has a public profile
      const agentProfile = msg.sender?.AgentProfile;
      const profileSlug = agentProfile?.visibility === "PUBLIC"
        ? (agentProfile.slug || msg.sender?.username)
        : null;

      return {
        id: msg.id,
        content: msg.content,
        contentType: msg.contentType,
        senderId: msg.senderId,
        senderName: msg.sender?.name || null,
        senderAvatar: msg.sender?.avatar || null,
        senderEmail: msg.sender?.email || null,
        senderProfileSlug: profileSlug,
        parentId: msg.parentId,
        threadCount: msg._count.replies,
        isEdited: msg.isEdited,
        createdAt: msg.createdAt,
        attachments: msg.attachments,
        reactions: msg.reactions,
        mentions: msg.mentions,
        entityAttachment: msg.linkedEntityId ? {
          id: msg.linkedEntityId,
          type: msg.linkedEntityType?.toLowerCase(),
          title: msg.linkedEntityTitle ?? null,
          subtitle: msg.linkedEntitySubtitle ?? null,
          friendlyId: msg.linkedEntityFriendlyId ?? null,
        } : undefined,
      };
    });

    // Format parent message if fetching thread (decrypt first)
    let formattedParent = undefined;
    if (parentMessage) {
      const decryptedParent = await decryptMessageForOrg(parentMessage, parentMessage.organizationId);
      // fire-and-forget PII access log for parent message
      logPiiAccess({
        userId: currentUser.id,
        organizationId,
        entityType: "MESSAGE",
        entityId: parentMessage.id,
        action: "DECRYPT",
        fields: ["content"],
        source: "GET /api/messaging/messages (thread parent)",
      }).catch(() => {});
      const parentAgentProfile = decryptedParent.sender?.AgentProfile;
      const parentProfileSlug = parentAgentProfile?.visibility === "PUBLIC"
        ? (parentAgentProfile.slug || decryptedParent.sender?.username)
        : null;

      formattedParent = {
        id: decryptedParent.id,
        content: decryptedParent.content,
        contentType: decryptedParent.contentType,
        senderId: decryptedParent.senderId,
        senderName: decryptedParent.sender?.name || null,
        senderAvatar: decryptedParent.sender?.avatar || null,
        senderEmail: decryptedParent.sender?.email || null,
        senderProfileSlug: parentProfileSlug,
        parentId: decryptedParent.parentId,
        threadCount: decryptedParent.threadCount,
        isEdited: decryptedParent.isEdited,
        createdAt: decryptedParent.createdAt,
        attachments: decryptedParent.attachments,
        reactions: decryptedParent.reactions,
        mentions: decryptedParent.mentions,
        entityAttachment: decryptedParent.linkedEntityId ? {
          id: decryptedParent.linkedEntityId,
          type: decryptedParent.linkedEntityType?.toLowerCase() ?? null,
          title: decryptedParent.linkedEntityTitle ?? null,
          subtitle: decryptedParent.linkedEntitySubtitle ?? null,
          friendlyId: decryptedParent.linkedEntityFriendlyId ?? null,
        } : undefined,
      };
    }

    return NextResponse.json({
      messages: formattedMessages,
      hasMore,
      nextCursor: hasMore ? messages[0]?.id : undefined,
      parentMessage: formattedParent,
    });
  } catch (error) {
    console.error("[API] Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messaging/messages
 * 
 * Edit a message.
 */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { messageId, content } = body;

    if (!messageId || !content) {
      return NextResponse.json(
        { error: "Message ID and content are required" },
        { status: 400 }
      );
    }

    // SECURITY: Validate content length
    if (typeof content !== "string" || content.length > 10000) {
      return NextResponse.json(
        { error: "Message content exceeds maximum length (10,000 characters)" },
        { status: 400 }
      );
    }

    // Get sender
    const sender = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SECURITY: Get message and verify it belongs to user's organization AND user owns it
    const message = await prismadb.message.findFirst({
      where: { 
        id: messageId,
        organizationId, // ← Verify message belongs to user's org
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.senderId !== sender.id) {
      return NextResponse.json(
        { error: "Cannot edit this message" },
        { status: 403 }
      );
    }

    // Encrypt edited content before DB write
    const { content: encryptedEditContent } = await encryptMessageForOrg(
      { content },
      organizationId
    );

    // Update message
    const updated = await prismadb.message.update({
      where: { id: messageId },
      data: {
        content: encryptedEditContent ?? content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Emit Ably event — content stripped, subscribers refetch via API
    try {
      const ablyChannelName = message.channelId
        ? getChannelName(organizationId, message.channelId)
        : getConversationChannelName(organizationId, message.conversationId!);

      const published = await publishToChannel(ablyChannelName, "message:edited", {
        id: updated.id,
        isEdited: true,
        editedAt: updated.editedAt,
      });
      
      if (!published) {
        console.warn("[MESSAGING] Ably not configured - edit event not delivered in real-time");
      }
    } catch (error) {
      console.error("[MESSAGING] Failed to publish edit to Ably:", error);
    }

    // Return plaintext — the editor already knows the content.
    return NextResponse.json({
      success: true,
      message: {
        id: updated.id,
        content,
        isEdited: updated.isEdited,
        editedAt: updated.editedAt,
      },
    });
  } catch (error) {
    console.error("[API] Edit message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/messages?messageId=xxx
 * 
 * Delete a message (soft delete).
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getCurrentOrgId();

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Get sender
    const sender = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SECURITY: Get message and verify it belongs to user's organization AND user owns it
    const message = await prismadb.message.findFirst({
      where: { 
        id: messageId,
        organizationId, // ← Verify message belongs to user's org
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.senderId !== sender.id) {
      return NextResponse.json(
        { error: "Cannot delete this message" },
        { status: 403 }
      );
    }

    // Soft delete message
    await prismadb.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: "[Message deleted]",
      },
    });

    // Emit Ably event
    try {
      const ablyChannelName = message.channelId
        ? getChannelName(organizationId, message.channelId)
        : getConversationChannelName(organizationId, message.conversationId!);
      
      const published = await publishToChannel(ablyChannelName, "message:deleted", {
        id: messageId,
      });
      
      if (!published) {
        console.warn("[MESSAGING] Ably not configured - delete event not delivered in real-time");
      }
    } catch (error) {
      console.error("[MESSAGING] Failed to publish delete to Ably:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Delete message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

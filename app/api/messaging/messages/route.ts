import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { notifyNewMessage, notifyMention } from "@/actions/messaging/notifications";
import { publishToChannel, getChannelName, getConversationChannelName } from "@/lib/ably";

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
    const { channelId, conversationId, content, parentId, attachments, mentions } = body;

    if (!channelId && !conversationId) {
      return NextResponse.json(
        { error: "Channel or conversation ID is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const organizationId = await getCurrentOrgId();

    // Get sender info
    const sender = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true },
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

    if (conversationId) {
      const conversation = await prismadb.conversation.findFirst({
        where: {
          id: conversationId,
          organizationId, // ← CRITICAL: Verify tenant ownership
        },
        select: { id: true },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 404 }
        );
      }

      // Verify user is a participant
      const participant = await prismadb.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: sender.id,
          },
        },
      });

      if (!participant || participant.leftAt) {
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

    if (mentions && mentions.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 mentions per message" },
        { status: 400 }
      );
    }

    // Create message
    const messageId = await generateFriendlyId(prismadb, "Message");
    const message = await prismadb.message.create({
      data: {
        id: messageId,
        organizationId,
        channelId,
        conversationId,
        senderId: sender.id,
        content,
        contentType: "TEXT",
        parentId,
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

    // Emit Ably event for real-time update
    try {
      const ablyChannelName = channelId
        ? getChannelName(organizationId, channelId)
        : getConversationChannelName(organizationId, conversationId!);
      
      const published = await publishToChannel(ablyChannelName, "message:new", {
        id: message.id,
        content: message.content,
        contentType: message.contentType,
        senderId: message.senderId,
        senderName: sender.name,
        channelId: message.channelId,
        conversationId: message.conversationId,
        parentId: message.parentId,
        attachments: message.attachments,
        mentions: message.mentions,
        createdAt: message.createdAt,
      });
      
      if (!published) {
        console.warn("[MESSAGING] Ably not configured - message created but not delivered in real-time");
      }
    } catch (error) {
      console.error("[MESSAGING] Failed to publish to Ably:", error);
      // Message is already created in DB, continue without real-time notification
    }

    // Send notifications (with organization verification)
    if (channelId) {
      // Get channel members to notify
      const channel = await prismadb.channel.findFirst({
        where: { 
          id: channelId,
          organizationId, // ← SECURITY: Verify channel belongs to user's org
        },
        include: {
          members: {
            where: { userId: { not: sender.id } },
            select: { userId: true },
            take: 100, // ← SECURITY: Limit to prevent DoS (batch notifications if needed)
          },
        },
      });

      if (channel) {
        // PERFORMANCE: Batch notification creation to avoid overwhelming the system
        const notificationPromises = channel.members.map((member) =>
          notifyNewMessage({
            recipientUserId: member.userId,
            senderUserId: sender.id,
            senderName: sender.name || "Unknown",
            channelId,
            channelName: channel.name,
            messagePreview: content.substring(0, 200), // Truncate preview
          })
        );
        
        // Send notifications in parallel with error handling
        await Promise.allSettled(notificationPromises).catch((err) => {
          console.error("[MESSAGING] Notification batch error:", err);
        });
      }
    } else if (conversationId) {
      // Get conversation participants to notify
      const participants = await prismadb.conversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: sender.id },
          leftAt: null,
        },
        select: { userId: true },
        take: 50, // ← SECURITY: Limit to prevent DoS
      });

      // PERFORMANCE: Batch notification creation
      const notificationPromises = participants.map((participant) =>
        notifyNewMessage({
          recipientUserId: participant.userId,
          senderUserId: sender.id,
          senderName: sender.name || "Unknown",
          conversationId,
          messagePreview: content.substring(0, 200), // Truncate preview
        })
      );
      
      // Send notifications in parallel with error handling
      await Promise.allSettled(notificationPromises).catch((err) => {
        console.error("[MESSAGING] Notification batch error:", err);
      });
    }

    // Send mention notifications
    if (mentions?.length) {
      await notifyMention({
        mentionedUserIds: mentions,
        senderUserId: sender.id,
        senderName: sender.name || "Unknown",
        channelId,
        conversationId,
        messagePreview: content,
      });
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        contentType: message.contentType,
        senderId: message.senderId,
        channelId: message.channelId,
        conversationId: message.conversationId,
        parentId: message.parentId,
        attachments: message.attachments,
        mentions: message.mentions,
        createdAt: message.createdAt,
      },
    }, { status: 201 });
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

    if (conversationId) {
      const participant = await prismadb.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: currentUser.id,
          leftAt: null,
          conversation: {
            organizationId, // ← Verify conversation belongs to user's org
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
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

    // Build where clause
    const whereClause: Record<string, unknown> = {
      organizationId, // ← SECURITY: Always filter by organization
      isDeleted: false,
      parentId: parentId || null, // Fetch thread replies or top-level messages
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

    const formattedMessages = messages.reverse().map((msg) => {
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
      };
    });

    // Format parent message if fetching thread
    let formattedParent = undefined;
    if (parentMessage) {
      const parentAgentProfile = parentMessage.sender?.AgentProfile;
      const parentProfileSlug = parentAgentProfile?.visibility === "PUBLIC"
        ? (parentAgentProfile.slug || parentMessage.sender?.username)
        : null;

      formattedParent = {
        id: parentMessage.id,
        content: parentMessage.content,
        contentType: parentMessage.contentType,
        senderId: parentMessage.senderId,
        senderName: parentMessage.sender?.name || null,
        senderAvatar: parentMessage.sender?.avatar || null,
        senderEmail: parentMessage.sender?.email || null,
        senderProfileSlug: parentProfileSlug,
        parentId: parentMessage.parentId,
        threadCount: parentMessage.threadCount,
        isEdited: parentMessage.isEdited,
        createdAt: parentMessage.createdAt,
        attachments: parentMessage.attachments,
        reactions: parentMessage.reactions,
        mentions: parentMessage.mentions,
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

    // Update message
    const updated = await prismadb.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Emit Ably event
    try {
      const ablyChannelName = message.channelId
        ? getChannelName(organizationId, message.channelId)
        : getConversationChannelName(organizationId, message.conversationId!);
      
      const published = await publishToChannel(ablyChannelName, "message:edited", {
        id: updated.id,
        content: updated.content,
        isEdited: true,
        editedAt: updated.editedAt,
      });
      
      if (!published) {
        console.warn("[MESSAGING] Ably not configured - edit event not delivered in real-time");
      }
    } catch (error) {
      console.error("[MESSAGING] Failed to publish edit to Ably:", error);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: updated.id,
        content: updated.content,
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

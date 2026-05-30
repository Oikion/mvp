"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { MessageContentType, NotificationCategory } from "@prisma/client";
import { requireAction } from "@/lib/permissions";
import { cacheDel } from "@/lib/redis";
// E2EE: Server is now a pass-through relay. Client encrypts/decrypts.

/**
 * Send a message to a channel or conversation
 */
export async function sendMessage(params: {
  channelId?: string;
  conversationId?: string;
  content: string; // E2EE ciphertext (client encrypts before sending)
  parentId?: string; // For threading
  // E2EE metadata
  sessionId?: string;
  messageIndex?: number;
  dhPublicKey?: string;
  previousChainLen?: number;
}): Promise<{
  success: boolean;
  message?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  };
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:send_message permission
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Validate that either channelId or conversationId is provided
    if (!params.channelId && !params.conversationId) {
      return { success: false, error: "Channel or conversation is required" };
    }

    if (params.channelId && params.conversationId) {
      return { success: false, error: "Cannot specify both channel and conversation" };
    }

    // Verify access to channel or conversation
    if (params.channelId) {
      const membership = await prismadb.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: params.channelId,
            userId: currentUser.id,
          },
        },
      });

      if (!membership) {
        return { success: false, error: "Not a member of this channel" };
      }

      // Check channel type for posting permissions
      const channel = await prismadb.channel.findUnique({
        where: { id: params.channelId },
      });

      if (channel?.channelType === "ANNOUNCEMENT" && membership.role === "MEMBER") {
        return { success: false, error: "Only admins can post in announcement channels" };
      }
    }

    if (params.conversationId) {
      const participation = await prismadb.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: params.conversationId,
            userId: currentUser.id,
          },
        },
      });

      if (!participation || participation.leftAt) {
        return { success: false, error: "Not a participant of this conversation" };
      }
    }

    // Parse mentions from content
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(params.content)) !== null) {
      mentions.push(match[2]); // User ID from mention
    }

    // Store ciphertext directly — server is a pass-through relay
    const messageId = await generateFriendlyId(prismadb, "Message", organizationId);
    const message = await prismadb.message.create({
      data: {
        id: messageId,
        organizationId,
        channelId: params.channelId,
        conversationId: params.conversationId,
        senderId: currentUser.id,
        content: params.content,
        contentType: "TEXT",
        parentId: params.parentId,
        // E2EE metadata
        sessionId: params.sessionId,
        messageIndex: params.messageIndex,
        dhPublicKey: params.dhPublicKey,
        previousChainLen: params.previousChainLen,
        mentions: mentions.length > 0 ? {
          createMany: {
            data: mentions.map(userId => ({ userId })),
          },
        } : undefined,
      },
    });

    // Update thread count if this is a reply
    if (params.parentId) {
      await prismadb.message.update({
        where: { id: params.parentId },
        data: { threadCount: { increment: 1 } },
      });
    }

    // Update conversation/channel updatedAt
    if (params.conversationId) {
      await prismadb.conversation.update({
        where: { id: params.conversationId },
        data: { updatedAt: new Date() },
      });
    }

    return {
      success: true,
      message: {
        id: message.id,
        content: params.content, // return original plaintext for immediate display
        senderId: message.senderId ?? "",
        createdAt: message.createdAt,
      },
    };
  } catch (error) {
    console.error("[MESSAGING] Send message error:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Get messages from a channel or conversation
 */
export async function getMessages(params: {
  channelId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string; // Message ID for pagination
  parentId?: string; // For getting thread replies
}): Promise<{
  success: boolean;
  messages?: Array<{
    id: string;
    content: string;
    contentType: MessageContentType;
    senderId: string;
    parentId: string | null;
    threadCount: number;
    isEdited: boolean;
    createdAt: Date;
    editedAt: Date | null;
    reactions: Array<{
      emoji: string;
      count: number;
      userIds: string[];
    }>;
    attachments: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      url: string;
    }>;
  }>;
  nextCursor?: string;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:read permission
    const guard = await requireAction("messaging:read");
    if (guard) return guard;

    if (!params.channelId && !params.conversationId) {
      return { success: false, error: "Channel or conversation is required" };
    }

    const currentUser = await getCurrentUser();
    const limit = params.limit || 50;

    // Validate access
    if (params.channelId) {
      const membership = await prismadb.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId: params.channelId,
            userId: currentUser.id,
          },
        },
      });

      if (!membership) {
        return { success: false, error: "Not a member of this channel" };
      }
    }

    if (params.conversationId) {
      const participation = await prismadb.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: params.conversationId,
            userId: currentUser.id,
          },
        },
      });

      if (!participation || participation.leftAt) {
        return { success: false, error: "Not a participant of this conversation" };
      }
    }

    const messages = await prismadb.message.findMany({
      where: {
        channelId: params.channelId,
        conversationId: params.conversationId,
        parentId: params.parentId || null, // Get top-level messages or thread replies
        isDeleted: false,
        ...(params.cursor && {
          createdAt: {
            lt: (await prismadb.message.findUnique({
              where: { id: params.cursor },
              select: { createdAt: true },
            }))?.createdAt,
          },
        }),
      },
      include: {
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Get one extra to check for more
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, -1) : messages;

    // Return raw ciphertext — client decrypts via E2EE
    const formattedMessages = resultMessages.map(msg => {
      const reactionMap = new Map<string, string[]>();
      msg.reactions.forEach(r => {
        if (!reactionMap.has(r.emoji)) {
          reactionMap.set(r.emoji, []);
        }
        reactionMap.get(r.emoji)!.push(r.userId);
      });

      return {
        id: msg.id,
        content: msg.content, // E2EE ciphertext — client decrypts
        contentType: msg.contentType,
        senderId: msg.senderId ?? "",
        parentId: msg.parentId,
        threadCount: msg.threadCount,
        isEdited: msg.isEdited,
        createdAt: msg.createdAt,
        editedAt: msg.editedAt,
        // E2EE metadata for client-side decryption
        sessionId: msg.sessionId,
        messageIndex: msg.messageIndex,
        dhPublicKey: msg.dhPublicKey,
        previousChainLen: msg.previousChainLen,
        reactions: Array.from(reactionMap.entries()).map(([emoji, userIds]) => ({
          emoji,
          count: userIds.length,
          userIds,
        })),
        attachments: msg.attachments,
      };
    });

    // Reverse to get oldest first for display
    formattedMessages.reverse();

    return {
      success: true,
      messages: formattedMessages,
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1].id : undefined,
    };
  } catch (error) {
    console.error("[MESSAGING] Get messages error:", error);
    return { success: false, error: "Failed to get messages" };
  }
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  content: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Scope the lookup to the caller's org so a foreign message ID cannot be
    // probed; ownership is enforced separately below.
    const message = await prismadb.message.findFirst({
      where: { id: messageId, organizationId },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.senderId !== currentUser.id) {
      return { success: false, error: "Can only edit your own messages" };
    }

    if (message.isDeleted) {
      return { success: false, error: "Cannot edit deleted message" };
    }

    // Store ciphertext directly — client re-encrypts before sending
    await prismadb.message.update({
      where: { id: messageId },
      data: {
        content, // E2EE ciphertext
        isEdited: true,
        editedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Edit message error:", error);
    return { success: false, error: "Failed to edit message" };
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Scope the lookup to the caller's org; ownership is enforced below.
    const message = await prismadb.message.findFirst({
      where: { id: messageId, organizationId },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.senderId !== currentUser.id) {
      return { success: false, error: "Can only delete your own messages" };
    }

    // Tombstone — clear content, no encryption needed
    await prismadb.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: "",
      },
    });

    // Update parent thread count if this was a reply
    if (message.parentId) {
      await prismadb.message.update({
        where: { id: message.parentId },
        data: { threadCount: { decrement: 1 } },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Delete message error:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Add a reaction to a message
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify message exists and user has access. The channel-membership /
    // conversation-participant include below is the access gate (it also covers
    // cross-org DMs, so we intentionally do not org-filter the lookup here).
    const message = await prismadb.message.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            members: {
              where: { userId: currentUser.id },
            },
          },
        },
        conversation: {
          include: {
            participants: {
              where: { userId: currentUser.id, leftAt: null },
            },
          },
        },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Check access:
    // - Channel messages: caller must be a member AND the channel must belong to
    //   the caller's org (channels are always same-org — defense-in-depth).
    // - Conversation messages: participant membership (cross-org DM safe).
    const hasChannelAccess =
      !!message.channel &&
      message.channel.organizationId === organizationId &&
      message.channel.members.length > 0;
    const hasConversationAccess =
      !!message.conversation && message.conversation.participants.length > 0;
    const hasAccess = hasChannelAccess || hasConversationAccess;

    if (!hasAccess) {
      return { success: false, error: "No access to this message" };
    }

    // Check if reaction already exists
    const existingReaction = await prismadb.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: currentUser.id,
          emoji,
        },
      },
    });

    if (existingReaction) {
      return { success: true }; // Already reacted
    }

    await prismadb.messageReaction.create({
      data: {
        messageId,
        userId: currentUser.id,
        emoji,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Add reaction error:", error);
    return { success: false, error: "Failed to add reaction" };
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Confirm the message belongs to the caller's org before mutating reactions.
    const message = await prismadb.message.findFirst({
      where: { id: messageId, organizationId },
      select: { id: true },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // deleteMany is idempotent — no throw when the reaction was already removed.
    await prismadb.messageReaction.deleteMany({
      where: {
        messageId,
        userId: currentUser.id,
        emoji,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Remove reaction error:", error);
    return { success: false, error: "Failed to remove reaction" };
  }
}

/**
 * Mark messages as read
 */
export async function markAsRead(params: {
  channelId?: string;
  conversationId?: string;
  messageIds?: string[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!params.channelId && !params.conversationId) {
      return { success: false, error: "channelId or conversationId is required" };
    }

    const currentUser = await getCurrentUser();

    // Verify the caller is a member/participant before any write — applies regardless
    // of whether specific messageIds were supplied, so the membership gate cannot be
    // bypassed by passing an explicit messageIds array with a foreign channelId.
    if (params.channelId) {
      const membership = await prismadb.channelMember.findUnique({
        where: { channelId_userId: { channelId: params.channelId, userId: currentUser.id } },
        select: { channelId: true },
      });
      if (!membership) return { success: false, error: "Not a member of this channel" };
    }

    if (params.conversationId) {
      const participant = await prismadb.conversationParticipant.findFirst({
        where: { conversationId: params.conversationId, userId: currentUser.id, leftAt: null },
        select: { conversationId: true },
      });
      if (!participant) return { success: false, error: "Not a participant of this conversation" };
    }

    let messageIds = params.messageIds;

    // If no specific messages, mark all unread in channel/conversation
    if (!messageIds) {
      const messages = await prismadb.message.findMany({
        where: {
          channelId: params.channelId,
          conversationId: params.conversationId,
          isDeleted: false,
          senderId: { not: currentUser.id },
          readReceipts: {
            none: { userId: currentUser.id },
          },
        },
        select: { id: true },
      });
      messageIds = messages.map(m => m.id);
    } else {
      // SECURITY: the membership gate above proves the caller belongs to
      // params.channelId / params.conversationId, but explicitly-supplied
      // messageIds are otherwise untrusted. Constrain them to messages that
      // actually live in the verified channel/conversation so a member of one
      // channel cannot create read receipts for messages they cannot access.
      const owned = await prismadb.message.findMany({
        where: {
          id: { in: messageIds },
          channelId: params.channelId,
          conversationId: params.conversationId,
        },
        select: { id: true },
      });
      messageIds = owned.map(m => m.id);
    }

    if (messageIds.length === 0) {
      return { success: true };
    }

    // Create read receipts
    await prismadb.messageRead.createMany({
      data: messageIds.map(messageId => ({
        messageId,
        userId: currentUser.id,
      })),
      skipDuplicates: true,
    });

    // Update last read time for conversation participant
    if (params.conversationId) {
      await prismadb.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: params.conversationId,
            userId: currentUser.id,
          },
        },
        data: { lastReadAt: new Date() },
      });
    }

    // Clear matching Notification rows so the nav badge drops immediately.
    // CHANNEL_MESSAGE and MESSAGE_RECEIVED types share the same entityId (channelId/conversationId).
    const entityId = params.channelId ?? params.conversationId;
    if (entityId) {
      const organizationId = await getCurrentOrgId();
      await prismadb.notification.updateMany({
        where: {
          userId: currentUser.id,
          organizationId,
          read: false,
          entityId,
          type: {
            in: [
              NotificationCategory.CHANNEL_MESSAGE,
              NotificationCategory.MESSAGE_RECEIVED,
              NotificationCategory.MESSAGE_MENTION,
            ],
          },
        },
        data: { read: true, readAt: new Date() },
      });
      // Bust the 15-second notification-count Redis cache for this user
      await cacheDel(`oik:notif:${organizationId}:${currentUser.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Mark as read error:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(): Promise<{
  success: boolean;
  count?: number;
  byChannel?: Record<string, number>;
  byConversation?: Record<string, number>;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get channels user is a member of
    const memberships = await prismadb.channelMember.findMany({
      where: { userId: currentUser.id },
      select: { channelId: true },
    });
    const channelIds = memberships.map(m => m.channelId);

    // Get conversations user is a participant of
    const participations = await prismadb.conversationParticipant.findMany({
      where: { userId: currentUser.id, leftAt: null },
      select: { conversationId: true },
    });
    const conversationIds = participations.map(p => p.conversationId);

    // Count unread messages with DB-side aggregation instead of loading every
    // row into memory. groupBy is Accelerate-compatible (same pattern used in
    // direct-messages.ts) and keeps the per-channel/per-conversation breakdown.
    const baseWhere = {
      organizationId,
      isDeleted: false,
      senderId: { not: currentUser.id },
      readReceipts: { none: { userId: currentUser.id } },
    } as const;

    const [channelGroups, conversationGroups] = await Promise.all([
      channelIds.length > 0
        ? prismadb.message.groupBy({
            by: ["channelId"],
            where: { ...baseWhere, channelId: { in: channelIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      conversationIds.length > 0
        ? prismadb.message.groupBy({
            by: ["conversationId"],
            where: { ...baseWhere, conversationId: { in: conversationIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const byChannel: Record<string, number> = {};
    const byConversation: Record<string, number> = {};
    let count = 0;

    for (const g of channelGroups) {
      if (g.channelId) {
        byChannel[g.channelId] = g._count._all;
        count += g._count._all;
      }
    }
    for (const g of conversationGroups) {
      if (g.conversationId) {
        byConversation[g.conversationId] = g._count._all;
        count += g._count._all;
      }
    }

    return {
      success: true,
      count,
      byChannel,
      byConversation,
    };
  } catch (error) {
    console.error("[MESSAGING] Get unread count error:", error);
    return { success: false, error: "Failed to get unread count" };
  }
}

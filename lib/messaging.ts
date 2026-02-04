/**
 * Messaging Library
 * 
 * Server-side utilities for the native messaging system.
 * Uses Prisma for data storage and Ably for real-time updates.
 */

import { prismadb } from "@/lib/prisma";
import { 
  publishToChannel, 
  getChannelName, 
  getConversationChannelName,
  getUserChannelName,
  type AblyMessageEvent,
  type AblyReactionEvent,
} from "@/lib/ably";

// ============================================
// Types
// ============================================

export interface MessagePayload {
  content: string;
  contentType?: "TEXT" | "SYSTEM" | "FILE";
  parentId?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  }>;
  mentions?: string[];
}

// ============================================
// Channels
// ============================================

/**
 * Create a new channel
 */
export async function createChannel(params: {
  organizationId: string;
  name: string;
  description?: string;
  channelType?: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT";
  isDefault?: boolean;
  createdById: string;
}) {
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const channel = await prismadb.channel.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      slug,
      description: params.description,
      channelType: params.channelType || "PUBLIC",
      isDefault: params.isDefault || false,
      createdById: params.createdById,
      members: {
        create: {
          userId: params.createdById,
          role: "OWNER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return channel;
}

/**
 * Add member to channel
 */
export async function addChannelMember(
  channelId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER"
) {
  return prismadb.channelMember.upsert({
    where: {
      channelId_userId: { channelId, userId },
    },
    create: {
      channelId,
      userId,
      role,
    },
    update: {
      role,
    },
  });
}

/**
 * Remove member from channel
 */
export async function removeChannelMember(channelId: string, userId: string) {
  return prismadb.channelMember.delete({
    where: {
      channelId_userId: { channelId, userId },
    },
  });
}

/**
 * Get channels for a user in an organization
 */
export async function getUserChannels(organizationId: string, userId: string) {
  return prismadb.channel.findMany({
    where: {
      organizationId,
      isArchived: false,
      OR: [
        { channelType: "PUBLIC" },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: {
        where: { userId },
        select: { role: true, mutedUntil: true },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

// ============================================
// Conversations (DMs)
// ============================================

/**
 * Get or create a direct message conversation between two users
 */
export async function getOrCreateDM(
  organizationId: string,
  userId1: string,
  userId2: string
) {
  // Check for existing conversation
  const existing = await prismadb.conversation.findFirst({
    where: {
      organizationId,
      isGroup: false,
      participants: {
        every: {
          userId: { in: [userId1, userId2] },
          leftAt: null,
        },
      },
    },
    include: {
      participants: true,
    },
  });

  if (existing) {
    return existing;
  }

  // Create new conversation
  return prismadb.conversation.create({
    data: {
      organizationId,
      isGroup: false,
      createdById: userId1,
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
    include: {
      participants: true,
    },
  });
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(params: {
  organizationId: string;
  name?: string;
  createdById: string;
  participantIds: string[];
  entityType?: "CLIENT" | "PROPERTY" | "DEAL" | "PROJECT";
  entityId?: string;
}) {
  return prismadb.conversation.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      isGroup: true,
      createdById: params.createdById,
      entityType: params.entityType,
      entityId: params.entityId,
      participants: {
        create: params.participantIds.map((userId) => ({ userId })),
      },
    },
    include: {
      participants: true,
    },
  });
}

/**
 * Get conversations for a user
 */
export async function getUserConversations(organizationId: string, userId: string) {
  return prismadb.conversation.findMany({
    where: {
      organizationId,
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        select: { userId: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              isDeleted: false,
              readReceipts: {
                none: { userId },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ============================================
// Messages
// ============================================

/**
 * Send a message to a channel or conversation
 * Also publishes to Ably for real-time updates
 */
export async function sendMessage(params: {
  organizationId: string;
  senderId: string;
  channelId?: string;
  conversationId?: string;
  content: string;
  contentType?: "TEXT" | "SYSTEM" | "FILE";
  parentId?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  }>;
  mentions?: string[];
}) {
  const message = await prismadb.message.create({
    data: {
      organizationId: params.organizationId,
      senderId: params.senderId,
      channelId: params.channelId,
      conversationId: params.conversationId,
      content: params.content,
      contentType: params.contentType || "TEXT",
      parentId: params.parentId,
      attachments: params.attachments
        ? {
            create: params.attachments,
          }
        : undefined,
      mentions: params.mentions
        ? {
            create: params.mentions.map((userId) => ({ userId })),
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
  if (params.parentId) {
    await prismadb.message.update({
      where: { id: params.parentId },
      data: { threadCount: { increment: 1 } },
    });
  }

  // Update conversation timestamp
  if (params.conversationId) {
    await prismadb.conversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });
  }

  // Publish to Ably for real-time updates
  const ablyEvent: AblyMessageEvent = {
    type: "new",
    message: {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      channelId: message.channelId || undefined,
      conversationId: message.conversationId || undefined,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments.map(a => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        url: a.url,
      })),
    },
  };

  if (params.channelId) {
    await publishToChannel(
      getChannelName(params.organizationId, params.channelId),
      "message",
      ablyEvent
    );
  } else if (params.conversationId) {
    await publishToChannel(
      getConversationChannelName(params.organizationId, params.conversationId),
      "message",
      ablyEvent
    );
  }

  // Notify mentioned users
  if (params.mentions && params.mentions.length > 0) {
    for (const mentionedUserId of params.mentions) {
      await publishToChannel(
        getUserChannelName(mentionedUserId),
        "mention",
        {
          messageId: message.id,
          senderId: params.senderId,
          channelId: params.channelId,
          conversationId: params.conversationId,
        }
      );
    }
  }

  return message;
}

/**
 * Get messages for a channel or conversation
 */
export async function getMessages(params: {
  channelId?: string;
  conversationId?: string;
  before?: string; // Cursor for pagination
  limit?: number;
}) {
  const limit = params.limit || 50;

  const messages = await prismadb.message.findMany({
    where: {
      channelId: params.channelId,
      conversationId: params.conversationId,
      isDeleted: false,
      parentId: null, // Only get top-level messages
      ...(params.before
        ? {
            createdAt: {
              lt: (
                await prismadb.message.findUnique({
                  where: { id: params.before },
                  select: { createdAt: true },
                })
              )?.createdAt,
            },
          }
        : {}),
    },
    include: {
      attachments: true,
      reactions: true,
      mentions: true,
      _count: {
        select: { replies: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Get one extra to check if there are more
  });

  const hasMore = messages.length > limit;
  if (hasMore) {
    messages.pop();
  }

  return {
    messages: messages.reverse(),
    hasMore,
    nextCursor: hasMore ? messages[0]?.id : undefined,
  };
}

/**
 * Get thread replies for a message
 */
export async function getThreadReplies(parentId: string, limit = 50) {
  return prismadb.message.findMany({
    where: {
      parentId,
      isDeleted: false,
    },
    include: {
      attachments: true,
      reactions: true,
      mentions: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string, 
  senderId: string, 
  content: string,
  organizationId: string
) {
  const message = await prismadb.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== senderId) {
    throw new Error("Cannot edit this message");
  }

  const updated = await prismadb.message.update({
    where: { id: messageId },
    data: {
      content,
      isEdited: true,
      editedAt: new Date(),
    },
  });

  // Publish edit to Ably
  const ablyEvent: AblyMessageEvent = {
    type: "edit",
    message: {
      id: updated.id,
      content: updated.content,
      senderId: updated.senderId,
      channelId: updated.channelId || undefined,
      conversationId: updated.conversationId || undefined,
      createdAt: updated.createdAt.toISOString(),
    },
  };

  if (message.channelId) {
    await publishToChannel(
      getChannelName(organizationId, message.channelId),
      "message",
      ablyEvent
    );
  } else if (message.conversationId) {
    await publishToChannel(
      getConversationChannelName(organizationId, message.conversationId),
      "message",
      ablyEvent
    );
  }

  return updated;
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string, 
  senderId: string,
  organizationId: string
) {
  const message = await prismadb.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== senderId) {
    throw new Error("Cannot delete this message");
  }

  const deleted = await prismadb.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      content: "[Message deleted]",
    },
  });

  // Publish delete to Ably
  const ablyEvent: AblyMessageEvent = {
    type: "delete",
    message: {
      id: deleted.id,
      content: deleted.content,
      senderId: deleted.senderId,
      channelId: deleted.channelId || undefined,
      conversationId: deleted.conversationId || undefined,
      createdAt: deleted.createdAt.toISOString(),
    },
  };

  if (message.channelId) {
    await publishToChannel(
      getChannelName(organizationId, message.channelId),
      "message",
      ablyEvent
    );
  } else if (message.conversationId) {
    await publishToChannel(
      getConversationChannelName(organizationId, message.conversationId),
      "message",
      ablyEvent
    );
  }

  return deleted;
}

// ============================================
// Reactions
// ============================================

/**
 * Add a reaction to a message
 */
export async function addReaction(
  messageId: string, 
  userId: string, 
  emoji: string,
  organizationId: string
) {
  const reaction = await prismadb.messageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
    create: {
      messageId,
      userId,
      emoji,
    },
    update: {},
  });

  // Get message to find channel/conversation
  const message = await prismadb.message.findUnique({
    where: { id: messageId },
  });

  if (message) {
    const ablyEvent: AblyReactionEvent = {
      type: "add",
      messageId,
      userId,
      emoji,
    };

    if (message.channelId) {
      await publishToChannel(
        getChannelName(organizationId, message.channelId),
        "reaction",
        ablyEvent
      );
    } else if (message.conversationId) {
      await publishToChannel(
        getConversationChannelName(organizationId, message.conversationId),
        "reaction",
        ablyEvent
      );
    }
  }

  return reaction;
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  messageId: string, 
  userId: string, 
  emoji: string,
  organizationId: string
) {
  await prismadb.messageReaction.delete({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  });

  // Get message to find channel/conversation
  const message = await prismadb.message.findUnique({
    where: { id: messageId },
  });

  if (message) {
    const ablyEvent: AblyReactionEvent = {
      type: "remove",
      messageId,
      userId,
      emoji,
    };

    if (message.channelId) {
      await publishToChannel(
        getChannelName(organizationId, message.channelId),
        "reaction",
        ablyEvent
      );
    } else if (message.conversationId) {
      await publishToChannel(
        getConversationChannelName(organizationId, message.conversationId),
        "reaction",
        ablyEvent
      );
    }
  }
}

// ============================================
// Read Receipts
// ============================================

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(messageIds: string[], userId: string) {
  const records = messageIds.map((messageId) => ({
    messageId,
    userId,
  }));

  await prismadb.messageRead.createMany({
    data: records,
    skipDuplicates: true,
  });
}

/**
 * Get unread count for a user in a channel/conversation
 */
export async function getUnreadCount(params: {
  userId: string;
  channelId?: string;
  conversationId?: string;
}) {
  return prismadb.message.count({
    where: {
      channelId: params.channelId,
      conversationId: params.conversationId,
      isDeleted: false,
      senderId: { not: params.userId },
      readReceipts: {
        none: { userId: params.userId },
      },
    },
  });
}

// ============================================
// Typing Indicators
// ============================================

/**
 * Set typing indicator
 */
export async function setTypingIndicator(params: {
  organizationId: string;
  userId: string;
  channelId?: string;
  conversationId?: string;
}) {
  const expiresAt = new Date(Date.now() + 5000); // 5 seconds

  await prismadb.typingIndicator.upsert({
    where: params.channelId
      ? { channelId_userId: { channelId: params.channelId, userId: params.userId } }
      : { conversationId_userId: { conversationId: params.conversationId!, userId: params.userId } },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      channelId: params.channelId,
      conversationId: params.conversationId,
      expiresAt,
    },
    update: {
      expiresAt,
    },
  });

  // Publish typing event to Ably
  if (params.channelId) {
    await publishToChannel(
      getChannelName(params.organizationId, params.channelId),
      "typing",
      { userId: params.userId, isTyping: true }
    );
  } else if (params.conversationId) {
    await publishToChannel(
      getConversationChannelName(params.organizationId, params.conversationId),
      "typing",
      { userId: params.userId, isTyping: true }
    );
  }
}

/**
 * Clear typing indicator
 */
export async function clearTypingIndicator(params: {
  organizationId: string;
  userId: string;
  channelId?: string;
  conversationId?: string;
}) {
  if (params.channelId) {
    await prismadb.typingIndicator.deleteMany({
      where: {
        channelId: params.channelId,
        userId: params.userId,
      },
    });
    await publishToChannel(
      getChannelName(params.organizationId, params.channelId),
      "typing",
      { userId: params.userId, isTyping: false }
    );
  } else if (params.conversationId) {
    await prismadb.typingIndicator.deleteMany({
      where: {
        conversationId: params.conversationId,
        userId: params.userId,
      },
    });
    await publishToChannel(
      getConversationChannelName(params.organizationId, params.conversationId),
      "typing",
      { userId: params.userId, isTyping: false }
    );
  }
}

// ============================================
// Presence
// ============================================

/**
 * Update user presence
 */
export async function updatePresence(
  userId: string,
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE",
  statusMessage?: string
) {
  return prismadb.userPresence.upsert({
    where: { userId },
    create: {
      userId,
      status,
      statusMessage,
      lastSeenAt: new Date(),
    },
    update: {
      status,
      statusMessage,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Get online users in an organization
 */
export async function getOnlineUsers(userIds: string[]) {
  return prismadb.userPresence.findMany({
    where: {
      userId: { in: userIds },
      status: { not: "OFFLINE" },
      lastSeenAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000), // Active in last 5 minutes
      },
    },
  });
}

// ============================================
// Search
// ============================================

/**
 * Search messages
 */
export async function searchMessages(params: {
  organizationId: string;
  userId: string;
  query: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
}) {
  return prismadb.message.findMany({
    where: {
      organizationId: params.organizationId,
      isDeleted: false,
      content: {
        contains: params.query,
        mode: "insensitive",
      },
      ...(params.channelId ? { channelId: params.channelId } : {}),
      ...(params.conversationId ? { conversationId: params.conversationId } : {}),
    },
    include: {
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
    take: params.limit || 20,
  });
}

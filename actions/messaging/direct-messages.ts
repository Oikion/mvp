"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { requireAction } from "@/lib/permissions";

/**
 * Start or get a direct message conversation with another user
 */
export async function startDirectMessage(targetUserId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:create_dm permission
    const guard = await requireAction("messaging:create_dm");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (targetUserId === currentUser.id) {
      return { success: false, error: "Cannot start a conversation with yourself" };
    }

    // Check for existing 1:1 conversation between these two users
    // NOTE: We don't scope by organizationId here because DMs between users 
    // should be reused regardless of which org context the user is currently in
    const existingConversation = await prismadb.conversation.findFirst({
      where: {
        isGroup: false,
        entityType: null, // Only pure DMs, not entity-linked conversations
        AND: [
          { participants: { some: { userId: currentUser.id, leftAt: null } } },
          { participants: { some: { userId: targetUserId, leftAt: null } } },
        ],
      },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });

    // Only return existing if it's exactly 2 participants (a true 1:1)
    if (existingConversation && existingConversation.participants.length === 2) {
      console.log("[MESSAGING] Found existing DM conversation:", existingConversation.id);
      return {
        success: true,
        conversationId: existingConversation.id,
      };
    }

    // Create new conversation
    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    console.log("[MESSAGING] Creating new DM conversation:", conversationId, "between", currentUser.id, "and", targetUserId);
    
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        isGroup: false,
        createdById: currentUser.id,
        participants: {
          create: [
            { userId: currentUser.id },
            { userId: targetUserId },
          ],
        },
      },
    });

    // Emit Ably event for real-time update to BOTH users
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      // Notify the target user
      await publishToChannel(
        getUserChannelName(targetUserId),
        "conversation:created",
        { id: conversation.id, isGroup: false }
      );
      // Also notify the current user (for other tabs/devices)
      await publishToChannel(
        getUserChannelName(currentUser.id),
        "conversation:created",
        { id: conversation.id, isGroup: false }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("[MESSAGING] Start DM error:", error);
    return { success: false, error: "Failed to start conversation" };
  }
}

/**
 * Start a direct message from a CRM client contact
 * Links the conversation to the client for context
 */
export async function startClientConversation(clientId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the client
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      select: {
        id: true,
        client_name: true,
        assigned_to: true,
      },
    });

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Check if there's already a conversation linked to this client
    const existingConversation = await prismadb.conversation.findFirst({
      where: {
        entityType: "CLIENT",
        entityId: clientId,
        organizationId,
      },
    });

    if (existingConversation) {
      return {
        success: true,
        conversationId: existingConversation.id,
      };
    }

    // Get participants (current user + assigned user if different)
    const participantIds = [currentUser.id];
    if (client.assigned_to && client.assigned_to !== currentUser.id) {
      participantIds.push(client.assigned_to);
    }

    // Create conversation linked to client
    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: `Client: ${client.client_name}`,
        isGroup: participantIds.length > 2,
        createdById: currentUser.id,
        entityType: "CLIENT",
        entityId: clientId,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of participantIds) {
        if (userId !== currentUser.id) {
          await publishToChannel(
            getUserChannelName(userId),
            "conversation:created",
            {
              id: conversation.id,
              isGroup: participantIds.length > 2,
              entityType: "CLIENT",
              entityId: clientId,
            }
          );
        }
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("[MESSAGING] Start client conversation error:", error);
    return { success: false, error: "Failed to start conversation" };
  }
}

/**
 * Start a direct message conversation about a property
 * Links the conversation to the property for context
 */
export async function startPropertyConversation(propertyId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the property
    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
      select: {
        id: true,
        property_name: true,
        assigned_to: true,
        watchers: true,
      },
    });

    if (!property) {
      return { success: false, error: "Property not found" };
    }

    // Check if there's already a conversation linked to this property
    const existingConversation = await prismadb.conversation.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: propertyId,
        organizationId,
      },
    });

    if (existingConversation) {
      return {
        success: true,
        conversationId: existingConversation.id,
      };
    }

    // Get participants (current user + assigned user + watchers)
    let participantIds = [currentUser.id];
    if (property.assigned_to && property.assigned_to !== currentUser.id) {
      participantIds.push(property.assigned_to);
    }
    if (property.watchers && property.watchers.length > 0) {
      participantIds = Array.from(new Set([...participantIds, ...property.watchers]));
    }

    // Create conversation linked to property
    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: `Property: ${property.property_name}`,
        isGroup: participantIds.length > 2,
        createdById: currentUser.id,
        entityType: "PROPERTY",
        entityId: propertyId,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of participantIds) {
        if (userId !== currentUser.id) {
          await publishToChannel(
            getUserChannelName(userId),
            "conversation:created",
            {
              id: conversation.id,
              isGroup: participantIds.length > 2,
              entityType: "PROPERTY",
              entityId: propertyId,
            }
          );
        }
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("[MESSAGING] Start property conversation error:", error);
    return { success: false, error: "Failed to start conversation" };
  }
}

/**
 * Get conversations linked to an entity
 */
export async function getEntityConversations(
  entityType: "CLIENT" | "PROPERTY" | "DEAL",
  entityId: string
): Promise<{
  success: boolean;
  conversations?: Array<{
    id: string;
    name: string | null;
    createdAt: Date;
  }>;
  error?: string;
}> {
  try {
    const organizationId = await getCurrentOrgId();

    const conversations = await prismadb.conversation.findMany({
      where: {
        entityType,
        entityId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, conversations };
  } catch (error) {
    console.error("[MESSAGING] Get entity conversations error:", error);
    return { success: false, error: "Failed to get conversations" };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(): Promise<{
  success: boolean;
  conversations?: Array<{
    id: string;
    name: string | null;
    isGroup: boolean;
    type: "dm" | "group" | "entity";
    entity?: {
      type: string;
      id: string;
    };
    participants: Array<{ userId: string; name?: string | null; avatar?: string | null }>;
    lastMessage?: {
      content: string;
      senderId: string;
      createdAt: Date;
    };
    unreadCount: number;
    isMuted: boolean;
  }>;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:read permission
    const guard = await requireAction("messaging:read");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const conversations = await prismadb.conversation.findMany({
      where: {
        organizationId,
        participants: {
          some: {
            userId: currentUser.id,
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          select: { userId: true, mutedUntil: true },
        },
        messages: {
          where: { isDeleted: false },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Get all participant user IDs to fetch their details
    const allParticipantIds = new Set<string>();
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => allParticipantIds.add(p.userId));
    });

    // Fetch user details for all participants
    const users = await prismadb.users.findMany({
      where: { id: { in: Array.from(allParticipantIds) } },
      select: { id: true, name: true, avatar: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prismadb.message.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            senderId: { not: currentUser.id },
            readReceipts: {
              none: { userId: currentUser.id },
            },
          },
        });

        // Determine type
        let type: "dm" | "group" | "entity" = "dm";
        if (conv.entityType && conv.entityId) {
          type = "entity";
        } else if (conv.isGroup) {
          type = "group";
        }

        // For DMs without a name, use the other participant's name
        let displayName = conv.name;
        if (!displayName && !conv.isGroup && conv.participants.length === 2) {
          const otherParticipant = conv.participants.find((p) => p.userId !== currentUser.id);
          if (otherParticipant) {
            const otherUser = userMap.get(otherParticipant.userId);
            displayName = otherUser?.name || otherUser?.email || null;
          }
        }

        // Enrich participants with user details
        const enrichedParticipants = conv.participants.map((p) => {
          const user = userMap.get(p.userId);
          return {
            userId: p.userId,
            name: user?.name || null,
            avatar: user?.avatar || null,
          };
        });

        // Check if current user has muted this conversation
        const currentUserParticipant = conv.participants.find(
          (p) => p.userId === currentUser.id
        );
        const isMuted = currentUserParticipant?.mutedUntil
          ? new Date(currentUserParticipant.mutedUntil) > new Date()
          : false;

        return {
          id: conv.id,
          name: displayName,
          isGroup: conv.isGroup,
          type,
          entity: conv.entityType && conv.entityId
            ? { type: conv.entityType, id: conv.entityId }
            : undefined,
          participants: enrichedParticipants,
          lastMessage: conv.messages[0] || undefined,
          unreadCount,
          isMuted,
        };
      })
    );

    return { success: true, conversations: conversationsWithUnread };
  } catch (error) {
    console.error("[MESSAGING] Get user conversations error:", error);
    return { success: false, error: "Failed to get conversations" };
  }
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(params: {
  name: string;
  participantIds: string[];
}): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:create_group permission
    const guard = await requireAction("messaging:create_group");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (params.participantIds.length < 1) {
      return { success: false, error: "Group must have at least one other participant" };
    }

    // Ensure current user is included
    const allParticipants = Array.from(new Set([currentUser.id, ...params.participantIds]));

    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: params.name,
        isGroup: true,
        createdById: currentUser.id,
        participants: {
          create: allParticipants.map((userId) => ({ userId })),
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of allParticipants) {
        await publishToChannel(
          getUserChannelName(userId),
          "conversation:created",
          {
            id: conversation.id,
            name: conversation.name,
            isGroup: true,
          }
        );
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("[MESSAGING] Create group conversation error:", error);
    return { success: false, error: "Failed to create group" };
  }
}

/**
 * Add participants to a conversation
 */
export async function addConversationParticipants(
  conversationId: string,
  userIds: string[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const organizationId = await getCurrentOrgId();

    const conversation = await prismadb.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    await prismadb.conversationParticipant.createMany({
      data: userIds.map((userId) => ({
        conversationId,
        userId,
      })),
      skipDuplicates: true,
    });

    // Emit Ably event
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of userIds) {
        await publishToChannel(
          getUserChannelName(userId),
          "conversation:joined",
          { id: conversationId }
        );
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Add participants error:", error);
    return { success: false, error: "Failed to add participants" };
  }
}

/**
 * Leave a conversation
 */
export async function leaveConversation(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();

    // First check if the participant record exists and user hasn't already left
    const participant = await prismadb.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
    });

    if (!participant) {
      return { success: false, error: "You are not a participant in this conversation" };
    }

    if (participant.leftAt) {
      return { success: false, error: "You have already left this conversation" };
    }

    await prismadb.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Leave conversation error:", error);
    return { success: false, error: "Failed to leave conversation" };
  }
}

/**
 * Mute a conversation (stop receiving notifications)
 * @param conversationId - The conversation to mute
 * @param mutedUntil - Optional: When to automatically unmute. If not provided, mutes indefinitely.
 */
export async function muteConversation(
  conversationId: string,
  mutedUntil?: Date
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();

    await prismadb.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      data: {
        // If no mutedUntil provided, set to a far future date (effectively indefinite)
        mutedUntil: mutedUntil || new Date("2099-12-31"),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Mute conversation error:", error);
    return { success: false, error: "Failed to mute conversation" };
  }
}

/**
 * Unmute a conversation (resume receiving notifications)
 */
export async function unmuteConversation(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();

    await prismadb.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      data: {
        mutedUntil: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Unmute conversation error:", error);
    return { success: false, error: "Failed to unmute conversation" };
  }
}

/**
 * Delete a conversation (only for DMs, soft delete by leaving)
 * For DMs, this leaves the conversation. For groups, it removes the user.
 */
export async function deleteConversation(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();

    // Get the conversation to check its type
    const conversation = await prismadb.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === currentUser.id
    );

    if (!isParticipant) {
      return { success: false, error: "You are not a participant in this conversation" };
    }

    // For DMs (2 participants), mark the user as having left
    // This effectively "deletes" the conversation for this user
    await prismadb.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Delete conversation error:", error);
    return { success: false, error: "Failed to delete conversation" };
  }
}

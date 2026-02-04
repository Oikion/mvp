"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * Create a group conversation with all members of an audience
 */
export async function createAudienceGroupChat(audienceId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the audience with its members
    const audience = await prismadb.audience.findFirst({
      where: {
        id: audienceId,
        OR: [
          { createdById: currentUser.id },
          { organizationId },
        ],
      },
      include: {
        AudienceMember: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!audience) {
      return { success: false, error: "Audience not found" };
    }

    if (audience.AudienceMember.length === 0) {
      return { success: false, error: "Audience has no members" };
    }

    // Check if there's already a conversation linked to this audience
    // Note: AUDIENCE is not a valid ConversationEntityType, so we use entityId for lookup
    const existingConversation = await prismadb.conversation.findFirst({
      where: {
        entityId: audienceId,
        organizationId,
        isGroup: true,
        name: { startsWith: audience.name },
      },
    });

    if (existingConversation) {
      return {
        success: true,
        conversationId: existingConversation.id,
      };
    }

    // Get all member user IDs + current user
    const memberIds = audience.AudienceMember.map((m) => m.userId);
    const allParticipants = Array.from(new Set([currentUser.id, ...memberIds]));

    // Create group conversation linked to audience
    // Note: entityType is not set since AUDIENCE is not a valid ConversationEntityType
    const conversationId = await generateFriendlyId(prismadb, "Conversation");
    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: `${audience.name}`,
        isGroup: true,
        createdById: currentUser.id,
        entityId: audienceId,
        participants: {
          create: allParticipants.map((userId) => ({ userId })),
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of allParticipants) {
        if (userId !== currentUser.id) {
          await publishToChannel(
            getUserChannelName(userId),
            "conversation:created",
            {
              id: conversation.id,
              name: conversation.name,
              isGroup: true,
              entityId: audienceId,
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
    console.error("[MESSAGING] Create audience group chat error:", error);
    return { success: false, error: "Failed to create group chat" };
  }
}

/**
 * Get the conversation for an audience (if it exists)
 */
export async function getAudienceConversation(audienceId: string): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const organizationId = await getCurrentOrgId();

    // Note: AUDIENCE is not a valid ConversationEntityType, so we search by entityId only
    const conversation = await prismadb.conversation.findFirst({
      where: {
        entityId: audienceId,
        organizationId,
        isGroup: true,
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return { success: true, conversationId: undefined };
    }

    return {
      success: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("[MESSAGING] Get audience conversation error:", error);
    return { success: false, error: "Failed to get conversation" };
  }
}

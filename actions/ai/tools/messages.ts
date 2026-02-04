"use server";

/**
 * AI Tool Actions - Messages
 *
 * Messaging operations for AI tool execution.
 * These functions receive context directly from the AI executor.
 */

import { prismadb } from "@/lib/prisma";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

// ============================================
// Types
// ============================================

interface GetRecentConversationsInput {
  limit?: number;
  channelType?: string;
}

interface DraftMessageResponseInput {
  conversationId: string;
  context?: string;
  tone?: string;
}

interface SendMessageInput {
  channelId: string;
  content: string;
  recipientId?: string;
}

// ============================================
// Message Functions
// ============================================

/**
 * Get recent conversations/messages
 */
export async function getRecentConversations(
  input: AIToolInput<GetRecentConversationsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 50);
    const { channelType } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (channelType) {
      where.channelType = channelType;
    }

    // Get channels with their recent messages
    const channels = await prismadb.channel.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        channelType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            userId: true,
          },
          take: 5,
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return successResponse({
      conversations: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.channelType,
        description: channel.description,
        memberIds: channel.members.map((m) => m.userId),
        recentMessages: channel.messages.map((m) => ({
          id: m.id,
          content: m.content,
          sender: m.sender,
          createdAt: m.createdAt.toISOString(),
        })),
        lastActivity: channel.updatedAt.toISOString(),
      })),
      totalConversations: channels.length,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get conversations"
    );
  }
}

/**
 * Draft a message response based on conversation context
 *
 * Note: This is a placeholder that returns a template.
 * In a full implementation, this would use AI to generate responses.
 */
export async function draftMessageResponse(
  input: AIToolInput<DraftMessageResponseInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { conversationId, context: messageContext, tone = "professional" } = input;

    if (!conversationId) {
      return errorResponse("Missing required field: conversationId");
    }

    // Get conversation context
    const channel = await prismadb.channel.findFirst({
      where: {
        id: conversationId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
        channelType: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            content: true,
            createdAt: true,
            sender: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!channel) {
      return errorResponse("Conversation not found");
    }

    // Generate a placeholder draft
    // A full implementation would use AI to generate contextual responses
    const recentMessages = channel.messages.map(
      (m) => `${m.sender?.name || "Unknown"}: ${m.content}`
    ).join("\n");

    const toneGuide: Record<string, string> = {
      professional: "Thank you for your message. I wanted to follow up regarding",
      friendly: "Hi there! Thanks for reaching out. I wanted to chat about",
      formal: "Dear valued contact, I am writing in response to your inquiry regarding",
    };

    const draftIntro = toneGuide[tone] || toneGuide.professional;

    return successResponse({
      conversationId: channel.id,
      conversationName: channel.name,
      tone,
      draft: `${draftIntro} our recent conversation.\n\n[Your message here]\n\nBest regards`,
      recentContext: recentMessages,
      message:
        "Note: Full AI-powered message drafting requires additional configuration.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to draft response"
    );
  }
}

/**
 * Send a message to a channel
 */
export async function sendMessage(
  input: AIToolInput<SendMessageInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { channelId, content, recipientId } = input;

    if (!channelId || !content) {
      return errorResponse("Missing required fields: channelId, content");
    }

    // Verify channel exists and user has access
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId: context.organizationId,
      },
    });

    if (!channel) {
      return errorResponse("Channel not found");
    }

    // Create the message
    // Note: senderId is required, but in AI tool context we may not have a user ID
    if (!context.userId) {
      return errorResponse("User context required to send messages");
    }

    const message = await prismadb.message.create({
      data: {
        channelId,
        senderId: context.userId,
        content,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    // Update channel's updatedAt
    await prismadb.channel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

    return successResponse(
      {
        message: {
          id: message.id,
          content: message.content,
          sender: message.sender,
          channelId,
          createdAt: message.createdAt.toISOString(),
        },
      },
      "Message sent successfully"
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to send message"
    );
  }
}

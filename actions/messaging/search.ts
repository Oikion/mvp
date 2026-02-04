"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

interface MessageSearchResult {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  createdAt: Date;
  highlight?: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  conversation?: {
    id: string;
    name: string | null;
    isGroup: boolean;
  };
}

interface SearchResult {
  channelId?: string;
  conversationId?: string;
  name: string;
  type: "channel" | "dm" | "group" | "entity";
  messages: MessageSearchResult[];
}

/**
 * Search messages across all user's conversations and channels
 */
export async function searchMessages(params: {
  query: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  success: boolean;
  results?: SearchResult[];
  totalCount?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!params.query || params.query.length < 2) {
      return { success: false, error: "Search query must be at least 2 characters" };
    }

    // Get channels user is a member of
    const memberships = await prismadb.channelMember.findMany({
      where: { userId: user.id },
      select: { channelId: true },
    });
    const channelIds = params.channelId 
      ? [params.channelId]
      : memberships.map(m => m.channelId);

    // Get conversations user is a participant of
    const participations = await prismadb.conversationParticipant.findMany({
      where: { userId: user.id, leftAt: null },
      select: { conversationId: true },
    });
    const conversationIds = params.conversationId
      ? [params.conversationId]
      : participations.map(p => p.conversationId);

    // Search messages using PostgreSQL full-text search
    const messages = await prismadb.message.findMany({
      where: {
        organizationId,
        isDeleted: false,
        content: { contains: params.query, mode: "insensitive" },
        OR: [
          { channelId: { in: channelIds } },
          { conversationId: { in: conversationIds } },
        ],
        ...(params.dateFrom && {
          createdAt: { gte: params.dateFrom },
        }),
        ...(params.dateTo && {
          createdAt: { lte: params.dateTo },
        }),
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true,
            entityType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
    });

    // Get sender names
    const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
    const senders = await prismadb.users.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true },
    });
    const senderMap = new Map(senders.map(s => [s.id, s.name]));

    // Group results by channel/conversation
    const resultMap = new Map<string, SearchResult>();

    for (const msg of messages) {
      const key = msg.channelId || msg.conversationId || "";
      
      if (!resultMap.has(key)) {
        let type: "channel" | "dm" | "group" | "entity" = "dm";
        let name = "";

        if (msg.channel) {
          type = "channel";
          name = msg.channel.name;
        } else if (msg.conversation) {
          if (msg.conversation.entityType) {
            type = "entity";
            name = msg.conversation.name || `${msg.conversation.entityType} Conversation`;
          } else if (msg.conversation.isGroup) {
            type = "group";
            name = msg.conversation.name || "Group";
          } else {
            type = "dm";
            name = msg.conversation.name || "Direct Message";
          }
        }

        resultMap.set(key, {
          channelId: msg.channelId || undefined,
          conversationId: msg.conversationId || undefined,
          name,
          type,
          messages: [],
        });
      }

      const result = resultMap.get(key)!;
      result.messages.push({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: senderMap.get(msg.senderId) || undefined,
        createdAt: msg.createdAt,
        highlight: createHighlightSnippet(msg.content, params.query),
        channel: msg.channel || undefined,
        conversation: msg.conversation || undefined,
      });
    }

    return {
      success: true,
      results: Array.from(resultMap.values()),
      totalCount: messages.length,
    };
  } catch (error) {
    console.error("[MESSAGING] Search error:", error);
    return { success: false, error: "Search failed" };
  }
}

/**
 * Create a highlighted snippet around the search term
 */
function createHighlightSnippet(content: string, query: string, contextLength: number = 50): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    return content.substring(0, contextLength * 2) + (content.length > contextLength * 2 ? "..." : "");
  }

  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + query.length + contextLength);

  let snippet = "";
  if (start > 0) snippet += "...";
  snippet += content.substring(start, index);
  snippet += `<mark>${content.substring(index, index + query.length)}</mark>`;
  snippet += content.substring(index + query.length, end);
  if (end < content.length) snippet += "...";

  return snippet;
}

/**
 * Search for users to mention in a message
 */
export async function searchMentionableUsers(params: {
  query: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  error?: string;
}> {
  try {
    const organizationId = await getCurrentOrgId();
    const currentUser = await getCurrentUser();

    if (!params.query || params.query.length < 1) {
      return { success: false, error: "Query required" };
    }

    let userIds: string[] = [];

    // Get users who can be mentioned (members of channel or conversation)
    if (params.channelId) {
      const members = await prismadb.channelMember.findMany({
        where: { channelId: params.channelId },
        select: { userId: true },
      });
      userIds = members.map(m => m.userId);
    } else if (params.conversationId) {
      const participants = await prismadb.conversationParticipant.findMany({
        where: { conversationId: params.conversationId, leftAt: null },
        select: { userId: true },
      });
      userIds = participants.map(p => p.userId);
    } else {
      // If no channel/conversation, get all org users (for new conversations)
      const users = await prismadb.users.findMany({
        where: {
          userStatus: "ACTIVE",
          OR: [
            { name: { contains: params.query, mode: "insensitive" } },
            { email: { contains: params.query, mode: "insensitive" } },
          ],
        },
        select: { id: true },
        take: params.limit || 10,
      });
      userIds = users.map(u => u.id);
    }

    // Filter out current user
    userIds = userIds.filter(id => id !== currentUser.id);

    // Get user details matching query
    const users = await prismadb.users.findMany({
      where: {
        id: { in: userIds },
        OR: [
          { name: { contains: params.query, mode: "insensitive" } },
          { email: { contains: params.query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
      take: params.limit || 10,
    });

    return {
      success: true,
      users: users.map(user => ({
        id: user.id,
        name: user.name || "Unknown",
        avatar: user.avatar || undefined,
      })),
    };
  } catch (error) {
    console.error("[MESSAGING] Search mentionable users error:", error);
    return { success: false, error: "Search failed" };
  }
}

/**
 * Ably Real-Time Messaging Library
 * 
 * Server-side utilities for Ably token authentication.
 * Provides token requests for authenticated users.
 */

import Ably from "ably";

// Get Ably API key from environment
const ABLY_API_KEY = process.env.ABLY_API_KEY;

/**
 * Check if Ably is configured
 */
export function isAblyConfigured(): boolean {
  return !!ABLY_API_KEY;
}

/**
 * Create an Ably REST client for server-side operations
 */
export function getAblyClient(): Ably.Rest | null {
  if (!ABLY_API_KEY) {
    return null;
  }
  return new Ably.Rest({ key: ABLY_API_KEY });
}

/**
 * Generate an Ably token request for a user
 * 
 * This token request is sent to the client, which uses it to authenticate
 * with Ably's servers directly. The token includes:
 * - User ID as clientId (for presence and message attribution)
 * - Capability to subscribe to organization channels
 * 
 * @param userId - The Clerk user ID
 * @param organizationId - The organization ID
 * @returns Token request object or null if Ably is not configured
 */
export async function createAblyTokenRequest(
  userId: string,
  organizationId: string
): Promise<Ably.TokenRequest | null> {
  if (!ABLY_API_KEY) {
    console.warn("[ABLY] API key not configured");
    return null;
  }

  const client = new Ably.Rest({ key: ABLY_API_KEY });

  // Define capabilities for this user
  // They can subscribe to their org's channels and their own user channel
  const capability: Record<string, string[]> = {
    // Organization-wide channel for broadcasts
    [`org:${organizationId}`]: ["subscribe", "publish", "presence"],
    // Channels for this org (public and private they're members of)
    [`org:${organizationId}:channel:*`]: ["subscribe", "publish", "presence"],
    // Conversations (DMs and group chats)
    [`org:${organizationId}:conversation:*`]: ["subscribe", "publish", "presence"],
    // Social feed channel for real-time post updates
    [`org:${organizationId}:social-feed`]: ["subscribe", "publish"],
    // Personal channel for direct notifications
    [`user:${userId}`]: ["subscribe", "publish"],
    // Presence updates
    [`org:${organizationId}:presence`]: ["subscribe", "presence"],
  };

  try {
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000, // 1 hour
    });

    return tokenRequest;
  } catch (error) {
    console.error("[ABLY] Failed to create token request:", error);
    return null;
  }
}

/**
 * Publish a message to an Ably channel (server-side)
 * Used when you need to push real-time updates from server actions
 * 
 * @param channelName - The Ably channel name
 * @param eventName - The event name (e.g., "message", "typing")
 * @param data - The data to publish
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<boolean> {
  const client = getAblyClient();
  if (!client) {
    console.warn("[ABLY] Cannot publish - Ably not configured");
    return false;
  }

  try {
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
    return true;
  } catch (error) {
    console.error("[ABLY] Failed to publish:", error);
    return false;
  }
}

/**
 * Get the Ably channel name for an organization channel
 */
export function getChannelName(organizationId: string, channelId: string): string {
  return `org:${organizationId}:channel:${channelId}`;
}

/**
 * Get the Ably channel name for a conversation
 */
export function getConversationChannelName(organizationId: string, conversationId: string): string {
  return `org:${organizationId}:conversation:${conversationId}`;
}

/**
 * Get the Ably channel name for organization-wide broadcasts
 */
export function getOrgChannelName(organizationId: string): string {
  return `org:${organizationId}`;
}

/**
 * Get the Ably channel name for a user's personal notifications
 */
export function getUserChannelName(userId: string): string {
  return `user:${userId}`;
}

/**
 * Get the Ably channel name for organization presence
 */
export function getPresenceChannelName(organizationId: string): string {
  return `org:${organizationId}:presence`;
}

/**
 * Get the Ably channel name for social feed updates
 */
export function getSocialFeedChannelName(organizationId: string): string {
  return `org:${organizationId}:social-feed`;
}

// ============================================
// Real-time Event Types
// ============================================

export interface AblyMessageEvent {
  type: "new" | "edit" | "delete";
  message: {
    id: string;
    content: string;
    senderId: string;
    channelId?: string;
    conversationId?: string;
    createdAt: string;
    attachments?: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      url: string;
    }>;
  };
}

export interface AblyReactionEvent {
  type: "add" | "remove";
  messageId: string;
  userId: string;
  emoji: string;
}

export interface AblyTypingEvent {
  userId: string;
  isTyping: boolean;
}

export interface AblyPresenceEvent {
  userId: string;
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
}

// ============================================
// Social Feed Event Types
// ============================================

export interface AblySocialPostEvent {
  type: "created" | "deleted";
  post: {
    id: string;
    slug?: string;
    type: "property" | "client" | "text";
    content: string;
    timestamp: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
      organizationName?: string;
      visibility?: "PERSONAL" | "SECURE" | "PUBLIC";
    };
    linkedEntity?: {
      id: string;
      type: "property" | "client";
      title: string;
      subtitle?: string;
      image?: string;
      metadata?: Record<string, unknown>;
    };
    attachments?: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      url: string;
    }>;
    likes: number;
    comments: number;
    isLiked?: boolean;
    isOwn?: boolean;
    isFromConnection?: boolean;
  };
}

export interface AblySocialLikeEvent {
  postId: string;
  userId: string;
  type: "liked" | "unliked";
  newLikeCount: number;
}

export interface AblySocialCommentEvent {
  type: "added" | "deleted";
  postId: string;
  comment?: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    parentId?: string;
  };
  commentId?: string;
  newCommentCount: number;
}

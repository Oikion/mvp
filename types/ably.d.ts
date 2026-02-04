/**
 * Ably Real-Time Messaging Types
 * 
 * Type definitions for Ably messaging events and payloads.
 */

// ============================================
// Message Events
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

// ============================================
// Reaction Events
// ============================================

export interface AblyReactionEvent {
  type: "add" | "remove";
  messageId: string;
  userId: string;
  emoji: string;
}

// ============================================
// Typing Events
// ============================================

export interface AblyTypingEvent {
  userId: string;
  isTyping: boolean;
}

// ============================================
// Presence Events
// ============================================

export interface AblyPresenceEvent {
  userId: string;
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
  statusMessage?: string;
}

// ============================================
// Mention Events
// ============================================

export interface AblyMentionEvent {
  messageId: string;
  senderId: string;
  channelId?: string;
  conversationId?: string;
}

// ============================================
// Channel Names
// ============================================

export type AblyChannelType = 
  | "org" // Organization-wide broadcasts
  | "channel" // Organization channels
  | "conversation" // DMs and group chats
  | "user" // Personal notifications
  | "presence"; // Presence updates

// ============================================
// Credentials
// ============================================

export interface AblyCredentials {
  userId: string;
  organizationId: string;
  tokenRequest: {
    keyName: string;
    timestamp: number;
    nonce: string;
    mac: string;
    ttl?: number;
    capability?: string;
    clientId?: string;
  };
}

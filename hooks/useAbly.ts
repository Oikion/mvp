"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSWRConfig } from "swr";
import type { TokenRequest as AblyTokenRequest } from "ably";
import type { MessagingCredentials } from "./swr/useMessaging";
import { getMessagesKey } from "./swr/useMessaging";
import type { Message, MessagesResponse } from "./swr/useMessaging";

// Types for Ably (to avoid importing at module level)
interface AblyRealtimeChannel {
  attach: () => Promise<void>;
  detach: () => Promise<void>;
  subscribe: (eventName: string, handler: (message: { data: unknown }) => void) => void;
  unsubscribe: (eventName: string, handler: (message: { data: unknown }) => void) => void;
  publish: (eventName: string, data: unknown) => Promise<void>;
}

interface AblyRealtime {
  connection: {
    state: string;
    on: (handler: (stateChange: { current: string; reason?: { message: string } }) => void) => void;
    off: (handler: (stateChange: { current: string; reason?: { message: string } }) => void) => void;
  };
  channels: {
    get: (name: string) => AblyRealtimeChannel;
  };
  connect: () => void;
  close: () => void;
}

// Ably client singleton - lazy loaded
let ablyClient: AblyRealtime | null = null;
let ablyPromise: Promise<AblyRealtime> | null = null;
let currentUserId: string | null = null;

/**
 * Get or create the Ably client (lazy loaded)
 * 
 * The authCallback fetches fresh credentials from the API each time
 * Ably needs to authenticate (initial connection or token refresh).
 * This prevents "Client configured authentication provider request failed"
 * errors when the original token expires.
 */
async function getAblyClient(initialTokenRequest: unknown, userId?: string): Promise<AblyRealtime> {
  // If the user changed, close the old connection and create a new one
  if (userId && currentUserId && userId !== currentUserId) {
    console.log("[ABLY] User changed, reconnecting...");
    closeAblyConnection();
  }
  
  if (userId) {
    currentUserId = userId;
  }

  if (ablyClient) {
    // Check if connection is in a bad state and reconnect
    if (ablyClient.connection.state === "failed" || ablyClient.connection.state === "suspended") {
      console.log("[ABLY] Connection in bad state, reconnecting...");
      closeAblyConnection();
    } else {
      return ablyClient;
    }
  }

  if (ablyPromise) {
    return ablyPromise;
  }

  // Track if this is the first authentication attempt
  let isFirstAuth = true;

  ablyPromise = (async () => {
    // Dynamic import to avoid SSR issues with Ably's node-specific modules
    const Ably = await import("ably");
    
    const client = new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          // For the first auth, use the provided token to avoid an extra API call
          // For subsequent auths (token refresh), fetch fresh credentials
          if (isFirstAuth && initialTokenRequest) {
            isFirstAuth = false;
            callback(null, initialTokenRequest as AblyTokenRequest);
            return;
          }

          // Fetch fresh credentials from the API
          // Include credentials to ensure cookies/auth tokens are sent
          const response = await fetch("/api/messaging/credentials", {
            credentials: "include",
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || "Failed to fetch credentials";
            console.error("[ABLY] Credentials API error:", errorMessage);
            // If unauthorized, don't throw - just return null to allow graceful degradation
            if (response.status === 401) {
              callback("Unauthorized", null);
              return;
            }
            throw new Error(errorMessage);
          }
          const data = await response.json();
          
          if (!data.tokenRequest) {
            throw new Error("No token request in response");
          }
          
          callback(null, data.tokenRequest as AblyTokenRequest);
        } catch (error) {
          console.error("[ABLY] Auth callback failed:", error);
          callback(error instanceof Error ? error.message : "Authentication failed", null);
        }
      },
      // In dev, Turbopack/HMR can cause frequent disconnects. Low retry timeout
      // (1s) keeps the gap between drop and reconnect short. Production
      // connections stay alive and never hit this path.
      disconnectedRetryTimeout: 1000,
      suspendedRetryTimeout: 10000,
      closeOnUnload: true,
    });

    ablyClient = client as unknown as AblyRealtime;
    return ablyClient;
  })();

  return ablyPromise;
}

/**
 * Close the Ably connection
 */
export function closeAblyConnection() {
  if (ablyClient) {
    try {
      ablyClient.close();
    } catch {
      // Ignore errors when closing
    }
    ablyClient = null;
    ablyPromise = null;
  }
}

/**
 * Hook for managing Ably connection
 */
export function useAblyConnection(credentials?: MessagingCredentials) {
  const [connectionState, setConnectionState] = useState<string>("initialized");
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<AblyRealtime | null>(null);
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  // Only retrigger on user identity change — token refresh is handled by authCallback.
  const credUserId = credentials?.userId;
  const hasToken = !!credentials?.tokenRequest;

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const creds = credentialsRef.current!;
        const client = await getAblyClient(creds.tokenRequest, creds.userId);

        if (!mounted) return;

        clientRef.current = client;

        const handleStateChange = (stateChange: { current: string; reason?: { message: string } }) => {
          if (!mounted) return;
          if (process.env.NODE_ENV === "development") {
            console.log(`[ABLY] connection → ${stateChange.current}`, stateChange.reason?.message ?? "");
          }
          setConnectionState(stateChange.current);
          if (stateChange.reason) {
            setError(new Error(stateChange.reason.message));
          } else {
            setError(null);
          }
        };

        client.connection.on(handleStateChange);
        if (process.env.NODE_ENV === "development") {
          console.log(`[ABLY] initial state: ${client.connection.state}`);
        }
        setConnectionState(client.connection.state);

        // Connect if not already connected
        if (client.connection.state === "initialized") {
          client.connect();
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to connect"));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [credUserId, hasToken]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
    error,
  };
}

/**
 * Hook for subscribing to an Ably channel
 */
export function useAblyChannel(
  channelName: string | null,
  credentials?: MessagingCredentials
) {
  const channelRef = useRef<AblyRealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const attachPromiseRef = useRef<Promise<void> | null>(null);
  // Monotonically increasing counter: each new mount gets a unique generation.
  // Ably channel objects are singletons (same name → same object), so we cannot
  // use object-reference equality to tell whether a stale cleanup should detach.
  // Comparing captured generation vs. current generation solves the race.
  const generationRef = useRef(0);

  // Keep credentials accessible inside the effect without listing the whole
  // object as a dep. Token requests change on every SWR revalidation (new nonce),
  // but the Ably client's authCallback handles token refresh transparently —
  // we only need to reattach when the channel name or user identity changes.
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;

  // Stable primitive: only retrigger channel attachment when the user identity
  // changes (genuine reconnect), not when the token request object reference changes.
  const credUserId = credentials?.userId;

  useEffect(() => {
    if (!channelName || !credentialsRef.current?.tokenRequest) {
      return;
    }

    let mounted = true;
    const generation = ++generationRef.current;

    (async () => {
      try {
        const creds = credentialsRef.current!;
        const client = await getAblyClient(creds.tokenRequest, creds.userId);

        if (!mounted) return;

        const channel = client.channels.get(channelName);
        channelRef.current = channel;

        attachPromiseRef.current = channel.attach();
        await attachPromiseRef.current;

        if (mounted && generation === generationRef.current) {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("[ABLY] Failed to attach to channel:", err);
        if (mounted) {
          setIsSubscribed(false);
        }
      }
    })();

    return () => {
      mounted = false;
      setIsSubscribed(false);

      const channelToDetach = channelRef.current;
      const attachPromise = attachPromiseRef.current;
      const capturedGeneration = generation;

      if (channelToDetach) {
        Promise.resolve(attachPromise)
          .then(() => new Promise<void>(resolve => setTimeout(resolve, 50)))
          .then(() => {
            // Skip if a newer mount has since taken over this channel name.
            // This is the critical guard: without it, the old cleanup would
            // detach the channel that the new mount just attached (because
            // Ably reuses the same object for the same channel name).
            if (capturedGeneration === generationRef.current) {
              return channelToDetach.detach();
            }
          })
          .catch(() => {
            // Ignore — channel may already be detached or the connection closed
          })
          .finally(() => {
            if (capturedGeneration === generationRef.current) {
              channelRef.current = null;
              attachPromiseRef.current = null;
            }
          });
      } else {
        channelRef.current = null;
        attachPromiseRef.current = null;
      }
    };
  }, [channelName, credUserId]);

  const publish = useCallback(async (eventName: string, data: unknown) => {
    if (channelRef.current && isSubscribed) {
      try {
        await channelRef.current.publish(eventName, data);
      } catch (err) {
        // Handle "Channel detached" errors gracefully
        if (err instanceof Error && err.message.includes("detached")) {
          console.warn("[ABLY] Channel detached, cannot publish:", err.message);
          return;
        }
        throw err;
      }
    }
  }, [isSubscribed]);

  return {
    channel: channelRef.current,
    isSubscribed,
    publish,
  };
}

// Message event types from server
interface AblyMessageEvent {
  type: "new" | "edit" | "delete";
  message: {
    id: string;
    content: string;
    contentType?: string;
    senderId: string;
    senderName?: string | null;
    senderAvatar?: string | null;
    senderEmail?: string | null;
    senderProfileSlug?: string | null;
    channelId?: string | null;
    conversationId?: string | null;
    parentId?: string | null;
    createdAt: string;
    attachments?: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      url: string;
    }>;
    linkedEntityId?: string | null;
    linkedEntityType?: string | null;
    linkedEntityTitle?: string | null;
    linkedEntitySubtitle?: string | null;
    linkedEntityFriendlyId?: string | null;
  };
}

interface AblyTypingEvent {
  userId: string;
  userName?: string;
  isTyping: boolean;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * Lightweight hook for publishing to an Ably channel without managing
 * channel lifecycle (no attach/detach). Safe to use in components that
 * only need to publish (e.g. typing indicators in MessageComposer) without
 * risking detaching the channel that a sibling subscriber depends on.
 */
export function useAblyPublish(
  channelName: string | null,
  credentials?: MessagingCredentials
) {
  const publish = useCallback(
    async (eventName: string, data: unknown) => {
      if (!channelName || !credentials?.tokenRequest) return;
      try {
        const client = await getAblyClient(credentials.tokenRequest, credentials.userId);
        const channel = client.channels.get(channelName);
        await channel.publish(eventName, data);
      } catch (err) {
        if (err instanceof Error && err.message.includes("detached")) return;
        throw err;
      }
    },
    [channelName, credentials?.userId]
  );

  return { publish };
}

/**
 * Hook for real-time messaging in a channel or conversation
 */
export function useAblyMessages(params: {
  channelId?: string;
  conversationId?: string;
  organizationId?: string;
  credentials?: MessagingCredentials;
  onNewMessage?: (message: AblyMessageEvent["message"]) => void;
  onMessageEdit?: (message: AblyMessageEvent["message"]) => void;
  onMessageDelete?: (messageId: string) => void;
}) {
  const { mutate } = useSWRConfig();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Extract primitives so effect deps stay stable across renders.
  // Callback refs let handlers always call the latest version without
  // being listed as deps (avoids re-subscribing on every render).
  const { channelId, conversationId, organizationId } = params;
  const credUserId = params.credentials?.userId;
  const onNewMessageRef = useRef(params.onNewMessage);
  const onMessageEditRef = useRef(params.onMessageEdit);
  const onMessageDeleteRef = useRef(params.onMessageDelete);
  // Keep refs current on every render without triggering effects
  onNewMessageRef.current = params.onNewMessage;
  onMessageEditRef.current = params.onMessageEdit;
  onMessageDeleteRef.current = params.onMessageDelete;

  // Build org-scoped channel name (works for same-org conversations and all channels)
  const ablyChannelName = organizationId && (channelId || conversationId)
    ? channelId
      ? `org:${organizationId}:channel:${channelId}`
      : `org:${organizationId}:conversation:${conversationId}`
    : null;

  // User-level channel for cross-org DM delivery (always in token capabilities)
  const userChannelName = credUserId ? `user:${credUserId}` : null;

  const { channel, isSubscribed, publish } = useAblyChannel(
    ablyChannelName,
    params.credentials
  );

  // Secondary subscription: personal user channel catches messages from cross-org connections
  const { channel: userChannel, isSubscribed: userChannelSubscribed } = useAblyChannel(
    userChannelName,
    params.credentials
  );

  // Subscribe to user-channel events for cross-org DMs.
  useEffect(() => {
    if (!userChannel || !userChannelSubscribed || !conversationId) return;

    const handleUserChannelMessage = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      if (data.conversationId !== conversationId) return;
      onNewMessageRef.current?.(data);
      const key = getMessagesKey({ conversationId });
      if (key && data.content != null) {
        mutate<MessagesResponse>(
          key,
          (current) => {
            if (!current) return current;
            if (current.messages.some((m) => m.id === data.id)) return current;
            const optimistic: Message = {
              id: data.id,
              content: data.content,
              contentType: data.contentType ?? "TEXT",
              senderId: data.senderId,
              senderName: data.senderName ?? null,
              senderAvatar: data.senderAvatar ?? null,
              senderEmail: data.senderEmail ?? null,
              senderProfileSlug: data.senderProfileSlug ?? null,
              channelId: data.channelId ?? null,
              conversationId: data.conversationId ?? null,
              parentId: data.parentId ?? null,
              threadCount: 0,
              isEdited: false,
              createdAt: new Date(data.createdAt),
              attachments: data.attachments ?? [],
              reactions: [],
              mentions: [],
              entityAttachment: data.linkedEntityId ? {
                id: data.linkedEntityId,
                type: data.linkedEntityType as "property" | "contact" | "document" | "request",
                title: data.linkedEntityTitle ?? null,
                subtitle: data.linkedEntitySubtitle ?? null,
                friendlyId: data.linkedEntityFriendlyId ?? null,
              } : undefined,
            };
            return { ...current, messages: [...current.messages, optimistic] };
          },
          { revalidate: true }
        );
      } else {
        mutate(key);
      }
      // Refresh sidebar unread counts for the DM list
      mutate("/api/messaging/conversations");
    };

    const handleUserChannelEdit = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      if (data.conversationId !== conversationId) return;
      onMessageEditRef.current?.(data);
      mutate(getMessagesKey({ conversationId }));
    };

    const handleUserChannelDelete = (message: { data: unknown }) => {
      const data = message.data as { id: string; conversationId?: string };
      if (data.conversationId !== conversationId) return;
      onMessageDeleteRef.current?.(data.id);
      mutate(getMessagesKey({ conversationId }));
    };

    userChannel.subscribe("message:new", handleUserChannelMessage);
    userChannel.subscribe("message:edited", handleUserChannelEdit);
    userChannel.subscribe("message:deleted", handleUserChannelDelete);

    return () => {
      userChannel.unsubscribe("message:new", handleUserChannelMessage);
      userChannel.unsubscribe("message:edited", handleUserChannelEdit);
      userChannel.unsubscribe("message:deleted", handleUserChannelDelete);
    };
  }, [userChannel, userChannelSubscribed, conversationId, mutate]);

  // Subscribe to message events on the org-scoped channel
  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handleNewMessage = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      onNewMessageRef.current?.(data);
      const key = getMessagesKey({ channelId, conversationId });
      if (key && data.content != null) {
        // Optimistic insert: recipient sees the message immediately, same as the sender.
        // { revalidate: true } runs a background fetch to reconcile (reactions, etc.).
        mutate<MessagesResponse>(
          key,
          (current) => {
            if (!current) return current;
            if (current.messages.some((m) => m.id === data.id)) return current;
            const optimistic: Message = {
              id: data.id,
              content: data.content,
              contentType: data.contentType ?? "TEXT",
              senderId: data.senderId,
              senderName: data.senderName ?? null,
              senderAvatar: data.senderAvatar ?? null,
              senderEmail: data.senderEmail ?? null,
              senderProfileSlug: data.senderProfileSlug ?? null,
              channelId: data.channelId ?? null,
              conversationId: data.conversationId ?? null,
              parentId: data.parentId ?? null,
              threadCount: 0,
              isEdited: false,
              createdAt: new Date(data.createdAt),
              attachments: data.attachments ?? [],
              reactions: [],
              mentions: [],
              entityAttachment: data.linkedEntityId ? {
                id: data.linkedEntityId,
                type: data.linkedEntityType as "property" | "contact" | "document" | "request",
                title: data.linkedEntityTitle ?? null,
                subtitle: data.linkedEntitySubtitle ?? null,
                friendlyId: data.linkedEntityFriendlyId ?? null,
              } : undefined,
            };
            return { ...current, messages: [...current.messages, optimistic] };
          },
          { revalidate: true }
        );
      } else {
        mutate(key);
      }
      // Refresh sidebar unread counts — a new message may raise the badge on another channel
      mutate("/api/messaging/channels");
      mutate("/api/messaging/conversations");
    };

    const handleEditedMessage = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      onMessageEditRef.current?.(data);
      mutate(getMessagesKey({ channelId, conversationId }));
    };

    const handleDeletedMessage = (message: { data: unknown }) => {
      const data = message.data as { id: string };
      onMessageDeleteRef.current?.(data.id);
      mutate(getMessagesKey({ channelId, conversationId }));
    };

    const handleTyping = (message: { data: unknown }) => {
      const data = message.data as AblyTypingEvent;

      if (data.userId === credUserId) return;

      const existingTimeout = typingTimeoutsRef.current.get(data.userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const typingUser: TypingUser = { userId: data.userId, userName: data.userName || "Someone" };

      if (data.isTyping) {
        setTypingUsers(prev =>
          prev.some(u => u.userId === data.userId) ? prev : [...prev, typingUser]
        );

        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
          typingTimeoutsRef.current.delete(data.userId);
        }, 5000);
        typingTimeoutsRef.current.set(data.userId, timeout);
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        typingTimeoutsRef.current.delete(data.userId);
      }
    };

    channel.subscribe("message:new", handleNewMessage);
    channel.subscribe("message:edited", handleEditedMessage);
    channel.subscribe("message:deleted", handleDeletedMessage);
    channel.subscribe("typing", handleTyping);

    return () => {
      channel.unsubscribe("message:new", handleNewMessage);
      channel.unsubscribe("message:edited", handleEditedMessage);
      channel.unsubscribe("message:deleted", handleDeletedMessage);
      channel.unsubscribe("typing", handleTyping);
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [channel, isSubscribed, channelId, conversationId, credUserId, mutate]);

  const sendTyping = useCallback(async (isTyping: boolean, userName?: string) => {
    if (credUserId) {
      await publish("typing", { userId: credUserId, userName, isTyping });
    }
  }, [publish, credUserId]);

  return {
    isSubscribed,
    typingUsers,
    sendTyping,
  };
}

/**
 * Hook for user presence
 */
export function useAblyPresence(params: {
  organizationId?: string;
  credentials?: MessagingCredentials;
}) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { status: string; statusMessage?: string }>>(new Map());

  const presenceChannelName = params.organizationId
    ? `org:${params.organizationId}:presence`
    : null;

  const { channel, isSubscribed } = useAblyChannel(
    presenceChannelName,
    params.credentials
  );

  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handlePresence = (message: { data: unknown }) => {
      const data = message.data as { userId: string; status: string; statusMessage?: string };
      setOnlineUsers(prev => {
        const next = new Map(prev);
        if (data.status === "OFFLINE") {
          next.delete(data.userId);
        } else {
          next.set(data.userId, { status: data.status, statusMessage: data.statusMessage });
        }
        return next;
      });
    };

    channel.subscribe("presence", handlePresence);

    return () => {
      channel.unsubscribe("presence", handlePresence);
    };
  }, [channel, isSubscribed]);

  return {
    onlineUsers,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    getUserStatus: (userId: string) => onlineUsers.get(userId)?.status || "OFFLINE",
  };
}

/**
 * Hook for user notifications (mentions, DMs, etc.)
 */
export function useAblyNotifications(params: {
  userId?: string;
  credentials?: MessagingCredentials;
  onMention?: (data: { messageId: string; senderId: string; channelId?: string; conversationId?: string }) => void;
  onConversationCreated?: (data: { id: string; isGroup: boolean; name?: string; entityType?: string; entityId?: string }) => void;
}) {
  const { mutate } = useSWRConfig();

  const { userId, credentials } = params;
  const userChannelName = userId ? `user:${userId}` : null;

  const onMentionRef = useRef(params.onMention);
  const onConversationCreatedRef = useRef(params.onConversationCreated);
  onMentionRef.current = params.onMention;
  onConversationCreatedRef.current = params.onConversationCreated;

  const { channel, isSubscribed } = useAblyChannel(userChannelName, credentials);

  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handleMention = (message: { data: unknown }) => {
      onMentionRef.current?.(message.data as { messageId: string; senderId: string; channelId?: string; conversationId?: string });
      // A mention creates a Notification row — refresh the nav badge count
      mutate("/api/notifications/counts");
    };

    const handleConversationCreated = (message: { data: unknown }) => {
      const data = message.data as { id: string; isGroup: boolean; name?: string; entityType?: string; entityId?: string };
      onConversationCreatedRef.current?.(data);
      mutate("/api/messaging/conversations");
    };

    // New message on the personal channel: update the DM sidebar immediately,
    // then revalidate the nav notification count after a short delay so we don't
    // race against markAsRead clearing the same Notification rows when the thread is open.
    const handleNewMessageNotification = () => {
      mutate("/api/messaging/conversations");
      // Delay gives markAsRead time to complete before we re-fetch counts.
      // If the thread is closed, the badge appears ~1.5s after the message arrives
      // (still well within user perception). If the thread is open, markAsRead will
      // have already called mutate("/api/notifications/counts") by then.
      setTimeout(() => mutate("/api/notifications/counts"), 1500);
    };

    const handleNotificationNew = (_message: { data: unknown }) => {
      // Invalidate all notification SWR keys so the bell updates instantly
      mutate(
        (key: unknown) =>
          typeof key === "string" && key.startsWith("/api/notifications"),
        undefined,
        { revalidate: true }
      );
    };

    channel.subscribe("mention", handleMention);
    channel.subscribe("conversation:created", handleConversationCreated);
    channel.subscribe("message:new", handleNewMessageNotification);
    channel.subscribe("notification:new", handleNotificationNew);

    return () => {
      channel.unsubscribe("mention", handleMention);
      channel.unsubscribe("conversation:created", handleConversationCreated);
      channel.unsubscribe("message:new", handleNewMessageNotification);
      channel.unsubscribe("notification:new", handleNotificationNew);
    };
  }, [channel, isSubscribed, mutate]);

  return {
    isSubscribed,
  };
}

// ============================================
// Social Feed Real-Time Types
// ============================================

export interface SocialPost {
  id: string;
  slug?: string | null;
  type: "property" | "contact" | "text";
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    organizationName?: string;
    visibility?: "PRIVATE" | "SECURE" | "PUBLIC";
  };
  linkedEntity?: {
    id: string;
    type: "property" | "contact";
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
}

/** Slim payload from server — no PII, no content. */
interface SocialPostSlimEvent {
  type: "created" | "deleted";
  post: {
    id: string;
    slug?: string;
    type: string;
    timestamp?: string;
    authorId?: string;
  };
}

/** @deprecated Full payload — only used for client-side optimistic publishes */
interface SocialPostEvent {
  type: "created" | "deleted";
  post: SocialPost;
}

interface SocialLikeEvent {
  postId: string;
  userId: string;
  type: "liked" | "unliked";
  newLikeCount: number;
}

interface SocialCommentEvent {
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

/**
 * Hook for real-time social feed updates
 */
export function useAblyFeed(params: {
  organizationId?: string;
  credentials?: MessagingCredentials;
  /** @deprecated Use onPostNotification instead — Ably no longer carries full post data */
  onPostCreated?: (post: SocialPost) => void;
  onPostDeleted?: (postId: string) => void;
  /** Called when a new post is created — receives only the post ID and authorId.
   *  Consumer should refetch the feed from the API. */
  onPostNotification?: (data: { id: string; authorId?: string; type: string }) => void;
  onPostLiked?: (data: { postId: string; userId: string; newLikeCount: number; isLiked: boolean }) => void;
  onCommentAdded?: (data: { postId: string; comment: SocialCommentEvent["comment"]; newCommentCount: number }) => void;
  onCommentDeleted?: (data: { postId: string; commentId: string; newCommentCount: number }) => void;
}) {
  // Extract primitive and store callbacks in refs so the effect deps stay stable.
  // Without this, passing an inline params object causes re-subscription every render.
  const { organizationId } = params;
  const onPostCreatedRef = useRef(params.onPostCreated);
  const onPostDeletedRef = useRef(params.onPostDeleted);
  const onPostNotificationRef = useRef(params.onPostNotification);
  const onPostLikedRef = useRef(params.onPostLiked);
  const onCommentAddedRef = useRef(params.onCommentAdded);
  const onCommentDeletedRef = useRef(params.onCommentDeleted);
  onPostCreatedRef.current = params.onPostCreated;
  onPostDeletedRef.current = params.onPostDeleted;
  onPostNotificationRef.current = params.onPostNotification;
  onPostLikedRef.current = params.onPostLiked;
  onCommentAddedRef.current = params.onCommentAdded;
  onCommentDeletedRef.current = params.onCommentDeleted;

  const feedChannelName = organizationId
    ? `org:${organizationId}:social-feed`
    : null;

  const { channel, isSubscribed, publish } = useAblyChannel(
    feedChannelName,
    params.credentials
  );

  // Subscribe to social feed events
  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handlePost = (message: { data: unknown }) => {
      const data = message.data as SocialPostSlimEvent;

      switch (data.type) {
        case "created":
          onPostNotificationRef.current?.({
            id: data.post.id,
            authorId: data.post.authorId,
            type: data.post.type,
          });
          // Legacy full-payload fallback (client-side optimistic publishes)
          if ("author" in data.post) {
            onPostCreatedRef.current?.(data.post as unknown as SocialPost);
          }
          break;
        case "deleted":
          onPostDeletedRef.current?.(data.post.id);
          break;
      }
    };

    const handleLike = (message: { data: unknown }) => {
      const data = message.data as SocialLikeEvent;
      onPostLikedRef.current?.({
        postId: data.postId,
        userId: data.userId,
        newLikeCount: data.newLikeCount,
        isLiked: data.type === "liked",
      });
    };

    const handleComment = (message: { data: unknown }) => {
      const data = message.data as SocialCommentEvent;

      switch (data.type) {
        case "added":
          if (data.comment) {
            onCommentAddedRef.current?.({
              postId: data.postId,
              comment: data.comment,
              newCommentCount: data.newCommentCount,
            });
          }
          break;
        case "deleted":
          if (data.commentId) {
            onCommentDeletedRef.current?.({
              postId: data.postId,
              commentId: data.commentId,
              newCommentCount: data.newCommentCount,
            });
          }
          break;
      }
    };

    channel.subscribe("post", handlePost);
    channel.subscribe("like", handleLike);
    channel.subscribe("comment", handleComment);

    return () => {
      channel.unsubscribe("post", handlePost);
      channel.unsubscribe("like", handleLike);
      channel.unsubscribe("comment", handleComment);
    };
  }, [channel, isSubscribed]);

  // Publish functions for client-side updates (optimistic)
  const publishPostCreated = useCallback(async (post: SocialPost) => {
    await publish("post", { type: "created", post });
  }, [publish]);

  const publishPostDeleted = useCallback(async (postId: string) => {
    await publish("post", { type: "deleted", post: { id: postId } });
  }, [publish]);

  const publishLike = useCallback(async (postId: string, userId: string, isLiked: boolean, newLikeCount: number) => {
    await publish("like", {
      postId,
      userId,
      type: isLiked ? "liked" : "unliked",
      newLikeCount,
    });
  }, [publish]);

  const publishComment = useCallback(async (
    postId: string,
    comment: SocialCommentEvent["comment"],
    newCommentCount: number
  ) => {
    await publish("comment", {
      type: "added",
      postId,
      comment,
      newCommentCount,
    });
  }, [publish]);

  const publishCommentDeleted = useCallback(async (
    postId: string,
    commentId: string,
    newCommentCount: number
  ) => {
    await publish("comment", {
      type: "deleted",
      postId,
      commentId,
      newCommentCount,
    });
  }, [publish]);

  return {
    isSubscribed,
    publishPostCreated,
    publishPostDeleted,
    publishLike,
    publishComment,
    publishCommentDeleted,
  };
}

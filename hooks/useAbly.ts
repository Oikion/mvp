// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSWRConfig } from "swr";
import type { MessagingCredentials } from "./swr/useMessaging";
import { getMessagesKey } from "./swr/useMessaging";

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
            callback(null, initialTokenRequest as Ably.TokenRequest);
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
              callback(new Error("Unauthorized"), null);
              return;
            }
            throw new Error(errorMessage);
          }
          const data = await response.json();
          
          if (!data.tokenRequest) {
            throw new Error("No token request in response");
          }
          
          callback(null, data.tokenRequest as Ably.TokenRequest);
        } catch (error) {
          console.error("[ABLY] Auth callback failed:", error);
          callback(error instanceof Error ? error : new Error("Authentication failed"), null);
        }
      },
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 15000,
      // Allow connection to degrade gracefully
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

  useEffect(() => {
    if (!credentials?.tokenRequest) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const client = await getAblyClient(credentials.tokenRequest, credentials.userId);
        
        if (!mounted) return;
        
        clientRef.current = client;

        const handleStateChange = (stateChange: { current: string; reason?: { message: string } }) => {
          if (!mounted) return;
          setConnectionState(stateChange.current);
          if (stateChange.reason) {
            setError(new Error(stateChange.reason.message));
          } else {
            setError(null);
          }
        };

        client.connection.on(handleStateChange);
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
  }, [credentials?.tokenRequest]);

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

  useEffect(() => {
    if (!channelName || !credentials?.tokenRequest) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const client = await getAblyClient(credentials.tokenRequest, credentials.userId);
        
        if (!mounted) return;
        
        const channel = client.channels.get(channelName);
        channelRef.current = channel;

        // Store the attach promise so we can wait for it in cleanup
        attachPromiseRef.current = channel.attach();
        await attachPromiseRef.current;
        
        if (mounted && channelRef.current === channel) {
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error("[ABLY] Failed to attach to channel:", err);
        // Don't block the UI on Ably errors
        if (mounted) {
          setIsSubscribed(false);
        }
      }
    })();

    return () => {
      mounted = false;
      setIsSubscribed(false);
      
      // Detach channel asynchronously to avoid blocking cleanup
      // Wait for attach to complete first to prevent "Channel detached" errors
      const channelToDetach = channelRef.current;
      const attachPromise = attachPromiseRef.current;
      
      if (channelToDetach) {
        // Start async cleanup but don't block
        Promise.resolve(attachPromise)
          .then(() => {
            // Small delay to ensure attach is fully complete
            return new Promise(resolve => setTimeout(resolve, 50));
          })
          .then(() => {
            // Only detach if this is still the current channel
            if (channelToDetach === channelRef.current) {
              return channelToDetach.detach();
            }
          })
          .catch(() => {
            // Ignore all errors - channel might already be detached or failed
            // This prevents "Channel detached" errors from propagating as unhandled rejections
          })
          .finally(() => {
            // Clear refs only if this is still the current channel
            if (channelToDetach === channelRef.current) {
              channelRef.current = null;
              attachPromiseRef.current = null;
            }
          });
      } else {
        // No channel to detach, just clear refs
        channelRef.current = null;
        attachPromiseRef.current = null;
      }
    };
  }, [channelName, credentials?.tokenRequest, credentials?.userId]);

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

interface AblyTypingEvent {
  userId: string;
  isTyping: boolean;
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Build channel name
  const ablyChannelName = params.organizationId && (params.channelId || params.conversationId)
    ? params.channelId
      ? `org:${params.organizationId}:channel:${params.channelId}`
      : `org:${params.organizationId}:conversation:${params.conversationId}`
    : null;

  const { channel, isSubscribed, publish } = useAblyChannel(
    ablyChannelName,
    params.credentials
  );

  // Subscribe to message events
  useEffect(() => {
    if (!channel || !isSubscribed) return;

    // Handler for new messages (API publishes as "message:new")
    const handleNewMessage = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      params.onNewMessage?.(data);
      // Revalidate SWR cache
      mutate(getMessagesKey({ 
        channelId: params.channelId, 
        conversationId: params.conversationId 
      }));
    };

    // Handler for edited messages (API publishes as "message:edited")
    const handleEditedMessage = (message: { data: unknown }) => {
      const data = message.data as AblyMessageEvent["message"];
      params.onMessageEdit?.(data);
      mutate(getMessagesKey({ 
        channelId: params.channelId, 
        conversationId: params.conversationId 
      }));
    };

    // Handler for deleted messages (API publishes as "message:deleted")
    const handleDeletedMessage = (message: { data: unknown }) => {
      const data = message.data as { id: string };
      params.onMessageDelete?.(data.id);
      mutate(getMessagesKey({ 
        channelId: params.channelId, 
        conversationId: params.conversationId 
      }));
    };

    const handleTyping = (message: { data: unknown }) => {
      const data = message.data as AblyTypingEvent;
      
      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutsRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (data.isTyping) {
        setTypingUsers(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });

        // Auto-clear after 5 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
          typingTimeoutsRef.current.delete(data.userId);
        }, 5000);
        typingTimeoutsRef.current.set(data.userId, timeout);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
        typingTimeoutsRef.current.delete(data.userId);
      }
    };

    // Subscribe to the exact event names the API publishes
    channel.subscribe("message:new", handleNewMessage);
    channel.subscribe("message:edited", handleEditedMessage);
    channel.subscribe("message:deleted", handleDeletedMessage);
    channel.subscribe("typing", handleTyping);

    return () => {
      channel.unsubscribe("message:new", handleNewMessage);
      channel.unsubscribe("message:edited", handleEditedMessage);
      channel.unsubscribe("message:deleted", handleDeletedMessage);
      channel.unsubscribe("typing", handleTyping);
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [channel, isSubscribed, params, mutate]);

  // Send typing indicator
  const sendTyping = useCallback(async (isTyping: boolean) => {
    if (params.credentials?.userId) {
      await publish("typing", {
        userId: params.credentials.userId,
        isTyping,
      });
    }
  }, [publish, params.credentials?.userId]);

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
  const userChannelName = params.userId ? `user:${params.userId}` : null;

  const { channel, isSubscribed } = useAblyChannel(
    userChannelName,
    params.credentials
  );

  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handleMention = (message: { data: unknown }) => {
      params.onMention?.(message.data as { messageId: string; senderId: string; channelId?: string; conversationId?: string });
    };

    const handleConversationCreated = (message: { data: unknown }) => {
      const data = message.data as { id: string; isGroup: boolean; name?: string; entityType?: string; entityId?: string };
      params.onConversationCreated?.(data);
      // Revalidate conversations list
      mutate("/api/messaging/conversations");
    };

    channel.subscribe("mention", handleMention);
    channel.subscribe("conversation:created", handleConversationCreated);

    return () => {
      channel.unsubscribe("mention", handleMention);
      channel.unsubscribe("conversation:created", handleConversationCreated);
    };
  }, [channel, isSubscribed, params, mutate]);

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
}

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
  onPostCreated?: (post: SocialPost) => void;
  onPostDeleted?: (postId: string) => void;
  onPostLiked?: (data: { postId: string; userId: string; newLikeCount: number; isLiked: boolean }) => void;
  onCommentAdded?: (data: { postId: string; comment: SocialCommentEvent["comment"]; newCommentCount: number }) => void;
  onCommentDeleted?: (data: { postId: string; commentId: string; newCommentCount: number }) => void;
}) {
  const feedChannelName = params.organizationId
    ? `org:${params.organizationId}:social-feed`
    : null;

  const { channel, isSubscribed, publish } = useAblyChannel(
    feedChannelName,
    params.credentials
  );

  // Subscribe to social feed events
  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handlePost = (message: { data: unknown }) => {
      const data = message.data as SocialPostEvent;
      
      switch (data.type) {
        case "created":
          params.onPostCreated?.(data.post);
          break;
        case "deleted":
          params.onPostDeleted?.(data.post.id);
          break;
      }
    };

    const handleLike = (message: { data: unknown }) => {
      const data = message.data as SocialLikeEvent;
      params.onPostLiked?.({
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
            params.onCommentAdded?.({
              postId: data.postId,
              comment: data.comment,
              newCommentCount: data.newCommentCount,
            });
          }
          break;
        case "deleted":
          if (data.commentId) {
            params.onCommentDeleted?.({
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
  }, [channel, isSubscribed, params]);

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

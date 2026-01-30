import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { ChannelType } from "@prisma/client";
import type { TokenRequest } from "ably";

// Types
export interface MessagingCredentials {
  userId: string;
  organizationId: string;
  tokenRequest: TokenRequest;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  channelType: ChannelType;
  isDefault: boolean;
  memberCount: number;
  unreadCount: number;
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  type: "dm" | "group" | "entity";
  entity?: {
    type: string;
    id: string;
  };
  participants: Array<{ userId: string }>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
  isMuted: boolean;
}

export interface Message {
  id: string;
  content: string;
  contentType: string;
  senderId: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderEmail?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
  parentId: string | null;
  threadCount: number;
  isEdited: boolean;
  createdAt: Date;
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  }>;
  reactions: Array<{
    emoji: string;
    userId: string;
    count?: number;
  }>;
  mentions: Array<{
    userId: string;
  }>;
  entityAttachment?: {
    type: "property" | "client" | "document" | "event";
    id: string;
    title: string;
    subtitle?: string;
    metadata?: Record<string, unknown>;
  };
}

interface ChannelsResponse {
  channels: Channel[];
}

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

// Fetcher with error code support
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.errorCode 
      ? `${errorData.error || "Request failed"} [${errorData.errorCode}]`
      : errorData.error || "Request failed";
    throw new Error(errorMessage);
  }
  return res.json();
};

/**
 * Hook to get messaging credentials for the current user
 * Returns Ably token request for authentication
 */
export function useMessagingCredentials(options?: { enabled?: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<MessagingCredentials>(
    options?.enabled !== false ? "/api/messaging/credentials" : null,
    fetcher,
    {
      // Cache credentials but revalidate on window focus
      revalidateOnFocus: true,
      // Don't retry on auth errors
      shouldRetryOnError: (err) => {
        return err?.message !== "Unauthorized";
      },
    }
  );

  return {
    credentials: data,
    isLoading,
    error,
    mutate,
    isAuthenticated: !!data?.userId,
    isConfigured: !error?.message?.includes("NOT_CONFIGURED"),
  };
}

/**
 * Hook to get organization channels
 */
export function useChannels(options?: { enabled?: boolean; refreshInterval?: number }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ChannelsResponse>(
    options?.enabled !== false ? "/api/messaging/channels" : null,
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 0,
      revalidateOnMount: true,
    }
  );

  return {
    channels: data?.channels ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to create a new channel
 */
export function useCreateChannel() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { channel: Channel },
    Error,
    string,
    { name: string; description?: string; channelType?: ChannelType; isDefault?: boolean }
  >(
    "/api/messaging/channels",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create channel");
      }
      return res.json();
    },
    {
      onSuccess: () => {
        // Revalidate channels list
        globalMutate("/api/messaging/channels");
      },
    }
  );

  return {
    createChannel: trigger,
    isCreating: isMutating,
    error,
  };
}

/**
 * Hook to get user's conversations (DMs and groups)
 */
export function useConversations(options?: { enabled?: boolean; refreshInterval?: number }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ConversationsResponse>(
    options?.enabled !== false ? "/api/messaging/conversations" : null,
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 30000, // Default 30s polling
      revalidateOnMount: true,
    }
  );

  return {
    conversations: data?.conversations ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to get messages for a channel or conversation
 */
export function useMessages(params: {
  channelId?: string;
  conversationId?: string;
  enabled?: boolean;
  refreshInterval?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params.channelId) queryParams.set("channelId", params.channelId);
  if (params.conversationId) queryParams.set("conversationId", params.conversationId);

  const key = params.enabled !== false && (params.channelId || params.conversationId)
    ? `/api/messaging/messages?${queryParams.toString()}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<MessagesResponse>(
    key,
    fetcher,
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      refreshInterval: params.refreshInterval || 0,
    }
  );

  return {
    messages: data?.messages ?? [],
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to send a message
 */
export function useSendMessage(params?: { channelId?: string; conversationId?: string }) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean; message: Message },
    Error,
    string,
    {
      channelId?: string;
      conversationId?: string;
      content: string;
      parentId?: string;
      attachments?: Array<{
        fileName: string;
        fileSize: number;
        fileType: string;
        url: string;
      }>;
      mentions?: string[];
      entityAttachment?: {
        type: "property" | "client" | "document" | "event";
        id: string;
        title: string;
        subtitle?: string;
        metadata?: Record<string, unknown>;
      };
    }
  >(
    "/api/messaging/messages",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...arg,
          channelId: arg.channelId || params?.channelId,
          conversationId: arg.conversationId || params?.conversationId,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }
      return res.json();
    },
    {
      onSuccess: (data) => {
        // Revalidate messages for the channel/conversation
        const queryParams = new URLSearchParams();
        const channelId = data?.message?.channelId || params?.channelId;
        const conversationId = data?.message?.conversationId || params?.conversationId;
        if (channelId) queryParams.set("channelId", channelId);
        if (conversationId) queryParams.set("conversationId", conversationId);
        globalMutate(`/api/messaging/messages?${queryParams.toString()}`);
      },
    }
  );

  return {
    sendMessage: trigger,
    isSending: isMutating,
    error,
  };
}

/**
 * Hook to start a direct message
 */
export function useStartDM() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { conversationId: string },
    Error,
    string,
    { targetUserId: string }
  >(
    "/api/messaging/dm",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start conversation");
      }
      return res.json();
    },
    {
      onSuccess: () => {
        // Revalidate conversations list
        globalMutate("/api/messaging/conversations");
      },
    }
  );

  return {
    startDM: trigger,
    isStarting: isMutating,
    error,
  };
}

// Contact types for messaging
export interface MessagingContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  clientName: string | null;
  clientId: string | null;
}

interface ContactsResponse {
  contacts: MessagingContact[];
}

/**
 * Hook to get contacts for messaging
 */
export function useMessagingContacts(options?: { enabled?: boolean }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ContactsResponse>(
    options?.enabled !== false ? "/api/messaging/contacts" : null,
    fetcher,
    {
      revalidateOnMount: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    contacts: data?.contacts ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to start a conversation with a contact
 */
export function useStartContactDM() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { conversationId: string },
    Error,
    string,
    { contactId: string }
  >(
    "/api/messaging/dm/contact",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start conversation");
      }
      return res.json();
    },
    {
      onSuccess: () => {
        // Revalidate conversations list
        globalMutate("/api/messaging/conversations");
      },
    }
  );

  return {
    startContactDM: trigger,
    isStarting: isMutating,
    error,
  };
}

/**
 * Hook to add a reaction to a message
 */
export function useAddReaction() {
  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { messageId: string; emoji: string }
  >(
    "/api/messaging/reactions",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add reaction");
      }
      return res.json();
    }
  );

  return {
    addReaction: trigger,
    isAdding: isMutating,
    error,
  };
}

/**
 * Hook to edit a message
 */
export function useEditMessage() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean; message: { id: string; content: string; isEdited: boolean; editedAt: Date }; channelId?: string; conversationId?: string },
    Error,
    string,
    { messageId: string; content: string; channelId?: string; conversationId?: string }
  >(
    "/api/messaging/messages",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: arg.messageId, content: arg.content }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to edit message");
      }
      const data = await res.json();
      // Include channelId/conversationId in response for revalidation
      return { ...data, channelId: arg.channelId, conversationId: arg.conversationId };
    },
    {
      onSuccess: (data) => {
        // Revalidate messages for the channel/conversation
        if (data?.channelId || data?.conversationId) {
          globalMutate(getMessagesKey({ channelId: data.channelId, conversationId: data.conversationId }));
        }
      },
    }
  );

  return {
    editMessage: trigger,
    isEditing: isMutating,
    error,
  };
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean; channelId?: string; conversationId?: string },
    Error,
    string,
    { messageId: string; channelId?: string; conversationId?: string }
  >(
    "/api/messaging/messages/delete",
    async (_, { arg }) => {
      const res = await fetch(`/api/messaging/messages?messageId=${arg.messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete message");
      }
      const data = await res.json();
      // Include channelId/conversationId in response for revalidation
      return { ...data, channelId: arg.channelId, conversationId: arg.conversationId };
    },
    {
      onSuccess: (data) => {
        // Revalidate messages for the channel/conversation
        if (data?.channelId || data?.conversationId) {
          globalMutate(getMessagesKey({ channelId: data.channelId, conversationId: data.conversationId }));
        }
      },
    }
  );

  return {
    deleteMessage: trigger,
    isDeleting: isMutating,
    error,
  };
}

/**
 * Hook to mark messages as read
 * Supports optimistic updates - unread count is set to 0 immediately
 */
export function useMarkAsRead() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { channelId?: string; conversationId?: string }
  >(
    "/api/messaging/read",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark as read");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const markAsRead = async (arg: { channelId?: string; conversationId?: string }) => {
    // Optimistically update unread count to 0 immediately
    if (arg.channelId) {
      globalMutate<ChannelsResponse>(
        "/api/messaging/channels",
        (currentData) => {
          if (!currentData) return currentData;
          return {
            channels: currentData.channels.map((c) =>
              c.id === arg.channelId ? { ...c, unreadCount: 0 } : c
            ),
          };
        },
        { revalidate: false }
      );
    }

    if (arg.conversationId) {
      globalMutate<ConversationsResponse>(
        "/api/messaging/conversations",
        (currentData) => {
          if (!currentData) return currentData;
          return {
            conversations: currentData.conversations.map((c) =>
              c.id === arg.conversationId ? { ...c, unreadCount: 0 } : c
            ),
          };
        },
        { revalidate: false }
      );
    }

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error by revalidating
      if (arg.channelId) {
        globalMutate("/api/messaging/channels");
      }
      if (arg.conversationId) {
        globalMutate("/api/messaging/conversations");
      }
      throw err;
    }
  };

  return {
    markAsRead,
    isMarking: isMutating,
  };
}

/**
 * Get the SWR cache key for channels
 */
export function getChannelsKey(): string {
  return "/api/messaging/channels";
}

/**
 * Get the SWR cache key for conversations
 */
export function getConversationsKey(): string {
  return "/api/messaging/conversations";
}

/**
 * Get the SWR cache key for credentials
 */
export function getCredentialsKey(): string {
  return "/api/messaging/credentials";
}

/**
 * Get the SWR cache key for messages
 */
export function getMessagesKey(params: { channelId?: string; conversationId?: string }): string | null {
  if (!params.channelId && !params.conversationId) return null;
  const queryParams = new URLSearchParams();
  if (params.channelId) queryParams.set("channelId", params.channelId);
  if (params.conversationId) queryParams.set("conversationId", params.conversationId);
  return `/api/messaging/messages?${queryParams.toString()}`;
}

/**
 * Hook to mute/unmute a conversation
 * Supports optimistic updates - mute status changes immediately
 */
export function useMuteConversation() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { conversationId: string; mute: boolean; mutedUntil?: string }
  >(
    "/api/messaging/conversations/mute",
    async (_, { arg }) => {
      const res = await fetch(`/api/messaging/conversations/${arg.conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: arg.mute ? "mute" : "unmute",
          mutedUntil: arg.mutedUntil,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update mute status");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const toggleMute = async (arg: { conversationId: string; mute: boolean; mutedUntil?: string }) => {
    // Optimistically update mute status immediately
    globalMutate<ConversationsResponse>(
      "/api/messaging/conversations",
      (currentData) => {
        if (!currentData) return currentData;
        return {
          conversations: currentData.conversations.map((c) =>
            c.id === arg.conversationId ? { ...c, isMuted: arg.mute } : c
          ),
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate("/api/messaging/conversations");
      throw err;
    }
  };

  return {
    toggleMute,
    isMuting: isMutating,
    error,
  };
}

/**
 * Hook to delete/leave a conversation
 * Supports optimistic updates - conversation is removed from list immediately
 */
export function useDeleteConversation() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { conversationId: string }
  >(
    "/api/messaging/conversations/delete",
    async (_, { arg }) => {
      const res = await fetch(`/api/messaging/conversations/${arg.conversationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete conversation");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const deleteConversation = async (arg: { conversationId: string }) => {
    // Optimistically remove conversation from list immediately
    globalMutate<ConversationsResponse>(
      "/api/messaging/conversations",
      (currentData) => {
        if (!currentData) return currentData;
        return {
          conversations: currentData.conversations.filter((c) => c.id !== arg.conversationId),
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate("/api/messaging/conversations");
      throw err;
    }
  };

  return {
    deleteConversation,
    isDeleting: isMutating,
    error,
  };
}

/**
 * Hook to leave a conversation (different from delete - keeps conversation visible for others)
 * Supports optimistic updates - conversation is removed from list immediately
 */
export function useLeaveConversation() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { conversationId: string }
  >(
    "/api/messaging/conversations/leave",
    async (_, { arg }) => {
      const res = await fetch(`/api/messaging/conversations/${arg.conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to leave conversation");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const leaveConversation = async (arg: { conversationId: string }) => {
    // Optimistically remove conversation from list immediately
    globalMutate<ConversationsResponse>(
      "/api/messaging/conversations",
      (currentData) => {
        if (!currentData) return currentData;
        return {
          conversations: currentData.conversations.filter((c) => c.id !== arg.conversationId),
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate("/api/messaging/conversations");
      throw err;
    }
  };

  return {
    leaveConversation,
    isLeaving: isMutating,
    error,
  };
}

/**
 * Hook to leave a channel (removes user from channel membership)
 * Supports optimistic updates - channel is removed from list immediately
 */
export function useLeaveChannel() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { channelId: string }
  >(
    "/api/messaging/channels/leave",
    async (_, { arg }) => {
      const res = await fetch(`/api/messaging/channels/${arg.channelId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to leave channel");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const leaveChannel = async (arg: { channelId: string }) => {
    // Optimistically remove channel from list immediately
    globalMutate<{ channels: unknown[] }>(
      "/api/messaging/channels",
      (currentData) => {
        if (!currentData) return currentData;
        return {
          channels: currentData.channels.filter(
            (c: { id?: string }) => c.id !== arg.channelId
          ),
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate("/api/messaging/channels");
      throw err;
    }
  };

  return {
    leaveChannel,
    isLeaving: isMutating,
    error,
  };
}

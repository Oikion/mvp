import useSWR from "swr";
import type { MessagingPlatform } from "@/types/messaging";
import fetcher from "@/lib/fetcher";

export interface ExternalConversation {
  id: string;
  integrationId: string;
  platform: MessagingPlatform;
  displayName: string;
  avatarUrl?: string | null;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  isActive: boolean;
}

interface ExternalConversationsResponse {
  data: {
    conversations: ExternalConversation[];
  };
}

export function useExternalConversations(options?: { enabled?: boolean; refreshInterval?: number }) {
  const { data, error, isLoading, mutate } = useSWR<ExternalConversationsResponse>(
    options?.enabled === false ? null : "/api/messaging/external/conversations",
    fetcher,
    {
      refreshInterval: options?.refreshInterval ?? 0,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    conversations: data?.data.conversations ?? [],
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

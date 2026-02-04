import useSWR from "swr";

interface UnreadCountResponse {
  count: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch unread count");
  }
  return res.json();
};

/**
 * Hook to get unread message count for the current user
 * Used for badge in navigation
 */
export function useUnreadMessageCount(options?: {
  enabled?: boolean;
  refreshInterval?: number;
}) {
  const { data, error, isLoading, mutate } = useSWR<UnreadCountResponse>(
    options?.enabled !== false ? "/api/messaging/unread-count" : null,
    fetcher,
    {
      refreshInterval: options?.refreshInterval || 30000, // Default 30s
      revalidateOnFocus: true,
    }
  );

  return {
    unreadCount: data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
}

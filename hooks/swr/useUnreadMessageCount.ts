import useSWR from "swr";

interface UnreadCountResponse {
  count: number;
}

// Preserve the HTTP status in the error so shouldRetryOnError can make
// intelligent decisions (don't retry 401/503; do retry transient 5xx).
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "Failed to fetch unread count") as Error & { status: number; errorCode?: string };
    err.status = res.status;
    err.errorCode = body.errorCode;
    throw err;
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
      refreshInterval: options?.refreshInterval || 30000,
      // Don't re-fetch on focus — Ably presence handles live state; the badge
      // catching up 30 seconds later is acceptable UX vs amplifying server load.
      revalidateOnFocus: false,
      // Don't retry auth/config errors; cap retries for transient failures.
      shouldRetryOnError: (err: Error & { status?: number }) => {
        const s = err?.status;
        if (!s || s === 401 || s === 403 || s === 503) return false;
        return true;
      },
      errorRetryCount: 2,
      errorRetryInterval: 15000,
    }
  );

  return {
    unreadCount: data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
}

import useSWR from "swr";

export interface NotificationCountsResponse {
  counts: Record<string, number>;
}

interface UseNotificationCountsOptions {
  /**
   * Polling interval in milliseconds. Set to 0 to disable.
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch unread notification counts grouped by page
 * Used for sidebar notification badges
 */
export function useNotificationCounts(options: UseNotificationCountsOptions = {}) {
  const { refreshInterval = 30000, enabled = true } = options;

  const key = enabled ? "/api/notifications/counts" : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<NotificationCountsResponse>(
    key,
    {
      refreshInterval,
      // Revalidate when window regains focus
      revalidateOnFocus: true,
      // Don't show stale data for notification counts
      revalidateOnMount: true,
    }
  );

  return {
    counts: data?.counts ?? {},
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get count for a specific page
 */
export function getCountForPage(
  counts: Record<string, number>,
  page: string
): number {
  return counts[page] ?? 0;
}

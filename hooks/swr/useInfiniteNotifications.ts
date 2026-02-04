import useSWRInfinite from "swr/infinite";
import { useSWRConfig } from "swr";
import type { Notification } from "./useNotifications";

const PAGE_SIZE = 20;

interface NotificationsPage {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
}

interface UseInfiniteNotificationsOptions {
  /**
   * Only fetch unread notifications
   */
  unreadOnly?: boolean;
  /**
   * Filter by notification type
   */
  type?: string;
  /**
   * Page size (default: 20)
   */
  pageSize?: number;
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Build the cache key for a page of notifications
 */
function buildNotificationsPageKey(
  pageIndex: number,
  previousPageData: NotificationsPage | null,
  options: UseInfiniteNotificationsOptions
): string | null {
  // Don't fetch if disabled
  if (options.enabled === false) return null;

  // Reached the end
  if (previousPageData && !previousPageData.hasMore) return null;

  const pageSize = options.pageSize || PAGE_SIZE;
  const params = new URLSearchParams();
  params.set("limit", pageSize.toString());
  params.set("offset", (pageIndex * pageSize).toString());

  if (options.unreadOnly) {
    params.set("unreadOnly", "true");
  }
  if (options.type) {
    params.set("type", options.type);
  }

  return `/api/notifications?${params.toString()}`;
}

/**
 * Fetcher for notifications pages
 */
async function notificationsPageFetcher(url: string): Promise<NotificationsPage> {
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthenticated");
    }
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }

  return res.json();
}

/**
 * Hook to fetch notifications with infinite scroll pagination
 * Uses useSWRInfinite for efficient "Load More" functionality
 */
export function useInfiniteNotifications(options: UseInfiniteNotificationsOptions = {}) {
  const { enabled = true, ...filterOptions } = options;
  const { mutate: globalMutate } = useSWRConfig();

  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<NotificationsPage>(
    (pageIndex, previousPageData) =>
      buildNotificationsPageKey(pageIndex, previousPageData, { ...filterOptions, enabled }),
    notificationsPageFetcher,
    {
      revalidateFirstPage: true,
      // Keep showing previous data while loading new pages
      revalidateAll: false,
      // Persist the size when key changes
      persistSize: true,
    }
  );

  // Flatten all pages into a single array
  const notifications = data?.flatMap((page) => page.notifications) ?? [];

  // Get the unread count from the latest page
  const unreadCount = data?.[0]?.unreadCount ?? 0;

  // Get total count from the latest page
  const totalCount = data?.[0]?.totalCount ?? 0;

  // Check if there are more pages to load
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;

  // Loading states
  const isLoadingInitial = isLoading;
  const isLoadingMore = isValidating && size > 1 && data && typeof data[size - 1] === "undefined";

  // Load more function
  const loadMore = () => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  };

  // Reset to first page (useful after bulk operations)
  const reset = () => {
    setSize(1);
    mutate();
  };

  // Mark a single notification as read (optimistic)
  const markAsRead = async (notificationId: string) => {
    // Optimistically update local data
    mutate(
      data?.map((page) => ({
        ...page,
        notifications: page.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, page.unreadCount - 1),
      })),
      false
    );

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    } catch (err) {
      // Revalidate on error
      mutate();
      throw err;
    }
  };

  // Mark all notifications as read (optimistic)
  const markAllAsRead = async () => {
    // Optimistically update local data
    mutate(
      data?.map((page) => ({
        ...page,
        notifications: page.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      })),
      false
    );

    try {
      const res = await fetch("/api/notifications", { method: "PUT" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      // Also invalidate regular notifications cache
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/notifications"),
        undefined,
        { revalidate: true }
      );
    } catch (err) {
      // Revalidate on error
      mutate();
      throw err;
    }
  };

  return {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading: isLoadingInitial,
    isLoadingMore,
    isValidating,
    error,
    loadMore,
    reset,
    markAsRead,
    markAllAsRead,
    mutate,
  };
}

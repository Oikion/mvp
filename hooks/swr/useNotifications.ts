import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface UseNotificationsOptions {
  /**
   * Number of notifications to fetch. Use 0 for count only.
   */
  limit?: number;
  /**
   * Only fetch unread notifications
   */
  unreadOnly?: boolean;
  /**
   * Filter by notification type
   */
  type?: string;
  /**
   * Polling interval in milliseconds. Set to 0 to disable.
   * @default 0 (disabled)
   */
  refreshInterval?: number;
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

function buildNotificationsKey(options: UseNotificationsOptions): string | null {
  if (options.enabled === false) return null;

  const params = new URLSearchParams();

  if (options.limit !== undefined) {
    params.set("limit", options.limit.toString());
  }
  if (options.unreadOnly) {
    params.set("unreadOnly", "true");
  }
  if (options.type) {
    params.set("type", options.type);
  }

  const queryString = params.toString();
  return `/api/notifications${queryString ? `?${queryString}` : ""}`;
}

/**
 * Hook to fetch notifications with optional polling
 * Supports different configurations for Bell, Popover, and Center components
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { refreshInterval = 0, enabled = true, ...queryOptions } = options;

  const key = buildNotificationsKey({ ...queryOptions, enabled });

  const { data, error, isLoading, isValidating, mutate } = useSWR<NotificationsResponse>(
    key,
    {
      refreshInterval,
      // Don't show stale data for notifications (they should be fresh)
      revalidateOnMount: true,
    }
  );

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to mark all notifications as read
 * Supports optimistic updates - all notifications show as read immediately
 */
export function useMarkAllNotificationsRead() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    undefined
  >(
    "/api/notifications",
    async (url) => {
      const res = await fetch(url, { method: "PUT" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark notifications as read");
      }
      return res.json();
    },
    {
      onSuccess: () => {
        // Optimistically update all notification caches
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/notifications"),
          (currentData: NotificationsResponse | undefined) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              notifications: currentData.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            };
          },
          { revalidate: false }
        );
      },
    }
  );

  // Wrap trigger to provide optimistic update before the request
  const markAllRead = async () => {
    // Optimistically update all notification caches immediately
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/notifications"),
      (currentData: NotificationsResponse | undefined) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          notifications: currentData.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger();
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/notifications"),
        undefined,
        { revalidate: true }
      );
      throw err;
    }
  };

  return {
    markAllRead,
    isMutating,
    error,
  };
}

/**
 * Hook to mark a single notification as read
 * Supports optimistic updates - notification shows as read immediately
 */
export function useMarkNotificationRead() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { notificationId: string }
  >(
    "/api/notifications",
    async (_url, { arg }) => {
      const res = await fetch(`/api/notifications/${arg.notificationId}`, {
        method: "PUT",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark notification as read");
      }
      return res.json();
    }
  );

  // Wrap trigger to provide optimistic update
  const markRead = async (notificationId: string) => {
    // Optimistically update all notification caches immediately
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/notifications"),
      (currentData: NotificationsResponse | undefined) => {
        if (!currentData) return currentData;
        const updatedNotifications = currentData.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        const unreadCount = updatedNotifications.filter((n) => !n.read).length;
        return {
          ...currentData,
          notifications: updatedNotifications,
          unreadCount,
        };
      },
      { revalidate: false }
    );

    try {
      return await trigger({ notificationId });
    } catch (err) {
      // Roll back on error by revalidating
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/notifications"),
        undefined,
        { revalidate: true }
      );
      throw err;
    }
  };

  return {
    markRead,
    isMutating,
    error,
  };
}

/**
 * Get the SWR cache key for notifications
 * Useful for manual cache invalidation
 */
export function getNotificationsKey(options: UseNotificationsOptions = {}): string | null {
  return buildNotificationsKey(options);
}

import useSWR from "swr";

interface CalendarEvent {
  id: number;
  eventId?: string; // Database ID for navigation
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
  eventType?: string;
}

interface CalendarTask {
  id: string;
  title: string;
  content?: string | null;
  dueDateAt: string;
  priority: string;
  assigned_user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  crm_accounts?: {
    id: string;
    client_name: string;
  } | null;
  calcomEventId?: string | null;
}

interface CalendarEventsResponse {
  events: CalendarEvent[];
  tasks: CalendarTask[];
}

interface UseCalendarEventsOptions {
  /**
   * Start time for event range (ISO string)
   */
  startTime?: string;
  /**
   * End time for event range (ISO string)
   */
  endTime?: string;
  /**
   * Include tasks in the response
   */
  includeTasks?: boolean;
  /**
   * User ID to filter events (admin only)
   */
  userId?: string;
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
  /**
   * Refresh interval in milliseconds
   */
  refreshInterval?: number;
}

function buildCalendarEventsKey(options: UseCalendarEventsOptions): string | null {
  if (options.enabled === false) return null;

  const params = new URLSearchParams();

  if (options.startTime) {
    params.set("startTime", options.startTime);
  }
  if (options.endTime) {
    params.set("endTime", options.endTime);
  }
  if (options.includeTasks) {
    params.set("includeTasks", "true");
  }
  if (options.userId) {
    params.set("userId", options.userId);
  }

  const queryString = params.toString();
  return `/api/calendar/events${queryString ? `?${queryString}` : ""}`;
}

/**
 * Hook to fetch calendar events for a date range
 */
export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const { refreshInterval = 0, enabled = true, ...queryOptions } = options;

  const key = buildCalendarEventsKey({ ...queryOptions, enabled });

  const { data, error, isLoading, isValidating, mutate } = useSWR<CalendarEventsResponse>(
    key,
    {
      refreshInterval,
      // Revalidate on mount for fresh data
      revalidateOnMount: true,
    }
  );

  return {
    events: data?.events ?? [],
    tasks: data?.tasks ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for calendar events
 * Useful for manual cache invalidation
 */
export function getCalendarEventsKey(options: UseCalendarEventsOptions = {}): string | null {
  return buildCalendarEventsKey(options);
}

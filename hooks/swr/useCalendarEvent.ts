import useSWR from "swr";

interface LinkedClient {
  id: string;
  client_name: string;
}

interface LinkedProperty {
  id: string;
  property_name: string;
}

interface LinkedDocument {
  id: string;
  document_name: string;
  document_file_url?: string | null;
}

interface LinkedTask {
  id: string;
  title: string;
  assigned_user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  crm_accounts?: {
    id: string;
    client_name: string;
  } | null;
}

interface EventReminder {
  id: string;
  scheduledFor: string;
  sent: boolean;
}

export interface CalendarEventDetail {
  id: string;
  calendarEventId: number;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  status?: string | null;
  eventType?: string | null;
  reminderMinutes?: number[];
  recurrenceRule?: string | null;
  assignedUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  linkedClients?: LinkedClient[];
  linkedProperties?: LinkedProperty[];
  linkedDocuments?: LinkedDocument[];
  linkedTasks?: LinkedTask[];
  reminders?: EventReminder[];
}

interface CalendarEventResponse {
  event: CalendarEventDetail;
}

interface UseCalendarEventOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch a single calendar event with all relations
 */
export function useCalendarEvent(
  eventId: string | undefined,
  options: UseCalendarEventOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && eventId ? `/api/calendar/events/${eventId}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<CalendarEventResponse>(key);

  return {
    event: data?.event ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for a calendar event
 * Useful for manual cache invalidation
 */
export function getCalendarEventKey(eventId: string): string {
  return `/api/calendar/events/${eventId}`;
}

import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";

// ============================================================
// Types
// ============================================================

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType?: string;
  assignedUserId?: string;
  clientIds?: string[];
  propertyIds?: string[];
  documentIds?: string[];
  reminderMinutes?: number[];
  recurrenceRule?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType?: string;
  assignedUserId?: string;
  status?: string;
}

// ============================================================
// Fetchers
// ============================================================

async function createEventFetcher(
  url: string,
  { arg }: { arg: CreateEventData }
): Promise<CalendarEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create event");
  }

  return res.json();
}

async function updateEventFetcher(
  url: string,
  { arg }: { arg: UpdateEventData }
): Promise<CalendarEvent> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to update event");
  }

  return res.json();
}

async function deleteEventFetcher(url: string): Promise<void> {
  const res = await fetch(url, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to delete event");
  }
}

// ============================================================
// Hooks
// ============================================================

/**
 * Hook to create a new calendar event
 * Invalidates all calendar-related caches after mutation
 */
export function useCreateEvent() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error, data } = useSWRMutation(
    "/api/calendar/events",
    createEventFetcher,
    {
      onSuccess: () => {
        // Invalidate all calendar caches
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/calendar"),
          undefined,
          { revalidate: true }
        );
      },
    }
  );

  return {
    createEvent: trigger,
    isCreating: isMutating,
    error,
    createdEvent: data,
  };
}

/**
 * Hook to update an existing calendar event
 * Invalidates all calendar-related caches after mutation
 */
export function useUpdateEvent(eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error, data } = useSWRMutation(
    `/api/calendar/events/${eventId}`,
    updateEventFetcher,
    {
      onSuccess: () => {
        // Invalidate all calendar caches including the specific event
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/calendar"),
          undefined,
          { revalidate: true }
        );
      },
    }
  );

  return {
    updateEvent: trigger,
    isUpdating: isMutating,
    error,
    updatedEvent: data,
  };
}

/**
 * Hook to delete a calendar event
 * Invalidates all calendar-related caches after mutation
 */
export function useDeleteEvent(eventId: string) {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation(
    `/api/calendar/events/${eventId}`,
    deleteEventFetcher,
    {
      onSuccess: () => {
        // Invalidate all calendar caches
        globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/calendar"),
          undefined,
          { revalidate: true }
        );
      },
    }
  );

  return {
    deleteEvent: trigger,
    isDeleting: isMutating,
    error,
  };
}

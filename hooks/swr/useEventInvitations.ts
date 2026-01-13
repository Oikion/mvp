import useSWR from "swr";

export interface EventInvitee {
  id: string;
  userId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  respondedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface InvitedEvent {
  invitationId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  respondedAt: string | null;
  event: {
    id: string;
    title: string | null;
    description: string | null;
    startTime: string;
    endTime: string;
    location: string | null;
    eventType: string | null;
    assignedUser: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    } | null;
  };
}

interface UseEventInviteesOptions {
  eventId: string;
  enabled?: boolean;
}

interface UseInvitedEventsOptions {
  status?: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  enabled?: boolean;
}

/**
 * Hook to fetch invitees for a specific event
 */
export function useEventInvitees(options: UseEventInviteesOptions) {
  const { eventId, enabled = true } = options;

  const key = enabled && eventId ? `/api/calendar/events/${eventId}/invitees` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<EventInvitee[]>(
    key,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    invitees: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to fetch events where the current user is invited
 */
export function useInvitedEvents(options: UseInvitedEventsOptions = {}) {
  const { status, enabled = true } = options;

  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  const queryString = params.toString();
  const key = enabled ? `/api/calendar/invitations${queryString ? `?${queryString}` : ""}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<InvitedEvent[]>(
    key,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    invitedEvents: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to fetch pending invitation count
 */
export function usePendingInvitationCount(enabled: boolean = true) {
  const key = enabled ? "/api/calendar/invitations/count" : null;

  const { data, error, isLoading, mutate } = useSWR<{ count: number }>(
    key,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  return {
    count: data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
}








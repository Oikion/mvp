import useSWR from "swr";

interface LinkedProperty {
  id: string;
  property_name: string;
  property_type?: string;
  property_status?: string;
  address_street?: string;
  address_city?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  createdAt: string;
  updatedAt: string;
  assigned_to_user?: {
    id: string;
    name: string | null;
  } | null;
}

interface LinkedEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  status?: string | null;
  eventType?: string | null;
  assignedUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  linkedProperties?: {
    id: string;
    property_name: string;
  }[];
}

interface ClientLinkedData {
  client?: {
    id: string;
    client_name: string;
  };
  properties: LinkedProperty[];
  events: {
    upcoming: LinkedEvent[];
    past: LinkedEvent[];
    total: number;
  };
  counts: {
    properties: number;
    events: number;
    upcomingEvents: number;
  };
}

interface UseClientLinkedOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch linked entities (properties and events) for a client
 */
export function useClientLinked(
  clientId: string | undefined,
  options: UseClientLinkedOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && clientId ? `/api/crm/clients/${clientId}/linked` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientLinkedData>(key);

  return {
    linkedData: data ?? null,
    properties: data?.properties ?? [],
    events: data?.events ?? { upcoming: [], past: [], total: 0 },
    counts: data?.counts ?? { properties: 0, events: 0, upcomingEvents: 0 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for client linked data
 * Useful for manual cache invalidation
 */
export function getClientLinkedKey(clientId: string): string {
  return `/api/crm/clients/${clientId}/linked`;
}

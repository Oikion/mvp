import useSWR from "swr";

interface LinkedClient {
  id: string;
  friendlyId: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  intent?: string;
  createdAt: string;
  updatedAt: string;
  assigned_to_user?: {
    id: string;
    name: string | null;
  } | null;
}

interface LinkedEvent {
  id: string;
  friendlyId: string;
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
  linkedClients?: {
    id: string;
    client_name: string;
  }[];
}

interface LinkedMandate {
  id: string;
  friendlyId: string;
  title: string;
  transaction_type?: string;
  status?: string;
  urgency?: string;
  budget_min?: number;
  budget_max?: number;
}

interface LinkedDocument {
  id: string;
  friendlyId: string;
  document_name: string;
  document_type?: string;
  document_file_mimeType?: string;
  createdAt?: string;
}

interface PropertyLinkedData {
  property?: {
    id: string;
    property_name: string;
    organizationId: string;
  };
  clients: LinkedClient[];
  mandates: LinkedMandate[];
  documents: LinkedDocument[];
  events: {
    upcoming: LinkedEvent[];
    past: LinkedEvent[];
    total: number;
  };
  counts: {
    clients: number;
    mandates: number;
    documents: number;
    events: number;
    upcomingEvents: number;
  };
}

interface UsePropertyLinkedOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch linked entities (clients and events) for a property
 */
export function usePropertyLinked(
  propertyId: string | undefined,
  options: UsePropertyLinkedOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && propertyId ? `/api/mls/properties/${propertyId}/linked` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PropertyLinkedData>(key);

  return {
    linkedData: data ?? null,
    clients: data?.clients ?? [],
    mandates: data?.mandates ?? [],
    documents: data?.documents ?? [],
    events: data?.events ?? { upcoming: [], past: [], total: 0 },
    counts: data?.counts ?? { clients: 0, mandates: 0, documents: 0, events: 0, upcomingEvents: 0 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for property linked data
 * Useful for manual cache invalidation
 */
export function getPropertyLinkedKey(propertyId: string): string {
  return `/api/mls/properties/${propertyId}/linked`;
}

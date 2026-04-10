import useSWR from "swr";

export interface LinkedContact {
  id: string;
  friendlyId: string | null;
  displayName: string;
  email: string | null;
  primaryPhone: string | null;
  status: string | null;
  category: string[];
  createdAt?: string;
  updatedAt?: string;
  assignedAgent?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  } | null;
  /** @deprecated Legacy compat — populated from assignedAgent by the API route */
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
  clients: LinkedContact[];
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
    /** Linked contacts — response key is "clients" for API compat */
    clients: data?.clients ?? [] as LinkedContact[],
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

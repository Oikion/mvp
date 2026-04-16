import useSWR from "swr";

interface LinkedContact {
  id: string;
  friendlyId?: string;
  displayName: string;
  isCompany?: boolean;
  email?: string;
  primaryPhone?: string;
  category?: string[];
  role?: string;
}

interface LinkedProperty {
  id: string;
  friendlyId?: string;
  property_name?: string;
  property_type?: string;
  address_city?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface LinkedDocument {
  id: string;
  friendlyId?: string;
  document_name?: string;
  document_type?: string;
  document_file_mimeType?: string;
  createdAt?: string;
}

interface LinkedEvent {
  id: string;
  friendlyId?: string;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
  eventType?: string;
}

interface RequestLinkedData {
  contacts: LinkedContact[];
  properties: LinkedProperty[];
  documents: LinkedDocument[];
  events: LinkedEvent[];
}

interface UseRequestLinkedOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch linked entities (contacts and properties) for a request
 */
export function useRequestLinked(
  requestId: string | undefined,
  options: UseRequestLinkedOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && requestId ? `/api/requests/${requestId}/linked` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<RequestLinkedData>(key);

  return {
    linkedData: data ?? null,
    contacts: data?.contacts ?? [],
    properties: data?.properties ?? [],
    documents: data?.documents ?? [],
    events: data?.events ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for request linked data
 * Useful for manual cache invalidation
 */
export function getRequestLinkedKey(requestId: string): string {
  return `/api/requests/${requestId}/linked`;
}

import useSWR from "swr";

interface LinkedRequest {
  id: string;
  friendlyId?: string;
  requestType: string;
  status?: string;
  urgency?: string;
  budgetMin?: number;
  budgetMax?: number;
  locationDisplayName?: string;
  municipality?: string;
  role?: string;
}

interface LinkedProperty {
  id: string;
  friendlyId?: string;
  property_name?: string;
  property_type?: string;
  property_status?: string;
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

interface ContactLinkedData {
  requests: LinkedRequest[];
  properties: LinkedProperty[];
  documents: LinkedDocument[];
  events: LinkedEvent[];
}

interface UseContactLinkedOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch linked entities (requests and properties) for a contact
 */
export function useContactLinked(
  contactId: string | undefined,
  options: UseContactLinkedOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && contactId ? `/api/crm/contacts/${contactId}/linked` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ContactLinkedData>(key);

  return {
    linkedData: data ?? null,
    requests: data?.requests ?? [],
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
 * Get the SWR cache key for contact linked data
 * Useful for manual cache invalidation
 */
export function getContactLinkedKey(contactId: string): string {
  return `/api/crm/contacts/${contactId}/linked`;
}

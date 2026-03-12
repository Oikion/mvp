import useSWR from "swr";

interface LinkedProperty {
  id: string;
  friendlyId: string;
  property_name: string;
  property_type?: string;
  property_status?: string;
  address_street?: string;
  address_city?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  assigned_to_user?: { id: string; name: string | null } | null;
}

interface LinkedClient {
  id: string;
  friendlyId: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  intent?: string;
  assigned_to_user?: { id: string; name: string | null } | null;
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
  assignedUser?: { id: string; name: string | null; email: string } | null;
  linkedClients?: { id: string; client_name: string }[];
  linkedProperties?: { id: string; property_name: string }[];
}

interface LinkedDocument {
  id: string;
  friendlyId: string;
  document_name: string;
  document_type?: string;
  document_file_mimeType?: string;
  createdAt?: string;
}

interface MandateLinkedData {
  mandate?: { id: string; title: string };
  properties: LinkedProperty[];
  clients: LinkedClient[];
  documents: LinkedDocument[];
  events: {
    upcoming: LinkedEvent[];
    past: LinkedEvent[];
    total: number;
  };
  counts: { properties: number; clients: number; documents: number; events: number; upcomingEvents: number };
}

interface UseMandateLinkedOptions {
  enabled?: boolean;
}

export function useMandateLinked(
  mandateId: string | undefined,
  options: UseMandateLinkedOptions = {}
) {
  const { enabled = true } = options;
  const key = enabled && mandateId ? `/api/mandates/${mandateId}/linked` : null;
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<MandateLinkedData>(key);

  return {
    linkedData: data ?? null,
    properties: data?.properties ?? [],
    clients: data?.clients ?? [],
    documents: data?.documents ?? [],
    events: data?.events ?? { upcoming: [], past: [], total: 0 },
    counts: data?.counts ?? { properties: 0, clients: 0, documents: 0, events: 0, upcomingEvents: 0 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Get the SWR cache key for mandate linked data
 * Useful for manual cache invalidation
 */
export function getMandateLinkedKey(mandateId: string): string {
  return `/api/mandates/${mandateId}/linked`;
}

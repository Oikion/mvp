import useSWR from "swr";
import useDebounce from "@/hooks/useDebounce";

interface RelationshipPreview {
  id: string;
  name?: string;
  title?: string;
  client_name?: string;
  property_name?: string;
  startTime?: string;
}

interface Relationships {
  clients?: { count: number; preview?: RelationshipPreview[] };
  properties?: { count: number; preview?: RelationshipPreview[] };
  events?: { count: number; preview?: RelationshipPreview[] };
  client?: { id: string; client_name: string } | null;
}

export interface SearchResult {
  id: string;
  type: "property" | "client" | "contact" | "document" | "event";
  title: string;
  subtitle?: string;
  url: string;
  relationships?: Relationships;
}

interface SearchApiResponse {
  properties?: Array<{
    id: string;
    property_name?: string;
    area?: string;
    municipality?: string;
    relationships?: Relationships;
  }>;
  clients?: Array<{
    id: string;
    client_name?: string;
    primary_email?: string;
    relationships?: Relationships;
  }>;
  contacts?: Array<{
    id: string;
    contact_first_name?: string;
    contact_last_name?: string;
    email?: string;
    relationships?: Relationships;
  }>;
  documents?: Array<{
    id: string;
    document_name?: string;
    description?: string;
    relationships?: Relationships;
  }>;
  events?: Array<{
    id: string;
    title?: string;
    startTime?: string;
    location?: string;
    attendeeName?: string;
    relationships?: Relationships;
  }>;
}

/**
 * POST fetcher for search queries
 */
async function searchFetcher([url, query]: [string, string]): Promise<SearchResult[]> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const data: SearchApiResponse = await res.json();
  const formattedResults: SearchResult[] = [];

  // Format properties with relationships
  if (data.properties && Array.isArray(data.properties)) {
    data.properties.forEach((prop) => {
      formattedResults.push({
        id: prop.id,
        type: "property",
        title: prop.property_name || "Unnamed Property",
        subtitle: prop.area || prop.municipality || undefined,
        url: `/mls/properties/${prop.id}`,
        relationships: prop.relationships,
      });
    });
  }

  // Format clients with relationships
  if (data.clients && Array.isArray(data.clients)) {
    data.clients.forEach((client) => {
      formattedResults.push({
        id: client.id,
        type: "client",
        title: client.client_name || "Unnamed Client",
        subtitle: client.primary_email || undefined,
        url: `/crm/clients/${client.id}`,
        relationships: client.relationships,
      });
    });
  }

  // Format contacts with relationships
  if (data.contacts && Array.isArray(data.contacts)) {
    data.contacts.forEach((contact) => {
      const fullName =
        `${contact.contact_first_name || ""} ${contact.contact_last_name || ""}`.trim();
      formattedResults.push({
        id: contact.id,
        type: "contact",
        title: fullName || "Unnamed Contact",
        subtitle: contact.email || undefined,
        url: `/crm/contacts/${contact.id}`,
        relationships: contact.relationships,
      });
    });
  }

  // Format documents with relationships
  if (data.documents && Array.isArray(data.documents)) {
    data.documents.forEach((doc) => {
      formattedResults.push({
        id: doc.id,
        type: "document",
        title: doc.document_name || "Unnamed Document",
        subtitle: doc.description || undefined,
        url: `/documents/${doc.id}`,
        relationships: doc.relationships,
      });
    });
  }

  // Format calendar events with relationships
  if (data.events && Array.isArray(data.events)) {
    data.events.forEach((event) => {
      const eventDate = event.startTime
        ? new Date(event.startTime).toLocaleDateString()
        : undefined;
      const subtitleParts = [];
      if (eventDate) subtitleParts.push(eventDate);
      if (event.location) subtitleParts.push(event.location);
      if (event.attendeeName) subtitleParts.push(event.attendeeName);

      formattedResults.push({
        id: event.id,
        type: "event",
        title: event.title || "Untitled Event",
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(" • ") : undefined,
        url: `/calendar/events/${event.id}`,
        relationships: event.relationships,
      });
    });
  }

  return formattedResults;
}

interface UseGlobalSearchOptions {
  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceMs?: number;
}

/**
 * Hook for global search with debounce
 * Caches recent search results for instant display on repeat queries
 */
export function useGlobalSearch(query: string, options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  const debouncedQuery = useDebounce(query, debounceMs);

  const { data, error, isLoading, isValidating } = useSWR<SearchResult[]>(
    // Only fetch if query is at least 2 characters
    debouncedQuery.length >= 2 ? ["/api/global-search", debouncedQuery] : null,
    searchFetcher,
    {
      // Cache search results for 5 minutes
      dedupingInterval: 300000,
      revalidateOnFocus: false,
      // Keep previous data while loading new results
      keepPreviousData: true,
    }
  );

  return {
    results: data ?? [],
    isLoading: isLoading || (query.length >= 2 && query !== debouncedQuery),
    isValidating,
    error,
    debouncedQuery,
  };
}

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
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

export type SearchEntityType = "property" | "client" | "contact" | "document" | "event";

interface SearchMeta {
  query: string;
  page: number;
  limit: number;
  counts: {
    properties: number;
    clients: number;
    contacts: number;
    documents: number;
    events: number;
    total: number;
  };
  hasMore: boolean;
  timing: number;
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
  meta?: SearchMeta;
}

interface SearchRequestBody {
  query: string;
  types?: SearchEntityType[];
  page?: number;
  limit?: number;
  includeRelationships?: boolean;
}

/**
 * POST fetcher for search queries
 */
async function searchFetcher([url, body]: [string, SearchRequestBody]): Promise<{
  results: SearchResult[];
  meta: SearchMeta;
}> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
        url: `/app/mls/properties/${prop.id}`,
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
        url: `/app/crm/clients/${client.id}`,
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
        url: `/app/crm/contacts/${contact.id}`,
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
        url: `/app/documents/${doc.id}`,
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
        url: `/app/calendar/events/${event.id}`,
        relationships: event.relationships,
      });
    });
  }

  return {
    results: formattedResults,
    meta: data.meta || {
      query: "",
      page: 1,
      limit: 50,
      counts: { properties: 0, clients: 0, contacts: 0, documents: 0, events: 0, total: 0 },
      hasMore: false,
      timing: 0,
    },
  };
}

interface UseGlobalSearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Entity types to search (default: all) */
  types?: SearchEntityType[];
  /** Items per page (default: 50) */
  limit?: number;
  /** Whether to include relationship data (default: true) */
  includeRelationships?: boolean;
}

/**
 * Hook for global search with debounce
 * Caches recent search results for instant display on repeat queries
 */
export function useGlobalSearch(query: string, options: UseGlobalSearchOptions = {}) {
  const { debounceMs = 300, types, limit = 50, includeRelationships = true } = options;
  const debouncedQuery = useDebounce(query, debounceMs);

  const requestBody: SearchRequestBody = {
    query: debouncedQuery,
    types,
    page: 1,
    limit,
    includeRelationships,
  };

  const { data, error, isLoading, isValidating } = useSWR<{
    results: SearchResult[];
    meta: SearchMeta;
  }>(
    // Only fetch if query is at least 2 characters
    debouncedQuery.length >= 2 ? ["/api/global-search", requestBody] : null,
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
    results: data?.results ?? [],
    meta: data?.meta,
    isLoading: isLoading || (query.length >= 2 && query !== debouncedQuery),
    isValidating,
    error,
    debouncedQuery,
  };
}

/**
 * Hook for infinite scroll search with pagination
 */
export function useGlobalSearchInfinite(
  query: string,
  options: UseGlobalSearchOptions = {}
) {
  const { debounceMs = 300, types, limit = 50, includeRelationships = true } = options;
  const debouncedQuery = useDebounce(query, debounceMs);

  const getKey = (pageIndex: number, previousPageData: { results: SearchResult[]; meta: SearchMeta } | null) => {
    // Don't fetch if query is too short
    if (debouncedQuery.length < 2) return null;
    
    // Reached the end
    if (previousPageData && !previousPageData.meta.hasMore) return null;

    const requestBody: SearchRequestBody = {
      query: debouncedQuery,
      types,
      page: pageIndex + 1,
      limit,
      includeRelationships,
    };

    return ["/api/global-search", requestBody];
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<{
    results: SearchResult[];
    meta: SearchMeta;
  }>(getKey, searchFetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    parallel: false,
  });

  // Flatten all pages into a single array
  const results = data ? data.flatMap((page) => page.results) : [];
  const meta = data?.[data.length - 1]?.meta;
  const hasMore = meta?.hasMore ?? false;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  };

  return {
    results,
    meta,
    isLoading: isLoading || (query.length >= 2 && query !== debouncedQuery),
    isLoadingMore,
    isValidating,
    error,
    debouncedQuery,
    hasMore,
    loadMore,
    refresh: mutate,
  };
}

/**
 * Hook for filtered search by entity type
 */
export function useFilteredSearch(
  query: string,
  type: SearchEntityType | "all",
  options: Omit<UseGlobalSearchOptions, "types"> = {}
) {
  const types = type === "all" ? undefined : [type];
  return useGlobalSearch(query, { ...options, types });
}

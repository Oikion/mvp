/**
 * Unified Entity Search Hook
 * 
 * High-performance SWR hook for searching across multiple entity types.
 * Features:
 * - Debounced search queries (300ms)
 * - 5-minute cache deduplication
 * - Parallel fetching of entity types
 * - Stale-while-revalidate for instant results
 * - Preloaded top results when no query
 */

import useSWR from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { useMemo } from "react";

// ============================================
// Types
// ============================================

export type EntityType = "contact" | "property" | "document" | "event" | "request" | "deal";

export interface EntitySearchResult {
  value: string;
  label: string;
  type: EntityType;
  metadata: {
    subtitle?: string;
    status?: string;
    icon?: string;
    [key: string]: unknown;
  };
}

export interface EntitySearchResponse {
  results: Record<EntityType, EntitySearchResult[]>;
  timing: {
    total: number;
    perType: Record<EntityType, number>;
  };
}

export interface UseUnifiedEntitySearchOptions {
  /**
   * Entity types to search (default: all types)
   */
  types?: EntityType[];
  
  /**
   * Max results per entity type (default: 10)
   */
  limit?: number;
  
  /**
   * Debounce delay in ms (default: 300)
   */
  debounceMs?: number;
  
  /**
   * Optional type-specific filters
   */
  filters?: {
    contactStatus?: string;
    propertyStatus?: string;
    documentType?: string;
    eventType?: string;
    requestStatus?: string;
  };
  
  /**
   * Enable/disable fetching (default: true)
   */
  enabled?: boolean;
  
  /**
   * Minimum query length before searching (default: 0)
   */
  minQueryLength?: number;
}

// ============================================
// Fetcher
// ============================================

async function entitySearchFetcher(url: string): Promise<EntitySearchResponse> {
  const res = await fetch(url);

  // Handle rate limiting gracefully
  if (res.status === 429) {
    console.warn("[EntitySearch] Rate limited, returning empty results");
    return {
      results: { contact: [], property: [], document: [], event: [], request: [], deal: [] },
      timing: { total: 0, perType: { contact: 0, property: 0, document: 0, event: 0, request: 0, deal: 0 } },
    };
  }

  if (!res.ok) {
    throw new Error(`Failed to search entities: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Hook
// ============================================

export function useUnifiedEntitySearch(
  query: string,
  options: UseUnifiedEntitySearchOptions = {}
) {
  const {
    types = ["contact", "property", "document", "event", "request"],
    limit = 10,
    debounceMs = 300,
    filters = {},
    enabled = true,
    minQueryLength = 0,
  } = options;

  // Debounce the search query
  const debouncedQuery = useDebounce(query, debounceMs);
  
  // Determine if we should search or fetch top results
  const shouldSearch = debouncedQuery.length >= minQueryLength;
  const hasQuery = debouncedQuery.trim().length > 0;

  // Build cache key
  const cacheKey = useMemo(() => {
    if (!enabled) return null;

    const typesParam = types.join(",");
    const filterParams = new URLSearchParams();
    
    if (filters.contactStatus) filterParams.set("contactStatus", filters.contactStatus);
    if (filters.propertyStatus) filterParams.set("propertyStatus", filters.propertyStatus);
    if (filters.documentType) filterParams.set("documentType", filters.documentType);
    if (filters.eventType) filterParams.set("eventType", filters.eventType);
    if (filters.requestStatus) filterParams.set("requestStatus", filters.requestStatus);

    const filterString = filterParams.toString();
    const filterSuffix = filterString ? `&${filterString}` : "";
    const baseParams = `types=${typesParam}&limit=${limit}${filterSuffix}`;

    if (hasQuery && shouldSearch) {
      return `/api/entities/search?q=${encodeURIComponent(debouncedQuery)}&${baseParams}`;
    }

    // Fetch top results when no query
    return `/api/entities/top?${baseParams}`;
  }, [enabled, types, limit, filters, debouncedQuery, hasQuery, shouldSearch]);

  // SWR with optimized caching
  const { data, error, isLoading, isValidating, mutate } = useSWR<EntitySearchResponse>(
    cacheKey,
    entitySearchFetcher,
    {
      // 5-minute deduplication for identical queries
      dedupingInterval: 300000,
      // Don't refetch on focus for selectors
      revalidateOnFocus: false,
      // Keep previous data while fetching new results
      keepPreviousData: true,
      // Disable automatic revalidation
      revalidateOnReconnect: false,
      // Error retry with exponential backoff
      errorRetryCount: 2,
    }
  );

  // Flatten results for components that need a single array
  const flatResults = useMemo(() => {
    if (!data?.results) return [];
    
    const allResults: EntitySearchResult[] = [];
    for (const type of types) {
      const typeResults = data.results[type] || [];
      allResults.push(...typeResults);
    }
    return allResults;
  }, [data?.results, types]);

  // Group results by type for components that need grouped display
  const groupedResults = useMemo(() => {
    if (!data?.results) {
      return {
        contact: [],
        property: [],
        document: [],
        event: [],
        request: [],
        deal: [],
      };
    }
    return data.results;
  }, [data?.results]);

  return {
    // Results
    results: flatResults,
    groupedResults,
    
    // Loading states
    isLoading,
    isValidating,
    isSearching: isValidating && hasQuery,
    
    // Error handling
    error,
    
    // Timing info (useful for debugging)
    timing: data?.timing,
    
    // Manual revalidation
    mutate,
    
    // Query info
    debouncedQuery,
    hasQuery,
  };
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * @deprecated Use useContactSearch instead
 */
export function useClientSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["contact"] });
}

/**
 * Hook for searching only properties
 */
export function usePropertySearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["property"] });
}

/**
 * Hook for searching only documents
 */
export function useDocumentSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["document"] });
}

/**
 * Hook for searching only events
 */
export function useEventSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["event"] });
}

/**
 * Hook for searching only contacts
 */
export function useContactSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["contact"] });
}

/**
 * Hook for searching only requests
 */
export function useRequestSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["request"] });
}

/**
 * Convenience hook for searching deals only.
 */
export function useDealSearch(
  query: string,
  options: Omit<UseUnifiedEntitySearchOptions, "types"> = {}
) {
  return useUnifiedEntitySearch(query, { ...options, types: ["deal"] });
}

// Default export
export default useUnifiedEntitySearch;

import useSWRInfinite from "swr/infinite";
import fetcher from "@/lib/fetcher";
import {
  buildPaginatedUrl,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";

interface PropertyData {
  id: string;
  property_name: string;
  property_status?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  address_city?: string;
  assigned_to_user?: { name: string };
  linkedDocuments?: Array<{ document_file_url?: string }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format for paginated properties.
 * Note: Uses legacy format { items, nextCursor, hasMore } for backward compatibility.
 * New APIs should use { items, pagination: { nextCursor, hasMore, limit } }
 */
interface PaginatedResponse {
  items: PropertyData[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UsePropertiesPaginatedOptions {
  /** Number of items per page (default: 50, max: 100) */
  limit?: number;
  /** Filter by property status */
  status?: string;
  /** Search query for property name */
  search?: string;
  /** Enable/disable fetching */
  enabled?: boolean;
}

/**
 * Hook for fetching paginated properties with infinite scroll support.
 * 
 * Uses cursor-based pagination for optimal performance with large datasets.
 * 
 * Usage:
 * ```tsx
 * const {
 *   properties,
 *   isLoading,
 *   isLoadingMore,
 *   hasMore,
 *   loadMore,
 *   error,
 * } = usePropertiesPaginated({ limit: 50, status: "ACTIVE" });
 * 
 * // In IntersectionObserver callback
 * if (hasMore && !isLoadingMore) {
 *   loadMore();
 * }
 * ```
 */
export function usePropertiesPaginated(options: UsePropertiesPaginatedOptions = {}) {
  const { limit = DEFAULT_PAGE_SIZE, status, search, enabled = true } = options;

  // Key generator for SWR infinite using shared pagination utilities
  const getKey = (pageIndex: number, previousPageData: PaginatedResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;
    
    // Disabled
    if (!enabled) return null;

    // First page
    if (pageIndex === 0) {
      return buildPaginatedUrl("/api/mls/properties", { limit }, { status, search });
    }

    // Subsequent pages with cursor
    const cursor = previousPageData?.nextCursor;
    if (!cursor) return null;

    return buildPaginatedUrl("/api/mls/properties", { cursor, limit }, { status, search });
  };

  const {
    data,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<PaginatedResponse>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  // Flatten all pages into single array
  const properties = data ? data.flatMap((page) => page.items) : [];
  
  // Check if there are more pages to load
  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false;
  
  // Check if currently loading more
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  // Load next page
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  };

  // Refresh all data
  const refresh = () => {
    mutate();
  };

  return {
    properties,
    isLoading: !data && !error,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    size,
  };
}

export type { PropertyData, PaginatedResponse };








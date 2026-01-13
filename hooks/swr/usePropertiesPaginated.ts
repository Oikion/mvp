import useSWRInfinite from "swr/infinite";
import fetcher from "@/lib/fetcher";

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
  const { limit = 50, status, search, enabled = true } = options;

  // Build query string
  const buildQueryString = (params: Record<string, string | number | undefined>) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, String(value));
      }
    });
    return queryParams.toString();
  };

  // Key generator for SWR infinite
  const getKey = (pageIndex: number, previousPageData: PaginatedResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;
    
    // Disabled
    if (!enabled) return null;

    // First page
    if (pageIndex === 0) {
      const query = buildQueryString({ limit, status, search });
      return `/api/mls/properties${query ? `?${query}` : ""}`;
    }

    // Subsequent pages with cursor
    const cursor = previousPageData?.nextCursor;
    if (!cursor) return null;

    const query = buildQueryString({ limit, status, search, cursor });
    return `/api/mls/properties?${query}`;
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








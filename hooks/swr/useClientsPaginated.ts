import useSWRInfinite from "swr/infinite";
import fetcher from "@/lib/fetcher";
import {
  buildPaginatedUrl,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";

interface Contact {
  first_name?: string;
  last_name?: string;
}

interface ClientData {
  id: string;
  client_name: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  assigned_to_user?: { name: string };
  contacts?: Contact[];
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format for paginated clients.
 * Note: Uses legacy format { items, nextCursor, hasMore } for backward compatibility.
 * New APIs should use { items, pagination: { nextCursor, hasMore, limit } }
 */
interface PaginatedResponse {
  items: ClientData[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseClientsPaginatedOptions {
  /** Number of items per page (default: 50, max: 100) */
  limit?: number;
  /** Filter by client status */
  status?: string;
  /** Search query for client name or email */
  search?: string;
  /** Enable/disable fetching */
  enabled?: boolean;
}

/**
 * Hook for fetching paginated clients with infinite scroll support.
 * 
 * Uses cursor-based pagination for optimal performance with large datasets.
 * 
 * Usage:
 * ```tsx
 * const {
 *   clients,
 *   isLoading,
 *   isLoadingMore,
 *   hasMore,
 *   loadMore,
 *   error,
 * } = useClientsPaginated({ limit: 50, status: "ACTIVE" });
 * 
 * // In IntersectionObserver callback
 * if (hasMore && !isLoadingMore) {
 *   loadMore();
 * }
 * ```
 */
export function useClientsPaginated(options: UseClientsPaginatedOptions = {}) {
  const { limit = DEFAULT_PAGE_SIZE, status, search, enabled = true } = options;

  // Key generator for SWR infinite using shared pagination utilities
  const getKey = (pageIndex: number, previousPageData: PaginatedResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;
    
    // Disabled
    if (!enabled) return null;

    // First page
    if (pageIndex === 0) {
      return buildPaginatedUrl("/api/crm/clients", { limit }, { status, search });
    }

    // Subsequent pages with cursor
    const cursor = previousPageData?.nextCursor;
    if (!cursor) return null;

    return buildPaginatedUrl("/api/crm/clients", { cursor, limit }, { status, search });
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
  const clients = data ? data.flatMap((page) => page.items) : [];
  
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
    clients,
    isLoading: !data && !error,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
    size,
  };
}

export type { ClientData, PaginatedResponse };








import useSWRInfinite from "swr/infinite";
import fetcher from "@/lib/fetcher";
import { buildPaginatedUrl, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export interface ContactData {
  id: string;
  displayName: string;
  status?: string;
  category?: string;
  email?: string;
  primaryPhone?: string;
  companyName?: string;
  assignedAgent?: { name: string; id: string } | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Contacts list API response format: { data: [...], meta: { cursor, hasMore } }
 */
interface PaginatedContactsResponse {
  data: ContactData[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export type PaginatedContactData = ContactData;

interface UseContactsPaginatedOptions {
  /** Number of items per page (default: 50) */
  limit?: number;
  /** Filter by contact status */
  status?: string;
  /** Filter by contact category */
  category?: string;
  /** Search query for display name, email, or phone */
  search?: string;
  /** Enable/disable fetching */
  enabled?: boolean;
}

/**
 * Hook for fetching paginated contacts with infinite scroll support.
 *
 * Uses cursor-based pagination. The contacts API returns
 * `{ data: [...], meta: { cursor, hasMore } }`.
 */
export function useContactsPaginated(options: UseContactsPaginatedOptions = {}) {
  const { limit = DEFAULT_PAGE_SIZE, status, category, search, enabled = true } = options;

  const getKey = (pageIndex: number, previousPageData: PaginatedContactsResponse | null) => {
    if (previousPageData && !previousPageData.meta.hasMore) return null;
    if (!enabled) return null;

    if (pageIndex === 0) {
      return buildPaginatedUrl("/api/crm/contacts", { limit }, { status, category, search });
    }

    const cursor = previousPageData?.meta.cursor;
    if (!cursor) return null;

    return buildPaginatedUrl("/api/crm/contacts", { cursor, limit }, { status, category, search });
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<PaginatedContactsResponse>(getKey, fetcher, {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    });

  const contacts = data ? data.flatMap((page) => page.data) : [];
  const hasMore = data ? (data[data.length - 1]?.meta.hasMore ?? false) : false;
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  return {
    contacts,
    isLoading: !data && !error,
    isLoadingMore,
    isValidating,
    hasMore,
    loadMore: () => {
      if (!isLoadingMore && hasMore) setSize(size + 1);
    },
    error,
    refresh: () => mutate(),
    size,
  };
}

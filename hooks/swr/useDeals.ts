import useSWR from "swr";
import fetcher from "@/lib/fetcher";

export interface DealOption {
  value: string;
  label: string;
}

// The deals API may return either a bare array or the standard
// `{ data: [...] }` envelope used by api-response helpers.
type DealsListResponse = unknown[] | { data: unknown[] };
type DealDetailResponse = { data?: unknown };

interface UseDealOptions {
  stage?: string;
  dealType?: string;
  search?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch deals for list pages.
 */
export function useDeals(options: UseDealOptions = {}) {
  const { stage, dealType, search, enabled = true } = options;

  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (dealType) params.set("dealType", dealType);
  if (search) params.set("search", search);

  const queryString = params.toString();
  const url = `/api/deals${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<DealsListResponse>(
    enabled ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Handle both { data: [...] } and bare array response shapes
  const deals: unknown[] = Array.isArray(data)
    ? data
    : (data && "data" in data ? data.data : []) ?? [];

  return {
    deals,
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

/**
 * Hook to fetch a single deal by ID or friendlyId.
 */
export function useDeal(dealId: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<DealDetailResponse>(
    enabled && dealId ? `/api/deals/${dealId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const deal =
    (data && typeof data === "object" && "data" in data ? data.data : data) ??
    null;

  return {
    deal,
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

export const getDealsKey = (stage?: string) =>
  stage ? `/api/deals?stage=${stage}` : "/api/deals";
export const getDealKey = (id: string) => `/api/deals/${id}`;

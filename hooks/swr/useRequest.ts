import useSWR from "swr";
import fetcher from "@/lib/fetcher";

interface UseRequestOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch a single request by friendlyId.
 */
export function useRequest(
  requestId: string | null,
  options: UseRequestOptions = {}
) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR(
    enabled && requestId ? `/api/requests/${requestId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    request: data ?? null,
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

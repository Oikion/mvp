import useSWR from "swr";
import fetcher from "@/lib/fetcher";

interface UseRequestCommentsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch comments for a request.
 */
export function useRequestComments(
  requestId: string | null,
  options: UseRequestCommentsOptions = {}
) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR(
    enabled && requestId ? `/api/requests/${requestId}/comments` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    comments: Array.isArray(data) ? data : [],
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

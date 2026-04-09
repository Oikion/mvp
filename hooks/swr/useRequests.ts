import useSWR from "swr";

export interface RequestOption {
  value: string;
  label: string;
}

interface RequestSelectorResponse {
  id: string;
  friendlyId: string;
  requestType: string;
  contact?: { displayName?: string };
}

interface UseRequestsOptions {
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function requestsFetcher(url: string): Promise<RequestOption[]> {
  const res = await fetch(url);

  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch requests: ${res.status}`);
  }

  const json = await res.json();
  const items = json.data || json.items || json;

  if (Array.isArray(items)) {
    return items.map((request: RequestSelectorResponse) => ({
      value: request.id,
      label: `${request.friendlyId} — ${request.contact?.displayName || "Unknown"} (${request.requestType})`,
    }));
  }

  return [];
}

/**
 * Hook to fetch requests for selector components.
 * Transforms API response to {value, label}[] format.
 */
export function useRequests(options: UseRequestsOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR(
    enabled ? "/api/requests?minimal=true" : null,
    requestsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    requests: data ?? [],
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

import useSWR from "swr";

export interface ClientOption {
  value: string;
  label: string;
}

interface ClientsResponse {
  id: string;
  client_name: string;
}

interface UseClientsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function clientsFetcher(url: string): Promise<ClientOption[]> {
  const res = await fetch(url);

  // Handle rate limiting gracefully
  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch clients: ${res.status}`);
  }

  const data = await res.json();

  // Handle paginated response format { items: [...], nextCursor, hasMore }
  const items = data.items || data;
  
  if (Array.isArray(items)) {
    return items.map((client: ClientsResponse) => ({
      value: client.id,
      label: client.client_name || "Unnamed Client",
    }));
  }

  return [];
}

/**
 * Hook to fetch clients for selector components
 * Transforms API response to {value, label}[] format
 */
export function useClients(options: UseClientsOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientOption[]>(
    enabled ? "/api/crm/clients?minimal=true" : null,
    clientsFetcher,
    {
      // Keep data fresh for 5 minutes - selector data doesn't change often
      dedupingInterval: 300000,
      revalidateOnFocus: false,
    }
  );

  return {
    clients: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

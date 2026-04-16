import useSWR from "swr";

export interface MandateOption {
  value: string;
  label: string;
}

interface MandatesResponse {
  id: string;
  mandate_name: string;
}

interface UseMandatesOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function mandatesFetcher(url: string): Promise<MandateOption[]> {
  const res = await fetch(url);

  // Handle rate limiting gracefully
  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch mandates: ${res.status}`);
  }

  const data = await res.json();

  // Handle paginated response format { items: [...], nextCursor, hasMore }
  const items = data.items || data;

  if (Array.isArray(items)) {
    return items.map((mandate: MandatesResponse) => ({
      value: mandate.id,
      label: mandate.mandate_name || "Unnamed Mandate",
    }));
  }

  return [];
}

/**
 * Hook to fetch mandates for selector components
 * Transforms API response to {value, label}[] format
 */
export function useMandates(options: UseMandatesOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<MandateOption[]>(
    enabled ? "/api/requests?minimal=true" : null,
    mandatesFetcher,
    {
      // Keep data fresh for 5 minutes - selector data doesn't change often
      dedupingInterval: 300000,
      revalidateOnFocus: false,
    }
  );

  return {
    mandates: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

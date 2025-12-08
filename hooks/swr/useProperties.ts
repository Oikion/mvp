import useSWR from "swr";

export interface PropertyOption {
  value: string;
  label: string;
}

interface PropertiesResponse {
  id: string;
  property_name: string;
}

interface UsePropertiesOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function propertiesFetcher(url: string): Promise<PropertyOption[]> {
  const res = await fetch(url);

  // Handle rate limiting gracefully
  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch properties: ${res.status}`);
  }

  const data = await res.json();

  // Handle both array response and error object response
  if (Array.isArray(data)) {
    return data.map((property: PropertiesResponse) => ({
      value: property.id,
      label: property.property_name || "Unnamed Property",
    }));
  }

  return [];
}

/**
 * Hook to fetch properties for selector components
 * Transforms API response to {value, label}[] format
 */
export function useProperties(options: UsePropertiesOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PropertyOption[]>(
    enabled ? "/api/mls/properties" : null,
    propertiesFetcher,
    {
      // Keep data fresh for 1 minute (matches previous manual cache duration)
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    properties: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

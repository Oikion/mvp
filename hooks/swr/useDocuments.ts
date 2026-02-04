import useSWR from "swr";

export interface DocumentOption {
  value: string;
  label: string;
}

interface DocumentsResponse {
  id: string;
  document_name: string;
}

interface UseDocumentsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function documentsFetcher(url: string): Promise<DocumentOption[]> {
  const res = await fetch(url);

  // Handle rate limiting gracefully
  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch documents: ${res.status}`);
  }

  const data = await res.json();

  // Handle both array response and error object response
  if (Array.isArray(data)) {
    return data.map((doc: DocumentsResponse) => ({
      value: doc.id,
      label: doc.document_name || "Unnamed Document",
    }));
  }

  return [];
}

/**
 * Hook to fetch documents for selector components
 * Transforms API response to {value, label}[] format
 */
export function useDocuments(options: UseDocumentsOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<DocumentOption[]>(
    enabled ? "/api/documents" : null,
    documentsFetcher,
    {
      // Keep data fresh for 1 minute (matches previous manual cache duration)
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    documents: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

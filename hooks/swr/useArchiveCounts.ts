import useSWR from "swr";

export interface ArchiveCountsResponse {
  data: {
    properties: number;
    contacts: number;
    requests: number;
    deals: number;
    documents: number;
    events: number;
  };
}

export function useArchiveCounts(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ArchiveCountsResponse>(
    enabled ? "/api/archive/counts" : null,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
      dedupingInterval: 30000,
    }
  );

  return {
    counts: data?.data ?? null,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

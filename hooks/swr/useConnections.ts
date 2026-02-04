import useSWR from "swr";

export interface ConnectionUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  agentProfile?: {
    slug: string;
    bio: string | null;
    specializations: string[];
    visibility: string;
  } | null;
}

export interface Connection {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  isIncoming: boolean;
  user: ConnectionUser;
}

interface UseConnectionsOptions {
  /**
   * Filter by connection status
   */
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
  /**
   * Filter by connection type: "received", "sent", or null for all
   */
  type?: "received" | "sent";
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Build the connections API URL with query params
 */
function buildConnectionsUrl(options: UseConnectionsOptions): string {
  const params = new URLSearchParams();
  if (options.status) {
    params.set("status", options.status);
  }
  if (options.type) {
    params.set("type", options.type);
  }
  const queryString = params.toString();
  return `/api/connections${queryString ? `?${queryString}` : ""}`;
}

/**
 * Custom fetcher for connections API
 */
async function connectionsFetcher(url: string): Promise<Connection[]> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch connections: ${res.status}`);
  }

  return res.json();
}

/**
 * Hook to fetch user connections
 * Supports filtering by status and type
 */
export function useConnections(options: UseConnectionsOptions = {}) {
  const { enabled = true, ...filterOptions } = options;

  const key = enabled ? buildConnectionsUrl(filterOptions) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Connection[]>(
    key,
    connectionsFetcher,
    {
      // Cache for 1 minute
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    connections: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

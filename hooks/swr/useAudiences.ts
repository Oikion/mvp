import useSWR from "swr";

export interface AudienceMember {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface Audience {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isAutoSync: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  memberCount: number;
  members: AudienceMember[];
}

interface UseAudiencesOptions {
  /**
   * Filter by audience type: "personal", "org", or null for all
   */
  type?: "personal" | "org";
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Build the audiences API URL with query params
 */
function buildAudiencesUrl(options: UseAudiencesOptions): string {
  const params = new URLSearchParams();
  if (options.type) {
    params.set("type", options.type);
  }
  const queryString = params.toString();
  return `/api/audiences${queryString ? `?${queryString}` : ""}`;
}

/**
 * Custom fetcher for audiences API
 */
async function audiencesFetcher(url: string): Promise<Audience[]> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch audiences: ${res.status}`);
  }

  return res.json();
}

/**
 * Hook to fetch user audiences
 * Supports filtering by type (personal vs org)
 */
export function useAudiences(options: UseAudiencesOptions = {}) {
  const { enabled = true, ...filterOptions } = options;

  const key = enabled ? buildAudiencesUrl(filterOptions) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Audience[]>(
    key,
    audiencesFetcher,
    {
      // Cache for 1 minute
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  return {
    audiences: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

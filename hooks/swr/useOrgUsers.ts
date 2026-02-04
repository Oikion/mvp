import useSWR from "swr";

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  avatar?: string | null;
  role?: string;
}

interface OrgUsersResponse {
  users: OrgUser[];
}

interface UseOrgUsersOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch organization users
 * Shared across multiple components with automatic cache deduplication
 */
export function useOrgUsers(options: UseOrgUsersOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<OrgUsersResponse>(
    enabled ? "/api/org/users" : null
  );

  return {
    users: data?.users ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

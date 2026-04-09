import useSWR from "swr";
import fetcher from "@/lib/fetcher";

interface UseContactOptions {
  enabled?: boolean;
}

// The contacts API returns the standard `{ data: ... }` envelope from
// lib/api-response helpers.
type ContactResponse = { data?: unknown };

/**
 * Hook to fetch a single contact by ID (friendlyId or internal id).
 */
export function useContact(contactId: string | null, options: UseContactOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<ContactResponse>(
    enabled && contactId ? `/api/crm/contacts/${contactId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    contact: data?.data ?? null,
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

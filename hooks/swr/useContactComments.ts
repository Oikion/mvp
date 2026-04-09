import useSWR from "swr";
import fetcher from "@/lib/fetcher";

interface UseContactCommentsOptions {
  enabled?: boolean;
}

// The contacts comments API returns the standard `{ data: [...] }` envelope.
type ContactCommentsResponse = { data?: unknown[] };

/**
 * Hook to fetch comments for a contact.
 */
export function useContactComments(
  contactId: string | null,
  options: UseContactCommentsOptions = {}
) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<ContactCommentsResponse>(
    enabled && contactId ? `/api/crm/contacts/${contactId}/comments` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    comments: data?.data ?? [],
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

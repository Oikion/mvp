import useSWR from "swr";

export interface ContactOption {
  value: string;
  label: string;
}

interface ContactSelectorResponse {
  id: string;
  displayName: string;
}

interface UseContactsOptions {
  enabled?: boolean;
}

/**
 * Fetcher that transforms API response to selector options
 */
async function contactsFetcher(url: string): Promise<ContactOption[]> {
  const res = await fetch(url);

  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch contacts: ${res.status}`);
  }

  const json = await res.json();
  const items = json.data || json.items || json;

  if (Array.isArray(items)) {
    return items.map((contact: ContactSelectorResponse) => ({
      value: contact.id,
      label: contact.displayName || "Unnamed Contact",
    }));
  }

  return [];
}

/**
 * Hook to fetch contacts for selector components.
 * Transforms API response to {value, label}[] format.
 */
export function useContacts(options: UseContactsOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ContactOption[]>(
    enabled ? "/api/crm/contacts?limit=100" : null,
    contactsFetcher,
    {
      // Project convention from hooks/swr/CLAUDE.md: 5000ms dedupe window.
      // Previously 300000 (5 min), which caused newly-created contacts to be
      // invisible to selector dropdowns for up to 5 minutes because SWR's
      // dedupingInterval overrides revalidateOnMount — every remount returned
      // the stale cached array instead of refetching.
      dedupingInterval: 5000,
      revalidateOnFocus: false,
    }
  );

  return {
    contacts: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

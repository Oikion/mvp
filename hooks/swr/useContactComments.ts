import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import fetcher from "@/lib/fetcher";

export interface ContactComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

interface ContactCommentsResponse {
  data: ContactComment[];
}

interface UseContactCommentsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch comments for a contact
 */
export function useContactComments(
  contactId: string | null | undefined,
  options: UseContactCommentsOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && contactId ? `/api/crm/contacts/${contactId}/comments` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ContactCommentsResponse>(
    key,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  return {
    comments: data?.data ?? [],
    isLoading: !data && !error,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Hook to add a comment to a contact
 */
export function useAddContactComment(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/crm/contacts/${contactId}/comments`;

  const { trigger, isMutating, error } = useSWRMutation<
    { data: ContactComment },
    Error,
    string,
    { content: string }
  >(
    key,
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add comment");
      }

      return res.json();
    }
  );

  const addComment = async (arg: { content: string }) => {
    const result = await trigger(arg);
    globalMutate(key);
    return result;
  };

  return {
    addComment,
    isAdding: isMutating,
    error,
  };
}

/**
 * Hook to delete a comment from a contact
 */
export function useDeleteContactComment(contactId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/crm/contacts/${contactId}/comments`;

  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { commentId: string }
  >(
    key,
    async (url, { arg }) => {
      const res = await fetch(`${url}?commentId=${arg.commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete comment");
      }

      return res.json();
    }
  );

  const deleteComment = async (arg: { commentId: string }) => {
    globalMutate<ContactCommentsResponse>(
      key,
      (currentData) => ({
        data: (currentData?.data ?? []).filter((c) => c.id !== arg.commentId),
      }),
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      globalMutate(key);
      throw err;
    }
  };

  return {
    deleteComment,
    isDeleting: isMutating,
    error,
  };
}

/**
 * Get the SWR cache key for contact comments
 */
export function getContactCommentsKey(contactId: string): string {
  return `/api/crm/contacts/${contactId}/comments`;
}

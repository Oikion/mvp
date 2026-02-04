import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

export interface ClientComment {
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

interface ClientCommentsResponse {
  comments: ClientComment[];
}

interface UseClientCommentsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch comments for a client
 */
export function useClientComments(
  clientId: string | undefined,
  options: UseClientCommentsOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && clientId ? `/api/crm/clients/${clientId}/comments` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientCommentsResponse>(key);

  return {
    comments: data?.comments ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface UseAddClientCommentOptions {
  /**
   * Current user info for optimistic updates
   * If provided, comment will appear immediately before server confirms
   */
  currentUser?: CurrentUser;
}

/**
 * Hook to add a comment to a client
 * Supports optimistic updates when currentUser is provided
 */
export function useAddClientComment(
  clientId: string,
  options: UseAddClientCommentOptions = {}
) {
  const { currentUser } = options;
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/crm/clients/${clientId}/comments`;

  const { trigger, isMutating, error } = useSWRMutation<
    { comment: ClientComment },
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

  // Wrap trigger to provide optimistic update
  const addComment = async (arg: { content: string }) => {
    if (currentUser) {
      // Optimistic update: show comment immediately
      const tempId = `temp-${Date.now()}`;
      const tempComment: ClientComment = {
        id: tempId,
        content: arg.content,
        createdAt: new Date().toISOString(),
        user: currentUser,
      };

      globalMutate<ClientCommentsResponse>(
        key,
        (currentData) => ({
          comments: [...(currentData?.comments ?? []), tempComment],
        }),
        { revalidate: false }
      );

      try {
        const result = await trigger(arg);
        // Replace temp comment with real one
        globalMutate<ClientCommentsResponse>(
          key,
          (currentData) => ({
            comments: (currentData?.comments ?? [])
              .filter((c) => c.id !== tempId)
              .concat(result.comment),
          }),
          { revalidate: false }
        );
        return result;
      } catch (err) {
        // Roll back on error
        globalMutate(key);
        throw err;
      }
    } else {
      // No optimistic update, just trigger and revalidate
      const result = await trigger(arg);
      globalMutate(key);
      return result;
    }
  };

  return {
    addComment,
    isAdding: isMutating,
    error,
  };
}

/**
 * Hook to delete a comment from a client
 * Supports optimistic updates - comment is removed immediately
 */
export function useDeleteClientComment(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/crm/clients/${clientId}/comments`;

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

  // Wrap trigger to provide optimistic update
  const deleteComment = async (arg: { commentId: string }) => {
    // Optimistic update: remove comment immediately
    globalMutate<ClientCommentsResponse>(
      key,
      (currentData) => ({
        comments: (currentData?.comments ?? []).filter((c) => c.id !== arg.commentId),
      }),
      { revalidate: false }
    );

    try {
      return await trigger(arg);
    } catch (err) {
      // Roll back on error
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
 * Get the SWR cache key for client comments
 * Useful for manual cache invalidation
 */
export function getClientCommentsKey(clientId: string): string {
  return `/api/crm/clients/${clientId}/comments`;
}

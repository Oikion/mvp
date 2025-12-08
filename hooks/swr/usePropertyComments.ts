import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

export interface PropertyComment {
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

interface PropertyCommentsResponse {
  comments: PropertyComment[];
}

interface UsePropertyCommentsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Hook to fetch comments for a property
 */
export function usePropertyComments(
  propertyId: string | undefined,
  options: UsePropertyCommentsOptions = {}
) {
  const { enabled = true } = options;

  const key = enabled && propertyId ? `/api/mls/properties/${propertyId}/comments` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<PropertyCommentsResponse>(key);

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

interface UseAddPropertyCommentOptions {
  /**
   * Current user info for optimistic updates
   * If provided, comment will appear immediately before server confirms
   */
  currentUser?: CurrentUser;
}

/**
 * Hook to add a comment to a property
 * Supports optimistic updates when currentUser is provided
 */
export function useAddPropertyComment(
  propertyId: string,
  options: UseAddPropertyCommentOptions = {}
) {
  const { currentUser } = options;
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/mls/properties/${propertyId}/comments`;

  const { trigger, isMutating, error } = useSWRMutation<
    { comment: PropertyComment },
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
      const tempComment: PropertyComment = {
        id: tempId,
        content: arg.content,
        createdAt: new Date().toISOString(),
        user: currentUser,
      };

      globalMutate<PropertyCommentsResponse>(
        key,
        (currentData) => ({
          comments: [...(currentData?.comments ?? []), tempComment],
        }),
        { revalidate: false }
      );

      try {
        const result = await trigger(arg);
        // Replace temp comment with real one
        globalMutate<PropertyCommentsResponse>(
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
 * Hook to delete a comment from a property
 * Supports optimistic updates - comment is removed immediately
 */
export function useDeletePropertyComment(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/api/mls/properties/${propertyId}/comments`;

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
    globalMutate<PropertyCommentsResponse>(
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
 * Get the SWR cache key for property comments
 * Useful for manual cache invalidation
 */
export function getPropertyCommentsKey(propertyId: string): string {
  return `/api/mls/properties/${propertyId}/comments`;
}

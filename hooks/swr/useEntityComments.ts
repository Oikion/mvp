/**
 * Generic Entity Comments Hook
 *
 * Provides a unified API for managing comments on different entity types.
 * Supports optimistic updates for immediate UI feedback.
 *
 * @example
 * ```typescript
 * // For clients
 * const { comments, addComment, deleteComment } = useEntityComments("client", clientId);
 *
 * // For properties
 * const { comments, addComment, deleteComment } = useEntityComments("property", propertyId);
 * ```
 */

import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

// =============================================================================
// Types
// =============================================================================

/**
 * Supported entity types for comments
 */
export type CommentableEntityType = "client" | "property";

/**
 * Standard comment structure
 */
export interface EntityComment {
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

interface CommentsResponse {
  comments: EntityComment[];
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface UseEntityCommentsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
  /**
   * Current user info for optimistic updates
   * If provided, comments will appear immediately before server confirms
   */
  currentUser?: CurrentUser;
}

// =============================================================================
// URL Helpers
// =============================================================================

/**
 * Get the API endpoint for entity comments
 */
function getCommentsEndpoint(entityType: CommentableEntityType, entityId: string): string {
  switch (entityType) {
    case "client":
      return `/api/crm/clients/${entityId}/comments`;
    case "property":
      return `/api/mls/properties/${entityId}/comments`;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Get the SWR cache key for entity comments
 * Useful for manual cache invalidation
 */
export function getEntityCommentsKey(entityType: CommentableEntityType, entityId: string): string {
  return getCommentsEndpoint(entityType, entityId);
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Hook to manage comments for an entity
 *
 * @param entityType - Type of entity ("client" | "property")
 * @param entityId - ID of the entity
 * @param options - Hook options
 *
 * @returns Object with comments, loading states, and mutation functions
 */
export function useEntityComments(
  entityType: CommentableEntityType,
  entityId: string | undefined,
  options: UseEntityCommentsOptions = {}
) {
  const { enabled = true, currentUser } = options;
  const { mutate: globalMutate } = useSWRConfig();

  const key = enabled && entityId ? getCommentsEndpoint(entityType, entityId) : null;

  // Fetch comments
  const { data, error, isLoading, isValidating, mutate } = useSWR<CommentsResponse>(key);

  // Add comment mutation
  const addMutation = useSWRMutation<
    { comment: EntityComment },
    Error,
    string | null,
    { content: string }
  >(
    key,
    async (url, { arg }) => {
      if (!url) throw new Error("No URL provided");
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

  // Delete comment mutation
  const deleteMutation = useSWRMutation<
    { success: boolean },
    Error,
    string | null,
    { commentId: string }
  >(
    key,
    async (url, { arg }) => {
      if (!url) throw new Error("No URL provided");
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

  // Add comment with optimistic update
  const addComment = async (content: string) => {
    if (!key) throw new Error("Entity ID is required");

    if (currentUser) {
      // Optimistic update: show comment immediately
      const tempId = `temp-${Date.now()}`;
      const tempComment: EntityComment = {
        id: tempId,
        content,
        createdAt: new Date().toISOString(),
        user: currentUser,
      };

      globalMutate<CommentsResponse>(
        key,
        (currentData) => ({
          comments: [...(currentData?.comments ?? []), tempComment],
        }),
        { revalidate: false }
      );

      try {
        const result = await addMutation.trigger({ content });
        // Replace temp comment with real one
        globalMutate<CommentsResponse>(
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
      const result = await addMutation.trigger({ content });
      globalMutate(key);
      return result;
    }
  };

  // Delete comment with optimistic update
  const deleteComment = async (commentId: string) => {
    if (!key) throw new Error("Entity ID is required");

    // Optimistic update: remove comment immediately
    globalMutate<CommentsResponse>(
      key,
      (currentData) => ({
        comments: (currentData?.comments ?? []).filter((c) => c.id !== commentId),
      }),
      { revalidate: false }
    );

    try {
      return await deleteMutation.trigger({ commentId });
    } catch (err) {
      // Roll back on error
      globalMutate(key);
      throw err;
    }
  };

  return {
    // Data
    comments: data?.comments ?? [],

    // Loading states
    isLoading,
    isValidating,
    isAdding: addMutation.isMutating,
    isDeleting: deleteMutation.isMutating,

    // Errors
    error,
    addError: addMutation.error,
    deleteError: deleteMutation.error,

    // Actions
    addComment,
    deleteComment,
    mutate,
  };
}

// =============================================================================
// Type Aliases for Backward Compatibility
// =============================================================================

/**
 * @deprecated Use EntityComment instead
 */
export type ClientComment = EntityComment;

/**
 * @deprecated Use EntityComment instead
 */
export type PropertyComment = EntityComment;

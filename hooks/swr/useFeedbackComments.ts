import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

export interface FeedbackComment {
  id: string;
  createdAt: string;
  feedbackId: string;
  authorId: string;
  authorType: "user" | "admin";
  authorName: string | null;
  content: string;
  // Attachment fields (optional)
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentType?: string | null;
}

interface FeedbackCommentsResponse {
  comments: FeedbackComment[];
}

interface UseFeedbackCommentsOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
  /**
   * Polling interval in milliseconds for real-time updates
   * Default: 10000ms (10 seconds)
   * Set to 0 to disable polling
   */
  refreshInterval?: number;
  /**
   * Whether this is for admin context (uses admin API route)
   */
  isAdmin?: boolean;
}

/**
 * Get the API endpoint based on context
 */
function getApiEndpoint(feedbackId: string, isAdmin: boolean): string {
  return isAdmin
    ? `/api/platform-admin/feedback/${feedbackId}/comments`
    : `/api/feedback/${feedbackId}/comments`;
}

/**
 * Hook to fetch comments for a feedback thread
 * Supports real-time polling for live chat experience
 */
export function useFeedbackComments(
  feedbackId: string | undefined,
  options: UseFeedbackCommentsOptions = {}
) {
  const { enabled = true, refreshInterval = 10000, isAdmin = false } = options;

  const key =
    enabled && feedbackId ? getApiEndpoint(feedbackId, isAdmin) : null;

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<FeedbackCommentsResponse>(key, {
      refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
      revalidateOnFocus: false, // Don't refetch on window focus to reduce requests
      dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
    });

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
  email?: string;
}

interface CommentAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface AddCommentArgs {
  content: string;
  attachment?: CommentAttachment;
}

interface UseAddFeedbackCommentOptions {
  /**
   * Current user info for optimistic updates
   * If provided, comment will appear immediately before server confirms
   */
  currentUser?: CurrentUser;
  /**
   * Author type for the comment
   */
  authorType?: "user" | "admin";
  /**
   * Whether this is for admin context (uses admin API route)
   */
  isAdmin?: boolean;
}

/**
 * Hook to add a comment to a feedback thread
 * Supports optimistic updates when currentUser is provided
 */
export function useAddFeedbackComment(
  feedbackId: string,
  options: UseAddFeedbackCommentOptions = {}
) {
  const { currentUser, authorType = "user", isAdmin = false } = options;
  const { mutate: globalMutate } = useSWRConfig();
  const key = getApiEndpoint(feedbackId, isAdmin);

  const { trigger, isMutating, error } = useSWRMutation<
    { comment: FeedbackComment },
    Error,
    string,
    AddCommentArgs
  >(key, async (url, { arg }) => {
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
  });

  // Wrap trigger to provide optimistic update
  const addComment = async (arg: AddCommentArgs) => {
    if (currentUser) {
      // Optimistic update: show comment immediately
      const tempId = `temp-${Date.now()}`;
      const tempComment: FeedbackComment = {
        id: tempId,
        feedbackId,
        content: arg.content,
        createdAt: new Date().toISOString(),
        authorId: currentUser.id,
        authorType: authorType,
        authorName: currentUser.name,
        // Include attachment info if provided
        ...(arg.attachment && {
          attachmentUrl: arg.attachment.url,
          attachmentName: arg.attachment.name,
          attachmentSize: arg.attachment.size,
          attachmentType: arg.attachment.type,
        }),
      };

      globalMutate<FeedbackCommentsResponse>(
        key,
        (currentData) => ({
          comments: [...(currentData?.comments ?? []), tempComment],
        }),
        { revalidate: false }
      );

      try {
        const result = await trigger(arg);
        // Replace temp comment with real one
        globalMutate<FeedbackCommentsResponse>(
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
 * Get the SWR cache key for feedback comments
 * Useful for manual cache invalidation
 */
export function getFeedbackCommentsKey(
  feedbackId: string,
  isAdmin: boolean = false
): string {
  return getApiEndpoint(feedbackId, isAdmin);
}

/**
 * Invalidate feedback comments cache for both user and admin
 * Call this when you need to refresh both caches simultaneously
 */
export function useInvalidateFeedbackComments() {
  const { mutate: globalMutate } = useSWRConfig();

  const invalidate = (feedbackId: string) => {
    // Invalidate both user and admin caches
    globalMutate(getFeedbackCommentsKey(feedbackId, false));
    globalMutate(getFeedbackCommentsKey(feedbackId, true));
  };

  return { invalidate };
}






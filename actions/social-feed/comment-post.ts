"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyPostCommented } from "@/lib/notifications";

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  isOwn: boolean;
}

interface AddCommentResult {
  success: boolean;
  comment?: Comment;
  error?: string;
}

interface DeleteCommentResult {
  success: boolean;
  error?: string;
}

/**
 * Add a comment to a post
 * Best practice: Validate content length, sanitize input
 */
export async function addComment(
  postId: string,
  content: string
): Promise<AddCommentResult> {
  const currentUser = await getCurrentUserSafe();

  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate content
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { success: false, error: "Comment cannot be empty" };
  }

  if (trimmedContent.length > 2000) {
    return { success: false, error: "Comment is too long (max 2000 characters)" };
  }

  try {
    // Check if post exists and get author info
    const post = await prismadb.socialPost.findUnique({
      where: { id: postId },
      select: { 
        id: true,
        authorId: true,
        content: true,
        organizationId: true,
      },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Create comment
    const comment = await prismadb.socialPostComment.create({
      data: {
        postId,
        userId: currentUser.id,
        content: trimmedContent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Send notification to post author
    await notifyPostCommented({
      postId,
      postAuthorId: post.authorId,
      postContent: post.content || undefined,
      actorId: currentUser.id,
      actorName: currentUser.name || currentUser.email || "Someone",
      organizationId: post.organizationId,
      commentContent: trimmedContent,
    });

    // Revalidate the feed
    revalidatePath("/social-feed");

    return {
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.user.id,
          name: comment.user.name || "Unknown",
          avatar: comment.user.avatar || undefined,
        },
        isOwn: true,
      },
    };
  } catch (error) {
    console.error("[ADD_COMMENT_ERROR]", error);
    return { success: false, error: "Failed to add comment" };
  }
}

/**
 * Delete a comment (only author can delete)
 */
export async function deleteComment(commentId: string): Promise<DeleteCommentResult> {
  const currentUser = await getCurrentUserSafe();

  if (!currentUser) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Find the comment and verify ownership
    const comment = await prismadb.socialPostComment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    if (comment.userId !== currentUser.id) {
      return { success: false, error: "You can only delete your own comments" };
    }

    // Delete the comment
    await prismadb.socialPostComment.delete({
      where: { id: commentId },
    });

    // Revalidate the feed
    revalidatePath("/social-feed");

    return { success: true };
  } catch (error) {
    console.error("[DELETE_COMMENT_ERROR]", error);
    return { success: false, error: "Failed to delete comment" };
  }
}

/**
 * Get comments for a post with pagination
 * Best practice: Use cursor-based pagination for better performance
 */
export async function getPostComments(
  postId: string,
  options: {
    limit?: number;
    cursor?: string; // Comment ID to start after
  } = {}
): Promise<{
  comments: Comment[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}> {
  const currentUser = await getCurrentUserSafe();
  const { limit = 10, cursor } = options;

  try {
    const [comments, total] = await Promise.all([
      prismadb.socialPostComment.findMany({
        where: { postId },
        take: limit + 1, // Fetch one extra to check if there's more
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "asc" }, // Oldest first for conversation flow
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prismadb.socialPostComment.count({ where: { postId } }),
    ]);

    const hasMore = comments.length > limit;
    const resultComments = hasMore ? comments.slice(0, limit) : comments;

    return {
      comments: resultComments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.user.id,
          name: c.user.name || "Unknown",
          avatar: c.user.avatar || undefined,
        },
        isOwn: c.userId === currentUser?.id,
      })),
      nextCursor: hasMore ? resultComments[resultComments.length - 1]?.id : undefined,
      hasMore,
      total,
    };
  } catch (error) {
    console.error("[GET_COMMENTS_ERROR]", error);
    return { comments: [], hasMore: false, total: 0 };
  }
}

/**
 * Get comment count for a post
 */
export async function getCommentCount(postId: string): Promise<number> {
  return prismadb.socialPostComment.count({ where: { postId } });
}


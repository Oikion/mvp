"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyPostLiked } from "@/lib/notifications";

interface LikeResult {
  success: boolean;
  liked: boolean;
  likeCount: number;
  error?: string;
}

/**
 * Toggle like on a post
 * Best practice: Use upsert pattern for idempotent operations
 */
export async function toggleLikePost(postId: string): Promise<LikeResult> {
  const currentUser = await getCurrentUserSafe();

  if (!currentUser) {
    return { success: false, liked: false, likeCount: 0, error: "Not authenticated" };
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
      return { success: false, liked: false, likeCount: 0, error: "Post not found" };
    }

    // Check if already liked
    const existingLike = await prismadb.socialPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (existingLike) {
      // Unlike: Delete the like
      await prismadb.socialPostLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      // Like: Create new like
      await prismadb.socialPostLike.create({
        data: {
          postId,
          userId: currentUser.id,
        },
      });

      // Send notification to post author (only on like, not unlike)
      await notifyPostLiked({
        postId,
        postAuthorId: post.authorId,
        postContent: post.content || undefined,
        actorId: currentUser.id,
        actorName: currentUser.name || currentUser.email || "Someone",
        organizationId: post.organizationId,
      });
    }

    // Get updated like count
    const likeCount = await prismadb.socialPostLike.count({
      where: { postId },
    });

    // Revalidate the feed to update cache
    revalidatePath("/social-feed");

    return {
      success: true,
      liked: !existingLike,
      likeCount,
    };
  } catch (error) {
    console.error("[TOGGLE_LIKE_ERROR]", error);
    return { success: false, liked: false, likeCount: 0, error: "Failed to toggle like" };
  }
}

/**
 * Get like status for a post (useful for initial render)
 */
export async function getLikeStatus(postId: string): Promise<{ liked: boolean; count: number }> {
  const currentUser = await getCurrentUserSafe();

  if (!currentUser) {
    const count = await prismadb.socialPostLike.count({ where: { postId } });
    return { liked: false, count };
  }

  const [existingLike, count] = await Promise.all([
    prismadb.socialPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    }),
    prismadb.socialPostLike.count({ where: { postId } }),
  ]);

  return { liked: !!existingLike, count };
}

/**
 * Get users who liked a post (for "liked by" display)
 */
export async function getPostLikers(postId: string, limit: number = 10) {
  const likers = await prismadb.socialPostLike.findMany({
    where: { postId },
    take: limit,
    orderBy: { createdAt: "desc" },
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

  const totalCount = await prismadb.socialPostLike.count({ where: { postId } });

  return {
    users: likers.map((l) => l.user),
    total: totalCount,
    hasMore: totalCount > limit,
  };
}


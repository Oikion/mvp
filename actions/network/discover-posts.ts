"use server";

import { getCurrentUserSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;

export interface DiscoverPostAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
  slug: string;
}

export interface DiscoverPostItem {
  id: string;
  slug: string | null;
  content: string | null;
  postType: string;
  createdAt: string;
  author: DiscoverPostAuthor;
  linkedEntity?: {
    id: string;
    type: string;
    title: string | null;
    subtitle: string | null;
    metadata?: unknown;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export interface DiscoverPostsResult {
  posts: DiscoverPostItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Discover posts from authors with PUBLIC (or SECURE when authenticated) profiles.
 * Cross-organization; sorted by createdAt DESC with cursor pagination.
 */
export async function discoverPosts(options: {
  cursor?: string | null;
  limit?: number;
}): Promise<DiscoverPostsResult> {
  const currentUser = await getCurrentUserSafe();
  const isAuthenticated = !!currentUser;
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;

  const publicAuthorIds = await prismadb.agentProfile.findMany({
    where: {
      visibility: isAuthenticated ? { in: ["PUBLIC", "SECURE"] } : "PUBLIC",
    },
    select: { userId: true },
  });
  const authorIds = new Set(publicAuthorIds.map((p) => p.userId));

  if (authorIds.size === 0) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  const take = limit + 1;

  const postsRaw = await prismadb.socialPost.findMany({
    where: {
      authorId: { in: Array.from(authorIds) },
    },
    take,
    orderBy: { createdAt: "desc" },
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : undefined),
    include: {
      Users: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
        },
      },
      SocialPostLike: { select: { userId: true } },
      SocialPostComment: { select: { id: true } },
    },
  });

  const hasMore = postsRaw.length > limit;
  const list = hasMore ? postsRaw.slice(0, limit) : postsRaw;
  const nextCursor = hasMore && list.length ? list.at(-1)?.id ?? null : null;

  const posts: DiscoverPostItem[] = list.map((post) => ({
    id: post.id,
    slug: post.slug ?? null,
    content: post.content ?? null,
    postType: post.postType,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.Users?.id ?? "",
      name: post.Users?.name ?? null,
      avatar: post.Users?.avatar ?? null,
      username: post.Users?.username ?? null,
      slug: post.Users?.username ?? "",
    },
    linkedEntity:
      post.linkedEntityId && post.linkedEntityType
        ? {
            id: post.linkedEntityId,
            type: post.linkedEntityType,
            title: post.linkedEntityTitle ?? null,
            subtitle: post.linkedEntitySubtitle ?? null,
            metadata: post.linkedEntityMetadata ?? undefined,
          }
        : undefined,
    likesCount: post.SocialPostLike?.length ?? 0,
    commentsCount: post.SocialPostComment?.length ?? 0,
    isLiked: currentUser
      ? (post.SocialPostLike?.some((l) => l.userId === currentUser.id) ?? false)
      : false,
  }));

  return { posts, hasMore, nextCursor };
}

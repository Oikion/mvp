"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";

export interface PostWithAuthor {
  id: string;
  slug: string | null;
  type: "property" | "client" | "text";
  content: string | null;
  timestamp: string;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
    username: string | null;
    visibility: "PERSONAL" | "SECURE" | "PUBLIC";
  };
  linkedEntity?: {
    id: string;
    type: "property" | "client";
    title: string;
    subtitle?: string;
    metadata?: Record<string, any>;
  };
  attachments: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  }[];
  likes: number;
  comments: number;
  isAccessible: boolean;
  requiresAuth: boolean;
}

export interface GetPostResult {
  success: boolean;
  post?: PostWithAuthor;
  error?: string;
}

/**
 * Get a single post by ID or slug
 * Respects author profile visibility settings:
 * - PUBLIC: Anyone can view
 * - SECURE: Only authenticated users can view
 * - PERSONAL: Only connections can view (not shareable publicly)
 */
export async function getPostById(idOrSlug: string): Promise<GetPostResult> {
  const currentUser = await getCurrentUserSafe();
  
  // Try to find post by slug first, then by ID
  const post = await prismadb.socialPost.findFirst({
    where: {
      OR: [
        { slug: idOrSlug },
        { id: idOrSlug },
      ],
    },
    include: {
      Users: {
        select: {
          id: true,
          name: true,
          avatar: true,
          username: true,
          AgentProfile: {
            select: {
              visibility: true,
            },
          },
        },
      },
      SocialPostLike: true,
      SocialPostComment: true,
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          url: true,
        },
      },
    },
  });

  if (!post) {
    return {
      success: false,
      error: "Post not found",
    };
  }

  const authorVisibility = (post.Users.AgentProfile?.visibility || "PERSONAL") as "PERSONAL" | "SECURE" | "PUBLIC";
  
  // Check visibility access
  let isAccessible = false;
  let requiresAuth = false;

  if (authorVisibility === "PUBLIC") {
    // Public posts are accessible to everyone
    isAccessible = true;
  } else if (authorVisibility === "SECURE") {
    // Secure posts require authentication
    requiresAuth = true;
    isAccessible = !!currentUser;
  } else {
    // Personal posts require being a connection
    requiresAuth = true;
    
    if (currentUser) {
      // Check if the current user is connected to the author
      const connection = await prismadb.agentConnection.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { followerId: currentUser.id, followingId: post.authorId },
            { followerId: post.authorId, followingId: currentUser.id },
          ],
        },
      });
      
      isAccessible = !!connection || post.authorId === currentUser.id;
    }
  }

  // Build the response
  const postData: PostWithAuthor = {
    id: post.id,
    slug: post.slug,
    type: post.postType as "property" | "client" | "text",
    content: post.content,
    timestamp: post.createdAt.toISOString(),
    author: {
      id: post.Users.id,
      name: post.Users.name,
      avatar: post.Users.avatar,
      username: post.Users.username,
      visibility: authorVisibility,
    },
    linkedEntity: post.linkedEntityId && post.linkedEntityType ? {
      id: post.linkedEntityId,
      type: post.linkedEntityType as "property" | "client",
      title: post.linkedEntityTitle || "",
      subtitle: post.linkedEntitySubtitle || undefined,
      metadata: post.linkedEntityMetadata as Record<string, any> | undefined,
    } : undefined,
    attachments: post.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      url: a.url,
    })),
    likes: post.SocialPostLike.length,
    comments: post.SocialPostComment.length,
    isAccessible,
    requiresAuth,
  };

  return {
    success: true,
    post: postData,
  };
}

/**
 * Get post metadata for OG tags (public info only)
 */
export async function getPostMetadata(idOrSlug: string) {
  const post = await prismadb.socialPost.findFirst({
    where: {
      OR: [
        { slug: idOrSlug },
        { id: idOrSlug },
      ],
    },
    select: {
      id: true,
      slug: true,
      content: true,
      postType: true,
      linkedEntityTitle: true,
      Users: {
        select: {
          name: true,
          avatar: true,
          username: true,
          AgentProfile: {
            select: {
              visibility: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const visibility = post.Users.AgentProfile?.visibility || "PERSONAL";
  
  // Only return metadata for PUBLIC posts
  if (visibility !== "PUBLIC") {
    return {
      isPrivate: true,
      authorName: post.Users.name,
    };
  }

  return {
    isPrivate: false,
    authorName: post.Users.name,
    authorAvatar: post.Users.avatar,
    authorUsername: post.Users.username,
    content: post.content?.slice(0, 160) || undefined,
    postType: post.postType,
    linkedEntityTitle: post.linkedEntityTitle,
  };
}

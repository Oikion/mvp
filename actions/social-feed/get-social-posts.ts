"use server";

import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export interface SocialPostAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface SocialPost {
  id: string;
  slug?: string | null;
  type: "property" | "client" | "mandate" | "text";
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    organizationName?: string;
    visibility?: "PERSONAL" | "SECURE" | "PUBLIC";
  };
  linkedEntity?: {
    id: string;
    friendlyId: string;
    type: "property" | "client" | "mandate";
    title: string;
    subtitle?: string;
    image?: string;
    metadata?: Record<string, any>;
  };
  attachments: SocialPostAttachment[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  isOwn?: boolean;
  isFromConnection?: boolean;
}

export async function getSocialPosts(limit: number = 50): Promise<SocialPost[]> {
  const currentUser = await getCurrentUserSafe();
  const organizationId = await getCurrentOrgIdSafe();
  
  if (!currentUser || !organizationId) {
    return [];
  }

  try {
    // Get current user's accepted connections
    const acceptedConnections = await prismadb.agentConnection.findMany({
      where: {
        OR: [
          { followerId: currentUser.id, status: "ACCEPTED" },
          { followingId: currentUser.id, status: "ACCEPTED" },
        ],
      },
      select: {
        followerId: true,
        followingId: true,
      },
    });

    // Get list of connected user IDs
    const connectedUserIds = new Set<string>();
    acceptedConnections.forEach((conn) => {
      if (conn.followerId !== currentUser.id) {
        connectedUserIds.add(conn.followerId);
      }
      if (conn.followingId !== currentUser.id) {
        connectedUserIds.add(conn.followingId);
      }
    });

    // Get users with PUBLIC or SECURE profiles (visible to authenticated users)
    // PERSONAL profiles are completely hidden
    const visibleProfiles = await prismadb.agentProfile.findMany({
      where: {
        visibility: {
          in: ["PUBLIC", "SECURE"],
        },
      },
      select: {
        userId: true,
        visibility: true,
      },
    });
    
    const visibleUserIds = new Set(visibleProfiles.map((p) => p.userId));
    const visibilityMap = new Map(visibleProfiles.map((p) => [p.userId, p.visibility]));

    // Fetch social posts from the database
    // SECURITY: Filter by organizationId for tenant isolation
    const posts = await prismadb.socialPost.findMany({
      where: {
        organizationId, // Tenant isolation
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            avatar: true,
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

    // Filter posts based on visibility:
    // 1. Own posts - always visible
    // 2. Posts from PUBLIC/SECURE profiles - visible (user is authenticated)
    // 3. Posts from connections - visible regardless of profile visibility
    // PERSONAL profiles hide all posts from non-connections
    const filteredPosts = posts.filter((post) => {
      // Own posts always visible
      if (post.authorId === currentUser.id) return true;
      
      // Posts from connections are always visible
      if (connectedUserIds.has(post.authorId)) return true;
      
      // Posts from PUBLIC or SECURE profiles (authenticated user can see)
      if (visibleUserIds.has(post.authorId)) return true;
      
      return false;
    });

    // Batch-fetch friendlyIds for linked entities
    const linkedPropertyIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "property")
      .map((p) => p.linkedEntityId!);
    const linkedClientIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "client")
      .map((p) => p.linkedEntityId!);
    const linkedMandateIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "mandate")
      .map((p) => p.linkedEntityId!);

    const friendlyIdMap = new Map<string, string>();

    const [linkedProps, linkedClients, linkedMandates] = await Promise.all([
      linkedPropertyIds.length > 0
        ? prismadb.properties.findMany({ where: { id: { in: linkedPropertyIds } }, select: { id: true, friendlyId: true } })
        : [],
      linkedClientIds.length > 0
        ? prismadb.clients.findMany({ where: { id: { in: linkedClientIds } }, select: { id: true, friendlyId: true } })
        : [],
      linkedMandateIds.length > 0
        ? prismadb.mandate.findMany({ where: { id: { in: linkedMandateIds } }, select: { id: true, friendlyId: true } })
        : [],
    ]);

    for (const e of [...linkedProps, ...linkedClients, ...linkedMandates]) {
      friendlyIdMap.set(e.id, e.friendlyId);
    }

    return filteredPosts.map((post) => ({
      id: post.id,
      slug: post.slug,
      type: post.postType as "property" | "client" | "mandate" | "text",
      content: post.content || "",
      timestamp: post.createdAt.toISOString(),
      author: {
        id: post.Users?.id || "",
        name: post.Users?.name || "Unknown",
        avatar: post.Users?.avatar || undefined,
        organizationName: undefined,
        visibility: (post.Users?.AgentProfile?.visibility as "PERSONAL" | "SECURE" | "PUBLIC") || "PERSONAL",
      },
      linkedEntity: post.linkedEntityId && post.linkedEntityType ? {
        id: post.linkedEntityId,
        friendlyId: friendlyIdMap.get(post.linkedEntityId) || post.linkedEntityId,
        type: post.linkedEntityType as "property" | "client" | "mandate",
        title: post.linkedEntityTitle || "Untitled",
        subtitle: post.linkedEntitySubtitle || undefined,
        metadata: post.linkedEntityMetadata as Record<string, any> || undefined,
      } : undefined,
      attachments: post.attachments?.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileSize: att.fileSize,
        fileType: att.fileType,
        url: att.url,
      })) || [],
      likes: post.SocialPostLike?.length || 0,
      comments: post.SocialPostComment?.length || 0,
      isLiked: post.SocialPostLike?.some((like) => like.userId === currentUser.id) || false,
      isOwn: post.authorId === currentUser.id,
      isFromConnection: connectedUserIds.has(post.authorId),
    }));
  } catch (error) {
    console.error("Error fetching social posts:", error);
    return [];
  }
}

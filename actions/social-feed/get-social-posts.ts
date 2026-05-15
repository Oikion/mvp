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
  type: "property" | "contact" | "request" | "document" | "text";
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    username?: string | null;
    organizationName?: string;
    organizationId?: string;
    visibility?: "PRIVATE" | "SECURE" | "PUBLIC";
  };
  linkedEntity?: {
    id: string;
    friendlyId: string;
    type: "property" | "contact" | "request" | "document";
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

    // Build the full set of author IDs whose posts this user may see:
    //   1. Own posts — always visible
    //   2. Posts from ACCEPTED connections (cross-org included)
    //   3. Posts from agents with PUBLIC or SECURE profiles
    // SECURITY: Posts are public content within the Polis network. The author-ID
    // allowlist is the security gate — not an org boundary.
    const authorIdsToShow = new Set<string>([
      currentUser.id,
      ...Array.from(connectedUserIds),
      ...Array.from(visibleUserIds),
    ]);

    const filteredPosts = await prismadb.socialPost.findMany({
      where: {
        authorId: { in: Array.from(authorIdsToShow) },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
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

    // Batch-fetch friendlyIds for linked entities
    const linkedPropertyIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "property")
      .map((p) => p.linkedEntityId!);
    const linkedContactIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "contact")
      .map((p) => p.linkedEntityId!);
    const linkedRequestIds = filteredPosts
      .filter((p) => p.linkedEntityId && p.linkedEntityType === "request")
      .map((p) => p.linkedEntityId!);

    const friendlyIdMap = new Map<string, string>();

    const [linkedProps, linkedContacts, linkedRequests] = await Promise.all([
      linkedPropertyIds.length > 0
        ? prismadb.properties.findMany({ where: { organizationId, id: { in: linkedPropertyIds } }, select: { id: true, friendlyId: true } })
        : [],
      linkedContactIds.length > 0
        ? prismadb.contact.findMany({ where: { organizationId, id: { in: linkedContactIds } }, select: { id: true, friendlyId: true } })
        : [],
      linkedRequestIds.length > 0
        ? prismadb.request.findMany({ where: { organizationId, id: { in: linkedRequestIds } }, select: { id: true, friendlyId: true } })
        : [],
    ]);

    for (const e of [...linkedProps, ...linkedContacts, ...linkedRequests]) {
      if (e.friendlyId) friendlyIdMap.set(e.id, e.friendlyId);
    }

    return filteredPosts.map((post) => ({
      id: post.id,
      slug: post.slug,
      type: post.postType as "property" | "contact" | "request" | "document" | "text",
      content: post.content || "",
      timestamp: post.createdAt.toISOString(),
      author: {
        id: post.Users?.id || "",
        name: post.Users?.name || "Unknown",
        avatar: post.Users?.avatar || undefined,
        username: post.Users?.username || null,
        organizationName: undefined,
        organizationId: post.organizationId,
        visibility: (post.Users?.AgentProfile?.visibility as "PRIVATE" | "SECURE" | "PUBLIC") || "PRIVATE",
      },
      linkedEntity: post.linkedEntityId && post.linkedEntityType ? {
        id: post.linkedEntityId,
        friendlyId: friendlyIdMap.get(post.linkedEntityId) || post.linkedEntityId,
        type: post.linkedEntityType as "property" | "contact" | "request" | "document",
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
      isFromConnection: post.authorId ? connectedUserIds.has(post.authorId) : false,
    }));
  } catch (error) {
    console.error("Error fetching social posts:", error);
    return [];
  }
}

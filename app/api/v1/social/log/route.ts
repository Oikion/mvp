import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

/**
 * GET /api/v1/social/log
 * List social media post logs
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["platform", "status"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.platform) {
      where.platform = filters.platform.toUpperCase();
    }

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const posts = await prismadb.socialPostLog.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Get platform stats
    const platformStats = await prismadb.socialPostLog.groupBy({
      by: ["platform"],
      where: { organizationId: context.organizationId },
      _count: { id: true },
    });

    const statusStats = await prismadb.socialPostLog.groupBy({
      by: ["status"],
      where: { organizationId: context.organizationId },
      _count: { id: true },
    });

    return createApiSuccessResponse(
      {
        posts: items.map((post) => ({
          id: post.id,
          platform: post.platform,
          platformPostId: post.platformPostId,
          platformPostUrl: post.platformPostUrl,
          content: post.content,
          mediaUrls: post.mediaUrls,
          status: post.status,
          errorMessage: post.errorMessage,
          engagement: {
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            impressions: post.impressions,
            reach: post.reach,
            engagementRate: post.engagementRate?.toNumber(),
          },
          scheduledAt: post.scheduledAt?.toISOString(),
          postedAt: post.postedAt?.toISOString(),
          lastSyncedAt: post.lastSyncedAt?.toISOString(),
          createdAt: post.createdAt.toISOString(),
          createdVia: post.createdVia,
          n8nWorkflowId: post.n8nWorkflowId,
          n8nExecutionId: post.n8nExecutionId,
        })),
        stats: {
          byPlatform: platformStats.reduce((acc, stat) => {
            acc[stat.platform] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          byStatus: statusStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
        },
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.SOCIAL_READ] }
);

/**
 * POST /api/v1/social/log
 * Log a social media post (typically called by n8n after posting)
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const {
      platform,
      platformPostId,
      platformPostUrl,
      content,
      mediaUrls,
      status,
      errorMessage,
      scheduledAt,
      postedAt,
      n8nWorkflowId,
      n8nExecutionId,
    } = body;

    // Validate required fields
    if (!platform) {
      return createApiErrorResponse("Missing required field: platform", 400);
    }

    const validPlatforms = ["LINKEDIN", "INSTAGRAM", "TIKTOK", "TWITTER", "FACEBOOK", "YOUTUBE"];
    const normalizedPlatform = platform.toUpperCase();
    
    if (!validPlatforms.includes(normalizedPlatform)) {
      return createApiErrorResponse(
        `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`,
        400
      );
    }

    const validStatuses = ["PENDING", "SCHEDULED", "POSTING", "POSTED", "FAILED", "DELETED"];
    const normalizedStatus = (status || "POSTED").toUpperCase();
    
    if (!validStatuses.includes(normalizedStatus)) {
      return createApiErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const post = await prismadb.socialPostLog.create({
      data: {
        organizationId: context.organizationId,
        platform: normalizedPlatform as "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "TWITTER" | "FACEBOOK" | "YOUTUBE",
        platformPostId: platformPostId || null,
        platformPostUrl: platformPostUrl || null,
        content: content || null,
        mediaUrls: mediaUrls || [],
        status: normalizedStatus as "PENDING" | "SCHEDULED" | "POSTING" | "POSTED" | "FAILED" | "DELETED",
        errorMessage: errorMessage || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        postedAt: postedAt ? new Date(postedAt) : (normalizedStatus === "POSTED" ? new Date() : null),
        createdVia: "n8n",
        n8nWorkflowId: n8nWorkflowId || null,
        n8nExecutionId: n8nExecutionId || null,
      },
    });

    return createApiSuccessResponse(
      {
        post: {
          id: post.id,
          platform: post.platform,
          status: post.status,
          platformPostUrl: post.platformPostUrl,
          postedAt: post.postedAt?.toISOString(),
          createdAt: post.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.SOCIAL_WRITE] }
);

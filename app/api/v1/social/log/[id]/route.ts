import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/social/log/[id]
 * Get a single social post log entry
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext, routeParams?: RouteParams) => {
    const { id } = await routeParams!.params;

    const post = await prismadb.socialPostLog.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!post) {
      return createApiErrorResponse("Social post log not found", 404);
    }

    return createApiSuccessResponse({
      post: {
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
        updatedAt: post.updatedAt.toISOString(),
        createdVia: post.createdVia,
        n8nWorkflowId: post.n8nWorkflowId,
        n8nExecutionId: post.n8nExecutionId,
      },
    });
  },
  { requiredScopes: [API_SCOPES.SOCIAL_READ] }
);

/**
 * PUT /api/v1/social/log/[id]
 * Update a social post log entry (e.g., sync engagement metrics)
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext, routeParams?: RouteParams) => {
    const { id } = await routeParams!.params;
    const body = await req.json();

    // Check if post exists
    const existingPost = await prismadb.socialPostLog.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!existingPost) {
      return createApiErrorResponse("Social post log not found", 404);
    }

    const {
      platformPostId,
      platformPostUrl,
      status,
      errorMessage,
      likes,
      comments,
      shares,
      impressions,
      reach,
      engagementRate,
      postedAt,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      lastSyncedAt: new Date(),
    };

    if (platformPostId !== undefined) updateData.platformPostId = platformPostId;
    if (platformPostUrl !== undefined) updateData.platformPostUrl = platformPostUrl;
    if (status !== undefined) updateData.status = status.toUpperCase();
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (likes !== undefined) updateData.likes = likes;
    if (comments !== undefined) updateData.comments = comments;
    if (shares !== undefined) updateData.shares = shares;
    if (impressions !== undefined) updateData.impressions = impressions;
    if (reach !== undefined) updateData.reach = reach;
    if (engagementRate !== undefined) updateData.engagementRate = engagementRate;
    if (postedAt !== undefined) updateData.postedAt = new Date(postedAt);

    const post = await prismadb.socialPostLog.update({
      where: { id },
      data: updateData,
    });

    return createApiSuccessResponse({
      post: {
        id: post.id,
        platform: post.platform,
        status: post.status,
        engagement: {
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          impressions: post.impressions,
          reach: post.reach,
        },
        lastSyncedAt: post.lastSyncedAt?.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.SOCIAL_WRITE] }
);

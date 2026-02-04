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
 * GET /api/v1/newsletter/campaigns
 * List newsletter campaigns
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["status", "tag"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    const campaigns = await prismadb.newsletterCampaign.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
    });

    const hasMore = campaigns.length > limit;
    const items = hasMore ? campaigns.slice(0, -1) : campaigns;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        campaigns: items.map((campaign) => ({
          id: campaign.id,
          subject: campaign.subject,
          previewText: campaign.previewText,
          status: campaign.status,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          stats: {
            recipients: campaign.recipientCount,
            sent: campaign.sentCount,
            opens: campaign.openCount,
            clicks: campaign.clickCount,
            bounces: campaign.bounceCount,
            unsubscribes: campaign.unsubscribeCount,
            openRate: campaign.sentCount > 0 
              ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(2) 
              : "0.00",
            clickRate: campaign.sentCount > 0 
              ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(2) 
              : "0.00",
          },
          tags: campaign.tags,
          scheduledAt: campaign.scheduledAt?.toISOString(),
          sentAt: campaign.sentAt?.toISOString(),
          completedAt: campaign.completedAt?.toISOString(),
          createdAt: campaign.createdAt.toISOString(),
          createdVia: campaign.createdVia,
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.NEWSLETTER_READ] }
);

/**
 * POST /api/v1/newsletter/campaigns
 * Create a new campaign (draft)
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const {
      subject,
      previewText,
      content,
      fromName,
      fromEmail,
      replyTo,
      tags,
      scheduledAt,
      n8nWorkflowId,
    } = body;

    // Validate required fields
    if (!subject) {
      return createApiErrorResponse("Missing required field: subject", 400);
    }

    if (!content) {
      return createApiErrorResponse("Missing required field: content", 400);
    }

    // Get default from email from env if not provided
    const defaultFromEmail = process.env.EMAIL_FROM || "newsletter@example.com";

    const campaign = await prismadb.newsletterCampaign.create({
      data: {
        organizationId: context.organizationId,
        subject,
        previewText: previewText || null,
        content,
        fromName: fromName || null,
        fromEmail: fromEmail || defaultFromEmail,
        replyTo: replyTo || null,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        tags: tags || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdVia: "n8n",
        n8nWorkflowId: n8nWorkflowId || null,
      },
    });

    return createApiSuccessResponse(
      {
        campaign: {
          id: campaign.id,
          subject: campaign.subject,
          status: campaign.status,
          scheduledAt: campaign.scheduledAt?.toISOString(),
          createdAt: campaign.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.NEWSLETTER_WRITE] }
);

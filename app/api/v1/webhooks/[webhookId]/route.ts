import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import {
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookDeliveries,
  regenerateWebhookSecret,
  ALL_WEBHOOK_EVENTS,
  WebhookEvent,
} from "@/lib/webhooks";

/**
 * GET /api/v1/webhooks/[webhookId]
 * Get a single webhook endpoint with delivery history
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const webhookId = url.pathname.split("/").pop();
    const { cursor, limit } = parsePaginationParams(req);

    if (!webhookId) {
      return createApiErrorResponse("Webhook ID is required", 400);
    }

    // Get webhook endpoint
    const endpoint = await prismadb.webhookEndpoint.findFirst({
      where: {
        id: webhookId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!endpoint) {
      return createApiErrorResponse("Webhook not found", 404);
    }

    // Get delivery history
    const { deliveries, hasMore, nextCursor } = await getWebhookDeliveries(
      webhookId,
      context.organizationId,
      { cursor, limit }
    );

    return createApiSuccessResponse({
      webhook: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        createdBy: endpoint.createdBy,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
      },
      deliveries: deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        statusCode: d.statusCode,
        attempts: d.attempts,
        deliveredAt: d.deliveredAt?.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
      deliveryPagination: {
        nextCursor,
        hasMore,
        limit,
      },
    });
  },
  { requiredScopes: [API_SCOPES.WEBHOOKS_MANAGE] }
);

/**
 * PUT /api/v1/webhooks/[webhookId]
 * Update a webhook endpoint
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const webhookId = url.pathname.split("/").pop();

    if (!webhookId) {
      return createApiErrorResponse("Webhook ID is required", 400);
    }

    const body = await req.json();
    const { name, url: webhookUrl, events, isActive, regenerateSecret } = body;

    // Build update data
    const updates: {
      name?: string;
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
    } = {};

    if (name !== undefined) updates.name = name;
    
    if (webhookUrl !== undefined) {
      // Validate URL format
      try {
        new URL(webhookUrl);
      } catch {
        return createApiErrorResponse("Invalid URL format", 400);
      }

      // Validate HTTPS for production
      if (process.env.NODE_ENV === "production" && !webhookUrl.startsWith("https://")) {
        return createApiErrorResponse("Webhook URL must use HTTPS in production", 400);
      }
      updates.url = webhookUrl;
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return createApiErrorResponse("Events must be a non-empty array", 400);
      }

      const invalidEvents = events.filter(
        (event: string) => !ALL_WEBHOOK_EVENTS.includes(event as WebhookEvent)
      );
      if (invalidEvents.length > 0) {
        return createApiErrorResponse(
          `Invalid events: ${invalidEvents.join(", ")}`,
          400
        );
      }
      updates.events = events as WebhookEvent[];
    }

    if (isActive !== undefined) updates.isActive = isActive;

    // Update webhook
    const updated = await updateWebhookEndpoint(webhookId, context.organizationId, updates);

    if (!updated) {
      return createApiErrorResponse("Webhook not found", 404);
    }

    // Handle secret regeneration
    let newSecret: string | null = null;
    if (regenerateSecret) {
      newSecret = await regenerateWebhookSecret(webhookId, context.organizationId);
    }

    // Get updated webhook
    const endpoint = await prismadb.webhookEndpoint.findFirst({
      where: {
        id: webhookId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return createApiSuccessResponse({
      webhook: {
        id: endpoint?.id,
        name: endpoint?.name,
        url: endpoint?.url,
        events: endpoint?.events,
        isActive: endpoint?.isActive,
        updatedAt: endpoint?.updatedAt.toISOString(),
      },
      ...(newSecret && {
        newSecret,
        message: "Secret regenerated. Save the new secret - it will not be shown again.",
      }),
    });
  },
  { requiredScopes: [API_SCOPES.WEBHOOKS_MANAGE] }
);

/**
 * DELETE /api/v1/webhooks/[webhookId]
 * Delete a webhook endpoint
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const webhookId = url.pathname.split("/").pop();

    if (!webhookId) {
      return createApiErrorResponse("Webhook ID is required", 400);
    }

    const deleted = await deleteWebhookEndpoint(webhookId, context.organizationId);

    if (!deleted) {
      return createApiErrorResponse("Webhook not found", 404);
    }

    return createApiSuccessResponse({
      message: "Webhook deleted successfully",
      webhookId,
    });
  },
  { requiredScopes: [API_SCOPES.WEBHOOKS_MANAGE] }
);

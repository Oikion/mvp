import { NextRequest } from "next/server";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  ALL_WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WebhookEvent,
} from "@/lib/webhooks";

/**
 * GET /api/v1/webhooks
 * List webhook endpoints for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const endpoints = await listWebhookEndpoints(context.organizationId);

    return createApiSuccessResponse({
      endpoints: endpoints.map((endpoint) => ({
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        deliveryCount: endpoint._count.WebhookDelivery,
        createdBy: endpoint.createdBy,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
      })),
      availableEvents: ALL_WEBHOOK_EVENTS.map((event) => ({
        event,
        description: WEBHOOK_EVENT_DESCRIPTIONS[event],
      })),
    });
  },
  { requiredScopes: [API_SCOPES.WEBHOOKS_MANAGE] }
);

/**
 * POST /api/v1/webhooks
 * Create a new webhook endpoint
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const { name, url, events } = body;

    // Validate required fields
    if (!name) {
      return createApiErrorResponse("Missing required field: name", 400);
    }

    if (!url) {
      return createApiErrorResponse("Missing required field: url", 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return createApiErrorResponse("Invalid URL format", 400);
    }

    // Validate HTTPS for production
    if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
      return createApiErrorResponse("Webhook URL must use HTTPS in production", 400);
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return createApiErrorResponse(
        "Missing required field: events (must be a non-empty array)",
        400
      );
    }

    // Validate events
    const invalidEvents = events.filter(
      (event: string) => !ALL_WEBHOOK_EVENTS.includes(event as WebhookEvent)
    );
    if (invalidEvents.length > 0) {
      return createApiErrorResponse(
        `Invalid events: ${invalidEvents.join(", ")}. Valid events are: ${ALL_WEBHOOK_EVENTS.join(", ")}`,
        400
      );
    }

    // Create webhook endpoint
    const { id, secret } = await createWebhookEndpoint({
      organizationId: context.organizationId,
      url,
      name,
      events: events as WebhookEvent[],
      createdById: context.createdById,
    });

    return createApiSuccessResponse(
      {
        webhook: {
          id,
          name,
          url,
          events,
          isActive: true,
        },
        // Only show secret once at creation time
        secret,
        message:
          "Webhook created successfully. Save the secret - it will not be shown again.",
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.WEBHOOKS_MANAGE] }
);

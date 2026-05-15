import { NextRequest } from "next/server";
import { z } from "zod";
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
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DESCRIPTIONS,
  WebhookEvent,
} from "@/lib/webhooks";

const createWebhookApiSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  url: z.string().url("url must be a valid URL"),
  events: z.array(z.nativeEnum(WEBHOOK_EVENTS)).min(1, "events must be a non-empty array"),
}).strict();

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
    let body: unknown;
    try { body = await req.json(); } catch {
      return createApiErrorResponse("Invalid request body: must be valid JSON", 400);
    }

    const parsed = createWebhookApiSchema.safeParse(body);
    if (!parsed.success) {
      const details = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
        .join("; ");
      return createApiErrorResponse(`Validation failed: ${details}`, 400);
    }

    const { name, url, events } = parsed.data;

    // Validate HTTPS for production
    if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
      return createApiErrorResponse("Webhook URL must use HTTPS in production", 400);
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

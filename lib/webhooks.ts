import { createHmac, randomBytes } from "crypto";
import { prismadb } from "@/lib/prisma";

// Webhook event types
export const WEBHOOK_EVENTS = {
  // Client events
  CLIENT_CREATED: "client.created",
  CLIENT_UPDATED: "client.updated",
  CLIENT_DELETED: "client.deleted",
  // Property events
  PROPERTY_CREATED: "property.created",
  PROPERTY_UPDATED: "property.updated",
  PROPERTY_DELETED: "property.deleted",
  // Task events
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_COMPLETED: "task.completed",
  TASK_DELETED: "task.deleted",
  // Calendar events
  CALENDAR_EVENT_CREATED: "calendar.event.created",
  CALENDAR_EVENT_UPDATED: "calendar.event.updated",
  CALENDAR_EVENT_CANCELLED: "calendar.event.cancelled",
  // Document events
  DOCUMENT_UPLOADED: "document.uploaded",
  DOCUMENT_SHARED: "document.shared",
  DOCUMENT_DELETED: "document.deleted",
  // Deal events
  DEAL_CREATED: "deal.created",
  DEAL_UPDATED: "deal.updated",
  DEAL_COMPLETED: "deal.completed",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

// All available events as array
export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = Object.values(WEBHOOK_EVENTS);

// Event descriptions for UI
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  "client.created": "Triggered when a new client is created",
  "client.updated": "Triggered when a client is updated",
  "client.deleted": "Triggered when a client is deleted",
  "property.created": "Triggered when a new property is created",
  "property.updated": "Triggered when a property is updated",
  "property.deleted": "Triggered when a property is deleted",
  "task.created": "Triggered when a new task is created",
  "task.updated": "Triggered when a task is updated",
  "task.completed": "Triggered when a task is marked as completed",
  "task.deleted": "Triggered when a task is deleted",
  "calendar.event.created": "Triggered when a calendar event is created",
  "calendar.event.updated": "Triggered when a calendar event is updated",
  "calendar.event.cancelled": "Triggered when a calendar event is cancelled",
  "document.uploaded": "Triggered when a document is uploaded",
  "document.shared": "Triggered when a document is shared",
  "document.deleted": "Triggered when a document is deleted",
  "deal.created": "Triggered when a new deal is created",
  "deal.updated": "Triggered when a deal is updated",
  "deal.completed": "Triggered when a deal is completed",
};

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

/**
 * Create HMAC-SHA256 signature for webhook payload
 */
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}

/**
 * Verify webhook signature (for incoming webhooks)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300 // 5 minutes
): boolean {
  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Verify signature
  const expectedSignature = signWebhookPayload(payload, secret, timestamp);
  return signature === expectedSignature;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  organizationId: string;
  data: T;
}

/**
 * Create a webhook endpoint
 */
export async function createWebhookEndpoint(params: {
  organizationId: string;
  url: string;
  name: string;
  events: WebhookEvent[];
  createdById: string;
}): Promise<{ id: string; secret: string }> {
  const secret = generateWebhookSecret();

  const endpoint = await prismadb.webhookEndpoint.create({
    data: {
      organizationId: params.organizationId,
      url: params.url,
      name: params.name,
      events: params.events,
      secret,
      createdById: params.createdById,
    },
  });

  return { id: endpoint.id, secret };
}

/**
 * Update a webhook endpoint
 */
export async function updateWebhookEndpoint(
  id: string,
  organizationId: string,
  updates: {
    url?: string;
    name?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }
): Promise<boolean> {
  const result = await prismadb.webhookEndpoint.updateMany({
    where: { id, organizationId },
    data: updates,
  });

  return result.count > 0;
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhookEndpoint(
  id: string,
  organizationId: string
): Promise<boolean> {
  const result = await prismadb.webhookEndpoint.deleteMany({
    where: { id, organizationId },
  });

  return result.count > 0;
}

/**
 * List webhook endpoints for an organization
 */
export async function listWebhookEndpoints(organizationId: string) {
  return prismadb.webhookEndpoint.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          WebhookDelivery: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get webhook endpoint with secret (for regeneration)
 */
export async function getWebhookEndpointSecret(
  id: string,
  organizationId: string
): Promise<string | null> {
  const endpoint = await prismadb.webhookEndpoint.findFirst({
    where: { id, organizationId },
    select: { secret: true },
  });

  return endpoint?.secret || null;
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  id: string,
  organizationId: string
): Promise<string | null> {
  const newSecret = generateWebhookSecret();

  const result = await prismadb.webhookEndpoint.updateMany({
    where: { id, organizationId },
    data: { secret: newSecret },
  });

  return result.count > 0 ? newSecret : null;
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 */
export async function dispatchWebhook<T>(
  organizationId: string,
  event: WebhookEvent,
  data: T
): Promise<void> {
  // Find all active endpoints subscribed to this event
  const endpoints = await prismadb.webhookEndpoint.findMany({
    where: {
      organizationId,
      isActive: true,
      events: {
        has: event,
      },
    },
  });

  if (endpoints.length === 0) {
    return;
  }

  // Create payload
  const payload: WebhookPayload<T> = {
    id: crypto.randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    organizationId,
    data,
  };

  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  // Dispatch to each endpoint (in parallel)
  await Promise.allSettled(
    endpoints.map((endpoint) =>
      deliverWebhook(endpoint.id, endpoint.url, endpoint.secret, payloadString, timestamp, event)
    )
  );
}

/**
 * Deliver a webhook to a specific endpoint
 */
async function deliverWebhook(
  endpointId: string,
  url: string,
  secret: string,
  payloadString: string,
  timestamp: number,
  event: WebhookEvent,
  attempt: number = 1
): Promise<void> {
  const maxAttempts = 3;
  const signature = signWebhookPayload(payloadString, secret, timestamp);

  // Create delivery record
  const delivery = await prismadb.webhookDelivery.create({
    data: {
      endpointId,
      event,
      payload: JSON.parse(payloadString),
      attempts: attempt,
    },
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp.toString(),
        "X-Webhook-Event": event,
        "X-Webhook-Delivery-Id": delivery.id,
        "User-Agent": "Oikion-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Update delivery record
    const responseBody = await response.text().catch(() => "");
    
    await prismadb.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        statusCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit response body size
        deliveredAt: response.ok ? new Date() : null,
        attempts: attempt,
      },
    });

    // If failed and we have retries left, schedule retry
    if (!response.ok && attempt < maxAttempts) {
      // Exponential backoff: 1s, 4s, 9s
      const delay = attempt * attempt * 1000;
      setTimeout(() => {
        deliverWebhook(endpointId, url, secret, payloadString, timestamp, event, attempt + 1)
          .catch(console.error);
      }, delay);
    }
  } catch (error) {
    // Update delivery record with error
    await prismadb.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        statusCode: 0,
        responseBody: error instanceof Error ? error.message : "Unknown error",
        attempts: attempt,
      },
    });

    // Retry if we have attempts left
    if (attempt < maxAttempts) {
      const delay = attempt * attempt * 1000;
      setTimeout(() => {
        deliverWebhook(endpointId, url, secret, payloadString, timestamp, event, attempt + 1)
          .catch(console.error);
      }, delay);
    }
  }
}

/**
 * Get webhook delivery history for an endpoint
 */
export async function getWebhookDeliveries(
  endpointId: string,
  organizationId: string,
  options?: {
    limit?: number;
    cursor?: string;
  }
) {
  // Verify endpoint belongs to organization
  const endpoint = await prismadb.webhookEndpoint.findFirst({
    where: { id: endpointId, organizationId },
    select: { id: true },
  });

  if (!endpoint) {
    return { deliveries: [], hasMore: false };
  }

  const limit = options?.limit || 50;

  const deliveries = await prismadb.webhookDelivery.findMany({
    where: { endpointId },
    take: limit + 1,
    cursor: options?.cursor ? { id: options.cursor } : undefined,
    skip: options?.cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      event: true,
      statusCode: true,
      attempts: true,
      deliveredAt: true,
      createdAt: true,
    },
  });

  const hasMore = deliveries.length > limit;
  const items = hasMore ? deliveries.slice(0, -1) : deliveries;

  return {
    deliveries: items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  };
}

/**
 * Get webhook delivery details
 */
export async function getWebhookDeliveryDetails(
  deliveryId: string,
  organizationId: string
) {
  const delivery = await prismadb.webhookDelivery.findFirst({
    where: {
      id: deliveryId,
      WebhookEndpoint: {
        organizationId,
      },
    },
    include: {
      WebhookEndpoint: {
        select: {
          name: true,
          url: true,
        },
      },
    },
  });

  return delivery;
}

/**
 * Clean up old webhook deliveries (older than 30 days)
 */
export async function cleanupOldDeliveries(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prismadb.webhookDelivery.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  return result.count;
}

// ============================================
// Helper functions for dispatching webhooks
// ============================================

/**
 * Dispatch client webhook
 */
export async function dispatchClientWebhook(
  organizationId: string,
  event: "client.created" | "client.updated" | "client.deleted",
  client: {
    id: string;
    client_name: string;
    primary_email?: string | null;
    client_status?: string | null;
    client_type?: string | null;
    assigned_to?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    client: {
      id: client.id,
      name: client.client_name,
      email: client.primary_email,
      status: client.client_status,
      type: client.client_type,
      assignedTo: client.assigned_to,
    },
  });
}

/**
 * Dispatch property webhook
 */
export async function dispatchPropertyWebhook(
  organizationId: string,
  event: "property.created" | "property.updated" | "property.deleted",
  property: {
    id: string;
    property_name: string;
    property_status?: string | null;
    property_type?: string | null;
    price?: number | null;
    assigned_to?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    property: {
      id: property.id,
      name: property.property_name,
      status: property.property_status,
      type: property.property_type,
      price: property.price,
      assignedTo: property.assigned_to,
    },
  });
}

/**
 * Dispatch task webhook
 */
export async function dispatchTaskWebhook(
  organizationId: string,
  event: "task.created" | "task.updated" | "task.completed" | "task.deleted",
  task: {
    id: string;
    title: string;
    priority: string;
    dueDateAt?: Date | null;
    user?: string | null;
    account?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    task: {
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDateAt?.toISOString(),
      assignedTo: task.user,
      clientId: task.account,
    },
  });
}

/**
 * Dispatch calendar event webhook
 */
export async function dispatchCalendarWebhook(
  organizationId: string,
  event: "calendar.event.created" | "calendar.event.updated" | "calendar.event.cancelled",
  calendarEvent: {
    id: string;
    title?: string | null;
    startTime: Date;
    endTime: Date;
    location?: string | null;
    assignedUserId?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    event: {
      id: calendarEvent.id,
      title: calendarEvent.title,
      startTime: calendarEvent.startTime.toISOString(),
      endTime: calendarEvent.endTime.toISOString(),
      location: calendarEvent.location,
      assignedTo: calendarEvent.assignedUserId,
    },
  });
}

/**
 * Dispatch document webhook
 */
export async function dispatchDocumentWebhook(
  organizationId: string,
  event: "document.uploaded" | "document.shared" | "document.deleted",
  document: {
    id: string;
    document_name: string;
    document_type?: string | null;
    document_file_mimeType: string;
    created_by_user?: string | null;
  }
): Promise<void> {
  await dispatchWebhook(organizationId, event, {
    document: {
      id: document.id,
      name: document.document_name,
      type: document.document_type,
      mimeType: document.document_file_mimeType,
      createdBy: document.created_by_user,
    },
  });
}

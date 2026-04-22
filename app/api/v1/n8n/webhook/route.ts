import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prismadb } from "@/lib/prisma";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

/**
 * Verify n8n webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Strip optional "sha256=" prefix before comparing
  const normalizedSignature = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  // Use timing-safe comparison to prevent timing oracle attacks
  const sigBuffer = Buffer.from(normalizedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * POST /api/v1/n8n/webhook
 * Receive webhooks from n8n workflows
 * 
 * This endpoint handles various callback events from n8n workflows:
 * - workflow.completed: When a workflow finishes execution
 * - workflow.error: When a workflow encounters an error
 * - content.created: When content (blog/social/newsletter) is created
 * - content.published: When content is published
 * - metrics.sync: Request to sync engagement metrics
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: strict tier (10 req/min) based on IP
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await rateLimit(identifier, "strict");
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests", message: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          },
        }
      );
    }

    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    
    // SECURITY: Always require webhook secret to be configured
    // This prevents unauthorized requests when secret is not set
    if (!webhookSecret) {
      console.error("[N8N_WEBHOOK] Missing N8N_WEBHOOK_SECRET environment variable");
      return NextResponse.json(
        { error: "Webhook not configured", message: "N8N_WEBHOOK_SECRET must be set" },
        { status: 503 }
      );
    }
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verify signature - always required now that secret must be configured
    const signature = req.headers.get("x-n8n-signature") || 
                     req.headers.get("x-webhook-signature") ||
                     req.headers.get("x-signature");
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 }
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // SECURITY TODO: This endpoint uses a global HMAC secret that doesn't bind to a specific org.
    // organizationId from the body is trusted but unverified against the token.
    // Required fix: migrate to per-org webhook secrets stored in DB, looked up by token/org pair.
    // Tracking: pre-launch-audit-2026-04-22 finding H-04
    const {
      event,
      organizationId,
      workflowId,
      executionId,
      data,
      timestamp,
    } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Missing required field: event" },
        { status: 400 }
      );
    }

    // Verify the organizationId from the body actually exists to prevent
    // cross-org data injection with a valid global HMAC token.
    if (organizationId) {
      const orgSettings = await prismadb.organizationSettings.findUnique({
        where: { organizationId },
        select: { id: true },
      });
      if (!orgSettings) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
    }

    // Process the webhook based on event type
    switch (event) {
      case "workflow.completed":
        await handleWorkflowCompleted(organizationId, workflowId, executionId, data);
        break;

      case "workflow.error":
        await handleWorkflowError(organizationId, workflowId, executionId, data);
        break;

      case "content.created":
        await handleContentCreated(organizationId, data);
        break;

      case "content.published":
        await handleContentPublished(organizationId, data);
        break;

      case "metrics.sync":
        await handleMetricsSync(organizationId, data);
        break;

      case "health.check":
        // Simple health check response
        return NextResponse.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          received: { event, timestamp },
        });

      default:
        console.log(`[N8N_WEBHOOK] Unknown event type: ${event}`, body);
    }

    return NextResponse.json({
      success: true,
      event,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[N8N_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle workflow completion event
 */
async function handleWorkflowCompleted(
  organizationId: string,
  workflowId: string,
  executionId: string,
  data: Record<string, unknown>
) {
  console.log(`[N8N_WEBHOOK] Workflow completed: ${workflowId}`, {
    organizationId,
    executionId,
    data,
  });

  // You could store workflow execution history here if needed
  // Or trigger follow-up actions based on the workflow output
}

/**
 * Handle workflow error event
 */
async function handleWorkflowError(
  organizationId: string,
  workflowId: string,
  executionId: string,
  data: Record<string, unknown>
) {
  console.error(`[N8N_WEBHOOK] Workflow error: ${workflowId}`, {
    organizationId,
    executionId,
    error: data?.error,
    data,
  });

  // Update any related records to show failure status
  if (data?.blogPostId) {
    await prismadb.blogPost.updateMany({
      where: { 
        id: data.blogPostId as string,
        organizationId,
      },
      data: { status: "DRAFT" }, // Revert to draft on error
    });
  }

  if (data?.socialPostId) {
    await prismadb.socialPostLog.updateMany({
      where: {
        id: data.socialPostId as string,
        organizationId,
      },
      data: {
        status: "FAILED",
        errorMessage: data?.error as string || "Workflow execution failed",
      },
    });
  }

  if (data?.campaignId) {
    await prismadb.newsletterCampaign.updateMany({
      where: {
        id: data.campaignId as string,
        organizationId,
      },
      data: { status: "FAILED" },
    });
  }
}

/**
 * Handle content creation event
 */
async function handleContentCreated(
  organizationId: string,
  data: Record<string, unknown>
) {
  // SECURITY: Do not log the full `data` payload — it may contain entity
  // names or PII from n8n workflows. Log only the event type and org.
  console.log(`[N8N_WEBHOOK] Content created`, { organizationId, type: data.type, id: data.id });

  // Content is already created via API endpoints
  // This event can be used for notifications or logging
}

/**
 * Handle content published event
 */
async function handleContentPublished(
  organizationId: string,
  data: Record<string, unknown>
) {
  console.log(`[N8N_WEBHOOK] Content published`, { organizationId, type: data.type, id: data.id });

  // Update content status if needed
  const { type, id } = data;

  if (type === "blog" && id) {
    await prismadb.blogPost.updateMany({
      where: { id: id as string, organizationId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  if (type === "social" && id) {
    await prismadb.socialPostLog.updateMany({
      where: { id: id as string, organizationId },
      data: { status: "POSTED", postedAt: new Date() },
    });
  }

  if (type === "newsletter" && id) {
    await prismadb.newsletterCampaign.updateMany({
      where: { id: id as string, organizationId },
      data: { status: "SENT", sentAt: new Date() },
    });
  }
}

/**
 * Handle metrics sync event (for social media engagement metrics)
 */
async function handleMetricsSync(
  organizationId: string,
  data: Record<string, unknown>
) {
  console.log(`[N8N_WEBHOOK] Metrics sync`, { organizationId, data });

  const { postId, platform, metrics } = data;

  if (!postId || !metrics) return;

  const metricsData = metrics as {
    likes?: number;
    comments?: number;
    shares?: number;
    impressions?: number;
    reach?: number;
    engagementRate?: number;
  };

  await prismadb.socialPostLog.updateMany({
    where: {
      id: postId as string,
      organizationId,
    },
    data: {
      likes: metricsData.likes ?? undefined,
      comments: metricsData.comments ?? undefined,
      shares: metricsData.shares ?? undefined,
      impressions: metricsData.impressions ?? undefined,
      reach: metricsData.reach ?? undefined,
      engagementRate: metricsData.engagementRate ?? undefined,
      lastSyncedAt: new Date(),
    },
  });
}

/**
 * GET /api/v1/n8n/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "n8n-webhook",
    timestamp: new Date().toISOString(),
    events: [
      "workflow.completed",
      "workflow.error",
      "content.created",
      "content.published",
      "metrics.sync",
      "health.check",
    ],
  });
}

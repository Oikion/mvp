import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";

/**
 * Verify n8n webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
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
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verify signature if secret is configured
    if (webhookSecret) {
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
    }

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
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
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
  console.log(`[N8N_WEBHOOK] Content created`, { organizationId, data });

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
  console.log(`[N8N_WEBHOOK] Content published`, { organizationId, data });

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

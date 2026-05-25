import { NextRequest, NextResponse } from "next/server";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

const webhookBodySchema = z.object({
  event: z.string().max(100),
  workflowId: z.string().optional(),
  executionId: z.string().optional(),
  timestamp: z.string().optional(),
  data: z.object({
    blogPostId: z.string().optional(),
    socialPostId: z.string().optional(),
    campaignId: z.string().optional(),
    postId: z.string().optional(),
    type: z.string().optional(),
    id: z.string().optional(),
    platform: z.string().optional(),
    error: z.string().optional(),
    metrics: z.object({
      likes: z.number().int().nonnegative().optional(),
      comments: z.number().int().nonnegative().optional(),
      shares: z.number().int().nonnegative().optional(),
      impressions: z.number().int().nonnegative().optional(),
      reach: z.number().int().nonnegative().optional(),
      engagementRate: z.number().nonnegative().optional(),
    }).optional(),
  }).optional(),
}).strict();

type WebhookData = NonNullable<z.infer<typeof webhookBodySchema>["data"]>;

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

  // Hash both to SHA256 before comparing so timingSafeEqual always runs on
  // equal-length (32-byte) buffers regardless of the caller-supplied signature length.
  // This eliminates the length-distinguishing oracle that a short-circuit would create.
  const a = createHash("sha256").update(normalizedSignature).digest();
  const b = createHash("sha256").update(expectedSignature).digest();
  return timingSafeEqual(a, b);
}

/**
 * Peek at the event type in a request without consuming the body.
 * Used to allow health.check requests to skip the orgToken requirement.
 */
async function peekEventType(req: NextRequest): Promise<boolean> {
  try {
    const cloned = req.clone();
    const text = await cloned.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed.event === "health.check";
  } catch {
    return false;
  }
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

    // SECURITY (C-1 fix): Per-org token in URL query parameter binds this request to a specific org.
    // n8n workflows must include ?orgToken=<token> in the webhook URL.
    // The token is stored in OrganizationSettings.n8nWebhookToken (unique, generated per org).
    // organizationId is NEVER trusted from the request body — it comes from this DB lookup only.
    const { searchParams } = new URL(req.url);
    const orgToken = searchParams.get("orgToken");

    // health.check requests may omit orgToken — all mutation events require it
    const isHealthCheck = await peekEventType(req);
    if (!isHealthCheck && !orgToken) {
      return NextResponse.json({ error: "Missing orgToken" }, { status: 401 });
    }

    // For non-health events, resolve organizationId from the per-org token
    let resolvedOrgId: string | null = null;
    if (orgToken) {
      const orgSettings = await prismadb.organizationSettings.findUnique({
        where: { n8nWebhookToken: orgToken },
        select: { organizationId: true },
      });
      if (!orgSettings) {
        return NextResponse.json({ error: "Invalid orgToken" }, { status: 401 });
      }
      resolvedOrgId = orgSettings.organizationId;
    }

    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    // SECURITY: Always require webhook secret to be configured
    // This prevents unauthorized requests when secret is not set
    if (!webhookSecret) {
      console.error("[N8N_WEBHOOK] Missing N8N_WEBHOOK_SECRET environment variable");
      return NextResponse.json(
        { error: "Webhook endpoint is not configured" },
        { status: 503 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid request body: must be valid JSON" }, { status: 400 });
    }

    // Verify HMAC signature — protects against payload tampering
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

    const parsed = webhookBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const { event, workflowId, executionId, timestamp } = parsed.data;
    const data = parsed.data.data ?? {};

    // For mutation events, organizationId must have been resolved from the per-org token above
    if (event !== "health.check" && !resolvedOrgId) {
      return NextResponse.json({ error: "Missing orgToken" }, { status: 401 });
    }

    const orgId = resolvedOrgId!;

    // Process the webhook based on event type
    switch (event) {
      case "workflow.completed":
        await handleWorkflowCompleted(orgId, workflowId ?? "", executionId ?? "", data);
        break;

      case "workflow.error":
        await handleWorkflowError(orgId, workflowId ?? "", executionId ?? "", data);
        break;

      case "content.created":
        await handleContentCreated(orgId, data);
        break;

      case "content.published":
        await handleContentPublished(orgId, data);
        break;

      case "metrics.sync":
        await handleMetricsSync(orgId, data);
        break;

      case "health.check":
        // Simple health check response
        return NextResponse.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          received: { event, timestamp },
        });

      default:
        console.log(`[N8N_WEBHOOK] Unknown event type: ${event}`);
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
  _organizationId: string,
  workflowId: string,
  executionId: string,
  _data: WebhookData
) {
  console.log(`[N8N_WEBHOOK] Workflow completed: ${workflowId}`, { executionId });
}

async function handleWorkflowError(
  organizationId: string,
  workflowId: string,
  executionId: string,
  data: WebhookData
) {
  console.error(`[N8N_WEBHOOK] Workflow error: ${workflowId}`, { executionId });

  if (data.blogPostId) {
    await prismadb.blogPost.updateMany({
      where: { id: data.blogPostId, organizationId },
      data: { status: "DRAFT" },
    });
  }

  if (data.socialPostId) {
    await prismadb.socialPostLog.updateMany({
      where: { id: data.socialPostId, organizationId },
      data: {
        status: "FAILED",
        errorMessage: data.error ?? "Workflow execution failed",
      },
    });
  }

  if (data.campaignId) {
    await prismadb.newsletterCampaign.updateMany({
      where: { id: data.campaignId, organizationId },
      data: { status: "FAILED" },
    });
  }
}

async function handleContentCreated(
  _organizationId: string,
  data: WebhookData
) {
  console.log(`[N8N_WEBHOOK] Content created`, { type: data.type });
}

async function handleContentPublished(
  organizationId: string,
  data: WebhookData
) {
  console.log(`[N8N_WEBHOOK] Content published`, { type: data.type });

  const { type, id } = data;

  if (type === "blog" && id) {
    await prismadb.blogPost.updateMany({
      where: { id, organizationId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  if (type === "social" && id) {
    await prismadb.socialPostLog.updateMany({
      where: { id, organizationId },
      data: { status: "POSTED", postedAt: new Date() },
    });
  }

  if (type === "newsletter" && id) {
    await prismadb.newsletterCampaign.updateMany({
      where: { id, organizationId },
      data: { status: "SENT", sentAt: new Date() },
    });
  }
}

/**
 * Handle metrics sync event (for social media engagement metrics)
 */
async function handleMetricsSync(
  organizationId: string,
  data: WebhookData
) {
  console.log(`[N8N_WEBHOOK] Metrics sync`, { platform: data.platform });

  const { postId, metrics } = data;

  if (!postId || !metrics) return;

  await prismadb.socialPostLog.updateMany({
    where: { id: postId, organizationId },
    data: {
      likes: metrics.likes ?? undefined,
      comments: metrics.comments ?? undefined,
      shares: metrics.shares ?? undefined,
      impressions: metrics.impressions ?? undefined,
      reach: metrics.reach ?? undefined,
      engagementRate: metrics.engagementRate ?? undefined,
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

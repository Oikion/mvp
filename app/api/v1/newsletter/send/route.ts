import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { Resend } from "resend";
import { submitJob } from "@/lib/jobs";
import type { NewsletterPayload } from "@/lib/jobs/types";

const resend = new Resend(process.env.RESEND_API_KEY);

// Feature flag: Use K8s Jobs for large campaigns
const USE_K8S_JOBS = process.env.USE_K8S_JOBS === "true";
// Threshold: campaigns larger than this use K8s
const K8S_THRESHOLD = 100;

/**
 * POST /api/v1/newsletter/send
 * Send a newsletter campaign
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const { campaignId, testEmail } = body;

    // If testEmail is provided, send a test instead of the full campaign
    if (testEmail) {
      return await sendTestEmail(context, body);
    }

    if (!campaignId) {
      return createApiErrorResponse("Missing required field: campaignId", 400);
    }

    // Get the campaign
    const campaign = await prismadb.newsletterCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId: context.organizationId,
      },
    });

    if (!campaign) {
      return createApiErrorResponse("Campaign not found", 404);
    }

    if (campaign.status === "SENT" || campaign.status === "SENDING") {
      return createApiErrorResponse(
        `Campaign is already ${campaign.status.toLowerCase()}`,
        400
      );
    }

    // Get active subscribers
    const subscribers = await prismadb.newsletterSubscriber.findMany({
      where: {
        organizationId: context.organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (subscribers.length === 0) {
      return createApiErrorResponse("No active subscribers to send to", 400);
    }

    // ===========================================
    // K8s Jobs for large campaigns
    // ===========================================
    if (USE_K8S_JOBS && subscribers.length > K8S_THRESHOLD) {
      // Update campaign status
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
          status: "SENDING",
          recipientCount: subscribers.length,
          sentAt: new Date(),
        },
      });

      // Build K8s job payload
      const k8sPayload: NewsletterPayload = {
        type: 'newsletter-send',
        campaignId,
        subscriberIds: subscribers.map(s => s.id),
        batchSize: 100,
      };

      // Submit to K8s Job Orchestrator
      const result = await submitJob({
        type: 'newsletter-send',
        organizationId: context.organizationId,
        payload: k8sPayload,
        priority: 'normal',
      });

      if (!result.success) {
        // Revert campaign status
        await prismadb.newsletterCampaign.update({
          where: { id: campaignId },
          data: { status: "DRAFT" },
        });
        return createApiErrorResponse(result.message || "Failed to start K8s job", 500);
      }

      return createApiSuccessResponse({
        success: true,
        campaign: {
          id: campaignId,
          status: "SENDING",
          recipientCount: subscribers.length,
        },
        jobId: result.jobId,
        message: `Campaign queued for ${subscribers.length} subscribers (K8s job)`,
        useK8s: true,
      });
    }

    // ===========================================
    // Inline sending for small campaigns
    // ===========================================

    // Update campaign status to SENDING
    await prismadb.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        recipientCount: subscribers.length,
        sentAt: new Date(),
      },
    });

    // Send emails using Resend batch API
    try {
      const emails = subscribers.map((sub) => ({
        from: campaign.fromEmail || process.env.EMAIL_FROM || "newsletter@example.com",
        to: sub.email,
        subject: campaign.subject,
        html: personalizeContent(campaign.content, sub),
        headers: {
          "X-Campaign-Id": campaignId,
          "X-Subscriber-Id": sub.id,
        },
      }));

      // Resend batch API allows up to 100 emails per batch
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < emails.length; i += batchSize) {
        batches.push(emails.slice(i, i + batchSize));
      }

      let totalSent = 0;
      const batchIds: string[] = [];

      for (const batch of batches) {
        const result = await resend.batch.send(batch);
        if (result.data) {
          totalSent += batch.length;
          // batch.send returns an array of results, not a single object with id
          if (Array.isArray(result.data)) {
            result.data.forEach((item: any) => {
              if (item?.id) batchIds.push(item.id);
            });
          } else if ((result.data as any).id) {
            batchIds.push((result.data as any).id);
          }
        }
      }

      // Update campaign with results
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
          status: "SENT",
          sentCount: totalSent,
          completedAt: new Date(),
          resendBatchId: batchIds.join(","),
        },
      });

      // Update subscriber stats
      await prismadb.newsletterSubscriber.updateMany({
        where: {
          organizationId: context.organizationId,
          status: "ACTIVE",
        },
        data: {
          emailsSentCount: { increment: 1 },
          lastEmailSentAt: new Date(),
        },
      });

      return createApiSuccessResponse({
        success: true,
        campaign: {
          id: campaignId,
          status: "SENT",
          sentCount: totalSent,
          recipientCount: subscribers.length,
        },
        message: `Successfully sent to ${totalSent} subscribers`,
      });
    } catch (error) {
      // Update campaign status to FAILED
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
          status: "FAILED",
        },
      });

      console.error("[NEWSLETTER_SEND_ERROR]", error);
      return createApiErrorResponse(
        error instanceof Error ? error.message : "Failed to send newsletter",
        500
      );
    }
  },
  { requiredScopes: [API_SCOPES.NEWSLETTER_SEND] }
);

/**
 * Send a test email
 */
async function sendTestEmail(
  context: ExternalApiContext,
  body: { subject?: string; content?: string; testEmail: string; campaignId?: string }
) {
  const { subject, content, testEmail, campaignId } = body;

  let emailSubject = subject;
  let emailContent = content;

  // If campaignId provided, use that campaign's content
  if (campaignId) {
    const campaign = await prismadb.newsletterCampaign.findFirst({
      where: {
        id: campaignId,
        organizationId: context.organizationId,
      },
    });

    if (!campaign) {
      return createApiErrorResponse("Campaign not found", 404);
    }

    emailSubject = campaign.subject;
    emailContent = campaign.content;
  }

  if (!emailSubject || !emailContent) {
    return createApiErrorResponse(
      "Missing required fields: subject and content (or campaignId)",
      400
    );
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "newsletter@example.com",
      to: testEmail,
      subject: `[TEST] ${emailSubject}`,
      html: personalizeContent(emailContent, {
        firstName: "Test",
        lastName: "User",
        email: testEmail,
      }),
    });

    if (result.error) {
      return createApiErrorResponse(result.error.message, 500);
    }

    return createApiSuccessResponse({
      success: true,
      message: `Test email sent to ${testEmail}`,
      emailId: result.data?.id,
    });
  } catch (error) {
    console.error("[TEST_EMAIL_ERROR]", error);
    return createApiErrorResponse(
      error instanceof Error ? error.message : "Failed to send test email",
      500
    );
  }
}

/**
 * Replace personalization tokens in content
 */
function personalizeContent(
  content: string,
  subscriber: { firstName?: string | null; lastName?: string | null; email?: string }
): string {
  return content
    .replace(/{{firstName}}/g, subscriber.firstName || "Subscriber")
    .replace(/{{lastName}}/g, subscriber.lastName || "")
    .replace(/{{email}}/g, subscriber.email || "")
    .replace(/{{name}}/g, [subscriber.firstName, subscriber.lastName].filter(Boolean).join(" ") || "Subscriber");
}

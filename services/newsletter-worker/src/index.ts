/**
 * Newsletter Worker - K8s Job for sending email campaigns
 * 
 * Sends newsletter campaigns in batches with progress reporting.
 * Isolated per-organization execution in K8s.
 */

import { pino } from 'pino';
import { Resend } from 'resend';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// ===========================================
// Types
// ===========================================

interface NewsletterPayload {
  type: 'newsletter-send';
  campaignId: string;
  subscriberIds?: string[];
  batchSize?: number;
}

interface NewsletterResult {
  type: 'newsletter-send';
  campaignId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bounceCount: number;
  duration: number;
}

// ===========================================
// Logger
// ===========================================

const logger = pino({
  name: 'newsletter-worker',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined
});

// ===========================================
// Clients
// ===========================================

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// ===========================================
// Environment & Context
// ===========================================

function getJobContext(): { 
  jobId: string; 
  organizationId: string; 
  payload: NewsletterPayload;
  callbackUrl?: string;
  redisUrl?: string;
} {
  const jobId = process.env.JOB_ID;
  const organizationId = process.env.ORGANIZATION_ID;
  const payloadStr = process.env.PAYLOAD;

  if (!jobId || !organizationId || !payloadStr) {
    throw new Error('Missing required environment variables: JOB_ID, ORGANIZATION_ID, PAYLOAD');
  }

  let payload: NewsletterPayload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    throw new Error('Failed to parse PAYLOAD environment variable');
  }

  return {
    jobId,
    organizationId,
    payload,
    callbackUrl: process.env.CALLBACK_URL,
    redisUrl: process.env.REDIS_URL,
  };
}

// ===========================================
// Progress Reporter
// ===========================================

class ProgressReporter {
  private jobId: string;
  private callbackUrl?: string;
  private redis?: IORedis;
  private lastProgress = 0;
  private callbackSecret?: string;

  constructor(jobId: string, callbackUrl?: string, redisUrl?: string) {
    this.jobId = jobId;
    this.callbackUrl = callbackUrl;
    this.callbackSecret = process.env.WORKER_CALLBACK_SECRET || process.env.CRON_SECRET;

    if (redisUrl) {
      this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: 3 });
    }
  }

  async progress(progress: number, message?: string): Promise<void> {
    const clamped = Math.min(100, Math.max(0, progress));
    if (clamped <= this.lastProgress && clamped < 100) return;
    this.lastProgress = clamped;

    logger.info({ progress: clamped, message }, 'Progress update');

    if (this.redis) {
      try {
        await this.redis.hset(`job:${this.jobId}`, 'progress', clamped.toString(), 'message', message || '');
      } catch (err) {
        logger.warn({ error: err }, 'Failed to update Redis');
      }
    }

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.progress', { progress: clamped, message });
      } catch (err) {
        logger.warn({ error: err }, 'Failed to send progress callback');
      }
    }
  }

  async complete(result: NewsletterResult): Promise<void> {
    logger.info({ result }, 'Job completed');

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.completed', { result });
      } catch (err) {
        logger.error({ error: err }, 'Failed to send completion callback');
      }
    }

    await this.cleanup();
  }

  async fail(errorMessage: string): Promise<void> {
    logger.error({ errorMessage }, 'Job failed');

    if (this.callbackUrl) {
      try {
        await this.sendCallback('job.failed', { errorMessage });
      } catch (err) {
        logger.error({ error: err }, 'Failed to send failure callback');
      }
    }

    await this.cleanup();
  }

  private async sendCallback(event: string, data: Record<string, unknown>): Promise<void> {
    if (!this.callbackUrl) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.callbackSecret) {
      headers['Authorization'] = `Bearer ${this.callbackSecret}`;
    }

    await fetch(this.callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event,
        jobId: this.jobId,
        timestamp: new Date().toISOString(),
        data,
      }),
    });
  }

  private async cleanup(): Promise<void> {
    if (this.redis) {
      try { await this.redis.quit(); } catch { /* ignore */ }
    }
  }
}

// ===========================================
// Email Personalization
// ===========================================

function personalizeContent(
  content: string,
  subscriber: { firstName?: string | null; lastName?: string | null; email?: string }
): string {
  return content
    .replace(/{{firstName}}/g, subscriber.firstName || 'Subscriber')
    .replace(/{{lastName}}/g, subscriber.lastName || '')
    .replace(/{{email}}/g, subscriber.email || '')
    .replace(/{{name}}/g, [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ') || 'Subscriber');
}

// ===========================================
// Main Job Runner
// ===========================================

async function runJob(): Promise<void> {
  const startTime = Date.now();
  const context = getJobContext();
  const { jobId, organizationId, payload, callbackUrl, redisUrl } = context;

  logger.info({ jobId, organizationId, campaignId: payload.campaignId }, 'Starting Newsletter job');

  const reporter = new ProgressReporter(jobId, callbackUrl, redisUrl);

  let sentCount = 0;
  let failedCount = 0;

  try {
    // Get campaign
    const campaign = await prisma.newsletterCampaign.findFirst({
      where: {
        id: payload.campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${payload.campaignId}`);
    }

    // Get subscribers
    const subscriberWhere: any = {
      organizationId,
      status: 'ACTIVE',
    };

    if (payload.subscriberIds && payload.subscriberIds.length > 0) {
      subscriberWhere.id = { in: payload.subscriberIds };
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: subscriberWhere,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (subscribers.length === 0) {
      throw new Error('No active subscribers to send to');
    }

    const totalSubscribers = subscribers.length;
    const batchSize = payload.batchSize || 100;

    logger.info({ totalSubscribers, batchSize }, 'Sending campaign');

    await reporter.progress(5, `Preparing to send to ${totalSubscribers} subscribers...`);

    // Update campaign status
    await prisma.newsletterCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENDING',
        recipientCount: totalSubscribers,
        sentAt: new Date(),
      },
    });

    // Send in batches
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const emails = batch.map((sub) => ({
        from: campaign.fromEmail || process.env.EMAIL_FROM || 'newsletter@oikion.com',
        to: sub.email,
        subject: campaign.subject,
        html: personalizeContent(campaign.content, sub),
        headers: {
          'X-Campaign-Id': campaign.id,
          'X-Subscriber-Id': sub.id,
        },
      }));

      try {
        const result = await resend.batch.send(emails);
        
        if (result.data) {
          sentCount += batch.length;
        } else if (result.error) {
          failedCount += batch.length;
          logger.error({ error: result.error }, 'Batch send failed');
        }
      } catch (err) {
        failedCount += batch.length;
        logger.error({ error: err }, 'Batch send error');
      }

      // Update progress
      const progress = 5 + ((i + batch.length) / totalSubscribers) * 90;
      await reporter.progress(
        progress,
        `Sent ${sentCount}/${totalSubscribers} emails (${failedCount} failed)`
      );
    }

    // Update campaign with results
    await prisma.newsletterCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failedCount === totalSubscribers ? 'FAILED' : 'SENT',
        sentCount,
        completedAt: new Date(),
      },
    });

    // Update subscriber stats
    await prisma.newsletterSubscriber.updateMany({
      where: { organizationId, status: 'ACTIVE' },
      data: {
        emailsSentCount: { increment: 1 },
        lastEmailSentAt: new Date(),
      },
    });

    const duration = Date.now() - startTime;

    const result: NewsletterResult = {
      type: 'newsletter-send',
      campaignId: campaign.id,
      totalRecipients: totalSubscribers,
      sentCount,
      failedCount,
      bounceCount: 0,
      duration,
    };

    await reporter.complete(result);
    await prisma.$disconnect();

    logger.info({ duration, sentCount, failedCount }, 'Job completed successfully');
    process.exit(0);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.fatal({ error: errorMsg }, 'Job failed');

    // Update campaign status on failure
    try {
      await prisma.newsletterCampaign.update({
        where: { id: payload.campaignId },
        data: { status: 'FAILED' },
      });
    } catch { /* ignore */ }

    await reporter.fail(errorMsg);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ===========================================
// Entry Point
// ===========================================

runJob().catch((error) => {
  logger.fatal({ error }, 'Unhandled error in job runner');
  process.exit(1);
});

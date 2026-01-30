/**
 * Progress Reporter - Reports job progress via callback URL or Redis
 */

import IORedis from 'ioredis';
import type { JobContext, ProgressUpdate, JobCompletionData, JobResult } from './types.js';
import { getLogger } from './logger.js';

const logger = getLogger('progress-reporter');

export class ProgressReporter {
  private context: JobContext;
  private redis?: IORedis;
  private lastProgress: number = 0;
  private callbackSecret?: string;

  constructor(context: JobContext) {
    this.context = context;
    this.callbackSecret = process.env.WORKER_CALLBACK_SECRET || process.env.CRON_SECRET;

    // Initialize Redis if URL provided
    if (context.redisUrl) {
      this.redis = new IORedis(context.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });
    }
  }

  /**
   * Report progress (0-100)
   */
  async progress(progress: number, message?: string): Promise<void> {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    
    // Only report if progress increased
    if (clampedProgress <= this.lastProgress && clampedProgress < 100) {
      return;
    }

    this.lastProgress = clampedProgress;

    logger.info({ progress: clampedProgress, message }, 'Progress update');

    const update: ProgressUpdate = {
      progress: clampedProgress,
      message,
    };

    // Report via Redis for real-time updates
    if (this.redis) {
      try {
        await this.redis.publish(
          `job:${this.context.jobId}:progress`,
          JSON.stringify(update)
        );
        await this.redis.hset(
          `job:${this.context.jobId}`,
          'progress', clampedProgress.toString(),
          'message', message || '',
          'updatedAt', new Date().toISOString()
        );
      } catch (error) {
        logger.warn({ error }, 'Failed to publish progress to Redis');
      }
    }

    // Report via callback URL
    if (this.context.callbackUrl) {
      try {
        await this.sendCallback('job.progress', { progress: clampedProgress, message });
      } catch (error) {
        logger.warn({ error }, 'Failed to send progress callback');
      }
    }
  }

  /**
   * Report job completion
   */
  async complete(result?: JobResult): Promise<void> {
    logger.info({ result }, 'Job completed');

    const data: JobCompletionData = {
      status: 'completed',
      result,
    };

    // Update Redis
    if (this.redis) {
      try {
        await this.redis.hset(
          `job:${this.context.jobId}`,
          'status', 'completed',
          'progress', '100',
          'result', result ? JSON.stringify(result) : '',
          'completedAt', new Date().toISOString()
        );
        await this.redis.publish(
          `job:${this.context.jobId}:completed`,
          JSON.stringify(data)
        );
      } catch (error) {
        logger.warn({ error }, 'Failed to publish completion to Redis');
      }
    }

    // Report via callback URL
    if (this.context.callbackUrl) {
      try {
        await this.sendCallback('job.completed', data);
      } catch (error) {
        logger.error({ error }, 'Failed to send completion callback');
        // This is more critical, rethrow
        throw error;
      }
    }

    await this.cleanup();
  }

  /**
   * Report job failure
   */
  async fail(errorMessage: string, result?: JobResult): Promise<void> {
    logger.error({ errorMessage, result }, 'Job failed');

    const data: JobCompletionData = {
      status: 'failed',
      result,
      errorMessage,
    };

    // Update Redis
    if (this.redis) {
      try {
        await this.redis.hset(
          `job:${this.context.jobId}`,
          'status', 'failed',
          'errorMessage', errorMessage,
          'result', result ? JSON.stringify(result) : '',
          'completedAt', new Date().toISOString()
        );
        await this.redis.publish(
          `job:${this.context.jobId}:failed`,
          JSON.stringify(data)
        );
      } catch (error) {
        logger.warn({ error }, 'Failed to publish failure to Redis');
      }
    }

    // Report via callback URL
    if (this.context.callbackUrl) {
      try {
        await this.sendCallback('job.failed', data);
      } catch (error) {
        logger.error({ error }, 'Failed to send failure callback');
      }
    }

    await this.cleanup();
  }

  /**
   * Send callback to the API
   */
  private async sendCallback(event: string, data: Record<string, unknown>): Promise<void> {
    if (!this.context.callbackUrl) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.callbackSecret) {
      headers['Authorization'] = `Bearer ${this.callbackSecret}`;
    }

    const response = await fetch(this.context.callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event,
        jobId: this.context.jobId,
        organizationId: this.context.organizationId,
        timestamp: new Date().toISOString(),
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

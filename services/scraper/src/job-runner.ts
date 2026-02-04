/**
 * K8s Job Runner for Market Intelligence Scraper
 * 
 * This is the entry point for K8s Job executions.
 * It parses job parameters from environment variables,
 * executes the scrape, and reports progress/results.
 */

import 'dotenv/config';
import { pino } from 'pino';
import IORedis from 'ioredis';
import { initDatabase, closeDatabase, getDb } from './db/client.js';
import { getPlatformConfig } from './config/platforms.js';
import { SpitogatosScraper } from './scrapers/spitogatos.js';
import { XeGrScraper } from './scrapers/xe-gr.js';
import { TospitimouScraper } from './scrapers/tospitimou.js';
import type { ScrapeJobResult, SearchFilters } from './types/index.js';

// ===========================================
// Types
// ===========================================

interface MarketIntelPayload {
  type: 'market-intel-scrape';
  platforms: string[];
  targetAreas: string[];
  targetMunicipalities: string[];
  transactionTypes: string[];
  propertyTypes: string[];
  minPrice?: number;
  maxPrice?: number;
  maxPagesPerPlatform: number;
}

interface PlatformResult {
  platform: string;
  status: 'completed' | 'failed';
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  errors?: string[];
}

interface JobResult {
  type: 'market-intel-scrape';
  platforms: PlatformResult[];
  totalListings: number;
  totalNew: number;
  totalUpdated: number;
  duration: number;
}

// ===========================================
// Logger
// ===========================================

const logger = pino({
  name: 'mi-job-runner',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined
});

// ===========================================
// Environment Variables
// ===========================================

function getJobContext(): { 
  jobId: string; 
  organizationId: string; 
  payload: MarketIntelPayload;
  callbackUrl?: string;
  redisUrl?: string;
} {
  const jobId = process.env.JOB_ID;
  const organizationId = process.env.ORGANIZATION_ID;
  const payloadStr = process.env.PAYLOAD;

  if (!jobId || !organizationId || !payloadStr) {
    throw new Error('Missing required environment variables: JOB_ID, ORGANIZATION_ID, PAYLOAD');
  }

  let payload: MarketIntelPayload;
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
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: 3,
      });
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
        await this.redis.publish(`job:${this.jobId}:progress`, JSON.stringify({ progress: clamped, message }));
      } catch (err) {
        logger.warn({ error: err }, 'Failed to publish progress to Redis');
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

  async complete(result: JobResult): Promise<void> {
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
      try {
        await this.redis.quit();
      } catch {
        // Ignore
      }
    }
  }
}

// ===========================================
// Scraper Factory
// ===========================================

function getScraperForPlatform(platformId: string) {
  const config = getPlatformConfig(platformId);
  if (!config) {
    throw new Error(`Unknown platform: ${platformId}`);
  }

  switch (platformId) {
    case 'spitogatos':
      return new SpitogatosScraper(config);
    case 'xe_gr':
      return new XeGrScraper(config);
    case 'tospitimou':
      return new TospitimouScraper(config);
    default:
      throw new Error(`No scraper implementation for: ${platformId}`);
  }
}

// ===========================================
// Main Job Runner
// ===========================================

async function runJob(): Promise<void> {
  const startTime = Date.now();
  const context = getJobContext();
  const { jobId, organizationId, payload, callbackUrl, redisUrl } = context;

  logger.info({ jobId, organizationId, platforms: payload.platforms }, 'Starting Market Intel job');

  const reporter = new ProgressReporter(jobId, callbackUrl, redisUrl);

  try {
    // Initialize database
    initDatabase();

    const platformResults: PlatformResult[] = [];
    let totalListings = 0;
    let totalNew = 0;
    let totalUpdated = 0;

    // Build search filters from payload
    const filters: SearchFilters = {
      areas: payload.targetAreas,
      municipalities: payload.targetMunicipalities,
      transactionTypes: payload.transactionTypes,
      propertyTypes: payload.propertyTypes,
      minPrice: payload.minPrice,
      maxPrice: payload.maxPrice,
    };

    const totalPlatforms = payload.platforms.length;

    for (let i = 0; i < totalPlatforms; i++) {
      const platformId = payload.platforms[i];
      const baseProgress = (i / totalPlatforms) * 100;
      const platformProgress = 100 / totalPlatforms;

      await reporter.progress(baseProgress, `Scraping ${platformId}...`);

      try {
        logger.info({ platform: platformId, organizationId }, 'Starting platform scrape');

        const scraper = getScraperForPlatform(platformId);
        
        // Pass organization ID to scraper for data isolation
        const result = await scraper.scrapeWithProgress(
          filters,
          payload.maxPagesPerPlatform,
          organizationId,
          async (platformPct, msg) => {
            const combinedProgress = baseProgress + (platformPct / 100) * platformProgress;
            await reporter.progress(combinedProgress, msg);
          }
        );

        platformResults.push({
          platform: platformId,
          status: 'completed',
          listingsFound: result.listingsFound,
          listingsNew: result.listingsNew || 0,
          listingsUpdated: result.listingsUpdated || 0,
        });

        totalListings += result.listingsFound;
        totalNew += result.listingsNew || 0;
        totalUpdated += result.listingsUpdated || 0;

        logger.info({ 
          platform: platformId, 
          listingsFound: result.listingsFound 
        }, 'Platform scrape completed');

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ platform: platformId, error: errorMsg }, 'Platform scrape failed');

        platformResults.push({
          platform: platformId,
          status: 'failed',
          listingsFound: 0,
          listingsNew: 0,
          listingsUpdated: 0,
          errors: [errorMsg],
        });
      }
    }

    const duration = Date.now() - startTime;

    const jobResult: JobResult = {
      type: 'market-intel-scrape',
      platforms: platformResults,
      totalListings,
      totalNew,
      totalUpdated,
      duration,
    };

    await reporter.complete(jobResult);
    await closeDatabase();

    logger.info({ 
      duration, 
      totalListings, 
      totalNew, 
      totalUpdated,
      platformsCompleted: platformResults.filter(p => p.status === 'completed').length,
      platformsFailed: platformResults.filter(p => p.status === 'failed').length,
    }, 'Job completed successfully');

    process.exit(0);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.fatal({ error: errorMsg }, 'Job failed');

    await reporter.fail(errorMsg);
    await closeDatabase();

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

import 'dotenv/config';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { pino } from 'pino';
import { initDatabase, closeDatabase } from './db/client.js';
import { PLATFORMS, getPlatformConfig } from './config/platforms.js';
import { getActiveSchedules, describeCron } from './config/schedules.js';
import type { ScrapeJobData, ScrapeJobResult } from './types/index.js';

// Import scrapers
import { SpitogatosScraper } from './scrapers/spitogatos.js';
import { XeGrScraper } from './scrapers/xe-gr.js';
import { TospitimouScraper } from './scrapers/tospitimou.js';
import { processAlerts } from './services/alert-processor.js';

const logger = pino({
  name: 'scraper-main',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined
});

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

// Queue name
const QUEUE_NAME = 'market-intel-scrape';

// Create queue
const scrapeQueue = new Queue<ScrapeJobData>(QUEUE_NAME, { connection });

/**
 * Get scraper instance for platform
 */
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

/**
 * Process scrape job
 */
async function processJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { platform, filters, maxPages } = job.data;
  
  logger.info({ platform, jobId: job.id }, 'Starting scrape job');
  
  const scraper = getScraperForPlatform(platform);
  const result = await scraper.scrape(filters, maxPages);
  
  logger.info({ platform, result }, 'Scrape job completed');
  
  return result;
}

/**
 * Set up scheduled jobs based on configuration
 */
async function setupScheduledJobs(): Promise<void> {
  const schedules = getActiveSchedules();
  
  logger.info({ 
    scheduleCount: schedules.length,
    mode: process.env.SCRAPER_MODE || 'standard'
  }, 'Setting up scheduled jobs');

  for (const schedule of schedules) {
    if (!PLATFORMS[schedule.platform]) {
      logger.warn({ platform: schedule.platform }, 'Unknown platform in schedule, skipping');
      continue;
    }

    const jobName = `scheduled-${schedule.platform}-${schedule.cron.replace(/\s+/g, '-')}`;
    
    await scrapeQueue.add(
      jobName,
      { 
        platform: schedule.platform,
        filters: schedule.filters,
        maxPages: schedule.maxPages
      },
      {
        repeat: { pattern: schedule.cron },
        removeOnComplete: { age: 86400 },  // Keep for 24 hours
        removeOnFail: { age: 604800 }       // Keep failures for 7 days
      }
    );
    
    logger.info({ 
      platform: schedule.platform, 
      cron: schedule.cron,
      description: describeCron(schedule.cron),
      maxPages: schedule.maxPages
    }, 'Scheduled scrape job');
  }
}

/**
 * Create and start worker
 */
function createWorker(): Worker<ScrapeJobData, ScrapeJobResult> {
  const worker = new Worker<ScrapeJobData, ScrapeJobResult>(
    QUEUE_NAME,
    processJob,
    {
      connection,
      concurrency: 1, // Process one platform at a time
      limiter: {
        max: 1,
        duration: 60000 // Max 1 job per minute
      }
    }
  );

  worker.on('completed', (job, result) => {
    logger.info({
      jobId: job.id,
      platform: result.platform,
      listingsFound: result.listingsFound,
      duration: result.duration
    }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({
      jobId: job?.id,
      platform: job?.data.platform,
      error: error.message
    }, 'Job failed');
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  return worker;
}

/**
 * Trigger immediate scrape (for manual runs)
 */
export async function triggerScrape(
  platform: string,
  filters?: ScrapeJobData['filters'],
  maxPages?: number
): Promise<string> {
  const job = await scrapeQueue.add(
    `manual-${platform}-${Date.now()}`,
    { platform, filters, maxPages },
    {
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  );
  
  logger.info({ platform, jobId: job.id }, 'Manual scrape triggered');
  return job.id!;
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    scrapeQueue.getWaitingCount(),
    scrapeQueue.getActiveCount(),
    scrapeQueue.getCompletedCount(),
    scrapeQueue.getFailedCount(),
    scrapeQueue.getDelayedCount()
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Starting Market Intelligence Scraper');
  
  // Initialize database
  initDatabase();
  
  // Set up scheduled jobs
  await setupScheduledJobs();
  
  // Create and start worker
  const worker = createWorker();
  
  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    
    await worker.close();
    await scrapeQueue.close();
    await closeDatabase();
    await connection.quit();
    
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  logger.info('Scraper worker ready');
}

// Run if this is the main module
main().catch((error) => {
  logger.fatal({ error }, 'Failed to start scraper');
  process.exit(1);
});

export { scrapeQueue, QUEUE_NAME };

#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { pino } from 'pino';
import { initDatabase, closeDatabase, getRecentScrapeLogs } from './db/client.js';
import { PLATFORMS, getPlatformConfig, getAllPlatformIds } from './config/platforms.js';
import { SpitogatosScraper } from './scrapers/spitogatos.js';
import { XeGrScraper } from './scrapers/xe-gr.js';
import { TospitimouScraper } from './scrapers/tospitimou.js';
import type { SearchFilters } from './types/index.js';

const logger = pino({
  name: 'scraper-cli',
  transport: { target: 'pino-pretty' }
});

const program = new Command();

program
  .name('oikion-scraper')
  .description('Market intelligence scraper for Greek real estate platforms')
  .version('1.0.0');

/**
 * Scrape command
 */
program
  .command('scrape')
  .description('Run a scrape job for a platform')
  .requiredOption('-p, --platform <platform>', 'Platform to scrape (spitogatos, xe_gr, tospitimou)')
  .option('-m, --max-pages <number>', 'Maximum pages to scrape', parseInt)
  .option('-t, --transaction <type>', 'Transaction type (sale, rent)')
  .option('-a, --area <area>', 'Area to filter')
  .option('--min-price <number>', 'Minimum price', parseInt)
  .option('--max-price <number>', 'Maximum price', parseInt)
  .action(async (options) => {
    const { platform, maxPages, transaction, area, minPrice, maxPrice } = options;
    
    // Validate platform
    if (!PLATFORMS[platform]) {
      logger.error({ platform }, 'Unknown platform');
      console.error(`Unknown platform: ${platform}`);
      console.error(`Available platforms: ${getAllPlatformIds().join(', ')}`);
      process.exit(1);
    }
    
    // Build filters
    const filters: SearchFilters = {};
    if (transaction) filters.transactionType = transaction;
    if (area) filters.areas = [area];
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    
    logger.info({ platform, filters, maxPages }, 'Starting scrape');
    
    try {
      initDatabase();
      
      const config = getPlatformConfig(platform)!;
      let scraper;
      
      switch (platform) {
        case 'spitogatos':
          scraper = new SpitogatosScraper(config);
          break;
        case 'xe_gr':
          scraper = new XeGrScraper(config);
          break;
        case 'tospitimou':
          scraper = new TospitimouScraper(config);
          break;
        default:
          throw new Error(`No scraper for platform: ${platform}`);
      }
      
      const result = await scraper.scrape(filters, maxPages);
      
      console.log('\n=== Scrape Results ===');
      console.log(`Platform: ${result.platform}`);
      console.log(`Status: ${result.status}`);
      console.log(`Listings found: ${result.listingsFound}`);
      console.log(`New listings: ${result.listingsNew}`);
      console.log(`Updated listings: ${result.listingsUpdated}`);
      console.log(`Deactivated: ${result.listingsDeactivated}`);
      console.log(`Pages scraped: ${result.pagesScraped}`);
      console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
      }
      
    } catch (error) {
      logger.error({ error }, 'Scrape failed');
      console.error('Scrape failed:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Show recent scrape logs')
  .option('-p, --platform <platform>', 'Filter by platform')
  .option('-l, --limit <number>', 'Number of logs to show', parseInt, 10)
  .action(async (options) => {
    const { platform, limit } = options;
    
    try {
      initDatabase();
      
      const logs = await getRecentScrapeLogs(platform, limit);
      
      console.log('\n=== Recent Scrape Logs ===\n');
      
      if (logs.length === 0) {
        console.log('No scrape logs found.');
        return;
      }
      
      for (const log of logs) {
        console.log(`[${log.started_at.toISOString()}] ${log.platform}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Found: ${log.listings_found} | New: ${log.listings_new} | Updated: ${log.listings_updated}`);
        console.log(`  Pages: ${log.pages_scraped} | Duration: ${log.scrape_duration_ms ? `${(log.scrape_duration_ms / 1000).toFixed(1)}s` : 'N/A'}`);
        if (log.error_message) {
          console.log(`  Error: ${log.error_message}`);
        }
        console.log('');
      }
      
    } catch (error) {
      logger.error({ error }, 'Failed to get status');
      console.error('Failed to get status:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

/**
 * List platforms command
 */
program
  .command('platforms')
  .description('List available platforms')
  .action(() => {
    console.log('\n=== Available Platforms ===\n');
    
    for (const [id, config] of Object.entries(PLATFORMS)) {
      console.log(`${id}:`);
      console.log(`  Name: ${config.name}`);
      console.log(`  URL: ${config.baseUrl}`);
      console.log(`  Rate limit: ${config.rateLimit.requests} req/${config.rateLimit.perMinutes} min`);
      console.log(`  Max pages: ${config.pagination.maxPages || 'unlimited'}`);
      console.log(`  Uses Skyvern: ${config.useSkyvern ? 'Yes' : 'No'}`);
      console.log('');
    }
  });

/**
 * Test connection command
 */
program
  .command('test-db')
  .description('Test database connection')
  .action(async () => {
    try {
      const pool = initDatabase();
      const result = await pool.query('SELECT NOW() as time, current_database() as db');
      console.log('Database connection successful!');
      console.log(`Database: ${result.rows[0].db}`);
      console.log(`Server time: ${result.rows[0].time}`);
      
      // Check if market_intel schema exists
      const schemaCheck = await pool.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'market_intel'"
      );
      if (schemaCheck.rows.length > 0) {
        console.log('market_intel schema: exists');
      } else {
        console.log('market_intel schema: NOT FOUND - run migrations first');
      }
      
    } catch (error) {
      console.error('Database connection failed:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
    }
  });

program.parse();

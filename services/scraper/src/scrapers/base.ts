import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { pino } from 'pino';
import type { 
  PlatformConfig, 
  RawListing, 
  SearchFilters,
  ScrapeJobResult 
} from '../types/index.js';
import { 
  upsertListing, 
  deactivateOldListings,
  createScrapeLog,
  updateScrapeLog 
} from '../db/client.js';
import { normalizeProperty } from '../normalizers/property.js';

const logger = pino({ name: 'base-scraper' });

/**
 * Abstract base class for all platform scrapers
 * Provides common functionality for rate limiting, browser management, and error handling
 */
export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected platform: PlatformConfig;
  protected logger: ReturnType<typeof pino>;
  
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(platform: PlatformConfig) {
    this.platform = platform;
    this.logger = pino({ name: `scraper-${platform.id}` });
  }

  /**
   * Initialize browser instance
   */
  async init(): Promise<void> {
    this.logger.info('Initializing browser');
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'el-GR',
      timezoneId: 'Europe/Athens'
    });

    // Add some stealth measures
    await this.context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.logger.info('Browser closed');
  }

  /**
   * Main scraping method - orchestrates the entire scrape
   */
  async scrape(filters?: SearchFilters, maxPages?: number): Promise<ScrapeJobResult> {
    return this.scrapeWithProgress(filters, maxPages, undefined, undefined);
  }

  /**
   * Main scraping method with progress reporting and organization isolation
   * Used by K8s Jobs for per-org scraping with progress callbacks
   */
  async scrapeWithProgress(
    filters?: SearchFilters,
    maxPages?: number,
    organizationId?: string,
    onProgress?: (progress: number, message: string) => Promise<void>
  ): Promise<ScrapeJobResult> {
    const startTime = Date.now();
    const logId = await createScrapeLog(this.platform.id, organizationId);
    
    const result: ScrapeJobResult = {
      platform: this.platform.id,
      status: 'success',
      listingsFound: 0,
      listingsNew: 0,
      listingsUpdated: 0,
      listingsDeactivated: 0,
      pagesScraped: 0,
      duration: 0,
      errors: []
    };

    const seenListingIds: string[] = [];

    try {
      await this.init();
      
      const effectiveMaxPages = maxPages ?? this.platform.pagination.maxPages ?? 100;
      let estimatedTotal = effectiveMaxPages * 20; // Rough estimate
      
      // Report initial progress
      if (onProgress) {
        await onProgress(5, `Initialized browser for ${this.platform.name}`);
      }
      
      for await (const listing of this.scrapeListings(filters)) {
        try {
          // Pass organization ID to normalizer for data isolation
          const normalized = normalizeProperty(listing, this.platform.id, organizationId);
          const { isNew, priceChanged } = await upsertListing(normalized);
          
          seenListingIds.push(listing.sourceListingId);
          result.listingsFound++;
          
          if (isNew) {
            result.listingsNew++;
          } else if (priceChanged) {
            result.listingsUpdated++;
          }

          // Progress reporting
          if (result.listingsFound % 10 === 0) {
            const progress = Math.min(90, 5 + (result.listingsFound / estimatedTotal) * 85);
            this.logger.info({ count: result.listingsFound }, 'Progress update');
            
            if (onProgress) {
              await onProgress(
                progress,
                `Processed ${result.listingsFound} listings (${result.listingsNew} new, ${result.listingsUpdated} updated)`
              );
            }
          }
        } catch (err) {
          this.logger.error({ err, listing }, 'Failed to process listing');
          result.errors?.push(`Failed to process ${listing.sourceListingId}: ${err}`);
        }
      }

      // Report deactivation progress
      if (onProgress) {
        await onProgress(92, 'Deactivating old listings...');
      }

      // Deactivate listings not seen in this scrape (scoped to organization if provided)
      result.listingsDeactivated = await deactivateOldListings(
        this.platform.id,
        seenListingIds,
        organizationId
      );

    } catch (err) {
      this.logger.error({ err }, 'Scrape failed');
      result.status = result.listingsFound > 0 ? 'partial' : 'failed';
      result.errors?.push(`Scrape failed: ${err}`);
    } finally {
      await this.close();
      result.duration = Date.now() - startTime;

      // Update scrape log
      await updateScrapeLog(logId, {
        completed_at: new Date(),
        status: result.status,
        listings_found: result.listingsFound,
        listings_new: result.listingsNew,
        listings_updated: result.listingsUpdated,
        listings_deactivated: result.listingsDeactivated,
        pages_scraped: result.pagesScraped,
        scrape_duration_ms: result.duration,
        error_message: result.errors?.join('; ') || null
      });

      this.logger.info({ result }, 'Scrape completed');
      
      // Final progress
      if (onProgress) {
        await onProgress(100, `Completed: ${result.listingsFound} listings found`);
      }
    }

    return result;
  }

  /**
   * Abstract method: Generate listings from platform
   * Must be implemented by each platform scraper
   */
  protected abstract scrapeListings(filters?: SearchFilters): AsyncGenerator<RawListing>;

  /**
   * Abstract method: Parse a single listing page
   * Must be implemented by each platform scraper
   */
  protected abstract parseListingPage(page: Page): Promise<RawListing>;

  /**
   * Build search URL with filters
   */
  protected abstract buildSearchUrl(filters?: SearchFilters, page?: number): string;

  /**
   * Rate limiting wrapper
   */
  protected async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const { requests, perMinutes } = this.platform.rateLimit;
    const windowMs = perMinutes * 60 * 1000;
    
    const now = Date.now();
    if (now - this.windowStart > windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= requests) {
      const waitTime = windowMs - (now - this.windowStart) + 1000;
      this.logger.info({ waitTime }, 'Rate limit reached, waiting');
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
    return fn();
  }

  /**
   * Navigate to URL with rate limiting and error handling
   */
  protected async navigateTo(page: Page, url: string): Promise<void> {
    await this.withRateLimit(async () => {
      this.logger.debug({ url }, 'Navigating');
      
      // Add random delay to appear more human-like
      await this.sleep(this.randomDelay(1000, 3000));
      
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (!response?.ok()) {
        throw new Error(`Failed to load page: ${response?.status()}`);
      }

      // Check for anti-bot challenges
      await this.handleAntiBot(page);
    });
  }

  /**
   * Detect and handle anti-bot measures
   */
  protected async handleAntiBot(page: Page): Promise<boolean> {
    // Check for common CAPTCHA indicators
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.captcha',
      '#captcha',
      '[data-callback="onCaptchaSuccess"]'
    ];

    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        this.logger.warn({ selector }, 'Anti-bot challenge detected');
        
        // If Skyvern is configured, we could delegate to it here
        if (this.platform.useSkyvern) {
          // TODO: Implement Skyvern fallback
          throw new Error('Anti-bot challenge detected, Skyvern required');
        }
        
        return false;
      }
    }

    // Check for block pages
    const pageContent = await page.content();
    const blockIndicators = [
      'access denied',
      'blocked',
      'too many requests',
      '403 forbidden',
      'rate limit'
    ];

    for (const indicator of blockIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        this.logger.warn({ indicator }, 'Possible blocking detected');
        return false;
      }
    }

    return true;
  }

  /**
   * Extract text content from element
   */
  protected async getText(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (!element) return null;
      const text = await element.textContent();
      return text?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract attribute from element
   */
  protected async getAttribute(page: Page, selector: string, attr: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (!element) return null;
      return await element.getAttribute(attr);
    } catch {
      return null;
    }
  }

  /**
   * Extract multiple elements' text
   */
  protected async getAllText(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const texts: string[] = [];
      for (const el of elements) {
        const text = await el.textContent();
        if (text?.trim()) {
          texts.push(text.trim());
        }
      }
      return texts;
    } catch {
      return [];
    }
  }

  /**
   * Parse price from text (handles Greek number formats)
   */
  protected parsePrice(text: string | null): number | null {
    if (!text) return null;
    
    // Remove currency symbols and whitespace
    const cleaned = text
      .replace(/[€$£]/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')  // Remove thousand separators
      .replace(/,/g, '.');  // Convert decimal separator
    
    const match = cleaned.match(/[\d.]+/);
    if (!match) return null;
    
    const price = parseFloat(match[0]);
    return isNaN(price) ? null : Math.round(price);
  }

  /**
   * Parse size in square meters from text
   */
  protected parseSize(text: string | null): number | null {
    if (!text) return null;
    
    // Match numbers followed by optional sqm indicators
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:τ\.?μ\.?|m²|sqm)?/i);
    if (!match) return null;
    
    const size = parseFloat(match[1].replace(',', '.'));
    return isNaN(size) ? null : Math.round(size);
  }

  /**
   * Parse number of rooms/bedrooms from text
   */
  protected parseRooms(text: string | null): number | null {
    if (!text) return null;
    
    const match = text.match(/(\d+)/);
    if (!match) return null;
    
    const rooms = parseInt(match[1], 10);
    return isNaN(rooms) ? null : rooms;
  }

  /**
   * Create a new page
   */
  protected async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }
    return this.context.newPage();
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Random delay within range
   */
  protected randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

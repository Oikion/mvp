/**
 * Playwright-based scraper for JavaScript-heavy real estate sites
 * 
 * This module provides a fallback when HTTP+Cheerio scraping fails
 * because the target site renders content via JavaScript.
 * 
 * Note: Playwright requires browser binaries. In serverless environments,
 * consider using playwright-core with @playwright/browser-chromium or
 * a remote browser service.
 */

import type { RawListing, SearchFilters } from './types';
import { getPlatformConfig } from './platforms';

// Check if Playwright is available
let playwrightAvailable = false;
let chromium: typeof import('playwright-core').chromium | null = null;

async function initPlaywright() {
  if (chromium !== null) return playwrightAvailable;
  
  try {
    // Try to import playwright-core (lighter, no bundled browsers)
    // Use dynamic import with webpackIgnore to prevent bundling
    const pw = await import(/* webpackIgnore: true */ 'playwright-core');
    chromium = pw.chromium;
    playwrightAvailable = true;
    console.log('[Playwright] Successfully loaded playwright-core');
  } catch {
    try {
      // Fallback to full playwright
      // Use dynamic import with webpackIgnore to prevent bundling
      // @ts-ignore - optional fallback, playwright may not be installed
      const pw = await import(/* webpackIgnore: true */ 'playwright');
      chromium = pw.chromium;
      playwrightAvailable = true;
      console.log('[Playwright] Successfully loaded playwright');
    } catch {
      console.warn('[Playwright] Not available - install with: pnpm add playwright-core');
      playwrightAvailable = false;
    }
  }
  
  return playwrightAvailable;
}

/**
 * Check if Playwright scraping is available
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  return initPlaywright();
}

/**
 * Rate limiting state for Playwright requests
 */
const rateLimitState: Record<string, { count: number; windowStart: number }> = {};

/**
 * Check and enforce rate limiting
 */
function checkRateLimit(platformId: string, requestsPerMinute: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  
  if (!rateLimitState[platformId]) {
    rateLimitState[platformId] = { count: 0, windowStart: now };
  }
  
  const state = rateLimitState[platformId];
  
  if (now - state.windowStart > windowMs) {
    state.count = 0;
    state.windowStart = now;
  }
  
  if (state.count >= requestsPerMinute) {
    return false;
  }
  
  state.count++;
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay for human-like behavior
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Parse price from Greek format
 */
function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  
  const cleaned = text
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  const match = cleaned.match(/[\d.]+/);
  if (!match) return null;
  
  const price = parseFloat(match[0]);
  return isNaN(price) ? null : Math.round(price);
}

/**
 * Parse size in square meters
 */
function parseSize(text: string | null | undefined): number | null {
  if (!text) return null;
  
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:τ\.?μ\.?|m²|sqm)?/i);
  if (!match) return null;
  
  const size = parseFloat(match[1].replace(',', '.'));
  return isNaN(size) ? null : Math.round(size);
}

/**
 * Extract area from location string
 */
function extractAreaFromLocation(location: string | undefined): string | undefined {
  if (!location) return undefined;
  const parts = location.split(/[,\-–]/);
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return location.trim();
}

/**
 * Handle cookie consent dialogs on various platforms
 */
async function handleConsentDialog(page: { click: (selector: string, options?: { timeout?: number }) => Promise<void>; frames: () => { click: (selector: string, options?: { timeout?: number }) => Promise<void> }[] }): Promise<boolean> {
  const consentSelectors = [
    'button:has-text("AGREE")',
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Αποδοχή")',
    'button:has-text("OK")',
    '.qc-cmp2-summary-buttons button:first-child',
    '[class*="consent"] button[mode="primary"]',
    'button[class*="accept"]',
    '#onetrust-accept-btn-handler',
    '[data-testid="cookie-policy-dialog-accept-button"]'
  ];
  
  for (const selector of consentSelectors) {
    try {
      // Use click with short timeout - will throw if element not found
      await page.click(selector, { timeout: 2000 });
      console.log(`[Playwright] Clicked consent: ${selector}`);
      return true;
    } catch {
      // Element not found or not clickable, try next
    }
  }
  
  // Also try frame-based consent (some sites use iframes)
  try {
    const frames = page.frames();
    for (const frame of frames) {
      for (const selector of consentSelectors.slice(0, 3)) {
        try {
          await frame.click(selector, { timeout: 1000 });
          console.log(`[Playwright] Clicked consent in frame: ${selector}`);
          return true;
        } catch {
          // Try next
        }
      }
    }
  } catch {
    // Frame handling failed
  }
  
  return false;
}

/**
 * Scrape listings using Playwright (browser automation)
 */
export async function scrapeWithPlaywright(
  platformId: string,
  filters: SearchFilters,
  maxPages: number
): Promise<RawListing[]> {
  const available = await initPlaywright();
  if (!available || !chromium) {
    console.error('[Playwright] Not available, cannot scrape');
    return [];
  }
  
  const config = getPlatformConfig(platformId);
  if (!config) {
    console.error(`[Playwright] Unknown platform: ${platformId}`);
    return [];
  }
  
  const listings: RawListing[] = [];
  const processedIds = new Set<string>();
  
  let browser;
  try {
    // Launch browser with stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--window-size=1920,1080'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
      timezoneId: 'Europe/Athens',
      // Bypass some anti-bot measures
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
    });
    
    const page = await context.newPage();
    
    // Make navigator.webdriver undefined to avoid detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // DON'T block resources - we need the full page to load properly
    // The consent dialog and listings might depend on CSS/JS
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Check rate limit
      if (!checkRateLimit(platformId, config.rateLimit.requests)) {
        console.log(`[Playwright] Rate limit reached for ${platformId}, waiting...`);
        await sleep(60000 / config.rateLimit.requests);
      }
      
      // Build URL based on platform
      const url = buildPlaywrightUrl(platformId, config, filters, pageNum);
      console.log(`[Playwright] Scraping page ${pageNum}: ${url}`);
      
      try {
        // Navigate with timeout
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Wait for page to settle and consent dialog to appear
        console.log(`[Playwright] Waiting for page to load...`);
        await sleep(4000);
        
        // Handle cookie consent dialogs - use page.click with timeout
        console.log(`[Playwright] Checking for consent dialog...`);
        const consentClicked = await handleConsentDialog(page);
        console.log(`[Playwright] Consent handled: ${consentClicked}`);
        
        // Wait for content to fully load after consent
        await sleep(randomDelay(4000, 6000));
        
        // Try to wait for listing elements with various selectors
        const listingSelectors = [
          'a[href*="/property/"]',
          config.selectors?.listingCard || 'article',
          '[class*="listing"]',
          '[class*="property-card"]'
        ];
        
        for (const selector of listingSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            console.log(`[Playwright] Found elements with selector: ${selector}`);
            break;
          } catch {
            // Try next selector
          }
        }
        
        // Get anchor count for debugging
        const anchorCount = await page.evaluate(() => document.querySelectorAll('a').length);
        const propertyLinkCount = await page.evaluate(() => document.querySelectorAll('a[href*="/property/"]').length);
        console.log(`[Playwright] Page has ${anchorCount} anchors, ${propertyLinkCount} property links`);
        
        // Extract listings from page - platform-specific logic
        const pageListings = await page.evaluate((platform: string) => {
          const listings: Array<{
            id: string;
            url: string;
            title: string;
            price: string;
            location: string;
            size: string;
            bedrooms: string;
            images: string[];
          }> = [];
          
          const processedIds = new Set<string>();
          
          // ============================================
          // TOSPITIMOU.GR - Search result cards
          // ============================================
          if (platform === 'tospitimou') {
            const cards = document.querySelectorAll('.search-result[id^="result-row_"], [data-targeturl*="/property/"]');
            
            if (cards.length > 0) {
              cards.forEach(card => {
                try {
                  const cardId = card.getAttribute('id')?.replace('result-row_', '') || '';
                  const targetUrl = card.getAttribute('data-targeturl') || '';
                  const idMatch = targetUrl.match(/\/property\/(\d+)/);
                  const id = cardId || (idMatch ? idMatch[1] : '');
                  
                  if (!id || processedIds.has(id)) return;
                  processedIds.add(id);
                  
                  const fullText = card.textContent || '';
                  
                  const titleEl = card.querySelector('h2 a, .searchResultsH2 a, h2');
                  let title = titleEl?.textContent?.trim() || '';
                  title = title.replace(/VIP|NEW|REDUCED/gi, '').trim();
                  
                  const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
                  const size = sizeMatch ? sizeMatch[1] : '';
                  
                  // Tospitimou shows price per sqm - calculate total
                  const pricePerSqmMatch = fullText.match(/€\s*([\d,.\s]+)\s*\/\s*(?:sq\.?m|m²)/i);
                  let price = '';
                  
                  if (pricePerSqmMatch && size) {
                    const pricePerSqm = pricePerSqmMatch[1].replace(/[\s.]/g, '').replace(',', '');
                    const sizeNum = parseFloat(size.replace(',', '.'));
                    const pricePerSqmNum = parseFloat(pricePerSqm);
                    if (!isNaN(sizeNum) && !isNaN(pricePerSqmNum)) {
                      price = `€${Math.round(sizeNum * pricePerSqmNum)}`;
                    }
                  } else {
                    const directPriceMatch = fullText.match(/€\s*([\d,.\s]+)(?!\s*\/)/);
                    if (directPriceMatch) {
                      price = `€${directPriceMatch[1].trim()}`;
                    }
                  }
                  
                  const bedroomMatch = fullText.match(/(\d+)\s*(?:Bedroom|υπν)/i);
                  const urlMatch = targetUrl.match(/(?:sale|rent)-[^-]+-(.+?)\/property/);
                  
                  // Extract images - get all images from the card
                  const images: string[] = [];
                  const imgEls = card.querySelectorAll('img');
                  imgEls.forEach(imgEl => {
                    const src = imgEl.getAttribute('src') || 
                                imgEl.getAttribute('data-src') || 
                                imgEl.getAttribute('data-lazy-src') ||
                                imgEl.getAttribute('data-original');
                    if (src && 
                        !src.includes('placeholder') && 
                        !src.includes('logo') &&
                        !src.includes('avatar') &&
                        !src.includes('icon') &&
                        !src.includes('data:image') &&
                        (src.startsWith('http') || src.startsWith('//'))) {
                      // Normalize URL
                      const normalizedSrc = src.startsWith('//') ? `https:${src}` : src;
                      if (!images.includes(normalizedSrc)) {
                        images.push(normalizedSrc);
                      }
                    }
                  });
                  // Also check for background images on carousel elements
                  const carouselEls = card.querySelectorAll('[style*="background-image"], .swiper-slide, .carousel-item');
                  carouselEls.forEach(el => {
                    const style = el.getAttribute('style') || '';
                    const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
                    if (bgMatch && bgMatch[1] && 
                        !bgMatch[1].includes('placeholder') && 
                        !bgMatch[1].includes('data:image')) {
                      const src = bgMatch[1].startsWith('//') ? `https:${bgMatch[1]}` : bgMatch[1];
                      if (!images.includes(src)) {
                        images.push(src);
                      }
                    }
                  });
                  
                  listings.push({
                    id,
                    url: targetUrl.trim() || `https://en.tospitimou.gr/property/${id}`,
                    title,
                    price,
                    location: urlMatch ? urlMatch[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim() : '',
                    size,
                    bedrooms: bedroomMatch ? bedroomMatch[1] : '',
                    images
                  });
                } catch {
                  // Skip invalid card
                }
              });
            }
          }
          
          // ============================================
          // XE.GR - Property cards with data attributes
          // ============================================
          if (platform === 'xe_gr') {
            // Try to find property cards using multiple selectors
            const cardSelectors = [
              '[data-testid="property-card"]',
              '[data-property-id]',
              'article[class*="PropertyCard"]',
              'div[class*="ResultCard"]',
              'a[href*="/property/d/"]'
            ];
            
            for (const selector of cardSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                elements.forEach(el => {
                  try {
                    // Find the link to extract ID
                    const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/property/d/"]');
                    if (!linkEl) return;
                    
                    const href = linkEl.getAttribute('href') || '';
                    const idMatch = href.match(/\/property\/d\/(\d+)/);
                    const id = el.getAttribute('data-property-id') || (idMatch ? idMatch[1] : '');
                    
                    if (!id || processedIds.has(id)) return;
                    processedIds.add(id);
                    
                    // Get container for extraction
                    const container = el.closest('article, div[class*="Card"]') || el;
                    const fullText = container.textContent || '';
                    
                    // Extract price - XE uses € with period as thousands separator
                    const priceMatch = fullText.match(/€\s*([\d.]+(?:,\d+)?)/);
                    let price = '';
                    if (priceMatch) {
                      price = `€${priceMatch[1]}`;
                    }
                    
                    // Extract size
                    const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|τ\.?μ\.?)/i);
                    const size = sizeMatch ? sizeMatch[1] : '';
                    
                    // Extract bedrooms
                    const bedroomMatch = fullText.match(/(\d+)\s*(?:υπν|bed|δωμ)/i);
                    
                    // Extract title
                    const titleEl = container.querySelector('h2, h3, [class*="title"], [class*="Title"]');
                    const title = titleEl?.textContent?.trim() || linkEl.getAttribute('title') || '';
                    
                    // Extract location
                    const locationEl = container.querySelector('[class*="location"], [class*="Location"], [class*="address"]');
                    const location = locationEl?.textContent?.trim() || '';
                    
                    // Extract images - comprehensive extraction
                    const images: string[] = [];
                    container.querySelectorAll('img, [data-src], picture source').forEach(el => {
                      const src = el.getAttribute('src') || 
                                  el.getAttribute('data-src') || 
                                  el.getAttribute('data-lazy-src') ||
                                  el.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
                                  el.getAttribute('data-original');
                      if (src && 
                          !src.includes('placeholder') && 
                          !src.includes('logo') &&
                          !src.includes('avatar') &&
                          !src.includes('icon') &&
                          !src.includes('data:image') &&
                          !src.includes('blank.gif') &&
                          (src.startsWith('http') || src.startsWith('//'))) {
                        const normalizedSrc = src.startsWith('//') ? `https:${src}` : src;
                        if (!images.includes(normalizedSrc)) {
                          images.push(normalizedSrc);
                        }
                      }
                    });
                    // Check for background images
                    container.querySelectorAll('[style*="background-image"]').forEach(el => {
                      const style = el.getAttribute('style') || '';
                      const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
                      if (bgMatch && bgMatch[1] && !bgMatch[1].includes('data:image')) {
                        const src = bgMatch[1].startsWith('//') ? `https:${bgMatch[1]}` : bgMatch[1];
                        if (!images.includes(src)) images.push(src);
                      }
                    });
                    
                    listings.push({
                      id,
                      url: href.startsWith('http') ? href : `https://www.xe.gr${href}`,
                      title,
                      price,
                      location,
                      size,
                      bedrooms: bedroomMatch ? bedroomMatch[1] : '',
                      images
                    });
                  } catch {
                    // Skip invalid element
                  }
                });
                break; // Found cards with this selector, no need to try others
              }
            }
          }
          
          // ============================================
          // SPITOGATOS.GR - React-based property cards
          // ============================================
          if (platform === 'spitogatos') {
            const cardSelectors = [
              '[data-testid="property-card"]',
              'article[class*="PropertyCard"]',
              'div[class*="ResultItem"]',
              '.property-card',
              'a[href*="/aggelies/"]'
            ];
            
            for (const selector of cardSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                elements.forEach(el => {
                  try {
                    const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/aggelies/"], a[href*="/property/"]');
                    if (!linkEl) return;
                    
                    const href = linkEl.getAttribute('href') || '';
                    const idMatch = href.match(/\/aggelies\/(\d+)|\/property\/(\d+)/);
                    const id = idMatch ? (idMatch[1] || idMatch[2]) : '';
                    
                    if (!id || processedIds.has(id)) return;
                    processedIds.add(id);
                    
                    const container = el.closest('article, div[class*="Card"]') || el;
                    const fullText = container.textContent || '';
                    
                    // Extract price
                    const priceMatch = fullText.match(/€\s*([\d.]+(?:,\d+)?)/);
                    const price = priceMatch ? `€${priceMatch[1]}` : '';
                    
                    // Extract size
                    const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|τ\.?μ\.?)/i);
                    const size = sizeMatch ? sizeMatch[1] : '';
                    
                    // Extract bedrooms
                    const bedroomMatch = fullText.match(/(\d+)\s*(?:υπν|bed|δωμ)/i);
                    
                    // Extract title
                    const titleEl = container.querySelector('h2, h3, [class*="title"], [data-testid="title"]');
                    const title = titleEl?.textContent?.trim() || '';
                    
                    // Extract location
                    const locationEl = container.querySelector('[class*="location"], [data-testid="location"], [class*="area"]');
                    const location = locationEl?.textContent?.trim() || '';
                    
                    // Extract images - comprehensive extraction for Spitogatos
                    const images: string[] = [];
                    container.querySelectorAll('img, [data-src], picture source').forEach(el => {
                      const src = el.getAttribute('src') || 
                                  el.getAttribute('data-src') || 
                                  el.getAttribute('data-lazy-src') ||
                                  el.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
                                  el.getAttribute('data-original');
                      if (src && 
                          !src.includes('placeholder') && 
                          !src.includes('logo') &&
                          !src.includes('avatar') &&
                          !src.includes('icon') &&
                          !src.includes('data:image') &&
                          !src.includes('blank.gif') &&
                          (src.startsWith('http') || src.startsWith('//'))) {
                        const normalizedSrc = src.startsWith('//') ? `https:${src}` : src;
                        if (!images.includes(normalizedSrc)) {
                          images.push(normalizedSrc);
                        }
                      }
                    });
                    // Check for background images on carousel/slider elements
                    container.querySelectorAll('[style*="background-image"], .swiper-slide, .slick-slide').forEach(el => {
                      const style = el.getAttribute('style') || '';
                      const bgMatch = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
                      if (bgMatch && bgMatch[1] && !bgMatch[1].includes('data:image')) {
                        const src = bgMatch[1].startsWith('//') ? `https:${bgMatch[1]}` : bgMatch[1];
                        if (!images.includes(src)) images.push(src);
                      }
                    });
                    
                    listings.push({
                      id,
                      url: href.startsWith('http') ? href : `https://www.spitogatos.gr${href}`,
                      title,
                      price,
                      location,
                      size,
                      bedrooms: bedroomMatch ? bedroomMatch[1] : '',
                      images
                    });
                  } catch {
                    // Skip invalid element
                  }
                });
                break;
              }
            }
          }
          
          // ============================================
          // FALLBACK: Generic property link extraction
          // ============================================
          if (listings.length === 0) {
            const allAnchors = document.querySelectorAll('a[href*="/property/"], a[href*="/aggelies/"]');
            
            allAnchors.forEach(anchor => {
              try {
                const href = anchor.getAttribute('href') || '';
                const idMatch = href.match(/\/property\/(?:d\/)?(\d+)|\/aggelies\/(\d+)/);
                const id = idMatch ? (idMatch[1] || idMatch[2]) : '';
                
                if (!id || processedIds.has(id)) return;
                
                // Skip non-listing URLs
                if (href.includes('/search') || href.includes('/filter')) return;
                
                processedIds.add(id);
                
                const container = anchor.closest('.search-result, .card, article, div[class*="Card"]') || anchor.parentElement?.parentElement;
                const fullText = container?.textContent || '';
                
                const sizeMatch = fullText.match(/(\d+)\s*(?:m²|m2|τ\.?μ\.?)/i);
                const priceMatch = fullText.match(/€\s*([\d,.\s]+)/);
                const bedroomMatch = fullText.match(/(\d+)\s*(?:Bedroom|bed|υπν)/i);
                
                listings.push({
                  id,
                  url: href.startsWith('http') ? href : `${window.location.origin}${href}`,
                  title: anchor.textContent?.trim() || '',
                  price: priceMatch ? `€${priceMatch[1].trim()}` : '',
                  location: '',
                  size: sizeMatch ? sizeMatch[1] : '',
                  bedrooms: bedroomMatch ? bedroomMatch[1] : '',
                  images: []
                });
              } catch {
                // Skip invalid anchor
              }
            });
          }
          
          return listings;
        }, platformId);
        
        // Process extracted listings
        for (const item of pageListings) {
          if (processedIds.has(item.id)) continue;
          processedIds.add(item.id);
          
          listings.push({
            sourceListingId: item.id,
            sourceUrl: item.url,
            title: item.title || undefined,
            price: parsePrice(item.price) ?? undefined,
            priceText: item.price || undefined,
            transactionType: filters.transactionType || 'sale',
            address: item.location || undefined,
            area: extractAreaFromLocation(item.location),
            sizeSqm: parseSize(item.size) ?? undefined,
            bedrooms: item.bedrooms ? parseInt(item.bedrooms.match(/\d+/)?.[0] || '0', 10) : undefined,
            images: item.images.length > 0 ? item.images : undefined,
            rawData: { playwright: true }
          });
        }
        
        console.log(`[Playwright] Found ${pageListings.length} listings on page ${pageNum}`);
        
        // Check for next page - use valid CSS selectors only (no :contains)
        const hasNextPage = await page.evaluate(() => {
          // Try various selectors for next page button
          const selectors = [
            'a[rel="next"]',
            '[aria-label="Next"]',
            '[aria-label="Επόμενη"]',
            'button[class*="next"]:not(:disabled)',
            'a[class*="next"]:not(.disabled)',
            '.pagination a[class*="next"]',
            '[class*="pagination"] [class*="next"]'
          ];
          
          for (const selector of selectors) {
            try {
              const el = document.querySelector(selector);
              if (el && !el.classList.contains('disabled')) {
                return true;
              }
            } catch {
              // Invalid selector, skip
            }
          }
          return false;
        });
        
        if (!hasNextPage) {
          console.log(`[Playwright] No more pages after page ${pageNum}`);
          break;
        }
        
        // Add delay between pages
        await sleep(randomDelay(2000, 4000));
        
      } catch (error) {
        console.error(`[Playwright] Error on page ${pageNum}:`, error);
        // Continue to next page on error
      }
    }
    
  } catch (error) {
    console.error('[Playwright] Browser error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log(`[Playwright] Total listings collected: ${listings.length}`);
  return listings;
}

/**
 * Build URL for Playwright scraping
 * 
 * Each platform has specific URL patterns:
 * - Spitogatos: /pwlisi/katoikies (sale) or /enoikiasi/katoikies (rent)
 * - XE.gr: /en/property/r/property-for-sale or /en/property/r/property-to-rent
 * - Tospitimou: /property/for-sale/houses/Athens-Center/area-ids_%5B100%5D,category_residential
 */
function buildPlaywrightUrl(
  platformId: string,
  config: ReturnType<typeof getPlatformConfig>,
  filters: SearchFilters,
  page: number
): string {
  if (!config) return '';
  
  const transaction = filters.transactionType || 'sale';
  const params = new URLSearchParams();
  
  // Area ID mapping for location-based searches
  const areaIdMap: Record<string, string> = {
    'athens': '100',
    'athens-center': '100',
    'αθήνα': '100',
    'athens-north': '101',
    'athens-south': '102',
    'piraeus': '105',
    'thessaloniki': '108',
    'θεσσαλονίκη': '108',
  };
  
  switch (platformId) {
    case 'spitogatos': {
      // Greek URL structure works better for scraping
      const path = transaction === 'rent' ? '/enoikiasi/katoikies' : '/pwlisi/katoikies';
      
      // Add price filters
      if (filters.minPrice) params.set('price_from', String(filters.minPrice));
      if (filters.maxPrice) params.set('price_to', String(filters.maxPrice));
      
      // Add size filters
      if (filters.minSize) params.set('size_from', String(filters.minSize));
      if (filters.maxSize) params.set('size_to', String(filters.maxSize));
      
      // Add area filter
      if (filters.areas && filters.areas.length > 0) {
        params.set('geo_area_txt', filters.areas[0]);
      }
      
      // Pagination
      if (page > 1) params.set('page', String(page));
      
      // Sort by newest
      params.set('sort', 'date');
      params.set('order', 'desc');
      
      const query = params.toString();
      return `${config.baseUrl}${path}${query ? `?${query}` : ''}`;
    }
    
    case 'xe_gr': {
      // Path-based URL structure: /en/property/r/property-{transaction}
      const transactionPath = transaction === 'rent' ? 'to-rent' : 'for-sale';
      let path = `/en/property/r/property-${transactionPath}`;
      
      // Add location to path if specified
      if (filters.areas && filters.areas.length > 0) {
        const areaName = filters.areas[0].toLowerCase().replace(/\s+/g, '-');
        const areaId = areaIdMap[areaName] || areaIdMap[filters.areas[0].toLowerCase()];
        if (areaId) {
          const formattedArea = areaName.split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join('-');
          path += `/${areaId}_${formattedArea}`;
        }
      }
      
      // Pagination via query param
      if (page > 1) params.set('page', String(page));
      
      const query = params.toString();
      return `${config.baseUrl}${path}${query ? `?${query}` : ''}`;
    }
    
    case 'tospitimou': {
      // Path-based URL structure with English subdomain
      // /property/{transaction}/houses/{location}/area-ids_%5B{id}%5D,category_residential
      const transactionPath = transaction === 'rent' ? 'to-rent' : 'for-sale';
      
      // Determine location path
      let locationPath = 'Athens-Center';
      let areaId = '100';
      
      if (filters.areas && filters.areas.length > 0) {
        const areaName = filters.areas[0].toLowerCase().replace(/\s+/g, '-');
        const foundId = areaIdMap[areaName] || areaIdMap[filters.areas[0].toLowerCase()];
        if (foundId) {
          areaId = foundId;
          locationPath = areaName.split('-').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join('-');
        } else {
          // Use area name as-is for location slug
          locationPath = filters.areas[0].split(/[\s-]+/).map(w => 
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          ).join('-');
        }
      }
      
      // Build path with URL-encoded brackets
      const path = `/property/${transactionPath}/houses/${locationPath}/area-ids_%5B${areaId}%5D,category_residential`;
      
      // Add price filters
      if (filters.minPrice) params.set('price_from', String(filters.minPrice));
      if (filters.maxPrice) params.set('price_to', String(filters.maxPrice));
      
      // Add size filters
      if (filters.minSize) params.set('size_from', String(filters.minSize));
      if (filters.maxSize) params.set('size_to', String(filters.maxSize));
      
      // Pagination - Tospitimou uses 'p' not 'page'
      if (page > 1) params.set('p', String(page));
      
      const query = params.toString();
      return `${config.baseUrl}${path}${query ? `?${query}` : ''}`;
    }
    
    default:
      return config.baseUrl;
  }
}

/**
 * Export convenience function matching HTTP scraper interface
 */
export async function fetchListingsWithPlaywright(
  platformId: string,
  filters: {
    areas: string[];
    municipalities: string[];
    minPrice?: number;
    maxPrice?: number;
    propertyTypes: string[];
    transactionTypes: string[];
  },
  maxPages: number
): Promise<RawListing[]> {
  const searchFilters: SearchFilters = {
    transactionType: (filters.transactionTypes[0] as 'sale' | 'rent') || 'sale',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    areas: filters.areas.length > 0 ? filters.areas : filters.municipalities,
  };
  
  return scrapeWithPlaywright(platformId, searchFilters, maxPages);
}

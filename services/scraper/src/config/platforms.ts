import type { PlatformConfig } from '../types/index.js';

/**
 * Platform configurations for Greek real estate portals
 * 
 * Updated January 2026 with correct URL patterns and selectors
 * based on live site analysis.
 * 
 * Notes on rate limiting:
 * - Spitogatos: Largest platform, HEAVY JS rendering, needs Playwright
 * - XE.gr: Path-based URLs, JSON-LD structured data available
 * - Tospitimou: English subdomain for reliable parsing, price/sqm format
 * 
 * All rate limits are conservative to avoid IP blocking
 */
export const PLATFORMS: Record<string, PlatformConfig> = {
  /**
   * Spitogatos.gr - Largest Greek real estate platform (450K+ listings)
   * 
   * URL Patterns:
   *   - Greek search (preferred): /pwlisi/katoikies (sale), /enoikiasi/katoikies (rent)
   *   - English search: /en/search, /en/properties-for-sale
   *   - Detail pages: /aggelies/{id} or /en/property/{id}
   * 
   * IMPORTANT: Uses heavy JavaScript rendering - Playwright REQUIRED
   */
  spitogatos: {
    id: 'spitogatos',
    name: 'Spitogatos',
    baseUrl: 'https://www.spitogatos.gr',
    searchPath: '/pwlisi/katoikies', // Greek path works better
    useSkyvern: false,
    rateLimit: {
      requests: 15,
      perMinutes: 1
    },
    pagination: {
      type: 'query',
      param: 'page',
      maxPages: 50
    },
    selectors: {
      listingCard: '[data-testid="property-card"], article[class*="PropertyCard"], div[class*="ResultItem"], .property-card',
      listingLink: 'a[href*="/aggelies/"], a[href*="/en/property/"]',
      price: '[data-testid="price"], [class*="Price"], span[class*="price"]',
      title: '[data-testid="title"], [class*="Title"], h2[class*="title"]',
      location: '[data-testid="location"], [class*="Location"], [class*="Area"]',
      size: '[data-testid="size"], [class*="Size"], span:contains("τ.μ.")',
      bedrooms: '[data-testid="bedrooms"], [class*="Bedroom"], [class*="Room"]',
      bathrooms: '[data-testid="bathrooms"], [class*="Bathroom"]',
      propertyType: '[data-testid="property-type"], [class*="PropertyType"]',
      agencyName: '[data-testid="agency"], [class*="Agency"], [class*="Realtor"]',
      agencyPhone: '[data-testid="phone"], [class*="Phone"], a[href^="tel:"]',
      images: 'img[data-testid="property-image"], img[data-src*="spitogatos"], img[src*="cloudfront"]',
      nextPage: '[data-testid="next-page"], a[rel="next"], button[aria-label="Επόμενη"]',
      noResults: '[data-testid="empty-state"], [class*="EmptyResults"], [class*="NoResults"]'
    }
  },

  /**
   * XE.gr - Second largest Greek real estate platform
   * 
   * URL Pattern: /en/property/r/{type}-for-{transaction}
   * Examples:
   *   - https://www.xe.gr/en/property/r/property-for-sale
   *   - https://www.xe.gr/en/property/r/apartment-for-sale
   *   - https://www.xe.gr/en/property/r/property-to-rent
   * 
   * Has JSON-LD structured data which is most reliable for extraction
   */
  xe_gr: {
    id: 'xe_gr',
    name: 'XE.gr',
    baseUrl: 'https://www.xe.gr', // Note: NOT /property - path-based routing
    searchPath: '/en/property/r/property-for-sale',
    useSkyvern: false,
    rateLimit: {
      requests: 20,
      perMinutes: 1
    },
    pagination: {
      type: 'query',
      param: 'page',
      maxPages: 50
    },
    selectors: {
      listingCard: '[data-testid="property-card"], [data-property-id], article[class*="PropertyCard"], div[class*="ResultCard"]',
      listingLink: 'a[href*="/property/d/"], a[href*="/en/property/d/"]',
      price: '[data-testid="price"], [class*="Price"], span[class*="price"]',
      title: '[data-testid="title"], [class*="Title"], h2[class*="title"]',
      location: '[data-testid="location"], [class*="Location"], [class*="Address"]',
      size: '[data-testid="size"], [class*="Size"], span:contains("m²")',
      bedrooms: '[data-testid="bedrooms"], [class*="Bedroom"], [class*="Room"]',
      bathrooms: '[data-testid="bathrooms"], [class*="Bathroom"]',
      propertyType: '[data-testid="property-type"], [class*="Type"]',
      agencyName: '[data-testid="agency"], [class*="Agency"], [class*="Realtor"]',
      agencyPhone: '[data-testid="phone"], [class*="Phone"], a[href^="tel:"]',
      images: 'img[data-testid="property-image"], img[class*="PropertyImage"], img[src*="xe.gr"]',
      nextPage: 'a[rel="next"], button[aria-label="Next"], button[aria-label="Επόμενη"]',
      noResults: '[data-testid="empty-state"], [class*="EmptyState"], [class*="NoResults"]'
    }
  },

  /**
   * Tospitimou.gr - Agency-focused real estate platform
   * 
   * URL Pattern: /property/{transaction}/houses/{location}/area-ids_{id},category_residential
   * Examples:
   *   - https://en.tospitimou.gr/property/for-sale/houses/Athens-Center/area-ids_%5B100%5D,category_residential
   *   - https://en.tospitimou.gr/property/to-rent/houses/Athens-North/area-ids_%5B101%5D,category_residential
   * 
   * Uses English subdomain for better parsing. Price per sqm shown prominently.
   * Listing cards have .search-result class with id="result-row_{id}"
   */
  tospitimou: {
    id: 'tospitimou',
    name: 'Tospitimou',
    baseUrl: 'https://en.tospitimou.gr', // English subdomain for reliable parsing
    searchPath: '/property/for-sale/houses',
    useSkyvern: false,
    rateLimit: {
      requests: 25,
      perMinutes: 1
    },
    pagination: {
      type: 'query',
      param: 'p', // Uses 'p' for pagination (not 'page')
      maxPages: 50
    },
    selectors: {
      listingCard: '.search-result[id^="result-row_"], [data-targeturl*="/property/"], .property-card',
      listingLink: 'a[href*="/property/"], [data-targeturl]',
      price: '.priceArea, [class*="price"], span:contains("€")',
      title: '.searchResultsH2 a, h2 a, [class*="title"]',
      location: '[class*="location"], [class*="address"], [class*="area"]',
      size: 'span:contains("m2"), span:contains("m²"), [class*="size"]',
      bedrooms: 'span:contains("Bedroom"), [class*="bedroom"]',
      bathrooms: 'span:contains("Bathroom"), [class*="bathroom"]',
      propertyType: '[class*="type"], [class*="category"]',
      agencyName: '[class*="agent"], [class*="agency"]',
      agencyPhone: 'a[href^="tel:"], [class*="phone"]',
      images: 'img[src*="spitogatos.gr"], img[src*="tospitimou"], img.lazy',
      nextPage: 'a[rel="next"], .pagination a.next, [class*="pagination"] li:last-child a',
      noResults: '.no-results, .empty-state, .noListings, [class*="empty"]'
    }
  }
};

/**
 * Get platform configuration by ID
 */
export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return PLATFORMS[platformId];
}

/**
 * Get all platform IDs
 */
export function getAllPlatformIds(): string[] {
  return Object.keys(PLATFORMS);
}

/**
 * Check if a platform requires Skyvern for scraping
 */
export function requiresSkyvern(platformId: string): boolean {
  return PLATFORMS[platformId]?.useSkyvern ?? false;
}

import type { PlatformConfig } from './types';

/**
 * Platform configurations for Greek real estate portals
 * 
 * Updated January 2026 with correct URL patterns and selectors
 * based on live site analysis.
 */
export const PLATFORMS: Record<string, PlatformConfig> = {
  /**
   * Spitogatos.gr - Largest Greek real estate platform (450K+ listings)
   * 
   * URL Patterns (January 2026 verified):
   *   - Greek search (preferred): /pwlisi/katoikies (sale), /enoikiasi/katoikies (rent)
   *   - English search: /en/search, /en/properties-for-sale
   *   - Detail pages: /aggelies/{id} or /en/property/{id}
   * 
   * Site characteristics:
   *   - HEAVILY uses JavaScript rendering (React-based SPA)
   *   - HTTP scraping may return incomplete/empty results
   *   - Playwright fallback is REQUIRED for reliable data extraction
   *   - Uses data-testid attributes for React components
   *   - Images served from CloudFront CDN
   *   - Prices shown in € format with period as thousands separator
   *   - Has robust anti-bot measures - conservative rate limiting required
   */
  spitogatos: {
    id: 'spitogatos',
    name: 'Spitogatos.gr',
    baseUrl: 'https://www.spitogatos.gr',
    searchPath: '/pwlisi/katoikies', // Greek path works better for scraping
    rateLimit: {
      requests: 15, // Conservative to avoid blocking - site has anti-bot measures
      perMinutes: 1
    },
    pagination: {
      type: 'query',
      param: 'page',
      maxPages: 50
    },
    selectors: {
      // Spitogatos uses React with data-testid attributes
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
   * URL Pattern (January 2026 verified):
   *   - Base search: https://www.xe.gr/en/property/r/{type}-for-{transaction}
   *   - With location: https://www.xe.gr/en/property/r/{type}-for-{transaction}/{location_id}_{location_name}
   *   - Detail page: https://www.xe.gr/en/property/d/{listing_id}/{slug}
   * 
   * Examples:
   *   - https://www.xe.gr/en/property/r/property-for-sale
   *   - https://www.xe.gr/en/property/r/apartment-for-sale
   *   - https://www.xe.gr/en/property/r/property-to-rent
   *   - https://www.xe.gr/en/property/r/property-for-sale/100_Athens-Center
   * 
   * Site characteristics:
   *   - Uses React-based frontend with data attributes
   *   - JSON-LD structured data available (most reliable for extraction)
   *   - Prices shown in € format with period as thousands separator
   *   - May require JavaScript for some dynamic content
   */
  xe_gr: {
    id: 'xe_gr',
    name: 'XE.gr',
    baseUrl: 'https://www.xe.gr',
    searchPath: '/en/property/r/property-for-sale', // Path-based routing
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
      // XE.gr uses React components with consistent class naming
      listingCard: '[data-testid="property-card"], [data-property-id], article[class*="PropertyCard"], div[class*="ResultCard"]',
      listingLink: 'a[href*="/property/d/"], a[href*="/en/property/d/"]',
      price: '[data-testid="price"], [class*="Price"], span[class*="price"]',
      title: '[data-testid="title"], [class*="Title"], h2[class*="title"]',
      location: '[data-testid="location"], [class*="Location"], [class*="Address"]',
      size: '[data-testid="size"], [class*="Size"], span:contains("m²"), span:contains("τ.μ.")',
      bedrooms: '[data-testid="bedrooms"], [class*="Bedroom"], [class*="Room"]',
      bathrooms: '[data-testid="bathrooms"], [class*="Bathroom"]',
      propertyType: '[data-testid="property-type"], [class*="Type"]',
      agencyName: '[data-testid="agency"], [class*="Agency"], [class*="Realtor"]',
      agencyPhone: '[data-testid="phone"], [class*="Phone"], a[href^="tel:"]',
      images: 'img[data-testid="property-image"], img[class*="PropertyImage"], img[src*="xe.gr"]',
      nextPage: 'a[rel="next"], button[aria-label="Next"], button[aria-label="Επόμενη"], [class*="Pagination"] a:last-child',
      noResults: '[data-testid="empty-state"], [class*="EmptyState"], [class*="NoResults"]'
    }
  },

  /**
   * Tospitimou.gr - Agency-focused real estate platform
   * 
   * URL Pattern (January 2026 verified):
   *   - Search: https://en.tospitimou.gr/property/{transaction}/houses/{location}/area-ids_{id},category_residential
   *   - Detail: https://en.tospitimou.gr/{transaction}-{type}-{location}/property/{id}
   * 
   * Examples:
   *   - https://en.tospitimou.gr/property/for-sale/houses/Athens-Center/area-ids_%5B100%5D,category_residential
   *   - https://en.tospitimou.gr/property/to-rent/houses/Athens-North/area-ids_%5B101%5D,category_residential
   *   - https://en.tospitimou.gr/sale-apartment-flat-Athens-Center/property/12345678
   * 
   * Site characteristics:
   *   - Uses English subdomain for better scraping (en.tospitimou.gr)
   *   - Shares image CDN with Spitogatos (m2.spitogatos.gr)
   *   - Price per sqm shown prominently (e.g., "€ 2,577/sq.m.")
   *   - Total price can be calculated from price/sqm × size
   *   - Listing cards have .search-result class with id="result-row_{id}"
   *   - data-targeturl attribute contains full listing URL
   *   - Uses pagination param 'p' instead of 'page'
   */
  tospitimou: {
    id: 'tospitimou',
    name: 'Tospitimou.gr',
    baseUrl: 'https://en.tospitimou.gr', // English subdomain for reliable scraping
    searchPath: '/property/for-sale/houses',
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
      // Tospitimou-specific selectors based on actual site structure
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
 * Get platform display names
 */
export function getPlatformNames(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PLATFORMS).map(([id, config]) => [id, config.name])
  );
}

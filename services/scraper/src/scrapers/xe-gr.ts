import type { Page } from 'playwright';
import { BaseScraper } from './base.js';
import type { 
  PlatformConfig, 
  RawListing, 
  SearchFilters 
} from '../types/index.js';

/**
 * Scraper for XE.gr Property - Major Greek classifieds platform
 * 
 * Site structure:
 * - Search results: /property/search/... (paginated)
 * - Listing page: /property/d/... or /property/details/...
 * 
 * Notes:
 * - Has both HTML and JSON data in page
 * - Coordinates often available in structured data
 */
export class XeGrScraper extends BaseScraper {
  constructor(config: PlatformConfig) {
    super(config);
  }

  /**
   * Build search URL with filters
   */
  protected buildSearchUrl(filters?: SearchFilters, pageNum: number = 1): string {
    const baseUrl = `${this.platform.baseUrl}/search`;
    const params = new URLSearchParams();

    // Transaction type
    const transaction = filters?.transactionType || 'sale';
    if (transaction === 'rent') {
      params.set('transaction', 'rent');
    } else {
      params.set('transaction', 'sale');
    }

    // Price range
    if (filters?.minPrice) {
      params.set('price_from', String(filters.minPrice));
    }
    if (filters?.maxPrice) {
      params.set('price_to', String(filters.maxPrice));
    }

    // Size range
    if (filters?.minSize) {
      params.set('size_from', String(filters.minSize));
    }
    if (filters?.maxSize) {
      params.set('size_to', String(filters.maxSize));
    }

    // Bedrooms
    if (filters?.bedrooms) {
      params.set('rooms_from', String(filters.bedrooms));
    }

    // Property types
    if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
      const typeMapping: Record<string, string> = {
        'APARTMENT': 'apartment',
        'HOUSE': 'house',
        'MAISONETTE': 'maisonette',
        'VILLA': 'villa',
        'LAND': 'land',
        'COMMERCIAL': 'commercial'
      };
      const xeTypes = filters.propertyTypes
        .map(t => typeMapping[t])
        .filter(Boolean);
      if (xeTypes.length > 0) {
        params.set('property_type', xeTypes.join(','));
      }
    }

    // Area/Location
    if (filters?.areas && filters.areas.length > 0) {
      params.set('geo_place', filters.areas[0]);
    }

    // Pagination
    if (pageNum > 1) {
      params.set('page', String(pageNum));
    }

    // Sort by newest
    params.set('sort', 'date_desc');

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generator that yields listings from search results
   */
  protected async *scrapeListings(filters?: SearchFilters): AsyncGenerator<RawListing> {
    const page = await this.newPage();
    const maxPages = this.platform.pagination.maxPages || 100;
    
    try {
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        const url = this.buildSearchUrl(filters, currentPage);
        this.logger.info({ url, page: currentPage }, 'Scraping search page');

        await this.navigateTo(page, url);

        // Wait for listings
        await page.waitForSelector('.property-item, .listing-card, [data-property-id]', {
          timeout: 10000
        }).catch(() => {
          this.logger.warn('No listing cards found');
        });

        // Check for no results
        const noResults = await page.$('.no-results, .empty, .not-found');
        if (noResults) {
          this.logger.info('No results found');
          break;
        }

        // Try to extract JSON-LD structured data first
        const structuredData = await this.extractStructuredData(page);
        
        // Extract listings from page
        const listings = structuredData.length > 0 
          ? structuredData 
          : await this.extractListingsFromPage(page);
        
        if (listings.length === 0) {
          this.logger.info('No more listings found');
          break;
        }

        this.logger.info({ count: listings.length, page: currentPage }, 'Found listings');

        // Yield each listing
        for (const listing of listings) {
          try {
            // Get detailed information
            const detailedListing = await this.scrapeListingDetails(listing);
            yield detailedListing;
          } catch (err) {
            this.logger.warn({ err, listingId: listing.sourceListingId }, 'Failed to get details');
            yield listing;
          }
        }

        // Check for next page
        const nextButton = await page.$('.next-page, a[rel="next"], .pagination .next:not(.disabled)');
        hasMorePages = nextButton !== null;
        currentPage++;
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Extract JSON-LD structured data if available
   */
  private async extractStructuredData(page: Page): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    try {
      const scripts = await page.$$('script[type="application/ld+json"]');
      
      for (const script of scripts) {
        const content = await script.textContent();
        if (!content) continue;

        try {
          const data = JSON.parse(content);
          
          // Handle ItemList or array of offers
          const items = data['@type'] === 'ItemList' 
            ? data.itemListElement 
            : Array.isArray(data) ? data : [data];

          for (const item of items) {
            if (item['@type'] === 'Product' || item['@type'] === 'Residence') {
              const listing = this.parseStructuredListing(item);
              if (listing) listings.push(listing);
            }
          }
        } catch {
          // Not valid JSON or wrong format
        }
      }
    } catch (err) {
      this.logger.debug({ err }, 'Failed to extract structured data');
    }

    return listings;
  }

  /**
   * Parse structured data into RawListing
   */
  private parseStructuredListing(data: Record<string, unknown>): RawListing | null {
    try {
      const url = data.url as string;
      if (!url) return null;

      const idMatch = url.match(/\/d\/(\d+)|\/details\/(\d+)|\/(\d+)/);
      const sourceListingId = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : url;

      const offers = data.offers as Record<string, unknown> | undefined;
      const geo = data.geo as Record<string, unknown> | undefined;
      const address = data.address as Record<string, unknown> | undefined;

      return {
        sourceListingId,
        sourceUrl: url.startsWith('http') ? url : `${this.platform.baseUrl}${url}`,
        title: data.name as string | undefined,
        price: offers?.price ? Number(offers.price) : undefined,
        address: address?.streetAddress as string | undefined,
        area: address?.addressLocality as string | undefined,
        municipality: address?.addressRegion as string | undefined,
        postalCode: address?.postalCode as string | undefined,
        latitude: geo?.latitude ? Number(geo.latitude) : undefined,
        longitude: geo?.longitude ? Number(geo.longitude) : undefined,
        images: data.image ? (Array.isArray(data.image) ? data.image : [data.image]) as string[] : undefined,
        rawData: data as Record<string, unknown>
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract listings from HTML (fallback)
   */
  private async extractListingsFromPage(page: Page): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    const cards = await page.$$('.property-item, .listing-card, [data-property-id]');

    for (const card of cards) {
      try {
        // Extract URL and ID
        const linkElement = await card.$('a[href*="/property/"]');
        if (!linkElement) continue;

        const href = await linkElement.getAttribute('href');
        if (!href) continue;

        const idMatch = href.match(/\/d\/(\d+)|\/details\/(\d+)|property\/(\d+)/);
        const sourceListingId = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : href;
        const sourceUrl = href.startsWith('http') ? href : `${this.platform.baseUrl}${href}`;

        // Get property ID from data attribute if available
        const dataId = await card.getAttribute('data-property-id');
        const finalId = dataId || sourceListingId;

        // Extract card data
        const title = await this.getCardText(card, '.title, h2, h3');
        const priceText = await this.getCardText(card, '.price, [data-price]');
        const location = await this.getCardText(card, '.location, .address');
        const sizeText = await this.getCardText(card, '.size, .sqm, [data-size]');
        const bedroomsText = await this.getCardText(card, '.bedrooms, .rooms');
        const propertyType = await this.getCardText(card, '.property-type, .type');
        const agencyName = await this.getCardText(card, '.agency, .agent-name');

        // Extract images
        const imageEls = await card.$$('img');
        const images: string[] = [];
        for (const img of imageEls) {
          const src = await img.getAttribute('src') || await img.getAttribute('data-src');
          if (src && !src.includes('placeholder') && !src.includes('logo')) {
            images.push(src);
          }
        }

        listings.push({
          sourceListingId: finalId,
          sourceUrl,
          title: title || undefined,
          price: this.parsePrice(priceText) ?? undefined,
          priceText: priceText || undefined,
          propertyType: propertyType || undefined,
          address: location || undefined,
          sizeSqm: this.parseSize(sizeText) ?? undefined,
          bedrooms: this.parseRooms(bedroomsText) ?? undefined,
          agencyName: agencyName || undefined,
          images,
          rawData: { priceText, sizeText, bedroomsText, location }
        });
      } catch (err) {
        this.logger.warn({ err }, 'Failed to extract listing from card');
      }
    }

    return listings;
  }

  /**
   * Get text from element within card
   */
  private async getCardText(card: unknown, selector: string): Promise<string | null> {
    try {
      const el = await (card as { $(sel: string): Promise<unknown> }).$(selector);
      if (!el) return null;
      const text = await (el as { textContent(): Promise<string | null> }).textContent();
      return text?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Scrape detailed listing page
   */
  private async scrapeListingDetails(basicListing: RawListing): Promise<RawListing> {
    const page = await this.newPage();
    
    try {
      await this.navigateTo(page, basicListing.sourceUrl);

      await page.waitForSelector('.property-details, .listing-content, [data-testid="property"]', {
        timeout: 10000
      }).catch(() => {});

      const detailedListing = { ...basicListing };

      // Get structured data from detail page
      const structuredListings = await this.extractStructuredData(page);
      if (structuredListings.length > 0) {
        const structured = structuredListings[0];
        Object.assign(detailedListing, {
          latitude: structured.latitude ?? detailedListing.latitude,
          longitude: structured.longitude ?? detailedListing.longitude,
          address: structured.address ?? detailedListing.address,
          area: structured.area ?? detailedListing.area
        });
      }

      // Get additional details from HTML
      const fullTitle = await this.getText(page, 'h1, .property-title');
      if (fullTitle) detailedListing.title = fullTitle;

      const exactPrice = await this.getText(page, '.price-value, [data-price], .listing-price');
      if (exactPrice) {
        const parsed = this.parsePrice(exactPrice);
        if (parsed) detailedListing.price = parsed;
      }

      const fullAddress = await this.getText(page, '.address-full, .location-detail');
      if (fullAddress) detailedListing.address = fullAddress;

      // Property details table
      const details = await this.extractDetailsTable(page);
      if (details.bedrooms !== undefined) detailedListing.bedrooms = details.bedrooms;
      if (details.bathrooms !== undefined) detailedListing.bathrooms = details.bathrooms;
      if (details.size !== undefined) detailedListing.sizeSqm = details.size;
      if (details.floor !== undefined) detailedListing.floor = details.floor;
      if (details.yearBuilt !== undefined) detailedListing.yearBuilt = details.yearBuilt;

      // All images
      const allImages = await page.$$eval(
        '.gallery img, .photos img, [data-gallery] img',
        (imgs) => imgs.map(img => (img as HTMLImageElement).src || img.getAttribute('data-src')).filter(Boolean)
      );
      if (allImages.length > 0) {
        detailedListing.images = allImages as string[];
      }

      // Agency info
      const agency = await this.getText(page, '.agency-info .name, .agent-name, .broker-name');
      if (agency) detailedListing.agencyName = agency;

      const phone = await this.getText(page, '.agency-phone, .contact-phone, [href^="tel:"]');
      if (phone) detailedListing.agencyPhone = phone;

      // Get coordinates from map
      const mapData = await page.$eval('.map, [data-map]', (el) => {
        return {
          lat: el.getAttribute('data-lat') || el.getAttribute('data-latitude'),
          lng: el.getAttribute('data-lng') || el.getAttribute('data-longitude')
        };
      }).catch(() => null);

      if (mapData?.lat && mapData?.lng) {
        detailedListing.latitude = parseFloat(mapData.lat);
        detailedListing.longitude = parseFloat(mapData.lng);
      }

      return detailedListing;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract details from property info table
   */
  private async extractDetailsTable(page: Page): Promise<{
    bedrooms?: number;
    bathrooms?: number;
    size?: number;
    floor?: string;
    yearBuilt?: number;
  }> {
    const result: {
      bedrooms?: number;
      bathrooms?: number;
      size?: number;
      floor?: string;
      yearBuilt?: number;
    } = {};

    try {
      const rows = await page.$$('.property-details tr, .details-list li, .specs-item');
      
      for (const row of rows) {
        const text = await row.textContent();
        if (!text) continue;
        
        const textLower = text.toLowerCase();

        if (textLower.includes('υπνοδωμάτι') || textLower.includes('bedroom') || textLower.includes('δωμάτι')) {
          const match = text.match(/(\d+)/);
          if (match) result.bedrooms = parseInt(match[1], 10);
        }

        if (textLower.includes('μπάνι') || textLower.includes('bathroom') || textLower.includes('wc')) {
          const match = text.match(/(\d+)/);
          if (match) result.bathrooms = parseInt(match[1], 10);
        }

        if (textLower.includes('τ.μ') || textLower.includes('sqm') || textLower.includes('εμβαδ')) {
          const match = text.match(/(\d+(?:[.,]\d+)?)/);
          if (match) result.size = parseInt(match[1].replace(',', '.'), 10);
        }

        if (textLower.includes('όροφος') || textLower.includes('floor')) {
          const match = text.match(/:\s*(.+)/);
          if (match) result.floor = match[1].trim();
        }

        if (textLower.includes('κατασκευ') || textLower.includes('built') || textLower.includes('έτος')) {
          const match = text.match(/(\d{4})/);
          if (match) result.yearBuilt = parseInt(match[1], 10);
        }
      }
    } catch (err) {
      this.logger.debug({ err }, 'Failed to extract details table');
    }

    return result;
  }

  /**
   * Parse listing page (required by base class)
   */
  protected async parseListingPage(page: Page): Promise<RawListing> {
    const url = page.url();
    const idMatch = url.match(/\/d\/(\d+)|\/details\/(\d+)/);
    const sourceListingId = idMatch ? (idMatch[1] || idMatch[2]) : url;

    const title = await this.getText(page, 'h1, .property-title');
    const priceText = await this.getText(page, '.price-value, [data-price]');
    const price = this.parsePrice(priceText);
    const address = await this.getText(page, '.address, .location');

    return {
      sourceListingId,
      sourceUrl: url,
      title: title || undefined,
      price: price ?? undefined,
      address: address || undefined
    };
  }
}

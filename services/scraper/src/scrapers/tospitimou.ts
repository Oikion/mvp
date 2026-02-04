import type { Page } from 'playwright';
import { BaseScraper } from './base.js';
import type { 
  PlatformConfig, 
  RawListing, 
  SearchFilters 
} from '../types/index.js';

/**
 * Scraper for Tospitimou.gr - Greek real estate portal
 * 
 * Site structure:
 * - Search results: /search/... or /aggelies/...
 * - Listing page: /property/... 
 * 
 * Notes:
 * - Smaller platform, less aggressive anti-bot
 * - Traditional HTML structure
 */
export class TospitimouScraper extends BaseScraper {
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
    params.set('type', transaction === 'rent' ? 'enoikiasi' : 'polisi');

    // Price range
    if (filters?.minPrice) {
      params.set('price_min', String(filters.minPrice));
    }
    if (filters?.maxPrice) {
      params.set('price_max', String(filters.maxPrice));
    }

    // Size range
    if (filters?.minSize) {
      params.set('sqm_min', String(filters.minSize));
    }
    if (filters?.maxSize) {
      params.set('sqm_max', String(filters.maxSize));
    }

    // Bedrooms
    if (filters?.bedrooms) {
      params.set('rooms', String(filters.bedrooms));
    }

    // Property types
    if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
      const typeMapping: Record<string, string> = {
        'APARTMENT': 'diamerisma',
        'HOUSE': 'monokatoikia',
        'MAISONETTE': 'mezoneta',
        'VILLA': 'vila',
        'LAND': 'oikopedo',
        'COMMERCIAL': 'epaggelmatiko'
      };
      const types = filters.propertyTypes
        .map(t => typeMapping[t])
        .filter(Boolean);
      if (types.length > 0) {
        params.set('category', types[0]); // Usually supports single category
      }
    }

    // Location
    if (filters?.areas && filters.areas.length > 0) {
      params.set('location', filters.areas[0]);
    }

    // Pagination
    if (pageNum > 1) {
      params.set('page', String(pageNum));
    }

    // Sort by date
    params.set('sort', 'date');
    params.set('order', 'desc');

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generator that yields listings from search results
   */
  protected async *scrapeListings(filters?: SearchFilters): AsyncGenerator<RawListing> {
    const page = await this.newPage();
    const maxPages = this.platform.pagination.maxPages || 50;
    
    try {
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        const url = this.buildSearchUrl(filters, currentPage);
        this.logger.info({ url, page: currentPage }, 'Scraping search page');

        await this.navigateTo(page, url);

        // Wait for listings to load
        await page.waitForSelector('.property-card, .listing, .result-item', {
          timeout: 10000
        }).catch(() => {
          this.logger.warn('No listing cards found on page');
        });

        // Check for no results
        const noResults = await page.$('.no-results, .empty-state, .no-listings');
        if (noResults) {
          this.logger.info('No results found');
          break;
        }

        // Extract listings
        const listings = await this.extractListingsFromPage(page);
        
        if (listings.length === 0) {
          this.logger.info('No more listings found');
          break;
        }

        this.logger.info({ count: listings.length, page: currentPage }, 'Found listings');

        // Yield each listing
        for (const listing of listings) {
          try {
            const detailedListing = await this.scrapeListingDetails(listing);
            yield detailedListing;
          } catch (err) {
            this.logger.warn({ err, listingId: listing.sourceListingId }, 'Failed to get details');
            yield listing;
          }
        }

        // Check for next page
        const nextButton = await page.$('.next, .pagination-next:not(.disabled), a[rel="next"]');
        hasMorePages = nextButton !== null;
        currentPage++;
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Extract listings from search results page
   */
  private async extractListingsFromPage(page: Page): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    const cards = await page.$$('.property-card, .listing, .result-item, .property-item');

    for (const card of cards) {
      try {
        // Find link element
        const linkElement = await card.$('a[href*="/property/"], a[href*="/aggelies/"], a.listing-link');
        if (!linkElement) continue;

        const href = await linkElement.getAttribute('href');
        if (!href) continue;

        // Extract ID from URL
        const idMatch = href.match(/\/property\/(\d+)|\/aggelies\/(\d+)|id=(\d+)/);
        const sourceListingId = idMatch ? (idMatch[1] || idMatch[2] || idMatch[3]) : href;
        const sourceUrl = href.startsWith('http') ? href : `${this.platform.baseUrl}${href}`;

        // Extract basic info from card
        const titleEl = await card.$('.title, h2, h3, .property-title');
        const title = titleEl ? await titleEl.textContent() : null;

        const priceEl = await card.$('.price, .listing-price');
        const priceText = priceEl ? await priceEl.textContent() : null;
        const price = this.parsePrice(priceText);

        const locationEl = await card.$('.location, .address, .area');
        const location = locationEl ? await locationEl.textContent() : null;

        const sizeEl = await card.$('.size, .sqm, .area-size');
        const sizeText = sizeEl ? await sizeEl.textContent() : null;
        const sizeSqm = this.parseSize(sizeText);

        const bedroomsEl = await card.$('.bedrooms, .rooms');
        const bedroomsText = bedroomsEl ? await bedroomsEl.textContent() : null;
        const bedrooms = this.parseRooms(bedroomsText);

        const typeEl = await card.$('.type, .property-type, .category');
        const propertyType = typeEl ? await typeEl.textContent() : null;

        const agencyEl = await card.$('.agency, .agent, .realtor');
        const agencyName = agencyEl ? await agencyEl.textContent() : null;

        // Extract images
        const imageEls = await card.$$('img.photo, img.property-image, .gallery img');
        const images: string[] = [];
        for (const img of imageEls) {
          const src = await img.getAttribute('src') || await img.getAttribute('data-src');
          if (src && !src.includes('placeholder') && !src.includes('no-image')) {
            images.push(src.startsWith('http') ? src : `${this.platform.baseUrl}${src}`);
          }
        }

        listings.push({
          sourceListingId,
          sourceUrl,
          title: title?.trim() || undefined,
          price: price ?? undefined,
          priceText: priceText?.trim() || undefined,
          propertyType: propertyType?.trim() || undefined,
          address: location?.trim() || undefined,
          sizeSqm: sizeSqm ?? undefined,
          bedrooms: bedrooms ?? undefined,
          agencyName: agencyName?.trim() || undefined,
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
   * Scrape individual listing page for more details
   */
  private async scrapeListingDetails(basicListing: RawListing): Promise<RawListing> {
    const page = await this.newPage();
    
    try {
      await this.navigateTo(page, basicListing.sourceUrl);

      await page.waitForSelector('.property-details, .listing-details, .property-info', {
        timeout: 10000
      }).catch(() => {});

      const detailedListing = { ...basicListing };

      // Full title
      const fullTitle = await this.getText(page, 'h1, .property-title, .listing-title');
      if (fullTitle) detailedListing.title = fullTitle;

      // Exact price
      const exactPrice = await this.getText(page, '.price-value, .listing-price, .property-price');
      if (exactPrice) {
        const parsed = this.parsePrice(exactPrice);
        if (parsed) detailedListing.price = parsed;
      }

      // Full address
      const fullAddress = await this.getText(page, '.address, .location-full, .property-address');
      if (fullAddress) detailedListing.address = fullAddress;

      // Area/neighborhood
      const area = await this.getText(page, '.area, .neighborhood, .periochi');
      if (area) detailedListing.area = area;

      // Municipality
      const municipality = await this.getText(page, '.municipality, .dimos, .city');
      if (municipality) detailedListing.municipality = municipality;

      // Property details
      const detailsTable = await this.extractDetailsFromPage(page);
      if (detailsTable.bedrooms !== undefined) detailedListing.bedrooms = detailsTable.bedrooms;
      if (detailsTable.bathrooms !== undefined) detailedListing.bathrooms = detailsTable.bathrooms;
      if (detailsTable.size !== undefined) detailedListing.sizeSqm = detailsTable.size;
      if (detailsTable.floor !== undefined) detailedListing.floor = detailsTable.floor;
      if (detailsTable.yearBuilt !== undefined) detailedListing.yearBuilt = detailsTable.yearBuilt;
      if (detailsTable.propertyType) detailedListing.propertyType = detailsTable.propertyType;

      // All images from gallery
      const allImages = await page.$$eval(
        '.gallery img, .photos img, .property-images img, .carousel img',
        (imgs) => imgs.map(img => (img as HTMLImageElement).src || img.getAttribute('data-src')).filter(Boolean)
      );
      if (allImages.length > 0) {
        detailedListing.images = allImages.map(img => 
          (img as string).startsWith('http') ? img as string : `${this.platform.baseUrl}${img}`
        );
      }

      // Agency info
      const agency = await this.getText(page, '.agency-name, .agent-name, .realtor-name');
      if (agency) detailedListing.agencyName = agency;

      const phone = await this.getText(page, '.phone, .contact-phone, .tel');
      if (phone) detailedListing.agencyPhone = phone;

      // Coordinates (if available)
      const mapEl = await page.$('#map, .map, [data-lat]');
      if (mapEl) {
        const lat = await mapEl.getAttribute('data-lat') || await mapEl.getAttribute('data-latitude');
        const lng = await mapEl.getAttribute('data-lng') || await mapEl.getAttribute('data-longitude');
        if (lat && lng) {
          detailedListing.latitude = parseFloat(lat);
          detailedListing.longitude = parseFloat(lng);
        }
      }

      // Try to get coordinates from inline script
      if (!detailedListing.latitude || !detailedListing.longitude) {
        const coords = await this.extractCoordsFromScript(page);
        if (coords) {
          detailedListing.latitude = coords.lat;
          detailedListing.longitude = coords.lng;
        }
      }

      // Listing date
      const dateText = await this.getText(page, '.date, .listing-date, .published');
      if (dateText) {
        const date = this.parseDate(dateText);
        if (date) detailedListing.listingDate = date;
      }

      return detailedListing;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract property details from page
   */
  private async extractDetailsFromPage(page: Page): Promise<{
    bedrooms?: number;
    bathrooms?: number;
    size?: number;
    floor?: string;
    yearBuilt?: number;
    propertyType?: string;
  }> {
    const result: {
      bedrooms?: number;
      bathrooms?: number;
      size?: number;
      floor?: string;
      yearBuilt?: number;
      propertyType?: string;
    } = {};

    try {
      // Try details table/list
      const detailElements = await page.$$('.details tr, .specs li, .property-spec, .detail-item');
      
      for (const el of detailElements) {
        const text = await el.textContent();
        if (!text) continue;
        
        const textLower = text.toLowerCase();

        // Bedrooms
        if (textLower.includes('υπνοδωμάτι') || textLower.includes('κρεβατο') || textLower.includes('bedroom')) {
          const match = text.match(/(\d+)/);
          if (match) result.bedrooms = parseInt(match[1], 10);
        }

        // Bathrooms
        if (textLower.includes('μπάνι') || textLower.includes('wc') || textLower.includes('bathroom')) {
          const match = text.match(/(\d+)/);
          if (match) result.bathrooms = parseInt(match[1], 10);
        }

        // Size
        if (textLower.includes('τ.μ') || textLower.includes('m²') || textLower.includes('εμβαδ') || textLower.includes('sqm')) {
          const match = text.match(/(\d+(?:[.,]\d+)?)/);
          if (match) result.size = Math.round(parseFloat(match[1].replace(',', '.')));
        }

        // Floor
        if (textLower.includes('όροφος') || textLower.includes('floor') || textLower.includes('επίπεδο')) {
          const match = text.match(/:\s*(.+)/);
          if (match) result.floor = match[1].trim();
        }

        // Year built
        if (textLower.includes('κατασκευ') || textLower.includes('έτος') || textLower.includes('built')) {
          const match = text.match(/(\d{4})/);
          if (match) result.yearBuilt = parseInt(match[1], 10);
        }

        // Property type
        if (textLower.includes('τύπος') || textLower.includes('κατηγορία') || textLower.includes('type')) {
          const match = text.match(/:\s*(.+)/);
          if (match) result.propertyType = match[1].trim();
        }
      }

      // Also try specific selectors
      const bedroomsEl = await page.$('[data-bedrooms], .bedrooms .value');
      if (bedroomsEl && !result.bedrooms) {
        const text = await bedroomsEl.textContent();
        const match = text?.match(/(\d+)/);
        if (match) result.bedrooms = parseInt(match[1], 10);
      }

      const sizeEl = await page.$('[data-size], .size .value, .sqm .value');
      if (sizeEl && !result.size) {
        const text = await sizeEl.textContent();
        const match = text?.match(/(\d+)/);
        if (match) result.size = parseInt(match[1], 10);
      }
    } catch (err) {
      this.logger.debug({ err }, 'Failed to extract details');
    }

    return result;
  }

  /**
   * Extract coordinates from inline JavaScript
   */
  private async extractCoordsFromScript(page: Page): Promise<{ lat: number; lng: number } | null> {
    try {
      const scripts = await page.$$('script:not([src])');
      
      for (const script of scripts) {
        const content = await script.textContent();
        if (!content) continue;

        // Look for common patterns
        const patterns = [
          /lat[itude]*['":\s]+(-?\d+\.?\d*)/i,
          /lng|lon[gitude]*['":\s]+(-?\d+\.?\d*)/i,
          /LatLng\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/,
          /coordinates.*?(\d+\.\d+).*?(\d+\.\d+)/i
        ];

        // Try LatLng pattern first
        const latLngMatch = content.match(/LatLng\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
        if (latLngMatch) {
          return {
            lat: parseFloat(latLngMatch[1]),
            lng: parseFloat(latLngMatch[2])
          };
        }

        // Try separate lat/lng
        const latMatch = content.match(/["']?lat[itude]*["']?\s*[:=]\s*(-?\d+\.?\d*)/i);
        const lngMatch = content.match(/["']?(?:lng|lon)[gitude]*["']?\s*[:=]\s*(-?\d+\.?\d*)/i);
        
        if (latMatch && lngMatch) {
          const lat = parseFloat(latMatch[1]);
          const lng = parseFloat(lngMatch[1]);
          
          // Validate it's in Greece roughly
          if (lat > 34 && lat < 42 && lng > 19 && lng < 30) {
            return { lat, lng };
          }
        }
      }
    } catch (err) {
      this.logger.debug({ err }, 'Failed to extract coords from script');
    }

    return null;
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr: string): Date | undefined {
    // Try common formats
    const patterns: [RegExp, (m: RegExpMatchArray) => Date | undefined][] = [
      // DD/MM/YYYY
      [/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))],
      // YYYY-MM-DD
      [/(\d{4})-(\d{2})-(\d{2})/, (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))],
      // "X days ago"
      [/(\d+)\s*(?:ημέρ|day)/i, (m) => {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(m[1]));
        return d;
      }],
      // "X weeks ago"
      [/(\d+)\s*(?:εβδομάδ|week)/i, (m) => {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(m[1]) * 7);
        return d;
      }]
    ];

    for (const [pattern, parser] of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const result = parser(match);
        if (result && !isNaN(result.getTime())) {
          return result;
        }
      }
    }

    return undefined;
  }

  /**
   * Parse listing page (required by base class)
   */
  protected async parseListingPage(page: Page): Promise<RawListing> {
    const url = page.url();
    const idMatch = url.match(/\/property\/(\d+)|\/aggelies\/(\d+)/);
    const sourceListingId = idMatch ? (idMatch[1] || idMatch[2]) : url;

    const title = await this.getText(page, 'h1, .property-title');
    const priceText = await this.getText(page, '.price, .listing-price');
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

import type { Page } from 'playwright';
import { BaseScraper } from './base.js';
import type { 
  PlatformConfig, 
  RawListing, 
  SearchFilters 
} from '../types/index.js';

/**
 * Scraper for Spitogatos.gr - Greece's largest real estate portal
 * 
 * Site structure:
 * - Search results: /en/search/results/... (paginated)
 * - Listing page: /en/property/... or /aggelies/...
 * 
 * Anti-bot measures: Moderate (occasional rate limiting)
 */
export class SpitogatosScraper extends BaseScraper {
  constructor(config: PlatformConfig) {
    super(config);
  }

  /**
   * Build search URL with filters
   */
  protected buildSearchUrl(filters?: SearchFilters, pageNum: number = 1): string {
    const baseUrl = `${this.platform.baseUrl}/en/search/results`;
    const params = new URLSearchParams();

    // Transaction type (default to sale)
    const transaction = filters?.transactionType || 'sale';
    params.set('transaction_type', transaction === 'rent' ? 'rent' : 'buy');

    // Price range
    if (filters?.minPrice) {
      params.set('price_min', String(filters.minPrice));
    }
    if (filters?.maxPrice) {
      params.set('price_max', String(filters.maxPrice));
    }

    // Size range
    if (filters?.minSize) {
      params.set('area_min', String(filters.minSize));
    }
    if (filters?.maxSize) {
      params.set('area_max', String(filters.maxSize));
    }

    // Bedrooms
    if (filters?.bedrooms) {
      params.set('rooms_min', String(filters.bedrooms));
    }

    // Areas - Spitogatos uses geo_place_ids
    if (filters?.areas && filters.areas.length > 0) {
      // For now, we'll use the search text approach
      params.set('text', filters.areas[0]);
    }

    // Pagination
    if (pageNum > 1) {
      params.set('page', String(pageNum));
    }

    // Results per page (max available)
    params.set('per_page', '24');

    // Sort by newest first
    params.set('sort', 'created_at');
    params.set('order', 'desc');

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

        // Wait for listings to load
        await page.waitForSelector('.property-card, .listing-item, [data-testid="property-card"]', {
          timeout: 10000
        }).catch(() => {
          this.logger.warn('No listing cards found on page');
        });

        // Check for no results
        const noResults = await page.$('.no-results, .empty-results, [data-testid="no-results"]');
        if (noResults) {
          this.logger.info('No results found');
          break;
        }

        // Extract listings from current page
        const listings = await this.extractListingsFromPage(page);
        
        if (listings.length === 0) {
          this.logger.info('No more listings found');
          break;
        }

        this.logger.info({ count: listings.length, page: currentPage }, 'Found listings');

        // Yield each listing
        for (const listing of listings) {
          // Optionally scrape individual listing page for more details
          try {
            const detailedListing = await this.scrapeListingDetails(listing);
            yield detailedListing;
          } catch (err) {
            this.logger.warn({ err, listingId: listing.sourceListingId }, 'Failed to get details, using basic info');
            yield listing;
          }
        }

        // Check for next page
        const nextButton = await page.$('a.next, [aria-label="Next"], .pagination-next:not(.disabled)');
        hasMorePages = nextButton !== null;
        currentPage++;
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Extract listing data from search results page
   */
  private async extractListingsFromPage(page: Page): Promise<RawListing[]> {
    const listings: RawListing[] = [];

    // Get all listing cards
    const cards = await page.$$('.property-card, .listing-item, [data-testid="property-card"]');

    for (const card of cards) {
      try {
        // Extract listing URL and ID
        const linkElement = await card.$('a[href*="/property/"], a[href*="/aggelies/"]');
        if (!linkElement) continue;

        const href = await linkElement.getAttribute('href');
        if (!href) continue;

        // Extract listing ID from URL
        const idMatch = href.match(/\/property\/(\d+)|\/aggelies\/(\d+)/);
        const sourceListingId = idMatch ? (idMatch[1] || idMatch[2]) : href;
        const sourceUrl = href.startsWith('http') ? href : `${this.platform.baseUrl}${href}`;

        // Extract basic data from card
        const titleEl = await card.$('.title, h2, h3, [data-testid="title"]');
        const title = titleEl ? await titleEl.textContent() : null;

        const priceEl = await card.$('.price, [data-testid="price"], [data-price]');
        const priceText = priceEl ? await priceEl.textContent() : null;
        const price = this.parsePrice(priceText);

        const locationEl = await card.$('.location, .address, [data-testid="location"]');
        const location = locationEl ? await locationEl.textContent() : null;

        const sizeEl = await card.$('.size, .area, [data-testid="area"]');
        const sizeText = sizeEl ? await sizeEl.textContent() : null;
        const sizeSqm = this.parseSize(sizeText);

        const bedroomsEl = await card.$('.bedrooms, .rooms, [data-testid="rooms"]');
        const bedroomsText = bedroomsEl ? await bedroomsEl.textContent() : null;
        const bedrooms = this.parseRooms(bedroomsText);

        // Extract images
        const imageEls = await card.$$('img[data-src], img.property-image');
        const images: string[] = [];
        for (const img of imageEls) {
          const src = await img.getAttribute('data-src') || await img.getAttribute('src');
          if (src && !src.includes('placeholder')) {
            images.push(src);
          }
        }

        // Extract property type from title or dedicated element
        const typeEl = await card.$('.property-type, .type, [data-testid="type"]');
        const propertyType = typeEl ? await typeEl.textContent() : this.extractPropertyTypeFromTitle(title || '');

        // Extract agency info
        const agencyEl = await card.$('.agency, .agent, .realtor, [data-testid="agency"]');
        const agencyName = agencyEl ? await agencyEl.textContent() : null;

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
          rawData: {
            priceText,
            sizeText,
            bedroomsText,
            location
          }
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

      // Wait for page content
      await page.waitForSelector('.property-details, .listing-details, [data-testid="property-details"]', {
        timeout: 10000
      }).catch(() => {});

      // Enhanced data extraction
      const detailedListing = { ...basicListing };

      // Get full description/title
      const fullTitle = await this.getText(page, 'h1, .property-title, [data-testid="title"]');
      if (fullTitle) detailedListing.title = fullTitle;

      // Get exact price if available
      const exactPrice = await this.getText(page, '.price-value, [data-price], .listing-price');
      if (exactPrice) {
        const parsedPrice = this.parsePrice(exactPrice);
        if (parsedPrice) detailedListing.price = parsedPrice;
      }

      // Get detailed location
      const detailLocation = await this.getText(page, '.address, .location-full, [data-testid="address"]');
      if (detailLocation) detailedListing.address = detailLocation;

      // Extract area/municipality
      const area = await this.getText(page, '.area-name, .neighborhood, [data-testid="area"]');
      if (area) detailedListing.area = area;

      // Get more property details
      const bedroomsDetail = await this.getText(page, '[data-testid="bedrooms"], .bedrooms .value');
      if (bedroomsDetail) {
        const rooms = this.parseRooms(bedroomsDetail);
        if (rooms !== null) detailedListing.bedrooms = rooms;
      }

      const bathroomsDetail = await this.getText(page, '[data-testid="bathrooms"], .bathrooms .value');
      if (bathroomsDetail) {
        const baths = this.parseRooms(bathroomsDetail);
        if (baths !== null) detailedListing.bathrooms = baths;
      }

      const floorDetail = await this.getText(page, '[data-testid="floor"], .floor .value');
      if (floorDetail) detailedListing.floor = floorDetail;

      const yearBuilt = await this.getText(page, '[data-testid="year-built"], .year .value');
      if (yearBuilt) {
        const year = parseInt(yearBuilt.match(/\d{4}/)?.[0] || '', 10);
        if (!isNaN(year)) detailedListing.yearBuilt = year;
      }

      // Get all images
      const allImages = await page.$$eval(
        '.gallery img, .property-images img, [data-testid="gallery"] img',
        (imgs) => imgs.map(img => (img as HTMLImageElement).src || img.getAttribute('data-src')).filter(Boolean)
      );
      if (allImages.length > 0) {
        detailedListing.images = allImages as string[];
      }

      // Get agency details
      const agencyDetail = await this.getText(page, '.agency-name, .realtor-name, [data-testid="agency"]');
      if (agencyDetail) detailedListing.agencyName = agencyDetail;

      const agencyPhone = await this.getText(page, '.agency-phone, .contact-phone, [data-testid="phone"]');
      if (agencyPhone) detailedListing.agencyPhone = agencyPhone;

      // Get coordinates from map if available
      const mapEl = await page.$('[data-lat][data-lng], .map-container');
      if (mapEl) {
        const lat = await mapEl.getAttribute('data-lat');
        const lng = await mapEl.getAttribute('data-lng');
        if (lat && lng) {
          detailedListing.latitude = parseFloat(lat);
          detailedListing.longitude = parseFloat(lng);
        }
      }

      // Get listing date
      const dateEl = await this.getText(page, '.listing-date, .published-date, [data-testid="date"]');
      if (dateEl) {
        const date = this.parseGreekDate(dateEl);
        if (date) detailedListing.listingDate = date;
      }

      return detailedListing;
    } finally {
      await page.close();
    }
  }

  /**
   * Parse listing page (required by base class)
   */
  protected async parseListingPage(page: Page): Promise<RawListing> {
    const url = page.url();
    const idMatch = url.match(/\/property\/(\d+)|\/aggelies\/(\d+)/);
    const sourceListingId = idMatch ? (idMatch[1] || idMatch[2]) : url;

    const title = await this.getText(page, 'h1, .property-title');
    const priceText = await this.getText(page, '.price-value, [data-price]');
    const price = this.parsePrice(priceText);
    const address = await this.getText(page, '.address, .location');
    const sizeText = await this.getText(page, '.area-value, .size');
    const sizeSqm = this.parseSize(sizeText);

    return {
      sourceListingId,
      sourceUrl: url,
      title: title || undefined,
      price: price ?? undefined,
      address: address || undefined,
      sizeSqm: sizeSqm ?? undefined
    };
  }

  /**
   * Extract property type from title string
   */
  private extractPropertyTypeFromTitle(title: string): string | undefined {
    const titleLower = title.toLowerCase();
    
    const typePatterns: [RegExp, string][] = [
      [/διαμέρισμα|διαμερισμα|apartment/i, 'Διαμέρισμα'],
      [/μονοκατοικία|μονοκατοικια|house/i, 'Μονοκατοικία'],
      [/μεζονέτα|μεζονετα|maisonette/i, 'Μεζονέτα'],
      [/στούντιο|στουντιο|studio/i, 'Στούντιο'],
      [/βίλα|βιλα|villa/i, 'Βίλα'],
      [/οικόπεδο|οικοπεδο|land|plot/i, 'Οικόπεδο'],
      [/κατάστημα|καταστημα|shop|store/i, 'Κατάστημα'],
      [/γραφείο|γραφειο|office/i, 'Γραφείο']
    ];

    for (const [pattern, type] of typePatterns) {
      if (pattern.test(titleLower)) {
        return type;
      }
    }

    return undefined;
  }

  /**
   * Parse Greek date format
   */
  private parseGreekDate(dateStr: string): Date | undefined {
    // Handle formats like "15 Ιανουαρίου 2024" or "15/01/2024"
    const greekMonths: Record<string, number> = {
      'ιανουαρίου': 0, 'ιανουαριου': 0, 'ιαν': 0,
      'φεβρουαρίου': 1, 'φεβρουαριου': 1, 'φεβ': 1,
      'μαρτίου': 2, 'μαρτιου': 2, 'μαρ': 2,
      'απριλίου': 3, 'απριλιου': 3, 'απρ': 3,
      'μαΐου': 4, 'μαιου': 4, 'μαι': 4,
      'ιουνίου': 5, 'ιουνιου': 5, 'ιουν': 5,
      'ιουλίου': 6, 'ιουλιου': 6, 'ιουλ': 6,
      'αυγούστου': 7, 'αυγουστου': 7, 'αυγ': 7,
      'σεπτεμβρίου': 8, 'σεπτεμβριου': 8, 'σεπ': 8,
      'οκτωβρίου': 9, 'οκτωβριου': 9, 'οκτ': 9,
      'νοεμβρίου': 10, 'νοεμβριου': 10, 'νοε': 10,
      'δεκεμβρίου': 11, 'δεκεμβριου': 11, 'δεκ': 11
    };

    // Try DD/MM/YYYY format
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return new Date(parseInt(slashMatch[3]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
    }

    // Try Greek format
    const greekMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
    if (greekMatch) {
      const month = greekMonths[greekMatch[2]];
      if (month !== undefined) {
        return new Date(parseInt(greekMatch[3]), month, parseInt(greekMatch[1]));
      }
    }

    return undefined;
  }
}

import * as cheerio from 'cheerio';
import type { RawListing, SearchFilters } from './types';
import { getPlatformConfig } from './platforms';

/**
 * HTTP-based scraper for Greek real estate platforms
 * Uses fetch + cheerio for reliable serverless execution
 */

// Rate limiting state
const rateLimitState: Record<string, { count: number; windowStart: number }> = {};

/**
 * Check and enforce rate limiting
 */
function checkRateLimit(platformId: string, config: { requests: number; perMinutes: number }): boolean {
  const now = Date.now();
  const windowMs = config.perMinutes * 60 * 1000;
  
  if (!rateLimitState[platformId]) {
    rateLimitState[platformId] = { count: 0, windowStart: now };
  }
  
  const state = rateLimitState[platformId];
  
  // Reset window if expired
  if (now - state.windowStart > windowMs) {
    state.count = 0;
    state.windowStart = now;
  }
  
  // Check if under limit
  if (state.count >= config.requests) {
    return false;
  }
  
  state.count++;
  return true;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay to appear more human-like
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fetch a page with proper headers and anti-bot measures
 */
async function fetchPage(url: string, platformId: string): Promise<string | null> {
  const config = getPlatformConfig(platformId);
  if (!config) return null;
  
  // Check rate limit
  if (!checkRateLimit(platformId, config.rateLimit)) {
    console.log(`Rate limit reached for ${platformId}, waiting...`);
    await sleep(config.rateLimit.perMinutes * 60 * 1000 / config.rateLimit.requests);
  }
  
  // Add random delay to appear more human-like
  await sleep(randomDelay(1000, 3000));
  
  // Modern user agents (updated for 2026)
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  ];
  
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  
  // Platform-specific referer
  const referers: Record<string, string> = {
    'spitogatos': 'https://www.google.com/search?q=spitogatos+akinhta',
    'xe_gr': 'https://www.google.com/search?q=xe.gr+akinhta',
    'tospitimou': 'https://www.google.com/search?q=tospitimou+spitia',
  };
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Referer': referers[platformId] || 'https://www.google.com/',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Dnt': '1',
      },
      signal: AbortSignal.timeout(30000),
      redirect: 'follow',
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Parse price from Greek format text
 */
function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  
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
 * Parse room count
 */
function parseRooms(text: string | null | undefined): number | null {
  if (!text) return null;
  
  const match = text.match(/(\d+)/);
  if (!match) return null;
  
  const rooms = parseInt(match[1], 10);
  return isNaN(rooms) ? null : rooms;
}

/**
 * Scrape Spitogatos.gr
 * 
 * Spitogatos is the largest Greek real estate platform (450K+ listings)
 * URL patterns vary - they use both search results and category pages
 * 
 * Possible URL structures:
 *   - https://www.spitogatos.gr/en/search (main search)
 *   - https://www.spitogatos.gr/en/properties-for-sale (category)
 *   - https://www.spitogatos.gr/en/properties-for-rent (category)
 *   - https://www.spitogatos.gr/pwlisi/katoikies (Greek: sale/residential)
 *   - https://www.spitogatos.gr/enoikiasi/katoikies (Greek: rent/residential)
 * 
 * Note: Spitogatos uses heavy JavaScript rendering. HTTP scraping may have
 * limited success - this implementation tries multiple approaches.
 */
async function scrapeSpitogatos(
  filters: SearchFilters,
  maxPages: number
): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  const platformId = 'spitogatos';
  const baseUrl = 'https://www.spitogatos.gr';
  
  // Track processed listing IDs to avoid duplicates
  const processedIds = new Set<string>();
  
  for (let page = 1; page <= maxPages; page++) {
    // Build search URL - try the Greek path structure which tends to work better
    const transaction = filters.transactionType || 'sale';
    
    // Build URL based on transaction type
    // Greek paths: /pwlisi (sale) or /enoikiasi (rent)
    // With /katoikies (residential) suffix
    let path: string;
    if (transaction === 'rent') {
      path = '/enoikiasi/katoikies';
    } else {
      path = '/pwlisi/katoikies';
    }
    
    // Build query params
    const params = new URLSearchParams();
    
    // Price range
    if (filters.minPrice) params.set('price_from', String(filters.minPrice));
    if (filters.maxPrice) params.set('price_to', String(filters.maxPrice));
    
    // Size range
    if (filters.minSize) params.set('size_from', String(filters.minSize));
    if (filters.maxSize) params.set('size_to', String(filters.maxSize));
    
    // Bedrooms
    if (filters.bedrooms) params.set('bedrooms_from', String(filters.bedrooms));
    
    // Areas - Spitogatos uses text search or geo params
    if (filters.areas && filters.areas.length > 0) {
      params.set('geo_area_txt', filters.areas[0]);
    }
    
    // Pagination
    if (page > 1) params.set('page', String(page));
    
    // Sort by newest
    params.set('sort', 'date');
    params.set('order', 'desc');
    
    const queryString = params.toString();
    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    console.log(`[Spitogatos] Scraping page ${page}: ${url}`);
    
    const html = await fetchPage(url, platformId);
    if (!html) {
      console.log(`[Spitogatos] Failed to fetch page ${page}`);
      
      // Try alternative English URL structure
      const altUrl = `${baseUrl}/en/search?${queryString}&transaction=${transaction === 'rent' ? 'rent' : 'buy'}`;
      console.log(`[Spitogatos] Trying alternative URL: ${altUrl}`);
      
      const altHtml = await fetchPage(altUrl, platformId);
      if (!altHtml) {
        console.log(`[Spitogatos] Alternative URL also failed`);
        break;
      }
      
      // Process alternative HTML
      const parsed = parseSpitogatosHtml(altHtml, baseUrl, transaction, processedIds);
      listings.push(...parsed);
      continue;
    }
    
    // Parse listings from HTML
    const parsed = parseSpitogatosHtml(html, baseUrl, transaction, processedIds);
    listings.push(...parsed);
    
    if (parsed.length === 0) {
      console.log(`[Spitogatos] No listings found on page ${page}`);
      
      // Check if page indicates no results
      const $ = cheerio.load(html);
      if ($('.no-results, .empty-results, [class*="empty"], [class*="no-results"]').length > 0) {
        console.log(`[Spitogatos] No results indicator found`);
        break;
      }
      
      // If first page has no results, don't continue
      if (page === 1) break;
    } else {
      console.log(`[Spitogatos] Found ${parsed.length} listings on page ${page}`);
    }
    
    // Check for next page
    const $ = cheerio.load(html);
    const hasNextPage = $(
      'a[rel="next"], ' +
      '[class*="pagination"] a:contains(">"), ' +
      '[class*="pagination"] a:contains("Next"), ' +
      '[class*="next"]:not(:disabled), ' +
      '[aria-label="Next"], ' +
      '[aria-label="Επόμενη"]'
    ).length > 0;
    
    if (!hasNextPage) {
      console.log(`[Spitogatos] No more pages after page ${page}`);
      break;
    }
  }
  
  console.log(`[Spitogatos] Total listings collected: ${listings.length}`);
  return listings;
}

/**
 * Parse Spitogatos HTML into listings
 */
function parseSpitogatosHtml(
  html: string,
  baseUrl: string,
  transaction: string,
  processedIds: Set<string>
): RawListing[] {
  const listings: RawListing[] = [];
  const $ = cheerio.load(html);
  
  // Try to find JSON-LD structured data first (most reliable)
  const jsonLdListings = extractJsonLdListings($, baseUrl, transaction);
  if (jsonLdListings.length > 0) {
    for (const listing of jsonLdListings) {
      if (!processedIds.has(listing.sourceListingId)) {
        processedIds.add(listing.sourceListingId);
        listings.push(listing);
      }
    }
    return listings;
  }
  
  // Try multiple selector patterns that Spitogatos might use
  const cardSelectors = [
    'article[class*="listing"]',
    'article[class*="property"]',
    '[data-testid="property-card"]',
    '[data-listing-id]',
    '.property-card',
    '.listing-card',
    '.search-result-item',
    'div[class*="PropertyCard"]',
    'div[class*="ListingCard"]'
  ];
  
  let cards = $([]);
  for (const selector of cardSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      cards = found;
      console.log(`[Spitogatos] Using selector: ${selector} (${found.length} cards)`);
      break;
    }
  }
  
  // If no cards found, try to find property links
  if (cards.length === 0) {
    const propertyLinks = $('a[href*="/aggelies/"], a[href*="/property/"], a[href*="/listing/"]');
    console.log(`[Spitogatos] Falling back to property links: ${propertyLinks.length} found`);
    
    propertyLinks.each((_, linkEl) => {
      try {
        const $link = $(linkEl);
        const href = $link.attr('href');
        if (!href) return;
        
        // Extract ID from URL
        const idMatch = href.match(/\/aggelies\/(\d+)|\/property\/(\d+)|\/listing\/(\d+)|\/(\d+)(?:\/|$)/);
        const sourceListingId = idMatch 
          ? (idMatch[1] || idMatch[2] || idMatch[3] || idMatch[4])
          : null;
        
        if (!sourceListingId || processedIds.has(sourceListingId)) return;
        processedIds.add(sourceListingId);
        
        const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        
        // Get parent container for more data
        const $parent = $link.closest('article, div[class*="card"], div[class*="listing"], div[class*="property"]');
        const $container = $parent.length > 0 ? $parent : $link.parent().parent();
        
        // Extract text content
        const fullText = $container.text();
        
        // Extract price
        const priceMatch = fullText.match(/€\s*([\d.,]+)/);
        const priceText = priceMatch ? `€${priceMatch[1]}` : '';
        
        // Extract size
        const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|τ\.?μ\.?|sqm)/i);
        const sizeText = sizeMatch ? sizeMatch[0] : '';
        
        // Extract bedrooms
        const bedroomsMatch = fullText.match(/(\d+)\s*(?:υπν|bed|δωμ)/i);
        
        // Extract title
        const title = $container.find('h1, h2, h3, h4, [class*="title"]').first().text().trim() ||
                     $link.attr('title') ||
                     $link.text().trim();
        
        // Extract location
        const location = $container.find('[class*="location"], [class*="address"], [class*="area"]').first().text().trim();
        
        // Extract images - Spitogatos uses their own CDN
        const images: string[] = [];
        $container.find('img').each((_, img) => {
          const src = $(img).attr('data-src') || $(img).attr('src');
          if (src && (src.includes('spitogatos') || src.includes('cloudfront'))) {
            if (!src.includes('logo') && !src.includes('avatar') && !src.includes('placeholder')) {
              images.push(src);
            }
          }
        });
        
        listings.push({
          sourceListingId,
          sourceUrl,
          title: title || undefined,
          price: parsePrice(priceText) ?? undefined,
          priceText: priceText || undefined,
          transactionType: transaction,
          address: location || undefined,
          area: extractAreaFromLocation(location),
          sizeSqm: parseSize(sizeText) ?? undefined,
          bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined,
          images: images.length > 0 ? images : undefined,
          rawData: { priceText, sizeText, location }
        });
      } catch (err) {
        console.error('[Spitogatos] Error parsing listing link:', err);
      }
    });
    
    return listings;
  }
  
  // Process found cards
  cards.each((_, card) => {
    try {
      const $card = $(card);
      
      // Find link
      const link = $card.find('a[href*="/aggelies/"], a[href*="/property/"]').first();
      const href = link.attr('href') || $card.find('a').first().attr('href');
      if (!href) return;
      
      // Extract ID from URL
      const idMatch = href.match(/\/aggelies\/(\d+)|\/property\/(\d+)|\/(\d+)(?:\/|$)/);
      const sourceListingId = idMatch 
        ? (idMatch[1] || idMatch[2] || idMatch[3])
        : `spito-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      if (processedIds.has(sourceListingId)) return;
      processedIds.add(sourceListingId);
      
      const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
      
      // Extract data using multiple possible selectors
      const title = $card.find('[class*="title"], h2, h3, h4').first().text().trim();
      const priceText = $card.find('[class*="price"]').first().text().trim();
      const location = $card.find('[class*="location"], [class*="address"], [class*="area"]').first().text().trim();
      const sizeText = $card.find('[class*="size"], [class*="sqm"], [class*="m2"]').first().text().trim();
      const bedroomsText = $card.find('[class*="bedroom"], [class*="room"]').first().text().trim();
      const propertyTypeText = $card.find('[class*="type"], [class*="category"]').first().text().trim();
      const agencyName = $card.find('[class*="agency"], [class*="agent"], [class*="broker"]').first().text().trim();
      
      // Extract images
      const images: string[] = [];
      $card.find('img').each((_, img) => {
        const src = $(img).attr('data-src') || $(img).attr('src');
        if (src && !src.includes('placeholder') && !src.includes('logo')) {
          images.push(src.startsWith('http') ? src : `${baseUrl}${src}`);
        }
      });
      
      listings.push({
        sourceListingId,
        sourceUrl,
        title: title || undefined,
        price: parsePrice(priceText) ?? undefined,
        priceText: priceText || undefined,
        propertyType: propertyTypeText || undefined,
        transactionType: transaction,
        address: location || undefined,
        area: extractAreaFromLocation(location),
        sizeSqm: parseSize(sizeText) ?? undefined,
        bedrooms: parseRooms(bedroomsText) ?? undefined,
        agencyName: agencyName || undefined,
        images: images.length > 0 ? images : undefined,
        rawData: { priceText, sizeText, bedroomsText, location }
      });
    } catch (err) {
      console.error('[Spitogatos] Error parsing listing card:', err);
    }
  });
  
  return listings;
}

/**
 * Scrape XE.gr
 * 
 * Correct URL pattern: https://www.xe.gr/en/property/r/{type}-for-{transaction}
 * Examples:
 *   - https://www.xe.gr/en/property/r/property-for-sale
 *   - https://www.xe.gr/en/property/r/apartment-for-sale
 *   - https://www.xe.gr/en/property/r/property-to-rent
 *   - https://www.xe.gr/en/property/r/property-for-sale/{location_id}_{location_name}
 */
async function scrapeXeGr(
  filters: SearchFilters,
  maxPages: number
): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  const platformId = 'xe_gr';
  const baseUrl = 'https://www.xe.gr';
  
  // Map property types to XE.gr URL segments
  const propertyTypeMap: Record<string, string> = {
    'APARTMENT': 'apartment',
    'HOUSE': 'detached-house',
    'MAISONETTE': 'maisonette',
    'VILLA': 'detached-house',
    'STUDIO': 'apartment',
    'LAND': 'plots-of-land',
    'COMMERCIAL': 'commercial-property',
    'PARKING': 'parking-spaces',
    'WAREHOUSE': 'commercial-property'
  };
  
  for (let page = 1; page <= maxPages; page++) {
    // Build search URL using path-based routing
    const transaction = filters.transactionType || 'sale';
    const transactionPath = transaction === 'rent' ? 'to-rent' : 'for-sale';
    
    // Determine property type segment
    let propertySegment = 'property'; // Default to all properties
    if (filters.propertyTypes && filters.propertyTypes.length === 1) {
      const mappedType = propertyTypeMap[filters.propertyTypes[0]];
      if (mappedType) {
        propertySegment = mappedType;
      }
    }
    
    // Build the base path
    let path = `/en/property/r/${propertySegment}-${transactionPath}`;
    
    // Add pagination as query param
    const params = new URLSearchParams();
    if (page > 1) {
      params.set('page', String(page));
    }
    
    const queryString = params.toString();
    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    console.log(`[XE.gr] Scraping page ${page}: ${url}`);
    
    const html = await fetchPage(url, platformId);
    if (!html) {
      console.log(`[XE.gr] Failed to fetch page ${page}`);
      break;
    }
    
    const $ = cheerio.load(html);
    
    // Check for no results
    if ($('.no-results, .empty, .not-found, [data-testid="empty-state"]').length > 0) {
      console.log(`[XE.gr] No results found`);
      break;
    }
    
    // Try to extract JSON-LD data first (most reliable)
    const jsonLdListings = extractJsonLdListings($, baseUrl, transaction);
    if (jsonLdListings.length > 0) {
      // Filter by price if specified
      const filteredListings = jsonLdListings.filter(listing => {
        if (filters.minPrice && listing.price && listing.price < filters.minPrice) return false;
        if (filters.maxPrice && listing.price && listing.price > filters.maxPrice) return false;
        return true;
      });
      listings.push(...filteredListings);
      console.log(`[XE.gr] Found ${filteredListings.length} listings from JSON-LD on page ${page}`);
    } else {
      // Fallback to HTML parsing with updated selectors
      // XE.gr uses modern React-like structure with data attributes
      const cards = $('[data-testid="property-card"], [data-property-id], .listing-card, article[class*="listing"], div[class*="PropertyCard"], a[href*="/property/d/"]').parent();
      
      let foundCards = cards.length;
      
      // Alternative: Find all links to property details
      if (foundCards === 0) {
        const propertyLinks = $('a[href*="/property/d/"]');
        console.log(`[XE.gr] Found ${propertyLinks.length} property links on page ${page}`);
        
        propertyLinks.each((_, linkEl) => {
          try {
            const $link = $(linkEl);
            const href = $link.attr('href');
            if (!href) return;
            
            // Extract ID from URL like /property/d/123456789/...
            const idMatch = href.match(/\/property\/d\/(\d+)/);
            const sourceListingId = idMatch 
              ? idMatch[1]
              : `xe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            
            // Skip if we already have this listing
            if (listings.some(l => l.sourceListingId === sourceListingId)) return;
            
            const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            
            // Try to extract data from parent container
            const $container = $link.closest('[data-testid="property-card"], article, div[class*="card"], div[class*="listing"]');
            const $parent = $container.length > 0 ? $container : $link.parent().parent();
            
            // Extract text content
            const fullText = $parent.text();
            
            // Extract price (look for € symbol followed by numbers)
            const priceMatch = fullText.match(/€\s*([\d.,]+)/);
            const priceText = priceMatch ? `€${priceMatch[1]}` : '';
            
            // Extract size (look for m² or τ.μ.)
            const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|τ\.?μ\.?|sqm)/i);
            const sizeText = sizeMatch ? sizeMatch[0] : '';
            
            // Extract bedrooms (look for number followed by bedroom indicators)
            const bedroomsMatch = fullText.match(/(\d+)\s*(?:υπν|bed|δωμ|room)/i);
            
            // Extract title from link or heading
            const title = $link.find('h2, h3, [class*="title"]').first().text().trim() 
              || $link.attr('title') 
              || $parent.find('h2, h3, [class*="title"]').first().text().trim();
            
            // Extract location
            const locationEl = $parent.find('[class*="location"], [class*="address"], [class*="area"]').first();
            const location = locationEl.text().trim();
            
            // Extract images
            const images: string[] = [];
            $parent.find('img').each((_, img) => {
              const src = $(img).attr('src') || $(img).attr('data-src');
              if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('avatar')) {
                images.push(src.startsWith('http') ? src : `${baseUrl}${src}`);
              }
            });
            
            listings.push({
              sourceListingId,
              sourceUrl,
              title: title || undefined,
              price: parsePrice(priceText) ?? undefined,
              priceText: priceText || undefined,
              transactionType: transaction,
              address: location || undefined,
              area: extractAreaFromLocation(location),
              sizeSqm: parseSize(sizeText) ?? undefined,
              bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1], 10) : undefined,
              images: images.length > 0 ? images : undefined,
              rawData: { priceText, sizeText, location, fullText: fullText.substring(0, 500) }
            });
          } catch (err) {
            console.error('[XE.gr] Error parsing listing link:', err);
          }
        });
      } else {
        console.log(`[XE.gr] Found ${foundCards} listing cards on page ${page}`);
        
        cards.each((_, card) => {
          try {
            const $card = $(card);
            
            // Find link
            const link = $card.find('a[href*="/property/d/"]').first();
            const href = link.attr('href') || $card.find('a').first().attr('href');
            if (!href || !href.includes('/property/')) return;
            
            // Extract ID
            const idMatch = href.match(/\/property\/d\/(\d+)/);
            const sourceListingId = idMatch 
              ? idMatch[1]
              : `xe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            
            const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            
            // Extract data using various possible selectors
            const title = $card.find('[class*="title"], h2, h3').first().text().trim();
            const priceText = $card.find('[class*="price"], [data-price]').first().text().trim();
            const location = $card.find('[class*="location"], [class*="address"]').first().text().trim();
            const sizeText = $card.find('[class*="size"], [class*="area"]').first().text().trim();
            const bedroomsText = $card.find('[class*="bedroom"], [class*="room"]').first().text().trim();
            const agencyName = $card.find('[class*="agency"], [class*="agent"]').first().text().trim();
            
            // Extract images
            const images: string[] = [];
            $card.find('img').each((_, img) => {
              const src = $(img).attr('src') || $(img).attr('data-src');
              if (src && !src.includes('placeholder') && !src.includes('logo')) {
                images.push(src.startsWith('http') ? src : `${baseUrl}${src}`);
              }
            });
            
            listings.push({
              sourceListingId,
              sourceUrl,
              title: title || undefined,
              price: parsePrice(priceText) ?? undefined,
              priceText: priceText || undefined,
              transactionType: transaction,
              address: location || undefined,
              area: extractAreaFromLocation(location),
              sizeSqm: parseSize(sizeText) ?? undefined,
              bedrooms: parseRooms(bedroomsText) ?? undefined,
              agencyName: agencyName || undefined,
              images,
              rawData: { priceText, sizeText, bedroomsText, location }
            });
          } catch (err) {
            console.error('[XE.gr] Error parsing listing card:', err);
          }
        });
      }
    }
    
    // Check for next page - XE.gr uses various pagination patterns
    const hasNextPage = $(
      'a[rel="next"], ' +
      '[aria-label="Next"], ' +
      '[aria-label="Επόμενη"], ' +
      'button[class*="next"]:not(:disabled), ' +
      '.pagination a:contains(">")'
    ).length > 0;
    
    if (!hasNextPage) {
      console.log(`[XE.gr] No more pages after page ${page}`);
      break;
    }
  }
  
  console.log(`[XE.gr] Total listings collected: ${listings.length}`);
  return listings;
}

/**
 * Scrape Tospitimou.gr
 * 
 * Correct URL pattern: https://en.tospitimou.gr/property/{transaction}/houses/{location}/area-ids_{id},category_residential
 * Examples:
 *   - https://en.tospitimou.gr/property/for-sale/houses/Athens-Center/area-ids_[100],category_residential
 *   - https://en.tospitimou.gr/property/to-rent/houses/Athens-North/area-ids_[101],category_residential
 * 
 * Individual listing URLs: https://en.tospitimou.gr/{transaction}-{type}-{location}/property/{id}
 */
async function scrapeTospitimou(
  filters: SearchFilters,
  maxPages: number
): Promise<RawListing[]> {
  const listings: RawListing[] = [];
  const platformId = 'tospitimou';
  // Use English subdomain for better parsing
  const baseUrl = 'https://en.tospitimou.gr';
  
  // Area ID mapping for common Greek regions
  const areaIdMap: Record<string, string> = {
    'athens': '100',
    'athens-center': '100',
    'αθήνα': '100',
    'athens-north': '101',
    'athens-south': '102',
    'athens-west': '103',
    'athens-east': '104',
    'piraeus': '105',
    'thessaloniki': '108',
    'θεσσαλονίκη': '108',
    'glyfada': '102',
    'γλυφάδα': '102',
    'kifisia': '101',
    'κηφισιά': '101',
    'kolonaki': '100',
    'κολωνάκι': '100',
  };
  
  for (let page = 1; page <= maxPages; page++) {
    // Build search URL using path-based structure
    const transaction = filters.transactionType || 'sale';
    const transactionPath = transaction === 'rent' ? 'to-rent' : 'for-sale';
    
    // Build base path
    // Correct URL pattern: /property/for-sale/houses/Athens-Center/area-ids_[100],category_residential
    let path = `/property/${transactionPath}/houses`;
    
    // Add area filter if specified
    if (filters.areas && filters.areas.length > 0) {
      const areaName = filters.areas[0];
      const normalizedArea = areaName.toLowerCase().replace(/\s+/g, '-');
      const areaId = areaIdMap[normalizedArea] || areaIdMap[areaName.toLowerCase()];
      
      if (areaId) {
        // URL encode the area-ids parameter properly - using %5B and %5D for [ and ]
        const locationSlug = normalizedArea.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('-');
        path += `/${locationSlug}/area-ids_%5B${areaId}%5D,category_residential`;
      } else {
        // Just use the area name in path with proper formatting
        const formattedArea = areaName.split(/[\s-]+/).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('-');
        path += `/${formattedArea}`;
      }
    } else {
      // Default to Athens-Center (area-id 100) as a reliable starting point
      // Note: /Greece doesn't work - need specific area
      path += '/Athens-Center/area-ids_%5B100%5D,category_residential';
    }
    
    // Add filters as query params
    const params = new URLSearchParams();
    
    // Price range
    if (filters.minPrice) params.set('price_from', String(filters.minPrice));
    if (filters.maxPrice) params.set('price_to', String(filters.maxPrice));
    
    // Size range
    if (filters.minSize) params.set('size_from', String(filters.minSize));
    if (filters.maxSize) params.set('size_to', String(filters.maxSize));
    
    // Pagination
    if (page > 1) params.set('p', String(page));
    
    const queryString = params.toString();
    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    console.log(`[Tospitimou] Scraping page ${page}: ${url}`);
    
    const html = await fetchPage(url, platformId);
    if (!html) {
      console.log(`[Tospitimou] Failed to fetch page ${page}`);
      break;
    }
    
    const $ = cheerio.load(html);
    
    // Check for no results
    if ($('.no-results, .empty-state, .no-listings, [class*="empty"]').length > 0) {
      console.log(`[Tospitimou] No results found`);
      break;
    }
    
    // Parse listings from page - Tospitimou uses links with specific URL patterns
    // Look for links that match the listing URL pattern
    const listingLinks = $('a[href*="/property/"]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      // Match pattern like /sale-apartment-flat-Location/property/12345
      return /\/(sale|rent)-[^/]+-[^/]+\/property\/\d+/.test(href) ||
             /\/property\/\d+/.test(href);
    });
    
    console.log(`[Tospitimou] Found ${listingLinks.length} listing links on page ${page}`);
    
    // Process unique listings
    const processedIds = new Set<string>();
    
    listingLinks.each((_, linkEl) => {
      try {
        const $link = $(linkEl);
        const href = $link.attr('href');
        if (!href) return;
        
        // Extract ID from URL like /sale-apartment-flat-Location/property/12345678
        const idMatch = href.match(/\/property\/(\d+)/);
        const sourceListingId = idMatch 
          ? idMatch[1]
          : `tspiti-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        // Skip duplicates
        if (processedIds.has(sourceListingId)) return;
        processedIds.add(sourceListingId);
        
        const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        
        // Find the parent container that holds the listing info
        const $container = $link.closest('div[class*="listing"], div[class*="property"], article, .card');
        const $parent = $container.length > 0 ? $container : $link.parent().parent().parent();
        
        // Get all text for extraction
        const fullText = $parent.text();
        
        // Extract property type from URL
        // Pattern: /sale-apartment-flat-Location or /rent-studio-Location
        const typeMatch = href.match(/\/(sale|rent)-([^-]+(?:-[^-]+)?)-/);
        let propertyType = typeMatch ? typeMatch[2].replace(/-/g, ' ') : undefined;
        
        // Extract price - handle various formats:
        // "€320,000" or "320.000 €" or "€ 320 000" or "320000€"
        const priceMatch = fullText.match(/€\s*([\d\s.,]+)|([\d\s.,]+)\s*€/);
        let priceText = '';
        if (priceMatch) {
          const priceNum = (priceMatch[1] || priceMatch[2] || '').trim();
          priceText = `€${priceNum}`;
        }
        
        // Check for /month indicator for rentals
        const isRental = fullText.includes('/month') || fullText.includes('ανά μήνα') || href.includes('rent-');
        
        // Extract size - look for m² or τ.μ.
        const sizeMatch = fullText.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|τ\.?μ\.?|sqm)/i);
        const sizeText = sizeMatch ? sizeMatch[0] : '';
        
        // Extract floor
        const floorMatch = fullText.match(/(\d+)(?:st|nd|rd|th)\s*(?:floor|όροφος)/i) ||
                          fullText.match(/(?:floor|όροφος)[:\s]*(\d+)/i) ||
                          fullText.match(/ground\s*floor/i);
        
        // Extract location from URL or text
        // URL pattern: /sale-apartment-flat-Location-SubLocation/property/123
        const locationMatch = href.match(/(?:sale|rent)-[^-]+-([^/]+)\/property/);
        let location = '';
        if (locationMatch) {
          location = locationMatch[1]
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Extract title from heading elements
        const title = $parent.find('h1, h2, h3, h4, h5, h6, [class*="title"]').first().text().trim() ||
                     $link.attr('title') ||
                     $link.text().trim();
        
        // Extract images - Tospitimou uses spitogatos CDN
        const images: string[] = [];
        $parent.find('img').each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && (src.includes('spitogatos.gr') || src.includes('tospitimou'))) {
            if (!src.includes('logo') && !src.includes('avatar') && !src.includes('placeholder')) {
              images.push(src);
            }
          }
        });
        
        // Extract agency name
        const agencyName = $parent.find('[class*="agent"], [class*="agency"], [class*="realtor"]').first().text().trim();
        
        listings.push({
          sourceListingId,
          sourceUrl,
          title: title || undefined,
          price: parsePrice(priceText) ?? undefined,
          priceText: priceText || undefined,
          propertyType: propertyType || undefined,
          transactionType: isRental ? 'rent' : transaction,
          address: location || undefined,
          area: extractAreaFromLocation(location),
          sizeSqm: parseSize(sizeText) ?? undefined,
          floor: floorMatch ? (floorMatch[1] || '0') : undefined,
          agencyName: agencyName || undefined,
          images: images.length > 0 ? images : undefined,
          rawData: { priceText, sizeText, location, href }
        });
      } catch (err) {
        console.error('[Tospitimou] Error parsing listing:', err);
      }
    });
    
    // Also try to parse from structured listing cards if present
    const listingCards = $('.property-card, .listing-card, [class*="PropertyCard"], article[class*="listing"]');
    
    listingCards.each((_, card) => {
      try {
        const $card = $(card);
        
        // Find the main link
        const link = $card.find('a[href*="/property/"]').first();
        const href = link.attr('href');
        if (!href) return;
        
        const idMatch = href.match(/\/property\/(\d+)/);
        const sourceListingId = idMatch ? idMatch[1] : `tspiti-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        // Skip if already processed
        if (processedIds.has(sourceListingId)) return;
        processedIds.add(sourceListingId);
        
        const sourceUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        
        // Extract data from card structure
        const title = $card.find('h2, h3, h4, [class*="title"]').first().text().trim();
        const priceText = $card.find('[class*="price"]').first().text().trim();
        const location = $card.find('[class*="location"], [class*="address"]').first().text().trim();
        const sizeText = $card.find('[class*="size"], [class*="area"], [class*="sqm"]').first().text().trim();
        
        // Extract images
        const images: string[] = [];
        $card.find('img').each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && !src.includes('logo') && !src.includes('placeholder')) {
            images.push(src.startsWith('http') ? src : `${baseUrl}${src}`);
          }
        });
        
        listings.push({
          sourceListingId,
          sourceUrl,
          title: title || undefined,
          price: parsePrice(priceText) ?? undefined,
          priceText: priceText || undefined,
          transactionType: transaction,
          address: location || undefined,
          area: extractAreaFromLocation(location),
          sizeSqm: parseSize(sizeText) ?? undefined,
          images: images.length > 0 ? images : undefined,
          rawData: { priceText, sizeText, location }
        });
      } catch (err) {
        console.error('[Tospitimou] Error parsing card:', err);
      }
    });
    
    // Check for next page
    const hasNextPage = $(
      'a[rel="next"], ' +
      '[class*="pagination"] a:contains(">"), ' +
      '[class*="pagination"] a:contains("Next"), ' +
      '[class*="pagination"] a:contains("Επόμενη"), ' +
      'button[class*="next"]:not(:disabled)'
    ).length > 0;
    
    if (!hasNextPage) {
      console.log(`[Tospitimou] No more pages after page ${page}`);
      break;
    }
  }
  
  console.log(`[Tospitimou] Total listings collected: ${listings.length}`);
  return listings;
}

/**
 * Extract JSON-LD structured data from page
 */
function extractJsonLdListings(
  $: cheerio.CheerioAPI, 
  baseUrl: string, 
  transactionType: string
): RawListing[] {
  const listings: RawListing[] = [];
  
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const content = $(script).html();
      if (!content) return;
      
      const data = JSON.parse(content);
      
      // Handle ItemList or array
      const items = data['@type'] === 'ItemList' 
        ? data.itemListElement 
        : Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'Residence' || item['@type'] === 'RealEstateListing') {
          const url = item.url as string;
          if (!url) continue;
          
          const idMatch = url.match(/\/d\/(\d+)|\/details\/(\d+)|\/(\d+)/);
          const sourceListingId = idMatch 
            ? (idMatch[1] || idMatch[2] || idMatch[3]) 
            : `json-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          
          const offers = item.offers as Record<string, unknown> | undefined;
          const geo = item.geo as Record<string, unknown> | undefined;
          const address = item.address as Record<string, unknown> | undefined;
          
          listings.push({
            sourceListingId,
            sourceUrl: url.startsWith('http') ? url : `${baseUrl}${url}`,
            title: item.name as string | undefined,
            price: offers?.price ? Number(offers.price) : undefined,
            address: address?.streetAddress as string | undefined,
            area: address?.addressLocality as string | undefined,
            municipality: address?.addressRegion as string | undefined,
            postalCode: address?.postalCode as string | undefined,
            latitude: geo?.latitude ? Number(geo.latitude) : undefined,
            longitude: geo?.longitude ? Number(geo.longitude) : undefined,
            transactionType,
            images: item.image 
              ? (Array.isArray(item.image) ? item.image : [item.image]) as string[] 
              : undefined,
            rawData: item as Record<string, unknown>
          });
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  });
  
  return listings;
}

/**
 * Extract area name from location string
 */
function extractAreaFromLocation(location: string | undefined): string | undefined {
  if (!location) return undefined;
  
  // Common patterns: "Area, City" or "Area - City" or just "Area"
  const parts = location.split(/[,\-–]/);
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return location.trim();
}

/**
 * Try Playwright scraper as fallback
 * Dynamically imports to avoid loading if not needed
 */
async function tryPlaywrightFallback(
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
  try {
    const { isPlaywrightAvailable, fetchListingsWithPlaywright } = await import('./playwright-scraper');
    
    const available = await isPlaywrightAvailable();
    if (!available) {
      console.log(`[Scraper] Playwright not available for fallback`);
      return [];
    }
    
    console.log(`[Scraper] Attempting Playwright fallback for ${platformId}`);
    return await fetchListingsWithPlaywright(platformId, filters, maxPages);
  } catch (error) {
    console.error(`[Scraper] Playwright fallback failed:`, error);
    return [];
  }
}

// Platforms that require JavaScript rendering and should use Playwright directly
const JS_HEAVY_PLATFORMS = ['spitogatos', 'xe_gr', 'tospitimou'];

/**
 * Main function to fetch listings from a platform
 * 
 * Uses a smart hybrid approach:
 * 1. For JS-heavy platforms: Use Playwright directly (required for accurate data)
 * 2. For simpler platforms: Try HTTP + Cheerio first, fallback to Playwright
 */
export async function fetchListingsFromPlatform(
  platformId: string,
  baseUrl: string,
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
  console.log(`[Scraper] Starting scrape for ${platformId}, max pages: ${maxPages}`);
  
  // Build search filters
  const searchFilters: SearchFilters = {
    transactionType: (filters.transactionTypes[0] as 'sale' | 'rent') || 'sale',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    areas: filters.areas.length > 0 ? filters.areas : filters.municipalities,
  };
  
  // Add property types if specified
  if (filters.propertyTypes.length > 0) {
    searchFilters.propertyTypes = filters.propertyTypes as SearchFilters['propertyTypes'];
  }
  
  let listings: RawListing[] = [];
  
  // For JS-heavy platforms, try Playwright first for accurate price/data extraction
  if (JS_HEAVY_PLATFORMS.includes(platformId)) {
    console.log(`[Scraper] ${platformId} requires JS rendering, trying Playwright first...`);
    
    const playwrightListings = await tryPlaywrightFallback(platformId, filters, maxPages);
    
    if (playwrightListings.length > 0) {
      console.log(`[Scraper] Playwright successful: ${playwrightListings.length} listings with full data`);
      return playwrightListings;
    } else {
      console.log(`[Scraper] Playwright not available or failed, falling back to HTTP...`);
    }
  }
  
  // HTTP scraping (fast, serverless-compatible) - used as fallback or for simpler sites
  try {
    switch (platformId) {
      case 'spitogatos':
        listings = await scrapeSpitogatos(searchFilters, maxPages);
        break;
      case 'xe_gr':
        listings = await scrapeXeGr(searchFilters, maxPages);
        break;
      case 'tospitimou':
        listings = await scrapeTospitimou(searchFilters, maxPages);
        break;
      default:
        console.error(`[Scraper] Unknown platform: ${platformId}`);
    }
  } catch (error) {
    console.error(`[Scraper] HTTP scraping error for ${platformId}:`, error);
  }
  
  // If HTTP scraping returned results but platform needs JS, warn about incomplete data
  if (listings.length > 0 && JS_HEAVY_PLATFORMS.includes(platformId)) {
    console.log(`[Scraper] Warning: HTTP scraping for ${platformId} may have incomplete price data`);
  }
  
  // If HTTP scraping returned no results, try Playwright as last resort
  if (listings.length === 0) {
    console.log(`[Scraper] HTTP scraping returned no results for ${platformId}, trying Playwright fallback...`);
    
    const playwrightListings = await tryPlaywrightFallback(platformId, filters, maxPages);
    
    if (playwrightListings.length > 0) {
      listings = playwrightListings;
      console.log(`[Scraper] Playwright fallback successful: ${playwrightListings.length} listings`);
    } else {
      console.log(`[Scraper] Playwright fallback also returned no results`);
    }
  }
  
  console.log(`[Scraper] Completed ${platformId}: found ${listings.length} listings`);
  
  return listings;
}

/**
 * Test function to scrape a single platform with minimal pages
 * Useful for verifying scraper configuration
 * 
 * Returns detailed information for debugging:
 * - success: whether any listings were found
 * - listingsFound: total number of listings found
 * - sampleListings: sample of listings (up to maxListings)
 * - errors: any errors encountered
 * - metadata: additional debugging info (scrape method, URL patterns, etc.)
 */
export async function testScraper(
  platformId: string,
  transactionType: 'sale' | 'rent' = 'sale',
  maxListings: number = 10
): Promise<{
  success: boolean;
  listingsFound: number;
  sampleListings: RawListing[];
  errors: string[];
  metadata?: {
    scrapeMethod: 'playwright' | 'http' | 'unknown';
    platformConfig: {
      baseUrl: string;
      searchPath?: string;
      rateLimit: { requests: number; perMinutes: number };
    };
    listingsWithPrice: number;
    listingsWithSize: number;
    listingsWithImages: number;
    isJsHeavyPlatform: boolean;
  };
}> {
  const errors: string[] = [];
  let listings: RawListing[] = [];
  let scrapeMethod: 'playwright' | 'http' | 'unknown' = 'unknown';
  
  try {
    const config = getPlatformConfig(platformId);
    if (!config) {
      return {
        success: false,
        listingsFound: 0,
        sampleListings: [],
        errors: [`Unknown platform: ${platformId}`]
      };
    }
    
    const isJsHeavy = JS_HEAVY_PLATFORMS.includes(platformId);
    
    // Try Playwright first for JS-heavy platforms
    if (isJsHeavy) {
      try {
        const { isPlaywrightAvailable, fetchListingsWithPlaywright } = await import('./playwright-scraper');
        const available = await isPlaywrightAvailable();
        
        if (available) {
          console.log(`[Test Scraper] Using Playwright for ${platformId}`);
          listings = await fetchListingsWithPlaywright(
            platformId,
            {
              areas: [],
              municipalities: [],
              propertyTypes: [],
              transactionTypes: [transactionType]
            },
            2 // Just 2 pages for testing
          );
          scrapeMethod = 'playwright';
        }
      } catch (err) {
        console.log(`[Test Scraper] Playwright not available, falling back to HTTP`);
        errors.push(`Playwright fallback: ${err instanceof Error ? err.message : 'Not available'}`);
      }
    }
    
    // Fallback to HTTP if Playwright didn't work or not JS-heavy
    if (listings.length === 0) {
      console.log(`[Test Scraper] Using HTTP scraper for ${platformId}`);
      listings = await fetchListingsFromPlatform(
        platformId,
        config.baseUrl,
        {
          areas: [],
          municipalities: [],
          propertyTypes: [],
          transactionTypes: [transactionType]
        },
        2 // Just 2 pages for testing
      );
      scrapeMethod = listings.some(l => l.rawData?.playwright) ? 'playwright' : 'http';
    }
    
    // Trim to max listings
    const sampleListings = listings.slice(0, maxListings);
    
    // Calculate metadata
    const listingsWithPrice = listings.filter(l => l.price && l.price > 0).length;
    const listingsWithSize = listings.filter(l => l.sizeSqm && l.sizeSqm > 0).length;
    const listingsWithImages = listings.filter(l => l.images && l.images.length > 0).length;
    
    return {
      success: listings.length > 0,
      listingsFound: listings.length,
      sampleListings,
      errors,
      metadata: {
        scrapeMethod,
        platformConfig: {
          baseUrl: config.baseUrl,
          searchPath: config.searchPath,
          rateLimit: config.rateLimit
        },
        listingsWithPrice,
        listingsWithSize,
        listingsWithImages,
        isJsHeavyPlatform: isJsHeavy
      }
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      listingsFound: 0,
      sampleListings: [],
      errors
    };
  }
}

import { prismadb } from "@/lib/prisma";
import type { NormalizedListing, ScrapeJobResult } from "./types";

/**
 * Market Intelligence Database Service
 * 
 * Handles queries to the market_intel schema for competitor data.
 * Uses raw SQL through Prisma's $queryRaw for the separate schema.
 * 
 * NOTE: The market_intel schema must be created by running the migration:
 * prisma/migrations/20260120100000_market_intelligence/migration.sql
 */

// Helper to check if schema exists and handle errors gracefully
async function checkSchemaExists(): Promise<boolean> {
  try {
    const result = await prismadb.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'market_intel'
      ) as exists
    `;
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}

// Export the check function for external use
export { checkSchemaExists };

// Error to throw when schema doesn't exist
export class SchemaNotFoundError extends Error {
  constructor() {
    super('Market Intelligence schema not found. Please run the database migration first.');
    this.name = 'SchemaNotFoundError';
  }
}

// ===========================================
// Organization Config Operations
// ===========================================

/**
 * Get or create market intel config for an organization
 */
export async function getOrCreateOrgConfig(organizationId: string) {
  // First try to get existing
  let config = await prismadb.marketIntelConfig.findUnique({
    where: { organizationId }
  });

  // Create if doesn't exist
  if (!config) {
    config = await prismadb.marketIntelConfig.create({
      data: {
        organizationId,
        isEnabled: false,
        platforms: ['spitogatos', 'xe_gr', 'tospitimou'],
        targetAreas: [],
        targetMunicipalities: [],
        transactionTypes: ['sale', 'rent'],
        propertyTypes: [],
        maxPagesPerPlatform: 10,
        status: 'PENDING_SETUP',
        consecutiveFailures: 0
      }
    });
  }

  return config;
}

/**
 * Get all enabled configs that need scraping
 */
export async function getConfigsDueForScraping(): Promise<Array<{
  id: string;
  organizationId: string;
  platforms: string[];
  targetAreas: string[];
  targetMunicipalities: string[];
  transactionTypes: string[];
  propertyTypes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  maxPagesPerPlatform: number;
  scrapeFrequency: string;
}>> {
  const now = new Date();
  
  const configs = await prismadb.marketIntelConfig.findMany({
    where: {
      isEnabled: true,
      status: 'ACTIVE',
      OR: [
        { nextScrapeAt: null },
        { nextScrapeAt: { lte: now } }
      ]
    },
    select: {
      id: true,
      organizationId: true,
      platforms: true,
      targetAreas: true,
      targetMunicipalities: true,
      transactionTypes: true,
      propertyTypes: true,
      minPrice: true,
      maxPrice: true,
      maxPagesPerPlatform: true,
      scrapeFrequency: true
    }
  });

  return configs;
}

/**
 * Update org config after scrape
 */
export async function updateOrgConfigAfterScrape(
  organizationId: string,
  success: boolean,
  error?: string
) {
  const config = await prismadb.marketIntelConfig.findUnique({
    where: { organizationId }
  });

  if (!config) return;

  // Calculate next scrape time based on frequency
  const now = new Date();
  let nextScrapeAt: Date;
  
  switch (config.scrapeFrequency) {
    case 'HOURLY':
      nextScrapeAt = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case 'TWICE_DAILY':
      nextScrapeAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      break;
    case 'WEEKLY':
      nextScrapeAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'DAILY':
    default:
      nextScrapeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
  }

  await prismadb.marketIntelConfig.update({
    where: { organizationId },
    data: {
      lastScrapeAt: now,
      nextScrapeAt,
      consecutiveFailures: success ? 0 : config.consecutiveFailures + 1,
      lastError: error || null,
      status: success ? 'ACTIVE' : (config.consecutiveFailures >= 2 ? 'ERROR' : 'ACTIVE')
    }
  });
}

// ===========================================
// Scraper Database Operations
// ===========================================

/**
 * Create a scrape log entry
 */
export async function createScrapeLog(
  organizationId: string,
  platform: string
): Promise<string> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) {
    throw new SchemaNotFoundError();
  }

  const result = await prismadb.$queryRaw<[{ id: string }]>`
    INSERT INTO market_intel.scrape_logs (organization_id, platform, started_at, status)
    VALUES (${organizationId}, ${platform}, NOW(), 'running')
    RETURNING id::text
  `;

  return result[0].id;
}

/**
 * Update scrape log with results
 */
export async function updateScrapeLog(
  logId: string,
  result: Partial<ScrapeJobResult>
): Promise<void> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return;

  await prismadb.$queryRawUnsafe(`
    UPDATE market_intel.scrape_logs SET
      completed_at = NOW(),
      status = $1,
      listings_found = $2,
      listings_new = $3,
      listings_updated = $4,
      listings_deactivated = $5,
      pages_scraped = $6,
      scrape_duration_ms = $7,
      error_message = $8
    WHERE id = $9::uuid
  `,
    result.status || 'success',
    result.listingsFound || 0,
    result.listingsNew || 0,
    result.listingsUpdated || 0,
    result.listingsDeactivated || 0,
    result.pagesScraped || 0,
    result.duration || 0,
    result.errors?.join('; ') || null,
    logId
  );
}

/**
 * Upsert a listing - returns whether it's new or price changed
 */
export async function upsertListing(
  listing: NormalizedListing
): Promise<{ isNew: boolean; priceChanged: boolean }> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) {
    throw new SchemaNotFoundError();
  }

  // Check if listing exists
  const existing = await prismadb.$queryRaw<Array<{ id: string; price: number | null }>>`
    SELECT id, price FROM market_intel.competitor_listings 
    WHERE organization_id = ${listing.organization_id}
      AND source_platform = ${listing.source_platform}
      AND source_listing_id = ${listing.source_listing_id}
  `;

  if (existing.length === 0) {
    // Insert new listing
    await prismadb.$queryRaw`
      INSERT INTO market_intel.competitor_listings (
        organization_id, source_platform, source_listing_id, source_url,
        title, price, price_per_sqm, property_type, transaction_type,
        address, area, municipality, postal_code, latitude, longitude,
        size_sqm, bedrooms, bathrooms, floor, year_built,
        agency_name, agency_phone, images, listing_date, raw_data,
        last_seen_at, first_scraped_at, is_active
      ) VALUES (
        ${listing.organization_id}, ${listing.source_platform}, ${listing.source_listing_id}, ${listing.source_url},
        ${listing.title}, ${listing.price}, ${listing.price_per_sqm}, ${listing.property_type}, ${listing.transaction_type},
        ${listing.address}, ${listing.area}, ${listing.municipality}, ${listing.postal_code}, ${listing.latitude}, ${listing.longitude},
        ${listing.size_sqm}, ${listing.bedrooms}, ${listing.bathrooms}, ${listing.floor}, ${listing.year_built},
        ${listing.agency_name}, ${listing.agency_phone}, ${JSON.stringify(listing.images)}::jsonb, ${listing.listing_date}, ${JSON.stringify(listing.raw_data)}::jsonb,
        NOW(), NOW(), true
      )
    `;

    // Record initial price
    if (listing.price) {
      await prismadb.$queryRaw`
        INSERT INTO market_intel.price_history (organization_id, listing_id, price, price_per_sqm, change_type)
        SELECT ${listing.organization_id}, id, ${listing.price}, ${listing.price_per_sqm}, 'initial'
        FROM market_intel.competitor_listings 
        WHERE organization_id = ${listing.organization_id}
          AND source_platform = ${listing.source_platform}
          AND source_listing_id = ${listing.source_listing_id}
      `;
    }

    return { isNew: true, priceChanged: false };
  }

  // Update existing listing
  const oldPrice = existing[0].price;
  const priceChanged = oldPrice !== listing.price && listing.price !== null;

  await prismadb.$queryRaw`
    UPDATE market_intel.competitor_listings SET
      title = ${listing.title},
      price = ${listing.price},
      price_per_sqm = ${listing.price_per_sqm},
      property_type = ${listing.property_type},
      transaction_type = ${listing.transaction_type},
      address = ${listing.address},
      area = ${listing.area},
      municipality = ${listing.municipality},
      postal_code = ${listing.postal_code},
      latitude = ${listing.latitude},
      longitude = ${listing.longitude},
      size_sqm = ${listing.size_sqm},
      bedrooms = ${listing.bedrooms},
      bathrooms = ${listing.bathrooms},
      floor = ${listing.floor},
      year_built = ${listing.year_built},
      agency_name = ${listing.agency_name},
      agency_phone = ${listing.agency_phone},
      images = ${JSON.stringify(listing.images)}::jsonb,
      raw_data = ${JSON.stringify(listing.raw_data)}::jsonb,
      last_seen_at = NOW(),
      is_active = true
    WHERE organization_id = ${listing.organization_id}
      AND source_platform = ${listing.source_platform}
      AND source_listing_id = ${listing.source_listing_id}
  `;

  // Record price change
  if (priceChanged && listing.price) {
    const changeType = oldPrice && listing.price > oldPrice ? 'increase' : 'decrease';
    await prismadb.$queryRaw`
      INSERT INTO market_intel.price_history (organization_id, listing_id, price, price_per_sqm, change_type)
      VALUES (${listing.organization_id}, ${existing[0].id}::uuid, ${listing.price}, ${listing.price_per_sqm}, ${changeType})
    `;
  }

  return { isNew: false, priceChanged };
}

/**
 * Deactivate listings not seen in recent scrape
 */
export async function deactivateOldListings(
  organizationId: string,
  platform: string,
  seenListingIds: string[]
): Promise<number> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return 0;

  if (seenListingIds.length === 0) return 0;

  const result = await prismadb.$queryRaw<[{ count: bigint }]>`
    WITH updated AS (
      UPDATE market_intel.competitor_listings
      SET is_active = false
      WHERE organization_id = ${organizationId}
        AND source_platform = ${platform}
        AND source_listing_id != ALL(${seenListingIds}::text[])
        AND is_active = true
      RETURNING id
    )
    SELECT COUNT(*) as count FROM updated
  `;

  return Number(result[0].count);
}

export interface CompetitorListing {
  id: string;
  source_platform: string;
  source_listing_id: string;
  source_url: string;
  title: string | null;
  price: number | null;
  price_per_sqm: number | null;
  property_type: string | null;
  transaction_type: string | null;
  address: string | null;
  area: string | null;
  municipality: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  size_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  year_built: number | null;
  agency_name: string | null;
  agency_phone: string | null;
  images: string[];
  listing_date: Date | null;
  last_seen_at: Date;
  first_scraped_at: Date;
  days_on_market: number | null;
  is_active: boolean;
}

export interface ListingFilters {
  organizationId?: string; // Required for multi-tenant queries
  area?: string;
  municipality?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  bedrooms?: number;
  propertyType?: string;
  transactionType?: 'sale' | 'rent';
  platform?: string;
  isActive?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get competitor listings with filters and pagination
 */
export async function getCompetitorListings(
  filters: ListingFilters = {},
  pagination: PaginationOptions = {}
): Promise<{ listings: CompetitorListing[]; total: number; page: number; totalPages: number }> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) {
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  }

  const {
    page = 1,
    limit = 20,
    sortBy = 'last_seen_at',
    sortOrder = 'desc'
  } = pagination;

  const offset = (page - 1) * limit;
  const whereConditions: string[] = ['is_active = true'];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Organization filter (required for multi-tenant)
  if (filters.organizationId) {
    whereConditions.push(`organization_id = $${paramIndex++}`);
    params.push(filters.organizationId);
  }

  if (filters.area) {
    whereConditions.push(`area = $${paramIndex++}`);
    params.push(filters.area);
  }

  if (filters.municipality) {
    whereConditions.push(`municipality = $${paramIndex++}`);
    params.push(filters.municipality);
  }

  if (filters.minPrice) {
    whereConditions.push(`price >= $${paramIndex++}`);
    params.push(filters.minPrice);
  }

  if (filters.maxPrice) {
    whereConditions.push(`price <= $${paramIndex++}`);
    params.push(filters.maxPrice);
  }

  if (filters.minSize) {
    whereConditions.push(`size_sqm >= $${paramIndex++}`);
    params.push(filters.minSize);
  }

  if (filters.maxSize) {
    whereConditions.push(`size_sqm <= $${paramIndex++}`);
    params.push(filters.maxSize);
  }

  if (filters.bedrooms) {
    whereConditions.push(`bedrooms = $${paramIndex++}`);
    params.push(filters.bedrooms);
  }

  if (filters.propertyType) {
    whereConditions.push(`property_type = $${paramIndex++}`);
    params.push(filters.propertyType);
  }

  if (filters.transactionType) {
    whereConditions.push(`transaction_type = $${paramIndex++}`);
    params.push(filters.transactionType);
  }

  if (filters.platform) {
    whereConditions.push(`source_platform = $${paramIndex++}`);
    params.push(filters.platform);
  }

  if (filters.search) {
    whereConditions.push(`(title ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');
  const validSortColumns = ['price', 'price_per_sqm', 'size_sqm', 'days_on_market', 'last_seen_at', 'first_scraped_at'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'last_seen_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    // Get total count
    const countResult = await prismadb.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM market_intel.competitor_listings WHERE ${whereClause}`,
      ...params
    );
    const total = Number(countResult[0].count);

    // Get listings
    const listings = await prismadb.$queryRawUnsafe<CompetitorListing[]>(
      `SELECT * FROM market_intel.competitor_listings 
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT ${limit} OFFSET ${offset}`,
      ...params
    );

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error fetching competitor listings:', error);
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Get a single listing by ID
 */
export async function getCompetitorListingById(id: string): Promise<CompetitorListing | null> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return null;

  try {
    const result = await prismadb.$queryRaw<CompetitorListing[]>`
      SELECT * FROM market_intel.competitor_listings WHERE id = ${id}::uuid
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching listing by ID:', error);
    return null;
  }
}

/**
 * Get market statistics by area
 */
export async function getMarketStatsByArea(organizationId?: string): Promise<Array<{
  area: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerSqm: number;
  minPrice: number;
  maxPrice: number;
}>> {
  // Check if schema exists first
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) {
    return []; // Return empty array if schema doesn't exist
  }

  try {
    // Use parameterized query to prevent SQL injection
    const result = organizationId 
      ? await prismadb.$queryRaw<Array<{
          area: string;
          total_listings: bigint;
          avg_price: number;
          avg_price_per_sqm: number;
          min_price: number;
          max_price: number;
        }>>`
          SELECT 
            area,
            COUNT(*) as total_listings,
            AVG(price)::integer as avg_price,
            AVG(price_per_sqm)::integer as avg_price_per_sqm,
            MIN(price) as min_price,
            MAX(price) as max_price
          FROM market_intel.competitor_listings
          WHERE is_active = true AND area IS NOT NULL AND organization_id = ${organizationId}
          GROUP BY area
          ORDER BY COUNT(*) DESC
        `
      : await prismadb.$queryRaw<Array<{
          area: string;
          total_listings: bigint;
          avg_price: number;
          avg_price_per_sqm: number;
          min_price: number;
          max_price: number;
        }>>`
          SELECT 
            area,
            COUNT(*) as total_listings,
            AVG(price)::integer as avg_price,
            AVG(price_per_sqm)::integer as avg_price_per_sqm,
            MIN(price) as min_price,
            MAX(price) as max_price
          FROM market_intel.competitor_listings
          WHERE is_active = true AND area IS NOT NULL
          GROUP BY area
          ORDER BY COUNT(*) DESC
        `;

    return result.map(r => ({
      area: r.area,
      totalListings: Number(r.total_listings),
      avgPrice: r.avg_price || 0,
      avgPricePerSqm: r.avg_price_per_sqm || 0,
      minPrice: r.min_price || 0,
      maxPrice: r.max_price || 0
    }));
  } catch (error) {
    console.error('Error fetching market stats by area:', error);
    return [];
  }
}

/**
 * Get platform statistics
 */
export async function getPlatformStats(organizationId?: string): Promise<Array<{
  platform: string;
  totalListings: number;
  avgPrice: number;
  lastScrape: Date | null;
}>> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) {
    return [];
  }

  try {
    // Use parameterized query to prevent SQL injection
    const result = organizationId
      ? await prismadb.$queryRaw<Array<{
          source_platform: string;
          total_listings: bigint;
          avg_price: number;
          last_scrape: Date | null;
        }>>`
          SELECT 
            source_platform,
            COUNT(*) as total_listings,
            AVG(price)::integer as avg_price,
            MAX(last_seen_at) as last_scrape
          FROM market_intel.competitor_listings
          WHERE is_active = true AND organization_id = ${organizationId}
          GROUP BY source_platform
        `
      : await prismadb.$queryRaw<Array<{
          source_platform: string;
          total_listings: bigint;
          avg_price: number;
          last_scrape: Date | null;
        }>>`
          SELECT 
            source_platform,
            COUNT(*) as total_listings,
            AVG(price)::integer as avg_price,
            MAX(last_seen_at) as last_scrape
          FROM market_intel.competitor_listings
          WHERE is_active = true
          GROUP BY source_platform
        `;

    return result.map(r => ({
      platform: r.source_platform,
      totalListings: Number(r.total_listings),
      avgPrice: r.avg_price || 0,
      lastScrape: r.last_scrape
    }));
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return [];
  }
}

/**
 * Get recent price changes
 */
export async function getRecentPriceChanges(
  organizationId: string,
  hoursAgo: number = 168,
  changeType?: 'increase' | 'decrease'
): Promise<Array<{
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changeType: string;
  recordedAt: Date;
  listing: CompetitorListing;
}>> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    // Calculate the cutoff date to avoid string interpolation for INTERVAL
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    // Use separate parameterized queries based on changeType to avoid SQL injection
    const result = changeType
      ? await prismadb.$queryRaw<Array<{
          listing_id: string;
          price: number;
          change_type: string;
          recorded_at: Date;
          prev_price: number;
        }>>`
          WITH changes AS (
            SELECT 
              ph.listing_id,
              ph.price,
              ph.change_type,
              ph.recorded_at,
              LAG(ph.price) OVER (PARTITION BY ph.listing_id ORDER BY ph.recorded_at) as prev_price
            FROM market_intel.price_history ph
            WHERE ph.organization_id = ${organizationId}
              AND ph.recorded_at > ${cutoffDate}
              AND ph.change_type = ${changeType}
          )
          SELECT * FROM changes 
          WHERE prev_price IS NOT NULL AND change_type != 'initial'
          ORDER BY recorded_at DESC
          LIMIT 100
        `
      : await prismadb.$queryRaw<Array<{
          listing_id: string;
          price: number;
          change_type: string;
          recorded_at: Date;
          prev_price: number;
        }>>`
          WITH changes AS (
            SELECT 
              ph.listing_id,
              ph.price,
              ph.change_type,
              ph.recorded_at,
              LAG(ph.price) OVER (PARTITION BY ph.listing_id ORDER BY ph.recorded_at) as prev_price
            FROM market_intel.price_history ph
            WHERE ph.organization_id = ${organizationId}
              AND ph.recorded_at > ${cutoffDate}
          )
          SELECT * FROM changes 
          WHERE prev_price IS NOT NULL AND change_type != 'initial'
          ORDER BY recorded_at DESC
          LIMIT 100
        `;

    // Get listing details
    const listingIds = result.map(r => r.listing_id);
    if (listingIds.length === 0) return [];

    const listings = await prismadb.$queryRaw<CompetitorListing[]>`
      SELECT * FROM market_intel.competitor_listings 
      WHERE organization_id = ${organizationId} AND id = ANY(${listingIds}::uuid[])
    `;
    const listingsMap = new Map(listings.map(l => [l.id, l]));

    return result
      .filter(r => listingsMap.has(r.listing_id))
      .map(r => ({
        listingId: r.listing_id,
        oldPrice: r.prev_price,
        newPrice: r.price,
        changePercent: Math.round(((r.price - r.prev_price) / r.prev_price) * 100 * 10) / 10,
        changeType: r.change_type,
        recordedAt: r.recorded_at,
        listing: listingsMap.get(r.listing_id)!
      }));
  } catch (error) {
    console.error('Error fetching price changes:', error);
    return [];
  }
}

/**
 * Get underpriced listings (below market average)
 */
export async function getUnderpricedListings(
  organizationId: string,
  thresholdPercent: number = 15
): Promise<Array<{
  listing: CompetitorListing;
  marketAvgPricePerSqm: number;
  percentBelowMarket: number;
}>> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    const result = await prismadb.$queryRaw<Array<{
      id: string;
      area: string;
      property_type: string;
      price_per_sqm: number;
      avg_price_per_sqm: number;
    }>>`
      WITH area_avgs AS (
        SELECT area, property_type, AVG(price_per_sqm) as avg_price_per_sqm
        FROM market_intel.competitor_listings
        WHERE organization_id = ${organizationId} AND is_active = true AND price_per_sqm > 0
        GROUP BY area, property_type
        HAVING COUNT(*) >= 5
      )
      SELECT 
        cl.id,
        cl.area,
        cl.property_type,
        cl.price_per_sqm,
        aa.avg_price_per_sqm
      FROM market_intel.competitor_listings cl
      JOIN area_avgs aa ON cl.area = aa.area AND cl.property_type = aa.property_type
      WHERE cl.organization_id = ${organizationId}
        AND cl.is_active = true
        AND cl.price_per_sqm > 0
        AND ((aa.avg_price_per_sqm - cl.price_per_sqm) / aa.avg_price_per_sqm * 100) >= ${thresholdPercent}
      ORDER BY ((aa.avg_price_per_sqm - cl.price_per_sqm) / aa.avg_price_per_sqm) DESC
      LIMIT 50
    `;

    // Get full listing details
    const listingIds = result.map(r => r.id);
    if (listingIds.length === 0) return [];

    const listings = await prismadb.$queryRaw<CompetitorListing[]>`
      SELECT * FROM market_intel.competitor_listings 
      WHERE organization_id = ${organizationId} AND id = ANY(${listingIds}::uuid[])
    `;
    const listingsMap = new Map(listings.map(l => [l.id, l]));

    return result
      .filter(r => listingsMap.has(r.id))
      .map(r => ({
        listing: listingsMap.get(r.id)!,
        marketAvgPricePerSqm: Math.round(r.avg_price_per_sqm),
        percentBelowMarket: Math.round(((r.avg_price_per_sqm - r.price_per_sqm) / r.avg_price_per_sqm) * 100 * 10) / 10
      }));
  } catch (error) {
    console.error('Error fetching underpriced listings:', error);
    return [];
  }
}

/**
 * Get new listings in the last N hours
 */
export async function getNewListings(
  organizationId: string,
  hoursAgo: number = 24
): Promise<CompetitorListing[]> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    // Calculate the cutoff date to avoid string interpolation for INTERVAL
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const result = await prismadb.$queryRaw<CompetitorListing[]>`
      SELECT * FROM market_intel.competitor_listings
      WHERE organization_id = ${organizationId}
        AND is_active = true
        AND first_scraped_at > ${cutoffDate}
      ORDER BY first_scraped_at DESC
      LIMIT 100
    `;
    return result;
  } catch (error) {
    console.error('Error fetching new listings:', error);
    return [];
  }
}

/**
 * Get scrape logs
 */
export async function getScrapeLogs(
  organizationId: string,
  platform?: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  platform: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  pagesScraped: number;
  errorMessage: string | null;
}>> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    // Validate and sanitize the limit to prevent issues
    const safeLimit = Math.min(Math.max(1, limit), 100);
    
    // Use separate parameterized queries based on platform filter
    const result = platform
      ? await prismadb.$queryRaw<Array<{
          id: string;
          platform: string;
          started_at: Date;
          completed_at: Date | null;
          status: string;
          listings_found: number;
          listings_new: number;
          listings_updated: number;
          pages_scraped: number;
          error_message: string | null;
        }>>`
          SELECT * FROM market_intel.scrape_logs 
          WHERE organization_id = ${organizationId} AND platform = ${platform}
          ORDER BY started_at DESC 
          LIMIT ${safeLimit}
        `
      : await prismadb.$queryRaw<Array<{
          id: string;
          platform: string;
          started_at: Date;
          completed_at: Date | null;
          status: string;
          listings_found: number;
          listings_new: number;
          listings_updated: number;
          pages_scraped: number;
          error_message: string | null;
        }>>`
          SELECT * FROM market_intel.scrape_logs 
          WHERE organization_id = ${organizationId}
          ORDER BY started_at DESC 
          LIMIT ${safeLimit}
        `;

    return result.map(r => ({
      id: r.id,
      platform: r.platform,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      status: r.status,
      listingsFound: r.listings_found,
      listingsNew: r.listings_new,
      listingsUpdated: r.listings_updated,
      pagesScraped: r.pages_scraped,
      errorMessage: r.error_message
    }));
  } catch (error) {
    console.error('Error fetching scrape logs:', error);
    return [];
  }
}

/**
 * Get distinct areas
 */
export async function getDistinctAreas(organizationId: string): Promise<string[]> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    const result = await prismadb.$queryRaw<Array<{ area: string }>>`
      SELECT DISTINCT area FROM market_intel.competitor_listings
      WHERE organization_id = ${organizationId} AND is_active = true AND area IS NOT NULL
      ORDER BY area
    `;
    return result.map(r => r.area);
  } catch (error) {
    console.error('Error fetching distinct areas:', error);
    return [];
  }
}

/**
 * Get price trend for an area
 */
export async function getAreaPriceTrend(
  organizationId: string,
  area: string,
  monthsBack: number = 6
): Promise<Array<{
  month: string;
  avgPrice: number;
  avgPricePerSqm: number;
  listingCount: number;
}>> {
  const schemaExists = await checkSchemaExists();
  if (!schemaExists) return [];

  try {
    // Calculate the cutoff date to avoid string interpolation for INTERVAL
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    
    const result = await prismadb.$queryRaw<Array<{
      month: string;
      avg_price: number;
      avg_price_per_sqm: number;
      listing_count: bigint;
    }>>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', first_scraped_at), 'YYYY-MM') as month,
        AVG(price)::integer as avg_price,
        AVG(price_per_sqm)::integer as avg_price_per_sqm,
        COUNT(*) as listing_count
      FROM market_intel.competitor_listings
      WHERE organization_id = ${organizationId}
        AND area = ${area}
        AND first_scraped_at > ${cutoffDate}
        AND price IS NOT NULL
      GROUP BY DATE_TRUNC('month', first_scraped_at)
      ORDER BY month
    `;

    return result.map(r => ({
      month: r.month,
      avgPrice: r.avg_price || 0,
      avgPricePerSqm: r.avg_price_per_sqm || 0,
      listingCount: Number(r.listing_count)
    }));
  } catch (error) {
    console.error('Error fetching area price trend:', error);
    return [];
  }
}

import pg from 'pg';
import { pino } from 'pino';
import type { 
  NormalizedListing, 
  CompetitorListingRow, 
  ScrapeLog,
  PriceChange,
  ListingMatch 
} from '../types/index.js';

const { Pool } = pg;

const logger = pino({ name: 'db-client' });

// Database connection pool
let pool: pg.Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initDatabase(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
  });

  logger.info('Database pool initialized');
  return pool;
}

/**
 * Get database pool instance
 */
export function getPool(): pg.Pool {
  if (!pool) {
    return initDatabase();
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

// ===========================================
// Listing Operations
// ===========================================

/**
 * Upsert a listing (insert or update if exists)
 */
export async function upsertListing(
  listing: NormalizedListing
): Promise<{ isNew: boolean; priceChanged: boolean; oldPrice?: number }> {
  const db = getPool();
  
  // Check if listing exists
  const existing = await db.query<{ id: string; price: number | null }>(
    `SELECT id, price FROM market_intel.competitor_listings 
     WHERE source_platform = $1 AND source_listing_id = $2`,
    [listing.source_platform, listing.source_listing_id]
  );

  const isNew = existing.rows.length === 0;
  let priceChanged = false;
  let oldPrice: number | undefined;

  if (isNew) {
    // Insert new listing
    await db.query(
      `INSERT INTO market_intel.competitor_listings (
        source_platform, source_listing_id, source_url, title, price, price_per_sqm,
        property_type, transaction_type, address, area, municipality, postal_code,
        latitude, longitude, size_sqm, bedrooms, bathrooms, floor, year_built,
        agency_name, agency_phone, images, listing_date, raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        listing.source_platform,
        listing.source_listing_id,
        listing.source_url,
        listing.title,
        listing.price,
        listing.price_per_sqm,
        listing.property_type,
        listing.transaction_type,
        listing.address,
        listing.area,
        listing.municipality,
        listing.postal_code,
        listing.latitude,
        listing.longitude,
        listing.size_sqm,
        listing.bedrooms,
        listing.bathrooms,
        listing.floor,
        listing.year_built,
        listing.agency_name,
        listing.agency_phone,
        JSON.stringify(listing.images),
        listing.listing_date,
        JSON.stringify(listing.raw_data)
      ]
    );

    // Record initial price in history
    if (listing.price) {
      await recordPriceHistory(listing.source_platform, listing.source_listing_id, listing.price, 'initial');
    }
  } else {
    // Update existing listing
    const existingRow = existing.rows[0];
    oldPrice = existingRow.price ?? undefined;
    priceChanged = listing.price !== null && oldPrice !== undefined && listing.price !== oldPrice;

    await db.query(
      `UPDATE market_intel.competitor_listings SET
        source_url = $3, title = $4, price = $5, price_per_sqm = $6,
        property_type = $7, transaction_type = $8, address = $9, area = $10,
        municipality = $11, postal_code = $12, latitude = $13, longitude = $14,
        size_sqm = $15, bedrooms = $16, bathrooms = $17, floor = $18, year_built = $19,
        agency_name = $20, agency_phone = $21, images = $22, listing_date = $23,
        raw_data = $24, last_seen_at = NOW(), is_active = true
      WHERE source_platform = $1 AND source_listing_id = $2`,
      [
        listing.source_platform,
        listing.source_listing_id,
        listing.source_url,
        listing.title,
        listing.price,
        listing.price_per_sqm,
        listing.property_type,
        listing.transaction_type,
        listing.address,
        listing.area,
        listing.municipality,
        listing.postal_code,
        listing.latitude,
        listing.longitude,
        listing.size_sqm,
        listing.bedrooms,
        listing.bathrooms,
        listing.floor,
        listing.year_built,
        listing.agency_name,
        listing.agency_phone,
        JSON.stringify(listing.images),
        listing.listing_date,
        JSON.stringify(listing.raw_data)
      ]
    );

    // Record price change in history
    if (priceChanged && listing.price) {
      const changeType = listing.price > (oldPrice ?? 0) ? 'increase' : 'decrease';
      await recordPriceHistory(listing.source_platform, listing.source_listing_id, listing.price, changeType);
    }
  }

  return { isNew, priceChanged, oldPrice };
}

/**
 * Record a price in the price history table
 */
async function recordPriceHistory(
  platform: string,
  listingId: string,
  price: number,
  changeType: 'initial' | 'increase' | 'decrease'
): Promise<void> {
  const db = getPool();
  
  await db.query(
    `INSERT INTO market_intel.price_history (listing_id, price, price_per_sqm, change_type)
     SELECT id, $3, price_per_sqm, $4
     FROM market_intel.competitor_listings
     WHERE source_platform = $1 AND source_listing_id = $2`,
    [platform, listingId, price, changeType]
  );
}

/**
 * Mark listings as inactive if they weren't seen in the current scrape
 */
export async function deactivateOldListings(
  platform: string,
  activeListingIds: string[]
): Promise<number> {
  const db = getPool();
  
  const result = await db.query(
    `UPDATE market_intel.competitor_listings 
     SET is_active = false 
     WHERE source_platform = $1 
       AND is_active = true 
       AND source_listing_id != ALL($2)`,
    [platform, activeListingIds]
  );

  return result.rowCount ?? 0;
}

/**
 * Get listings by area for market analysis
 */
export async function getListingsByArea(
  area: string,
  options?: {
    transactionType?: string;
    propertyType?: string;
    isActive?: boolean;
    limit?: number;
  }
): Promise<CompetitorListingRow[]> {
  const db = getPool();
  
  let query = `SELECT * FROM market_intel.competitor_listings WHERE area = $1`;
  const params: unknown[] = [area];
  let paramIndex = 2;

  if (options?.transactionType) {
    query += ` AND transaction_type = $${paramIndex++}`;
    params.push(options.transactionType);
  }

  if (options?.propertyType) {
    query += ` AND property_type = $${paramIndex++}`;
    params.push(options.propertyType);
  }

  if (options?.isActive !== undefined) {
    query += ` AND is_active = $${paramIndex++}`;
    params.push(options.isActive);
  }

  query += ` ORDER BY last_seen_at DESC`;

  if (options?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
  }

  const result = await db.query<CompetitorListingRow>(query, params);
  return result.rows;
}

/**
 * Find listings near coordinates (for deduplication)
 */
export async function findListingsNearCoordinates(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50
): Promise<CompetitorListingRow[]> {
  const db = getPool();
  
  // Simple bounding box approximation (1 degree ~ 111km at equator)
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(latitude * Math.PI / 180));

  const result = await db.query<CompetitorListingRow>(
    `SELECT * FROM market_intel.competitor_listings
     WHERE latitude BETWEEN $1 AND $2
       AND longitude BETWEEN $3 AND $4
       AND is_active = true`,
    [
      latitude - latDelta,
      latitude + latDelta,
      longitude - lonDelta,
      longitude + lonDelta
    ]
  );

  return result.rows;
}

// ===========================================
// Scrape Log Operations
// ===========================================

/**
 * Create a new scrape log entry
 */
export async function createScrapeLog(platform: string): Promise<string> {
  const db = getPool();
  
  const result = await db.query<{ id: string }>(
    `INSERT INTO market_intel.scrape_logs (platform) VALUES ($1) RETURNING id`,
    [platform]
  );

  return result.rows[0].id;
}

/**
 * Update scrape log with results
 */
export async function updateScrapeLog(
  logId: string,
  data: Partial<ScrapeLog>
): Promise<void> {
  const db = getPool();
  
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.completed_at !== undefined) {
    updates.push(`completed_at = $${paramIndex++}`);
    values.push(data.completed_at);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.listings_found !== undefined) {
    updates.push(`listings_found = $${paramIndex++}`);
    values.push(data.listings_found);
  }
  if (data.listings_new !== undefined) {
    updates.push(`listings_new = $${paramIndex++}`);
    values.push(data.listings_new);
  }
  if (data.listings_updated !== undefined) {
    updates.push(`listings_updated = $${paramIndex++}`);
    values.push(data.listings_updated);
  }
  if (data.listings_deactivated !== undefined) {
    updates.push(`listings_deactivated = $${paramIndex++}`);
    values.push(data.listings_deactivated);
  }
  if (data.error_message !== undefined) {
    updates.push(`error_message = $${paramIndex++}`);
    values.push(data.error_message);
  }
  if (data.pages_scraped !== undefined) {
    updates.push(`pages_scraped = $${paramIndex++}`);
    values.push(data.pages_scraped);
  }
  if (data.scrape_duration_ms !== undefined) {
    updates.push(`scrape_duration_ms = $${paramIndex++}`);
    values.push(data.scrape_duration_ms);
  }
  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) return;

  values.push(logId);
  await db.query(
    `UPDATE market_intel.scrape_logs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

/**
 * Get recent scrape logs
 */
export async function getRecentScrapeLogs(
  platform?: string,
  limit: number = 10
): Promise<ScrapeLog[]> {
  const db = getPool();
  
  let query = `SELECT * FROM market_intel.scrape_logs`;
  const params: unknown[] = [];

  if (platform) {
    query += ` WHERE platform = $1`;
    params.push(platform);
  }

  query += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await db.query<ScrapeLog>(query, params);
  return result.rows;
}

// ===========================================
// Listing Match Operations
// ===========================================

/**
 * Record a duplicate match between listings
 */
export async function recordListingMatch(match: ListingMatch): Promise<void> {
  const db = getPool();
  
  await db.query(
    `INSERT INTO market_intel.listing_matches 
     (primary_listing_id, matched_listing_id, match_confidence, match_reason, match_details)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (primary_listing_id, matched_listing_id) 
     DO UPDATE SET match_confidence = $3, match_reason = $4, match_details = $5`,
    [
      match.primaryListingId,
      match.matchedListingId,
      match.confidence,
      match.reason,
      JSON.stringify(match.details ?? {})
    ]
  );
}

/**
 * Get all matches for a listing
 */
export async function getListingMatches(listingId: string): Promise<ListingMatch[]> {
  const db = getPool();
  
  const result = await db.query<{
    primary_listing_id: string;
    matched_listing_id: string;
    match_confidence: string;
    match_reason: string;
    match_details: Record<string, unknown>;
  }>(
    `SELECT * FROM market_intel.listing_matches 
     WHERE primary_listing_id = $1 OR matched_listing_id = $1`,
    [listingId]
  );

  return result.rows.map(row => ({
    primaryListingId: row.primary_listing_id,
    matchedListingId: row.matched_listing_id,
    confidence: parseFloat(row.match_confidence),
    reason: row.match_reason as ListingMatch['reason'],
    details: row.match_details
  }));
}

// ===========================================
// Price Change Detection
// ===========================================

/**
 * Get recent price changes for a platform
 */
export async function getRecentPriceChanges(
  platform: string,
  hoursAgo: number = 24
): Promise<PriceChange[]> {
  const db = getPool();
  
  const result = await db.query<{
    listing_id: string;
    price: number;
    change_type: string;
    recorded_at: Date;
  }>(
    `SELECT ph.listing_id, ph.price, ph.change_type, ph.recorded_at
     FROM market_intel.price_history ph
     JOIN market_intel.competitor_listings cl ON cl.id = ph.listing_id
     WHERE cl.source_platform = $1
       AND ph.change_type IN ('increase', 'decrease')
       AND ph.recorded_at > NOW() - INTERVAL '${hoursAgo} hours'
     ORDER BY ph.recorded_at DESC`,
    [platform]
  );

  // Get the previous price for each change
  const changes: PriceChange[] = [];
  for (const row of result.rows) {
    const prevPrice = await db.query<{ price: number }>(
      `SELECT price FROM market_intel.price_history
       WHERE listing_id = $1 AND recorded_at < $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [row.listing_id, row.recorded_at]
    );

    if (prevPrice.rows.length > 0) {
      const oldPrice = prevPrice.rows[0].price;
      changes.push({
        listingId: row.listing_id,
        oldPrice,
        newPrice: row.price,
        changePercent: ((row.price - oldPrice) / oldPrice) * 100,
        changeType: row.change_type as 'increase' | 'decrease'
      });
    }
  }

  return changes;
}

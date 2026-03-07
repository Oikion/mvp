import { pino } from 'pino';
import { getPool, getRecentPriceChanges } from '../db/client.js';
import type { CompetitorListingRow, PriceChange } from '../types/index.js';

const logger = pino({ name: 'price-tracker' });

/**
 * Get significant price drops (potential opportunities)
 */
export async function getSignificantPriceDrops(
  minDropPercent: number = 5,
  hoursAgo: number = 168 // Last week
): Promise<Array<PriceChange & { listing: CompetitorListingRow }>> {
  const db = getPool();
  
  const result = await db.query<{
    listing_id: string;
    old_price: number;
    new_price: number;
    change_percent: number;
    recorded_at: Date;
  }>(
    `WITH price_changes AS (
      SELECT 
        ph.listing_id,
        LAG(ph.price) OVER (PARTITION BY ph.listing_id ORDER BY ph.recorded_at) as old_price,
        ph.price as new_price,
        ph.recorded_at,
        ph.change_type
      FROM market_intel.price_history ph
      WHERE ph.recorded_at > NOW() - INTERVAL '${hoursAgo} hours'
    )
    SELECT 
      pc.listing_id,
      pc.old_price,
      pc.new_price,
      ROUND(((pc.old_price - pc.new_price)::numeric / pc.old_price * 100), 2) as change_percent,
      pc.recorded_at
    FROM price_changes pc
    WHERE pc.old_price IS NOT NULL
      AND pc.old_price > pc.new_price
      AND ((pc.old_price - pc.new_price)::numeric / pc.old_price * 100) >= $1
    ORDER BY change_percent DESC`,
    [minDropPercent]
  );
  
  // Fetch full listing details
  const listingIds = result.rows.map(r => r.listing_id);
  if (listingIds.length === 0) return [];
  
  const listings = await db.query<CompetitorListingRow>(
    `SELECT * FROM market_intel.competitor_listings WHERE id = ANY($1)`,
    [listingIds]
  );
  
  const listingsMap = new Map(listings.rows.map(l => [l.id, l]));
  
  return result.rows
    .filter(r => listingsMap.has(r.listing_id))
    .map(r => ({
      listingId: r.listing_id,
      oldPrice: r.old_price,
      newPrice: r.new_price,
      changePercent: -r.change_percent, // Negative for drops
      changeType: 'decrease' as const,
      listing: listingsMap.get(r.listing_id)!
    }));
}

/**
 * Get underpriced listings compared to market average
 */
export async function getUnderpricedListings(
  thresholdPercent: number = 15 // 15% below market average
): Promise<Array<{
  listing: CompetitorListingRow;
  marketAvgPricePerSqm: number;
  listingPricePerSqm: number;
  percentBelowMarket: number;
}>> {
  const db = getPool();
  
  // Calculate area averages
  const areaAverages = await db.query<{
    area: string;
    property_type: string;
    avg_price_per_sqm: number;
    listing_count: number;
  }>(
    `SELECT 
      area,
      property_type,
      AVG(price_per_sqm) as avg_price_per_sqm,
      COUNT(*) as listing_count
     FROM market_intel.competitor_listings
     WHERE is_active = true
       AND price_per_sqm IS NOT NULL
       AND price_per_sqm > 0
     GROUP BY area, property_type
     HAVING COUNT(*) >= 5` // Need at least 5 listings for meaningful average
  );
  
  const avgMap = new Map(
    areaAverages.rows.map(r => [`${r.area}:${r.property_type}`, r.avg_price_per_sqm])
  );
  
  // Find listings below threshold
  const result = await db.query<CompetitorListingRow>(
    `SELECT * FROM market_intel.competitor_listings
     WHERE is_active = true
       AND price_per_sqm IS NOT NULL
       AND price_per_sqm > 0
       AND area IS NOT NULL`
  );
  
  const underpriced: Array<{
    listing: CompetitorListingRow;
    marketAvgPricePerSqm: number;
    listingPricePerSqm: number;
    percentBelowMarket: number;
  }> = [];
  
  for (const listing of result.rows) {
    const key = `${listing.area}:${listing.property_type}`;
    const avgPrice = avgMap.get(key);
    
    if (!avgPrice || !listing.price_per_sqm) continue;
    
    const percentBelow = ((avgPrice - listing.price_per_sqm) / avgPrice) * 100;
    
    if (percentBelow >= thresholdPercent) {
      underpriced.push({
        listing,
        marketAvgPricePerSqm: Math.round(avgPrice),
        listingPricePerSqm: listing.price_per_sqm,
        percentBelowMarket: Math.round(percentBelow * 10) / 10
      });
    }
  }
  
  // Sort by percent below market (highest first)
  return underpriced.sort((a, b) => b.percentBelowMarket - a.percentBelowMarket);
}

/**
 * Get listings that have been on market for a long time
 */
export async function getStaleListings(
  minDaysOnMarket: number = 90
): Promise<CompetitorListingRow[]> {
  const db = getPool();
  
  const result = await db.query<CompetitorListingRow>(
    `SELECT * FROM market_intel.competitor_listings
     WHERE is_active = true
       AND (
         days_on_market >= $1
         OR (listing_date IS NOT NULL AND CURRENT_DATE - listing_date >= $1)
         OR (first_scraped_at IS NOT NULL AND CURRENT_DATE - first_scraped_at::date >= $1)
       )
     ORDER BY days_on_market DESC NULLS LAST`,
    [minDaysOnMarket]
  );
  
  return result.rows;
}

/**
 * Get market trend data for an area
 */
export async function getAreaPriceTrend(
  area: string,
  monthsBack: number = 6
): Promise<Array<{
  month: string;
  avgPrice: number;
  avgPricePerSqm: number;
  listingCount: number;
  medianPrice: number;
}>> {
  const db = getPool();
  
  const result = await db.query<{
    month: string;
    avg_price: number;
    avg_price_per_sqm: number;
    listing_count: number;
    prices: number[];
  }>(
    `SELECT 
      TO_CHAR(DATE_TRUNC('month', first_scraped_at), 'YYYY-MM') as month,
      AVG(price) as avg_price,
      AVG(price_per_sqm) as avg_price_per_sqm,
      COUNT(*) as listing_count,
      ARRAY_AGG(price ORDER BY price) FILTER (WHERE price IS NOT NULL) as prices
     FROM market_intel.competitor_listings
     WHERE area = $1
       AND first_scraped_at > NOW() - INTERVAL '${monthsBack} months'
       AND price IS NOT NULL
     GROUP BY DATE_TRUNC('month', first_scraped_at)
     ORDER BY month`,
    [area]
  );
  
  return result.rows.map(r => ({
    month: r.month,
    avgPrice: Math.round(r.avg_price),
    avgPricePerSqm: Math.round(r.avg_price_per_sqm),
    listingCount: Number(r.listing_count),
    medianPrice: calculateMedian(r.prices || [])
  }));
}

/**
 * Get new listings in the last N hours
 */
export async function getNewListings(
  hoursAgo: number = 24,
  filters?: {
    area?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
  }
): Promise<CompetitorListingRow[]> {
  const db = getPool();
  
  let query = `
    SELECT * FROM market_intel.competitor_listings
    WHERE is_active = true
      AND first_scraped_at > NOW() - INTERVAL '${hoursAgo} hours'
  `;
  const params: unknown[] = [];
  let paramIndex = 1;
  
  if (filters?.area) {
    query += ` AND area = $${paramIndex++}`;
    params.push(filters.area);
  }
  
  if (filters?.minPrice) {
    query += ` AND price >= $${paramIndex++}`;
    params.push(filters.minPrice);
  }
  
  if (filters?.maxPrice) {
    query += ` AND price <= $${paramIndex++}`;
    params.push(filters.maxPrice);
  }
  
  if (filters?.propertyType) {
    query += ` AND property_type = $${paramIndex++}`;
    params.push(filters.propertyType);
  }
  
  query += ` ORDER BY first_scraped_at DESC`;
  
  const result = await db.query<CompetitorListingRow>(query, params);
  return result.rows;
}

/**
 * Get market statistics by area
 */
export async function getMarketStatsByArea(): Promise<Array<{
  area: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerSqm: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  newListings24h: number;
  priceDrops7d: number;
}>> {
  const db = getPool();
  
  const result = await db.query<{
    area: string;
    total_listings: number;
    avg_price: number;
    avg_price_per_sqm: number;
    min_price: number;
    max_price: number;
    prices: number[];
  }>(
    `SELECT 
      area,
      COUNT(*) as total_listings,
      AVG(price) as avg_price,
      AVG(price_per_sqm) as avg_price_per_sqm,
      MIN(price) as min_price,
      MAX(price) as max_price,
      ARRAY_AGG(price ORDER BY price) FILTER (WHERE price IS NOT NULL) as prices
     FROM market_intel.competitor_listings
     WHERE is_active = true
       AND area IS NOT NULL
     GROUP BY area
     ORDER BY total_listings DESC`
  );
  
  // Get new listings and price drops
  const newListings = await db.query<{ area: string; count: number }>(
    `SELECT area, COUNT(*) as count
     FROM market_intel.competitor_listings
     WHERE is_active = true
       AND first_scraped_at > NOW() - INTERVAL '24 hours'
       AND area IS NOT NULL
     GROUP BY area`
  );
  const newMap = new Map(newListings.rows.map(r => [r.area, Number(r.count)]));
  
  const priceDrops = await db.query<{ area: string; count: number }>(
    `SELECT cl.area, COUNT(DISTINCT ph.listing_id) as count
     FROM market_intel.price_history ph
     JOIN market_intel.competitor_listings cl ON cl.id = ph.listing_id
     WHERE ph.change_type = 'decrease'
       AND ph.recorded_at > NOW() - INTERVAL '7 days'
       AND cl.area IS NOT NULL
     GROUP BY cl.area`
  );
  const dropsMap = new Map(priceDrops.rows.map(r => [r.area, Number(r.count)]));
  
  return result.rows.map(r => ({
    area: r.area,
    totalListings: Number(r.total_listings),
    avgPrice: Math.round(r.avg_price),
    avgPricePerSqm: Math.round(r.avg_price_per_sqm || 0),
    medianPrice: calculateMedian(r.prices || []),
    minPrice: r.min_price,
    maxPrice: r.max_price,
    newListings24h: newMap.get(r.area) || 0,
    priceDrops7d: dropsMap.get(r.area) || 0
  }));
}

/**
 * Get agency statistics
 */
export async function getAgencyStats(): Promise<Array<{
  agencyName: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerSqm: number;
  topAreas: string[];
  platforms: string[];
}>> {
  const db = getPool();
  
  const result = await db.query<{
    agency_name: string;
    total_listings: number;
    avg_price: number;
    avg_price_per_sqm: number;
    top_areas: string[];
    platforms: string[];
  }>(
    `SELECT 
      agency_name,
      COUNT(*) as total_listings,
      AVG(price) as avg_price,
      AVG(price_per_sqm) as avg_price_per_sqm,
      ARRAY_AGG(DISTINCT area) FILTER (WHERE area IS NOT NULL) as top_areas,
      ARRAY_AGG(DISTINCT source_platform) as platforms
     FROM market_intel.competitor_listings
     WHERE is_active = true
       AND agency_name IS NOT NULL
     GROUP BY agency_name
     HAVING COUNT(*) >= 3
     ORDER BY total_listings DESC
     LIMIT 100`
  );
  
  return result.rows.map(r => ({
    agencyName: r.agency_name,
    totalListings: Number(r.total_listings),
    avgPrice: Math.round(r.avg_price || 0),
    avgPricePerSqm: Math.round(r.avg_price_per_sqm || 0),
    topAreas: (r.top_areas || []).slice(0, 5),
    platforms: r.platforms || []
  }));
}

// Helper function
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

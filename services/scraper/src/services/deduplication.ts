import { pino } from 'pino';
import * as stringSimilarity from 'string-similarity';
import { 
  findListingsNearCoordinates, 
  recordListingMatch, 
  getPool 
} from '../db/client.js';
import type { 
  CompetitorListingRow, 
  NormalizedListing, 
  ListingMatch 
} from '../types/index.js';

const logger = pino({ name: 'deduplication' });

// Configuration for matching thresholds
const CONFIG = {
  // Coordinate matching
  COORD_RADIUS_METERS: 50,          // Properties within 50m are potential matches
  COORD_CONFIDENCE: 0.95,           // High confidence for coordinate matches
  
  // Address matching
  ADDRESS_SIMILARITY_THRESHOLD: 0.8, // 80% string similarity for addresses
  ADDRESS_CONFIDENCE: 0.85,          // Confidence for address matches
  
  // Combined matching
  SIZE_TOLERANCE_PERCENT: 10,        // 10% tolerance for size matching
  PRICE_TOLERANCE_PERCENT: 15,       // 15% tolerance for price matching
  COMBINED_CONFIDENCE: 0.90,         // Confidence for combined matches
  
  // Minimum confidence to record match
  MIN_CONFIDENCE: 0.70
};

/**
 * Find potential duplicate listings for a new/updated listing
 */
export async function findDuplicates(
  listing: NormalizedListing
): Promise<ListingMatch[]> {
  const matches: ListingMatch[] = [];
  
  // 1. Check coordinate-based matches (highest confidence)
  if (listing.latitude && listing.longitude) {
    const coordMatches = await findByCoordinates(listing);
    matches.push(...coordMatches);
  }
  
  // 2. Check address-based matches
  if (listing.address && listing.area) {
    const addressMatches = await findByAddress(listing);
    
    // Add address matches that aren't already in coord matches
    for (const match of addressMatches) {
      if (!matches.find(m => m.matchedListingId === match.matchedListingId)) {
        matches.push(match);
      }
    }
  }
  
  // 3. Check combined criteria (size + price + area)
  if (listing.size_sqm && listing.price && listing.area) {
    const combinedMatches = await findByCombinedCriteria(listing);
    
    // Add combined matches that aren't already found
    for (const match of combinedMatches) {
      const existing = matches.find(m => m.matchedListingId === match.matchedListingId);
      if (!existing) {
        matches.push(match);
      } else if (match.confidence > existing.confidence) {
        // Update if combined match has higher confidence
        existing.confidence = match.confidence;
        existing.reason = 'combined';
      }
    }
  }
  
  // Filter by minimum confidence
  return matches.filter(m => m.confidence >= CONFIG.MIN_CONFIDENCE);
}

/**
 * Find matches based on geographic coordinates
 */
async function findByCoordinates(listing: NormalizedListing): Promise<ListingMatch[]> {
  if (!listing.latitude || !listing.longitude) return [];
  
  const matches: ListingMatch[] = [];
  
  try {
    const nearbyListings = await findListingsNearCoordinates(
      listing.latitude,
      listing.longitude,
      CONFIG.COORD_RADIUS_METERS
    );
    
    for (const nearby of nearbyListings) {
      // Skip if same platform and listing ID (same listing)
      if (
        nearby.source_platform === listing.source_platform &&
        nearby.source_listing_id === listing.source_listing_id
      ) {
        continue;
      }
      
      // Calculate exact distance
      const distance = calculateDistance(
        listing.latitude,
        listing.longitude,
        parseFloat(nearby.latitude || '0'),
        parseFloat(nearby.longitude || '0')
      );
      
      // Confidence decreases with distance
      const distanceConfidence = Math.max(0, 1 - (distance / CONFIG.COORD_RADIUS_METERS));
      const confidence = CONFIG.COORD_CONFIDENCE * distanceConfidence;
      
      // Additional validation: check if size and type roughly match
      const sizeMatch = validateSizeMatch(listing.size_sqm, nearby.size_sqm);
      const typeMatch = listing.property_type === nearby.property_type;
      
      // Boost confidence if size and type match
      const finalConfidence = confidence * (sizeMatch ? 1.0 : 0.8) * (typeMatch ? 1.0 : 0.9);
      
      if (finalConfidence >= CONFIG.MIN_CONFIDENCE) {
        matches.push({
          primaryListingId: '', // Will be set after insert
          matchedListingId: nearby.id,
          confidence: Math.round(finalConfidence * 100) / 100,
          reason: 'coordinates',
          details: {
            distance,
            nearbyPlatform: nearby.source_platform,
            sizeMatch,
            typeMatch
          }
        });
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error finding coordinate matches');
  }
  
  return matches;
}

/**
 * Find matches based on address similarity
 */
async function findByAddress(listing: NormalizedListing): Promise<ListingMatch[]> {
  if (!listing.address) return [];
  
  const matches: ListingMatch[] = [];
  const db = getPool();
  
  try {
    // Get listings in the same area
    const result = await db.query<CompetitorListingRow>(
      `SELECT * FROM market_intel.competitor_listings
       WHERE area = $1
         AND source_platform != $2
         AND is_active = true
         AND address IS NOT NULL`,
      [listing.area, listing.source_platform]
    );
    
    const normalizedAddress = normalizeAddress(listing.address);
    
    for (const row of result.rows) {
      const rowAddress = normalizeAddress(row.address || '');
      
      // Calculate string similarity
      const similarity = stringSimilarity.compareTwoStrings(
        normalizedAddress,
        rowAddress
      );
      
      if (similarity >= CONFIG.ADDRESS_SIMILARITY_THRESHOLD) {
        // Validate with additional criteria
        const sizeMatch = validateSizeMatch(listing.size_sqm, row.size_sqm);
        const priceMatch = validatePriceMatch(listing.price, row.price);
        
        // Calculate confidence based on similarity and additional matches
        let confidence = similarity * CONFIG.ADDRESS_CONFIDENCE;
        if (sizeMatch) confidence *= 1.1;
        if (priceMatch) confidence *= 1.05;
        confidence = Math.min(1, confidence);
        
        if (confidence >= CONFIG.MIN_CONFIDENCE) {
          matches.push({
            primaryListingId: '',
            matchedListingId: row.id,
            confidence: Math.round(confidence * 100) / 100,
            reason: 'address',
            details: {
              addressSimilarity: similarity,
              matchedPlatform: row.source_platform,
              sizeMatch,
              priceMatch
            }
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error finding address matches');
  }
  
  return matches;
}

/**
 * Find matches based on combined criteria (size, price, area, property type)
 */
async function findByCombinedCriteria(listing: NormalizedListing): Promise<ListingMatch[]> {
  if (!listing.size_sqm || !listing.price || !listing.area) return [];
  
  const matches: ListingMatch[] = [];
  const db = getPool();
  
  try {
    // Calculate tolerance ranges
    const sizeTolerance = listing.size_sqm * (CONFIG.SIZE_TOLERANCE_PERCENT / 100);
    const priceTolerance = listing.price * (CONFIG.PRICE_TOLERANCE_PERCENT / 100);
    
    const result = await db.query<CompetitorListingRow>(
      `SELECT * FROM market_intel.competitor_listings
       WHERE area = $1
         AND source_platform != $2
         AND is_active = true
         AND size_sqm BETWEEN $3 AND $4
         AND price BETWEEN $5 AND $6
         AND property_type = $7`,
      [
        listing.area,
        listing.source_platform,
        listing.size_sqm - sizeTolerance,
        listing.size_sqm + sizeTolerance,
        listing.price - priceTolerance,
        listing.price + priceTolerance,
        listing.property_type
      ]
    );
    
    for (const row of result.rows) {
      // Calculate how close the match is
      const sizeDeviation = Math.abs((row.size_sqm || 0) - listing.size_sqm) / listing.size_sqm;
      const priceDeviation = Math.abs((row.price || 0) - listing.price) / listing.price;
      
      // Lower deviation = higher confidence
      const sizeScore = 1 - (sizeDeviation / (CONFIG.SIZE_TOLERANCE_PERCENT / 100));
      const priceScore = 1 - (priceDeviation / (CONFIG.PRICE_TOLERANCE_PERCENT / 100));
      
      // Check bedrooms match
      const bedroomMatch = listing.bedrooms === row.bedrooms;
      const bedroomScore = bedroomMatch ? 1.0 : 0.9;
      
      const confidence = CONFIG.COMBINED_CONFIDENCE * sizeScore * priceScore * bedroomScore;
      
      if (confidence >= CONFIG.MIN_CONFIDENCE) {
        matches.push({
          primaryListingId: '',
          matchedListingId: row.id,
          confidence: Math.round(confidence * 100) / 100,
          reason: 'combined',
          details: {
            sizeDeviation: Math.round(sizeDeviation * 100),
            priceDeviation: Math.round(priceDeviation * 100),
            bedroomMatch,
            matchedPlatform: row.source_platform
          }
        });
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error finding combined matches');
  }
  
  return matches;
}

/**
 * Process and record duplicate matches for a listing
 */
export async function processDuplicates(
  listingId: string,
  listing: NormalizedListing
): Promise<number> {
  const matches = await findDuplicates(listing);
  
  for (const match of matches) {
    match.primaryListingId = listingId;
    await recordListingMatch(match);
    
    logger.info({
      primaryId: listingId,
      matchedId: match.matchedListingId,
      confidence: match.confidence,
      reason: match.reason
    }, 'Recorded duplicate match');
  }
  
  return matches.length;
}

/**
 * Run deduplication across all active listings
 */
export async function runFullDeduplication(): Promise<{
  processed: number;
  matchesFound: number;
}> {
  const db = getPool();
  let processed = 0;
  let matchesFound = 0;
  
  logger.info('Starting full deduplication run');
  
  try {
    // Get all active listings
    const result = await db.query<CompetitorListingRow>(
      `SELECT * FROM market_intel.competitor_listings WHERE is_active = true ORDER BY created_at`
    );
    
    for (const row of result.rows) {
      const listing: NormalizedListing = {
        source_platform: row.source_platform,
        source_listing_id: row.source_listing_id,
        source_url: row.source_url,
        title: row.title,
        price: row.price,
        price_per_sqm: row.price_per_sqm,
        property_type: row.property_type as NormalizedListing['property_type'],
        transaction_type: row.transaction_type as NormalizedListing['transaction_type'],
        address: row.address,
        area: row.area,
        municipality: row.municipality,
        postal_code: row.postal_code,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        size_sqm: row.size_sqm,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        floor: row.floor,
        year_built: row.year_built,
        agency_name: row.agency_name,
        agency_phone: row.agency_phone,
        images: row.images || [],
        listing_date: row.listing_date,
        raw_data: row.raw_data || {}
      };
      
      const matches = await processDuplicates(row.id, listing);
      processed++;
      matchesFound += matches;
      
      if (processed % 100 === 0) {
        logger.info({ processed, matchesFound }, 'Deduplication progress');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error during full deduplication');
    throw err;
  }
  
  logger.info({ processed, matchesFound }, 'Full deduplication completed');
  return { processed, matchesFound };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    // Remove common Greek street prefixes
    .replace(/^(οδός|οδος|λεωφόρος|λεωφορος|πλατεία|πλατεια)\s*/i, '')
    // Remove numbers (often apartment/building numbers differ)
    .replace(/\d+/g, '')
    // Remove special characters
    .replace(/[,.\-_]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate if sizes match within tolerance
 */
function validateSizeMatch(
  size1: number | null | undefined,
  size2: number | null | undefined
): boolean {
  if (!size1 || !size2) return false;
  const tolerance = CONFIG.SIZE_TOLERANCE_PERCENT / 100;
  const diff = Math.abs(size1 - size2) / Math.max(size1, size2);
  return diff <= tolerance;
}

/**
 * Validate if prices match within tolerance
 */
function validatePriceMatch(
  price1: number | null | undefined,
  price2: number | null | undefined
): boolean {
  if (!price1 || !price2) return false;
  const tolerance = CONFIG.PRICE_TOLERANCE_PERCENT / 100;
  const diff = Math.abs(price1 - price2) / Math.max(price1, price2);
  return diff <= tolerance;
}

/**
 * Get duplicate groups (listings that are the same property)
 */
export async function getDuplicateGroups(): Promise<Array<{
  listings: Array<{
    id: string;
    platform: string;
    url: string;
    price: number | null;
  }>;
  avgConfidence: number;
}>> {
  const db = getPool();
  const groups: Map<string, Set<string>> = new Map();
  
  // Get all matches
  const result = await db.query<{
    primary_listing_id: string;
    matched_listing_id: string;
    match_confidence: string;
  }>(
    `SELECT primary_listing_id, matched_listing_id, match_confidence
     FROM market_intel.listing_matches
     WHERE match_confidence >= $1`,
    [CONFIG.MIN_CONFIDENCE]
  );
  
  // Build groups using union-find approach
  for (const row of result.rows) {
    const id1 = row.primary_listing_id;
    const id2 = row.matched_listing_id;
    
    // Find existing groups containing either ID
    let group1: Set<string> | undefined;
    let group2: Set<string> | undefined;
    
    for (const group of groups.values()) {
      if (group.has(id1)) group1 = group;
      if (group.has(id2)) group2 = group;
    }
    
    if (group1 && group2 && group1 !== group2) {
      // Merge groups
      for (const id of group2) {
        group1.add(id);
      }
      // Remove old group
      for (const [key, group] of groups) {
        if (group === group2) {
          groups.delete(key);
          break;
        }
      }
    } else if (group1) {
      group1.add(id2);
    } else if (group2) {
      group2.add(id1);
    } else {
      // Create new group
      const newGroup = new Set([id1, id2]);
      groups.set(id1, newGroup);
    }
  }
  
  // PERFORMANCE FIX: Batch fetch all data in 2 queries instead of 2*N queries
  // Collect all unique IDs from all groups
  const allIds: string[] = [];
  const groupIdsList: string[][] = [];
  
  for (const listingIds of groups.values()) {
    const ids = Array.from(listingIds);
    groupIdsList.push(ids);
    allIds.push(...ids);
  }
  
  if (allIds.length === 0) {
    return [];
  }
  
  // Single query to fetch all listings
  const allListings = await db.query<CompetitorListingRow>(
    `SELECT id, source_platform, source_url, price
     FROM market_intel.competitor_listings
     WHERE id = ANY($1)`,
    [allIds]
  );
  
  // Create a map for quick lookup
  const listingMap = new Map(
    allListings.rows.map(l => [l.id, {
      id: l.id,
      platform: l.source_platform,
      url: l.source_url,
      price: l.price
    }])
  );
  
  // Single query to fetch confidence scores per listing ID
  const confidenceResult = await db.query<{ listing_id: string; avg_confidence: string }>(
    `SELECT 
       unnest(ARRAY[primary_listing_id, matched_listing_id]) as listing_id,
       AVG(match_confidence::numeric) OVER (
         PARTITION BY LEAST(primary_listing_id, matched_listing_id), 
                      GREATEST(primary_listing_id, matched_listing_id)
       ) as avg_confidence
     FROM market_intel.listing_matches
     WHERE primary_listing_id = ANY($1) OR matched_listing_id = ANY($1)`,
    [allIds]
  );
  
  // Create a map of listing ID to confidence scores
  const confidenceMap = new Map<string, number[]>();
  for (const row of confidenceResult.rows) {
    if (!confidenceMap.has(row.listing_id)) {
      confidenceMap.set(row.listing_id, []);
    }
    confidenceMap.get(row.listing_id)!.push(parseFloat(row.avg_confidence || '0'));
  }
  
  // Build the result using the pre-fetched data
  const groupsWithDetails: Array<{
    listings: Array<{
      id: string;
      platform: string;
      url: string;
      price: number | null;
    }>;
    avgConfidence: number;
  }> = [];
  
  for (const ids of groupIdsList) {
    const listings = ids
      .map(id => listingMap.get(id))
      .filter((l): l is NonNullable<typeof l> => l !== undefined);
    
    // Calculate average confidence for the group
    const confidenceScores: number[] = [];
    for (const id of ids) {
      const scores = confidenceMap.get(id);
      if (scores) {
        confidenceScores.push(...scores);
      }
    }
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;
    
    groupsWithDetails.push({
      listings,
      avgConfidence
    });
  }
  
  return groupsWithDetails;
}

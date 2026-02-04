import { pino } from 'pino';
import { getPool } from '../db/client.js';
import type { 
  CompetitorListingRow, 
  PriceChange 
} from '../types/index.js';

const logger = pino({ name: 'alert-processor' });

/**
 * Alert criteria interface (matches what's stored in JSON)
 */
interface AlertCriteria {
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  transactionType?: string;
  threshold?: number; // For percentage-based alerts
  daysOnMarket?: number; // For stale listing alerts
}

interface Alert {
  id: string;
  userId: string;
  organizationId: string;
  alertType: string;
  name: string;
  criteria: AlertCriteria;
  isActive: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

interface AlertTrigger {
  alertId: string;
  listingIds: string[];
  metadata: Record<string, unknown>;
}

/**
 * Process alerts after a scrape completes
 * Called by the main scraper after processing listings
 */
export async function processAlerts(
  platform: string,
  newListings: CompetitorListingRow[],
  priceChanges: PriceChange[]
): Promise<number> {
  const db = getPool();
  let triggeredCount = 0;

  try {
    // Get all active alerts
    const alertsResult = await db.query<{
      id: string;
      user_id: string;
      organization_id: string;
      alert_type: string;
      name: string;
      criteria: AlertCriteria;
      is_active: boolean;
      email_enabled: boolean;
      in_app_enabled: boolean;
    }>(
      `SELECT * FROM "MarketIntelAlert" WHERE "isActive" = true`
    );

    const alerts = alertsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      alertType: row.alert_type,
      name: row.name,
      criteria: row.criteria || {},
      isActive: row.is_active,
      emailEnabled: row.email_enabled,
      inAppEnabled: row.in_app_enabled
    }));

    logger.info({ alertCount: alerts.length, platform }, 'Processing alerts');

    for (const alert of alerts) {
      const triggers = await evaluateAlert(alert, newListings, priceChanges);
      
      if (triggers.listingIds.length > 0) {
        await recordAlertTrigger(triggers);
        triggeredCount++;
        
        logger.info({
          alertId: alert.id,
          alertType: alert.alertType,
          matchCount: triggers.listingIds.length
        }, 'Alert triggered');
      }
    }

    return triggeredCount;
  } catch (err) {
    logger.error({ err }, 'Error processing alerts');
    return triggeredCount;
  }
}

/**
 * Evaluate an alert against new data
 */
async function evaluateAlert(
  alert: Alert,
  newListings: CompetitorListingRow[],
  priceChanges: PriceChange[]
): Promise<AlertTrigger> {
  const matchingIds: string[] = [];
  const metadata: Record<string, unknown> = {
    alertType: alert.alertType,
    evaluatedAt: new Date().toISOString()
  };

  switch (alert.alertType) {
    case 'NEW_LISTING':
      // Check new listings against criteria
      for (const listing of newListings) {
        if (matchesCriteria(listing, alert.criteria)) {
          matchingIds.push(listing.id);
        }
      }
      metadata.type = 'new_listings';
      break;

    case 'PRICE_DROP':
      // Check price decreases against criteria
      const drops = priceChanges.filter(c => c.changeType === 'decrease');
      for (const change of drops) {
        const threshold = alert.criteria.threshold || 5;
        if (Math.abs(change.changePercent) >= threshold) {
          // Would need to fetch listing details to check other criteria
          matchingIds.push(change.listingId);
        }
      }
      metadata.type = 'price_drops';
      metadata.threshold = alert.criteria.threshold || 5;
      break;

    case 'PRICE_INCREASE':
      // Check price increases
      const increases = priceChanges.filter(c => c.changeType === 'increase');
      for (const change of increases) {
        const threshold = alert.criteria.threshold || 5;
        if (change.changePercent >= threshold) {
          matchingIds.push(change.listingId);
        }
      }
      metadata.type = 'price_increases';
      break;

    case 'UNDERPRICED':
      // Check for underpriced listings in new additions
      const underpricedThreshold = alert.criteria.threshold || 15;
      const underpricedListings = await findUnderpricedFromNew(newListings, underpricedThreshold);
      matchingIds.push(...underpricedListings.map(l => l.id));
      metadata.type = 'underpriced';
      metadata.threshold = underpricedThreshold;
      break;

    case 'DAYS_ON_MARKET':
      // Check for stale listings
      const daysThreshold = alert.criteria.daysOnMarket || 90;
      const staleListings = await findStaleListings(daysThreshold, alert.criteria);
      matchingIds.push(...staleListings.map(l => l.id));
      metadata.type = 'stale_listings';
      metadata.daysThreshold = daysThreshold;
      break;

    case 'INVENTORY_CHANGE':
      // This would be more complex - comparing inventory levels over time
      // For now, we'll trigger if there's a significant change in new listings count
      if (newListings.length > 50) { // Arbitrary threshold
        metadata.type = 'inventory_spike';
        metadata.count = newListings.length;
        // Don't add specific listing IDs for inventory alerts
      }
      break;

    default:
      logger.warn({ alertType: alert.alertType }, 'Unknown alert type');
  }

  return {
    alertId: alert.id,
    listingIds: matchingIds,
    metadata
  };
}

/**
 * Check if a listing matches alert criteria
 */
function matchesCriteria(
  listing: CompetitorListingRow,
  criteria: AlertCriteria
): boolean {
  // Check area
  if (criteria.area && listing.area !== criteria.area) {
    return false;
  }

  // Check price range
  if (criteria.minPrice && (listing.price || 0) < criteria.minPrice) {
    return false;
  }
  if (criteria.maxPrice && (listing.price || 0) > criteria.maxPrice) {
    return false;
  }

  // Check property type
  if (criteria.propertyType && listing.property_type !== criteria.propertyType) {
    return false;
  }

  // Check transaction type
  if (criteria.transactionType && listing.transaction_type !== criteria.transactionType) {
    return false;
  }

  return true;
}

/**
 * Find underpriced listings from new additions
 */
async function findUnderpricedFromNew(
  newListings: CompetitorListingRow[],
  thresholdPercent: number
): Promise<CompetitorListingRow[]> {
  const db = getPool();
  const underpriced: CompetitorListingRow[] = [];

  // Get area averages
  const avgResult = await db.query<{
    area: string;
    property_type: string;
    avg_price_per_sqm: number;
  }>(
    `SELECT area, property_type, AVG(price_per_sqm) as avg_price_per_sqm
     FROM market_intel.competitor_listings
     WHERE is_active = true AND price_per_sqm > 0
     GROUP BY area, property_type
     HAVING COUNT(*) >= 5`
  );

  const avgMap = new Map(
    avgResult.rows.map(r => [`${r.area}:${r.property_type}`, r.avg_price_per_sqm])
  );

  for (const listing of newListings) {
    if (!listing.price_per_sqm || !listing.area) continue;

    const avgPrice = avgMap.get(`${listing.area}:${listing.property_type}`);
    if (!avgPrice) continue;

    const percentBelow = ((avgPrice - listing.price_per_sqm) / avgPrice) * 100;
    if (percentBelow >= thresholdPercent) {
      underpriced.push(listing);
    }
  }

  return underpriced;
}

/**
 * Find stale listings that have been on market too long
 */
async function findStaleListings(
  daysThreshold: number,
  criteria: AlertCriteria
): Promise<CompetitorListingRow[]> {
  const db = getPool();

  let query = `
    SELECT * FROM market_intel.competitor_listings
    WHERE is_active = true
      AND (
        days_on_market >= $1
        OR first_scraped_at < NOW() - INTERVAL '${daysThreshold} days'
      )
  `;
  const params: unknown[] = [daysThreshold];
  let paramIndex = 2;

  if (criteria.area) {
    query += ` AND area = $${paramIndex++}`;
    params.push(criteria.area);
  }

  if (criteria.propertyType) {
    query += ` AND property_type = $${paramIndex++}`;
    params.push(criteria.propertyType);
  }

  query += ` LIMIT 100`;

  const result = await db.query<CompetitorListingRow>(query, params);
  return result.rows;
}

/**
 * Record an alert trigger in the database
 */
async function recordAlertTrigger(trigger: AlertTrigger): Promise<void> {
  const db = getPool();

  await db.query(
    `INSERT INTO "MarketIntelAlertTrigger" ("id", "alertId", "listingIds", "metadata", "sentAt")
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
    [trigger.alertId, trigger.listingIds, JSON.stringify(trigger.metadata)]
  );

  // Update the alert's last triggered time and increment count
  await db.query(
    `UPDATE "MarketIntelAlert" 
     SET "lastTriggered" = NOW(), "triggerCount" = "triggerCount" + 1
     WHERE id = $1`,
    [trigger.alertId]
  );
}

/**
 * Get recent alert triggers for a user
 */
export async function getUserAlertTriggers(
  userId: string,
  limit: number = 50
): Promise<Array<{
  alertId: string;
  alertName: string;
  alertType: string;
  listingIds: string[];
  metadata: Record<string, unknown>;
  sentAt: Date;
}>> {
  const db = getPool();

  const result = await db.query<{
    alert_id: string;
    alert_name: string;
    alert_type: string;
    listing_ids: string[];
    metadata: Record<string, unknown>;
    sent_at: Date;
  }>(
    `SELECT 
      t."alertId" as alert_id,
      a."name" as alert_name,
      a."alertType" as alert_type,
      t."listingIds" as listing_ids,
      t."metadata" as metadata,
      t."sentAt" as sent_at
     FROM "MarketIntelAlertTrigger" t
     JOIN "MarketIntelAlert" a ON a.id = t."alertId"
     WHERE a."userId" = $1
     ORDER BY t."sentAt" DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(r => ({
    alertId: r.alert_id,
    alertName: r.alert_name,
    alertType: r.alert_type,
    listingIds: r.listing_ids,
    metadata: r.metadata,
    sentAt: r.sent_at
  }));
}

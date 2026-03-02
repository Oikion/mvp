-- Fix: Add missing organization_id column to all market_intel tables
-- The previous migration (20260120150000_market_intel_multi_tenant) was marked
-- as applied but the DDL was never actually executed against the database.
-- This corrective migration adds the organization_id column, updates unique
-- constraints, and creates indexes for multi-tenant isolation.

-- ===========================================
-- 1. competitor_listings
-- ===========================================
ALTER TABLE market_intel.competitor_listings
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

-- Drop old unique constraint (not org-scoped)
ALTER TABLE market_intel.competitor_listings
  DROP CONSTRAINT IF EXISTS competitor_listings_source_platform_source_listing_id_key;

-- New org-scoped unique constraint
ALTER TABLE market_intel.competitor_listings
  ADD CONSTRAINT competitor_listings_org_platform_listing_key
  UNIQUE (organization_id, source_platform, source_listing_id);

-- Index for tenant-scoped queries
CREATE INDEX idx_listings_org_id
  ON market_intel.competitor_listings (organization_id);

-- Composite index for common filtered queries
CREATE INDEX idx_listings_org_active
  ON market_intel.competitor_listings (organization_id, is_active);

CREATE INDEX idx_listings_org_area_active
  ON market_intel.competitor_listings (organization_id, area, is_active);

CREATE INDEX idx_listings_org_platform
  ON market_intel.competitor_listings (organization_id, source_platform);

-- ===========================================
-- 2. price_history
-- ===========================================
ALTER TABLE market_intel.price_history
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX idx_price_history_org_id
  ON market_intel.price_history (organization_id);

-- Composite index for org + date range queries (getRecentPriceChanges)
CREATE INDEX idx_price_history_org_recorded
  ON market_intel.price_history (organization_id, recorded_at DESC);

-- ===========================================
-- 3. scrape_logs
-- ===========================================
ALTER TABLE market_intel.scrape_logs
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX idx_scrape_logs_org_id
  ON market_intel.scrape_logs (organization_id);

-- Composite index for org + time ordering (getScrapeLogs)
CREATE INDEX idx_scrape_logs_org_started
  ON market_intel.scrape_logs (organization_id, started_at DESC);

-- ===========================================
-- 4. listing_matches
-- ===========================================
ALTER TABLE market_intel.listing_matches
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX idx_listing_matches_org_id
  ON market_intel.listing_matches (organization_id);

-- ===========================================
-- 5. market_stats
-- ===========================================
ALTER TABLE market_intel.market_stats
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

-- Drop old unique constraint
ALTER TABLE market_intel.market_stats
  DROP CONSTRAINT IF EXISTS market_stats_stat_date_area_property_type_transaction_type_key;

-- New org-scoped unique constraint
ALTER TABLE market_intel.market_stats
  ADD CONSTRAINT market_stats_org_date_area_type_key
  UNIQUE (organization_id, stat_date, area, property_type, transaction_type);

CREATE INDEX idx_market_stats_org_id
  ON market_intel.market_stats (organization_id);

-- ===========================================
-- 6. agency_stats
-- ===========================================
ALTER TABLE market_intel.agency_stats
  ADD COLUMN organization_id VARCHAR(255) NOT NULL DEFAULT '';

-- Drop old unique constraint
ALTER TABLE market_intel.agency_stats
  DROP CONSTRAINT IF EXISTS agency_stats_agency_name_stat_date_key;

-- New org-scoped unique constraint
ALTER TABLE market_intel.agency_stats
  ADD CONSTRAINT agency_stats_org_name_date_key
  UNIQUE (organization_id, agency_name, stat_date);

CREATE INDEX idx_agency_stats_org_id
  ON market_intel.agency_stats (organization_id);

-- Market Intelligence Multi-Tenant Migration
-- Adds organization_id to all market_intel tables for multi-tenant support

-- ===========================================
-- Add organization_id to competitor_listings
-- ===========================================
ALTER TABLE market_intel.competitor_listings 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- Create index for organization filtering
CREATE INDEX IF NOT EXISTS idx_listings_organization 
ON market_intel.competitor_listings(organization_id);

-- Update unique constraint to include organization_id
-- First drop the old constraint
ALTER TABLE market_intel.competitor_listings 
DROP CONSTRAINT IF EXISTS competitor_listings_source_platform_source_listing_id_key;

-- Create new unique constraint including organization_id
ALTER TABLE market_intel.competitor_listings 
ADD CONSTRAINT competitor_listings_org_platform_id_key 
UNIQUE(organization_id, source_platform, source_listing_id);

-- ===========================================
-- Add organization_id to price_history
-- ===========================================
ALTER TABLE market_intel.price_history 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_price_history_organization 
ON market_intel.price_history(organization_id);

-- ===========================================
-- Add organization_id to scrape_logs
-- ===========================================
ALTER TABLE market_intel.scrape_logs 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_organization 
ON market_intel.scrape_logs(organization_id);

-- ===========================================
-- Add organization_id to listing_matches
-- ===========================================
ALTER TABLE market_intel.listing_matches 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_listing_matches_organization 
ON market_intel.listing_matches(organization_id);

-- ===========================================
-- Add organization_id to market_stats
-- ===========================================
ALTER TABLE market_intel.market_stats 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- Update unique constraint
ALTER TABLE market_intel.market_stats 
DROP CONSTRAINT IF EXISTS market_stats_stat_date_area_property_type_transaction_type_key;

ALTER TABLE market_intel.market_stats 
ADD CONSTRAINT market_stats_org_date_area_type_key 
UNIQUE(organization_id, stat_date, area, property_type, transaction_type);

CREATE INDEX IF NOT EXISTS idx_market_stats_organization 
ON market_intel.market_stats(organization_id);

-- ===========================================
-- Add organization_id to agency_stats
-- ===========================================
ALTER TABLE market_intel.agency_stats 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- Update unique constraint
ALTER TABLE market_intel.agency_stats 
DROP CONSTRAINT IF EXISTS agency_stats_agency_name_stat_date_key;

ALTER TABLE market_intel.agency_stats 
ADD CONSTRAINT agency_stats_org_name_date_key 
UNIQUE(organization_id, agency_name, stat_date);

CREATE INDEX IF NOT EXISTS idx_agency_stats_organization 
ON market_intel.agency_stats(organization_id);

-- ===========================================
-- Create MarketIntelConfig table in public schema (via Prisma)
-- ===========================================
CREATE TABLE IF NOT EXISTS "MarketIntelConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "platforms" TEXT[] DEFAULT ARRAY['spitogatos', 'xe_gr', 'tospitimou']::TEXT[],
    "targetAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetMunicipalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transactionTypes" TEXT[] DEFAULT ARRAY['sale', 'rent']::TEXT[],
    "propertyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "scrapeFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "lastScrapeAt" TIMESTAMP(3),
    "nextScrapeAt" TIMESTAMP(3),
    "maxPagesPerPlatform" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SETUP',
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketIntelConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on organizationId
CREATE UNIQUE INDEX IF NOT EXISTS "MarketIntelConfig_organizationId_key" 
ON "MarketIntelConfig"("organizationId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "MarketIntelConfig_organizationId_idx" 
ON "MarketIntelConfig"("organizationId");

CREATE INDEX IF NOT EXISTS "MarketIntelConfig_isEnabled_idx" 
ON "MarketIntelConfig"("isEnabled");

CREATE INDEX IF NOT EXISTS "MarketIntelConfig_nextScrapeAt_idx" 
ON "MarketIntelConfig"("nextScrapeAt");

CREATE INDEX IF NOT EXISTS "MarketIntelConfig_status_idx" 
ON "MarketIntelConfig"("status");

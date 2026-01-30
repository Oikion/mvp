-- Market Intelligence Schema Migration
-- Creates a separate schema for competitor property data

-- Create the market_intel schema
CREATE SCHEMA IF NOT EXISTS market_intel;

-- ===========================================
-- Competitor Listings (normalized from all platforms)
-- ===========================================
CREATE TABLE market_intel.competitor_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform VARCHAR(50) NOT NULL, -- 'spitogatos', 'xe_gr', 'tospitimou'
  source_listing_id VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL,
  
  -- Core property data
  title TEXT,
  price INTEGER,
  price_per_sqm INTEGER,
  property_type VARCHAR(50),
  transaction_type VARCHAR(20), -- 'sale', 'rent'
  
  -- Location
  address TEXT,
  area VARCHAR(100),
  municipality VARCHAR(100),
  postal_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Property details
  size_sqm INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor VARCHAR(20),
  year_built INTEGER,
  
  -- Agent/Agency info (GDPR: store only public info)
  agency_name VARCHAR(255),
  agency_phone VARCHAR(50),
  
  -- Listing images (store URLs)
  images JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  listing_date DATE,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  first_scraped_at TIMESTAMP DEFAULT NOW(),
  days_on_market INTEGER,
  is_active BOOLEAN DEFAULT true,
  raw_data JSONB, -- Full scraped data for debugging
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(source_platform, source_listing_id)
);

-- ===========================================
-- Price History Tracking
-- ===========================================
CREATE TABLE market_intel.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES market_intel.competitor_listings(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  price_per_sqm INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW(),
  change_type VARCHAR(20) DEFAULT 'initial' -- 'initial', 'increase', 'decrease'
);

-- ===========================================
-- Scrape Job Logs
-- ===========================================
CREATE TABLE market_intel.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'success', 'failed', 'partial'
  listings_found INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_updated INTEGER DEFAULT 0,
  listings_deactivated INTEGER DEFAULT 0,
  error_message TEXT,
  pages_scraped INTEGER DEFAULT 0,
  scrape_duration_ms INTEGER,
  metadata JSONB -- Additional scrape metadata (filters used, etc.)
);

-- ===========================================
-- Deduplication Matches (same property on multiple platforms)
-- ===========================================
CREATE TABLE market_intel.listing_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_listing_id UUID NOT NULL REFERENCES market_intel.competitor_listings(id) ON DELETE CASCADE,
  matched_listing_id UUID NOT NULL REFERENCES market_intel.competitor_listings(id) ON DELETE CASCADE,
  match_confidence DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
  match_reason VARCHAR(50) NOT NULL, -- 'coordinates', 'address', 'image_hash', 'combined'
  match_details JSONB, -- Additional match metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(primary_listing_id, matched_listing_id)
);

-- ===========================================
-- Market Statistics Aggregations (daily snapshots)
-- ===========================================
CREATE TABLE market_intel.market_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  area VARCHAR(100),
  municipality VARCHAR(100),
  property_type VARCHAR(50),
  transaction_type VARCHAR(20),
  
  -- Aggregated metrics
  total_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  removed_listings INTEGER DEFAULT 0,
  avg_price INTEGER,
  median_price INTEGER,
  min_price INTEGER,
  max_price INTEGER,
  avg_price_per_sqm INTEGER,
  median_price_per_sqm INTEGER,
  avg_size_sqm INTEGER,
  avg_days_on_market INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(stat_date, area, property_type, transaction_type)
);

-- ===========================================
-- Agency Analytics
-- ===========================================
CREATE TABLE market_intel.agency_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name VARCHAR(255) NOT NULL,
  stat_date DATE NOT NULL,
  
  -- Metrics
  total_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  avg_price INTEGER,
  avg_price_per_sqm INTEGER,
  primary_areas JSONB, -- Array of top areas they list in
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(agency_name, stat_date)
);

-- ===========================================
-- Indexes for Performance
-- ===========================================

-- Competitor listings indexes
CREATE INDEX idx_listings_area ON market_intel.competitor_listings(area);
CREATE INDEX idx_listings_municipality ON market_intel.competitor_listings(municipality);
CREATE INDEX idx_listings_price ON market_intel.competitor_listings(price);
CREATE INDEX idx_listings_price_per_sqm ON market_intel.competitor_listings(price_per_sqm);
CREATE INDEX idx_listings_source ON market_intel.competitor_listings(source_platform);
CREATE INDEX idx_listings_active ON market_intel.competitor_listings(is_active);
CREATE INDEX idx_listings_last_seen ON market_intel.competitor_listings(last_seen_at);
CREATE INDEX idx_listings_property_type ON market_intel.competitor_listings(property_type);
CREATE INDEX idx_listings_transaction_type ON market_intel.competitor_listings(transaction_type);
CREATE INDEX idx_listings_agency ON market_intel.competitor_listings(agency_name);
CREATE INDEX idx_listings_size ON market_intel.competitor_listings(size_sqm);
CREATE INDEX idx_listings_bedrooms ON market_intel.competitor_listings(bedrooms);

-- Geospatial index for coordinate-based searches
CREATE INDEX idx_listings_coords ON market_intel.competitor_listings(latitude, longitude);

-- Full-text search on title and address
CREATE INDEX idx_listings_title_fts ON market_intel.competitor_listings USING gin(to_tsvector('simple', coalesce(title, '')));
CREATE INDEX idx_listings_address_fts ON market_intel.competitor_listings USING gin(to_tsvector('simple', coalesce(address, '')));

-- Price history indexes
CREATE INDEX idx_price_history_listing ON market_intel.price_history(listing_id);
CREATE INDEX idx_price_history_date ON market_intel.price_history(recorded_at);

-- Scrape logs indexes
CREATE INDEX idx_scrape_logs_platform ON market_intel.scrape_logs(platform);
CREATE INDEX idx_scrape_logs_status ON market_intel.scrape_logs(status);
CREATE INDEX idx_scrape_logs_started ON market_intel.scrape_logs(started_at DESC);

-- Listing matches indexes
CREATE INDEX idx_matches_primary ON market_intel.listing_matches(primary_listing_id);
CREATE INDEX idx_matches_matched ON market_intel.listing_matches(matched_listing_id);

-- Market stats indexes
CREATE INDEX idx_market_stats_date ON market_intel.market_stats(stat_date DESC);
CREATE INDEX idx_market_stats_area ON market_intel.market_stats(area);

-- Agency stats indexes
CREATE INDEX idx_agency_stats_name ON market_intel.agency_stats(agency_name);
CREATE INDEX idx_agency_stats_date ON market_intel.agency_stats(stat_date DESC);

-- ===========================================
-- Trigger to update updated_at timestamp
-- ===========================================
CREATE OR REPLACE FUNCTION market_intel.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_competitor_listings_updated_at
    BEFORE UPDATE ON market_intel.competitor_listings
    FOR EACH ROW
    EXECUTE FUNCTION market_intel.update_updated_at_column();

-- ===========================================
-- Function to calculate days on market
-- ===========================================
CREATE OR REPLACE FUNCTION market_intel.calculate_days_on_market()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_date IS NOT NULL THEN
        NEW.days_on_market = CURRENT_DATE - NEW.listing_date;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_days_on_market_trigger
    BEFORE INSERT OR UPDATE ON market_intel.competitor_listings
    FOR EACH ROW
    EXECUTE FUNCTION market_intel.calculate_days_on_market();

-- ===========================================
-- GDPR Data Retention: Auto-delete old inactive listings
-- Run this as a scheduled job (not a trigger)
-- ===========================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron; -- Enable if using pg_cron
-- SELECT cron.schedule('cleanup-old-listings', '0 3 * * *', $$
--     DELETE FROM market_intel.competitor_listings 
--     WHERE is_active = false 
--     AND last_seen_at < NOW() - INTERVAL '90 days'
-- $$);

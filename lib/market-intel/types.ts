import { z } from 'zod';

// ===========================================
// Platform Configuration Types
// ===========================================

export interface RateLimitConfig {
  requests: number;
  perMinutes: number;
}

export interface PaginationConfig {
  type: 'query' | 'url' | 'infinite-scroll';
  param?: string;
  maxPages?: number;
}

export interface PlatformConfig {
  id: string;
  name: string;
  baseUrl: string;
  searchPath?: string;
  rateLimit: RateLimitConfig;
  pagination: PaginationConfig;
  selectors?: PlatformSelectors;
}

export interface PlatformSelectors {
  listingCard: string;
  listingLink: string;
  price: string;
  title: string;
  location: string;
  size: string;
  bedrooms: string;
  bathrooms: string;
  propertyType: string;
  agencyName: string;
  agencyPhone: string;
  images: string;
  nextPage: string;
  noResults: string;
}

// ===========================================
// Listing Types
// ===========================================

export const PropertyTypeSchema = z.enum([
  'APARTMENT',
  'HOUSE',
  'MAISONETTE',
  'STUDIO',
  'LOFT',
  'PENTHOUSE',
  'VILLA',
  'LAND',
  'COMMERCIAL',
  'WAREHOUSE',
  'PARKING',
  'OTHER'
]);

export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const TransactionTypeSchema = z.enum(['sale', 'rent']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export interface RawListing {
  sourceListingId: string;
  sourceUrl: string;
  title?: string;
  price?: number;
  priceText?: string;
  propertyType?: string;
  transactionType?: string;
  address?: string;
  area?: string;
  municipality?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  sizeSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  yearBuilt?: number;
  agencyName?: string;
  agencyPhone?: string;
  images?: string[];
  listingDate?: Date;
  rawData?: Record<string, unknown>;
}

export interface NormalizedListing {
  organization_id: string;
  source_platform: string;
  source_listing_id: string;
  source_url: string;
  title: string | null;
  price: number | null;
  price_per_sqm: number | null;
  property_type: PropertyType | null;
  transaction_type: TransactionType;
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
  raw_data: Record<string, unknown>;
}

// ===========================================
// Search Filters
// ===========================================

export interface SearchFilters {
  transactionType?: TransactionType;
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  bedrooms?: number;
  areas?: string[];
  municipalities?: string[];
}

// ===========================================
// Scrape Job Types
// ===========================================

export interface ScrapeJobData {
  organizationId: string;
  platform: string;
  filters?: SearchFilters;
  maxPages?: number;
  startPage?: number;
}

export interface ScrapeJobResult {
  organizationId: string;
  platform: string;
  status: 'success' | 'failed' | 'partial';
  listingsFound: number;
  listingsNew: number;
  listingsUpdated: number;
  listingsDeactivated: number;
  pagesScraped: number;
  duration: number;
  errors?: string[];
}

export interface ScrapeLog {
  id: string;
  organization_id: string;
  platform: string;
  started_at: Date;
  completed_at: Date | null;
  status: 'running' | 'success' | 'failed' | 'partial';
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  listings_deactivated: number;
  error_message: string | null;
  pages_scraped: number;
  scrape_duration_ms: number | null;
  metadata: Record<string, unknown> | null;
}

// ===========================================
// Organization Config Types
// ===========================================

export interface MarketIntelOrgConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  platforms: string[];
  targetAreas: string[];
  targetMunicipalities: string[];
  transactionTypes: string[];
  propertyTypes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  scrapeFrequency: 'HOURLY' | 'TWICE_DAILY' | 'DAILY' | 'WEEKLY';
  lastScrapeAt: Date | null;
  nextScrapeAt: Date | null;
  maxPagesPerPlatform: number;
  status: 'PENDING_SETUP' | 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED';
  lastError: string | null;
  consecutiveFailures: number;
}

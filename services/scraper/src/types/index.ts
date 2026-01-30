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
  useSkyvern: boolean;
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
  platform: string;
  filters?: SearchFilters;
  maxPages?: number;
  startPage?: number;
}

export interface ScrapeJobResult {
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
// Price History Types
// ===========================================

export interface PriceChange {
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changeType: 'increase' | 'decrease';
}

// ===========================================
// Deduplication Types
// ===========================================

export interface ListingMatch {
  primaryListingId: string;
  matchedListingId: string;
  confidence: number;
  reason: 'coordinates' | 'address' | 'image_hash' | 'combined';
  details?: Record<string, unknown>;
}

// ===========================================
// Database Row Types
// ===========================================

export interface CompetitorListingRow {
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
  latitude: string | null;
  longitude: string | null;
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
  raw_data: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

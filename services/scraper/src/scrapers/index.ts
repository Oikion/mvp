/**
 * Scraper Module Exports
 * 
 * Import and use scrapers through this central module
 */

export { BaseScraper } from './base.js';
export { SpitogatosScraper } from './spitogatos.js';
export { XeGrScraper } from './xe-gr.js';
export { TospitimouScraper } from './tospitimou.js';

// Re-export types for convenience
export type { 
  PlatformConfig,
  RawListing,
  SearchFilters,
  ScrapeJobResult 
} from '../types/index.js';

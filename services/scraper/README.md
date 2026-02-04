# Oikion Market Intelligence Scraper

A microservice for scraping competitor property listings from Greek real estate platforms, normalizing data, and detecting price changes.

## Overview

This scraper monitors the following Greek real estate platforms:
- **Spitogatos** - Greece's largest real estate portal
- **XE.gr** - Major Greek classifieds platform
- **Tospitimou** - Greek real estate listings site

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Scraper Microservice                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  BullMQ     │───▶│  Playwright │───▶│  Normalizer │     │
│  │  Scheduler  │    │  Scrapers   │    │             │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                               │             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────▼──────┐     │
│  │  Redis      │    │  Dedup      │◀───│  PostgreSQL │     │
│  │  (Queue)    │    │  Engine     │    │  market_intel│    │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL database with `market_intel` schema
- Redis for job queue

### Installation

```bash
cd services/scraper

# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install chromium

# Copy environment file
cp .env.example .env
# Edit .env with your database and Redis URLs
```

### Running

#### Development Mode

```bash
# Run with hot reload
pnpm dev

# Run a single scrape manually
pnpm scrape --platform spitogatos --max-pages 5
```

#### Production Mode

```bash
# Build
pnpm build

# Start worker
pnpm start
```

#### Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f scraper

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `SCRAPER_MODE` | Schedule mode (minimal, standard, aggressive, testing) | `standard` |
| `SKYVERN_API_KEY` | Skyvern API key for anti-bot fallback | optional |

### Schedule Modes

- **minimal**: Daily scrapes only (2 AM, 4 AM, 6 AM)
- **standard**: Daily + weekly deep scrapes
- **aggressive**: Adds afternoon checks for hot markets
- **testing**: Every 4 hours (DO NOT use in production)

## CLI Commands

```bash
# Run a scrape for specific platform
pnpm scrape --platform spitogatos

# Scrape with filters
pnpm scrape --platform xe_gr --max-pages 10 --area "Κολωνάκι"

# Check scrape status
pnpm scrape status

# Test database connection
pnpm scrape test-db

# List available platforms
pnpm scrape platforms
```

## Adding a New Platform

### 1. Add Platform Configuration

Edit `src/config/platforms.ts`:

```typescript
export const PLATFORMS: Record<string, PlatformConfig> = {
  // ... existing platforms
  
  new_platform: {
    id: 'new_platform',
    name: 'New Platform',
    baseUrl: 'https://www.newplatform.gr',
    searchPath: '/search',
    useSkyvern: false,
    rateLimit: {
      requests: 5,      // requests allowed
      perMinutes: 1     // per this many minutes
    },
    pagination: {
      type: 'query',    // 'query', 'url', or 'infinite-scroll'
      param: 'page',
      maxPages: 100
    },
    selectors: {
      listingCard: '.property-card',
      listingLink: 'a[href*="/property/"]',
      price: '.price',
      title: '.title',
      location: '.location',
      size: '.size',
      bedrooms: '.bedrooms',
      bathrooms: '.bathrooms',
      propertyType: '.type',
      agencyName: '.agency',
      agencyPhone: '.phone',
      images: 'img.property-img',
      nextPage: '.pagination .next',
      noResults: '.no-results'
    }
  }
};
```

### 2. Create Scraper Class

Create `src/scrapers/new-platform.ts`:

```typescript
import { BaseScraper } from './base.js';
import type { PlatformConfig, RawListing, SearchFilters } from '../types/index.js';

export class NewPlatformScraper extends BaseScraper {
  constructor(config: PlatformConfig) {
    super(config);
  }

  protected buildSearchUrl(filters?: SearchFilters, page?: number): string {
    // Implement URL building logic
  }

  protected async *scrapeListings(filters?: SearchFilters): AsyncGenerator<RawListing> {
    // Implement listing scraping logic
  }

  protected async parseListingPage(page: Page): Promise<RawListing> {
    // Implement detail page parsing
  }
}
```

### 3. Register Scraper

Update `src/index.ts`:

```typescript
import { NewPlatformScraper } from './scrapers/new-platform.js';

function getScraperForPlatform(platformId: string) {
  // ... existing code
  
  case 'new_platform':
    return new NewPlatformScraper(config);
}
```

### 4. Add Schedule (Optional)

Update `src/config/schedules.ts`:

```typescript
export const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  // ... existing schedules
  
  {
    platform: 'new_platform',
    cron: '0 8 * * *',  // 8:00 AM
    description: 'New Platform daily scrape',
    maxPages: 50
  }
];
```

### 5. Update Normalizer (If Needed)

If the platform uses different terminology, update `src/normalizers/property.ts`:

```typescript
const PROPERTY_TYPE_MAP: Record<string, Record<string, PropertyType>> = {
  // ... existing mappings
  
  new_platform: {
    'σπίτι': 'HOUSE',
    'διαμέρισμα': 'APARTMENT',
    // ... other mappings
  }
};
```

## Data Schema

### Competitor Listings

```sql
market_intel.competitor_listings (
  id UUID PRIMARY KEY,
  source_platform VARCHAR(50),      -- 'spitogatos', 'xe_gr', etc.
  source_listing_id VARCHAR(255),   -- Original platform's ID
  source_url TEXT,                  -- Link to original listing
  
  -- Property data
  title TEXT,
  price INTEGER,
  price_per_sqm INTEGER,
  property_type VARCHAR(50),
  transaction_type VARCHAR(20),     -- 'sale' or 'rent'
  
  -- Location
  address TEXT,
  area VARCHAR(100),
  municipality VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Details
  size_sqm INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  
  -- Tracking
  listing_date DATE,
  days_on_market INTEGER,
  is_active BOOLEAN,
  last_seen_at TIMESTAMP,
  first_scraped_at TIMESTAMP
);
```

### Price History

```sql
market_intel.price_history (
  id UUID PRIMARY KEY,
  listing_id UUID REFERENCES competitor_listings(id),
  price INTEGER,
  change_type VARCHAR(20),  -- 'initial', 'increase', 'decrease'
  recorded_at TIMESTAMP
);
```

## Rate Limiting

Each platform has configured rate limits to avoid detection:

| Platform | Requests | Per |
|----------|----------|-----|
| Spitogatos | 10 | 1 minute |
| XE.gr | 8 | 1 minute |
| Tospitimou | 5 | 1 minute |

The scraper automatically:
- Delays between requests
- Randomizes delays to appear more human
- Rotates user agents
- Handles rate limit responses gracefully

## Anti-Bot Measures

If a platform implements aggressive anti-bot measures:

1. **Check Selectors**: Platform may have changed their HTML structure
2. **Increase Rate Limits**: Reduce requests per minute in config
3. **Enable Skyvern**: Set `useSkyvern: true` in platform config (requires API key)

## Troubleshooting

### Common Issues

**"No listings found on page"**
- Check if selectors are still valid
- Try accessing the site manually to see if structure changed
- Check for CAPTCHA or blocking

**"Rate limit reached"**
- Reduce `requests` in platform rate limit config
- Increase delay between scrapes

**"Database connection failed"**
- Verify `DATABASE_URL` is correct
- Ensure `market_intel` schema exists
- Run migrations if needed

### Debug Mode

```bash
# Run with debug logging
LOG_LEVEL=debug pnpm dev
```

## Monitoring

### Scrape Logs

All scrapes are logged to `market_intel.scrape_logs`:

```sql
SELECT platform, status, listings_found, listings_new, 
       scrape_duration_ms / 1000 as seconds
FROM market_intel.scrape_logs
ORDER BY started_at DESC
LIMIT 10;
```

### Health Check

```bash
# Check queue status
curl http://localhost:3001/health

# Check recent scrapes
pnpm scrape status
```

## License

Proprietary - Oikion Real Estate Platform

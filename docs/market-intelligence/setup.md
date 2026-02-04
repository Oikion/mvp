# Market Intelligence Setup Guide

This guide explains how to set up and use the Market Intelligence feature for monitoring Greek real estate competitor listings.

## Overview

Market Intelligence is a **multi-tenant, zero-configuration** system that:
- Automatically collects property listings from Greek real estate platforms (Spitogatos, XE.gr, Tospitimou)
- Stores data separately for each organization
- Runs on serverless infrastructure (Vercel Cron)
- Requires no manual setup from end users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Cron Job                         │
│          (temporary: runs daily on Hobby plan)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              /api/cron/market-intel                         │
│   1. Find orgs due for scraping (based on nextScrapeAt)     │
│   2. For each org, scrape configured platforms              │
│   3. Normalize and store listings                           │
│   4. Update nextScrapeAt based on frequency                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  market_intel Schema                         │
│   - competitor_listings (organization_id filtered)           │
│   - price_history                                            │
│   - scrape_logs                                              │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### Step 1: Configure Database Connection

Market Intelligence uses a separate PostgreSQL schema (`market_intel`) with raw SQL tables. If you're using **Prisma Accelerate**, you need to configure a direct database connection.

#### For Prisma Accelerate Users

1. **Add your direct database URL** to `.env.local`:
   ```bash
   # Direct database connection (for migrations and raw queries)
   DIRECT_DATABASE_URL="postgresql://username:password@your-host/database?sslmode=require"
   
   # Keep your Accelerate URL for normal operations
   DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
   ```

2. **Run the migration**:
   ```bash
   # Regenerate Prisma client
   pnpm prisma generate
   
   # Apply migrations (uses directUrl automatically)
   pnpm prisma migrate deploy
   ```

3. **If migrations show "already applied" but schema doesn't exist**, run the SQL directly:
   ```bash
   pnpm prisma db execute --file prisma/migrations/20260120100000_market_intelligence/migration.sql
   ```

#### For Direct Database Users (no Accelerate)

Simply run:
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

This creates:
- `MarketIntelConfig` table in the public schema (managed by Prisma)
- `market_intel` schema with `competitor_listings`, `price_history`, etc.
- Multi-tenant support via `organization_id` columns

### Step 2: Configure Cron Secret (Two Options)

For production deployments, set a cron secret to secure the endpoint. You have two options:

#### Option A: Via Platform Admin (Recommended)

1. Navigate to **Platform Admin > System > Settings**
2. Find "Cron Secret" under the Security category
3. Click "Set" and either enter a value or click "Generate Random Secret"
4. Click "Save"

#### Option B: Via Environment Variable

1. Generate a secure random string
2. Add it to your Vercel environment variables:
   ```
   CRON_SECRET=your-secure-random-string
   ```

**Note:** Database settings take priority over environment variables. If you set a value in Platform Admin, it will override the environment variable.

### Step 3: Deploy to Vercel

The `vercel.json` is already configured with the cron job:

> IMPORTANT (Vercel Hobby limitation)
> Market Intelligence cron is temporarily **daily (1x/day)** due to Vercel Hobby Cron limits.
> When upgrading to Pro, consider switching back to hourly (e.g. `0 */1 * * *`) if needed.

```json
{
  "crons": [
    {
      "path": "/api/cron/market-intel",
      "schedule": "0 5 * * *"
    }
  ]
}
```

This runs the market intelligence cron once per day (temporary). The per-organization scraping settings still apply, but the effective maximum frequency is capped by this cron cadence until you upgrade the Vercel plan.

### Step 4: User Configuration (No Setup Required!)

Users simply:
1. Navigate to **Market Intelligence > Settings**
2. Select which platforms to monitor
3. Configure filters (areas, price range, property types)
4. Choose update frequency
5. Click **Enable**

The system automatically:
- Creates their configuration
- Schedules their first scrape
- Begins collecting data within 24 hours (based on cron cadence)

## User Guide

### Accessing Market Intelligence

1. Go to your application sidebar
2. Click **Market Intelligence** (under Tools)
3. You'll see the Overview dashboard

### Configuring Settings

Navigate to **Market Intelligence > Settings** to configure:

#### Data Sources
Select which Greek real estate platforms to monitor:
- **Spitogatos.gr** - Large Greek property portal
- **XE.gr** - Popular classifieds site with property listings
- **Tospitimou.gr** - Greek property marketplace

#### Search Filters
Narrow down which listings to collect:
- **Target Areas**: Specify Greek area names (e.g., Κολωνάκι, Γλυφάδα)
- **Transaction Types**: For Sale and/or For Rent
- **Property Types**: Apartments, Houses, Villas, etc.
- **Price Range**: Min and max price in EUR

#### Update Frequency
- **Hourly**: Most current data (more resource usage)
- **Twice Daily**: Updated morning and evening
- **Daily**: Recommended for most users
- **Weekly**: Lower usage, less frequent updates

### Setting Up Alerts

1. Go to **Market Intelligence > Settings**
2. Click the **Alerts** tab
3. Click **New Alert**
4. Configure:
   - Alert name
   - Alert type (Price Drop, New Listing, Underpriced, etc.)
   - Area filter (optional)
   - Price range (optional)
   - Notification preferences

Alert types:
- **Price Drop**: When a listing price decreases
- **New Listing**: When new listings match your criteria
- **Underpriced**: Listings below market average
- **Stale Listing**: Properties on market for X days
- **Price Increase**: Market shift indicator

### Viewing Data

#### Overview Dashboard
- Total listings collected
- Platform breakdown
- Top areas by inventory
- Recent price changes

#### Browse Listings
- Search and filter competitor listings
- View details, images, agent info
- Track price history

#### Price Tracker
- Monitor price changes over time
- See drops and increases
- Filter by time range

#### Opportunities
- Underpriced properties
- Significant price drops
- New listings

## API Reference

### Configuration API

```typescript
// GET /api/market-intel/config
// Get current organization config
{
  config: MarketIntelConfig,
  schemaExists: boolean,
  availablePlatforms: Platform[],
  frequencyOptions: FrequencyOption[]
}

// POST /api/market-intel/config
// Create or update configuration
{
  isEnabled: boolean,
  platforms: string[],
  targetAreas: string[],
  transactionTypes: string[],
  propertyTypes: string[],
  minPrice?: number,
  maxPrice?: number,
  scrapeFrequency: "HOURLY" | "TWICE_DAILY" | "DAILY" | "WEEKLY",
  maxPagesPerPlatform: number
}

// PATCH /api/market-intel/config
// Toggle enable/disable
{
  isEnabled: boolean
}
```

### Manual Scrape Trigger

```typescript
// POST /api/market-intel/scrape
// Trigger a manual scrape
{
  platform?: string  // Optional: specific platform only
}

// GET /api/market-intel/scrape
// Get scrape status
{
  configured: boolean,
  config: { status, lastScrapeAt, nextScrapeAt, ... },
  recentLogs: ScrapeLog[]
}
```

### Cron Endpoint

```typescript
// GET /api/cron/market-intel
// Called by Vercel Cron (requires CRON_SECRET)
// Processes all orgs due for scraping
```

## Troubleshooting

### "Database Setup Required" Warning

If you see this warning, the `market_intel` PostgreSQL schema doesn't exist.

**For Prisma Accelerate users:**
1. Ensure `DIRECT_DATABASE_URL` is set in `.env.local` (see Step 1 above)
2. Run: `pnpm prisma db execute --file prisma/migrations/20260120100000_market_intelligence/migration.sql`
3. Refresh the page

**For direct database users:**
1. Run `pnpm prisma migrate deploy`
2. Refresh the page

**To verify the schema exists**, connect to your database and run:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'market_intel'
) as exists;
```

### Scraping Not Working

Check:
1. Is Market Intelligence enabled? (Settings > Enable button)
2. Is status "Active"? (not "Error" or "Paused")
3. Check console for errors
4. Verify `nextScrapeAt` is in the past

### No Data Showing

1. Wait for the first scrape to complete (up to 24 hours on the Hobby plan)
2. Check Settings > System Status for last scrape time
3. Verify at least one platform is selected
4. If status is "Error", check the error message

### Rate Limiting

The system automatically handles rate limiting:
- Requests are spaced 1-2 seconds apart
- Each platform has configured rate limits
- If blocked, the system will retry on next cron run

## Data Retention

- Active listings are kept indefinitely
- Inactive listings (not seen for 90 days) are automatically cleaned
- Price history is retained for trend analysis
- Scrape logs are kept for debugging

## Security & Privacy

- Each organization only sees their own data
- GDPR compliant: only public agency info is stored
- No personal data is collected beyond public listings
- All API endpoints require authentication

## Technical Details

### Database Schema

```sql
-- Public schema (Prisma managed)
MarketIntelConfig (
  id, organizationId, isEnabled, platforms, targetAreas,
  transactionTypes, propertyTypes, minPrice, maxPrice,
  scrapeFrequency, lastScrapeAt, nextScrapeAt,
  maxPagesPerPlatform, status, lastError, consecutiveFailures
)

-- market_intel schema (separate)
competitor_listings (
  organization_id, source_platform, source_listing_id,
  title, price, price_per_sqm, property_type, transaction_type,
  address, area, municipality, postal_code, latitude, longitude,
  size_sqm, bedrooms, bathrooms, floor, year_built,
  agency_name, agency_phone, images, listing_date,
  last_seen_at, first_scraped_at, days_on_market, is_active
)

price_history (
  organization_id, listing_id, price, price_per_sqm,
  change_type, recorded_at
)

scrape_logs (
  organization_id, platform, started_at, completed_at,
  status, listings_found, listings_new, listings_updated,
  listings_deactivated, error_message, pages_scraped
)
```

### File Structure

```
lib/market-intel/
├── db.ts              # Database operations
├── types.ts           # TypeScript interfaces
├── platforms.ts       # Platform configurations
├── normalizer.ts      # Data normalization

app/api/
├── cron/market-intel/route.ts     # Cron job endpoint
├── market-intel/
│   ├── config/route.ts            # Config CRUD
│   ├── scrape/route.ts            # Manual trigger
│   ├── route.ts                   # Overview stats
│   ├── listings/route.ts          # Listings browser
│   ├── opportunities/route.ts     # Opportunities
│   ├── price-changes/route.ts     # Price tracker
│   └── alerts/route.ts            # Alert management

app/[locale]/app/(routes)/market-intelligence/
├── page.tsx                       # Overview dashboard
├── listings/page.tsx              # Browse listings
├── opportunities/page.tsx         # Investment opportunities
├── price-tracker/page.tsx         # Price monitoring
└── settings/page.tsx              # Configuration UI
```

## Platform Admin Settings

Market Intelligence can be managed through the Platform Admin panel.

### Accessing Platform Admin Settings

1. Log in as a Platform Admin
2. Navigate to **Platform Admin > System > Settings**

### Available Settings

| Setting | Category | Description |
|---------|----------|-------------|
| Cron Secret | Security | Secret key for authenticating cron job requests |
| Market Intelligence Enabled | Features | Global toggle for the feature |
| Max Organizations (Market Intel) | Limits | Maximum orgs that can enable the feature |

### Settings Priority

Settings can be configured in two places:
1. **Database** (via Platform Admin UI) - Highest priority
2. **Environment Variables** - Fallback

If a setting is configured in the database, it takes priority over environment variables. This allows admins to change settings without redeploying.

### Clearing the Cache

Settings are cached for 5 minutes to reduce database queries. When you update a setting through the Platform Admin UI, the cache is automatically cleared. If you update environment variables, you may need to restart the server or wait for the cache to expire.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the scrape logs in Settings > System Status
3. Contact support with your organization ID and error message

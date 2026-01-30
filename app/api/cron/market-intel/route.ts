import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { 
  getConfigsDueForScraping, 
  updateOrgConfigAfterScrape,
  createScrapeLog,
  updateScrapeLog,
  upsertListing,
  deactivateOldListings,
  checkSchemaExists
} from "@/lib/market-intel/db";
import { normalizeProperty } from "@/lib/market-intel/normalizer";
import { getPlatformConfig } from "@/lib/market-intel/platforms";
import { fetchListingsFromPlatform } from "@/lib/market-intel/scraper";
import { getCronSecret, isMarketIntelEnabled } from "@/lib/system-settings";
import type { ScrapeJobResult } from "@/lib/market-intel/types";

// Maximum execution time for serverless function (in ms)
// Vercel Pro: 60s, Hobby: 10s
const MAX_EXECUTION_TIME = 55000;

/**
 * GET /api/cron/market-intel
 * 
 * Cron job endpoint that processes all organizations due for scraping.
 * Called automatically by Vercel Cron (configured in vercel.json).
 * 
 * This endpoint:
 * 1. Finds all orgs with enabled market intel that are due for scraping
 * 2. For each org, scrapes configured platforms (limited by time)
 * 3. Updates the org config with next scrape time
 * 4. Stores listings in the market_intel schema
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  
  // Verify cron secret for production (from database or environment)
  const cronSecret = await getCronSecret();
  if (cronSecret) {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Check if Market Intelligence is globally enabled
    const globallyEnabled = await isMarketIntelEnabled();
    if (!globallyEnabled) {
      return NextResponse.json({
        success: false,
        message: "Market Intelligence is globally disabled",
        processed: 0
      });
    }
    // Check if schema exists
    const schemaExists = await checkSchemaExists();
    if (!schemaExists) {
      return NextResponse.json({
        success: false,
        message: "Market intel schema not found. Please run migrations first.",
        processed: 0
      });
    }

    // Get all configs due for scraping
    const configs = await getConfigsDueForScraping();
    
    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No organizations due for scraping",
        processed: 0
      });
    }

    const results: Array<{
      organizationId: string;
      platforms: ScrapeJobResult[];
      success: boolean;
    }> = [];

    // Process each organization
    for (const config of configs) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log("Approaching time limit, stopping early");
        break;
      }

      const orgResults: ScrapeJobResult[] = [];
      let orgSuccess = true;

      try {
        // Process each platform for this organization
        for (const platformId of config.platforms) {
          // Check time again
          if (Date.now() - startTime > MAX_EXECUTION_TIME) {
            break;
          }

          const result = await scrapePlatform(
            config.organizationId,
            platformId,
            {
              areas: config.targetAreas,
              municipalities: config.targetMunicipalities,
              minPrice: config.minPrice || undefined,
              maxPrice: config.maxPrice || undefined,
              propertyTypes: config.propertyTypes as string[],
              transactionTypes: config.transactionTypes as string[]
            },
            config.maxPagesPerPlatform
          );

          orgResults.push(result);

          if (result.status === 'failed') {
            orgSuccess = false;
          }
        }

        // Update org config
        await updateOrgConfigAfterScrape(
          config.organizationId,
          orgSuccess,
          orgSuccess ? undefined : orgResults.find(r => r.errors?.length)?.errors?.[0]
        );

      } catch (error) {
        console.error(`Error processing org ${config.organizationId}:`, error);
        orgSuccess = false;
        
        await updateOrgConfigAfterScrape(
          config.organizationId,
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      results.push({
        organizationId: config.organizationId,
        platforms: orgResults,
        success: orgSuccess
      });
    }

    const totalListings = results.reduce(
      (sum, r) => sum + r.platforms.reduce((s, p) => s + p.listingsFound, 0),
      0
    );

    const successfulOrgs = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} organizations`,
      processed: results.length,
      successfulOrgs,
      totalListings,
      duration: Date.now() - startTime,
      results
    });

  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * Scrape a single platform for an organization
 * Uses a simplified HTTP-based approach for serverless compatibility
 */
async function scrapePlatform(
  organizationId: string,
  platformId: string,
  filters: {
    areas: string[];
    municipalities: string[];
    minPrice?: number;
    maxPrice?: number;
    propertyTypes: string[];
    transactionTypes: string[];
  },
  maxPages: number
): Promise<ScrapeJobResult> {
  const startTime = Date.now();
  const platform = getPlatformConfig(platformId);

  const result: ScrapeJobResult = {
    organizationId,
    platform: platformId,
    status: 'success',
    listingsFound: 0,
    listingsNew: 0,
    listingsUpdated: 0,
    listingsDeactivated: 0,
    pagesScraped: 0,
    duration: 0,
    errors: []
  };

  if (!platform) {
    result.status = 'failed';
    result.errors = [`Unknown platform: ${platformId}`];
    return result;
  }

  // Create scrape log
  let logId: string;
  try {
    logId = await createScrapeLog(organizationId, platformId);
  } catch {
    result.status = 'failed';
    result.errors = ['Failed to create scrape log'];
    return result;
  }

  const seenListingIds: string[] = [];

  try {
    // For serverless, we use a simpler HTTP-based scraping approach
    // This fetches listing data via platform APIs or public endpoints
    const listings = await fetchListingsFromPlatform(
      platform.id,
      platform.baseUrl,
      filters,
      maxPages
    );

    for (const rawListing of listings) {
      try {
        const normalized = normalizeProperty(rawListing, platformId, organizationId);
        const { isNew, priceChanged } = await upsertListing(normalized);

        seenListingIds.push(rawListing.sourceListingId);
        result.listingsFound++;

        if (isNew) {
          result.listingsNew++;
        } else if (priceChanged) {
          result.listingsUpdated++;
        }
      } catch (err) {
        console.error(`Failed to process listing ${rawListing.sourceListingId}:`, err);
        result.errors?.push(`Failed to process ${rawListing.sourceListingId}`);
      }
    }

    // Deactivate old listings
    result.listingsDeactivated = await deactivateOldListings(
      organizationId,
      platformId,
      seenListingIds
    );

    result.pagesScraped = Math.ceil(listings.length / 20); // Estimate

  } catch (error) {
    console.error(`Scrape failed for ${platformId}:`, error);
    result.status = result.listingsFound > 0 ? 'partial' : 'failed';
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    result.duration = Date.now() - startTime;

    // Update scrape log
    await updateScrapeLog(logId, result);
  }

  return result;
}


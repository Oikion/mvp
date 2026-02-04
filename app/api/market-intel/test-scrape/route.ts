import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { testScraper } from "@/lib/market-intel/scraper";
import { getAllPlatformIds, getPlatformNames } from "@/lib/market-intel/platforms";
import { hasMarketIntelAccess } from "@/lib/market-intel/access";

/**
 * GET /api/market-intel/test-scrape
 * 
 * Test scraping a platform with minimal pages to verify configuration.
 * 
 * Query params:
 *   - platform: Platform ID to test (spitogatos, xe_gr, tospitimou) - required
 *   - transaction: Transaction type (sale, rent) - default: sale
 *   - limit: Max listings to return - default: 10
 * 
 * Example:
 *   GET /api/market-intel/test-scrape?platform=xe_gr&transaction=sale&limit=5
 */
export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Market Intel access
    const hasAccess = await hasMarketIntelAccess(orgId);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: "Your organization does not have access to Market Intelligence."
      }, { status: 403 });
    }

    // Parse query params
    const url = new URL(request.url);
    const platformId = url.searchParams.get('platform');
    const transactionType = url.searchParams.get('transaction') as 'sale' | 'rent' || 'sale';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Validate platform
    const validPlatforms = getAllPlatformIds();
    if (!platformId) {
      return NextResponse.json({
        success: false,
        error: "Missing required 'platform' parameter",
        availablePlatforms: validPlatforms.map(id => ({
          id,
          name: getPlatformNames()[id]
        }))
      }, { status: 400 });
    }

    if (!validPlatforms.includes(platformId)) {
      return NextResponse.json({
        success: false,
        error: `Invalid platform: ${platformId}`,
        availablePlatforms: validPlatforms.map(id => ({
          id,
          name: getPlatformNames()[id]
        }))
      }, { status: 400 });
    }

    // Validate transaction type
    if (!['sale', 'rent'].includes(transactionType)) {
      return NextResponse.json({
        success: false,
        error: "Invalid transaction type. Must be 'sale' or 'rent'."
      }, { status: 400 });
    }

    // Run the test
    console.log(`[Test Scrape] Testing ${platformId} for ${transactionType}, limit: ${limit}`);
    const startTime = Date.now();
    
    const result = await testScraper(platformId, transactionType, limit);
    
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      platform: {
        id: platformId,
        name: getPlatformNames()[platformId]
      },
      transactionType,
      testResults: {
        totalFound: result.listingsFound,
        samplesReturned: result.sampleListings.length,
        durationMs: duration,
        errors: result.errors,
        // Enhanced metadata for debugging
        scrapeMethod: result.metadata?.scrapeMethod || 'unknown',
        isJsHeavyPlatform: result.metadata?.isJsHeavyPlatform || false,
        dataQuality: {
          withPrice: result.metadata?.listingsWithPrice || 0,
          withSize: result.metadata?.listingsWithSize || 0,
          withImages: result.metadata?.listingsWithImages || 0,
          priceRate: result.listingsFound > 0 
            ? Math.round((result.metadata?.listingsWithPrice || 0) / result.listingsFound * 100) 
            : 0,
          sizeRate: result.listingsFound > 0 
            ? Math.round((result.metadata?.listingsWithSize || 0) / result.listingsFound * 100) 
            : 0
        }
      },
      platformConfig: result.metadata?.platformConfig || null,
      sampleListings: result.sampleListings.map(listing => ({
        id: listing.sourceListingId,
        url: listing.sourceUrl,
        title: listing.title,
        price: listing.price,
        priceText: listing.priceText,
        location: listing.address || listing.area,
        size: listing.sizeSqm,
        bedrooms: listing.bedrooms,
        propertyType: listing.propertyType,
        hasImages: (listing.images?.length || 0) > 0,
        imageCount: listing.images?.length || 0
      })),
      // Include raw data for debugging (only first 3)
      rawSamples: result.sampleListings.slice(0, 3).map(listing => ({
        ...listing,
        images: listing.images?.slice(0, 2) // Limit images in response
      }))
    });

  } catch (error) {
    console.error("Error in test scrape:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Test scrape failed"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market-intel/test-scrape
 * 
 * Test scraping all platforms with a quick health check.
 * Returns status of each platform without storing data.
 */
export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Market Intel access
    const hasAccess = await hasMarketIntelAccess(orgId);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: "Your organization does not have access to Market Intelligence."
      }, { status: 403 });
    }

    // Get request body
    let body: { transactionType?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine
    }

    const transactionType = (body.transactionType as 'sale' | 'rent') || 'sale';
    const platforms = getAllPlatformIds();
    const platformNames = getPlatformNames();

    console.log(`[Test Scrape] Running health check on all platforms for ${transactionType}`);
    const startTime = Date.now();

    // Test each platform
    const results = await Promise.all(
      platforms.map(async (platformId) => {
        const platformStartTime = Date.now();
        try {
          const result = await testScraper(platformId, transactionType, 5);
          return {
            platform: {
              id: platformId,
              name: platformNames[platformId]
            },
            status: result.success ? 'ok' : 'failed',
            listingsFound: result.listingsFound,
            durationMs: Date.now() - platformStartTime,
            errors: result.errors,
            sampleListing: result.sampleListings[0] ? {
              id: result.sampleListings[0].sourceListingId,
              title: result.sampleListings[0].title,
              price: result.sampleListings[0].price,
              url: result.sampleListings[0].sourceUrl
            } : null
          };
        } catch (error) {
          return {
            platform: {
              id: platformId,
              name: platformNames[platformId]
            },
            status: 'error',
            listingsFound: 0,
            durationMs: Date.now() - platformStartTime,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            sampleListing: null
          };
        }
      })
    );

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'ok').length;

    return NextResponse.json({
      success: successCount > 0,
      summary: {
        totalPlatforms: platforms.length,
        successfulPlatforms: successCount,
        failedPlatforms: platforms.length - successCount,
        totalDurationMs: totalDuration,
        transactionType
      },
      platformResults: results
    });

  } catch (error) {
    console.error("Error in test scrape health check:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Health check failed"
      },
      { status: 500 }
    );
  }
}

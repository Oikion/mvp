import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export interface MarketIntelSummary {
  isEnabled: boolean;
  lastScrapeAt: Date | null;
  nextScrapeAt: Date | null;
  status: string;
  platformStats: Array<{
    platform: string;
    listingsFound: number;
    listingsNew: number;
    lastScrape: Date | null;
    status: string;
  }>;
  totalListings: number;
}

export async function getMarketIntelSummary(): Promise<MarketIntelSummary> {
  const organizationId = await getCurrentOrgIdSafe();

  if (!organizationId) {
    return {
      isEnabled: false,
      lastScrapeAt: null,
      nextScrapeAt: null,
      status: "disabled",
      platformStats: [],
      totalListings: 0,
    };
  }

  try {
    // Get org config
    const config = await prismadb.marketIntelConfig.findUnique({
      where: { organizationId },
    });

    if (!config?.isEnabled) {
      return {
        isEnabled: false,
        lastScrapeAt: null,
        nextScrapeAt: null,
        status: "disabled",
        platformStats: [],
        totalListings: 0,
      };
    }

    // Get latest scrape job
    const latestJob = await prismadb.scrapeJob.findFirst({
      where: { organizationId },
      orderBy: { startedAt: "desc" },
    });

    // Get platform stats from recent scrape logs (using raw query for market_intel schema)
    let platformStats: Array<{
      platform: string;
      listingsFound: number;
      listingsNew: number;
      lastScrape: Date | null;
      status: string;
    }> = [];

    let totalListings = 0;

    try {
      // Get recent scrape logs grouped by platform
      const logs = await prismadb.$queryRaw<
        Array<{
          platform: string;
          listings_found: number;
          listings_new: number;
          completed_at: Date | null;
          status: string;
        }>
      >`
        SELECT DISTINCT ON (platform)
          platform,
          COALESCE(listings_found, 0)::int as listings_found,
          COALESCE(listings_new, 0)::int as listings_new,
          completed_at,
          status
        FROM market_intel.scrape_logs
        WHERE organization_id = ${organizationId}
        ORDER BY platform, started_at DESC
        LIMIT 5
      `;

      platformStats = logs.map((log) => ({
        platform: log.platform,
        listingsFound: log.listings_found,
        listingsNew: log.listings_new,
        lastScrape: log.completed_at,
        status: log.status,
      }));

      // Count total active listings
      const countResult = await prismadb.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM market_intel.competitor_listings
        WHERE organization_id = ${organizationId}
        AND is_active = true
      `;
      totalListings = Number(countResult[0]?.count || 0);
    } catch (queryError) {
      // Market intel schema may not exist
      console.warn("Market intel query failed:", queryError);
    }

    return {
      isEnabled: config.isEnabled,
      lastScrapeAt: config.lastScrapeAt,
      nextScrapeAt: config.nextScrapeAt,
      status: latestJob?.status || config.status || "idle",
      platformStats,
      totalListings,
    };
  } catch (error) {
    console.error("Failed to fetch market intel summary:", error);
    return {
      isEnabled: false,
      lastScrapeAt: null,
      nextScrapeAt: null,
      status: "error",
      platformStats: [],
      totalListings: 0,
    };
  }
}

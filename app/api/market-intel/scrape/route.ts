import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { 
  checkSchemaExists,
  createScrapeLog,
  updateScrapeLog,
  upsertListing,
  deactivateOldListings
} from "@/lib/market-intel/db";
import { hasMarketIntelAccess } from "@/lib/market-intel/access";
import { normalizeProperty } from "@/lib/market-intel/normalizer";
import { getPlatformConfig } from "@/lib/market-intel/platforms";
import { fetchListingsFromPlatform } from "@/lib/market-intel/scraper";
import { submitJob } from "@/lib/jobs";
import type { MarketIntelPayload } from "@/lib/jobs/types";

// Feature flag: Use K8s Jobs for scraping
// Set to true once K8s infrastructure is deployed
const USE_K8S_JOBS = process.env.USE_K8S_JOBS === "true";

// Progress structure for each platform
interface PlatformProgress {
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

interface JobProgress {
  [platform: string]: PlatformProgress;
}

// Current action tracking for dynamic status display
interface CurrentAction {
  type: "initializing" | "connecting" | "scrolling" | "extracting" | "analyzing" | "saving" | "waiting";
  message: string;
  propertyTitle?: string;
  platform?: string;
  page?: number;
}

/**
 * POST /api/market-intel/scrape
 * 
 * Start an immediate scrape for the organization.
 * Creates a ScrapeJob and executes scraping, returning the job ID for progress polling.
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
        error: "Your organization does not have access to Market Intelligence. Please contact support."
      }, { status: 403 });
    }

    // Check if schema exists
    const schemaExists = await checkSchemaExists();
    if (!schemaExists) {
      return NextResponse.json({
        success: false,
        error: "Market Intelligence database not set up. Please contact support."
      }, { status: 400 });
    }

    // Get config
    const config = await prismadb.marketIntelConfig.findUnique({
      where: { organizationId: orgId }
    });

    if (!config) {
      return NextResponse.json({
        success: false,
        error: "Market Intelligence not configured. Please set up first."
      }, { status: 400 });
    }

    if (!config.isEnabled) {
      return NextResponse.json({
        success: false,
        error: "Market Intelligence is disabled. Please enable it first."
      }, { status: 400 });
    }

    // Check for existing running job
    const existingJob = await prismadb.scrapeJob.findFirst({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "RUNNING"] }
      }
    });

    if (existingJob) {
      return NextResponse.json({
        success: false,
        error: "A scrape is already in progress",
        jobId: existingJob.id
      }, { status: 409 });
    }

    // ===========================================
    // NEW: K8s Job Orchestrator Path
    // ===========================================
    if (USE_K8S_JOBS) {
      // Build payload for K8s job
      const k8sPayload: MarketIntelPayload = {
        type: 'market-intel-scrape',
        platforms: config.platforms,
        targetAreas: config.targetAreas,
        targetMunicipalities: config.targetMunicipalities,
        transactionTypes: config.transactionTypes,
        propertyTypes: config.propertyTypes,
        minPrice: config.minPrice || undefined,
        maxPrice: config.maxPrice || undefined,
        maxPagesPerPlatform: config.maxPagesPerPlatform,
      };

      // Submit to K8s Job Orchestrator
      const result = await submitJob({
        type: 'market-intel-scrape',
        organizationId: orgId,
        payload: k8sPayload,
        priority: 'normal',
      });

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.message || "Failed to start K8s job",
          jobId: result.jobId,
        }, { status: 409 });
      }

      // Also create a ScrapeJob record for backwards compatibility with UI
      const job = await prismadb.scrapeJob.create({
        data: {
          organizationId: orgId,
          status: "RUNNING",
          platforms: config.platforms,
          progress: {},
          currentAction: {
            type: "initializing",
            message: "Job submitted to Kubernetes...",
            platform: config.platforms[0]
          },
          startedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: "Scrape started via K8s",
        jobId: job.id,
        k8sJobId: result.jobId,
        platforms: config.platforms,
        useK8s: true,
      });
    }

    // ===========================================
    // Legacy: Inline execution path
    // ===========================================
    // Create initial progress object
    const initialProgress: JobProgress = {};
    for (const platform of config.platforms) {
      initialProgress[platform] = {
        status: "pending",
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      };
    }

    // Create the ScrapeJob with initial action state
    const initialAction: CurrentAction = {
      type: "initializing",
      message: "Preparing to scan platforms...",
      platform: config.platforms[0]
    };

    const job = await prismadb.scrapeJob.create({
      data: {
        organizationId: orgId,
        status: "RUNNING",
        platforms: config.platforms,
        progress: initialProgress,
        currentAction: initialAction,
        startedAt: new Date()
      }
    });

    // Start the scrape process asynchronously (non-blocking)
    // We use a fire-and-forget pattern so the API returns immediately
    executeScrapeJob(job.id, orgId, config).catch(error => {
      console.error(`Scrape job ${job.id} failed:`, error);
    });

    return NextResponse.json({
      success: true,
      message: "Scrape started",
      jobId: job.id,
      platforms: config.platforms,
      useK8s: false,
    });

  } catch (error) {
    console.error("Error starting scrape:", error);
    return NextResponse.json(
      { error: "Failed to start scrape" },
      { status: 500 }
    );
  }
}

/**
 * Helper to update current action for real-time status display
 */
async function updateAction(
  jobId: string, 
  action: CurrentAction, 
  progress?: JobProgress
) {
  const updateData: { currentAction: CurrentAction; progress?: JobProgress } = { 
    currentAction: action 
  };
  if (progress) {
    updateData.progress = progress;
  }
  await prismadb.scrapeJob.update({
    where: { id: jobId },
    data: updateData
  });
}

/**
 * Execute the scrape job
 * This runs asynchronously after the API returns
 */
async function executeScrapeJob(
  jobId: string,
  orgId: string,
  config: {
    platforms: string[];
    targetAreas: string[];
    targetMunicipalities: string[];
    transactionTypes: string[];
    propertyTypes: string[];
    minPrice: number | null;
    maxPrice: number | null;
    maxPagesPerPlatform: number;
  }
) {
  const progress: JobProgress = {};
  
  // Initialize progress
  for (const platform of config.platforms) {
    progress[platform] = {
      status: "pending",
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  let hasErrors = false;

  try {
    // Process each platform
    for (let platformIndex = 0; platformIndex < config.platforms.length; platformIndex++) {
      const platformId = config.platforms[platformIndex];
      progress[platformId].status = "running";
      
      // Update action: Connecting to platform
      await updateAction(jobId, {
        type: "connecting",
        message: `Connecting to ${getPlatformDisplayName(platformId)}...`,
        platform: platformId
      }, progress);

      // Update job progress
      await prismadb.scrapeJob.update({
        where: { id: jobId },
        data: {
          currentPlatform: platformId,
          progress
        }
      });

      try {
        // Get platform config
        const platform = getPlatformConfig(platformId);
        if (!platform) {
          progress[platformId].status = "failed";
          progress[platformId].errors.push(`Unknown platform: ${platformId}`);
          hasErrors = true;
          continue;
        }

        // Create scrape log in market_intel schema
        let logId: string;
        try {
          logId = await createScrapeLog(orgId, platformId);
        } catch (e) {
          progress[platformId].status = "failed";
          progress[platformId].errors.push("Failed to create scrape log");
          hasErrors = true;
          continue;
        }

        const seenListingIds: string[] = [];
        let listingsNew = 0;
        let listingsUpdated = 0;

        // Update action: Starting to fetch listings
        await updateAction(jobId, {
          type: "scrolling",
          message: `Loading search results from ${getPlatformDisplayName(platformId)}...`,
          platform: platformId,
          page: 1
        });

        // Fetch listings from platform
        const listings = await fetchListingsFromPlatform(
          platformId,
          platform.baseUrl,
          {
            areas: config.targetAreas,
            municipalities: config.targetMunicipalities,
            minPrice: config.minPrice || undefined,
            maxPrice: config.maxPrice || undefined,
            propertyTypes: config.propertyTypes,
            transactionTypes: config.transactionTypes
          },
          config.maxPagesPerPlatform
        );

        // Update action: Found listings, starting analysis
        await updateAction(jobId, {
          type: "extracting",
          message: `Found ${listings.length} properties. Starting analysis...`,
          platform: platformId
        });

        // Process each listing
        for (let i = 0; i < listings.length; i++) {
          const rawListing = listings[i];
          progress[platformId].total++;
          
          // Update action every listing for dynamic feel
          const propertyTitle = rawListing.title || `Property #${i + 1}`;
          const truncatedTitle = propertyTitle.length > 40 
            ? propertyTitle.substring(0, 40) + "..." 
            : propertyTitle;
          
          await updateAction(jobId, {
            type: "analyzing",
            message: `Analyzing property ${i + 1} of ${listings.length}`,
            propertyTitle: truncatedTitle,
            platform: platformId
          });
          
          try {
            const normalized = normalizeProperty(rawListing, platformId, orgId);
            
            // Update action: Saving
            if (i % 5 === 0) { // Don't update too frequently to avoid DB overload
              await updateAction(jobId, {
                type: "saving",
                message: `Saving "${truncatedTitle}"...`,
                propertyTitle: truncatedTitle,
                platform: platformId
              });
            }
            
            const { isNew, priceChanged } = await upsertListing(normalized);
            
            seenListingIds.push(rawListing.sourceListingId);
            progress[platformId].passed++;
            
            if (isNew) {
              listingsNew++;
            } else if (priceChanged) {
              listingsUpdated++;
            }
          } catch (err) {
            progress[platformId].failed++;
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            if (!progress[platformId].errors.includes(errorMsg)) {
              progress[platformId].errors.push(errorMsg);
            }
          }

          // Update progress periodically (every 5 listings for smoother updates)
          if (progress[platformId].total % 5 === 0) {
            await prismadb.scrapeJob.update({
              where: { id: jobId },
              data: { progress }
            });
          }
        }

        // Update action: Cleaning up
        await updateAction(jobId, {
          type: "waiting",
          message: `Cleaning up stale listings from ${getPlatformDisplayName(platformId)}...`,
          platform: platformId
        });

        // Deactivate old listings
        const deactivated = await deactivateOldListings(orgId, platformId, seenListingIds);

        // Update scrape log
        await updateScrapeLog(logId, {
          status: progress[platformId].failed > 0 ? "partial" : "success",
          listingsFound: progress[platformId].total,
          listingsNew,
          listingsUpdated,
          listingsDeactivated: deactivated,
          pagesScraped: Math.ceil(listings.length / 20),
          duration: 0, // Will be calculated
          errors: progress[platformId].errors
        });

        progress[platformId].status = "completed";

      } catch (error) {
        progress[platformId].status = "failed";
        const errorMsg = error instanceof Error ? error.message : "Platform scrape failed";
        progress[platformId].errors.push(errorMsg);
        hasErrors = true;
      }

      // Update progress after each platform
      await prismadb.scrapeJob.update({
        where: { id: jobId },
        data: { progress }
      });
    }

    // Mark job as completed
    await prismadb.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: hasErrors ? "FAILED" : "COMPLETED",
        currentPlatform: null,
        currentAction: null,
        completedAt: new Date(),
        progress,
        errorMessage: hasErrors ? "Some platforms failed to scrape" : null
      }
    });

    // Update MarketIntelConfig
    await prismadb.marketIntelConfig.update({
      where: { organizationId: orgId },
      data: {
        lastScrapeAt: new Date(),
        status: hasErrors ? "ERROR" : "ACTIVE",
        consecutiveFailures: hasErrors ? { increment: 1 } : 0,
        lastError: hasErrors ? "Some platforms failed" : null
      }
    });

  } catch (error) {
    console.error(`Scrape job ${jobId} failed:`, error);
    
    await prismadb.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        currentAction: null,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        progress
      }
    });
  }
}

/**
 * Get display-friendly platform name
 */
function getPlatformDisplayName(platformId: string): string {
  const names: Record<string, string> = {
    spitogatos: "Spitogatos",
    xe_gr: "XE.gr",
    tospitimou: "Tospitimou"
  };
  return names[platformId] || platformId;
}


/**
 * GET /api/market-intel/scrape
 * 
 * Get the current scrape status for the organization.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Market Intel access
    const hasAccess = await hasMarketIntelAccess(orgId);

    // Get config
    const config = await prismadb.marketIntelConfig.findUnique({
      where: { organizationId: orgId },
      select: {
        isEnabled: true,
        status: true,
        lastScrapeAt: true,
        nextScrapeAt: true,
        scrapeFrequency: true,
        consecutiveFailures: true,
        lastError: true,
        platforms: true
      }
    });

    // Get active scrape job if any
    const activeJob = await prismadb.scrapeJob.findFirst({
      where: {
        organizationId: orgId,
        status: { in: ["PENDING", "RUNNING"] }
      },
      orderBy: { createdAt: "desc" }
    });

    // Get recent completed jobs
    const recentJobs = await prismadb.scrapeJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    // Check if schema exists
    const schemaExists = await checkSchemaExists();

    // Get recent scrape logs from market_intel schema
    let recentLogs: Array<{
      id: string;
      platform: string;
      started_at: Date;
      status: string;
      listings_found: number;
    }> = [];

    if (schemaExists) {
      try {
        recentLogs = await prismadb.$queryRaw`
          SELECT id, platform, started_at, status, listings_found
          FROM market_intel.scrape_logs
          WHERE organization_id = ${orgId}
          ORDER BY started_at DESC
          LIMIT 10
        `;
      } catch {
        // Ignore errors if table doesn't exist
      }
    }

    return NextResponse.json({
      hasAccess,
      configured: !!config,
      schemaExists,
      config,
      activeJob: activeJob ? {
        id: activeJob.id,
        status: activeJob.status,
        currentPlatform: activeJob.currentPlatform,
        progress: activeJob.progress,
        startedAt: activeJob.startedAt
      } : null,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage
      })),
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        platform: log.platform,
        startedAt: log.started_at,
        status: log.status,
        listingsFound: log.listings_found
      }))
    });

  } catch (error) {
    console.error("Error getting scrape status:", error);
    return NextResponse.json(
      { error: "Failed to get scrape status" },
      { status: 500 }
    );
  }
}

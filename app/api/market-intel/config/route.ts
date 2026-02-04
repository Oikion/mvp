import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getOrCreateOrgConfig, checkSchemaExists } from "@/lib/market-intel/db";
import { getAllPlatformIds, getPlatformNames } from "@/lib/market-intel/platforms";
import { hasMarketIntelAccess } from "@/lib/market-intel/access";

/**
 * GET /api/market-intel/config
 * 
 * Get the market intelligence configuration for the current organization.
 * Creates a default config if one doesn't exist.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access
    const hasAccess = await hasMarketIntelAccess(orgId);

    // Check if schema exists
    const schemaExists = await checkSchemaExists();

    // Get or create config
    const config = await getOrCreateOrgConfig(orgId);

    // Get available platforms
    const platformIds = getAllPlatformIds();
    const platformNames = getPlatformNames();

    return NextResponse.json({
      hasAccess,
      config,
      schemaExists,
      availablePlatforms: platformIds.map(id => ({
        id,
        name: platformNames[id]
      })),
      frequencyOptions: [
        { value: 'HOURLY', label: 'Every hour', description: 'Most current data, higher usage' },
        { value: 'TWICE_DAILY', label: 'Twice daily', description: 'Updated morning and evening' },
        { value: 'DAILY', label: 'Daily', description: 'Recommended for most users' },
        { value: 'WEEKLY', label: 'Weekly', description: 'Lower usage, less current data' }
      ]
    });

  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market-intel/config
 * 
 * Create or update market intelligence configuration for the organization.
 * Also enables the feature if updating with isEnabled: true.
 */
export async function POST(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access
    const hasAccess = await hasMarketIntelAccess(orgId);
    if (!hasAccess) {
      return NextResponse.json({
        error: "Your organization does not have access to Market Intelligence. Please contact support."
      }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    const {
      isEnabled,
      platforms,
      targetAreas,
      targetMunicipalities,
      transactionTypes,
      propertyTypes,
      minPrice,
      maxPrice,
      scrapeFrequency,
      maxPagesPerPlatform
    } = body;

    // Validate platforms
    const validPlatforms = getAllPlatformIds();
    const selectedPlatforms = platforms?.filter((p: string) => validPlatforms.includes(p)) || [];

    if (selectedPlatforms.length === 0) {
      return NextResponse.json(
        { error: "At least one valid platform must be selected" },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['HOURLY', 'TWICE_DAILY', 'DAILY', 'WEEKLY'];
    const frequency = validFrequencies.includes(scrapeFrequency) 
      ? scrapeFrequency 
      : 'DAILY';

    // Get existing config
    const existingConfig = await prismadb.marketIntelConfig.findUnique({
      where: { organizationId: orgId }
    });

    // Calculate next scrape time if enabling
    let nextScrapeAt: Date | null = null;
    let status: 'PENDING_SETUP' | 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED' = 'PENDING_SETUP';
    
    if (isEnabled) {
      // If enabling, set next scrape to now (will be picked up by next cron)
      nextScrapeAt = new Date();
      status = 'ACTIVE';
    } else if (existingConfig?.status === 'ACTIVE') {
      status = 'PAUSED';
    }

    // Upsert config
    const config = await prismadb.marketIntelConfig.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        isEnabled: isEnabled ?? false,
        platforms: selectedPlatforms,
        targetAreas: targetAreas || [],
        targetMunicipalities: targetMunicipalities || [],
        transactionTypes: transactionTypes || ['sale', 'rent'],
        propertyTypes: propertyTypes || [],
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        scrapeFrequency: frequency,
        maxPagesPerPlatform: maxPagesPerPlatform || 10,
        status,
        nextScrapeAt,
        consecutiveFailures: 0
      },
      update: {
        isEnabled: isEnabled ?? existingConfig?.isEnabled ?? false,
        platforms: selectedPlatforms,
        targetAreas: targetAreas ?? existingConfig?.targetAreas ?? [],
        targetMunicipalities: targetMunicipalities ?? existingConfig?.targetMunicipalities ?? [],
        transactionTypes: transactionTypes ?? existingConfig?.transactionTypes ?? ['sale', 'rent'],
        propertyTypes: propertyTypes ?? existingConfig?.propertyTypes ?? [],
        minPrice: minPrice ?? existingConfig?.minPrice ?? null,
        maxPrice: maxPrice ?? existingConfig?.maxPrice ?? null,
        scrapeFrequency: frequency,
        maxPagesPerPlatform: maxPagesPerPlatform ?? existingConfig?.maxPagesPerPlatform ?? 10,
        status: isEnabled ? 'ACTIVE' : (existingConfig?.status === 'ACTIVE' ? 'PAUSED' : existingConfig?.status ?? 'PENDING_SETUP'),
        nextScrapeAt: isEnabled ? nextScrapeAt : existingConfig?.nextScrapeAt
      }
    });

    return NextResponse.json({
      success: true,
      config,
      message: isEnabled 
        ? "Market Intelligence enabled. Data collection will begin shortly." 
        : "Configuration saved."
    });

  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/market-intel/config
 * 
 * Partially update the configuration (e.g., toggle isEnabled)
 */
export async function PATCH(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access
    const hasAccess = await hasMarketIntelAccess(orgId);
    if (!hasAccess) {
      return NextResponse.json({
        error: "Your organization does not have access to Market Intelligence. Please contact support."
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Get existing config
    const existingConfig = await prismadb.marketIntelConfig.findUnique({
      where: { organizationId: orgId }
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "Configuration not found. Please set up Market Intelligence first." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if ('isEnabled' in body) {
      updateData.isEnabled = body.isEnabled;
      if (body.isEnabled) {
        updateData.status = 'ACTIVE';
        updateData.nextScrapeAt = new Date();
      } else {
        updateData.status = 'PAUSED';
      }
    }

    if ('status' in body) {
      const validStatuses = ['ACTIVE', 'PAUSED'];
      if (validStatuses.includes(body.status)) {
        updateData.status = body.status;
        updateData.isEnabled = body.status === 'ACTIVE';
        if (body.status === 'ACTIVE') {
          updateData.nextScrapeAt = new Date();
        }
      }
    }

    const config = await prismadb.marketIntelConfig.update({
      where: { organizationId: orgId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/market-intel/config
 * 
 * Disable and reset market intelligence configuration.
 * Does NOT delete collected data.
 */
export async function DELETE() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prismadb.marketIntelConfig.update({
      where: { organizationId: orgId },
      data: {
        isEnabled: false,
        status: 'DISABLED',
        nextScrapeAt: null
      }
    });

    return NextResponse.json({
      success: true,
      message: "Market Intelligence has been disabled. Historical data is preserved."
    });

  } catch (error) {
    console.error("Error disabling config:", error);
    return NextResponse.json(
      { error: "Failed to disable Market Intelligence" },
      { status: 500 }
    );
  }
}

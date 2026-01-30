import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/platform-admin";
import {
  grantMarketIntelAccess,
  revokeMarketIntelAccess,
  getOrganizationsWithMarketIntelAccess,
  MARKET_INTEL_FEATURE
} from "@/lib/market-intel/access";

/**
 * GET /api/platform-admin/features
 * 
 * List all organizations with feature access.
 * Optional query params: feature (default: market_intel)
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get("feature") || MARKET_INTEL_FEATURE;

    if (feature === MARKET_INTEL_FEATURE) {
      const features = await getOrganizationsWithMarketIntelAccess();
      
      // We'll return the feature data - org names would need to come from Clerk
      return NextResponse.json({
        features,
        featureType: feature
      });
    }

    // For other features, do a generic query
    const features = await prismadb.organizationFeature.findMany({
      where: { feature },
      orderBy: { grantedAt: "desc" }
    });

    return NextResponse.json({
      features,
      featureType: feature
    });

  } catch (error) {
    console.error("Error fetching features:", error);
    return NextResponse.json(
      { error: "Failed to fetch features" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform-admin/features
 * 
 * Grant feature access to an organization.
 * Body: { organizationId, feature?, expiresAt? }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId, feature = MARKET_INTEL_FEATURE, expiresAt } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (feature === MARKET_INTEL_FEATURE) {
      const result = await grantMarketIntelAccess(
        organizationId,
        userId,
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Market Intelligence access granted"
      });
    }

    // Generic feature grant
    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId,
          feature
        }
      },
      create: {
        organizationId,
        feature,
        isEnabled: true,
        grantedBy: userId,
        grantedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      update: {
        isEnabled: true,
        grantedBy: userId,
        grantedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    return NextResponse.json({
      success: true,
      message: `${feature} access granted`
    });

  } catch (error) {
    console.error("Error granting feature access:", error);
    return NextResponse.json(
      { error: "Failed to grant feature access" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platform-admin/features
 * 
 * Revoke feature access from an organization.
 * Query params: organizationId, feature (optional, default: market_intel)
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const feature = searchParams.get("feature") || MARKET_INTEL_FEATURE;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (feature === MARKET_INTEL_FEATURE) {
      const result = await revokeMarketIntelAccess(organizationId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Market Intelligence access revoked"
      });
    }

    // Generic feature revoke
    await prismadb.organizationFeature.update({
      where: {
        organizationId_feature: {
          organizationId,
          feature
        }
      },
      data: {
        isEnabled: false
      }
    });

    return NextResponse.json({
      success: true,
      message: `${feature} access revoked`
    });

  } catch (error) {
    console.error("Error revoking feature access:", error);
    return NextResponse.json(
      { error: "Failed to revoke feature access" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/platform-admin/features
 * 
 * Toggle feature access for an organization.
 * Body: { organizationId, feature?, isEnabled }
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId, feature = MARKET_INTEL_FEATURE, isEnabled } = body;

    if (!organizationId || typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Organization ID and isEnabled are required" },
        { status: 400 }
      );
    }

    if (isEnabled) {
      // Grant access
      if (feature === MARKET_INTEL_FEATURE) {
        await grantMarketIntelAccess(organizationId, userId);
      } else {
        await prismadb.organizationFeature.upsert({
          where: {
            organizationId_feature: { organizationId, feature }
          },
          create: {
            organizationId,
            feature,
            isEnabled: true,
            grantedBy: userId,
            grantedAt: new Date()
          },
          update: {
            isEnabled: true,
            grantedBy: userId,
            grantedAt: new Date()
          }
        });
      }
    } else {
      // Revoke access
      if (feature === MARKET_INTEL_FEATURE) {
        await revokeMarketIntelAccess(organizationId);
      } else {
        await prismadb.organizationFeature.updateMany({
          where: { organizationId, feature },
          data: { isEnabled: false }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: isEnabled ? "Access granted" : "Access revoked"
    });

  } catch (error) {
    console.error("Error toggling feature access:", error);
    return NextResponse.json(
      { error: "Failed to toggle feature access" },
      { status: 500 }
    );
  }
}

import { prismadb } from "@/lib/prisma";

/**
 * Market Intelligence Access Control
 * 
 * Manages organization-level access to the Market Intelligence feature.
 * Access must be explicitly granted by a Platform Admin.
 */

export const MARKET_INTEL_FEATURE = "market_intel";

/**
 * Check if an organization has access to Market Intelligence
 */
export async function hasMarketIntelAccess(orgId: string): Promise<boolean> {
  try {
    const feature = await prismadb.organizationFeature.findUnique({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: MARKET_INTEL_FEATURE
        }
      },
      select: {
        isEnabled: true,
        expiresAt: true
      }
    });

    if (!feature?.isEnabled) {
      return false;
    }

    // Check if access has expired
    if (feature.expiresAt && feature.expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("[hasMarketIntelAccess] Error checking access:", error);
    return false;
  }
}

/**
 * Get detailed access information for an organization
 */
export async function getMarketIntelAccessInfo(orgId: string): Promise<{
  hasAccess: boolean;
  grantedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
}> {
  try {
    const feature = await prismadb.organizationFeature.findUnique({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: MARKET_INTEL_FEATURE
        }
      }
    });

    if (!feature) {
      return {
        hasAccess: false,
        grantedAt: null,
        expiresAt: null,
        isExpired: false
      };
    }

    const isExpired = feature.expiresAt ? feature.expiresAt < new Date() : false;

    return {
      hasAccess: feature.isEnabled && !isExpired,
      grantedAt: feature.grantedAt,
      expiresAt: feature.expiresAt,
      isExpired
    };
  } catch (error) {
    console.error("[getMarketIntelAccessInfo] Error:", error);
    return {
      hasAccess: false,
      grantedAt: null,
      expiresAt: null,
      isExpired: false
    };
  }
}

/**
 * Grant Market Intelligence access to an organization
 * Only callable by Platform Admins
 */
export async function grantMarketIntelAccess(
  orgId: string,
  grantedBy: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: MARKET_INTEL_FEATURE
        }
      },
      create: {
        organizationId: orgId,
        feature: MARKET_INTEL_FEATURE,
        isEnabled: true,
        grantedBy,
        grantedAt: new Date(),
        expiresAt: expiresAt || null
      },
      update: {
        isEnabled: true,
        grantedBy,
        grantedAt: new Date(),
        expiresAt: expiresAt || null
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[grantMarketIntelAccess] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to grant access" 
    };
  }
}

/**
 * Revoke Market Intelligence access from an organization
 * Only callable by Platform Admins
 */
export async function revokeMarketIntelAccess(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prismadb.organizationFeature.update({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: MARKET_INTEL_FEATURE
        }
      },
      data: {
        isEnabled: false
      }
    });

    // Also disable the Market Intel config if it exists
    await prismadb.marketIntelConfig.updateMany({
      where: { organizationId: orgId },
      data: { 
        isEnabled: false,
        status: "DISABLED"
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[revokeMarketIntelAccess] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to revoke access" 
    };
  }
}

/**
 * Get all organizations with Market Intelligence access
 * For Platform Admin dashboard
 */
export async function getOrganizationsWithMarketIntelAccess(): Promise<Array<{
  organizationId: string;
  isEnabled: boolean;
  grantedBy: string | null;
  grantedAt: Date | null;
  expiresAt: Date | null;
}>> {
  try {
    const features = await prismadb.organizationFeature.findMany({
      where: {
        feature: MARKET_INTEL_FEATURE
      },
      select: {
        organizationId: true,
        isEnabled: true,
        grantedBy: true,
        grantedAt: true,
        expiresAt: true
      },
      orderBy: {
        grantedAt: "desc"
      }
    });

    return features;
  } catch (error) {
    console.error("[getOrganizationsWithMarketIntelAccess] Error:", error);
    return [];
  }
}

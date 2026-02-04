import { prismadb } from "@/lib/prisma";

/**
 * AI Assistant Access Control
 * 
 * Manages organization-level access to the AI Assistant feature.
 * Access must be explicitly granted by a Platform Admin.
 */

export const AI_ASSISTANT_FEATURE = "ai_assistant";

/**
 * Check if an organization has access to the AI Assistant
 */
export async function hasAiAssistantAccess(orgId: string): Promise<boolean> {
  try {
    const feature = await prismadb.organizationFeature.findUnique({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: AI_ASSISTANT_FEATURE
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
    console.error("[hasAiAssistantAccess] Error checking access:", error);
    return false;
  }
}

/**
 * Get detailed access information for an organization
 */
export async function getAiAssistantAccessInfo(orgId: string): Promise<{
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
          feature: AI_ASSISTANT_FEATURE
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
    console.error("[getAiAssistantAccessInfo] Error:", error);
    return {
      hasAccess: false,
      grantedAt: null,
      expiresAt: null,
      isExpired: false
    };
  }
}

/**
 * Grant AI Assistant access to an organization
 * Only callable by Platform Admins
 */
export async function grantAiAssistantAccess(
  orgId: string,
  grantedBy: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    await prismadb.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: AI_ASSISTANT_FEATURE
        }
      },
      create: {
        organizationId: orgId,
        feature: AI_ASSISTANT_FEATURE,
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
    console.error("[grantAiAssistantAccess] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to grant access" 
    };
  }
}

/**
 * Revoke AI Assistant access from an organization
 * Only callable by Platform Admins
 */
export async function revokeAiAssistantAccess(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prismadb.organizationFeature.update({
      where: {
        organizationId_feature: {
          organizationId: orgId,
          feature: AI_ASSISTANT_FEATURE
        }
      },
      data: {
        isEnabled: false
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[revokeAiAssistantAccess] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to revoke access" 
    };
  }
}

/**
 * Get all organizations with AI Assistant access
 * For Platform Admin dashboard
 */
export async function getOrganizationsWithAiAssistantAccess(): Promise<Array<{
  organizationId: string;
  isEnabled: boolean;
  grantedBy: string | null;
  grantedAt: Date | null;
  expiresAt: Date | null;
}>> {
  try {
    const features = await prismadb.organizationFeature.findMany({
      where: {
        feature: AI_ASSISTANT_FEATURE
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
    console.error("[getOrganizationsWithAiAssistantAccess] Error:", error);
    return [];
  }
}

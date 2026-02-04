"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { XeClient, createXeClientFromIntegration } from "@/lib/xe/xe-client";
import {
  mapPropertyToXeItem,
  generateXeRefId,
  validatePropertyForXe,
  type PropertyWithExtras,
} from "@/lib/xe/property-mapper";
import type { XeSyncPolicy, XeSyncStatus, XeSyncItemStatus } from "@prisma/client";
import type { XePolicy, XeAgentPublishSettings } from "@/types/xe-api";
import { requireAction } from "@/lib/permissions/action-guards";

// ============================================
// TYPES
// ============================================

export interface SyncToXeInput {
  propertyIds?: string[]; // If empty, sync all active PUBLIC properties
  policy?: XePolicy;
}

export interface RemoveFromXeInput {
  propertyIds: string[];
}

export interface SyncResult {
  success: boolean;
  packageId?: string;
  message: string;
  totalItems?: number;
  successCount?: number;
  failureCount?: number;
  errors?: Array<{
    propertyId: string;
    error: string;
  }>;
}

// ============================================
// SYNC PROPERTIES TO XE
// ============================================

/**
 * Sync properties to XE.gr portal
 */
export async function syncPropertiesToXe(
  input: SyncToXeInput = {}
): Promise<SyncResult> {
  try {
    // Permission check: Users need xe:sync_properties permission
    const guard = await requireAction("xe:sync_properties");
    if (guard) return { success: false, message: guard.error || "Permission denied" };

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get XE integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      include: {
        agentSettings: true,
      },
    });

    if (!integration) {
      return {
        success: false,
        message: "XE integration not configured",
      };
    }

    if (!integration.isActive) {
      return {
        success: false,
        message: "XE integration is not active",
      };
    }

    // Get properties to sync
    const whereClause: Record<string, unknown> = {
      organizationId,
      property_status: "ACTIVE",
    };

    if (input.propertyIds && input.propertyIds.length > 0) {
      whereClause.id = { in: input.propertyIds };
    } else {
      // Only sync PUBLIC visibility properties if no specific IDs provided
      whereClause.portal_visibility = "PUBLIC";
    }

    const properties = await prismadb.properties.findMany({
      where: whereClause,
      include: {
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true },
        },
        Documents: {
          where: {
            document_file_mimeType: { startsWith: "image/" },
          },
          select: { document_file_url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (properties.length === 0) {
      return {
        success: false,
        message: "No properties found to sync",
      };
    }

    // Build agent settings map
    const agentSettingsMap = new Map<string, XeAgentPublishSettings>();
    for (const settings of integration.agentSettings) {
      agentSettingsMap.set(settings.agentId, {
        xeOwnerId: settings.xeOwnerId,
        majorPhone: settings.majorPhone,
        otherPhones: settings.otherPhones,
        publicationType: settings.publicationType,
      });
    }

    // Default settings from integration (for agents without specific settings)
    const defaultSettings: XeAgentPublishSettings = {
      xeOwnerId: integration.agentId,
      majorPhone: "", // Will need to be set per agent
      publicationType: integration.publicationType,
    };

    // Validate and map properties
    const validationErrors: Array<{ propertyId: string; error: string }> = [];
    const xeItems: Array<{
      property: typeof properties[0];
      xeItem: ReturnType<typeof mapPropertyToXeItem>;
    }> = [];

    for (const property of properties) {
      // Extract images from Documents
      const images = property.Documents.map((d) => d.document_file_url).filter(
        (url): url is string => !!url
      );

      const propertyWithImages: PropertyWithExtras = {
        ...property,
        images,
      } as PropertyWithExtras;

      // Validate property
      const validation = validatePropertyForXe(propertyWithImages);
      if (!validation.valid) {
        validationErrors.push({
          propertyId: property.id,
          error: validation.errors.join("; "),
        });
        continue;
      }

      // Get agent settings
      const assignedTo = property.assigned_to || "";
      let agentSettings = agentSettingsMap.get(assignedTo);

      // If no specific agent settings, check if we have default settings with phone
      if (!agentSettings) {
        if (!defaultSettings.majorPhone) {
          validationErrors.push({
            propertyId: property.id,
            error: `No XE settings configured for agent ${assignedTo}`,
          });
          continue;
        }
        agentSettings = defaultSettings;
      }

      // Generate or use existing xeRefId
      const xeRefId = property.xeRefId || generateXeRefId(property.id, organizationId);

      // Map to XE format
      const xeItem = mapPropertyToXeItem(
        { ...propertyWithImages, xeRefId },
        agentSettings
      );

      xeItems.push({ property, xeItem });
    }

    if (xeItems.length === 0) {
      return {
        success: false,
        message: "No valid properties to sync",
        errors: validationErrors,
      };
    }

    // Create XE client
    const xeClient = createXeClientFromIntegration(integration);

    // Generate package ID
    const packageId = XeClient.generatePackageId(organizationId, "OIKION");

    // Build and submit request
    const policy: XePolicy = input.policy || "INCREMENTAL";
    const response = await xeClient.syncProperties(
      xeItems.map((item) => item.xeItem),
      {
        policy,
        organizationId,
        trademark: integration.trademark || undefined,
      }
    );

    // Create sync history record
    const syncHistory = await prismadb.xeSyncHistory.create({
      data: {
        integrationId: integration.id,
        packageId: response.packageId || packageId,
        policy: policy as XeSyncPolicy,
        requestType: "ADD_ITEMS",
        totalItems: xeItems.length,
        status: response.success ? "PENDING" : "FAILED",
        errorMessage: response.success ? null : response.message,
        items: {
          create: xeItems.map((item) => ({
            propertyId: item.property.id,
            refId: item.xeItem["@refId"],
            status: response.success ? ("PENDING" as XeSyncItemStatus) : ("FAILED" as XeSyncItemStatus),
            errorMessage: response.success ? null : response.message,
          })),
        },
      },
    });

    // Update properties with xeRefId and xePublished status
    if (response.success) {
      for (const item of xeItems) {
        await prismadb.properties.update({
          where: { id: item.property.id },
          data: {
            xeRefId: item.xeItem["@refId"],
            xePublished: true,
            portal_visibility: "PUBLIC",
          },
        });
      }
    }

    // Update integration last sync time
    await prismadb.xeIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastPackageId: response.packageId || packageId,
      },
    });

    revalidatePath("/mls/properties");
    revalidatePath("/settings/xe-integration");

    return {
      success: response.success,
      packageId: response.packageId || packageId,
      message: response.success
        ? `Successfully submitted ${xeItems.length} properties to XE.gr`
        : response.message,
      totalItems: xeItems.length,
      successCount: response.success ? xeItems.length : 0,
      failureCount: response.success ? 0 : xeItems.length,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    };
  } catch (error) {
    console.error("[XE_SYNC_PROPERTIES]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync properties",
    };
  }
}

// ============================================
// REMOVE PROPERTIES FROM XE
// ============================================

/**
 * Remove properties from XE.gr portal
 */
export async function removePropertiesFromXe(
  input: RemoveFromXeInput
): Promise<SyncResult> {
  try {
    // Permission check: Users need xe:sync_properties permission
    const guard = await requireAction("xe:sync_properties");
    if (guard) return { success: false, message: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { propertyIds } = input;

    if (!propertyIds || propertyIds.length === 0) {
      return {
        success: false,
        message: "No property IDs provided",
      };
    }

    // Get XE integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
    });

    if (!integration) {
      return {
        success: false,
        message: "XE integration not configured",
      };
    }

    if (!integration.isActive) {
      return {
        success: false,
        message: "XE integration is not active",
      };
    }

    // Get properties with xeRefId
    const properties = await prismadb.properties.findMany({
      where: {
        id: { in: propertyIds },
        organizationId,
        xeRefId: { not: null },
      },
      select: {
        id: true,
        xeRefId: true,
        property_type: true,
      },
    });

    if (properties.length === 0) {
      return {
        success: false,
        message: "No published properties found to remove",
      };
    }

    // Create XE client
    const xeClient = createXeClientFromIntegration(integration);

    // Map properties to remove request format
    const { mapPropertyTypeToXe } = await import("@/lib/xe/property-mapper");
    const refIds = properties.map((p) => ({
      type: mapPropertyTypeToXe(p.property_type),
      refId: p.xeRefId!,
    }));

    // Submit removal request
    const response = await xeClient.removeProperties(refIds, organizationId);

    // Create sync history record
    const syncHistory = await prismadb.xeSyncHistory.create({
      data: {
        integrationId: integration.id,
        packageId: response.packageId,
        policy: "INCREMENTAL",
        requestType: "REMOVE_ITEMS",
        totalItems: properties.length,
        status: response.success ? "PENDING" : "FAILED",
        errorMessage: response.success ? null : response.message,
        items: {
          create: properties.map((p) => ({
            propertyId: p.id,
            refId: p.xeRefId!,
            status: response.success ? ("PENDING" as XeSyncItemStatus) : ("FAILED" as XeSyncItemStatus),
            errorMessage: response.success ? null : response.message,
          })),
        },
      },
    });

    // Update properties to mark as unpublished
    if (response.success) {
      await prismadb.properties.updateMany({
        where: { id: { in: propertyIds } },
        data: { xePublished: false },
      });
    }

    revalidatePath("/mls/properties");
    revalidatePath("/settings/xe-integration");

    return {
      success: response.success,
      packageId: response.packageId,
      message: response.success
        ? `Successfully submitted removal of ${properties.length} properties from XE.gr`
        : response.message,
      totalItems: properties.length,
    };
  } catch (error) {
    console.error("[XE_REMOVE_PROPERTIES]", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove properties",
    };
  }
}

// ============================================
// GET PROPERTY XE STATUS
// ============================================

/**
 * Get XE publishing status for a property
 */
export async function getPropertyXeStatus(
  propertyId: string
): Promise<{
  isPublished: boolean;
  xeRefId: string | null;
  lastSync: Date | null;
  status: XeSyncItemStatus | null;
}> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId },
      select: {
        xePublished: true,
        xeRefId: true,
        XeSyncItems: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!property) {
      return {
        isPublished: false,
        xeRefId: null,
        lastSync: null,
        status: null,
      };
    }

    const lastSyncItem = property.XeSyncItems[0];

    return {
      isPublished: property.xePublished,
      xeRefId: property.xeRefId,
      lastSync: lastSyncItem?.createdAt || null,
      status: lastSyncItem?.status || null,
    };
  } catch (error) {
    console.error("[XE_GET_PROPERTY_STATUS]", error);
    return {
      isPublished: false,
      xeRefId: null,
      lastSync: null,
      status: null,
    };
  }
}

/**
 * Get bulk XE status for multiple properties
 */
export async function getPropertiesXeStatus(
  propertyIds: string[]
): Promise<
  Map<
    string,
    {
      isPublished: boolean;
      xeRefId: string | null;
    }
  >
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const properties = await prismadb.properties.findMany({
      where: {
        id: { in: propertyIds },
        organizationId,
      },
      select: {
        id: true,
        xePublished: true,
        xeRefId: true,
      },
    });

    const statusMap = new Map<
      string,
      { isPublished: boolean; xeRefId: string | null }
    >();

    for (const property of properties) {
      statusMap.set(property.id, {
        isPublished: property.xePublished,
        xeRefId: property.xeRefId,
      });
    }

    return statusMap;
  } catch (error) {
    console.error("[XE_GET_PROPERTIES_STATUS]", error);
    return new Map();
  }
}

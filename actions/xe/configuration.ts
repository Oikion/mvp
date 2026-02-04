"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import type { XePublicationType } from "@prisma/client";
import { requireAction } from "@/lib/permissions/action-guards";

// ============================================
// TYPES
// ============================================

export interface XeIntegrationInput {
  username: string;
  password: string;
  authToken: string;
  agentId: string;
  isActive?: boolean;
  autoPublish?: boolean;
  publicationType?: XePublicationType;
  trademark?: string;
}

export interface XeAgentSettingsInput {
  agentId: string; // Clerk user ID
  xeOwnerId: string;
  majorPhone: string;
  otherPhones?: string[];
  isActive?: boolean;
  autoPublish?: boolean;
  publicationType?: XePublicationType;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// GET INTEGRATION
// ============================================

/**
 * Get XE integration settings for the current organization
 */
export async function getXeIntegration(): Promise<
  ActionResult<{
    id: string;
    username: string;
    authToken: string;
    agentId: string;
    isActive: boolean;
    autoPublish: boolean;
    publicationType: XePublicationType;
    trademark: string | null;
    lastSyncAt: Date | null;
    lastPackageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: {
        id: true,
        username: true,
        authToken: true,
        agentId: true,
        isActive: true,
        autoPublish: true,
        publicationType: true,
        trademark: true,
        lastSyncAt: true,
        lastPackageId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password from response
      },
    });

    return { success: true, data: integration };
  } catch (error) {
    console.error("[XE_GET_INTEGRATION]", error);
    return { success: false, error: "Failed to get XE integration settings" };
  }
}

/**
 * Check if XE integration exists and is active
 */
export async function isXeIntegrationActive(): Promise<boolean> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { isActive: true },
    });

    return integration?.isActive ?? false;
  } catch {
    return false;
  }
}

// ============================================
// SAVE INTEGRATION
// ============================================

/**
 * Create or update XE integration settings
 */
export async function saveXeIntegration(
  input: XeIntegrationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Permission check: Only owners can manage XE configuration
    const guard = await requireAction("xe:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { username, password, authToken, agentId, isActive, autoPublish, publicationType, trademark } = input;

    // Validate required fields
    if (!username || !password || !authToken || !agentId) {
      return {
        success: false,
        error: "Username, password, auth token, and agent ID are required",
      };
    }

    // Upsert integration
    const integration = await prismadb.xeIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        username,
        password,
        authToken,
        agentId,
        isActive: isActive ?? false,
        autoPublish: autoPublish ?? false,
        publicationType: publicationType ?? "BASIC",
        trademark: trademark || null,
      },
      update: {
        username,
        password,
        authToken,
        agentId,
        isActive: isActive ?? false,
        autoPublish: autoPublish ?? false,
        publicationType: publicationType ?? "BASIC",
        trademark: trademark || null,
      },
      select: { id: true },
    });

    revalidatePath("/settings/xe-integration");

    return { success: true, data: { id: integration.id } };
  } catch (error) {
    console.error("[XE_SAVE_INTEGRATION]", error);
    return { success: false, error: "Failed to save XE integration settings" };
  }
}

/**
 * Toggle XE integration active status
 */
export async function toggleXeIntegration(
  isActive: boolean
): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage XE configuration
    const guard = await requireAction("xe:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    await prismadb.xeIntegration.update({
      where: { organizationId },
      data: { isActive },
    });

    revalidatePath("/settings/xe-integration");

    return { success: true };
  } catch (error) {
    console.error("[XE_TOGGLE_INTEGRATION]", error);
    return { success: false, error: "Failed to toggle XE integration" };
  }
}

/**
 * Delete XE integration and all related data
 */
export async function deleteXeIntegration(): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage XE configuration
    const guard = await requireAction("xe:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Delete integration (cascades to agent settings and sync history)
    await prismadb.xeIntegration.delete({
      where: { organizationId },
    });

    // Reset xePublished flag on all properties
    await prismadb.properties.updateMany({
      where: { organizationId },
      data: { xePublished: false, xeRefId: null },
    });

    revalidatePath("/settings/xe-integration");

    return { success: true };
  } catch (error) {
    console.error("[XE_DELETE_INTEGRATION]", error);
    return { success: false, error: "Failed to delete XE integration" };
  }
}

// ============================================
// AGENT SETTINGS
// ============================================

/**
 * Get all agent settings for the organization's XE integration
 */
export async function getXeAgentSettings(): Promise<
  ActionResult<
    Array<{
      id: string;
      agentId: string;
      xeOwnerId: string;
      majorPhone: string;
      otherPhones: string[];
      isActive: boolean;
      autoPublish: boolean;
      publicationType: XePublicationType;
      createdAt: Date;
      updatedAt: Date;
    }>
  >
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: true, data: [] };
    }

    const settings = await prismadb.xeAgentSettings.findMany({
      where: { integrationId: integration.id },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error("[XE_GET_AGENT_SETTINGS]", error);
    return { success: false, error: "Failed to get agent settings" };
  }
}

/**
 * Get agent settings for a specific user
 */
export async function getXeAgentSettingsByUser(
  agentId: string
): Promise<
  ActionResult<{
    id: string;
    xeOwnerId: string;
    majorPhone: string;
    otherPhones: string[];
    isActive: boolean;
    autoPublish: boolean;
    publicationType: XePublicationType;
  } | null>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: true, data: null };
    }

    const settings = await prismadb.xeAgentSettings.findUnique({
      where: {
        integrationId_agentId: {
          integrationId: integration.id,
          agentId,
        },
      },
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error("[XE_GET_AGENT_SETTINGS_BY_USER]", error);
    return { success: false, error: "Failed to get agent settings" };
  }
}

/**
 * Create or update agent XE settings
 */
export async function saveXeAgentSettings(
  input: XeAgentSettingsInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { agentId, xeOwnerId, majorPhone, otherPhones, isActive, autoPublish, publicationType } = input;

    // Validate required fields
    if (!agentId || !xeOwnerId || !majorPhone) {
      return {
        success: false,
        error: "Agent ID, XE Owner ID, and phone number are required",
      };
    }

    // Get integration
    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return {
        success: false,
        error: "XE integration must be configured first",
      };
    }

    // Upsert agent settings
    const settings = await prismadb.xeAgentSettings.upsert({
      where: {
        integrationId_agentId: {
          integrationId: integration.id,
          agentId,
        },
      },
      create: {
        integrationId: integration.id,
        agentId,
        xeOwnerId,
        majorPhone,
        otherPhones: otherPhones || [],
        isActive: isActive ?? true,
        autoPublish: autoPublish ?? true,
        publicationType: publicationType ?? "BASIC",
      },
      update: {
        xeOwnerId,
        majorPhone,
        otherPhones: otherPhones || [],
        isActive: isActive ?? true,
        autoPublish: autoPublish ?? true,
        publicationType: publicationType ?? "BASIC",
      },
      select: { id: true },
    });

    revalidatePath("/settings/xe-integration");

    return { success: true, data: { id: settings.id } };
  } catch (error) {
    console.error("[XE_SAVE_AGENT_SETTINGS]", error);
    return { success: false, error: "Failed to save agent settings" };
  }
}

/**
 * Delete agent settings
 */
export async function deleteXeAgentSettings(
  agentId: string
): Promise<ActionResult> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { id: true },
    });

    if (!integration) {
      return { success: false, error: "XE integration not found" };
    }

    await prismadb.xeAgentSettings.delete({
      where: {
        integrationId_agentId: {
          integrationId: integration.id,
          agentId,
        },
      },
    });

    revalidatePath("/settings/xe-integration");

    return { success: true };
  } catch (error) {
    console.error("[XE_DELETE_AGENT_SETTINGS]", error);
    return { success: false, error: "Failed to delete agent settings" };
  }
}

// ============================================
// SELF-SERVICE AGENT SETTINGS
// ============================================

/**
 * Get the current user's XE agent settings
 */
export async function getMyXeAgentSettings(): Promise<
  ActionResult<{
    id: string;
    xeOwnerId: string;
    majorPhone: string;
    otherPhones: string[];
    isActive: boolean;
    autoPublish: boolean;
    publicationType: XePublicationType;
  } | null>
> {
  try {
    const user = await getCurrentUser();
    if (!user.clerkUserId) {
      return { success: false, error: "User ID not found" };
    }
    return getXeAgentSettingsByUser(user.clerkUserId);
  } catch (error) {
    console.error("[XE_GET_MY_AGENT_SETTINGS]", error);
    return { success: false, error: "Failed to get your XE settings" };
  }
}

/**
 * Save the current user's XE agent settings (self-service)
 */
export async function saveMyXeAgentSettings(
  input: Omit<XeAgentSettingsInput, "agentId">
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user.clerkUserId) {
      return { success: false, error: "User ID not found" };
    }
    return saveXeAgentSettings({
      ...input,
      agentId: user.clerkUserId,
    });
  } catch (error) {
    console.error("[XE_SAVE_MY_AGENT_SETTINGS]", error);
    return { success: false, error: "Failed to save your XE settings" };
  }
}

/**
 * Check if XE integration is configured for the organization
 */
export async function getXeIntegrationStatus(): Promise<
  ActionResult<{
    isConfigured: boolean;
    isActive: boolean;
  }>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const integration = await prismadb.xeIntegration.findUnique({
      where: { organizationId },
      select: { isActive: true },
    });

    return {
      success: true,
      data: {
        isConfigured: !!integration,
        isActive: integration?.isActive ?? false,
      },
    };
  } catch (error) {
    console.error("[XE_GET_INTEGRATION_STATUS]", error);
    return { success: false, error: "Failed to get XE integration status" };
  }
}

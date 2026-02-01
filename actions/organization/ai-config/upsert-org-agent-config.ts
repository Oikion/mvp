"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { isAtLeastLead } from "@/lib/permissions";
import { z } from "zod";
import type { OrganizationAgentConfig } from "@prisma/client";

// ============================================
// Validation Schema
// ============================================

const upsertConfigSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  customSystemPrompt: z.string().optional().nullable(),
  modelOverride: z.string().optional().nullable(),
  temperatureOverride: z.number().min(0).max(2).optional().nullable(),
  maxTokensOverride: z.number().int().min(1).max(128000).optional().nullable(),
  disabledToolIds: z.array(z.string()).default([]),
  enabledToolIds: z.array(z.string()).default([]),
  isEnabled: z.boolean().default(true),
});

type UpsertConfigInput = z.infer<typeof upsertConfigSchema>;

// ============================================
// Server Action
// ============================================

/**
 * Create or update organization agent configuration
 *
 * Allows organizations to override:
 * - System prompt (custom version for this org)
 * - Model selection
 * - Temperature settings
 * - Max tokens
 * - Tool availability (enable/disable specific tools)
 */
export async function upsertOrganizationAgentConfig(
  input: UpsertConfigInput
): Promise<{
  success: boolean;
  config?: OrganizationAgentConfig;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const isAdmin = await isAtLeastLead();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }
    
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return { success: false, error: "Organization not found" };
    }

    // Validate input
    const validationResult = upsertConfigSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Invalid input",
      };
    }

    const data = validationResult.data;

    // Verify the agent exists and is accessible
    const agent = await prismadb.aiAgent.findFirst({
      where: {
        id: data.agentId,
        isEnabled: true,
        OR: [
          { organizationId: null }, // Platform-wide
          { organizationId }, // Org-specific
        ],
      },
    });

    if (!agent) {
      return {
        success: false,
        error: "Agent not found or not accessible",
      };
    }

    // Validate disabled tool IDs
    if (data.disabledToolIds.length > 0) {
      const tools = await prismadb.aiTool.findMany({
        where: { id: { in: data.disabledToolIds } },
      });
      if (tools.length !== data.disabledToolIds.length) {
        return { success: false, error: "One or more disabled tools not found" };
      }
    }

    // Validate enabled tool IDs
    if (data.enabledToolIds.length > 0) {
      const tools = await prismadb.aiTool.findMany({
        where: { id: { in: data.enabledToolIds } },
      });
      if (tools.length !== data.enabledToolIds.length) {
        return { success: false, error: "One or more enabled tools not found" };
      }
    }

    // Upsert the configuration
    const config = await prismadb.organizationAgentConfig.upsert({
      where: {
        organizationId_agentId: {
          organizationId,
          agentId: data.agentId,
        },
      },
      create: {
        organizationId,
        agentId: data.agentId,
        customSystemPrompt: data.customSystemPrompt,
        modelOverride: data.modelOverride,
        temperatureOverride: data.temperatureOverride,
        maxTokensOverride: data.maxTokensOverride,
        disabledToolIds: data.disabledToolIds,
        enabledToolIds: data.enabledToolIds,
        isEnabled: data.isEnabled,
      },
      update: {
        customSystemPrompt: data.customSystemPrompt,
        modelOverride: data.modelOverride,
        temperatureOverride: data.temperatureOverride,
        maxTokensOverride: data.maxTokensOverride,
        disabledToolIds: data.disabledToolIds,
        enabledToolIds: data.enabledToolIds,
        isEnabled: data.isEnabled,
      },
    });

    return { success: true, config };
  } catch (error) {
    console.error("[UPSERT_ORG_AGENT_CONFIG]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save configuration",
    };
  }
}

/**
 * Delete organization agent configuration (reset to defaults)
 */
export async function deleteOrganizationAgentConfig(
  agentId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const isAdmin = await isAtLeastLead();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }
    
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return { success: false, error: "Organization not found" };
    }

    await prismadb.organizationAgentConfig.delete({
      where: {
        organizationId_agentId: {
          organizationId,
          agentId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[DELETE_ORG_AGENT_CONFIG]", error);
    
    // Handle case where config doesn't exist
    if ((error as { code?: string }).code === "P2025") {
      return { success: true }; // Config didn't exist, that's fine
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete configuration",
    };
  }
}

/**
 * Toggle organization agent config enabled status
 */
export async function toggleOrganizationAgentConfig(
  agentId: string,
  isEnabled: boolean
): Promise<{
  success: boolean;
  config?: OrganizationAgentConfig;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const isAdmin = await isAtLeastLead();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }
    
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return { success: false, error: "Organization not found" };
    }

    const config = await prismadb.organizationAgentConfig.upsert({
      where: {
        organizationId_agentId: {
          organizationId,
          agentId,
        },
      },
      create: {
        organizationId,
        agentId,
        isEnabled,
        disabledToolIds: [],
        enabledToolIds: [],
      },
      update: {
        isEnabled,
      },
    });

    return { success: true, config };
  } catch (error) {
    console.error("[TOGGLE_ORG_AGENT_CONFIG]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle configuration",
    };
  }
}

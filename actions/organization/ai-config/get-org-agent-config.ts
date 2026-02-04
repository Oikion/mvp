"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { isAtLeastLead } from "@/lib/permissions";
import type { OrganizationAgentConfig, AiAgent, AiSystemPrompt, AiAgentTool, AiTool } from "@prisma/client";

// ============================================
// Types
// ============================================

interface AgentWithConfig extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
  orgConfigs: OrganizationAgentConfig[];
}

interface OrgAgentConfigWithAgent extends OrganizationAgentConfig {
  agent: AiAgent;
}

// ============================================
// Server Actions
// ============================================

/**
 * Get all available agents with their org-specific configs
 *
 * Returns both platform-wide agents and org-specific agents with any
 * overrides that have been configured.
 */
export async function getOrganizationAgentConfigs(): Promise<{
  success: boolean;
  agents?: AgentWithConfig[];
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

    // Get all enabled agents (platform-wide and org-specific)
    const agents = await prismadb.aiAgent.findMany({
      where: {
        isEnabled: true,
        OR: [
          { organizationId: null }, // Platform-wide
          { organizationId }, // Org-specific
        ],
      },
      include: {
        systemPrompt: true,
        tools: {
          include: {
            tool: true,
          },
          orderBy: {
            priority: "asc",
          },
        },
        orgConfigs: {
          where: {
            organizationId,
          },
        },
      },
      orderBy: [{ isSystemAgent: "desc" }, { displayName: "asc" }],
    });

    return { success: true, agents: agents as AgentWithConfig[] };
  } catch (error) {
    console.error("[GET_ORG_AGENT_CONFIGS]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get configurations",
    };
  }
}

/**
 * Get a specific organization agent configuration
 */
export async function getOrganizationAgentConfig(
  agentId: string
): Promise<{
  success: boolean;
  config?: OrgAgentConfigWithAgent | null;
  agent?: AgentWithConfig;
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

    // Get the agent
    const agent = await prismadb.aiAgent.findUnique({
      where: { id: agentId },
      include: {
        systemPrompt: true,
        tools: {
          include: {
            tool: true,
          },
          orderBy: {
            priority: "asc",
          },
        },
        orgConfigs: {
          where: {
            organizationId,
          },
          take: 1,
        },
      },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Get the org config if it exists
    const config = await prismadb.organizationAgentConfig.findUnique({
      where: {
        organizationId_agentId: {
          organizationId,
          agentId,
        },
      },
      include: {
        agent: true,
      },
    });

    return {
      success: true,
      config: config as OrgAgentConfigWithAgent | null,
      agent: agent as AgentWithConfig,
    };
  } catch (error) {
    console.error("[GET_ORG_AGENT_CONFIG]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get configuration",
    };
  }
}

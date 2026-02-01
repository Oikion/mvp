/**
 * AI Agent Registry
 *
 * Provides functions to load and cache AI agent definitions from the database.
 * Handles organization-specific configurations and filtering.
 */

import { prismadb } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type {
  AgentWithRelations,
  AgentWithOrgConfig,
  AgentSummary,
  AgentFilter,
  ResolvedAgentConfig,
} from "./types";
import type { AiModelProvider, AiToolChoice } from "@prisma/client";

// ============================================
// Cache Configuration
// ============================================

const CACHE_REVALIDATE_SECONDS = 60; // 1 minute cache

// ============================================
// Agent Loading Functions
// ============================================

/**
 * Get all enabled agents with their relations
 *
 * @param filter - Optional filter criteria
 * @returns Array of agents with relations
 */
export async function getAgents(
  filter?: AgentFilter
): Promise<AgentWithRelations[]> {
  const where: Record<string, unknown> = {};

  // Apply filters
  if (filter?.enabled !== undefined) {
    where.isEnabled = filter.enabled;
  } else {
    where.isEnabled = true; // Default to enabled only
  }

  if (filter?.systemOnly) {
    where.isSystemAgent = true;
  } else if (filter?.customOnly) {
    where.isSystemAgent = false;
  }

  if (filter?.provider) {
    where.modelProvider = filter.provider;
  }

  if (filter?.organizationId !== undefined) {
    if (filter.organizationId === null) {
      where.organizationId = null;
    } else {
      where.OR = [
        { organizationId: null },
        { organizationId: filter.organizationId },
      ];
    }
  }

  const agents = await prismadb.aiAgent.findMany({
    where,
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
    },
    orderBy: [{ isSystemAgent: "desc" }, { name: "asc" }],
  });

  return agents as AgentWithRelations[];
}

/**
 * Get enabled agents (cached)
 *
 * Uses Next.js unstable_cache for server-side caching.
 */
export const getEnabledAgents = unstable_cache(
  async () => {
    return getAgents({ enabled: true });
  },
  ["ai-agents-enabled"],
  { revalidate: CACHE_REVALIDATE_SECONDS }
);

/**
 * Get an agent by ID with all relations
 *
 * @param agentId - The agent ID
 * @returns Agent with relations or null
 */
export async function getAgentById(
  agentId: string
): Promise<AgentWithRelations | null> {
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
    },
  });

  return agent as AgentWithRelations | null;
}

/**
 * Get an agent by name with all relations
 *
 * @param name - The agent name (unique identifier)
 * @returns Agent with relations or null
 */
export async function getAgentByName(
  name: string
): Promise<AgentWithRelations | null> {
  const agent = await prismadb.aiAgent.findUnique({
    where: { name },
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
    },
  });

  return agent as AgentWithRelations | null;
}

/**
 * Get an agent with organization-specific configuration
 *
 * @param agentId - The agent ID
 * @param organizationId - The organization ID
 * @returns Agent with org config applied
 */
export async function getAgentWithOrgConfig(
  agentId: string,
  organizationId: string
): Promise<AgentWithOrgConfig | null> {
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
          isEnabled: true,
        },
        take: 1,
      },
    },
  });

  if (!agent) return null;

  return {
    ...agent,
    orgConfig: agent.orgConfigs?.[0] || null,
  } as AgentWithOrgConfig;
}

// ============================================
// Configuration Resolution
// ============================================

/**
 * Resolve final agent configuration with all overrides applied
 *
 * @param agent - Agent with org config
 * @returns Resolved configuration ready for use
 */
export function resolveAgentConfig(
  agent: AgentWithOrgConfig
): ResolvedAgentConfig {
  const orgConfig = agent.orgConfig;

  // Get base values
  const systemPrompt =
    orgConfig?.customSystemPrompt || agent.systemPrompt?.content || "";
  const modelName = orgConfig?.modelOverride || agent.modelName;
  const temperature = orgConfig?.temperatureOverride ?? agent.temperature;
  const maxTokens = orgConfig?.maxTokensOverride ?? agent.maxTokens;

  // Get tool names, applying org-specific overrides
  let toolNames = agent.tools
    .filter((at) => at.tool.isEnabled)
    .map((at) => at.tool.name);

  if (orgConfig?.disabledToolIds && orgConfig.disabledToolIds.length > 0) {
    const disabledIds = new Set(orgConfig.disabledToolIds);
    toolNames = toolNames.filter((name) => {
      const tool = agent.tools.find((at) => at.tool.name === name);
      return tool && !disabledIds.has(tool.toolId);
    });
  }

  if (orgConfig?.enabledToolIds && orgConfig.enabledToolIds.length > 0) {
    // Note: Additional tools would need to be loaded separately
    // This is a placeholder for future enhancement
  }

  return {
    agentId: agent.id,
    name: agent.name,
    displayName: agent.displayName,
    description: agent.description,
    systemPrompt,
    modelProvider: agent.modelProvider,
    modelName,
    temperature,
    maxTokens,
    maxSteps: agent.maxSteps,
    toolChoice: agent.toolChoice,
    toolNames,
  };
}

// ============================================
// Agent Summaries
// ============================================

/**
 * Get agent summaries for listing
 *
 * @param filter - Optional filter criteria
 * @returns Array of agent summaries
 */
export async function getAgentSummaries(
  filter?: AgentFilter
): Promise<AgentSummary[]> {
  const agents = await getAgents(filter);

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    displayName: agent.displayName,
    description: agent.description,
    modelProvider: agent.modelProvider,
    modelName: agent.modelName,
    toolCount: agent.tools.length,
    isEnabled: agent.isEnabled,
    isSystemAgent: agent.isSystemAgent,
  }));
}

// ============================================
// Default Agents
// ============================================

/**
 * Default agent configurations for seeding
 */
export const DEFAULT_AGENTS = [
  {
    name: "chat_assistant",
    displayName: "Chat Assistant",
    description:
      "General-purpose chat assistant with access to all enabled tools. Used for the main chat interface.",
    modelProvider: "OPENAI" as AiModelProvider,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 1000,
    maxSteps: 5,
    toolChoice: "AUTO" as AiToolChoice,
    isSystemAgent: true,
    systemPromptName: "chat_assistant",
  },
  {
    name: "voice_assistant",
    displayName: "Voice Assistant",
    description:
      "Voice-optimized assistant for spoken commands. Provides concise responses suitable for TTS.",
    modelProvider: "OPENAI" as AiModelProvider,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
    maxSteps: 5,
    toolChoice: "AUTO" as AiToolChoice,
    isSystemAgent: true,
    systemPromptName: "voice_assistant",
  },
  {
    name: "document_analyzer",
    displayName: "Document Analyzer",
    description:
      "Specialized agent for analyzing and extracting information from documents.",
    modelProvider: "OPENAI" as AiModelProvider,
    modelName: "gpt-4o",
    temperature: 0.3,
    maxTokens: 2000,
    maxSteps: 3,
    toolChoice: "AUTO" as AiToolChoice,
    isSystemAgent: true,
    systemPromptName: "document_analyzer",
  },
  {
    name: "property_matcher",
    displayName: "Property Matcher",
    description:
      "Matches properties to client requirements using semantic understanding.",
    modelProvider: "OPENAI" as AiModelProvider,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1500,
    maxSteps: 5,
    toolChoice: "AUTO" as AiToolChoice,
    isSystemAgent: true,
    systemPromptName: "client_matcher",
    toolCategories: ["matchmaking", "mls", "crm"],
  },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Check if an agent exists
 */
export async function agentExists(name: string): Promise<boolean> {
  const count = await prismadb.aiAgent.count({
    where: { name },
  });
  return count > 0;
}

/**
 * Get agent tools by agent ID
 */
export async function getAgentTools(agentId: string): Promise<string[]> {
  const tools = await prismadb.aiAgentTool.findMany({
    where: { agentId },
    include: {
      tool: {
        select: { name: true, isEnabled: true },
      },
    },
    orderBy: { priority: "asc" },
  });

  return tools.filter((t) => t.tool.isEnabled).map((t) => t.tool.name);
}

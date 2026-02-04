"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiAgent, AiAgentTool, AiTool, AiSystemPrompt } from "@prisma/client";

// ============================================
// Types
// ============================================

interface GetAiAgentsParams {
  page?: number;
  limit?: number;
  search?: string;
  provider?: "OPENAI" | "ANTHROPIC";
  isEnabled?: boolean;
  isSystemAgent?: boolean;
}

interface AiAgentWithRelations extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
  _count: {
    tools: number;
    orgConfigs: number;
  };
}

interface GetAiAgentsResult {
  success: boolean;
  agents: AiAgentWithRelations[];
  totalCount: number;
  page: number;
  totalPages: number;
  error?: string;
}

// ============================================
// Server Actions
// ============================================

/**
 * Get paginated list of AI agents with filtering
 */
export async function getAiAgents(
  params: GetAiAgentsParams = {}
): Promise<GetAiAgentsResult> {
  try {
    await requirePlatformAdmin();

    const {
      page = 1,
      limit = 20,
      search,
      provider,
      isEnabled,
      isSystemAgent,
    } = params;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (provider) {
      where.modelProvider = provider;
    }

    if (isEnabled !== undefined) {
      where.isEnabled = isEnabled;
    }

    if (isSystemAgent !== undefined) {
      where.isSystemAgent = isSystemAgent;
    }

    // Get total count
    const totalCount = await prismadb.aiAgent.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get agents with relations
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
        _count: {
          select: {
            tools: true,
            orgConfigs: true,
          },
        },
      },
      orderBy: [{ isSystemAgent: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      agents: agents as AiAgentWithRelations[],
      totalCount,
      page,
      totalPages,
    };
  } catch (error) {
    console.error("[GET_AI_AGENTS]", error);
    return {
      success: false,
      agents: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
      error: error instanceof Error ? error.message : "Failed to get agents",
    };
  }
}

/**
 * Get single AI agent by ID
 */
export async function getAiAgentById(
  agentId: string
): Promise<{
  success: boolean;
  agent?: AiAgentWithRelations;
  error?: string;
}> {
  try {
    await requirePlatformAdmin();

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
        _count: {
          select: {
            tools: true,
            orgConfigs: true,
          },
        },
      },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    return { success: true, agent: agent as AiAgentWithRelations };
  } catch (error) {
    console.error("[GET_AI_AGENT_BY_ID]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get agent",
    };
  }
}

/**
 * Get available model providers and models
 */
export async function getModelProviders(): Promise<{
  providers: Array<{
    value: string;
    label: string;
    models: Array<{ value: string; label: string }>;
  }>;
}> {
  return {
    providers: [
      {
        value: "OPENAI",
        label: "OpenAI",
        models: [
          { value: "gpt-4o-mini", label: "GPT-4o Mini" },
          { value: "gpt-4o", label: "GPT-4o" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        ],
      },
      {
        value: "ANTHROPIC",
        label: "Anthropic",
        models: [
          { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
          { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
          { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
        ],
      },
    ],
  };
}

/**
 * Get available system prompts for selection
 */
export async function getAvailableSystemPrompts(): Promise<
  Array<{ id: string; name: string; displayName: string; category: string }>
> {
  try {
    await requirePlatformAdmin();

    const prompts = await prismadb.aiSystemPrompt.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
      },
      orderBy: [{ category: "asc" }, { displayName: "asc" }],
    });

    return prompts;
  } catch (error) {
    console.error("[GET_AVAILABLE_SYSTEM_PROMPTS]", error);
    return [];
  }
}

/**
 * Get available tools for selection
 */
export async function getAvailableTools(): Promise<
  Array<{ id: string; name: string; displayName: string; category: string }>
> {
  try {
    await requirePlatformAdmin();

    const tools = await prismadb.aiTool.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
      },
      orderBy: [{ category: "asc" }, { displayName: "asc" }],
    });

    return tools;
  } catch (error) {
    console.error("[GET_AVAILABLE_TOOLS]", error);
    return [];
  }
}

/**
 * Get agent stats
 */
export async function getAiAgentStats(): Promise<{
  total: number;
  enabled: number;
  system: number;
  custom: number;
  byProvider: Record<string, number>;
}> {
  try {
    await requirePlatformAdmin();

    const [total, enabled, system, openai, anthropic] = await Promise.all([
      prismadb.aiAgent.count(),
      prismadb.aiAgent.count({ where: { isEnabled: true } }),
      prismadb.aiAgent.count({ where: { isSystemAgent: true } }),
      prismadb.aiAgent.count({ where: { modelProvider: "OPENAI" } }),
      prismadb.aiAgent.count({ where: { modelProvider: "ANTHROPIC" } }),
    ]);

    return {
      total,
      enabled,
      system,
      custom: total - system,
      byProvider: {
        OPENAI: openai,
        ANTHROPIC: anthropic,
      },
    };
  } catch (error) {
    console.error("[GET_AI_AGENT_STATS]", error);
    return {
      total: 0,
      enabled: 0,
      system: 0,
      custom: 0,
      byProvider: {},
    };
  }
}
